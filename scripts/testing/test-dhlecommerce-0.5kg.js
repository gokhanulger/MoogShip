/**
 * Test script for DHL E-Commerce service pricing
 * Testing 0.5kg package to US using se-dhlecommerce service
 */

import https from 'https';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testDHLECommerce() {
  try {
    console.log('\n📦 Testing DHL E-Commerce (se-dhlecommerce) - 0.5kg to US...\n');
    
    // Payload for ShipEntegra calculate/all API (correct format based on working code)
    const payload = {
      country: "US",
      kgDesi: 0.5,
      seCarrier: "se-dhlecommerce",
      isAmazonShipment: 0
    };
    
    console.log('🚀 Request payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');
    
    // First get access token
    console.log('🔑 Getting ShipEntegra access token...\n');
    
    const tokenPayload = {
      clientId: process.env.SHIPENTEGRA_CLIENT_ID,
      clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET
    };
    
    const tokenOptions = {
      hostname: 'publicapi.shipentegra.com',
      port: 443,
      path: '/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Length': JSON.stringify(tokenPayload).length
      }
    };
    
    const tokenResult = await makeRequest(tokenOptions, JSON.stringify(tokenPayload));
    
    if (tokenResult.statusCode !== 200) {
      console.log('❌ Failed to get access token:', tokenResult.statusCode);
      console.log(tokenResult.body);
      return;
    }
    
    const tokenData = JSON.parse(tokenResult.body);
    if (!tokenData.data || !tokenData.data.accessToken) {
      console.log('❌ No access token in response:', tokenData);
      return;
    }
    
    const accessToken = tokenData.data.accessToken;
    console.log('✅ Access token obtained successfully\n');
    
    // Now make the pricing request with access token using correct endpoint
    const options = {
      hostname: 'publicapi.shipentegra.com',
      port: 443,
      path: '/v1/tools/calculate/all',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Content-Length': JSON.stringify(payload).length
      }
    };
    
    console.log('🌐 API Endpoint: https://publicapi.shipentegra.com/v1/tools/calculate/all');
    console.log('🔑 Service: se-dhlecommerce');
    console.log('📦 Package: 0.5kg to US\n');
    
    const result = await makeRequest(options, JSON.stringify(payload));
    
    console.log('📋 FULL API RESPONSE:');
    console.log('Status Code:', result.statusCode);
    console.log('\nResponse Headers:');
    console.log(JSON.stringify(result.headers, null, 2));
    console.log('\nResponse Body:');
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(result.body);
      console.log(JSON.stringify(parsedBody, null, 2));
      
      // Parse pricing information if available
      if (parsedBody.data && parsedBody.data.pricing) {
        console.log('\n📊 PRICING BREAKDOWN:');
        parsedBody.data.pricing.forEach((option, index) => {
          console.log(`\n${index + 1}. ${option.clearServiceName || option.serviceName}`);
          console.log(`   Service Code: ${option.serviceName}`);
          console.log(`   Service Type: ${option.serviceType}`);
          console.log(`   Cargo Price: $${option.cargoPrice}`);
          console.log(`   Fuel Cost: $${option.fuelCost}`);
          console.log(`   Total Price: $${option.totalPrice}`);
          console.log(`   Fuel Multiplier: ${option.fuelMultiplier}%`);
          if (option.additionalDescription) {
            console.log(`   Description: ${option.additionalDescription.replace(/<br>/g, ' ')}`);
          }
        });
      }
      
    } catch (parseError) {
      console.log(result.body);
      console.log('\n❌ Could not parse response as JSON');
    }
    
  } catch (error) {
    console.error('❌ Error testing DHL E-Commerce:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('Network error: Could not reach ShipEntegra API');
    }
  }
}

// Run the test
testDHLECommerce();