/**
 * Test script to send requests to Shipentegra for 0.5kg and 1kg packages
 * and display the API responses
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

// Shipentegra API endpoints
const SHIPENTEGRA_AUTH_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_PRICE_URL = "https://publicapi.shipentegra.com/v1/tools/calculate/all";

/**
 * Get Shipentegra access token
 */
async function getShipentegraAccessToken() {
  console.log("🔑 Requesting Shipentegra access token...");
  
  const authPayload = {
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
  };

  console.log("Auth payload:", authPayload);

  try {
    const response = await fetch(SHIPENTEGRA_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(authPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Auth failed: ${response.status} - ${errorText}`);
      return null;
    }

    const authData = await response.json();
    console.log("✅ Auth response:", authData);
    
    return authData.data?.accessToken || null;
  } catch (error) {
    console.error("❌ Auth error:", error);
    return null;
  }
}

/**
 * Test pricing for a specific weight
 */
async function testPricing(accessToken, weight, description) {
  console.log(`\n📦 Testing ${description} (${weight}kg)...`);
  
  const payload = {
    country: "US", // Destination: United States
    kgDesi: weight, // Weight in kg
    seCarrier: "shipentegra-ups-ekspress", // UPS Express service
    isAmazonShipment: 0, // Not an Amazon shipment
  };

  console.log("Request payload:", payload);

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${accessToken}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": "https://publicapi.shipentegra.com",
    "Referer": "https://publicapi.shipentegra.com/",
    "Connection": "keep-alive",
    "DNT": "1",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
  };

  try {
    const response = await fetch(SHIPENTEGRA_PRICE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      return;
    }

    const responseData = await response.json();
    console.log("✅ API Response:");
    console.log(JSON.stringify(responseData, null, 2));
    
    // Parse and display pricing options
    if (responseData.data && responseData.data.prices) {
      console.log("\n💰 Pricing Options:");
      responseData.data.prices.forEach((price, index) => {
        console.log(`  ${index + 1}. ${price.serviceName}:`);
        console.log(`     - Cargo Price: $${price.cargoPrice}`);
        console.log(`     - Fuel Cost: $${price.fuelCost}`);
        console.log(`     - Total Price: $${price.totalPrice}`);
        console.log(`     - Service Type: ${price.serviceType}`);
        if (price.additionalDescription) {
          console.log(`     - Description: ${price.additionalDescription}`);
        }
      });
    }

  } catch (error) {
    console.error("❌ Request error:", error);
  }
}

/**
 * Main function to run the tests
 */
async function main() {
  console.log("🚀 Starting Shipentegra API tests...\n");
  
  // Get access token
  const accessToken = await getShipentegraAccessToken();
  if (!accessToken) {
    console.error("❌ Failed to get access token. Exiting...");
    return;
  }

  console.log("✅ Access token obtained successfully");

  // Test 0.5kg package
  await testPricing(accessToken, 0.5, "0.5kg package");

  // Add a small delay between requests
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 1kg package  
  await testPricing(accessToken, 1.0, "1kg package");

  console.log("\n🏁 Testing completed!");
}

// Run the tests
main().catch(error => {
  console.error("❌ Script error:", error);
});