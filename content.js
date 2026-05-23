// DubiSnipe — Foreground Scanner Content Script (v1.0)
// This script runs on all dubizzle pages, but only activates if sniper=true is in the URL.

(function () {
  'use strict';

  const POLL_INTERVAL = 30000; // 30 seconds
  const isSniperActive = window.location.search.includes('sniper=true');

  if (!isSniperActive) return;

  console.log('🎯 DubiSnipe V1.0: Scanner active on this tab.');
  document.title = "🎯 [SNIPING] " + document.title;

  // Let the page render a bit before scraping
  setTimeout(scrapeAndEvaluate, 3000);

  function isWafPage() {
    const html = (document.documentElement && document.documentElement.innerHTML || '').toLowerCase();
    const t = (document.title || '').toLowerCase();
    return (
      t.includes('security check') ||
      t.includes('access denied') ||
      t.includes('just a moment') ||
      t.includes('pardon our interruption') ||
      html.includes('pardon our interruption') ||
      html.includes('please stand by') ||
      !!document.getElementById('challenge-form') ||
      !!document.getElementById('interstitial-inprogress')
    );
  }

  function parsePriceFromCard(card) {
    const cardText = (card.innerText || '').toLowerCase();
    
    // Find all numbers associated with AED
    const priceRegex = /(?:aed)\s*([\d,]+)|([\d,]+)\s*(?:aed)/g;
    let match;
    const candidates = [];
    
    while ((match = priceRegex.exec(cardText)) !== null) {
      const priceStr = match[1] || match[2] || '';
      const priceVal = parseInt(priceStr.replace(/,/g, ''), 10);
      if (!priceVal || priceVal <= 0) continue;
      
      const matchIndex = match.index;
      // Get a window of text before and after the match
      const start = Math.max(0, matchIndex - 30);
      const end = Math.min(cardText.length, matchIndex + match[0].length + 30);
      const surrounding = cardText.substring(start, end);
      
      // Check if this specific match is related to installments/financing
      const isInstallment = surrounding.includes('/mo') || 
                            surrounding.includes('/month') || 
                            surrounding.includes('mo.') || 
                            surrounding.includes('finance') || 
                            surrounding.includes('installment');
      
      if (!isInstallment) {
        candidates.push(priceVal);
      }
    }
    
    // If we found any valid cash prices, return the first one (usually the main price)
    if (candidates.length > 0) {
      return candidates[0];
    }
    
    return null;
  }

  function extractListingsFromDOM() {
    const listings = [];
    const seen = new Set();
    
    // Select all potential listing containers
    let cards = document.querySelectorAll('a[data-testid^="listing-"]');
    if (cards.length === 0) {
      cards = document.querySelectorAll('a[href*="/classified/"], a[href*="/detail/"], a[href*="/listing/"]');
    }

    for (const card of cards) {
      const href = card.getAttribute('href') || '';
      if (href.length < 10) continue;

      const price = parsePriceFromCard(card);
      if (!price || price <= 0) continue;

      // Extract Title
      let title = '';
      const h2 = card.querySelector('h2');
      if (h2) title = h2.innerText.trim();
      if (!title) title = card.getAttribute('aria-label') || '';
      if (!title) {
        const text = card.innerText || '';
        const parts = text.split('\n').map(s => s.trim()).filter(s => s.length > 3 && !/AED/i.test(s));
        title = parts[0] || 'Dubizzle Listing';
      }

      // ID extraction
      let id = (card.getAttribute('data-testid') || '').replace('listing-', '');
      const idFromUrl = href.match(/(\d{5,})/);
      if (idFromUrl) id = idFromUrl[1];
      if (!id || id.length < 3) {
        const segments = href.split('/').filter(Boolean);
        id = segments[segments.length - 1] || href;
      }

      if (seen.has(id)) continue;
      seen.add(id);

      const url = href.startsWith('http') ? href : `${location.origin}${href.startsWith('/') ? '' : '/'}${href}`;
      listings.push({ id, title: title.substring(0, 250), price, url });
    }
    return listings;
  }

  async function scrapeAndEvaluate() {
    // 1. Handle WAF Captcha
    if (isWafPage()) {
      console.warn('⚠️ Captcha/WAF check detected. Please solve the Captcha in this tab to resume scanning.');
      document.title = "⚠️ Solve Captcha! - DubiSnipe";
      
      // Try again in 5 seconds to see if WAF is solved
      setTimeout(scrapeAndEvaluate, 5000);
      return;
    }

    // 2. Load settings
    const settings = await chrome.storage.local.get(['keyword', 'minPrice', 'maxPrice', 'notifiedIds']);
    const keyword = settings.keyword ? settings.keyword.trim().toLowerCase() : '';
    const minPrice = parseInt(settings.minPrice, 10) || 0;
    const maxPrice = parseInt(settings.maxPrice, 10) || Infinity;
    const notifiedIds = settings.notifiedIds || [];

    // 3. Scan listings
    const listings = extractListingsFromDOM();
    console.log(`Scanned ${listings.length} listings from page.`);

    const foundMatches = [];

    for (const listing of listings) {
      // Check Price range
      if (listing.price >= minPrice && listing.price <= maxPrice) {
        
        // Check Keyword (if set in UI and not already filtered by Dubizzle's search engine)
        if (keyword && !window.location.search.includes('keywords=')) {
          const words = keyword.split(/\s+/);
          const titleLower = listing.title.toLowerCase();
          const matchesKeyword = words.every(word => titleLower.includes(word));
          if (!matchesKeyword) continue;
        }

        // Avoid notifying multiple times for the exact same item
        if (!notifiedIds.includes(listing.id)) {
          foundMatches.push(listing);
        }
      }
    }

    if (foundMatches.length > 0) {
      console.log(`🎉 MATCHES FOUND: ${foundMatches.length} deals.`);
      
      // Update Notified IDs list
      const updatedNotified = [...notifiedIds, ...foundMatches.map(m => m.id)];
      if (updatedNotified.length > 250) updatedNotified.splice(0, updatedNotified.length - 250);
      await chrome.storage.local.set({ notifiedIds: updatedNotified });

      // Send matches to background script
      chrome.runtime.sendMessage({
        action: 'triggerNotification',
        deals: foundMatches
      });
      
      document.title = "🎉 DEALS FOUND! - DubiSnipe";
    }

    // Continue reload loop every 30 seconds
    console.log('Refreshing scanner tab in 30 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, POLL_INTERVAL);
  }

})();
