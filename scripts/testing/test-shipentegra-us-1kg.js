/**
 * Test script for Shipentegra pricing API - 1kg to US
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const SHIPENTEGRA_CONFIG = {
  baseUrl: 'https://publicapi.shipentegra.com',
  clientId: process.env.SHIPENTEGRA_CLIENT_ID || 'b55524c23d9f62423c26089ab3526e81',
  clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET || 'ca5f2726e7a141dc24c4ec7cd0b7b7b4'
};

async function getAccessToken() {
  const tokenPayload = {
    clientId: SHIPENTEGRA_CONFIG.clientId,
    clientSecret: SHIPENTEGRA_CONFIG.clientSecret,
    grantType: 'client_credentials'
  };

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
    return data.data.accessToken;
  }
  throw new Error(`Failed to get token: ${JSON.stringify(data)}`);
}

async function testPricing() {
  console.log('🚚 Testing Shipentegra: 1kg to US\n');
  
  try {
    // Get access token
    console.log('Getting access token...');
    const accessToken = await getAccessToken();
    console.log('✓ Token obtained\n');
    
    // Test data: 1kg to US
    const testData = {
      kgDesi: 1,
      country: 'US'
    };
    
    console.log('Test parameters:');
    console.log(JSON.stringify(testData, null, 2));
    console.log('');
    
    // Generate curl command
    const curlCommand = `curl -X POST "${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json" \\
  -H "Authorization: Bearer ${accessToken}" \\
  -d '${JSON.stringify(testData)}'`;
    
    console.log('Equivalent curl command:');
    console.log(curlCommand);
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Make API call
    console.log('Making API request...');
    const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(testData)
    });

    console.log(`Response Status: ${response.status}`);
    console.log(`Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('\nRaw Response:');
    console.log(responseText);
    
    // Try to parse JSON
    try {
      const jsonData = JSON.parse(responseText);
      console.log('\nFormatted Response:');
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.status === 'success' && jsonData.data) {
        console.log('\n📦 PRICING RESULTS:');
        jsonData.data.forEach((service, index) => {
          console.log(`${index + 1}. ${service.carrierName || service.serviceName}`);
          console.log(`   Price: ${service.price} ${service.currency || 'USD'}`);
          console.log(`   Transit: ${service.transitTime || 'N/A'}`);
        });
      } else if (jsonData.status === 'fail') {
        console.log('\n❌ API Error:');
        if (jsonData.data) {
          jsonData.data.forEach(error => {
            console.log(`   ${error.message}: ${error.description}`);
          });
        }
      }
    } catch (parseError) {
      console.log('\nCould not parse as JSON');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPricing();