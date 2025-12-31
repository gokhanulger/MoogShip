/**
 * Test script to discover ALL services returned by the pricing API
 * so we can create comprehensive mapping for label purchasing
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

const SHIPENTEGRA_AUTH_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_PRICE_URL = "https://publicapi.shipentegra.com/v1/tools/calculate/all";

async function getAccessToken() {
  const response = await fetch(SHIPENTEGRA_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET }),
  });
  
  const data = await response.json();
  return data.data?.accessToken;
}

async function testPricingForCountry(country, weight) {
  const accessToken = await getAccessToken();
  
  const payload = {
    country: country,
    kgDesi: weight,
    isAmazonShipment: 0,
  };

  try {
    const response = await fetch(SHIPENTEGRA_PRICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const responseData = await response.json();
      
      if (responseData.data?.prices?.length > 0) {
        const services = new Set();
        responseData.data.prices.forEach(price => {
          if (price.serviceType) {
            services.add(price.serviceType);
          }
        });
        
        return Array.from(services);
      }
    }
  } catch (error) {
  }
  
  return [];
}

async function main() {
  const allServices = new Set();
  
  const testCases = [
    { country: "US", weight: 0.5 },
    { country: "US", weight: 1.0 },
    { country: "US", weight: 2.0 },
    { country: "GB", weight: 1.0 },
    { country: "DE", weight: 1.0 },
    { country: "FR", weight: 1.0 },
    { country: "CA", weight: 1.0 },
    { country: "AU", weight: 1.0 },
    { country: "AE", weight: 1.0 },
  ];
  
  for (const testCase of testCases) {
    const services = await testPricingForCountry(testCase.country, testCase.weight);
    services.forEach(service => allServices.add(service));
  }
}

main().catch(() => {});