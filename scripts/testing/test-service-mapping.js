/**
 * Test script to verify the service mapping works correctly
 * with the critical carrier values for label purchasing
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

const SHIPENTEGRA_AUTH_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_PRICE_URL = "https://publicapi.shipentegra.com/v1/tools/calculate/all";

async function getAccessToken() {
  const response = await fetch(SHIPENTEGRA_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  
  const data = await response.json();
  return data.data?.accessToken;
}

async function testCarrierValue(carrierValue, description) {
  console.log(`\n📦 Testing ${description} with carrier: ${carrierValue}`);
  
  const accessToken = await getAccessToken();
  
  const payload = {
    country: "US",
    kgDesi: 1.0,
    seCarrier: carrierValue, // Use the specific carrier value
    isAmazonShipment: 0,
  };

  console.log("Request payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(SHIPENTEGRA_PRICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    console.log(`Response status: ${response.status}`);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log(`✅ ${description} - Carrier ${carrierValue} works!`);
      
      if (responseData.data?.prices?.length > 0) {
        const bestPrice = responseData.data.prices[0];
        console.log(`   Best option: ${bestPrice.clearServiceName} - $${bestPrice.totalPrice}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ ${description} - Carrier ${carrierValue} failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ ${description} - Network error: ${error.message}`);
  }
}

async function main() {
  console.log("🔍 Testing Critical Carrier Values for Label Purchasing\n");
  
  // Test the three critical carrier values
  await testCarrierValue("shipentegra-eco", "ECO Service");
  await testCarrierValue("shipentegra-ups-ekspress", "UPS Express Service");
  await testCarrierValue("shipentegra-ups-standart", "Standard Service");
  
  console.log("\n🏁 Service mapping test completed!");
}

main().catch(console.error);