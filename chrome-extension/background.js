/**
 * Navlungo Price Scraper - Background Service Worker
 * Manages captured prices and auto-scrape state
 */

// Configurable backend URL - change this for production
const CONFIG = {
  // For local development:
  // BACKEND_URL: 'http://localhost:3000',
  // For production:
  BACKEND_URL: 'https://app.moogship.com',
  // API endpoint path:
  API_PATH: '/api/external-pricing/prices/batch'
};

let capturedPrices = [];
let lastCaptureTime = null;
let isAutoScraping = false;

// Listen for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Navlungo Scraper BG] Message:', message.type);

  switch (message.type) {
    case 'PRICES_CAPTURED':
      capturedPrices = message.data.prices || [];
      lastCaptureTime = new Date().toISOString();
      isAutoScraping = message.data.isAutoScraping || false;

      // Save to storage
      chrome.storage.local.set({
        capturedPrices,
        lastCaptureTime,
        isAutoScraping
      });

      // Update badge
      updateBadge(capturedPrices.length);

      sendResponse({ success: true });
      break;

    case 'AUTO_SCRAPE_COMPLETE':
      capturedPrices = message.data.prices || [];
      lastCaptureTime = new Date().toISOString();
      isAutoScraping = false;

      chrome.storage.local.set({
        capturedPrices,
        lastCaptureTime,
        isAutoScraping: false
      });

      updateBadge(capturedPrices.length);

      // Auto-send to server
      chrome.storage.local.get(['autoSend'], (result) => {
        if (result.autoSend) {
          sendToServer(capturedPrices);
        }
      });

      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Auto-Scrape Complete!',
        message: `Captured ${capturedPrices.length} shipping prices`
      });

      sendResponse({ success: true });
      break;

    case 'GET_PRICES':
      sendResponse({
        success: true,
        prices: capturedPrices,
        lastCaptureTime,
        isAutoScraping
      });
      break;

    case 'CLEAR_PRICES':
      capturedPrices = [];
      lastCaptureTime = null;
      chrome.storage.local.set({ capturedPrices: [], lastCaptureTime: null });
      updateBadge(0);
      sendResponse({ success: true });
      break;

    case 'SEND_TO_SERVER':
      sendToServer(message.data?.prices || capturedPrices)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'SEND_PRICES_BATCH':
      // Handle batch send from content script (avoids CORS)
      sendPricesBatch(message.prices)
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ success: false, error: err.message }));
      return true;

    case 'EXPORT_CSV':
      const csv = generateCSV(capturedPrices);
      sendResponse({ success: true, csv });
      break;

    case 'EXPORT_JSON':
      sendResponse({ success: true, json: JSON.stringify(capturedPrices, null, 2) });
      break;

    case 'START_AUTO_SCRAPE':
      // Forward to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'START_AUTO_SCRAPE', config: message.config });
        }
      });
      sendResponse({ success: true });
      break;

    case 'STOP_AUTO_SCRAPE':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_AUTO_SCRAPE' });
        }
      });
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

// Update badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Send batch prices to MoogShip server (called from content script)
async function sendPricesBatch(prices) {
  const url = CONFIG.BACKEND_URL + CONFIG.API_PATH;
  console.log(`[Navlungo BG] Sending batch of ${prices.length} prices to ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prices,
        source: 'chrome-extension-auto'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[Navlungo BG] Batch send response:', result);

    return { success: true, result, batchId: result.batchId };
  } catch (error) {
    console.error('[Navlungo BG] Batch send failed:', error);
    return { success: false, error: error.message };
  }
}

// Send to MoogShip server
async function sendToServer(prices) {
  const url = CONFIG.BACKEND_URL + CONFIG.API_PATH;
  console.log(`[Navlungo Scraper] Sending ${prices.length} prices to ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prices,
        source: 'chrome-extension'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[Navlungo Scraper] Server response:', result);

    // Show notification with batch ID
    if (result.success && result.batchId) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon128.png',
        title: 'Prices Sent to MoogShip',
        message: `Batch #${result.batchId} created with ${result.pricesImported} prices. Waiting for admin approval.`
      });
    }

    return { success: true, result, batchId: result.batchId };
  } catch (error) {
    console.error('[Navlungo Scraper] Server send failed:', error);

    // Show error notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Send Failed',
      message: error.message
    });

    return { success: false, error: error.message };
  }
}

// Generate CSV
function generateCSV(prices) {
  const headers = ['Carrier', 'Service', 'Price', 'Currency', 'Transit Days', 'Origin', 'Destination', 'Weight', 'Captured At'];
  const rows = prices.map(p => [
    p.carrier,
    p.service,
    p.price,
    p.currency,
    p.transitDays || '',
    p.requestParams?.origin?.country || '',
    p.requestParams?.destination?.country || '',
    p.requestParams?.weight || '',
    p.capturedAt || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

// Load on startup
chrome.storage.local.get(['capturedPrices', 'lastCaptureTime'], (result) => {
  capturedPrices = result.capturedPrices || [];
  lastCaptureTime = result.lastCaptureTime;
  updateBadge(capturedPrices.length);
});

// Initialize
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Navlungo Scraper] Extension installed');
  chrome.storage.local.set({
    capturedPrices: [],
    lastCaptureTime: null,
    autoSend: false,
    isAutoScraping: false
  });
});
