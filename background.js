// DubiSnipe - Background Service Worker (Manifest V3 - v1.0)

let lastChimePlay = 0;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const now = Date.now();

  if (request.action === 'scannerStarted') {
    const winId = sender.tab ? sender.tab.windowId : null;
    if (winId) {
      chrome.windows.update(winId, {
        state: 'minimized',
        focused: false
      }, () => {
        if (chrome.runtime.lastError) {
          // Already minimized or closed
        }
      });
    }
    chrome.storage.local.set({ status: request.status || 'Scanning active...' });
    return;
  }

  if (request.action === 'scannerUpdate') {
    chrome.storage.local.set({ status: request.status });
    return;
  }

  if (request.action === 'wafChallenge') {
    chrome.storage.local.get(['activeWindowId'], (data) => {
      const winId = data.activeWindowId || (sender.tab ? sender.tab.windowId : null);
      if (winId) {
        chrome.windows.update(winId, {
          state: 'normal',
          focused: true,
          left: 100,
          top: 100,
          width: 1024,
          height: 768
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Error restoring scanner window:', chrome.runtime.lastError);
          }
        });
      }
    });
    chrome.storage.local.set({ status: request.status || '⚠️ WAF Check detected! Solve Captcha in the popped window.' });
    return;
  }

  if (request.action === 'wafSolved') {
    chrome.storage.local.get(['activeWindowId'], (data) => {
      const winId = data.activeWindowId || (sender.tab ? sender.tab.windowId : null);
      if (winId) {
        chrome.windows.update(winId, {
          state: 'minimized',
          focused: false
        }, () => {
          if (chrome.runtime.lastError) {
            // Already minimized or closed
          }
        });
      }
    });
    chrome.storage.local.set({ status: request.status || '✅ Captcha solved! Minimizing and resuming scans...' });
    return;
  }

  if (request.action === 'triggerNotification') {
    const { deals } = request;
    if (!deals || deals.length === 0) return;
    
    // Play Chime (Throttled to once every 10 seconds)
    if (now - lastChimePlay > 10000) {
      lastChimePlay = now;
      playChimeSound();
    }

    // Update Storage with new deals (Prepend, slice to max 50)
    chrome.storage.local.get(['foundDeals'], (data) => {
      const existing = data.foundDeals || [];
      const filteredNew = deals.filter(d => !existing.some(ex => ex.id === d.id));
      
      if (filteredNew.length === 0) return;

      const allDeals = [...filteredNew, ...existing].slice(0, 50);
      chrome.storage.local.set({ foundDeals: allDeals });

      // Update badge count
      chrome.action.setBadgeText({ text: String(allDeals.length) });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

      // Trigger ONE Grouped Notification
      const topDeal = filteredNew[0];
      const notificationMessage = filteredNew.length === 1
        ? `${topDeal.title}\nPrice: AED ${topDeal.price}`
        : `Found ${filteredNew.length} new matching deals! E.g. ${topDeal.title} (AED ${topDeal.price})`;

      const notificationOptions = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon.png'),
        title: '🔥 New DubiSnipe Deals Found!',
        message: notificationMessage,
        contextMessage: 'DubiSnipe',
        buttons: [
          { title: 'Open Latest Deal' }
        ],
        requireInteraction: true
      };

      chrome.notifications.create(`deals-${Date.now()}`, notificationOptions, (id) => {
        if (chrome.runtime.lastError) {
          console.warn('Rich notification failed, trying simple fallback:', chrome.runtime.lastError);
          
          // Try a clean fallback notification without buttons or requireInteraction
          // (which can be rejected by macOS/Chrome native notification bridges)
          const fallbackOptions = {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icon.png'),
            title: '🔥 New DubiSnipe Deals Found!',
            message: notificationMessage
          };
          
          chrome.notifications.create(`deals-fallback-${Date.now()}`, fallbackOptions, (fallbackId) => {
            if (chrome.runtime.lastError) {
              console.error('All notification attempts failed:', chrome.runtime.lastError);
            } else {
              console.log('Fallback notification created successfully:', fallbackId);
            }
          });
        } else {
          console.log('Rich notification created successfully:', id);
        }
      });
    });
  }
});

// Notification Button Click (Open Latest Deal)
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId.startsWith('deals-')) {
    chrome.storage.local.get(['foundDeals'], (data) => {
      const deals = data.foundDeals || [];
      if (deals.length > 0) {
        chrome.tabs.create({ url: deals[0].url });
      }
    });
  }
  chrome.notifications.clear(notificationId);
});

chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('deals-')) {
    chrome.storage.local.get(['foundDeals'], (data) => {
      const deals = data.foundDeals || [];
      if (deals.length > 0) {
        chrome.tabs.create({ url: deals[0].url });
      }
    });
  }
  chrome.notifications.clear(notificationId);
});

// --- Scanner lifecycle cleanup (v1.2) ---
// If the scanner window/tab goes away, whether closed manually, killed by the WAF, or
// discarded by Chrome, clear the stored "active" state. Without this the popup
// keeps showing the Stop button and a stale "Scanning..." status while nothing
// is actually running, which reads exactly like "the extension stopped working."
function resetScannerState(statusMsg) {
  chrome.storage.local.set({
    activeWindowId: null,
    activeTabId: null,
    status: statusMsg || 'Idle. Ready to start.'
  });
  chrome.action.setBadgeText({ text: '' });
}

chrome.windows.onRemoved.addListener((closedWindowId) => {
  chrome.storage.local.get(['activeWindowId'], (data) => {
    if (data.activeWindowId && data.activeWindowId === closedWindowId) {
      resetScannerState('⏹️ Scanner window closed. Ready to start again.');
    }
  });
});

chrome.tabs.onRemoved.addListener((closedTabId) => {
  chrome.storage.local.get(['activeTabId', 'activeWindowId'], (data) => {
    // Only act on a bare tab close (V1.0-style). A whole-window close is handled
    // above and also fires tab removals, so the activeWindowId guard avoids a
    // double reset.
    if (data.activeTabId && data.activeTabId === closedTabId && !data.activeWindowId) {
      resetScannerState('⏹️ Scanner tab closed. Ready to start again.');
    }
  });
});

async function playChimeSound() {
  try {
    const offscreenExists = await chrome.offscreen.hasDocument();
    if (!offscreenExists) {
      await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['AUDIO_PLAYBACK'],
        justification: 'Synthesizing local deal matching audio alert chimes'
      });
      // Wait a short bit to ensure the offscreen document scripts are fully loaded/compiled
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    chrome.runtime.sendMessage({
      target: 'offscreen',
      type: 'PLAY_CHIME'
    });
  } catch (err) {
    console.error('Offscreen chime launch failed:', err);
  }
}