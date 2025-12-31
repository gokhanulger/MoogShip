/**
 * Test script to demonstrate the comprehensive price calculation debugging system
 * This will trigger all the enhanced debugging logs we've implemented in priceController.ts and shipentegra.ts
 */

import fetch from 'node-fetch';

// Configuration for test
const BASE_URL = 'http://localhost:3000';

// Test user credentials
const TEST_USER = {
  username: 'gulger',
  password: 'asdf'
};

// Test package data
const TEST_PACKAGE = {
  country: 'US',
  packageLength: 20,
  packageWidth: 15,
  packageHeight: 10,
  packageWeight: 1.5,
  pieceCount: 1,
  packageContents: 'Test Product for Debugging',
  customsValue: 50.00,
  includeInsurance: false,
  productItems: [
    {
      name: 'Test Product',
      quantity: 1,
      unitPrice: 50.00,
      hsCode: '940510',
      origin: 'Turkey'
    }
  ]
};

/**
 * Login and get session cookie
 */
async function login() {
  
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(TEST_USER)
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${response.statusText}`);
  }

  // Extract session cookie
  const cookies = response.headers.get('set-cookie');
  
  return cookies;
}

/**
 * Test price calculation with comprehensive debugging
 */
async function testPriceCalculation(cookies) {

  const response = await fetch(`${BASE_URL}/api/calculate-price`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify(TEST_PACKAGE)
  });

  if (!response.ok) {
    const errorText = await response.text();
    return null;
  }

  const priceData = await response.json();
  
  if (priceData.originalBasePrice !== undefined) {
  }
  
  if (priceData.insurance) {
    if (priceData.insurance.available) {
    }
  }
  
  // Verify no double multiplication occurred
  if (priceData.appliedMultiplier && priceData.originalTotalPrice) {
    const expectedTotal = Math.round(priceData.originalTotalPrice * priceData.appliedMultiplier);
    const actualTotal = priceData.totalPrice;
    const isCorrect = expectedTotal === actualTotal;

    
    if (!isCorrect) {
    }
  }

  return priceData;
}

/**
 * Test with different user scenarios
 */
async function testMultipleScenarios() {
  
  try {
    const cookies = await login();
    const regularUserPrice = await testPriceCalculation(cookies);
    
    const lightPackage = { ...TEST_PACKAGE, packageWeight: 0.5 };
    const response2 = await fetch(`${BASE_URL}/api/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(lightPackage)
    });
    
    if (response2.ok) {
      const lightPrice = await response2.json();
    }
    
    const largePackage = { 
      ...TEST_PACKAGE, 
      packageWeight: 1.0,
      packageLength: 50,
      packageWidth: 40,
      packageHeight: 30
    };
    
    const response3 = await fetch(`${BASE_URL}/api/calculate-price`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(largePackage)
    });
    
    if (response3.ok) {
      const largePrice = await response3.json();
      
      const volumetricWeight = (50 * 40 * 30) / 5000;
    }

  } catch (error) {
  }
}

/**
 * Main test execution
 */
async function runDebugTest() {
  
  await testMultipleScenarios();
  
}

runDebugTest().catch(() => {});