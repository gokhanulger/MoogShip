/**
 * Test script to map all service names to their corresponding carrier codes
 * This will help us create comprehensive mapping for label purchasing
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

async function discoverAllServiceNames() {
  console.log("🔍 Mapping Service Names to Carrier Codes");
  
  const accessToken = await getAccessToken();
  
  // Test with different parameters to get comprehensive service list
  const testCases = [
    { country: "US", weight: 1.0 },
    { country: "GB", weight: 1.0 },
    { country: "DE", weight: 1.0 },
  ];
  
  const serviceMapping = new Map();
  
  for (const testCase of testCases) {
    console.log(`\n📦 Testing ${testCase.country} with ${testCase.weight}kg`);
    
    const payload = {
      country: testCase.country,
      kgDesi: testCase.weight,
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
          responseData.data.prices.forEach(price => {
            // Extract service name and try to map to carrier code
            const serviceName = price.clearServiceName;
            const serviceType = price.serviceType;
            
            // Try to identify the carrier code from the service name
            let carrierCode = 'unknown';
            
            if (serviceName.toLowerCase().includes('eco') && !serviceName.toLowerCase().includes('amerika') && !serviceName.toLowerCase().includes('plus')) {
              carrierCode = 'shipentegra-eco';
            } else if (serviceName.toLowerCase().includes('ups express')) {
              carrierCode = 'shipentegra-ups-ekspress';
            } else if (serviceName.toLowerCase().includes('ups') && serviceName.toLowerCase().includes('standard')) {
              carrierCode = 'shipentegra-ups-standart';
            } else if (serviceName.toLowerCase().includes('express') && !serviceName.toLowerCase().includes('ups') && !serviceName.toLowerCase().includes('international') && !serviceName.toLowerCase().includes('amerika') && !serviceName.toLowerCase().includes('plus')) {
              carrierCode = 'shipentegra-express';
            } else if (serviceName.toLowerCase().includes('widect')) {
              carrierCode = 'shipentegra-widect';
            } else if (serviceName.toLowerCase().includes('amerika') && serviceName.toLowerCase().includes('eko')) {
              carrierCode = 'shipentegra-amerika-eko-plus';
            } else if (serviceName.toLowerCase().includes('international express')) {
              carrierCode = 'shipentegra-international-express';
            } else if (serviceName.toLowerCase().includes('worldwide standard')) {
              carrierCode = 'shipentegra-worldwide-standard';
            } else if (serviceName.toLowerCase().includes('ingiltere') && serviceName.toLowerCase().includes('eko')) {
              carrierCode = 'shipentegra-ingiltere-eko-plus';
            }
            
            serviceMapping.set(serviceName, {
              carrierCode,
              serviceType,
              price: price.totalPrice
            });
            
            console.log(`  ${serviceName} (${serviceType}) → ${carrierCode} - $${price.totalPrice}`);
          });
        }
      }
    } catch (error) {
      console.log(`Error testing ${testCase.country}: ${error.message}`);
    }
  }
  
  console.log("\n🎯 COMPLETE SERVICE NAME → CARRIER CODE MAPPING:");
  console.log("=".repeat(60));
  
  const sortedServices = Array.from(serviceMapping.entries()).sort();
  sortedServices.forEach(([serviceName, data]) => {
    console.log(`"${serviceName}" → "${data.carrierCode}"`);
  });
  
  console.log(`\n📊 Total services mapped: ${serviceMapping.size}`);
  
  // Generate mapping function code
  console.log("\n🔧 SUGGESTED MAPPING FUNCTION:");
  console.log("=".repeat(40));
  console.log(`
function mapServiceNameToCarrier(serviceName: string): string {
  const nameLower = serviceName.toLowerCase();
  
  // Map based on service name patterns`);
  
  sortedServices.forEach(([serviceName, data]) => {
    if (data.carrierCode !== 'unknown') {
      const key = serviceName.toLowerCase();
      console.log(`  if (nameLower.includes('${key}')) return '${data.carrierCode}';`);
    }
  });
  
  console.log(`  
  // Default fallback
  return 'shipentegra-ups-ekspress';
}`);
}

discoverAllServiceNames().catch(console.error);