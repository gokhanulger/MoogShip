/**
 * Test script for Shipentegra pricing API with authentication
 * Uses the existing credentials to get access token and test pricing endpoints
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Shipentegra API configuration
const SHIPENTEGRA_CONFIG = {
  baseUrl: 'https://publicapi.shipentegra.com',
  clientId: process.env.SHIPENTEGRA_CLIENT_ID || 'b55524c23d9f62423c26089ab3526e81',
  clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET || 'ca5f2726e7a141dc24c4ec7cd0b7b7b4'
};

async function getShipentegraAccessToken() {
  console.log('Getting Shipentegra access token...');
  
  const tokenPayload = {
    clientId: SHIPENTEGRA_CONFIG.clientId,
    clientSecret: SHIPENTEGRA_CONFIG.clientSecret,
    grantType: 'client_credentials'
  };

  try {
    const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(tokenPayload)
    });

    const data = await response.json();
    
    if (response.ok && data.status === 'success' && data.data?.accessToken) {
      console.log('✓ Access token obtained successfully');
      return data.data.accessToken;
    } else {
      console.error('Failed to get access token:', data);
      return null;
    }
  } catch (error) {
    console.error('Error getting access token:', error.message);
    return null;
  }
}

async function testShipentegraCalculateAllAuth(accessToken) {
  console.log('\nTesting authenticated Shipentegra Calculate All API...\n');

  // Test data for pricing calculation
  const testData = {
    kgDesi: 2.5,
    country: 'US',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    packageQuantity: 1,
    reference1: 'TEST-PKG-001',
    description: 'Test Package for Pricing',
    value: 100,
    currency: 'USD'
  };

  try {
    const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(testData)
    });

    console.log('Response Status:', response.status);
    const responseText = await response.text();
    
    console.log('\nRaw Response:');
    console.log(responseText);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const jsonData = JSON.parse(responseText);
        console.log('\nParsed JSON Response:');
        console.log(JSON.stringify(jsonData, null, 2));
        
        // Display pricing information if available
        if (jsonData.status === 'success' && jsonData.data) {
          console.log('\n=== SHIPENTEGRA PRICING OPTIONS ===');
          
          const services = jsonData.data;
          
          if (Array.isArray(services)) {
            services.forEach((service, index) => {
              console.log(`\n${index + 1}. ${service.carrierName || service.serviceName || 'Unknown Service'}`);
              console.log(`   Service Code: ${service.serviceCode || 'N/A'}`);
              console.log(`   Price: ${service.price || service.cost || 'N/A'} ${service.currency || 'USD'}`);
              console.log(`   Transit Time: ${service.transitTime || service.deliveryTime || 'N/A'}`);
              console.log(`   Description: ${service.description || service.serviceDescription || 'N/A'}`);
              
              if (service.features) {
                console.log(`   Features: ${JSON.stringify(service.features)}`);
              }
            });
          } else {
            console.log('Response data:', services);
          }
        } else if (jsonData.status === 'fail') {
          console.log('\n❌ API Error:');
          if (jsonData.data && Array.isArray(jsonData.data)) {
            jsonData.data.forEach(error => {
              console.log(`   ${error.message}: ${error.description}`);
            });
          }
        }
        
      } catch (parseError) {
        console.log('\nFailed to parse as JSON:', parseError.message);
      }
    }

  } catch (error) {
    console.error('Error testing authenticated API:', error.message);
  }
}

// Test with different weight categories
async function testMultipleWeights(accessToken) {
  console.log('\n\n=== Testing Multiple Weight Categories ===\n');
  
  const testWeights = [0.5, 1.0, 2.0, 5.0, 10.0];
  const destinations = [
    { country: 'US', city: 'New York', state: 'NY', postalCode: '10001' },
    { country: 'GB', city: 'London', postalCode: 'SW1A 1AA' },
    { country: 'DE', city: 'Berlin', postalCode: '10115' },
    { country: 'FR', city: 'Paris', postalCode: '75001' }
  ];

  for (const destination of destinations) {
    console.log(`\n--- Pricing to ${destination.city}, ${destination.country} ---`);
    
    for (const weight of testWeights) {
      const testData = {
        kgDesi: weight,
        country: destination.country,
        city: destination.city,
        state: destination.state,
        postalCode: destination.postalCode,
        packageQuantity: 1,
        description: `Test package ${weight}kg`,
        value: 50,
        currency: 'USD'
      };

      try {
        const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(testData)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.data && data.data.length > 0) {
            const cheapest = data.data.reduce((min, service) => 
              (service.price || 999999) < (min.price || 999999) ? service : min
            );
            console.log(`  ${weight}kg: From $${cheapest.price || 'N/A'} (${cheapest.carrierName || cheapest.serviceName})`);
          } else {
            console.log(`  ${weight}kg: No pricing available`);
          }
        } else {
          console.log(`  ${weight}kg: API error (${response.status})`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.log(`  ${weight}kg: Error - ${error.message}`);
      }
    }
  }
}

// Main execution
async function runShipentegraTests() {
  console.log('🚚 Shipentegra Pricing API Test\n');
  console.log('Configuration:');
  console.log(`  Base URL: ${SHIPENTEGRA_CONFIG.baseUrl}`);
  console.log(`  Client ID: ${SHIPENTEGRA_CONFIG.clientId}`);
  console.log(`  Client Secret: ${SHIPENTEGRA_CONFIG.clientSecret ? '***' + SHIPENTEGRA_CONFIG.clientSecret.slice(-4) : 'Not set'}`);
  console.log('');

  // Get access token
  const accessToken = await getShipentegraAccessToken();
  
  if (!accessToken) {
    console.error('❌ Cannot proceed without access token');
    return;
  }

  // Test basic pricing API
  await testShipentegraCalculateAllAuth(accessToken);
  
  // Test multiple scenarios
  await testMultipleWeights(accessToken);
  
  console.log('\n✅ Shipentegra pricing tests completed');
}

runShipentegraTests().catch(console.error);