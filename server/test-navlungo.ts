/**
 * Test script for Navlungo integration
 * Run with: npx tsx server/test-navlungo.ts
 *
 * Commands:
 *   npx tsx server/test-navlungo.ts login     - Test login and save token
 *   npx tsx server/test-navlungo.ts prices    - Fetch prices via API
 *   npx tsx server/test-navlungo.ts scrape    - Scrape prices from calculator page
 *   npx tsx server/test-navlungo.ts interactive - Open browser for manual interaction
 */

import {
  testNavlungoConnection,
  getNavlungoPrices,
  scrapeNavlungoPriceCalculator,
  interactivePriceFetch,
  cleanup,
} from "./services/navlungo";

const command = process.argv[2] || "login";

async function testLogin() {
  console.log("=".repeat(50));
  console.log("Navlungo Login Test");
  console.log("=".repeat(50));
  console.log("\nA browser window will open. Please:");
  console.log("1. Solve the CAPTCHA (click the checkbox)");
  console.log("2. Click 'Giriş Yap' (Login) button");
  console.log("3. Wait for the dashboard to load\n");

  const result = await testNavlungoConnection();

  if (result.success) {
    console.log("\n✅ Login successful!");
    console.log("   Token expires:", result.tokenInfo?.expiresAt);
    console.log("   User ID:", result.tokenInfo?.userId);
    console.log("\n   Token has been saved. Future API calls won't need login.");
  } else {
    console.log("\n❌ Login failed:", result.message);
  }
}

async function testPrices() {
  console.log("=".repeat(50));
  console.log("Navlungo Price API Test");
  console.log("=".repeat(50));

  const result = await getNavlungoPrices({
    originCountry: "TR",
    originCity: "Istanbul",
    destinationCountry: "US",
    destinationCity: "New York",
    destinationPostalCode: "10001",
    weight: 1,
    length: 20,
    width: 15,
    height: 10,
  });

  if (result.success) {
    console.log("\n✅ Price query successful!");
    console.log(`   Found ${result.quotes.length} quotes:\n`);
    for (const quote of result.quotes) {
      console.log(`   - ${quote.carrier} ${quote.service}: ${quote.price} ${quote.currency}`);
      if (quote.transitDays) {
        console.log(`     Transit: ${quote.transitDays} days`);
      }
    }
  } else {
    console.log("\n❌ Price query failed:", result.error);
  }
}

async function testScrape() {
  console.log("=".repeat(50));
  console.log("Navlungo Price Calculator Scrape Test");
  console.log("=".repeat(50));

  const result = await scrapeNavlungoPriceCalculator({
    originCountry: "TR",
    originCity: "Istanbul",
    destinationCountry: "US",
    destinationCity: "New York",
    destinationPostalCode: "10001",
    weight: 1,
    length: 20,
    width: 15,
    height: 10,
  });

  if (result.success) {
    console.log("\n✅ Scraping successful!");
    console.log(`   Found ${result.quotes.length} quotes:\n`);
    for (const quote of result.quotes) {
      console.log(`   - ${quote.carrier} ${quote.service}: ${quote.price} ${quote.currency}`);
    }
  } else {
    console.log("\n❌ Scraping failed:", result.error);
    console.log("   Check screenshots at /tmp/navlungo-price-calc-*.png");
  }
}

async function testInteractive() {
  console.log("=".repeat(50));
  console.log("Navlungo Interactive Price Fetch");
  console.log("=".repeat(50));
  console.log("\nA browser window will open. Please:");
  console.log("1. Login if prompted");
  console.log("2. Fill the price calculator form");
  console.log("3. Prices will be captured automatically from API calls");
  console.log("4. Press Ctrl+C when done\n");

  const result = await interactivePriceFetch();

  if (result.success) {
    console.log("\n✅ Captured prices successfully!");
    console.log(`   Found ${result.quotes.length} quotes:\n`);
    for (const quote of result.quotes) {
      console.log(`   - ${quote.carrier} ${quote.service}: ${quote.price} ${quote.currency}`);
    }
  } else {
    console.log("\n❌ No prices captured:", result.error);
  }
}

async function main() {
  try {
    switch (command) {
      case "login":
        await testLogin();
        break;
      case "prices":
        await testPrices();
        break;
      case "scrape":
        await testScrape();
        break;
      case "interactive":
        await testInteractive();
        break;
      default:
        console.log("Unknown command:", command);
        console.log("\nAvailable commands:");
        console.log("  login       - Test login and save token");
        console.log("  prices      - Fetch prices via API");
        console.log("  scrape      - Scrape prices from calculator page");
        console.log("  interactive - Open browser for manual interaction");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    console.log("\nCleaning up...");
    await cleanup();
    console.log("Done.");
    process.exit(0);
  }
}

main();
