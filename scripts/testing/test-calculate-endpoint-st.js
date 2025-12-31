/**
 * Test script for /v1/tools/calculate endpoint with ST country and 0.01kg
 * Testing specific payload for se-dhlecommerce service
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

async function testCalculateEndpoint() {
  try {
    console.log('\n📦 Testing /v1/tools/calculate endpoint...\n');
    
    // Test both payloads
    const payloads = [
      {
        "country": "US",
        "kgDesi": 0.44,
        "seCarrier": "shipentegra-widect",
        "isAmazonShipment": 0
      },
      {
        "country": "US",
        "kgDesi": 0.5,
        "seCarrier": "shipentegra-widect",
        "isAmazonShipment": 0
      }
    ];
    
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
    
    // Test both payloads
    for (let i = 0; i < payloads.length; i++) {
      const payload = payloads[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`TEST ${i + 1}: ${payload.kgDesi}kg with ${payload.seCarrier}`);
      console.log(`${'='.repeat(60)}`);
      
      console.log('🚀 Request payload:');
      console.log(JSON.stringify(payload, null, 2));
      console.log('\n');
      
      const options = {
        hostname: 'publicapi.shipentegra.com',
        port: 443,
        path: '/v1/tools/calculate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Content-Length': JSON.stringify(payload).length
        }
      };
      
      console.log('🌐 API Endpoint: https://publicapi.shipentegra.com/v1/tools/calculate');
      console.log(`🔑 Service: ${payload.seCarrier}`);
      console.log(`📦 Package: ${payload.kgDesi}kg to US\n`);
      
      const result = await makeRequest(options, JSON.stringify(payload));
      
      console.log('📋 FULL API RESPONSE:');
      console.log('Status Code:', result.statusCode);
      console.log('\nResponse Body:');
      
      let parsedBody;
      try {
        parsedBody = JSON.parse(result.body);
        console.log(JSON.stringify(parsedBody, null, 2));
        
        // Parse pricing information if available
        if (parsedBody.data) {
          console.log('\n📊 PRICING SUMMARY:');
          if (parsedBody.data.price !== undefined) {
            console.log(`   Cargo Price: $${parsedBody.data.price}`);
            console.log(`   Fuel Cost: $${parsedBody.data.fuel}`);
            console.log(`   Total Price: $${(parsedBody.data.price + parsedBody.data.fuel).toFixed(2)}`);
            console.log(`   Pricing Code: ${parsedBody.data.pricing}`);
            console.log(`   Unique Code: ${parsedBody.data.uniqueCode}`);
          }
        }
        
      } catch (parseError) {
        console.log(result.body);
        console.log('\n❌ Could not parse response as JSON');
      }
    }
    
    // Summary comparison
    console.log(`\n${'='.repeat(60)}`);
    console.log('COMPARISON SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log('This test compares shipentegra-eco pricing between 0.44kg and 0.5kg');
    console.log('to identify weight-based pricing tiers for eco services.');
    
  } catch (error) {
    console.error('❌ Error testing calculate endpoint:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('Network error: Could not reach ShipEntegra API');
    }
  }
}

// Run the test
testCalculateEndpoint();