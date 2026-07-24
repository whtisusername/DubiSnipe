// DubiSnipe Foreground Scanner Content Script (v1.0)
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
    const bodyText = (document.body && document.body.innerText || '').toLowerCase();
    const t = (document.title || '').toLowerCase();
    
    return (
      t.includes('security check') ||
      t.includes('access denied') ||
      t.includes('just a moment') ||
      t.includes('pardon our interruption') ||
      t.includes('human verification') ||
      t.includes('verify you are') ||
      t.includes('attention required') ||
      bodyText.includes('additional security check') ||
      bodyText.includes('verify you are human') ||
      bodyText.includes('pardon our interruption') ||
      bodyText.includes('please complete the security check') ||
      bodyText.includes('please stand by') ||
      bodyText.includes('i am human') ||
      html.includes('pardon our interruption') ||
      html.includes('please stand by') ||
      html.includes('reese84') ||
      html.includes('_incapsula_resource') ||
      !!document.getElementById('challenge-form') ||
      !!document.getElementById('challenge-container') ||
      !!document.getElementById('interstitial-inprogress') ||
      !!document.querySelector('.cf-turnstile') ||
      !!document.querySelector('.h-captcha')
    );
  }

  function parsePriceFromCard(card) {
    const cardText = (card.innerText || '').toLowerCase();

    // First pass: collect every AED-associated number with its position in the text.
    const priceRegex = /(?:aed)\s*([\d,]+)|([\d,]+)\s*(?:aed)/g;
    const matches = [];
    let match;
    while ((match = priceRegex.exec(cardText)) !== null) {
      const priceStr = match[1] || match[2] || '';
      const priceVal = parseInt(priceStr.replace(/,/g, ''), 10);
      if (!priceVal || priceVal <= 0) continue;
      matches.push({ val: priceVal, start: match.index, end: match.index + match[0].length });
    }

    const INSTALLMENT_KEYWORDS = ['/mo', '/month', 'mo.', 'per month', 'monthly', 'finance', 'installment'];

    // Second pass: decide installment vs cash per price. The context that "belongs"
    // to a price is a short lead-in before it plus everything up to the NEXT price
    // (capped). This is the key fix: a card like "AED 3,200 ... AED 280/mo finance"
    // used to let the neighbouring "/mo finance" wrongly tag the real 3,200 cash
    // price, dropping the whole listing. Bounding the context at the next price
    // keeps each price's installment check to its own text.
    const candidates = [];
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const beforeStart = Math.max(0, cur.start - 12);
      const nextStart = i + 1 < matches.length ? matches[i + 1].start : cardText.length;
      const afterEnd = Math.min(nextStart, cur.end + 20);
      const context = cardText.substring(beforeStart, cur.start) + cardText.substring(cur.end, afterEnd);

      const isInstallment = INSTALLMENT_KEYWORDS.some(kw => context.includes(kw));
      if (!isInstallment) {
        candidates.push(cur.val);
      }
    }

    // Return the first valid cash price (usually the main/headline price).
    if (candidates.length > 0) {
      return candidates[0];
    }

    return null;
  }

  function extractListingsFromDOM() {
    const listingsMap = new Map();
    
    // Dubizzle's database URLs consistently carry the posting date in the path (e.g. /2026/06/19/...)
    // This allows us to target listing links with 100% accuracy, bypassing changing classes and testids.
    const allLinks = document.querySelectorAll('a');
    const dateUrlRegex = /\/20\d{2}\/\d{2}\/\d{2}\//;

    for (const link of allLinks) {
      const href = link.getAttribute('href') || '';
      if (!dateUrlRegex.test(href)) continue;

      // Extract ID from URL (e.g. trailing numbers before slash or sequence of digits)
      let id = '';
      const segments = href.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] || '';
      const matchId = lastSegment.match(/-(\d+)$/) || lastSegment.match(/(\d{5,})/);
      if (matchId) {
        id = matchId[1];
      } else {
        id = lastSegment || href;
      }

      if (!id || id.length < 3) continue;

      // Locate the closest card/item container element to search for metadata
      const container = link.closest('article, li, div[class*="card"], div[class*="item"], div[class*="listing"]') || link;
      
      const price = parsePriceFromCard(container);
      if (!price || price <= 0) continue;

      // Extract Title
      let title = '';
      const h2 = container.querySelector('h2');
      if (h2) title = h2.innerText.trim();
      if (!title) {
        const titleEl = container.querySelector('[class*="title"], [class*="name"]');
        if (titleEl) title = titleEl.innerText.trim();
      }
      if (!title) title = link.getAttribute('aria-label') || '';
      if (!title) {
        const text = container.innerText || '';
        const parts = text.split('\n').map(s => s.trim()).filter(s => s.length > 3 && !/AED/i.test(s));
        title = parts[0] || 'Dubizzle Listing';
      }
      
      const url = href.startsWith('http') ? href : `${location.origin}${href.startsWith('/') ? '' : '/'}${href}`;
      
      const current = { id, title: title.substring(0, 250), price, url };

      // Update map to merge links and ensure we capture the most descriptive title
      if (listingsMap.has(id)) {
        const existing = listingsMap.get(id);
        if (current.title.length > existing.title.length && !existing.title.includes('Dubizzle Listing')) {
          existing.title = current.title;
        }
      } else {
        listingsMap.set(id, current);
      }
    }
    
    return Array.from(listingsMap.values());
  }

  let hasStartedScanner = false;

  async function scrapeAndEvaluate() {
    // 1. Handle WAF Captcha
    if (isWafPage()) {
      console.warn('⚠️ Captcha/WAF check detected. Please solve the Captcha in this tab to resume scanning.');
      document.title = "⚠️ Solve Captcha! - DubiSnipe";
      
      // Trigger WAF challenge action to restore the window
      chrome.runtime.sendMessage({ 
        action: 'wafChallenge',
        status: '⚠️ Security check required! Solve Captcha in the opened window.'
      });
      
      // Try again in 5 seconds to see if WAF is solved
      setTimeout(scrapeAndEvaluate, 5000);
      return;
    }

    // Since WAF is solved/passed, notify background to minimize back to Dock
    if (!hasStartedScanner) {
      chrome.runtime.sendMessage({ 
        action: 'scannerStarted',
        status: '🔍 Scanning active... Page loaded successfully.'
      });
      hasStartedScanner = true;
    } else {
      chrome.runtime.sendMessage({ 
        action: 'wafSolved',
        status: '🔍 Scanning active... Page loaded successfully.'
      });
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

    // Track consecutive scans that extracted ZERO listings. A real Dubizzle
    // results page essentially always has listings, so a sustained streak of
    // nothing means the scraper's selectors broke (site layout changed) or we're
    // being soft-blocked, not "no deals right now." Persisted because the
    // content script reloads every cycle and loses in-memory state.
    const prevStreak = (await chrome.storage.local.get(['emptyScanStreak'])).emptyScanStreak || 0;
    const emptyScanStreak = listings.length === 0 ? prevStreak + 1 : 0;
    await chrome.storage.local.set({ emptyScanStreak });

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

    let statusText = '';
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

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
      statusText = `🎉 Matches found! Scanned ${listings.length} ads (${foundMatches.length} matching) at ${timeStr}.`;
    } else {
      statusText = `✅ Active. Scanned ${listings.length} ads (0 matches) at ${timeStr}.`;
    }

    // Override with a clear warning if we've extracted nothing several cycles in
    // a row, which is the signal that the scraper broke rather than "no matches."
    if (emptyScanStreak >= 3) {
      statusText = `⚠️ Found 0 listings ${emptyScanStreak}× in a row (last ${timeStr}). Dubizzle's layout may have changed or you're soft-blocked. Open the scanner window and check it manually.`;
    }

    // Send updated status to background for storage
    chrome.runtime.sendMessage({
      action: 'scannerUpdate',
      status: statusText
    });

    // Continue reload loop every 30 seconds
    console.log('Refreshing scanner tab in 30 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, POLL_INTERVAL);
  }

})();
