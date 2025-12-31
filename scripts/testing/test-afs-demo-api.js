/**
 * Test AFS Transport API with demo credentials provided
 * Demo API Key: fmdnh47u6zgcy
 */

import https from 'https';

async function testAFSDemoAPI() {
  console.log("🚀 Testing AFS Transport API with demo credentials...");
  
  const payload = JSON.stringify({
    islem: "fiyat_hesapla",
    country_code: "DE",
    shipments: [{
      weight: 1,
      length: 5,
      width: 5,
      height: 5
    }]
  });

  const options = {
    hostname: 'panel.afstransport.com',
    path: '/apiv2.php',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': 'fmdnh47u6zgcy',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    console.log("🚀 Making request to:", `https://${options.hostname}${options.path}`);
    console.log("🚀 Payload:", payload);
    console.log("🚀 Headers:", options.headers);
    
    const req = https.request(options, (res) => {
      console.log("🚀 Response status:", res.statusCode);
      console.log("🚀 Response headers:", res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log("🚀 Raw response:", data);
          const response = JSON.parse(data);
          console.log("✅ Parsed AFS response:", JSON.stringify(response, null, 2));
          
          if (response.hata) {
            console.log("🔴 API returned error:", response.mesaj);
          } else {
            console.log("🟢 Success! Found", response.prices?.length || 0, "pricing options");
            if (response.prices) {
              response.prices.forEach((price, index) => {
                console.log(`  ${index + 1}. ${price.service_name} - $${price.price} (ID: ${price.service_id})`);
              });
            }
          }
          
          resolve(response);
        } catch (error) {
          console.error("❌ Error parsing response:", error);
          console.error("❌ Raw response:", data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error("❌ Request error:", error);
      reject(error);
    });
    
    req.write(payload);
    req.end();
  });
}

// Run the test
testAFSDemoAPI()
  .then(() => {
    console.log("✅ AFS Demo API test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ AFS Demo API test failed:", error);
    process.exit(1);
  });