/**
 * Test script to fetch pricing for 0.1 kg shipment
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

async function getShipentegraAccessToken() {
  const tokenPayload = {
    clientId: SHIPENTEGRA_CONFIG.clientId,
    clientSecret: SHIPENTEGRA_CONFIG.clientSecret
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

async function fetchPricing01kg(accessToken) {
  console.log('Fetching pricing for 0.1 kg to different destinations...\n');

  const destinations = [
    { name: 'United States', code: 'US' },
    { name: 'Germany', code: 'DE' },
    { name: 'United Kingdom', code: 'GB' },
    { name: 'Canada', code: 'CA' },
    { name: 'France', code: 'FR' },
    { name: 'Italy', code: 'IT' }
  ];

  for (const destination of destinations) {
    console.log(`\n📦 0.1 kg to ${destination.name} (${destination.code})`);
    
    const payload = {
      country: destination.code,
      kgDesi: 0.1,
      seCarrier: 'shipentegra-ups-ekspress',
      isAmazonShipment: 0
    };

    try {
      const response = await fetch(`${SHIPENTEGRA_CONFIG.baseUrl}/v1/tools/calculate/all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.data && data.data.prices) {
        console.log(`   Found ${data.data.prices.length} pricing options:`);
        
        data.data.prices.forEach((price, index) => {
          console.log(`   ${index + 1}. ${price.clearServiceName || price.serviceName}`);
          console.log(`      Total: $${price.totalPrice} (Cargo: $${price.cargoPrice} + Fuel: $${price.fuelCost})`);
          console.log(`      Delivery: ${price.additionalDescription?.split('<br>')[0] || 'N/A'}`);
        });

        // Show best option
        const bestPrice = data.data.prices.reduce((min, price) => 
          price.totalPrice < min.totalPrice ? price : min
        );
        console.log(`   🏆 Best: ${bestPrice.clearServiceName} - $${bestPrice.totalPrice}`);
      } else {
        console.log(`   ❌ No pricing available: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`   ❌ Request failed: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 Fetching Shipentegra pricing for 0.1 kg packages\n');
  
  const accessToken = await getShipentegraAccessToken();
  if (!accessToken) {
    console.error('Cannot proceed without access token');
    return;
  }

  await fetchPricing01kg(accessToken);
  
  console.log('\n✅ Pricing fetch completed!');
}

main().catch(console.error);