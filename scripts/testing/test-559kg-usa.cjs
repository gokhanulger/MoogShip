/**
 * Test script to fetch pricing for 5.59 kg package to USA
 */

// Use global fetch for Node.js 18+
global.fetch = global.fetch || require('node-fetch');

async function getShipentegraAccessToken() {
  // Load environment variables
  require('dotenv').config();
  
  const tokenPayload = {
    clientId: process.env.SHIPENTEGRA_CLIENT_ID,
    clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET,
    grantType: 'client_credentials'
  };

  try {
    const response = await fetch('https://publicapi.shipentegra.com/v1/auth/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenPayload)
    });

    const data = await response.json();
    return data.data?.accessToken;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

async function fetchShipentegraCalculateAll(accessToken) {
  const payload = {
    country: 'US',
    kgDesi: 5.59,
    seCarrier: 'shipentegra-eco,shipentegra-ups-ekspress,shipentegra-widect'
  };

  try {
    const response = await fetch('https://publicapi.shipentegra.com/v1/tools/calculate/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return null;
  }
}

async function test559kgPricing() {
  console.log('=== TESTING 5.59 KG PACKAGE TO USA ===\n');
  
  console.log('Package Details:');
  console.log('- Dimensions: 30 x 30 x 30 cm');
  console.log('- Weight: 5.59 kg');
  console.log('- Destination: US');
  console.log('\n=== FETCHING SHIPENTEGRA ACCESS TOKEN ===\n');
  
  const accessToken = await getShipentegraAccessToken();
  if (!accessToken) {
    console.error('Failed to get access token');
    return;
  }
  
  console.log('Access token obtained successfully');
  console.log('\n=== FETCHING PRICING DATA FROM SHIPENTEGRA ===\n');
  
  const result = await fetchShipentegraCalculateAll(accessToken);
  
  console.log('=== FULL SHIPENTEGRA API RESPONSE ===');
  console.log(JSON.stringify(result, null, 2));
  
  if (result && result.data && result.data.prices) {
    console.log('\n=== SHIPENTEGRA SERVICE BREAKDOWN ===');
    result.data.prices.forEach((price, index) => {
      console.log(`${index + 1}. ${price.serviceName || price.clearServiceName || 'Unknown Service'}`);
      console.log(`   - Service Name: ${price.serviceName}`);
      console.log(`   - Clear Service Name: ${price.clearServiceName}`);
      console.log(`   - Total Price: $${price.totalPrice.toFixed(2)}`);
      console.log(`   - Cargo Price: $${price.cargoPrice.toFixed(2)}`);
      console.log(`   - Fuel Cost: $${price.fuelCost.toFixed(2)}`);
      console.log(`   - Additional Description: ${price.additionalDescription || 'N/A'}`);
      console.log();
    });
    
    console.log('=== PRICE RANKING ===');
    const sortedPrices = [...result.data.prices].sort((a, b) => a.totalPrice - b.totalPrice);
    sortedPrices.forEach((price, index) => {
      console.log(`${index + 1}. ${price.clearServiceName || price.serviceName} - $${price.totalPrice.toFixed(2)}`);
    });
    
    console.log('\n=== MOOGSHIP MAPPING SIMULATION ===');
    sortedPrices.forEach((price, index) => {
      let displayName = price.clearServiceName || price.serviceName || 'Standard Service';
      
      // Apply MoogShip transformations
      if (displayName.toLowerCase().includes('eco') || price.serviceName.toLowerCase().includes('eco')) {
        displayName = 'MoogShip Eco';
      } else if (displayName.toLowerCase().includes('ups') || price.serviceName.toLowerCase().includes('ups')) {
        displayName = 'MoogShip UPS Express';
      } else if (displayName.toLowerCase().includes('widect') || price.serviceName.toLowerCase().includes('widect')) {
        displayName = 'MoogShip Standard';
      }
      
      console.log(`${index + 1}. ${displayName} - $${price.totalPrice.toFixed(2)} (Original: ${price.serviceName})`);
    });
  }
}

test559kgPricing().catch(console.error);