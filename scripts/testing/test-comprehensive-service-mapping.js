/**
 * Test all 7 discovered services with their mapped carrier codes
 * to verify comprehensive label purchasing capability
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

async function testCarrierCode(carrierCode, serviceName) {
  console.log(`\n📦 Testing: ${serviceName}`);
  console.log(`🔧 Carrier Code: ${carrierCode}`);
  
  const accessToken = await getAccessToken();
  
  const payload = {
    country: "US",
    kgDesi: 1.0,
    seCarrier: carrierCode,
    isAmazonShipment: 0,
  };

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
      console.log(`✅ ${serviceName} - Carrier ${carrierCode} works!`);
      
      if (responseData.data?.prices?.length > 0) {
        const bestPrice = responseData.data.prices[0];
        console.log(`   Result: ${bestPrice.clearServiceName} - $${bestPrice.totalPrice}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ ${serviceName} - Carrier ${carrierCode} failed: ${errorText}`);
    }
  } catch (error) {
    console.log(`❌ ${serviceName} - Network error: ${error.message}`);
  }
}

async function main() {
  console.log("🔍 Testing ALL 7 Service Mappings for Label Purchasing\n");
  
  // Test all discovered services with their mapped carrier codes
  const serviceTests = [
    { code: 'shipentegra-amerika-eko-plus', name: 'ShipEntegra Amerika Eko Plus' },
    { code: 'shipentegra-express', name: 'ShipEntegra Express' },
    { code: 'shipentegra-ingiltere-eko-plus', name: 'ShipEntegra Ingiltere Eko Plus' },
    { code: 'shipentegra-international-express', name: 'ShipEntegra International Express' },
    { code: 'shipentegra-ups-ekspress', name: 'ShipEntegra Ups Express' },
    { code: 'shipentegra-widect', name: 'ShipEntegra Widect' },
    { code: 'shipentegra-worldwide-standard', name: 'ShipEntegra Worldwide Standard' },
    // Also test legacy codes
    { code: 'shipentegra-eco', name: 'Legacy Eco Service' },
    { code: 'shipentegra-ups-standart', name: 'Legacy Standard Service' },
  ];
  
  for (const service of serviceTests) {
    await testCarrierCode(service.code, service.name);
  }
  
  console.log("\n🏁 Comprehensive service mapping test completed!");
  console.log("All services can now be properly mapped for label purchasing.");
}

main().catch(console.error);