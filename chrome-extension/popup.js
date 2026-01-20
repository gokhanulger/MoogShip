/**
 * Navlungo Price Scraper - Popup Script
 */

// DOM elements
const priceCountEl = document.getElementById('priceCount');
const routeCountEl = document.getElementById('routeCount');
const pricesContainer = document.getElementById('pricesContainer');
const startScrapeBtn = document.getElementById('startScrapeBtn');
const stopScrapeBtn = document.getElementById('stopScrapeBtn');
const sendBtn = document.getElementById('sendBtn');
const copyBtn = document.getElementById('copyBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const clearBtn = document.getElementById('clearBtn');
const autoSendToggle = document.getElementById('autoSendToggle');
const scrapingStatus = document.getElementById('scrapingStatus');
const scrapingText = document.getElementById('scrapingText');
const toast = document.getElementById('toast');

let currentPrices = [];
let isAutoScraping = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadPrices();
  loadSettings();
  setupEventListeners();
  startPolling();
});

// Load prices
function loadPrices() {
  chrome.storage.local.get(['capturedPrices', 'isAutoScraping'], (result) => {
    currentPrices = result.capturedPrices || [];
    isAutoScraping = result.isAutoScraping || false;
    updateUI();
  });
}

// Load settings
function loadSettings() {
  chrome.storage.local.get(['autoSend'], (result) => {
    autoSendToggle.checked = result.autoSend || false;
  });
}

// Setup event listeners
function setupEventListeners() {
  startScrapeBtn.addEventListener('click', startAutoScrape);
  stopScrapeBtn.addEventListener('click', stopAutoScrape);
  sendBtn.addEventListener('click', sendToServer);
  copyBtn.addEventListener('click', copyToClipboard);
  exportCsvBtn.addEventListener('click', exportCSV);
  exportJsonBtn.addEventListener('click', exportJSON);
  clearBtn.addEventListener('click', clearPrices);
  autoSendToggle.addEventListener('change', toggleAutoSend);

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.capturedPrices) {
      currentPrices = changes.capturedPrices.newValue || [];
      updateUI();
    }
    if (changes.isAutoScraping) {
      isAutoScraping = changes.isAutoScraping.newValue;
      updateScrapingUI();
    }
  });
}

// Poll for updates
function startPolling() {
  setInterval(() => {
    chrome.storage.local.get(['capturedPrices', 'isAutoScraping'], (result) => {
      const newPrices = result.capturedPrices || [];
      if (newPrices.length !== currentPrices.length) {
        currentPrices = newPrices;
        updateUI();
      }
      if (result.isAutoScraping !== isAutoScraping) {
        isAutoScraping = result.isAutoScraping;
        updateScrapingUI();
      }
    });
  }, 1000);
}

// Update UI
function updateUI() {
  priceCountEl.textContent = currentPrices.length;

  // Count unique routes
  const routes = new Set(currentPrices.map(p =>
    `${p.requestParams?.origin?.country || ''}-${p.requestParams?.destination?.country || ''}`
  ));
  routeCountEl.textContent = routes.size;

  // Enable/disable buttons
  const hasData = currentPrices.length > 0;
  sendBtn.disabled = !hasData;
  copyBtn.disabled = !hasData;
  exportCsvBtn.disabled = !hasData;
  exportJsonBtn.disabled = !hasData;
  clearBtn.disabled = !hasData;

  updateScrapingUI();
  renderPrices();
}

// Update scraping UI
function updateScrapingUI() {
  if (isAutoScraping) {
    startScrapeBtn.style.display = 'none';
    stopScrapeBtn.style.display = 'flex';
    scrapingStatus.classList.remove('hidden');
  } else {
    startScrapeBtn.style.display = 'flex';
    stopScrapeBtn.style.display = 'none';
    scrapingStatus.classList.add('hidden');
  }
}

// Render prices
function renderPrices() {
  if (currentPrices.length === 0) {
    pricesContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🚀</div>
        <h3>Ready to Scrape</h3>
        <p>
          Click "Start Auto-Scrape" to automatically capture all shipping prices from Navlungo.
          <br><br>
          Make sure you're logged in to Navlungo first!
        </p>
      </div>
    `;
    return;
  }

  // Sort by price
  const sorted = [...currentPrices].sort((a, b) => a.price - b.price);

  // Show top 20
  const display = sorted.slice(0, 20);

  pricesContainer.innerHTML = display.map(p => `
    <div class="price-card">
      <div class="price-card-header">
        <div class="carrier-info">
          <h4>${escapeHtml(p.carrier)}</h4>
          <p>${escapeHtml(p.service)}</p>
        </div>
        <div style="text-align: right;">
          <div class="price-value">${formatPrice(p.price)}</div>
          <div class="price-currency">${escapeHtml(p.currency)}</div>
        </div>
      </div>
      ${p.transitDays ? `<div class="transit-badge">🚚 ${p.transitDays} days</div>` : ''}
    </div>
  `).join('');

  if (sorted.length > 20) {
    pricesContainer.innerHTML += `
      <div style="text-align: center; padding: 16px; color: #666; font-size: 13px;">
        ... and ${sorted.length - 20} more prices
      </div>
    `;
  }
}

// Start auto-scrape
function startAutoScrape() {
  chrome.runtime.sendMessage({ type: 'START_AUTO_SCRAPE' });
  isAutoScraping = true;
  updateScrapingUI();
  showToast('Auto-scrape started!', 'success');
}

// Stop auto-scrape
function stopAutoScrape() {
  chrome.runtime.sendMessage({ type: 'STOP_AUTO_SCRAPE' });
  isAutoScraping = false;
  updateScrapingUI();
  showToast('Auto-scrape stopped', 'success');
}

// Send to server
async function sendToServer() {
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span>⏳</span> Sending...';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_TO_SERVER',
      data: { prices: currentPrices }
    });

    if (response.success) {
      showToast('Prices sent to server!', 'success');
    } else {
      showToast('Failed: ' + response.error, 'error');
    }
  } catch (error) {
    showToast('Error: ' + error.message, 'error');
  }

  sendBtn.disabled = false;
  sendBtn.innerHTML = '<span>📤</span> Send to Server';
}

// Copy to clipboard
async function copyToClipboard() {
  const text = currentPrices.map(p =>
    `${p.carrier} - ${p.service}: ${formatPrice(p.price)} ${p.currency}${p.transitDays ? ` (${p.transitDays} days)` : ''}`
  ).join('\n');

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch (error) {
    showToast('Copy failed', 'error');
  }
}

// Export CSV
async function exportCSV() {
  const response = await chrome.runtime.sendMessage({ type: 'EXPORT_CSV' });
  if (response.success) {
    downloadFile(response.csv, 'navlungo-prices.csv', 'text/csv');
    showToast('CSV exported!', 'success');
  }
}

// Export JSON
async function exportJSON() {
  const response = await chrome.runtime.sendMessage({ type: 'EXPORT_JSON' });
  if (response.success) {
    downloadFile(response.json, 'navlungo-prices.json', 'application/json');
    showToast('JSON exported!', 'success');
  }
}

// Download file
function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Clear prices
function clearPrices() {
  chrome.runtime.sendMessage({ type: 'CLEAR_PRICES' }, () => {
    currentPrices = [];
    updateUI();
    showToast('Prices cleared', 'success');
  });
}

// Toggle auto-send
function toggleAutoSend() {
  const enabled = autoSendToggle.checked;
  chrome.storage.local.set({ autoSend: enabled });
  showToast(enabled ? 'Auto-send enabled' : 'Auto-send disabled', 'success');
}

// Show toast
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// Format price
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
