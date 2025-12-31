/**
 * Test script for Shipentegra pricing API
 * Tests the /v1/tools/calculate/all endpoint to see available pricing options
 */

import fetch from 'node-fetch';

async function testShipentegraCalculateAll() {

  // Sample package data for testing - using Shipentegra format
  const testData = {
    // Required fields based on error
    kgDesi: 2.5, // Weight in kg or volumetric weight
    country: 'US', // Destination country
    
    // Package dimensions
    width: 30,
    height: 20,
    length: 40,
    weight: 2.5,
    
    // Origin details
    fromCountry: 'TR',
    fromCity: 'Istanbul',
    fromPostalCode: '34000',
    
    // Destination details
    toCountry: 'US',
    toCity: 'New York',
    toState: 'NY',
    toPostalCode: '10001',
    
    // Package details
    description: 'Sample Package',
    value: 100,
    currency: 'USD'
  };

  try {
    const response = await fetch('https://publicapi.shipentegra.com/v1/tools/calculate/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });

    const responseText = await response.text();
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const jsonData = JSON.parse(responseText);
        
        if (jsonData.rates || jsonData.prices || jsonData.services) {
          const rates = jsonData.rates || jsonData.prices || jsonData.services || jsonData.data;
          
          if (Array.isArray(rates)) {
            rates.forEach((rate, index) => {
            });
          }
        }
        
      } catch (parseError) {
      }
    }

  } catch (error) {
  }
}

async function testWithMinimalData() {
  const minimalData = {
    kgDesi: 1,
    country: 'US'
  };

  try {
    const response = await fetch('https://publicapi.shipentegra.com/v1/tools/calculate/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(minimalData)
    });

    const responseText = await response.text();

  } catch (error) {
  }
}

async function runTests() {
  await testShipentegraCalculateAll();
  await testWithMinimalData();
}

runTests().catch(() => {});