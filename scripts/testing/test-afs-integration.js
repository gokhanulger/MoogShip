/**
 * Test AFS Transport integration with real API key
 */
import fetch from 'node-fetch';

const AFS_API_KEY = process.env.AFS_API_KEY;
const AFS_API_URL = "panel.afstransport.com/apiv2.php";

async function testAFSIntegration() {
  console.log("🚀 Testing AFS Transport integration...");
  
  if (!AFS_API_KEY) {
    console.error("❌ AFS_API_KEY not found in environment");
    return;
  }
  
  console.log("✅ AFS_API_KEY is available");
  
  // Test payload for 1kg package to USA
  const payload = {
    islem: "fiyat_hesapla",
    country_code: "US",
    shipments: [
      {
        weight: 1.0,
        length: 20,
        width: 15,
        height: 10,
      },
    ],
  };
  
  console.log("📦 Test payload:", JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`https://${AFS_API_URL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": AFS_API_KEY,
        "User-Agent": "MoogShip/1.0 (AFS Transport Integration Test)",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📡 Response headers:", Object.fromEntries(response.headers));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      return;
    }
    
    const responseData = await response.json();
    console.log("✅ API Response:", JSON.stringify(responseData, null, 2));
    
    if (!responseData.hata && responseData.prices) {
      console.log(`🎯 Found ${responseData.prices.length} pricing options:`);
      responseData.prices.forEach((price, index) => {
        console.log(`  ${index + 1}. ${price.service_name}: $${price.price} (Service ID: ${price.service_id})`);
      });
      
      // Test the transformation function
      console.log("\n📋 Testing MoogShip transformation...");
      const { calculateAFSTransportPricing } = await import('./server/services/afstransport.ts');
      const result = await calculateAFSTransportPricing(20, 15, 10, 1.0, "US");
      console.log("✅ Transformed result:", JSON.stringify(result, null, 2));
    } else {
      console.log("⚠️ API returned error or no pricing data");
      if (responseData.hata) {
        console.log(`Error message: ${responseData.mesaj}`);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testAFSIntegration();