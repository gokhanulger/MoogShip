/**
 * Test script specifically for 1kg package to Shipentegra
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

async function test1kg() {
  console.log("📦 Testing 1kg package to USA...\n");
  
  const accessToken = await getAccessToken();
  
  const payload = {
    country: "US",
    kgDesi: 1.0,
    seCarrier: "shipentegra-ups-ekspress",
    isAmazonShipment: 0,
  };

  console.log("Request payload:", JSON.stringify(payload, null, 2));

  const response = await fetch(SHIPENTEGRA_PRICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();
  console.log("\n✅ 1kg API Response:");
  console.log(JSON.stringify(responseData, null, 2));

  if (responseData.data?.prices) {
    console.log("\n💰 1kg Pricing Summary:");
    responseData.data.prices.slice(0, 5).forEach((price, index) => {
      console.log(`${index + 1}. ${price.clearServiceName}: $${price.totalPrice} (${price.serviceType})`);
    });
  }
}

test1kg().catch(console.error);