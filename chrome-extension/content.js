/**
 * Navlungo Price Scraper - Full Auto Mode
 * Works in Quick Price Calculator iframe
 */

const IS_IFRAME = window.self !== window.top;
const IS_QUICK_CALC = window.location.hostname === 'quick-price-calculator.navlungo.com';
const IS_MAIN_PAGE = window.location.hostname === 'ship.navlungo.com';

console.log(`[Navlungo Scraper] Loading... (iframe: ${IS_IFRAME}, quickCalc: ${IS_QUICK_CALC}, mainPage: ${IS_MAIN_PAGE})`);

let allPrices = [];
let isRunning = false;
let countryQueue = [];
let weightQueue = [];
let currentCountry = '';
let currentWeight = 0;
let selectedCountries = []; // User-selected countries (empty = all)
let availableCountries = []; // All countries from dropdown

// Generate weights: 0.1-0.5 (every 0.1), 0.5-10 (every 0.5), 11-30 (every 1)
function generateWeights(maxWeight = 30) {
  const weights = [];
  // 0.1 to 0.5 kg: every 0.1 kg
  for (let w = 0.1; w < 0.5; w = Math.round((w + 0.1) * 10) / 10) weights.push(w);
  // 0.5 to 10 kg: every 0.5 kg
  for (let w = 0.5; w <= 10; w = Math.round((w + 0.5) * 10) / 10) weights.push(w);
  // 11 to maxWeight: every 1 kg
  for (let w = 11; w <= maxWeight; w += 1) weights.push(w);
  return weights;
}

// ============ API INTERCEPTOR ============

function injectInterceptor() {
  const script = document.createElement('script');
  script.textContent = `
    (function() {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);
        try {
          const clone = response.clone();
          const ct = clone.headers.get('content-type') || '';
          if (ct.includes('json')) {
            const data = await clone.json();
            window.postMessage({ type: 'NAVLUNGO_API', data, url: args[0] }, '*');
          }
        } catch (e) {}
        return response;
      };

      // Also intercept XMLHttpRequest
      const originalXHR = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(...args) {
        this.addEventListener('load', function() {
          try {
            if (this.responseType === '' || this.responseType === 'json' || this.responseType === 'text') {
              let data = this.response;
              if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch(e) {}
              }
              if (data && typeof data === 'object') {
                window.postMessage({ type: 'NAVLUNGO_API', data, url: args[1] }, '*');
              }
            }
          } catch (e) {}
        });
        return originalXHR.apply(this, args);
      };
    })();
  `;
  document.head.appendChild(script);
  script.remove();
}

// ============ MESSAGE HANDLING ============

window.addEventListener('message', (event) => {
  // Handle API intercept messages
  if (event.data.type === 'NAVLUNGO_API') {
    const prices = extractPrices(event.data.data);
    if (prices.length > 0) {
      console.log(`[Scraper] ✅ ${prices.length} fiyat bulundu - ${currentCountry} ${currentWeight}kg`);

      for (const p of prices) {
        const priceData = {
          ...p,
          country: currentCountry,
          weight: currentWeight,
          timestamp: new Date().toISOString()
        };

        // Avoid duplicates
        const exists = allPrices.some(x =>
          x.carrier === p.carrier && x.service === p.service &&
          x.country === currentCountry && x.weight === currentWeight
        );

        if (!exists) {
          allPrices.push(priceData);

          // Send to parent if in iframe
          if (IS_IFRAME) {
            window.parent.postMessage({ type: 'NAVLUNGO_PRICE_DATA', price: priceData }, '*');
          }
        }
      }
      updateUI();
    }
    return;
  }

  // Handle price data from iframe (received by parent/main page)
  if (event.data.type === 'NAVLUNGO_PRICE_DATA' && IS_MAIN_PAGE && !IS_IFRAME) {
    const p = event.data.price;
    const exists = allPrices.some(x =>
      x.carrier === p.carrier && x.service === p.service &&
      x.country === p.country && x.weight === p.weight
    );
    if (!exists) {
      allPrices.push(p);
      console.log(`[Scraper] 📥 iframe'den: ${p.carrier} ${p.price} ${p.currency}`);
      updateUI();
    }
    return;
  }

  // Handle commands from parent to iframe
  if (event.data.type === 'NAVLUNGO_CMD' && IS_QUICK_CALC) {
    handleCommand(event.data);
  }
});

function handleCommand(msg) {
  console.log('[iframe] Komut alındı:', msg.cmd);

  switch(msg.cmd) {
    case 'START':
      isRunning = true;
      allPrices = [];
      startScrapingInIframe(msg.maxWeight || 30, msg.countries || []);
      break;
    case 'STOP':
      isRunning = false;
      countryQueue = [];
      weightQueue = [];
      break;
    case 'GET_STATUS':
      window.parent.postMessage({
        type: 'NAVLUNGO_STATUS',
        count: allPrices.length,
        running: isRunning,
        country: currentCountry,
        weight: currentWeight
      }, '*');
      break;
    case 'GET_COUNTRIES':
      // Fetch country list and send back
      getCountriesFromDropdown().then(countries => {
        window.parent.postMessage({
          type: 'NAVLUNGO_COUNTRIES',
          countries: countries.map(c => c.name)
        }, '*');
      });
      break;
  }
}

function extractPrices(data) {
  if (!data) return [];
  const prices = [];
  const tryArrays = [data, data.data, data.quotes, data.prices, data.rates, data.results, data.offers, data.items];

  for (const arr of tryArrays) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (item && typeof item === 'object') {
          const price = item.price ?? item.totalPrice ?? item.total ?? item.amount ?? item.cost;
          if (price && price > 0) {
            prices.push({
              carrier: item.carrier || item.carrierName || item.provider || item.name || 'Unknown',
              service: item.service || item.serviceName || item.type || 'Standard',
              price: Number(price),
              currency: item.currency || 'TRY',
              transitDays: item.transitDays || item.transitTime || null
            });
          }
        }
      }
      if (prices.length > 0) return prices;
    }
  }
  return prices;
}

// ============ IFRAME SCRAPING (runs inside Quick Price Calculator) ============

async function startScrapingInIframe(maxWeight, countriesToScrape = []) {
  console.log('[iframe] Scraping başlıyor...');

  // Get countries from dropdown
  const allCountries = await getCountriesFromDropdown();

  if (allCountries.length === 0) {
    console.log('[iframe] ❌ Ülke bulunamadı!');
    window.parent.postMessage({ type: 'NAVLUNGO_ERROR', error: 'Ülke listesi alınamadı' }, '*');
    return;
  }

  // Filter countries if specific ones selected
  let countries = allCountries;
  if (countriesToScrape && countriesToScrape.length > 0) {
    countries = allCountries.filter(c =>
      countriesToScrape.some(selected =>
        c.name.toLowerCase().includes(selected.toLowerCase()) ||
        selected.toLowerCase().includes(c.name.toLowerCase())
      )
    );
    console.log(`[iframe] ${countriesToScrape.length} ülke seçildi, ${countries.length} eşleşti`);
  }

  console.log(`[iframe] ${countries.length} ülke işlenecek`);
  window.parent.postMessage({ type: 'NAVLUNGO_STATUS', status: `${countries.length} ülke işlenecek` }, '*');

  countryQueue = [...countries];
  weightQueue = [];

  // Process countries
  await processNextCountry(maxWeight);
}

async function getCountriesFromDropdown() {
  const countries = [];

  console.log('[Scraper] Dropdown aranıyor...');

  // Find destination dropdown - second combobox (first is origin)
  const comboboxes = document.querySelectorAll('[role="combobox"]');
  console.log(`[Scraper] ${comboboxes.length} combobox bulundu`);

  let dropdown = null;

  // Try to find by label "Nereye"
  const labels = document.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent?.trim() === 'Nereye') {
      const container = label.closest('div');
      dropdown = container?.querySelector('[role="combobox"]');
      if (dropdown) {
        console.log('[Scraper] Nereye label ile dropdown bulundu');
        break;
      }
    }
  }

  // Fallback: second combobox
  if (!dropdown && comboboxes.length >= 2) {
    dropdown = comboboxes[1];
    console.log('[Scraper] İkinci combobox kullanılıyor');
  } else if (!dropdown && comboboxes.length === 1) {
    dropdown = comboboxes[0];
  }

  if (!dropdown) {
    console.log('[Scraper] ❌ Dropdown bulunamadı');
    return countries;
  }

  // Click to open dropdown with proper events
  console.log('[Scraper] Dropdown açılıyor...');

  // Simulate real click with mouse events
  dropdown.focus();
  await sleep(100);

  const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
  const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
  const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

  dropdown.dispatchEvent(mouseDown);
  await sleep(50);
  dropdown.dispatchEvent(mouseUp);
  await sleep(50);
  dropdown.dispatchEvent(click);

  // Wait for options to load
  await sleep(2000);

  // Get options
  let options = document.querySelectorAll('[role="option"]');
  console.log(`[Scraper] ${options.length} option bulundu`);

  // If still no options, wait more and try again
  if (options.length === 0) {
    await sleep(1000);
    options = document.querySelectorAll('[role="option"]');
    console.log(`[Scraper] Tekrar denendi: ${options.length} option`);
  }

  for (const opt of options) {
    const text = opt.textContent?.trim();
    // Skip Turkey (origin country) and placeholder
    if (text && text.length > 1 &&
        !text.toLowerCase().includes('seçiniz') &&
        text !== 'Türkiye' &&
        text !== 'Turkey') {
      countries.push({ name: text });
    }
  }

  console.log(`[Scraper] ${countries.length} ülke bulundu (Türkiye hariç)`);

  // Close dropdown
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escEvent);
  await sleep(500);

  return countries;
}

async function processNextCountry(maxWeight) {
  if (!isRunning || countryQueue.length === 0) {
    finishScraping();
    return;
  }

  const country = countryQueue.shift();
  currentCountry = country.name;

  console.log(`[iframe] 🌍 ${currentCountry} seçiliyor... (${countryQueue.length} kaldı)`);
  window.parent.postMessage({
    type: 'NAVLUNGO_STATUS',
    status: `🌍 ${currentCountry} (${countryQueue.length} kaldı)`,
    count: allPrices.length
  }, '*');

  // Select country
  const selected = await selectCountry(country);

  if (!selected) {
    console.log(`[iframe] ${currentCountry} seçilemedi, atlıyorum`);
    await processNextCountry(maxWeight);
    return;
  }

  await sleep(500);

  // Setup weights
  weightQueue = generateWeights(maxWeight);

  // Process weights
  await processNextWeight(maxWeight);
}

async function selectCountry(country) {
  // Find destination combobox
  const comboboxes = document.querySelectorAll('[role="combobox"]');
  let dropdown = null;

  // Try to find by label "Nereye"
  const labels = document.querySelectorAll('label');
  for (const label of labels) {
    if (label.textContent?.trim() === 'Nereye') {
      const container = label.closest('div');
      dropdown = container?.querySelector('[role="combobox"]');
      if (dropdown) break;
    }
  }

  // Fallback: second combobox
  if (!dropdown && comboboxes.length >= 2) {
    dropdown = comboboxes[1];
  } else if (!dropdown && comboboxes.length === 1) {
    dropdown = comboboxes[0];
  }

  if (!dropdown) return false;

  // Click to open with proper events
  dropdown.focus();
  await sleep(100);

  const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window });
  const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window });
  const click = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });

  dropdown.dispatchEvent(mouseDown);
  await sleep(50);
  dropdown.dispatchEvent(mouseUp);
  await sleep(50);
  dropdown.dispatchEvent(click);

  await sleep(2000);

  // Find the option
  const options = document.querySelectorAll('[role="option"]');

  for (const opt of options) {
    const text = opt.textContent?.trim();
    if (text === country.name) {
      opt.click();
      console.log(`[Scraper] ✅ ${country.name} seçildi`);
      await sleep(500);
      return true;
    }
  }

  // Close dropdown if not found
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escEvent);
  await sleep(300);

  return false;
}

async function processNextWeight(maxWeight) {
  if (!isRunning) return;

  if (weightQueue.length === 0) {
    await processNextCountry(maxWeight);
    return;
  }

  currentWeight = weightQueue.shift();

  console.log(`[iframe] ⚖️ ${currentCountry} - ${currentWeight}kg`);
  window.parent.postMessage({
    type: 'NAVLUNGO_STATUS',
    status: `${currentCountry} - ${currentWeight}kg`,
    count: allPrices.length
  }, '*');

  // Fill weight and submit
  const success = await fillWeightAndSubmit(currentWeight);

  if (success) {
    // Wait for results to load
    await sleep(3000);

    // Read prices from DOM
    const prices = readPricesFromDOM();
    if (prices.length > 0) {
      console.log(`[Scraper] ✅ ${prices.length} fiyat bulundu`);
      for (const p of prices) {
        const priceData = {
          ...p,
          country: currentCountry,
          weight: currentWeight,
          timestamp: new Date().toISOString()
        };

        // Avoid duplicates
        const exists = allPrices.some(x =>
          x.carrier === p.carrier && x.country === currentCountry && x.weight === currentWeight
        );

        if (!exists) {
          allPrices.push(priceData);
        }
      }
      updateUI();
    }
  }

  if (isRunning) {
    await processNextWeight(maxWeight);
  }
}

// Read prices directly from DOM
function readPricesFromDOM() {
  const prices = [];
  const allText = document.body.innerText;
  const lines = allText.split('\n').map(l => l.trim()).filter(l => l);

  // Carrier names (case insensitive matching)
  const carrierPatterns = ['Ups', 'UPS', 'Fedex', 'FedEx', 'Dhl', 'DHL', 'Tnt', 'TNT', 'Ptt', 'PTT', 'Aramex', 'EMS', 'Yurtiçi', 'Aras', 'MNG', 'Sürat'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const carrierName of carrierPatterns) {
      if (line === carrierName || line.toLowerCase() === carrierName.toLowerCase()) {
        // Found a carrier line, look for service type and price in next lines
        let service = 'Standard';
        let transitTime = '';
        let price = 0;
        let currency = 'USD';

        // Check next 4 lines for service, transit time, and price
        for (let j = 1; j <= 4 && i + j < lines.length; j++) {
          const nextLine = lines[i + j];

          // Service type
          if (nextLine === 'Express' || nextLine === 'Ekonomi' || nextLine === 'Economy' || nextLine === 'Standard') {
            service = nextLine;
          }

          // Transit time
          if (nextLine.includes('iş günü') || nextLine.includes('gün')) {
            transitTime = nextLine;
          }

          // Currency and price (e.g., "USD" then "158.60")
          if (nextLine === 'USD' || nextLine === 'EUR' || nextLine === 'TRY' || nextLine === 'TL') {
            currency = nextLine === 'TL' ? 'TRY' : nextLine;
            // Price should be in the next line
            if (i + j + 1 < lines.length) {
              const priceLine = lines[i + j + 1];
              const priceNum = parseFloat(priceLine.replace(/,/g, '.'));
              if (!isNaN(priceNum) && priceNum > 0) {
                price = priceNum;
              }
            }
          }

          // Or price pattern in same line
          const priceMatch = nextLine.match(/^([\d.,]+)$/);
          if (priceMatch && price === 0) {
            const priceNum = parseFloat(priceMatch[1].replace(/,/g, '.'));
            if (!isNaN(priceNum) && priceNum > 0 && priceNum < 100000) {
              price = priceNum;
            }
          }
        }

        if (price > 0) {
          // Avoid duplicates with same carrier+service+price
          const exists = prices.some(p =>
            p.carrier.toLowerCase() === carrierName.toLowerCase() &&
            p.service === service &&
            Math.abs(p.price - price) < 0.01
          );

          if (!exists) {
            prices.push({
              carrier: carrierName.toUpperCase(),
              service,
              price,
              currency,
              transitTime
            });
            console.log(`[Scraper] 💰 ${carrierName} ${service}: ${price} ${currency}`);
          }
        }
        break;
      }
    }
  }

  return prices;
}

async function fillWeightAndSubmit(weight) {
  // Find weight input
  let input = document.querySelector('input[placeholder*="Ağırlık"], input[placeholder*="ağırlık"], input[placeholder*="kg"]');

  if (!input) {
    // Try finding by label
    const labels = document.querySelectorAll('label, [class*="label"], [class*="Label"]');
    for (const label of labels) {
      if (label.textContent?.includes('Ağırlık') || label.textContent?.includes('kg')) {
        const container = label.closest('[class*="FormControl"], [class*="form"], div');
        input = container?.querySelector('input');
        if (input) break;
      }
    }
  }

  if (!input) {
    // Try any number input
    const inputs = document.querySelectorAll('input[type="number"], input[inputmode="numeric"]');
    for (const inp of inputs) {
      const placeholder = inp.placeholder?.toLowerCase() || '';
      const nearby = inp.closest('div')?.textContent?.toLowerCase() || '';
      if (placeholder.includes('ağırlık') || placeholder.includes('kg') || nearby.includes('ağırlık')) {
        input = inp;
        break;
      }
    }
  }

  if (!input) {
    console.log('[iframe] ❌ Ağırlık input bulunamadı');
    return false;
  }

  // Fill value using React-compatible method
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  input.focus();
  await sleep(100);

  nativeSetter.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(50);

  nativeSetter.call(input, weight.toString());
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.dispatchEvent(new Event('blur', { bubbles: true }));

  await sleep(300);

  // Find and click submit button
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase() || '';
    if (text.includes('hesapla') || text.includes('ara') || text.includes('search') || text.includes('calculate')) {
      btn.click();
      console.log(`[iframe] ✅ ${weight}kg için buton tıklandı`);
      return true;
    }
  }

  // Try clicking any primary button
  const primaryBtns = document.querySelectorAll('[class*="primary"], [class*="Primary"], button[type="submit"]');
  if (primaryBtns.length > 0) {
    primaryBtns[0].click();
    console.log(`[iframe] ✅ ${weight}kg için primary buton tıklandı`);
    return true;
  }

  console.log('[iframe] ❌ Submit butonu bulunamadı');
  return false;
}

function finishScraping() {
  isRunning = false;
  console.log(`[Scraper] ✅ Tamamlandı! ${allPrices.length} fiyat toplandı`);

  if (IS_IFRAME) {
    // Send to parent
    window.parent.postMessage({
      type: 'NAVLUNGO_FINISHED',
      count: allPrices.length,
      prices: allPrices
    }, '*');
  } else {
    // Update local UI
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('stop-btn').style.display = 'none';
    updateStatus(`✅ Tamamlandı! ${allPrices.length} fiyat`);
    updateUI();
    showNotification(`✅ ${allPrices.length} fiyat toplandı!`);
  }
}

// ============ QUICK CALC UI (when opened directly) ============

function createQuickCalcUI() {
  if (document.getElementById('scraper-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'scraper-panel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    ">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px;">
        <div style="font-size: 18px; font-weight: 700;">📦 Navlungo Scraper</div>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;" id="status-text">Hazır</div>
      </div>

      <div style="padding: 16px;">
        <div style="margin-bottom: 12px;">
          <label style="font-size: 12px; font-weight: 600; color: #333;">Max Ağırlık (kg):</label>
          <input type="number" id="max-weight-input" value="30" min="10" max="100" style="
            width: 100%;
            margin-top: 4px;
            padding: 8px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          ">
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="start-btn" style="
            flex: 1;
            padding: 12px;
            background: linear-gradient(135deg, #11998e, #38ef7d);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
          ">▶️ BAŞLAT</button>
          <button id="stop-btn" style="
            flex: 1;
            padding: 12px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            display: none;
          ">⏹️ DUR</button>
        </div>

        <div style="background: #f8f9fa; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 12px;">
          <div id="price-count" style="font-size: 40px; font-weight: 800; color: #667eea;">0</div>
          <div style="color: #666; font-size: 12px;">fiyat toplandı</div>
        </div>

        <div style="display: flex; gap: 6px;">
          <button id="export-csv-btn" style="flex:1;padding:10px;background:#3498db;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">📥 CSV</button>
          <button id="export-json-btn" style="flex:1;padding:10px;background:#9b59b6;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px;">📄 JSON</button>
          <button id="clear-btn" style="padding:10px 14px;background:#95a5a6;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">🗑️</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('start-btn').onclick = startDirectScrape;
  document.getElementById('stop-btn').onclick = stopDirectScrape;
  document.getElementById('export-csv-btn').onclick = exportCSV;
  document.getElementById('export-json-btn').onclick = exportJSON;
  document.getElementById('clear-btn').onclick = clearAll;
}

async function startDirectScrape() {
  const maxWeight = parseInt(document.getElementById('max-weight-input')?.value) || 30;

  isRunning = true;
  allPrices = [];
  updateUI();

  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('stop-btn').style.display = 'block';
  updateStatus('🚀 Başlatılıyor...');

  // Start scraping directly on this page
  await startScrapingInIframe(maxWeight);
}

function stopDirectScrape() {
  isRunning = false;
  countryQueue = [];
  weightQueue = [];
  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('stop-btn').style.display = 'none';
  updateStatus('Durduruldu');
}

// ============ MAIN PAGE UI ============

function createMainPageUI() {
  if (document.getElementById('scraper-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'scraper-panel';
  panel.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
      max-height: 90vh;
      overflow-y: auto;
    ">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">
        <div style="font-size: 20px; font-weight: 700;">📦 Navlungo Scraper</div>
        <div style="font-size: 13px; opacity: 0.9; margin-top: 4px;" id="status-text">Hazır</div>
      </div>

      <div style="padding: 20px;">
        <!-- Country Selection -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 13px; font-weight: 600; color: #333;">🌍 Ülke Seçimi:</label>
          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button id="load-countries-btn" style="
              flex: 1;
              padding: 8px;
              background: #667eea;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
            ">Ülkeleri Yükle</button>
            <button id="select-all-btn" style="
              padding: 8px 12px;
              background: #e0e0e0;
              color: #333;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
            ">Tümü</button>
            <button id="clear-selection-btn" style="
              padding: 8px 12px;
              background: #e0e0e0;
              color: #333;
              border: none;
              border-radius: 6px;
              font-size: 12px;
              cursor: pointer;
            ">Temizle</button>
          </div>
          <div id="country-list" style="
            max-height: 150px;
            overflow-y: auto;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            margin-top: 8px;
            display: none;
          "></div>
          <div id="selected-count" style="font-size: 11px; color: #888; margin-top: 4px;">
            Tüm ülkeler seçili (yüklemek için butona tıklayın)
          </div>
        </div>

        <!-- Weight Input -->
        <div style="margin-bottom: 16px;">
          <label style="font-size: 13px; font-weight: 600; color: #333;">⚖️ Max Ağırlık (kg):</label>
          <input type="number" id="max-weight-input" value="30" min="10" max="100" style="
            width: 100%;
            margin-top: 6px;
            padding: 10px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            box-sizing: border-box;
          ">
          <div style="font-size: 11px; color: #888; margin-top: 4px;">
            0.5-10kg her 0.5kg, sonra her 1kg
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <button id="start-btn" style="
            flex: 1;
            padding: 14px;
            background: linear-gradient(135deg, #11998e, #38ef7d);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
          ">▶️ BAŞLAT</button>
          <button id="stop-btn" style="
            flex: 1;
            padding: 14px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: none;
          ">⏹️ DURDUR</button>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
          <div id="price-count" style="font-size: 48px; font-weight: 800; color: #667eea;">0</div>
          <div style="color: #666; font-size: 13px;">fiyat toplandı</div>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <button id="send-server-btn" style="
            flex: 1;
            padding: 12px;
            background: #27ae60;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">📤 Sunucuya Gönder</button>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="export-csv-btn" style="
            flex: 1;
            padding: 12px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">📥 CSV</button>
          <button id="export-json-btn" style="
            flex: 1;
            padding: 12px;
            background: #9b59b6;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">📄 JSON</button>
          <button id="clear-btn" style="
            padding: 12px 16px;
            background: #95a5a6;
            color: white;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
          ">🗑️</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('start-btn').onclick = startFromMainPage;
  document.getElementById('stop-btn').onclick = stopFromMainPage;
  document.getElementById('export-csv-btn').onclick = exportCSV;
  document.getElementById('export-json-btn').onclick = exportJSON;
  document.getElementById('clear-btn').onclick = clearAll;
  document.getElementById('load-countries-btn').onclick = loadCountries;
  document.getElementById('select-all-btn').onclick = selectAllCountries;
  document.getElementById('clear-selection-btn').onclick = clearCountrySelection;
  document.getElementById('send-server-btn').onclick = sendToServer;
}

// Find the price calculator iframe
function findPriceIframe() {
  // Try multiple selectors
  const selectors = [
    'iframe[src*="quick-price-calculator"]',
    'iframe[src*="price-calculator"]',
    'iframe[src*="calculator"]',
    'iframe[src*="navlungo"]',
    'iframe'
  ];

  for (const selector of selectors) {
    const iframes = document.querySelectorAll(selector);
    for (const iframe of iframes) {
      const src = iframe.src || '';
      console.log(`[Scraper] iframe bulundu: ${src}`);
      if (src.includes('calculator') || src.includes('price') || iframes.length === 1) {
        return iframe;
      }
    }
  }

  // Log all iframes for debugging
  const allIframes = document.querySelectorAll('iframe');
  console.log(`[Scraper] Toplam ${allIframes.length} iframe var:`);
  allIframes.forEach((f, i) => console.log(`  ${i}: ${f.src}`));

  return allIframes.length > 0 ? allIframes[0] : null;
}

// Load countries from iframe
function loadCountries() {
  updateStatus('Ülkeler yükleniyor...');

  // Debug: Log page info
  console.log(`[Scraper] Sayfa: ${window.location.href}`);
  console.log(`[Scraper] IS_MAIN_PAGE: ${IS_MAIN_PAGE}, IS_QUICK_CALC: ${IS_QUICK_CALC}, IS_IFRAME: ${IS_IFRAME}`);

  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    console.log(`[Scraper] iframe'e GET_COUNTRIES gönderiliyor: ${iframe.src}`);
    iframe.contentWindow.postMessage({ type: 'NAVLUNGO_CMD', cmd: 'GET_COUNTRIES' }, '*');
  } else {
    console.log('[Scraper] ❌ iframe bulunamadı!');

    // Log all iframes on page for debugging
    const allIframes = document.querySelectorAll('iframe');
    console.log(`[Scraper] Sayfadaki tüm iframeler (${allIframes.length}):`);
    allIframes.forEach((f, i) => {
      console.log(`  [${i}] src: ${f.src || '(boş)'}, id: ${f.id || '(yok)'}, class: ${f.className || '(yok)'}`);
    });

    showNotification('❌ iframe bulunamadı! Konsolu kontrol edin.', 'error');

    // Try direct scraping on current page
    if (IS_QUICK_CALC || window.location.href.includes('calculator') || window.location.href.includes('navlungo')) {
      console.log('[Scraper] Direkt sayfa üzerinde çalışılıyor...');
      updateStatus('Direkt sayfa üzerinde deneniyor...');
      getCountriesFromDropdown().then(countries => {
        if (countries.length > 0) {
          renderCountryList(countries.map(c => c.name));
          updateStatus(`${countries.length} ülke yüklendi (direkt)`);
          showNotification(`✅ ${countries.length} ülke yüklendi (direkt mod)`);
        } else {
          updateStatus('❌ Ülke bulunamadı');
          showNotification('❌ Dropdown bulunamadı. Fiyat hesaplama sayfasında olduğunuzdan emin olun.', 'error');
        }
      });
    } else {
      updateStatus('❌ Yanlış sayfa');
      showNotification('❌ Navlungo fiyat hesaplama sayfasına gidin', 'error');
    }
  }
}

// Render country checkboxes
function renderCountryList(countries) {
  availableCountries = countries;
  const container = document.getElementById('country-list');
  container.style.display = 'block';

  container.innerHTML = countries.map(c => `
    <label style="display: flex; align-items: center; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0;">
      <input type="checkbox" value="${c}" style="margin-right: 8px;" class="country-checkbox">
      <span style="font-size: 13px;">${c}</span>
    </label>
  `).join('');

  // Add change listener
  container.querySelectorAll('.country-checkbox').forEach(cb => {
    cb.addEventListener('change', updateSelectedCount);
  });

  updateSelectedCount();
}

function selectAllCountries() {
  document.querySelectorAll('.country-checkbox').forEach(cb => cb.checked = true);
  updateSelectedCount();
}

function clearCountrySelection() {
  document.querySelectorAll('.country-checkbox').forEach(cb => cb.checked = false);
  updateSelectedCount();
}

function updateSelectedCount() {
  const checked = document.querySelectorAll('.country-checkbox:checked');
  const countEl = document.getElementById('selected-count');
  if (checked.length === 0) {
    countEl.textContent = 'Tüm ülkeler seçili (hiçbiri seçilmezse tümü işlenir)';
    selectedCountries = [];
  } else {
    countEl.textContent = `${checked.length} ülke seçili`;
    selectedCountries = Array.from(checked).map(cb => cb.value);
  }
}

// Send prices to MoogShip server
async function sendToServer() {
  if (allPrices.length === 0) {
    showNotification('❌ Gönderilecek fiyat yok!', 'error');
    return;
  }

  updateStatus('Sunucuya gönderiliyor...');

  try {
    const response = await fetch('https://app.moogship.com/api/external-pricing/prices/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prices: allPrices.map(p => ({
          country: p.country,
          countryName: p.country,
          weight: p.weight,
          carrier: p.carrier,
          service: p.service,
          price: p.price,
          currency: p.currency,
          transitDays: p.transitTime || p.transitDays || null
        })),
        source: 'chrome-extension'
      })
    });

    const result = await response.json();
    if (result.success) {
      showNotification(`✅ ${result.pricesImported} fiyat gönderildi! Batch #${result.batchId}`);
      updateStatus(`✅ Batch #${result.batchId} oluşturuldu`);
    } else {
      showNotification(`❌ Hata: ${result.error}`, 'error');
    }
  } catch (error) {
    showNotification(`❌ Bağlantı hatası: ${error.message}`, 'error');
  }
}

function startFromMainPage() {
  const maxWeight = parseInt(document.getElementById('max-weight-input')?.value) || 30;

  isRunning = true;
  allPrices = [];
  updateUI();

  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('stop-btn').style.display = 'block';

  const countryInfo = selectedCountries.length > 0
    ? `${selectedCountries.length} ülke`
    : 'tüm ülkeler';
  updateStatus(`🚀 Başlatılıyor... (${countryInfo})`);

  // Send command to iframe with selected countries
  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({
      type: 'NAVLUNGO_CMD',
      cmd: 'START',
      maxWeight,
      countries: selectedCountries
    }, '*');
    console.log(`[main] START komutu iframe'e gönderildi - ${countryInfo}`);
  } else {
    console.log('[main] ❌ iframe bulunamadı!');
    updateStatus('❌ iframe bulunamadı!');
    showNotification('❌ iframe bulunamadı! Sayfayı yenileyin.', 'error');
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('stop-btn').style.display = 'none';
    isRunning = false;
  }
}

function stopFromMainPage() {
  isRunning = false;

  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'NAVLUNGO_CMD', cmd: 'STOP' }, '*');
  }

  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('stop-btn').style.display = 'none';
  updateStatus('Durduruldu');
}

// Listen for status updates from iframe
window.addEventListener('message', (event) => {
  if (!IS_MAIN_PAGE || IS_IFRAME) return;

  if (event.data.type === 'NAVLUNGO_STATUS') {
    if (event.data.status) updateStatus(event.data.status);
    if (event.data.count !== undefined) {
      document.getElementById('price-count').textContent = event.data.count;
    }
  }

  if (event.data.type === 'NAVLUNGO_COUNTRIES') {
    // Country list received from iframe
    console.log(`[main] ${event.data.countries?.length || 0} ülke alındı`);
    if (event.data.countries && event.data.countries.length > 0) {
      renderCountryList(event.data.countries);
      updateStatus(`${event.data.countries.length} ülke yüklendi`);
      showNotification(`✅ ${event.data.countries.length} ülke yüklendi`);
    } else {
      showNotification('❌ Ülke listesi alınamadı', 'error');
    }
  }

  if (event.data.type === 'NAVLUNGO_FINISHED') {
    isRunning = false;
    allPrices = event.data.prices || allPrices;
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('stop-btn').style.display = 'none';
    updateStatus(`✅ Tamamlandı! ${event.data.count} fiyat`);
    updateUI();
    showNotification(`✅ ${event.data.count} fiyat toplandı!`);
  }

  if (event.data.type === 'NAVLUNGO_ERROR') {
    updateStatus(`❌ ${event.data.error}`);
    showNotification(`❌ ${event.data.error}`, 'error');
  }
});

function updateUI() {
  const el = document.getElementById('price-count');
  if (el) el.textContent = allPrices.length;

  // Also send to parent if in iframe
  if (IS_IFRAME) {
    window.parent.postMessage({ type: 'NAVLUNGO_STATUS', count: allPrices.length }, '*');
  }
}

function updateStatus(text) {
  const el = document.getElementById('status-text');
  if (el) el.textContent = text;

  // Also send to parent if in iframe
  if (IS_IFRAME) {
    window.parent.postMessage({ type: 'NAVLUNGO_STATUS', status: text }, '*');
  }
}

function showNotification(msg, type = 'success') {
  const existing = document.getElementById('scraper-notif');
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = 'scraper-notif';
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    z-index: 9999999;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  `;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

function exportCSV() {
  if (allPrices.length === 0) {
    showNotification('❌ Veri yok!', 'error');
    return;
  }

  const header = 'Ülke,Ağırlık (kg),Taşıyıcı,Servis,Fiyat,Para Birimi,Teslimat Süresi\n';
  const rows = allPrices.map(p =>
    `"${p.country}",${p.weight},"${p.carrier}","${p.service}",${p.price},"${p.currency}","${p.transitDays || ''}"`
  ).join('\n');

  downloadFile(header + rows, `navlungo-fiyatlar-${Date.now()}.csv`, 'text/csv');
  showNotification('✅ CSV indirildi!');
}

function exportJSON() {
  if (allPrices.length === 0) {
    showNotification('❌ Veri yok!', 'error');
    return;
  }

  downloadFile(JSON.stringify(allPrices, null, 2), `navlungo-fiyatlar-${Date.now()}.json`, 'application/json');
  showNotification('✅ JSON indirildi!');
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function clearAll() {
  allPrices = [];
  updateUI();
  showNotification('🗑️ Temizlendi');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ============ INIT ============

injectInterceptor();

function init() {
  if (!document.body) {
    setTimeout(init, 500);
    return;
  }

  if (IS_MAIN_PAGE && !IS_IFRAME) {
    // Main page - show UI
    createMainPageUI();
    console.log('[Navlungo Scraper] ✅ Ana sayfa UI oluşturuldu');
  } else if (IS_QUICK_CALC && !IS_IFRAME) {
    // Quick Price Calculator opened directly (not in iframe) - show UI and work here
    createQuickCalcUI();
    console.log('[Navlungo Scraper] ✅ Quick Price Calculator UI oluşturuldu');
  } else if (IS_QUICK_CALC && IS_IFRAME) {
    // Quick Price Calculator in iframe - ready for commands
    console.log('[Navlungo Scraper] ✅ Quick Price Calculator iframe hazır');
  } else {
    console.log('[Navlungo Scraper] ✅ Diğer sayfa/iframe - API dinleniyor');
  }
}

init();

chrome.runtime?.onMessage?.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_PRICES') sendResponse({ prices: allPrices });
  return true;
});

console.log('[Navlungo Scraper] ✅ Yüklendi!');
