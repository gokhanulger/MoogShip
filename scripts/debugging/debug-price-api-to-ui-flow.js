/**
 * Comprehensive debugging script for price API to UI flow
 * This traces the complete workflow from frontend price calculation through backend processing to UI display
 */

import https from 'https';
import http from 'http';
import querystring from 'querystring';

// Test payload to simulate a frontend price calculation request
const testPriceRequest = {
  packageLength: 30,
  packageWidth: 20,
  packageHeight: 15,
  packageWeight: 2.5,
  serviceLevel: "standard",  // Fixed: lowercase as required by API
  receiverCountry: "US",
  senderPostalCode: "34384",
  senderCity: "Istanbul",
  receiverPostalCode: "10001",
  receiverCity: "New York",
  pieceCount: 1
};

// Configuration
const HOST = 'localhost';
const PORT = 5000;
const PROTOCOL = 'http';

async function debugPriceFlow() {
  try {
    
    // Make the API request
    const response = await makeRequest({
      hostname: HOST,
      port: PORT,
      path: '/api/calculate-price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, JSON.stringify(testPriceRequest));
    

    if (response.statusCode === 200) {
      const responseData = JSON.parse(response.body);
      
      if (responseData.originalTotalPrice && responseData.appliedMultiplier) {
        const expectedCustomerPrice = Math.round(responseData.originalTotalPrice * responseData.appliedMultiplier);
        const actualCustomerPrice = responseData.totalPrice;
        const isCorrect = expectedCustomerPrice === actualCustomerPrice;
      }
      
      if (responseData.originalTotalPrice) {
      }
      
      const shipmentData = {
        ...testPriceRequest,
        basePrice: responseData.basePrice,
        fuelCharge: responseData.fuelCharge,
        totalPrice: responseData.totalPrice,
        originalBasePrice: responseData.originalBasePrice,
        originalFuelCharge: responseData.originalFuelCharge,
        originalTotalPrice: responseData.originalTotalPrice,
        appliedMultiplier: responseData.appliedMultiplier,
        status: 'PENDING',
        currency: responseData.currency || 'USD',
        pieceCount: responseData.pieceCount || 1
      };
      
      const priceAlreadyMultiplied = shipmentData.appliedMultiplier !== undefined && shipmentData.appliedMultiplier > 1;
      
    } else {
      try {
        const errorData = JSON.parse(response.body);
      } catch (parseError) {
      }
    }
    
  } catch (error) {
  }
  

}

// Helper function to make HTTP requests
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const protocol = PROTOCOL === 'https' ? https : http;
    
    const req = protocol.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// Additional debugging function to test UI price display logic
function debugUIDisplayLogic(priceData) {
  const serviceLevel = priceData.serviceLevel || 'STANDARD';
  const isExpress = serviceLevel.toLowerCase().includes('express');
  const isEco = serviceLevel.toLowerCase().includes('eco');
  const isStandard = serviceLevel.toLowerCase().includes('standard');
  
  let badgeColor = 'blue'; // default
  if (isEco) badgeColor = 'green';
  else if (isExpress) badgeColor = 'yellow';
  else if (isStandard) badgeColor = 'blue';
  
  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(priceData.totalPrice / 100);
  
  // Simulate delivery time display
  const deliveryDays = priceData.estimatedDeliveryDays || 
    (isExpress ? '1-3' : isEco ? '7-14' : '5-7');
  
}

debugPriceFlow().then(() => {
}).catch((error) => {
});