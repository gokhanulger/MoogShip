/**
 * Test script to get full API response for 0.43kg package to US
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
        try {
          const parsed = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function test043kgUSPricing() {
  try {
    console.log('\n📦 Testing 0.43kg package pricing to US...\n');
    
    const payload = {
      packageLength: 56,
      packageWidth: 8,
      packageHeight: 4,
      packageWeight: 0.43,
      receiverCountry: "US"
    };
    
    const options = {
      hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
      port: 443,
      path: '/api/pricing/moogship-options-public',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(payload).length
      }
    };
    
    console.log('🚀 Request payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');
    
    const response = await makeRequest(options, JSON.stringify(payload));
    
    console.log('📋 FULL API RESPONSE:');
    console.log('Status Code:', response.statusCode);
    console.log('\nResponse Body:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.options) {
      console.log('\n📊 PARSED PRICING OPTIONS:');
      response.data.options.forEach((option, index) => {
        console.log(`\n${index + 1}. ${option.displayName}`);
        console.log(`   Service Code: ${option.serviceName || option.providerServiceCode}`);
        console.log(`   Total Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   Cargo Price: $${(option.cargoPrice / 100).toFixed(2)}`);
        console.log(`   Fuel Cost: $${(option.fuelCost / 100).toFixed(2)}`);
        console.log(`   Delivery Time: ${option.deliveryTime}`);
        console.log(`   Service Type: ${option.serviceType}`);
        if (option.appliedMultiplier) {
          console.log(`   Applied Multiplier: ${option.appliedMultiplier}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing pricing:', error.message);
  }
}

// Run the test
test043kgUSPricing();