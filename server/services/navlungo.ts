import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

/**
 * NavlungoService - Automated pricing fetcher for navlungo.com
 * Uses headless browser to login and fetch pricing data
 */

// Navlungo credentials
const NAVLUNGO_EMAIL = process.env.NAVLUNGO_EMAIL || "info@moogship.com";
const NAVLUNGO_PASSWORD = process.env.NAVLUNGO_PASSWORD || "Sr07cn02ak88!";

// API endpoints discovered from navlungo's frontend
const NAVLUNGO_ENDPOINTS = {
  login: "https://ship.navlungo.com/login",
  priceCalculator: "https://ship.navlungo.com/ship/priceCalculator",
  quoteSearch: "https://quote-search-api.navlungo.com",
  quickPrice: "https://quick-price-calculator.navlungo.com",
  api: "https://api.navlungo.com",
};

// Token file path for persistence
const TOKEN_FILE_PATH = path.join(__dirname, ".navlungo-token.json");

// Token cache
interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId?: string;
}

let cachedToken: TokenCache | null = null;
let browser: Browser | null = null;

// Configuration
const config = {
  headless: false, // Set to false for manual CAPTCHA solving
  slowMo: 50, // Slow down actions for human-like behavior
};

/**
 * Load token from file
 */
function loadTokenFromFile(): TokenCache | null {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      const data = fs.readFileSync(TOKEN_FILE_PATH, "utf-8");
      const token = JSON.parse(data) as TokenCache;
      // Check if token is still valid (not expired)
      if (token.expiresAt > Date.now() + 5 * 60 * 1000) {
        console.log("[Navlungo] Loaded valid token from file");
        return token;
      }
      console.log("[Navlungo] Token from file is expired");
    }
  } catch (error) {
    console.log("[Navlungo] Could not load token from file:", error);
  }
  return null;
}

/**
 * Save token to file
 */
function saveTokenToFile(token: TokenCache): void {
  try {
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(token, null, 2));
    console.log("[Navlungo] Token saved to file");
  } catch (error) {
    console.log("[Navlungo] Could not save token to file:", error);
  }
}

/**
 * Initialize browser instance
 */
async function initBrowser(forceHeadful: boolean = false): Promise<Browser> {
  if (!browser) {
    const isHeadless = forceHeadful ? false : config.headless;
    console.log(`[Navlungo] Starting browser in ${isHeadless ? "headless" : "headful"} mode...`);

    browser = await puppeteer.launch({
      headless: isHeadless,
      slowMo: config.slowMo,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--lang=tr-TR",
      ],
      ignoreDefaultArgs: ["--enable-automation"],
    });
  }
  return browser;
}

/**
 * Close browser instance
 */
async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Login to navlungo and capture Firebase token
 */
async function loginAndGetToken(forceHeadful: boolean = false): Promise<TokenCache> {
  // First try to load from file
  const savedToken = loadTokenFromFile();
  if (savedToken) {
    cachedToken = savedToken;
    return savedToken;
  }

  console.log("[Navlungo] Starting login process...");
  console.log("[Navlungo] ⚠️  A browser window will open. Please solve the CAPTCHA manually if prompted.");

  const browserInstance = await initBrowser(true); // Force headful for login
  const page = await browserInstance.newPage();

  try {
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Additional evasions for Cloudflare
    await page.evaluateOnNewDocument(() => {
      // Override webdriver property
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });

      // Override plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // Override languages
      Object.defineProperty(navigator, "languages", {
        get: () => ["tr-TR", "tr", "en-US", "en"],
      });

      // Mock chrome object
      (window as any).chrome = {
        runtime: {},
      };
    });

    // Navigate to login page
    console.log("[Navlungo] Navigating to login page...");
    await page.goto(NAVLUNGO_ENDPOINTS.login, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Take screenshot for debugging
    await page.screenshot({ path: "/tmp/navlungo-1-login-page.png" });
    console.log("[Navlungo] Screenshot saved: /tmp/navlungo-1-login-page.png");

    // Wait for the login form to load
    await page.waitForSelector('input[type="email"], input[name="email"]', {
      timeout: 10000,
    });

    console.log("[Navlungo] Filling login form...");

    // Fill email
    await page.type(
      'input[type="email"], input[name="email"]',
      NAVLUNGO_EMAIL,
      { delay: 50 }
    );

    // Fill password
    await page.type(
      'input[type="password"], input[name="password"]',
      NAVLUNGO_PASSWORD,
      { delay: 50 }
    );

    // Handle Cloudflare Turnstile CAPTCHA - wait for manual solving
    console.log("[Navlungo] ========================================");
    console.log("[Navlungo] 👆 Please solve the CAPTCHA in the browser window");
    console.log("[Navlungo] 👆 Click the checkbox and complete any challenges");
    console.log("[Navlungo] 👆 Then click the 'Giriş Yap' (Login) button");
    console.log("[Navlungo] ========================================");
    console.log("[Navlungo] Waiting for you to complete login (up to 2 minutes)...");

    // Wait for login to complete - either URL change or Firebase token appears
    // Give the user up to 2 minutes to solve CAPTCHA and login
    await page.waitForFunction(
      () => {
        // Check if URL changed from /login
        if (!window.location.pathname.includes("/login")) {
          return true;
        }
        // Check if Firebase token exists
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.includes("firebase:authUser")) {
            return true;
          }
        }
        // Also check IndexedDB indicator
        return false;
      },
      { timeout: 120000 } // 2 minutes to solve CAPTCHA
    );

    console.log("[Navlungo] ✅ Login detected!");

    // Wait extra time for Firebase to fully store the token
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Take screenshot after login
    await page.screenshot({ path: "/tmp/navlungo-2-after-login.png" });
    console.log("[Navlungo] Screenshot saved: /tmp/navlungo-2-after-login.png");

    // Extract token from localStorage
    console.log("[Navlungo] Extracting token from localStorage...");
    const tokenData = await page.evaluate(() => {
      // Firebase stores auth data in localStorage with various keys
      const keys = Object.keys(localStorage);

      // Look for Firebase auth keys
      for (const key of keys) {
        if (
          key.includes("firebase:authUser") ||
          key.includes("firebaseLocalStorageDb")
        ) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.stsTokenManager) {
                return {
                  accessToken: parsed.stsTokenManager.accessToken,
                  refreshToken: parsed.stsTokenManager.refreshToken,
                  expirationTime: parsed.stsTokenManager.expirationTime,
                  userId: parsed.uid,
                };
              }
            }
          } catch (e) {
            // Continue searching
          }
        }
      }

      // Alternative: check for token in session storage
      const sessionKeys = Object.keys(sessionStorage);
      for (const key of sessionKeys) {
        if (key.includes("auth") || key.includes("token")) {
          try {
            const data = sessionStorage.getItem(key);
            if (data) {
              return JSON.parse(data);
            }
          } catch (e) {
            // Continue searching
          }
        }
      }

      return null;
    });

    if (!tokenData || !tokenData.accessToken) {
      // Try to capture from IndexedDB (Firebase sometimes uses this)
      const indexedDBToken = await page.evaluate(async () => {
        return new Promise((resolve) => {
          const request = indexedDB.open("firebaseLocalStorageDb");
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction("firebaseLocalStorage", "readonly");
            const store = tx.objectStore("firebaseLocalStorage");
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
              const results = getAllRequest.result;
              for (const item of results) {
                if (item.value && item.value.stsTokenManager) {
                  resolve({
                    accessToken: item.value.stsTokenManager.accessToken,
                    refreshToken: item.value.stsTokenManager.refreshToken,
                    expirationTime: item.value.stsTokenManager.expirationTime,
                    userId: item.value.uid,
                  });
                  return;
                }
              }
              resolve(null);
            };
            getAllRequest.onerror = () => resolve(null);
          };
          request.onerror = () => resolve(null);
        });
      });

      if (indexedDBToken) {
        const token: TokenCache = {
          accessToken: (indexedDBToken as any).accessToken,
          refreshToken: (indexedDBToken as any).refreshToken,
          expiresAt: (indexedDBToken as any).expirationTime,
          userId: (indexedDBToken as any).userId,
        };
        cachedToken = token;
        saveTokenToFile(token);
        console.log("[Navlungo] ✅ Token extracted from IndexedDB and saved");
        return token;
      }

      throw new Error("Failed to extract Firebase token");
    }

    const token: TokenCache = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expirationTime,
      userId: tokenData.userId,
    };

    cachedToken = token;
    saveTokenToFile(token);
    console.log("[Navlungo] ✅ Login successful, token cached and saved");

    return token;
  } finally {
    await page.close();
  }
}

/**
 * Get valid access token (login if needed, refresh if expired)
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken) {
    const now = Date.now();
    // Refresh if token expires in less than 5 minutes
    if (cachedToken.expiresAt > now + 5 * 60 * 1000) {
      return cachedToken.accessToken;
    }
    console.log("[Navlungo] Token expired or expiring soon, refreshing...");
  }

  // Login and get new token
  const token = await loginAndGetToken();
  return token.accessToken;
}

/**
 * Price quote request interface
 */
export interface NavlungoPriceRequest {
  originCountry: string;
  originCity?: string;
  originPostalCode?: string;
  destinationCountry: string;
  destinationCity?: string;
  destinationPostalCode?: string;
  weight: number; // kg
  length?: number; // cm
  width?: number; // cm
  height?: number; // cm
  packageCount?: number;
  declaredValue?: number;
  currency?: string;
}

/**
 * Price quote response interface
 */
export interface NavlungoPriceQuote {
  carrier: string;
  service: string;
  price: number;
  currency: string;
  transitDays?: number;
  transitTime?: string;
}

export interface NavlungoPriceResponse {
  success: boolean;
  quotes: NavlungoPriceQuote[];
  error?: string;
}

/**
 * Fetch pricing from Navlungo
 */
export async function getNavlungoPrices(
  request: NavlungoPriceRequest
): Promise<NavlungoPriceResponse> {
  try {
    const accessToken = await getAccessToken();

    // Try the quote-search-api first
    const response = await fetch(`${NAVLUNGO_ENDPOINTS.quoteSearch}/quotes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Origin: "https://ship.navlungo.com",
        Referer: "https://ship.navlungo.com/",
      },
      body: JSON.stringify({
        origin: {
          countryCode: request.originCountry,
          city: request.originCity,
          postalCode: request.originPostalCode,
        },
        destination: {
          countryCode: request.destinationCountry,
          city: request.destinationCity,
          postalCode: request.destinationPostalCode,
        },
        cargo: {
          weight: request.weight,
          length: request.length || 20,
          width: request.width || 20,
          height: request.height || 20,
          packageCount: request.packageCount || 1,
        },
        declaredValue: request.declaredValue,
        currency: request.currency || "USD",
      }),
    });

    if (!response.ok) {
      // Token might be invalid, clear cache and retry once
      if (response.status === 401 || response.status === 403) {
        console.log("[Navlungo] Token rejected, clearing cache and retrying...");
        cachedToken = null;
        const newToken = await getAccessToken();

        const retryResponse = await fetch(
          `${NAVLUNGO_ENDPOINTS.quoteSearch}/quotes`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
              Origin: "https://ship.navlungo.com",
              Referer: "https://ship.navlungo.com/",
            },
            body: JSON.stringify({
              origin: {
                countryCode: request.originCountry,
                city: request.originCity,
                postalCode: request.originPostalCode,
              },
              destination: {
                countryCode: request.destinationCountry,
                city: request.destinationCity,
                postalCode: request.destinationPostalCode,
              },
              cargo: {
                weight: request.weight,
                length: request.length || 20,
                width: request.width || 20,
                height: request.height || 20,
                packageCount: request.packageCount || 1,
              },
              declaredValue: request.declaredValue,
              currency: request.currency || "USD",
            }),
          }
        );

        if (!retryResponse.ok) {
          throw new Error(`Navlungo API error: ${retryResponse.status}`);
        }

        const retryData = await retryResponse.json();
        return parseQuoteResponse(retryData);
      }

      throw new Error(`Navlungo API error: ${response.status}`);
    }

    const data = await response.json();
    return parseQuoteResponse(data);
  } catch (error) {
    console.error("[Navlungo] Error fetching prices:", error);
    return {
      success: false,
      quotes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Parse quote response from Navlungo API
 */
function parseQuoteResponse(data: any): NavlungoPriceResponse {
  try {
    const quotes: NavlungoPriceQuote[] = [];

    // The response structure may vary, handle different formats
    if (Array.isArray(data)) {
      for (const item of data) {
        quotes.push({
          carrier: item.carrier || item.providerName || "Unknown",
          service: item.service || item.serviceName || "Standard",
          price: item.price || item.totalPrice || 0,
          currency: item.currency || "USD",
          transitDays: item.transitDays || item.estimatedDays,
          transitTime: item.transitTime,
        });
      }
    } else if (data.quotes) {
      for (const item of data.quotes) {
        quotes.push({
          carrier: item.carrier || item.providerName || "Unknown",
          service: item.service || item.serviceName || "Standard",
          price: item.price || item.totalPrice || 0,
          currency: item.currency || "USD",
          transitDays: item.transitDays || item.estimatedDays,
          transitTime: item.transitTime,
        });
      }
    } else if (data.data) {
      // Handle nested data structure
      const items = Array.isArray(data.data) ? data.data : [data.data];
      for (const item of items) {
        quotes.push({
          carrier: item.carrier || item.providerName || "Unknown",
          service: item.service || item.serviceName || "Standard",
          price: item.price || item.totalPrice || 0,
          currency: item.currency || "USD",
          transitDays: item.transitDays || item.estimatedDays,
          transitTime: item.transitTime,
        });
      }
    }

    return {
      success: true,
      quotes,
    };
  } catch (error) {
    return {
      success: false,
      quotes: [],
      error: "Failed to parse response",
    };
  }
}

/**
 * Get prices using browser automation (more reliable but slower)
 * Use this if API calls fail
 */
export async function getNavlungoPricesViaBrowser(
  request: NavlungoPriceRequest
): Promise<NavlungoPriceResponse> {
  console.log("[Navlungo] Fetching prices via browser automation...");

  const browserInstance = await initBrowser();
  const page = await browserInstance.newPage();

  try {
    // First ensure we're logged in
    await getAccessToken();

    // Set cookies/localStorage from cached session
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto("https://ship.navlungo.com/quick-quote", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for quote form
    await page.waitForSelector('input, select, [data-testid="origin"]', {
      timeout: 10000,
    });

    // Fill the form (this will need adjustment based on actual form structure)
    // ... form filling logic here

    // Capture network responses for pricing data
    const quotes: NavlungoPriceQuote[] = [];

    page.on("response", async (response) => {
      if (
        response.url().includes("quote") ||
        response.url().includes("price")
      ) {
        try {
          const data = await response.json();
          // Parse and add quotes
          console.log("[Navlungo] Captured price response:", data);
        } catch (e) {
          // Not JSON response
        }
      }
    });

    // Submit the form and wait for results
    // ... form submission logic here

    return {
      success: true,
      quotes,
    };
  } catch (error) {
    console.error("[Navlungo] Browser automation error:", error);
    return {
      success: false,
      quotes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await page.close();
  }
}

/**
 * Scrape prices from the Price Calculator page
 * This navigates to the actual price calculator and fills the form
 */
export async function scrapeNavlungoPriceCalculator(
  request: NavlungoPriceRequest
): Promise<NavlungoPriceResponse> {
  console.log("[Navlungo] Scraping prices from Price Calculator...");

  // Ensure we have a valid token first
  await getAccessToken();

  const browserInstance = await initBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Inject the token into localStorage before navigating
    if (cachedToken) {
      await page.evaluateOnNewDocument((token) => {
        // This will be executed before any scripts on the page
        (window as any).__navlungoToken = token;
      }, cachedToken);
    }

    // Capture API responses
    const capturedQuotes: NavlungoPriceQuote[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("quote") ||
        url.includes("price") ||
        url.includes("rate") ||
        url.includes("calculate")
      ) {
        try {
          const data = await response.json();
          console.log("[Navlungo] Captured API response from:", url);
          console.log("[Navlungo] Response data:", JSON.stringify(data, null, 2));

          // Try to parse quotes from response
          const parsed = parseQuoteResponse(data);
          if (parsed.success && parsed.quotes.length > 0) {
            capturedQuotes.push(...parsed.quotes);
          }
        } catch (e) {
          // Not a JSON response or parsing error
        }
      }
    });

    // Navigate to price calculator
    console.log("[Navlungo] Navigating to Price Calculator...");
    await page.goto(NAVLUNGO_ENDPOINTS.priceCalculator, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await page.screenshot({ path: "/tmp/navlungo-price-calc-1.png" });
    console.log("[Navlungo] Screenshot saved: /tmp/navlungo-price-calc-1.png");

    // Wait for the form to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Log page content for debugging
    const pageContent = await page.content();
    console.log("[Navlungo] Page loaded, content length:", pageContent.length);

    // Try to find and fill the form
    // Note: The actual selectors may need adjustment based on the page structure
    console.log("[Navlungo] Looking for form fields...");

    // Take another screenshot
    await page.screenshot({ path: "/tmp/navlungo-price-calc-2.png" });

    // Wait for any quotes to be captured from API calls
    console.log("[Navlungo] Waiting for API responses...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (capturedQuotes.length > 0) {
      console.log(`[Navlungo] ✅ Captured ${capturedQuotes.length} quotes`);
      return {
        success: true,
        quotes: capturedQuotes,
      };
    }

    // If no quotes captured automatically, return info about the page
    return {
      success: false,
      quotes: [],
      error: "No quotes captured. Page may require manual interaction.",
    };
  } catch (error) {
    console.error("[Navlungo] Price Calculator scraping error:", error);
    await page.screenshot({ path: "/tmp/navlungo-price-calc-error.png" });
    return {
      success: false,
      quotes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await page.close();
  }
}

/**
 * Interactive price fetch - opens browser for manual interaction
 * Use this when automated scraping doesn't work
 */
export async function interactivePriceFetch(): Promise<NavlungoPriceResponse> {
  console.log("[Navlungo] Starting interactive price fetch...");
  console.log("[Navlungo] ========================================");
  console.log("[Navlungo] 👆 A browser window will open");
  console.log("[Navlungo] 👆 Please fill the form and get prices");
  console.log("[Navlungo] 👆 The prices will be captured automatically");
  console.log("[Navlungo] ========================================");

  const browserInstance = await initBrowser(true); // Force headful
  const page = await browserInstance.newPage();

  try {
    await page.setViewport({ width: 1920, height: 1080 });

    // Capture API responses
    const capturedQuotes: NavlungoPriceQuote[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (
        url.includes("quote") ||
        url.includes("price") ||
        url.includes("rate") ||
        url.includes("calculate") ||
        url.includes("search")
      ) {
        try {
          const data = await response.json();
          console.log("[Navlungo] 📦 Captured response from:", url);

          // Try to parse quotes from response
          const parsed = parseQuoteResponse(data);
          if (parsed.success && parsed.quotes.length > 0) {
            console.log(`[Navlungo] ✅ Found ${parsed.quotes.length} quotes!`);
            capturedQuotes.push(...parsed.quotes);

            // Log each quote
            for (const quote of parsed.quotes) {
              console.log(`[Navlungo]   - ${quote.carrier} ${quote.service}: ${quote.price} ${quote.currency}`);
            }
          }
        } catch (e) {
          // Not a JSON response
        }
      }
    });

    // Navigate to price calculator
    await page.goto(NAVLUNGO_ENDPOINTS.priceCalculator, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log("[Navlungo] Page loaded. Waiting for you to interact with the form...");
    console.log("[Navlungo] Press Ctrl+C when done or wait 5 minutes for timeout.");

    // Wait for user interaction (up to 5 minutes)
    await new Promise((resolve) => setTimeout(resolve, 300000));

    return {
      success: capturedQuotes.length > 0,
      quotes: capturedQuotes,
      error: capturedQuotes.length === 0 ? "No quotes captured" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      quotes: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  } finally {
    await page.close();
  }
}

/**
 * Test the connection and login
 */
export async function testNavlungoConnection(): Promise<{
  success: boolean;
  message: string;
  tokenInfo?: {
    expiresAt: Date;
    userId?: string;
  };
}> {
  try {
    console.log("[Navlungo] Testing connection...");
    const token = await loginAndGetToken();

    return {
      success: true,
      message: "Successfully logged in to Navlungo",
      tokenInfo: {
        expiresAt: new Date(token.expiresAt),
        userId: token.userId,
      },
    };
  } catch (error) {
    console.error("[Navlungo] Connection test failed:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Cleanup - close browser when done
 */
export async function cleanup(): Promise<void> {
  await closeBrowser();
}

// Handle process exit
process.on("exit", () => {
  closeBrowser().catch(console.error);
});

process.on("SIGINT", () => {
  closeBrowser().catch(console.error);
  process.exit();
});

process.on("SIGTERM", () => {
  closeBrowser().catch(console.error);
  process.exit();
});
