/**
 * Navlungo Price Calculator Scraper
 *
 * Automatically scrapes ALL prices from Navlungo's price calculator page
 *
 * Usage:
 *   npx tsx server/navlungo-price-scraper.ts
 *
 * The script will:
 * 1. Open a browser window
 * 2. Navigate to the price calculator
 * 3. Let you select the country and enter billable weight
 * 4. Automatically capture all prices shown
 */

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stealth plugin
puppeteer.use(StealthPlugin());

const TOKEN_FILE_PATH = path.join(__dirname, "services/.navlungo-token.json");

// Country list - common shipping destinations
const COUNTRIES: { [key: string]: { name: string; code: string } } = {
  "1": { name: "United States", code: "US" },
  "2": { name: "United Kingdom", code: "GB" },
  "3": { name: "Germany", code: "DE" },
  "4": { name: "France", code: "FR" },
  "5": { name: "Netherlands", code: "NL" },
  "6": { name: "Belgium", code: "BE" },
  "7": { name: "Italy", code: "IT" },
  "8": { name: "Spain", code: "ES" },
  "9": { name: "Canada", code: "CA" },
  "10": { name: "Australia", code: "AU" },
  "11": { name: "Japan", code: "JP" },
  "12": { name: "South Korea", code: "KR" },
  "13": { name: "China", code: "CN" },
  "14": { name: "United Arab Emirates", code: "AE" },
  "15": { name: "Saudi Arabia", code: "SA" },
  "16": { name: "Russia", code: "RU" },
  "17": { name: "Brazil", code: "BR" },
  "18": { name: "Mexico", code: "MX" },
  "19": { name: "India", code: "IN" },
  "20": { name: "Singapore", code: "SG" },
};

interface PriceResult {
  carrier: string;
  service: string;
  price: number;
  currency: string;
  transitTime?: string;
  deliveryDate?: string;
}

interface ScraperConfig {
  destinationCountry: string;
  destinationCountryCode: string;
  billableWeight: number;
}

let browser: Browser | null = null;

/**
 * Create readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Display country selection menu
 */
function displayCountryMenu(): void {
  console.log("\n" + "=".repeat(50));
  console.log("SELECT DESTINATION COUNTRY");
  console.log("=".repeat(50));

  const entries = Object.entries(COUNTRIES);
  const mid = Math.ceil(entries.length / 2);

  for (let i = 0; i < mid; i++) {
    const left = entries[i];
    const right = entries[i + mid];

    const leftStr = `${left[0].padStart(2)}. ${left[1].name.padEnd(25)}`;
    const rightStr = right ? `${right[0].padStart(2)}. ${right[1].name}` : "";

    console.log(`  ${leftStr}${rightStr}`);
  }

  console.log("\n  0. Enter custom country code");
  console.log("=".repeat(50));
}

/**
 * Get user configuration
 */
async function getUserConfig(rl: readline.Interface): Promise<ScraperConfig> {
  displayCountryMenu();

  let countryCode = "";
  let countryName = "";

  while (!countryCode) {
    const choice = await prompt(rl, "\nEnter country number (or 0 for custom): ");

    if (choice === "0") {
      countryCode = (await prompt(rl, "Enter 2-letter country code (e.g., US, GB, DE): ")).toUpperCase();
      countryName = countryCode;
    } else if (COUNTRIES[choice]) {
      countryCode = COUNTRIES[choice].code;
      countryName = COUNTRIES[choice].name;
    } else {
      console.log("Invalid choice. Please try again.");
    }
  }

  console.log(`\n✓ Selected: ${countryName} (${countryCode})`);

  let billableWeight = 0;
  while (billableWeight <= 0) {
    const weightInput = await prompt(rl, "\nEnter billable weight in kg (e.g., 1.5): ");
    billableWeight = parseFloat(weightInput);

    if (isNaN(billableWeight) || billableWeight <= 0) {
      console.log("Invalid weight. Please enter a positive number.");
      billableWeight = 0;
    }
  }

  console.log(`✓ Weight: ${billableWeight} kg`);

  return {
    destinationCountry: countryName,
    destinationCountryCode: countryCode,
    billableWeight,
  };
}

/**
 * Initialize browser
 */
async function initBrowser(): Promise<Browser> {
  if (!browser) {
    console.log("\n[Scraper] Starting browser...");

    browser = await puppeteer.launch({
      headless: false, // We need headful for CAPTCHA and to see what's happening
      slowMo: 30,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
        "--lang=tr-TR",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });
  }
  return browser;
}

/**
 * Load saved token
 */
function loadToken(): any {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const token = JSON.parse(data);
      if (token.expiresAt > Date.now() + 5 * 60 * 1000) {
        return token;
      }
    }
  } catch (e) {
    // Token not available
  }
  return null;
}

/**
 * Main scraping function
 */
async function scrapePrices(config: ScraperConfig): Promise<PriceResult[]> {
  const results: PriceResult[] = [];

  const browserInstance = await initBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Evasion techniques
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      Object.defineProperty(navigator, "languages", { get: () => ["tr-TR", "tr", "en-US", "en"] });
      (window as any).chrome = { runtime: {} };
    });

    // Capture ALL API responses for prices
    const capturedData: any[] = [];

    page.on("response", async (response) => {
      const url = response.url();

      // Capture any response that might contain pricing data
      if (
        url.includes("quote") ||
        url.includes("price") ||
        url.includes("rate") ||
        url.includes("calculate") ||
        url.includes("search") ||
        url.includes("shipping") ||
        url.includes("carrier")
      ) {
        try {
          const contentType = response.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            const data = await response.json();
            console.log(`[API] Captured response from: ${url.substring(0, 80)}...`);
            capturedData.push({ url, data });

            // Try to extract prices from the response
            extractPricesFromResponse(data, results);
          }
        } catch (e) {
          // Not JSON or error parsing
        }
      }
    });

    console.log("\n[Scraper] Navigating to Navlungo price calculator...");
    await page.goto("https://ship.navlungo.com/ship/priceCalculator", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes("/login")) {
      console.log("\n[Scraper] Login required. Please login in the browser window.");
      console.log("[Scraper] Solve the CAPTCHA and click 'Giriş Yap' (Login)");

      // Wait for login to complete
      await page.waitForFunction(
        () => !window.location.pathname.includes("/login"),
        { timeout: 180000 } // 3 minutes
      );

      console.log("[Scraper] ✓ Login successful!");

      // Navigate to price calculator after login
      await page.goto("https://ship.navlungo.com/ship/priceCalculator", {
        waitUntil: "networkidle2",
        timeout: 30000,
      });
    }

    await page.screenshot({ path: "/tmp/navlungo-scraper-1.png" });
    console.log("[Scraper] Screenshot saved: /tmp/navlungo-scraper-1.png");

    // Wait for page to fully load
    await new Promise((r) => setTimeout(r, 3000));

    console.log("\n" + "=".repeat(50));
    console.log("INSTRUCTIONS");
    console.log("=".repeat(50));
    console.log(`\n1. In the browser window, select destination: ${config.destinationCountry} (${config.destinationCountryCode})`);
    console.log(`2. Enter billable weight: ${config.billableWeight} kg`);
    console.log("3. Fill any other required fields (postal code, dimensions, etc.)");
    console.log("4. Click the search/calculate button");
    console.log("5. Wait for prices to load - they will be captured automatically");
    console.log("\n[Scraper] Monitoring for price data... Press Ctrl+C when done.\n");

    // Also try to scrape prices directly from the page DOM
    let lastPriceCount = 0;
    let stableCount = 0;

    const checkInterval = setInterval(async () => {
      try {
        const domPrices = await scrapePricesFromDOM(page);

        if (domPrices.length > 0) {
          // Merge DOM prices with API prices
          for (const price of domPrices) {
            const exists = results.some(
              (r) => r.carrier === price.carrier && r.service === price.service && r.price === price.price
            );
            if (!exists) {
              results.push(price);
              console.log(`[DOM] Found: ${price.carrier} ${price.service} - ${price.price} ${price.currency}`);
            }
          }
        }

        // Check if results are stable (no new prices for a while)
        if (results.length === lastPriceCount && results.length > 0) {
          stableCount++;
          if (stableCount >= 10) { // 10 seconds of no new prices
            console.log("\n[Scraper] Price collection appears complete.");
          }
        } else {
          stableCount = 0;
          lastPriceCount = results.length;
        }
      } catch (e) {
        // Page might be navigating
      }
    }, 1000);

    // Wait for user to finish (5 minutes timeout)
    await new Promise((r) => setTimeout(r, 300000));

    clearInterval(checkInterval);

    return results;
  } finally {
    await page.close();
  }
}

/**
 * Extract prices from API response
 */
function extractPricesFromResponse(data: any, results: PriceResult[]): void {
  try {
    // Handle array responses
    if (Array.isArray(data)) {
      for (const item of data) {
        const price = extractSinglePrice(item);
        if (price && !isDuplicate(price, results)) {
          results.push(price);
          console.log(`[API] Found: ${price.carrier} ${price.service} - ${price.price} ${price.currency}`);
        }
      }
    }
    // Handle object with quotes/rates/results array
    else if (data && typeof data === "object") {
      const arrays = ["quotes", "rates", "results", "data", "prices", "carriers", "options", "services"];

      for (const key of arrays) {
        if (Array.isArray(data[key])) {
          for (const item of data[key]) {
            const price = extractSinglePrice(item);
            if (price && !isDuplicate(price, results)) {
              results.push(price);
              console.log(`[API] Found: ${price.carrier} ${price.service} - ${price.price} ${price.currency}`);
            }
          }
        }
      }

      // Also try to extract from nested structures
      for (const key of Object.keys(data)) {
        if (typeof data[key] === "object" && data[key] !== null) {
          extractPricesFromResponse(data[key], results);
        }
      }
    }
  } catch (e) {
    // Parsing error, continue
  }
}

/**
 * Extract a single price from an item
 */
function extractSinglePrice(item: any): PriceResult | null {
  if (!item || typeof item !== "object") return null;

  // Try different field names for price
  const priceFields = ["price", "totalPrice", "total", "amount", "cost", "rate", "charge"];
  const carrierFields = ["carrier", "carrierName", "provider", "providerName", "company", "name"];
  const serviceFields = ["service", "serviceName", "serviceType", "type", "product", "productName"];
  const currencyFields = ["currency", "currencyCode", "curr"];
  const transitFields = ["transitTime", "transitDays", "deliveryDays", "estimatedDays", "eta"];

  let price: number | null = null;
  let carrier: string | null = null;
  let service: string | null = null;
  let currency = "USD";
  let transitTime: string | undefined;

  for (const field of priceFields) {
    if (item[field] !== undefined && item[field] !== null) {
      price = typeof item[field] === "number" ? item[field] : parseFloat(item[field]);
      if (!isNaN(price)) break;
    }
  }

  for (const field of carrierFields) {
    if (item[field]) {
      carrier = String(item[field]);
      break;
    }
  }

  for (const field of serviceFields) {
    if (item[field]) {
      service = String(item[field]);
      break;
    }
  }

  for (const field of currencyFields) {
    if (item[field]) {
      currency = String(item[field]);
      break;
    }
  }

  for (const field of transitFields) {
    if (item[field]) {
      transitTime = String(item[field]);
      break;
    }
  }

  if (price !== null && price > 0 && (carrier || service)) {
    return {
      carrier: carrier || "Unknown",
      service: service || "Standard",
      price,
      currency,
      transitTime,
    };
  }

  return null;
}

/**
 * Check if price already exists
 */
function isDuplicate(price: PriceResult, results: PriceResult[]): boolean {
  return results.some(
    (r) => r.carrier === price.carrier && r.service === price.service && Math.abs(r.price - price.price) < 0.01
  );
}

/**
 * Scrape prices directly from page DOM
 */
async function scrapePricesFromDOM(page: Page): Promise<PriceResult[]> {
  return page.evaluate(() => {
    const results: any[] = [];

    // Look for price cards/rows in common patterns
    const selectors = [
      '[class*="price"]',
      '[class*="quote"]',
      '[class*="rate"]',
      '[class*="carrier"]',
      '[class*="result"]',
      '[class*="shipping"]',
      '[data-testid*="price"]',
      '[data-testid*="quote"]',
      'table tr',
      '.card',
      '[class*="Card"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      for (const el of elements) {
        const text = el.textContent || "";

        // Look for price patterns (e.g., $123.45, 123.45 USD, etc.)
        const priceMatch = text.match(/[\$€£]?\s*(\d+[.,]\d{2})\s*(USD|EUR|TRY|GBP)?/i);

        if (priceMatch) {
          // Try to find carrier name
          const carrierPatterns = ["DHL", "UPS", "FedEx", "TNT", "USPS", "Aramex", "EMS", "PostNL", "Royal Mail"];
          let carrier = "Unknown";

          for (const pattern of carrierPatterns) {
            if (text.toLowerCase().includes(pattern.toLowerCase())) {
              carrier = pattern;
              break;
            }
          }

          // Also check for images with carrier logos
          const images = el.querySelectorAll("img");
          for (const img of images) {
            const src = img.src || "";
            const alt = img.alt || "";
            for (const pattern of carrierPatterns) {
              if (src.toLowerCase().includes(pattern.toLowerCase()) || alt.toLowerCase().includes(pattern.toLowerCase())) {
                carrier = pattern;
                break;
              }
            }
          }

          results.push({
            carrier,
            service: "Standard",
            price: parseFloat(priceMatch[1].replace(",", ".")),
            currency: priceMatch[2] || "USD",
          });
        }
      }
    }

    return results;
  });
}

/**
 * Display final results
 */
function displayResults(results: PriceResult[], config: ScraperConfig): void {
  console.log("\n" + "=".repeat(70));
  console.log("PRICE RESULTS");
  console.log("=".repeat(70));
  console.log(`Destination: ${config.destinationCountry} (${config.destinationCountryCode})`);
  console.log(`Billable Weight: ${config.billableWeight} kg`);
  console.log("-".repeat(70));

  if (results.length === 0) {
    console.log("\nNo prices were captured. Possible reasons:");
    console.log("- Form was not submitted");
    console.log("- No rates available for the route");
    console.log("- Page structure changed");
    return;
  }

  // Sort by price
  results.sort((a, b) => a.price - b.price);

  // Remove duplicates and display
  const unique = results.filter((r, i, arr) =>
    arr.findIndex(x => x.carrier === r.carrier && x.service === r.service && Math.abs(x.price - r.price) < 0.01) === i
  );

  console.log(`\nFound ${unique.length} shipping options:\n`);
  console.log("CARRIER".padEnd(20) + "SERVICE".padEnd(25) + "PRICE".padStart(15) + "  TRANSIT");
  console.log("-".repeat(70));

  for (const result of unique) {
    const carrierStr = result.carrier.substring(0, 18).padEnd(20);
    const serviceStr = (result.service || "Standard").substring(0, 23).padEnd(25);
    const priceStr = `${result.price.toFixed(2)} ${result.currency}`.padStart(15);
    const transitStr = result.transitTime ? `  ${result.transitTime}` : "";

    console.log(`${carrierStr}${serviceStr}${priceStr}${transitStr}`);
  }

  console.log("-".repeat(70));
  console.log(`Cheapest: ${unique[0].carrier} ${unique[0].service} at ${unique[0].price.toFixed(2)} ${unique[0].currency}`);

  // Save results to file
  const outputPath = `/tmp/navlungo-prices-${config.destinationCountryCode}-${config.billableWeight}kg.json`;
  fs.writeFileSync(outputPath, JSON.stringify({ config, results: unique }, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log("\n" + "=".repeat(50));
  console.log("NAVLUNGO PRICE CALCULATOR SCRAPER");
  console.log("=".repeat(50));

  const rl = createReadlineInterface();

  try {
    // Get user configuration
    const config = await getUserConfig(rl);
    rl.close();

    console.log("\n[Scraper] Starting price scraping...");

    // Scrape prices
    const results = await scrapePrices(config);

    // Display results
    displayResults(results, config);

  } catch (error) {
    console.error("\n[Error]", error);
  } finally {
    if (browser) {
      console.log("\n[Scraper] Closing browser...");
      await browser.close();
    }
    process.exit(0);
  }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", async () => {
  console.log("\n\n[Scraper] Interrupted by user.");
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

main();
