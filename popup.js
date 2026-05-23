// DubiSnipe — Popup Control Script (v1.0)

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const elCustomUrl = $('custom-url');
  const elKeyword = $('keyword');
  const elMinPrice = $('min-price');
  const elMaxPrice = $('max-price');
  const elBtnStartSearch = $('btn-start-search');
  const elBtnStopSearch = $('btn-stop-search');
  const elDealsSection = $('dealsSection');
  const elDealsList = $('dealsList');

  // Helper functions for UI states
  function showStopButton() {
    elBtnStartSearch.style.display = 'none';
    elBtnStopSearch.style.display = 'block';
    elCustomUrl.disabled = true;
    elKeyword.disabled = true;
    elMinPrice.disabled = true;
    elMaxPrice.disabled = true;
  }

  function showStartButton() {
    elBtnStartSearch.style.display = 'block';
    elBtnStopSearch.style.display = 'none';
    elCustomUrl.disabled = false;
    elKeyword.disabled = false;
    elMinPrice.disabled = false;
    elMaxPrice.disabled = false;
  }

  // Load Saved Config using simple, standard callback
  chrome.storage.local.get([
    'customUrl',
    'keyword',
    'minPrice',
    'maxPrice',
    'foundDeals',
    'activeTabId'
  ], (settings) => {
    elCustomUrl.value = settings.customUrl || '';
    elKeyword.value = settings.keyword || '';
    elMinPrice.value = settings.minPrice || '';
    elMaxPrice.value = settings.maxPrice || '';

    renderDeals(settings.foundDeals || []);

    // Check active state of background tab safely using chrome.tabs.get
    if (settings.activeTabId) {
      chrome.tabs.get(settings.activeTabId, (tab) => {
        if (!chrome.runtime.lastError && tab) {
          showStopButton();
        } else {
          showStartButton();
          chrome.storage.local.set({ activeTabId: null });
        }
      });
    } else {
      showStartButton();
    }
  });

  // Start Search Button
  elBtnStartSearch.addEventListener('click', () => {
    const customUrl = elCustomUrl.value.trim();
    const keyword = elKeyword.value.trim();
    
    if (!customUrl && !keyword) {
      elCustomUrl.focus();
      alert('Please enter either a Custom Dubizzle URL OR a Search Keyword!');
      return;
    }

    const minPrice = parseInt(elMinPrice.value, 10) || 0;
    const maxPrice = parseInt(elMaxPrice.value, 10) || 0;

    chrome.storage.local.set({
      customUrl: customUrl,
      keyword: keyword,
      minPrice: minPrice,
      maxPrice: maxPrice,
      foundDeals: [],
      notifiedIds: []
    }, () => {
      renderDeals([]);

      // Determine Scrape URL
      let targetUrl = '';
      if (customUrl) {
        targetUrl = customUrl;
        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl = `${targetUrl}${separator}sniper=true`;
      } else {
        // Use standard Dubizzle keywords query parameter (plural keywords)
        targetUrl = `https://dubai.dubizzle.com/search/?keywords=${encodeURIComponent(keyword)}`;
        
        // Append native server-side price filtering to search URL
        if (minPrice > 0) {
          targetUrl += `&price__gte=${minPrice}`;
        }
        if (maxPrice > 0) {
          targetUrl += `&price__lte=${maxPrice}`;
        }
        
        targetUrl += `&sniper=true`;
      }

      // Launch standard active scanning tab
      chrome.tabs.create({
        url: targetUrl,
        active: false // Opens in background of current window to avoid disturbing you
      }, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.error('Error creating scanner tab:', chrome.runtime.lastError);
          alert('Could not open scanner tab. Please try again.');
          return;
        }
        
        chrome.storage.local.set({ 
          activeTabId: tab.id
        }, () => {
          showStopButton();
        });
      });
    });
  });

  // Stop Search Button
  elBtnStopSearch.addEventListener('click', () => {
    chrome.storage.local.get(['activeTabId'], (data) => {
      if (data.activeTabId) {
        chrome.tabs.remove(data.activeTabId, () => {
          if (chrome.runtime.lastError) {
            // Tab might be already closed manually
          }
        });
      }
      chrome.storage.local.set({ activeTabId: null }, () => {
        showStartButton();
      });
    });
  });

  // Live Sync Deals
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.foundDeals) {
      renderDeals(changes.foundDeals.newValue || []);
    }
    if (changes.activeTabId) {
      if (!changes.activeTabId.newValue) showStartButton();
    }
  });

  function renderDeals(deals) {
    if (!deals || deals.length === 0) {
      elDealsSection.style.display = 'none';
      return;
    }

    // Sort deals from lowest to highest price (ascending)
    const sortedDeals = [...deals].sort((a, b) => Number(a.price) - Number(b.price));

    elDealsSection.style.display = 'block';
    elDealsList.innerHTML = '';
    
    sortedDeals.forEach((deal) => {
      const card = document.createElement('div');
      card.className = 'deal-card';
      
      const title = document.createElement('div');
      title.className = 'deal-name';
      title.textContent = deal.title || 'Deal';

      const price = document.createElement('div');
      price.className = 'deal-price';
      price.innerHTML = `<span class="currency">AED</span> ${Number(deal.price).toLocaleString()}`;

      const btn = document.createElement('button');
      btn.className = 'btn-open';
      btn.textContent = '🔗 Open Link';
      btn.addEventListener('click', () => {
        chrome.tabs.create({ url: deal.url });
      });

      card.appendChild(title);
      card.appendChild(price);
      card.appendChild(btn);

      elDealsList.appendChild(card);
    });
  }
});