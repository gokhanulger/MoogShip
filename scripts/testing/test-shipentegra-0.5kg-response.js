/**
 * Test ShipEntegra API response for 0.5kg package to capture full response details
 */

import fetch from 'node-fetch';

async function testShipentegra05kgResponse() {
  try {
    console.log('=== Testing ShipEntegra 0.5kg Package Response ===\n');
    
    // Get access token first
    console.log('🔑 Getting ShipEntegra access token...');
    
    const authPayload = {
      clientId: process.env.SHIPENTEGRA_CLIENT_ID,
      clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET
    };
    
    const authResponse = await fetch('https://publicapi.shipentegra.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(authPayload)
    });
    
    if (!authResponse.ok) {
      throw new Error(`Auth failed: ${authResponse.status} - ${await authResponse.text()}`);
    }
    
    const authData = await authResponse.json();
    console.log('✅ Authentication successful');
    console.log('📋 Auth Response:', JSON.stringify(authData, null, 2));
    
    const accessToken = authData.data?.accessToken;
    if (!accessToken) {
      throw new Error('No access token received');
    }
    
    // Test 0.5kg package pricing
    console.log('\n📦 Testing 0.5kg package pricing to USA...');
    
    const pricingPayload = {
      country: 'US',
      kgDesi: 0.5,
      seCarrier: 'ALL'
    };
    
    console.log('📤 Pricing Request Payload:', JSON.stringify(pricingPayload, null, 2));
    
    const pricingResponse = await fetch('https://publicapi.shipentegra.com/v1/tools/calculate/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(pricingPayload)
    });
    
    console.log(`\n📡 Response Status: ${pricingResponse.status} ${pricingResponse.statusText}`);
    console.log('📋 Response Headers:');
    for (const [key, value] of pricingResponse.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    if (!pricingResponse.ok) {
      const errorText = await pricingResponse.text();
      console.log('❌ Error Response Body:', errorText);
      throw new Error(`Pricing request failed: ${pricingResponse.status} - ${errorText}`);
    }
    
    const responseData = await pricingResponse.json();
    
    console.log('\n🎯 FULL SHIPENTEGRA API RESPONSE:');
    console.log('================================================');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('================================================');
    
    // Analysis
    console.log('\n📊 Response Analysis:');
    console.log(`📋 Status: ${responseData.status}`);
    console.log(`⏰ Time: ${responseData.time}`);
    console.log(`🔢 Code: ${responseData.code}`);
    
    if (responseData.data?.prices) {
      console.log(`📦 Number of pricing options: ${responseData.data.prices.length}`);
      console.log('\n💰 Available Services:');
      
      responseData.data.prices.forEach((price, index) => {
        console.log(`\n   ${index + 1}. ${price.serviceName} (${price.serviceType})`);
        console.log(`      💵 Cargo Price: $${(price.cargoPrice / 100).toFixed(2)}`);
        console.log(`      ⛽ Fuel Cost: $${(price.fuelCost / 100).toFixed(2)}`);
        console.log(`      💲 Total: $${(price.totalPrice / 100).toFixed(2)}`);
        if (price.clearServiceName) {
          console.log(`      🏷️ Clear Name: ${price.clearServiceName}`);
        }
        if (price.additionalDescription) {
          console.log(`      📝 Description: ${price.additionalDescription}`);
        }
      });
    }
    
    if (responseData.data?.bestCarrier) {
      console.log(`\n🏆 Best Carrier: ${responseData.data.bestCarrier}`);
    }
    
    if (responseData.data?.generalInfo) {
      console.log(`\n📝 General Info: ${responseData.data.generalInfo}`);
    }
    
    if (responseData.data?.uniqueCode) {
      console.log(`\n🔑 Unique Code: ${responseData.data.uniqueCode}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing ShipEntegra 0.5kg response:', error);
  }
}

// Run the test
testShipentegra05kgResponse().catch(console.error);