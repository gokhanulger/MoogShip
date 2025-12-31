/**
 * Comprehensive test for GLS pricing integration with detailed logging
 * This tests the unified MoogShip pricing system including AFS Transport GLS options
 */

import http from 'http';

async function testGLSPricingCalculation() {
  console.log("🚀 Testing MoogShip GLS pricing calculation through unified API...");
  
  // Test payload for pricing calculation
  const payload = JSON.stringify({
    packageWeight: 1,
    packageLength: 20,
    packageWidth: 15,
    packageHeight: 10,
    destinationCountry: "DE",
    packages: [{
      weight: 1,
      length: 20,
      width: 15,
      height: 10,
      contents: "Electronics"
    }],
    productItems: [{
      description: "Test Product",
      quantity: 1,
      value: 50,
      weight: 1,
      htsCode: "8517.12.00"
    }]
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/pricing/calculate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'Cookie': 'connect.sid=s%3AtnYgCrbuw0r_hDFNHZraOI3QCmN4JXtr.fLVQy7Gt5eVXeGQwYLdRhR7p4QKRuEhOdDL7sLCuDGw'
    }
  };

  return new Promise((resolve, reject) => {
    console.log("📦 Testing with payload:", JSON.parse(payload));
    
    const req = http.request(options, (res) => {
      console.log("📊 Response status:", res.statusCode);
      console.log("📊 Response headers:", res.headers);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log("📊 Raw response:", data);
          const response = JSON.parse(data);
          
          console.log("✅ Parsed pricing response:", JSON.stringify(response, null, 2));
          
          if (response.success && response.options) {
            console.log(`🟢 Found ${response.options.length} pricing options:`);
            
            response.options.forEach((option, index) => {
              console.log(`  ${index + 1}. ${option.displayName}`);
              console.log(`     Service: ${option.serviceName || 'N/A'}`);
              console.log(`     Price: $${(option.totalPrice / 100).toFixed(2)}`);
              console.log(`     Delivery: ${option.deliveryTime}`);
              console.log(`     Provider Code: ${option.providerServiceCode || 'N/A'}`);
              console.log(`     Service Type: ${option.serviceType || 'N/A'}`);
              
              // Check if this is a GLS option
              if (option.displayName && option.displayName.includes('GLS')) {
                console.log(`     🎯 GLS SERVICE DETECTED: ${option.displayName}`);
                console.log(`     🎯 GLS Provider Code: ${option.providerServiceCode}`);
                console.log(`     🎯 GLS Service Type: ${option.serviceType}`);
              }
              console.log('');
            });
            
            // Count GLS options
            const glsOptions = response.options.filter(opt => 
              opt.displayName && opt.displayName.includes('GLS')
            );
            console.log(`🎯 Total GLS options found: ${glsOptions.length}`);
            
            if (glsOptions.length > 0) {
              console.log("✅ GLS integration successful!");
              glsOptions.forEach(gls => {
                console.log(`   - ${gls.displayName}: $${(gls.totalPrice / 100).toFixed(2)}`);
              });
            } else {
              console.log("⚠️ No GLS options found in response");
            }
            
          } else {
            console.log("🔴 No pricing options returned or request failed");
            console.log("🔴 Response:", response);
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

// Run the comprehensive test
testGLSPricingCalculation()
  .then(() => {
    console.log("✅ GLS pricing integration test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ GLS pricing integration test failed:", error);
    process.exit(1);
  });