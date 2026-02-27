/**
 * Navlungo Price Scraper - Full Auto Mode
 * Works in Quick Price Calculator iframe
 */

// Prevent double loading
if (window.__NAVLUNGO_SCRAPER_LOADED__) {
  console.log('[Navlungo Scraper] Already loaded, skipping...');
} else {
  window.__NAVLUNGO_SCRAPER_LOADED__ = true;

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
let pendingPrices = []; // Prices waiting to be sent
let sentCount = 0; // Total prices sent to server
let isSending = false; // Flag to prevent concurrent sends
let isPaused = false; // Pause flag for user control
const AUTO_SEND_BATCH_SIZE = 25; // Send every 25 prices (reduced from 50)
const AUTO_SEND_INTERVAL = 15000; // Or every 15 seconds (increased from 10)
const MAX_MEMORY_PRICES = 500; // Maximum prices to keep in memory before forced send
const WEIGHT_DELAY = 2000; // Delay between weight iterations (ms)
const COUNTRY_DELAY = 3000; // Delay between country iterations (ms)
const MAX_RETRIES = 3; // Max retries for failed sends

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
          queuePriceForSend(priceData); // Auto-send to server

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
      isPaused = false;
      allPrices = [];
      pendingPrices = [];
      sentCount = 0;
      startScrapingInIframe(msg.maxWeight || 30, msg.countries || []);
      break;
    case 'STOP':
      isRunning = false;
      isPaused = false;
      countryQueue = [];
      weightQueue = [];
      // Send remaining prices before stopping
      if (pendingPrices.length > 0) {
        autoSendPrices();
      }
      break;
    case 'PAUSE':
      isPaused = true;
      window.parent.postMessage({ type: 'NAVLUNGO_STATUS', status: '⏸️ Duraklatıldı' }, '*');
      break;
    case 'RESUME':
      isPaused = false;
      window.parent.postMessage({ type: 'NAVLUNGO_STATUS', status: '▶️ Devam ediliyor...' }, '*');
      // Resume processing
      if (weightQueue.length > 0) {
        processNextWeight(30);
      } else if (countryQueue.length > 0) {
        processNextCountry(30);
      }
      break;
    case 'GET_STATUS':
      window.parent.postMessage({
        type: 'NAVLUNGO_STATUS',
        count: allPrices.length,
        running: isRunning,
        paused: isPaused,
        country: currentCountry,
        weight: currentWeight,
        pending: pendingPrices.length,
        sent: sentCount,
        countriesLeft: countryQueue.length,
        weightsLeft: weightQueue.length
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
  if (!data) {
    console.log('[Scraper] extractPrices: data boş');
    return [];
  }

  const prices = [];
  const tryArrays = [
    { name: 'root', arr: data },
    { name: 'data', arr: data.data },
    { name: 'quotes', arr: data.quotes },
    { name: 'prices', arr: data.prices },
    { name: 'rates', arr: data.rates },
    { name: 'results', arr: data.results },
    { name: 'offers', arr: data.offers },
    { name: 'items', arr: data.items },
    { name: 'services', arr: data.services },
    { name: 'carriers', arr: data.carriers }
  ];

  for (const { name, arr } of tryArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      console.log(`[Scraper] extractPrices: "${name}" dizisinde ${arr.length} eleman var`);
      for (const item of arr) {
        if (item && typeof item === 'object') {
          // Try multiple price field names
          const price = item.price ?? item.totalPrice ?? item.total ?? item.amount ?? item.cost ??
                       item.Price ?? item.TotalPrice ?? item.netPrice ?? item.grossPrice;

          if (price && Number(price) > 0) {
            const extracted = {
              carrier: item.carrier || item.carrierName || item.provider || item.name ||
                      item.Carrier || item.CarrierName || item.providerName || 'Unknown',
              service: item.service || item.serviceName || item.type || item.productName ||
                      item.Service || item.ServiceName || 'Standard',
              price: Number(price),
              currency: item.currency || item.Currency || item.currencyCode || 'TRY',
              transitDays: item.transitDays || item.transitTime || item.deliveryDays ||
                          item.TransitDays || item.eta || null
            };
            prices.push(extracted);
            console.log(`[Scraper] 💰 Fiyat çıkarıldı: ${extracted.carrier} ${extracted.service} - ${extracted.price} ${extracted.currency}`);
          }
        }
      }
      if (prices.length > 0) {
        console.log(`[Scraper] extractPrices: Toplam ${prices.length} fiyat çıkarıldı`);
        return prices;
      }
    }
  }

  // If no prices found, log the data structure for debugging
  if (prices.length === 0 && data) {
    console.log('[Scraper] ⚠️ Fiyat bulunamadı. Data yapısı:', JSON.stringify(data).substring(0, 500));
  }

  return prices;
}

// ============ IFRAME SCRAPING (runs inside Quick Price Calculator) ============

async function startScrapingInIframe(maxWeight, countriesToScrape = []) {
  console.log('[iframe] Scraping başlıyor...');

  // Reset counters for new scrape
  sentCount = 0;
  pendingPrices = [];
  startAutoSendTimer();

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

  // Wait a bit before starting to ensure dropdown is fully closed
  await sleep(1000);

  // Process countries
  await processNextCountry(maxWeight);
}

async function getCountriesFromDropdown() {
  const countries = [];

  console.log('[Scraper] Dropdown aranıyor...');

  // Find destination dropdown - Radix UI Select trigger
  // Try multiple selectors for Radix UI
  let dropdown = null;

  // Strategy 1: Find by placeholder text "Nereye"
  const triggers = document.querySelectorAll('[role="combobox"], [data-slot="select-trigger"]');
  console.log(`[Scraper] ${triggers.length} trigger bulundu`);

  for (const trigger of triggers) {
    const text = trigger.textContent?.toLowerCase() || '';
    if (text.includes('nereye') || text.includes('varış') || text.includes('destination')) {
      dropdown = trigger;
      console.log('[Scraper] Nereye text ile dropdown bulundu');
      break;
    }
  }

  // Strategy 2: Find by label
  if (!dropdown) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent?.trim() === 'Nereye') {
        const container = label.closest('div');
        dropdown = container?.querySelector('[role="combobox"], [data-slot="select-trigger"], button');
        if (dropdown) {
          console.log('[Scraper] Nereye label ile dropdown bulundu');
          break;
        }
      }
    }
  }

  // Strategy 3: Second combobox (first is origin)
  if (!dropdown && triggers.length >= 2) {
    dropdown = triggers[1];
    console.log('[Scraper] İkinci trigger kullanılıyor');
  } else if (!dropdown && triggers.length === 1) {
    dropdown = triggers[0];
  }

  if (!dropdown) {
    console.log('[Scraper] ❌ Dropdown bulunamadı');
    return countries;
  }

  // Click to open Radix UI dropdown
  console.log('[Scraper] Dropdown açılıyor (Radix UI)...');
  console.log(`[Scraper] Dropdown data-state: ${dropdown.getAttribute('data-state')}`);

  // For Radix UI, we need to properly trigger the select
  dropdown.focus();
  await sleep(100);

  // Try click first
  dropdown.click();
  await sleep(500);

  // Check if opened
  let isOpen = dropdown.getAttribute('data-state') === 'open' ||
               dropdown.getAttribute('aria-expanded') === 'true';

  if (!isOpen) {
    console.log('[Scraper] Click ile açılmadı, pointer events deneniyor...');
    // Try with pointer events (Radix UI uses these)
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse' });
    const pointerUp = new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse' });

    dropdown.dispatchEvent(pointerDown);
    await sleep(50);
    dropdown.dispatchEvent(pointerUp);
    await sleep(500);
  }

  // Check again
  isOpen = dropdown.getAttribute('data-state') === 'open' ||
           dropdown.getAttribute('aria-expanded') === 'true';
  console.log(`[Scraper] Dropdown açık mı: ${isOpen}`);

  // Wait for options to load
  await sleep(2000);

  // Try multiple selectors for options
  // Radix UI and similar libraries render options in a portal at the end of body
  const optionSelectors = [
    // Radix UI Select (highest priority)
    '[data-radix-select-viewport] [role="option"]',
    '[data-radix-select-viewport] > div',
    '[data-radix-select-item]',
    '[data-slot="select-item"]',
    '[data-radix-collection-item]',
    // Generic role-based
    '[role="option"]',
    '[role="listbox"] [role="option"]',
    '[role="listbox"] > div',
    '[role="listbox"] li',
    'ul[role="listbox"] > li',
    // Class-based
    '[class*="SelectItem"]',
    '[class*="select-item"]',
    '[class*="option"]',
    '[class*="Option"]',
    '[class*="menu"] > div',
    '[class*="Menu"] > div',
    '[class*="MenuList"] > div',
    '[class*="menuList"] > div',
    '[class*="list"] > div',
    '[class*="dropdown"] li',
    '[class*="Dropdown"] li',
    // React Select specific
    '[class*="react-select"] [class*="option"]',
    '[class*="select__option"]',
    '[class*="Select__option"]',
    '[id*="react-select"][id*="option"]',
    // Radix UI portal
    '[data-radix-popper-content-wrapper] [role="option"]',
    '[data-radix-popper-content-wrapper] > div > div',
    // Other portals
    '[data-floating-ui-portal] [role="option"]'
  ];

  let options = [];
  for (const selector of optionSelectors) {
    options = document.querySelectorAll(selector);
    if (options.length > 0) {
      console.log(`[Scraper] Selector "${selector}": ${options.length} element`);
    }
    if (options.length > 5) break; // Found options
  }

  // If still no options, wait more and try again
  if (options.length === 0) {
    console.log('[Scraper] Option bulunamadı, 2 saniye daha bekleniyor...');
    await sleep(2000);

    // Debug: Log all elements that might be options
    console.log('[Scraper] DOM araştırması yapılıyor...');
    const allDivs = document.querySelectorAll('div');
    let potentialOptions = [];
    allDivs.forEach(div => {
      const text = div.textContent?.trim();
      // Look for country-like text
      if (text && text.length > 2 && text.length < 40 && !text.includes('\n') &&
          (text.match(/^[A-ZÇĞİÖŞÜ][a-zçğıöşü]+/) || text.match(/^[A-Z][a-z]+/))) {
        const classes = div.className || '';
        const role = div.getAttribute('role') || '';
        if (classes.includes('option') || classes.includes('Option') ||
            classes.includes('menu') || classes.includes('Menu') ||
            classes.includes('item') || classes.includes('Item') ||
            role === 'option' || role === 'menuitem') {
          potentialOptions.push(div);
        }
      }
    });

    if (potentialOptions.length > 5) {
      console.log(`[Scraper] Potansiyel option bulundu: ${potentialOptions.length}`);
      options = potentialOptions;
    } else {
      // Last resort: try to find any clickable items in recently added DOM nodes
      for (const selector of optionSelectors) {
        options = document.querySelectorAll(selector);
        if (options.length > 5) {
          console.log(`[Scraper] Tekrar deneme - "${selector}": ${options.length} element`);
          break;
        }
      }
    }
  }

  // Debug: log first few options
  console.log('[Scraper] İlk 5 option içeriği:');
  Array.from(options).slice(0, 5).forEach((opt, i) => {
    console.log(`  [${i}] ${opt.textContent?.trim()?.substring(0, 50)}`);
  });

  for (const opt of options) {
    const text = opt.textContent?.trim();
    // Skip Turkey (origin country) and placeholder
    if (text && text.length > 1 && text.length < 50 &&
        !text.toLowerCase().includes('seçiniz') &&
        !text.toLowerCase().includes('select') &&
        text !== 'Türkiye' &&
        text !== 'Turkey') {
      countries.push({ name: text });
    }
  }

  console.log(`[Scraper] ${countries.length} ülke bulundu (Türkiye hariç)`);

  // Close dropdown properly
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escEvent);
  await sleep(300);
  document.body.click(); // Extra click to ensure closed
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
  console.log(`[Scraper] 🔍 selectCountry başladı: "${country.name}"`);

  // First, close any open dropdown
  const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escEvent);
  await sleep(500);

  // Find destination dropdown - Radix UI Select
  const triggers = document.querySelectorAll('[role="combobox"], [data-slot="select-trigger"]');
  console.log(`[Scraper] ${triggers.length} trigger bulundu`);

  let dropdown = null;

  // Strategy 1: Find by placeholder text
  for (const trigger of triggers) {
    const text = trigger.textContent?.toLowerCase() || '';
    if (text.includes('nereye') || text.includes('varış') || text.includes('destination')) {
      dropdown = trigger;
      console.log('[Scraper] Nereye text ile dropdown bulundu');
      break;
    }
  }

  // Strategy 2: Find by label
  if (!dropdown) {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if (label.textContent?.trim() === 'Nereye') {
        const container = label.closest('div');
        dropdown = container?.querySelector('[role="combobox"], [data-slot="select-trigger"], button');
        if (dropdown) {
          console.log('[Scraper] Nereye label ile dropdown bulundu');
          break;
        }
      }
    }
  }

  // Strategy 3: Second combobox
  if (!dropdown && triggers.length >= 2) {
    dropdown = triggers[1];
    console.log('[Scraper] İkinci trigger kullanılıyor');
  } else if (!dropdown && triggers.length === 1) {
    dropdown = triggers[0];
    console.log('[Scraper] Tek trigger kullanılıyor');
  }

  if (!dropdown) {
    console.log('[Scraper] ❌ Dropdown bulunamadı!');
    return false;
  }

  // Click somewhere else first to ensure dropdown is closed
  document.body.click();
  await sleep(300);

  // Click to open Radix UI dropdown
  console.log('[Scraper] Dropdown açılıyor (Radix UI)...');
  dropdown.focus();
  await sleep(100);

  // Use click for Radix UI
  dropdown.click();
  await sleep(500);

  // Check if opened
  let isOpen = dropdown.getAttribute('data-state') === 'open' ||
               dropdown.getAttribute('aria-expanded') === 'true';

  if (!isOpen) {
    // Try pointer events
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse' });
    const pointerUp = new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, pointerType: 'mouse' });
    dropdown.dispatchEvent(pointerDown);
    await sleep(50);
    dropdown.dispatchEvent(pointerUp);
    await sleep(500);
  }

  console.log(`[Scraper] Dropdown data-state: ${dropdown.getAttribute('data-state')}`);
  console.log(`[Scraper] Dropdown aria-expanded: ${dropdown.getAttribute('aria-expanded')}`);

  // Wait for options to appear with polling
  console.log('[Scraper] Options bekleniyor...');
  let options = [];
  const optionSelectors = [
    // Radix UI Select (highest priority)
    '[data-radix-select-viewport] [role="option"]',
    '[data-radix-select-viewport] > div',
    '[data-radix-select-item]',
    '[data-slot="select-item"]',
    '[data-radix-collection-item]',
    // Generic role-based
    '[role="option"]',
    '[role="listbox"] [role="option"]',
    '[role="listbox"] > div',
    '[role="listbox"] li',
    'ul[role="listbox"] > li',
    // Class-based
    '[class*="SelectItem"]',
    '[class*="select-item"]',
    '[class*="option"]',
    '[class*="Option"]',
    '[class*="menu"] > div',
    '[class*="Menu"] > div',
    '[class*="MenuList"] > div',
    '[class*="menuList"] > div',
    '[class*="list"] > div',
    '[class*="dropdown"] li',
    '[class*="Dropdown"] li',
    'li[id*="option"]',
    'div[id*="option"]',
    // React Select specific
    '[class*="react-select"] [class*="option"]',
    '[class*="select__option"]',
    '[class*="Select__option"]',
    '[id*="react-select"][id*="option"]',
    // Radix UI portal
    '[data-radix-popper-content-wrapper] [role="option"]',
    '[data-radix-popper-content-wrapper] > div > div',
    // Other portals
    '[data-floating-ui-portal] [role="option"]'
  ];

  // Poll for options up to 5 seconds
  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(500);

    for (const selector of optionSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > options.length) {
        options = found;
        if (found.length > 0) {
          console.log(`[Scraper] Selector "${selector}": ${found.length} element`);
        }
      }
    }

    // Also try to find by text content pattern (country names)
    if (options.length === 0) {
      const allDivs = document.querySelectorAll('div, li, button, span');
      const potentialOptions = [];
      allDivs.forEach(el => {
        const text = el.textContent?.trim();
        const parent = el.parentElement;
        const parentClass = parent?.className || '';
        // Look for elements that look like dropdown options
        if (text && text.length > 2 && text.length < 40 && !text.includes('\n') &&
            (parentClass.includes('menu') || parentClass.includes('Menu') ||
             parentClass.includes('list') || parentClass.includes('List') ||
             parentClass.includes('option') || parentClass.includes('Option') ||
             el.getAttribute('role') === 'option' ||
             el.getAttribute('data-value'))) {
          potentialOptions.push(el);
        }
      });
      if (potentialOptions.length > options.length) {
        options = potentialOptions;
        console.log(`[Scraper] Text pattern ile ${potentialOptions.length} potansiyel option bulundu`);
      }
    }

    if (options.length > 5) {
      console.log(`[Scraper] ✅ ${options.length} option bulundu (attempt ${attempt + 1})`);
      break;
    }
  }

  if (options.length === 0) {
    console.log('[Scraper] ❌ Hiç option bulunamadı! DOM yapısı kontrol ediliyor...');
    // Log what's visible
    const listboxes = document.querySelectorAll('[role="listbox"]');
    console.log(`[Scraper] Listbox sayısı: ${listboxes.length}`);
    listboxes.forEach((lb, i) => {
      console.log(`[Scraper] Listbox ${i} children: ${lb.children.length}`);
    });

    // Close and return
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    document.dispatchEvent(escEvent);
    return false;
  }

  console.log(`[Scraper] ${options.length} option bulundu, "${country.name}" aranıyor...`);

  // Try exact match first
  for (const opt of options) {
    const text = opt.textContent?.trim();
    if (text === country.name) {
      opt.click();
      console.log(`[Scraper] ✅ ${country.name} seçildi (exact match)`);
      await sleep(500);
      return true;
    }
  }

  // Try partial match (case insensitive)
  for (const opt of options) {
    const text = opt.textContent?.trim()?.toLowerCase();
    if (text && text === country.name.toLowerCase()) {
      opt.click();
      console.log(`[Scraper] ✅ ${country.name} seçildi (case insensitive)`);
      await sleep(500);
      return true;
    }
  }

  // Try contains match
  for (const opt of options) {
    const text = opt.textContent?.trim()?.toLowerCase();
    if (text && (text.includes(country.name.toLowerCase()) || country.name.toLowerCase().includes(text))) {
      opt.click();
      console.log(`[Scraper] ✅ ${country.name} seçildi (contains match: "${opt.textContent?.trim()}")`);
      await sleep(500);
      return true;
    }
  }

  console.log(`[Scraper] ❌ "${country.name}" bulunamadı. İlk 5 option:`);
  Array.from(options).slice(0, 5).forEach((opt, i) => {
    console.log(`  [${i}] "${opt.textContent?.trim()}"`);
  });

  // Close dropdown if not found
  const escClose = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  document.dispatchEvent(escClose);
  await sleep(300);

  return false;
}

async function processNextWeight(maxWeight) {
  if (!isRunning || isPaused) return;

  // Check memory and wait if too high
  if (pendingPrices.length > MAX_MEMORY_PRICES * 0.8) {
    console.log(`[Scraper] ⏳ Memory yüksek (${pendingPrices.length}), gönderim bekleniyor...`);
    await waitForSendToComplete();
  }

  if (weightQueue.length === 0) {
    // Add delay between countries
    await sleep(COUNTRY_DELAY);
    await processNextCountry(maxWeight);
    return;
  }

  currentWeight = weightQueue.shift();

  console.log(`[iframe] ⚖️ ${currentCountry} - ${currentWeight}kg (${weightQueue.length} kaldı)`);
  window.parent.postMessage({
    type: 'NAVLUNGO_STATUS',
    status: `${currentCountry} - ${currentWeight}kg`,
    count: allPrices.length,
    pending: pendingPrices.length,
    sent: sentCount
  }, '*');

  // Fill weight and submit with retry
  let retryCount = 0;
  const maxRetries = 3;
  let prices = [];

  while (retryCount < maxRetries && prices.length === 0) {
    const success = await fillWeightAndSubmit(currentWeight);

    if (success) {
      // Wait for results with progressive delay
      const waitTime = 3000 + (retryCount * 2000); // 3s, 5s, 7s
      console.log(`[Scraper] ⏳ Fiyat bekleniyor (${waitTime/1000}s)...`);
      await sleep(waitTime);

      // Read prices from DOM
      prices = readPricesFromDOM();

      // Also check if API interceptor caught any prices for this weight
      const apiPrices = allPrices.filter(p =>
        p.country === currentCountry &&
        p.weight === currentWeight
      );

      if (apiPrices.length > 0 && prices.length === 0) {
        console.log(`[Scraper] ℹ️ DOM'da fiyat yok ama API'dan ${apiPrices.length} fiyat gelmiş`);
        prices = apiPrices; // Use API prices
      }

      if (prices.length === 0) {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`[Scraper] ⚠️ ${currentCountry} ${currentWeight}kg - fiyat bulunamadı, tekrar deneniyor (${retryCount}/${maxRetries})...`);
          await sleep(1000);
        }
      }
    } else {
      console.log(`[Scraper] ❌ ${currentCountry} ${currentWeight}kg - form gönderilemedi`);
      break;
    }
  }

  if (prices.length > 0) {
    console.log(`[Scraper] ✅ ${currentCountry} ${currentWeight}kg - ${prices.length} fiyat bulundu`);
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
        queuePriceForSend(priceData); // Auto-send to server
      }
    }
    updateUI();
  } else {
    console.log(`[Scraper] ❌ ${currentCountry} ${currentWeight}kg - ${maxRetries} denemeden sonra fiyat bulunamadı!`);
    // Log this failure to parent for visibility
    window.parent.postMessage({
      type: 'NAVLUNGO_STATUS',
      status: `⚠️ ${currentCountry} ${currentWeight}kg - fiyat yok`,
      count: allPrices.length
    }, '*');
  }

  if (isRunning && !isPaused) {
    // Add delay between weights to prevent overwhelming the system
    await sleep(WEIGHT_DELAY);
    // Use setTimeout to prevent stack overflow on very long runs
    setTimeout(() => processNextWeight(maxWeight), 0);
  }
}

// Wait for pending sends to complete
async function waitForSendToComplete() {
  while (pendingPrices.length > AUTO_SEND_BATCH_SIZE && isRunning) {
    await autoSendPrices();
    await sleep(2000);
  }
}

// Read prices directly from DOM - Navlungo specific structure
function readPricesFromDOM() {
  const prices = [];

  console.log('[Scraper] 📖 DOM\'dan fiyat okunuyor (Navlungo yapısı)...');

  // Navlungo uses: div.relative.py-4.px-4 for each price row
  // Structure: carrier (img alt + span.font-medium), service (badge), transit time, price (span.font-semibold)

  // Find all price rows
  const priceRows = document.querySelectorAll('div.relative.py-4.px-4, div[class*="py-4"][class*="px-4"]');
  console.log(`[Scraper] ${priceRows.length} fiyat satırı bulundu`);

  for (const row of priceRows) {
    try {
      // Get carrier name from img alt or span.font-medium
      let carrier = '';
      const img = row.querySelector('img[alt]');
      if (img) {
        carrier = img.alt;
      }
      if (!carrier) {
        const carrierSpan = row.querySelector('span.font-medium');
        if (carrierSpan) {
          carrier = carrierSpan.textContent?.trim() || '';
        }
      }

      if (!carrier) continue;

      // Get service type from badge
      let service = 'Standard';
      const badges = row.querySelectorAll('[data-slot="badge"]');
      for (const badge of badges) {
        const badgeText = badge.textContent?.trim() || '';
        if (badgeText === 'Express' || badgeText === 'Ekonomi' || badgeText === 'Economy' || badgeText === 'Standard') {
          service = badgeText;
          break;
        }
      }

      // Get transit time
      let transitTime = '';
      const mutedSpans = row.querySelectorAll('span.text-muted-foreground');
      for (const span of mutedSpans) {
        const text = span.textContent?.trim() || '';
        if (text.includes('iş günü') || text.includes('gün')) {
          transitTime = text;
          break;
        }
      }

      // Get price - look for span.text-lg.font-semibold
      let price = 0;
      let currency = 'USD';

      const priceSpan = row.querySelector('span.text-lg.font-semibold');
      if (priceSpan) {
        const priceText = priceSpan.textContent?.trim() || '';
        price = parseFloat(priceText.replace(/,/g, '.'));
      }

      // Get currency from nearby span
      for (const span of mutedSpans) {
        const text = span.textContent?.trim() || '';
        if (text === 'USD' || text === 'EUR' || text === 'TRY' || text === 'TL') {
          currency = text === 'TL' ? 'TRY' : text;
          break;
        }
      }

      if (carrier && price > 0) {
        // Check for duplicates (same carrier + service + price)
        const exists = prices.some(p =>
          p.carrier.toLowerCase() === carrier.toLowerCase() &&
          p.service === service &&
          Math.abs(p.price - price) < 0.01
        );

        if (!exists) {
          prices.push({
            carrier: carrier.toUpperCase(),
            service,
            price,
            currency,
            transitTime
          });
          console.log(`[Scraper] 💰 ${carrier} ${service}: ${price} ${currency} (${transitTime})`);
        }
      }
    } catch (e) {
      console.log('[Scraper] Row parse hatası:', e);
    }
  }

  // Fallback: If no prices found with structured approach, try text-based
  if (prices.length === 0) {
    console.log('[Scraper] Yapısal parse başarısız, metin bazlı deneniyor...');

    // Look for all font-semibold spans that might be prices
    const allPriceSpans = document.querySelectorAll('span.font-semibold, span[class*="font-semibold"]');
    console.log(`[Scraper] ${allPriceSpans.length} potansiyel fiyat span'ı bulundu`);

    for (const span of allPriceSpans) {
      const priceText = span.textContent?.trim() || '';
      const priceNum = parseFloat(priceText.replace(/,/g, '.'));

      if (!isNaN(priceNum) && priceNum > 10 && priceNum < 10000) {
        // Find carrier by going up to parent container
        const container = span.closest('div.relative') || span.closest('div[class*="py-4"]');
        if (container) {
          const img = container.querySelector('img[alt]');
          const carrier = img?.alt || 'Unknown';

          // Get service
          let service = 'Standard';
          const badge = container.querySelector('[data-slot="badge"]');
          if (badge) {
            const badgeText = badge.textContent?.trim() || '';
            if (['Express', 'Ekonomi', 'Economy', 'Standard'].includes(badgeText)) {
              service = badgeText;
            }
          }

          const exists = prices.some(p =>
            p.carrier.toLowerCase() === carrier.toLowerCase() &&
            Math.abs(p.price - priceNum) < 0.01
          );

          if (!exists && carrier !== 'Unknown') {
            prices.push({
              carrier: carrier.toUpperCase(),
              service,
              price: priceNum,
              currency: 'USD',
              transitTime: ''
            });
            console.log(`[Scraper] 💰 Fallback: ${carrier} ${service}: ${priceNum} USD`);
          }
        }
      }
    }
  }

  console.log(`[Scraper] 📊 Toplam ${prices.length} fiyat okundu:`, JSON.stringify(prices, null, 2));
  return prices;
}

async function fillWeightAndSubmit(weight) {
  console.log(`[Scraper] 🔢 fillWeightAndSubmit: ${weight}kg giriliyor...`);

  // Find weight input - try multiple strategies
  let input = null;

  // Strategy 1: By placeholder
  const placeholderSelectors = [
    'input[placeholder*="Ağırlık"]',
    'input[placeholder*="ağırlık"]',
    'input[placeholder*="kg"]',
    'input[placeholder*="Kg"]',
    'input[placeholder*="KG"]',
    'input[placeholder*="weight"]',
    'input[placeholder*="Weight"]'
  ];
  for (const sel of placeholderSelectors) {
    input = document.querySelector(sel);
    if (input) {
      console.log(`[Scraper] Input bulundu (placeholder): ${sel}`);
      break;
    }
  }

  // Strategy 2: By label
  if (!input) {
    const labels = document.querySelectorAll('label, [class*="label"], [class*="Label"]');
    for (const label of labels) {
      const text = label.textContent?.toLowerCase() || '';
      if (text.includes('ağırlık') || text.includes('kg') || text.includes('weight')) {
        const container = label.closest('[class*="FormControl"], [class*="form"], [class*="Form"], div');
        input = container?.querySelector('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"], input');
        if (input) {
          console.log(`[Scraper] Input bulundu (label): "${label.textContent?.trim()}"`);
          break;
        }
      }
    }
  }

  // Strategy 3: By nearby text
  if (!input) {
    const inputs = document.querySelectorAll('input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]');
    for (const inp of inputs) {
      const container = inp.closest('div');
      const nearbyText = container?.textContent?.toLowerCase() || '';
      if (nearbyText.includes('ağırlık') || nearbyText.includes('kg') || nearbyText.includes('weight')) {
        input = inp;
        console.log(`[Scraper] Input bulundu (nearby text)`);
        break;
      }
    }
  }

  // Strategy 4: By aria-label
  if (!input) {
    input = document.querySelector('input[aria-label*="ağırlık"], input[aria-label*="weight"], input[aria-label*="kg"]');
    if (input) console.log(`[Scraper] Input bulundu (aria-label)`);
  }

  if (!input) {
    console.log('[Scraper] ❌ Ağırlık input bulunamadı! DOM kontrol ediliyor...');
    const allInputs = document.querySelectorAll('input');
    console.log(`[Scraper] Toplam ${allInputs.length} input var`);
    allInputs.forEach((inp, i) => {
      console.log(`  [${i}] type=${inp.type}, placeholder="${inp.placeholder}", aria-label="${inp.getAttribute('aria-label')}"`);
    });
    return false;
  }

  // Fill value using React-compatible method
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;

  // Clear and focus
  input.focus();
  await sleep(100);

  // Clear existing value
  nativeSetter.call(input, '');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  await sleep(100);

  // Enter new value
  const weightStr = weight.toString();
  nativeSetter.call(input, weightStr);

  // Dispatch multiple events for React compatibility
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new InputEvent('input', { bubbles: true, data: weightStr }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await sleep(100);

  // Blur to trigger validation
  input.dispatchEvent(new Event('blur', { bubbles: true }));
  await sleep(200);

  // Verify value was set
  if (input.value !== weightStr) {
    console.log(`[Scraper] ⚠️ Input değeri beklenenden farklı: "${input.value}" vs "${weightStr}"`);
    // Try again with direct value assignment
    input.value = weightStr;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(100);
  }

  console.log(`[Scraper] ✅ Input değeri: ${input.value}`);

  // Find and click submit button
  const buttonTexts = ['fiyat hesapla', 'hesapla', 'ara', 'search', 'calculate', 'bul', 'getir', 'sorgula', 'göster', 'gönder'];
  const buttons = document.querySelectorAll('button, [role="button"], [data-slot="button"]');

  console.log(`[Scraper] ${buttons.length} buton bulundu, aranıyor...`);

  // First try exact match for "Fiyat Hesapla"
  for (const btn of buttons) {
    const text = btn.textContent?.trim() || '';
    if (text === 'Fiyat Hesapla' || text === 'fiyat hesapla') {
      console.log(`[Scraper] 🔘 "Fiyat Hesapla" butonu bulundu, tıklanıyor...`);
      btn.focus();
      await sleep(100);
      btn.click();
      await sleep(200);
      return true;
    }
  }

  // Then try partial match
  for (const btn of buttons) {
    const text = btn.textContent?.toLowerCase()?.trim() || '';
    const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';

    for (const searchText of buttonTexts) {
      if (text.includes(searchText) || ariaLabel.includes(searchText)) {
        console.log(`[Scraper] 🔘 Buton tıklanıyor: "${btn.textContent?.trim()}"`);
        btn.focus();
        await sleep(100);
        btn.click();
        await sleep(200);
        return true;
      }
    }
  }

  // Try clicking any primary/submit button
  const primarySelectors = [
    '[data-slot="button"][class*="primary"]',
    '[data-slot="button"][class*="bg-primary"]',
    'button[class*="bg-primary"]',
    'button[type="submit"]',
    '[class*="primary"]',
    '[class*="Primary"]',
    '[class*="submit"]',
    '[class*="Submit"]',
    '[class*="calculate"]',
    '[class*="search"]'
  ];

  for (const sel of primarySelectors) {
    const btn = document.querySelector(sel);
    if (btn && !btn.disabled) {
      console.log(`[Scraper] 🔘 Primary buton tıklanıyor (${sel}): "${btn.textContent?.trim()}"`);
      btn.focus();
      await sleep(100);
      btn.click();
      await sleep(200);
      return true;
    }
  }

  console.log('[Scraper] ❌ Submit butonu bulunamadı! Butonlar:');
  buttons.forEach((btn, i) => {
    console.log(`  [${i}] "${btn.textContent?.trim()?.substring(0, 30)}" class="${btn.className?.substring(0, 50)}"`);
  });

  return false;
}

function finishScraping() {
  isRunning = false;
  stopAutoSendTimer(); // Send any remaining prices
  console.log(`[Scraper] ✅ Tamamlandı! ${allPrices.length} fiyat toplandı, ${sentCount} sunucuya gönderildi`);

  if (IS_IFRAME) {
    // Send to parent
    window.parent.postMessage({
      type: 'NAVLUNGO_FINISHED',
      count: allPrices.length,
      sentCount: sentCount,
      prices: allPrices
    }, '*');
  } else {
    // Update local UI
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('stop-btn').style.display = 'none';
    updateStatus(`✅ Tamamlandı! ${allPrices.length} fiyat, ${sentCount} gönderildi`);
    updateUI();
    showNotification(`✅ ${allPrices.length} fiyat toplandı, ${sentCount} sunucuya gönderildi!`);
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
    <div id="scraper-container" style="
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
      transition: all 0.3s ease;
    ">
      <div id="scraper-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 20px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 18px; font-weight: 700;">📦 Navlungo Scraper</div>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;" id="status-text">Hazır</div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span id="mini-count" style="background: rgba(255,255,255,0.2); padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">0</span>
          <button id="toggle-panel-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center;">▼</button>
        </div>
      </div>

      <div id="panel-content" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
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
          <button id="pause-btn" style="
            flex: 1;
            padding: 14px;
            background: #f39c12;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: none;
          ">⏸️ DURAKLAT</button>
          <button id="resume-btn" style="
            flex: 1;
            padding: 14px;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: none;
          ">▶️ DEVAM</button>
          <button id="stop-btn" style="
            padding: 14px 20px;
            background: #e74c3c;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            display: none;
          ">⏹️</button>
        </div>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-around;">
            <div>
              <div id="price-count" style="font-size: 36px; font-weight: 800; color: #667eea;">0</div>
              <div style="color: #666; font-size: 12px;">toplanan</div>
            </div>
            <div>
              <div id="sent-count" style="font-size: 36px; font-weight: 800; color: #27ae60;">0</div>
              <div style="color: #666; font-size: 12px;">gönderilen</div>
            </div>
          </div>
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
  document.getElementById('pause-btn').onclick = pauseScraping;
  document.getElementById('resume-btn').onclick = resumeScraping;
  document.getElementById('export-csv-btn').onclick = exportCSV;
  document.getElementById('export-json-btn').onclick = exportJSON;
  document.getElementById('clear-btn').onclick = clearAll;
  document.getElementById('load-countries-btn').onclick = loadCountries;
  document.getElementById('select-all-btn').onclick = selectAllCountries;
  document.getElementById('clear-selection-btn').onclick = clearCountrySelection;
  document.getElementById('send-server-btn').onclick = sendToServer;
  document.getElementById('toggle-panel-btn').onclick = togglePanel;
  document.getElementById('scraper-header').onclick = (e) => {
    // Only toggle if clicking header, not the button
    if (e.target.id !== 'toggle-panel-btn') {
      togglePanel();
    }
  };
}

// Toggle panel expand/collapse
let isPanelExpanded = true;
function togglePanel() {
  const content = document.getElementById('panel-content');
  const btn = document.getElementById('toggle-panel-btn');
  const container = document.getElementById('scraper-container');

  isPanelExpanded = !isPanelExpanded;

  if (isPanelExpanded) {
    content.style.display = 'block';
    btn.textContent = '▼';
    container.style.width = '380px';
  } else {
    content.style.display = 'none';
    btn.textContent = '▲';
    container.style.width = '280px';
  }
}

// Pause scraping
function pauseScraping() {
  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'NAVLUNGO_CMD', cmd: 'PAUSE' }, '*');
  }
  isPaused = true;
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('resume-btn').style.display = 'block';
  updateStatus('⏸️ Duraklatıldı');
}

// Resume scraping
function resumeScraping() {
  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'NAVLUNGO_CMD', cmd: 'RESUME' }, '*');
  }
  isPaused = false;
  document.getElementById('pause-btn').style.display = 'block';
  document.getElementById('resume-btn').style.display = 'none';
  updateStatus('▶️ Devam ediliyor...');
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

  // Update status to show countries loaded successfully
  updateStatus(`✅ ${countries.length} ülke yüklendi`);
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

// Send prices to MoogShip server (manual - all prices)
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

// Auto-send prices to server via background script (avoids CORS)
async function autoSendPrices(retryCount = 0) {
  if (isSending || pendingPrices.length === 0) return;

  isSending = true;
  const pricesToSend = pendingPrices.splice(0, AUTO_SEND_BATCH_SIZE);

  try {
    // Send via background script to avoid CORS
    const response = await chrome.runtime.sendMessage({
      type: 'SEND_PRICES_BATCH',
      prices: pricesToSend.map(p => ({
        country: p.country,
        countryName: p.country,
        weight: p.weight,
        carrier: p.carrier,
        service: p.service,
        price: p.price,
        currency: p.currency,
        transitDays: p.transitTime || p.transitDays || null
      }))
    });

    if (response && response.success) {
      sentCount += pricesToSend.length;
      console.log(`[Scraper] ✅ ${pricesToSend.length} fiyat otomatik gönderildi (toplam: ${sentCount})`);
      updateSentCount();
      clearSentPricesFromMemory(pricesToSend);
    } else {
      console.error(`[Scraper] ❌ Auto-send hatası: ${response?.error || 'Unknown error'}`);
      if (retryCount < MAX_RETRIES) {
        pendingPrices.unshift(...pricesToSend);
        setTimeout(() => {
          isSending = false;
          autoSendPrices(retryCount + 1);
        }, 1000 * Math.pow(2, retryCount));
        return;
      }
    }
  } catch (error) {
    console.error(`[Scraper] ❌ Auto-send bağlantı hatası: ${error.message}`);
    if (retryCount < MAX_RETRIES) {
      pendingPrices.unshift(...pricesToSend);
      setTimeout(() => {
        isSending = false;
        autoSendPrices(retryCount + 1);
      }, 1000 * Math.pow(2, retryCount));
      return;
    }
  }

  isSending = false;
}

// Clear sent prices from memory to prevent buildup
function clearSentPricesFromMemory(sentPrices) {
  const sentKeys = new Set(sentPrices.map(p =>
    `${p.carrier}-${p.service}-${p.country}-${p.weight}`
  ));

  allPrices = allPrices.filter(p =>
    !sentKeys.has(`${p.carrier}-${p.service}-${p.country}-${p.weight}`)
  );

  console.log(`[Scraper] 🧹 Memory temizlendi, kalan: ${allPrices.length} fiyat`);
}

// Add price to pending queue and trigger auto-send if needed
function queuePriceForSend(priceData) {
  pendingPrices.push(priceData);

  // Force send when memory limit reached to prevent browser freeze
  if (pendingPrices.length >= MAX_MEMORY_PRICES) {
    console.log(`[Scraper] ⚠️ Memory limiti (${MAX_MEMORY_PRICES}) aşıldı, zorla gönderiliyor...`);
    autoSendPrices();
    return;
  }

  // Auto-send when batch size reached
  if (pendingPrices.length >= AUTO_SEND_BATCH_SIZE) {
    autoSendPrices();
  }
}

// Update sent count display
function updateSentCount() {
  const el = document.getElementById('sent-count');
  if (el) el.textContent = sentCount;
}

// Start auto-send interval timer
let autoSendTimer = null;
function startAutoSendTimer() {
  if (autoSendTimer) return;
  autoSendTimer = setInterval(() => {
    if (isRunning && pendingPrices.length > 0) {
      autoSendPrices();
    }
  }, AUTO_SEND_INTERVAL);
}

function stopAutoSendTimer() {
  if (autoSendTimer) {
    clearInterval(autoSendTimer);
    autoSendTimer = null;
  }
  // Send any remaining prices
  if (pendingPrices.length > 0) {
    autoSendPrices();
  }
}

function startFromMainPage() {
  const maxWeight = parseInt(document.getElementById('max-weight-input')?.value) || 30;

  isRunning = true;
  isPaused = false;
  allPrices = [];
  sentCount = 0;
  pendingPrices = [];
  updateUI();
  updateSentCount();

  document.getElementById('start-btn').style.display = 'none';
  document.getElementById('pause-btn').style.display = 'block';
  document.getElementById('resume-btn').style.display = 'none';
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
  isPaused = false;

  const iframe = findPriceIframe();
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage({ type: 'NAVLUNGO_CMD', cmd: 'STOP' }, '*');
  }

  document.getElementById('start-btn').style.display = 'block';
  document.getElementById('pause-btn').style.display = 'none';
  document.getElementById('resume-btn').style.display = 'none';
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
    if (event.data.sent !== undefined) {
      sentCount = event.data.sent;
      updateSentCount();
    }
    if (event.data.pending !== undefined) {
      // Show pending count in status if high
      if (event.data.pending > 100) {
        updateStatus(`${event.data.status || ''} (${event.data.pending} bekliyor)`);
      }
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
    isPaused = false;
    allPrices = event.data.prices || allPrices;
    sentCount = event.data.sentCount || 0;
    document.getElementById('start-btn').style.display = 'block';
    document.getElementById('pause-btn').style.display = 'none';
    document.getElementById('resume-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = 'none';
    updateStatus(`✅ Tamamlandı! ${event.data.count} fiyat, ${sentCount} gönderildi`);
    updateUI();
    updateSentCount();
    showNotification(`✅ ${event.data.count} fiyat toplandı, ${sentCount} sunucuya gönderildi!`);
  }

  if (event.data.type === 'NAVLUNGO_ERROR') {
    updateStatus(`❌ ${event.data.error}`);
    showNotification(`❌ ${event.data.error}`, 'error');
  }
});

function updateUI() {
  const el = document.getElementById('price-count');
  if (el) el.textContent = allPrices.length;

  // Update mini count in header
  const miniCount = document.getElementById('mini-count');
  if (miniCount) miniCount.textContent = allPrices.length;

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

} // End of singleton check
