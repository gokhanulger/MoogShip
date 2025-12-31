/**
 * Test AFS Transport API with specific payload format
 */

import fetch from 'node-fetch';

async function testAFSSpecific() {
  console.log("🚀 Testing AFS Transport API with specific payload...");
  
  const payload = {
    "islem": "fiyat_hesapla",
    "country_code": "DE",
    "shipments": [
      {
        "weight": 1,
        "length": 5,
        "width": 5,
        "height": 5
      }
    ]
  };

  console.log("📦 Testing with payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch("https://panel.afstransport.com/apiv2.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AFS_API_KEY}`,
        "User-Agent": "MoogShip/1.0 (AFS Transport Integration)",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload)
    });

    console.log(`📡 Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ HTTP Error: ${response.status} - ${response.statusText}`);
      console.log("Error details:", errorText);
      
      // Try different authentication methods
      console.log("\n🔧 Trying alternative authentication methods...");
      await testDifferentAuthMethods(payload);
      return;
    }

    const data = await response.json();
    console.log("✅ AFS Transport API Response:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.hata) {
      console.log(`❌ API Error: ${data.mesaj}`);
    } else if (data.prices && data.prices.length > 0) {
      console.log(`🎯 Found ${data.prices.length} pricing options:`);
      data.prices.forEach((price, index) => {
        console.log(`  ${index + 1}. ${price.service_name}: $${price.price.toFixed(2)}`);
      });
    } else {
      console.log("⚠️ No pricing data returned");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    // Try different authentication methods
    console.log("\n🔧 Trying alternative authentication methods...");
    await testDifferentAuthMethods(payload);
  }
}

async function testDifferentAuthMethods(payload) {
  const authMethods = [
    { name: "x-api-key Header", headers: { "x-api-key": process.env.AFS_API_KEY }},
    { name: "api-key Header", headers: { "api-key": process.env.AFS_API_KEY }},
    { name: "token Header", headers: { "token": process.env.AFS_API_KEY }},
    { name: "X-API-Token Header", headers: { "X-API-Token": process.env.AFS_API_KEY }},
  ];

  for (const method of authMethods) {
    try {
      console.log(`🔍 Testing ${method.name}...`);
      
      const response = await fetch("https://panel.afstransport.com/apiv2.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MoogShip/1.0 (AFS Transport Integration)",
          "Accept": "application/json",
          ...method.headers
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!data.hata && data.prices) {
        console.log(`✅ ${method.name} works! Found ${data.prices.length} prices:`);
        data.prices.forEach((price, index) => {
          console.log(`  ${index + 1}. ${price.service_name}: $${price.price.toFixed(2)}`);
        });
        return method.name;
      } else {
        console.log(`❌ ${method.name}: ${data.mesaj || 'Authentication failed'}`);
      }
    } catch (error) {
      console.log(`❌ ${method.name}: ${error.message}`);
    }
  }
  
  console.log("⚠️ All authentication methods failed - API key may be invalid or API endpoint changed");
  return null;
}

// Test the MoogShip unified pricing system
async function testMoogShipIntegration() {
  console.log("\n🚀 Testing MoogShip unified pricing system...");
  
  try {
    // Import the pricing function directly
    const { calculateAFSTransportPricing } = await import('./server/services/afstransport.js');
    
    const result = await calculateAFSTransportPricing(5, 5, 5, 1, "DE");
    
    console.log("📊 MoogShip AFS Integration Result:");
    console.log(`- Success: ${result.success}`);
    console.log(`- Options: ${result.options.length}`);
    console.log(`- Currency: ${result.currency}`);
    
    if (result.options.length > 0) {
      console.log("🎯 MoogShip GLS Options:");
      result.options.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option.displayName}
     - Price: $${(option.totalPrice / 100).toFixed(2)}
     - Delivery: ${option.deliveryTime}
     - Service Type: ${option.serviceType}`);
      });
    }
    
  } catch (error) {
    console.error("❌ MoogShip integration test failed:", error.message);
  }
}

async function main() {
  await testAFSSpecific();
  await testMoogShipIntegration();
}

main();