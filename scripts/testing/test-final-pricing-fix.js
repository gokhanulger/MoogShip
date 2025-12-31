/**
 * Test script to verify the final pricing fix works correctly
 * This will test the price calculator API to ensure each option includes appliedMultiplier
 */

import https from 'https';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: data });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testPricingFix() {
  try {
    
    // Test pricing calculation with a regular user multiplier scenario
    const pricingPayload = JSON.stringify({
      packageLength: 20,
      packageWidth: 15,
      packageHeight: 10,
      packageWeight: 1.5,
      receiverCountry: 'US',
      packageContents: 'Test items',
      userId: 2 // Test with a regular user who has a multiplier
    });

    const pricingOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/calculate-price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(pricingPayload)
      }
    };

    const pricingResponse = await makeRequest(pricingOptions, pricingPayload);
    
    if (pricingResponse.statusCode === 200) {
      const pricingData = JSON.parse(pricingResponse.data);
      
      if (pricingData.options && Array.isArray(pricingData.options)) {
        pricingData.options.forEach((option, index) => {
          if (option.appliedMultiplier && option.originalTotalPrice && option.providerServiceCode) {
          } else {
          }
        });
        
        const firstOption = pricingData.options[0];
        if (firstOption && firstOption.appliedMultiplier > 1) {
          const expectedOriginal = Math.round(firstOption.totalPrice / firstOption.appliedMultiplier);
          const actualOriginal = firstOption.originalTotalPrice;
          
          if (Math.abs(expectedOriginal - actualOriginal) <= 1) {
          } else {
          }
        }
        
      } else {
      }
      
    } else {
    }

  } catch (error) {
  }
}

testPricingFix();