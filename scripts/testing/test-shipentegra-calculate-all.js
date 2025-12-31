/**
 * Test script for Shipentegra Calculate All API endpoint
 * Lists all available pricing options from https://publicapi.shipentegra.com/v1/tools/calculate/all
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SHIPENTEGRA_CONFIG = {
  baseUrl: 'https://publicapi.shipentegra.com',
  clientId: process.env.SHIPENTEGRA_CLIENT_ID || 'b55524c23d9f62423c26089ab3526e81',
  clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET || 'ca5f2726e7a141dc24c4ec7cd0b7b7b4'
};

/**
 * Get access token from Shipentegra API
 */
async function getShipentegraAccessToken() {
  console.log('🔑 Getting Shipentegra access token...');
  
  const tokenPayload = {
    clientId: SHIPENTEGRA_CONFIG.clientId,
    clientSecret: SHIPENTEGRA_CONFIG.clientSecret
  };

  try {
    const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(tokenPayload)
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success' && data.data?.accessToken) {
      console.log('✅ Access token obtained successfully');
      return data.data.accessToken;
    } else {
      console.error('❌ Failed to get access token:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    return null;
  }
}

/**
 * Test the Calculate All endpoint with different scenarios
 */
async function testCalculateAllEndpoint(accessToken) {
  console.log('\n📊 Testing Calculate All endpoint...\n');

  // Test scenarios with different destinations and weights
  const testScenarios = [
    {
      name: 'Turkey to US - 1kg',
      payload: {
        country: 'US',
        kgDesi: 1,
        seCarrier: 'shipentegra-ups-ekspress',
        isAmazonShipment: 0
      }
    },
    {
      name: 'Turkey to Germany - 2kg',
      payload: {
        country: 'DE',
        kgDesi: 2,
        seCarrier: 'shipentegra-ups-ekspress',
        isAmazonShipment: 0
      }
    },
    {
      name: 'Turkey to UK - 0.5kg',
      payload: {
        country: 'GB',
        kgDesi: 0.5,
        seCarrier: 'shipentegra-ups-ekspress',
        isAmazonShipment: 0
      }
    },
    {
      name: 'Turkey to Canada - 3kg',
      payload: {
        country: 'CA',
        kgDesi: 3,
        seCarrier: 'shipentegra-ups-ekspress',
        isAmazonShipment: 0
      }
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`\n🌍 Testing: ${scenario.name}`);
    console.log('📦 Payload:', JSON.stringify(scenario.payload, null, 2));

    try {
      const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(scenario.payload)
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Response Status:', response.status);
        console.log('📋 API Response:', JSON.stringify(data, null, 2));
        
        // Parse and display pricing information if available
        if (data.data && data.data.prices && Array.isArray(data.data.prices)) {
          console.log('\n💰 Available Pricing Options:');
          data.data.prices.forEach((price, index) => {
            console.log(`  ${index + 1}. ${price.serviceName || price.serviceType}`);
            console.log(`     - Cargo Price: ${price.cargoPrice}`);
            console.log(`     - Fuel Cost: ${price.fuelCost}`);
            console.log(`     - Total Price: ${price.totalPrice}`);
            if (price.additionalDescription) {
              console.log(`     - Description: ${price.additionalDescription}`);
            }
          });
          
          if (data.data.bestCarrier) {
            console.log(`\n🏆 Best Carrier: ${data.data.bestCarrier}`);
          }
        }
      } else {
        console.log('❌ Response Status:', response.status);
        console.log('❌ Error Response:', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.error('❌ Request Error:', error.message);
    }

    console.log('\n' + '─'.repeat(80));
  }
}

/**
 * Test different carrier options if available
 */
async function testDifferentCarriers(accessToken) {
  console.log('\n🚚 Testing different carrier options...\n');

  const carriers = [
    'shipentegra-ups-ekspress',
    'shipentegra-ups-standard',
    'shipentegra-dhl-ekspress',
    'shipentegra-fedex-ekspress'
  ];

  const basePayload = {
    country: 'US',
    kgDesi: 1,
    isAmazonShipment: 0
  };

  for (const carrier of carriers) {
    console.log(`\n🚛 Testing carrier: ${carrier}`);
    
    const payload = { ...basePayload, seCarrier: carrier };
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.data && data.data.prices) {
        console.log(`✅ ${carrier}: ${data.data.prices.length} pricing options available`);
        
        // Show summary of best price
        const bestPrice = data.data.prices.reduce((min, price) => 
          price.totalPrice < min.totalPrice ? price : min
        );
        console.log(`   💰 Best Price: ${bestPrice.totalPrice} (${bestPrice.serviceName})`);
      } else {
        console.log(`❌ ${carrier}: No pricing data available`);
        if (data.message) {
          console.log(`   📝 Message: ${data.message}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${carrier}: Request failed -`, error.message);
    }
  }
}

/**
 * Main test function
 */
async function runCalculateAllTests() {
  console.log('🚀 Starting Shipentegra Calculate All API Tests\n');
  console.log('🔧 Configuration:');
  console.log(`   Base URL: ${SHIPENTEGRA_CONFIG.baseUrl}`);
  console.log(`   Client ID: ${SHIPENTEGRA_CONFIG.clientId ? 'Set' : 'Not set'}`);
  console.log(`   Client Secret: ${SHIPENTEGRA_CONFIG.clientSecret ? 'Set' : 'Not set'}`);

  // Get access token
  const accessToken = await getShipentegraAccessToken();
  if (!accessToken) {
    console.error('❌ Cannot proceed without access token');
    return;
  }

  // Test the calculate/all endpoint
  await testCalculateAllEndpoint(accessToken);
  
  // Test different carriers
  await testDifferentCarriers(accessToken);
  
  console.log('\n🎉 Calculate All API tests completed!');
}

// Run the tests
runCalculateAllTests().catch(console.error);