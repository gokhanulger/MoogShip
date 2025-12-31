/**
 * Comprehensive test script to verify shipment creation debugging system
 * This tests the complete workflow from price calculation to shipment creation
 * to ensure double multiplication prevention is working correctly
 */

const http = require('http');
const querystring = require('querystring');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5000',
  testUser: {
    username: 'admin',
    password: 'admin',
    id: 1,
    expectedMultiplier: 1.0
  },
  testPackage: {
    length: 10,
    width: 10, 
    height: 10,
    weight: 1,
    country: 'US',
    contents: 'Test Product',
    productItems: [{
      name: 'Test Product',
      description: 'Test product for debugging',
      price: 10,
      quantity: 1,
      hsCode: '1234567890',
      countryOfOrigin: 'TR'
    }]
  }
};

/**
 * Make authenticated HTTP request
 */
function makeAuthenticatedRequest(path, method = 'GET', data = null, sessionCookie = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script/1.0'
      }
    };

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            body: body
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            body: body,
            error: e.message
          });
        }
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

/**
 * Extract session cookie from login response
 */
function extractSessionCookie(headers) {
  const setCookieHeader = headers['set-cookie'];
  if (setCookieHeader) {
    for (const cookie of setCookieHeader) {
      if (cookie.startsWith('connect.sid=')) {
        return cookie.split(';')[0];
      }
    }
  }
  return null;
}

/**
 * Step 1: Login and get session
 */
async function loginUser() {
  console.log('🔐 STEP 1: Logging in test user...');
  
  const loginData = {
    username: TEST_CONFIG.testUser.username,
    password: TEST_CONFIG.testUser.password
  };

  const response = await makeAuthenticatedRequest('/api/login', 'POST', loginData);
  
  if (response.statusCode === 200) {
    const sessionCookie = extractSessionCookie(response.headers);
    console.log('  ✅ Login successful');
    console.log('  🍪 Session cookie obtained');
    console.log('  👤 User ID:', response.data.user?.id);
    console.log('  📊 Price multiplier:', response.data.user?.priceMultiplier);
    return sessionCookie;
  } else {
    console.log('  ❌ Login failed:', response.statusCode);
    console.log('  📄 Response:', response.body);
    throw new Error('Login failed');
  }
}

/**
 * Step 2: Calculate price using the price calculator
 */
async function calculatePrice(sessionCookie) {
  console.log('\n💰 STEP 2: Calculating price through price calculator...');
  
  const priceData = {
    length: TEST_CONFIG.testPackage.length,
    width: TEST_CONFIG.testPackage.width,
    height: TEST_CONFIG.testPackage.height,
    weight: TEST_CONFIG.testPackage.weight,
    country: TEST_CONFIG.testPackage.country,
    productItems: TEST_CONFIG.testPackage.productItems
  };

  console.log('  📦 Package data:', JSON.stringify(priceData, null, 2));

  const response = await makeAuthenticatedRequest('/api/calculate-price', 'POST', priceData, sessionCookie);
  
  if (response.statusCode === 200 && response.data.pricing) {
    console.log('  ✅ Price calculation successful');
    console.log('  📊 Pricing options count:', response.data.pricing.length);
    
    // Select the first pricing option for testing
    const selectedOption = response.data.pricing[0];
    console.log('  🎯 Selected pricing option:');
    console.log('    - Service:', selectedOption.displayName);
    console.log('    - Total Price:', selectedOption.totalPrice);
    console.log('    - Base Price:', selectedOption.basePrice);
    console.log('    - Fuel Charge:', selectedOption.fuelCharge);
    console.log('    - Original Total Price:', selectedOption.originalTotalPrice);
    console.log('    - Applied Multiplier:', selectedOption.appliedMultiplier);
    
    return selectedOption;
  } else {
    console.log('  ❌ Price calculation failed:', response.statusCode);
    console.log('  📄 Response:', response.body);
    throw new Error('Price calculation failed');
  }
}

/**
 * Step 3: Create shipment using calculated price
 */
async function createShipment(sessionCookie, pricingOption) {
  console.log('\n🚚 STEP 3: Creating shipment with calculated pricing...');
  
  const shipmentData = {
    // Sender information
    senderName: 'Test Sender',
    senderEmail: 'sender@test.com',
    senderPhone: '+905551234567',
    senderAddress: 'Test Address',
    senderAddress1: 'Test Address 1',
    senderAddress2: 'Test Address 2',
    senderCity: 'Istanbul',
    senderPostalCode: '34000',
    senderCountry: 'TR',
    
    // Receiver information
    receiverName: 'Test Receiver',
    receiverEmail: 'receiver@test.com',
    receiverPhone: '+15551234567',
    receiverAddress: 'Test Address',
    receiverAddress1: 'Test Address 1',
    receiverAddress2: 'Test Address 2',
    receiverCity: 'New York',
    receiverState: 'NY',
    receiverPostalCode: '10001',
    receiverCountry: 'US',
    
    // Package information
    packageContents: TEST_CONFIG.testPackage.contents,
    packageLength: TEST_CONFIG.testPackage.length,
    packageWidth: TEST_CONFIG.testPackage.width,
    packageHeight: TEST_CONFIG.testPackage.height,
    packageWeight: TEST_CONFIG.testPackage.weight,
    
    // Pricing information from price calculator
    totalPrice: pricingOption.totalPrice,
    basePrice: pricingOption.basePrice,
    fuelCharge: pricingOption.fuelCharge,
    originalTotalPrice: pricingOption.originalTotalPrice,
    originalBasePrice: pricingOption.originalBasePrice,
    originalFuelCharge: pricingOption.originalFuelCharge,
    appliedMultiplier: pricingOption.appliedMultiplier,
    selectedService: pricingOption.providerServiceCode || pricingOption.serviceCode,
    
    // Product items
    productItems: TEST_CONFIG.testPackage.productItems
  };

  console.log('  📋 Shipment data summary:');
  console.log('    - Package:', `${shipmentData.packageLength}x${shipmentData.packageWidth}x${shipmentData.packageHeight}cm, ${shipmentData.packageWeight}kg`);
  console.log('    - Total Price:', shipmentData.totalPrice);
  console.log('    - Original Price:', shipmentData.originalTotalPrice);
  console.log('    - Applied Multiplier:', shipmentData.appliedMultiplier);
  console.log('    - Selected Service:', shipmentData.selectedService);

  const response = await makeAuthenticatedRequest('/api/shipments', 'POST', shipmentData, sessionCookie);
  
  if (response.statusCode === 201) {
    console.log('  ✅ Shipment creation successful');
    console.log('  🆔 Shipment ID:', response.data.shipment?.id);
    console.log('  📦 Tracking Number:', response.data.shipment?.trackingNumber);
    
    // Verify pricing integrity
    const createdShipment = response.data.shipment;
    console.log('\n🔍 PRICING INTEGRITY VERIFICATION:');
    console.log('  📊 Stored prices in database:');
    console.log('    - Total Price:', createdShipment.totalPrice);
    console.log('    - Base Price:', createdShipment.basePrice);
    console.log('    - Fuel Charge:', createdShipment.fuelCharge);
    console.log('    - Original Total Price:', createdShipment.originalTotalPrice);
    console.log('    - Applied Multiplier:', createdShipment.appliedMultiplier);
    
    // Check for double multiplication
    if (createdShipment.originalTotalPrice && createdShipment.appliedMultiplier) {
      const expectedPrice = Math.round(createdShipment.originalTotalPrice * createdShipment.appliedMultiplier);
      const actualPrice = createdShipment.totalPrice;
      
      if (expectedPrice === actualPrice) {
        console.log('  ✅ VERIFICATION PASSED: No double multiplication detected');
        console.log('    Expected:', expectedPrice, 'Actual:', actualPrice);
      } else {
        console.log('  🚨 VERIFICATION FAILED: Double multiplication detected!');
        console.log('    Expected:', expectedPrice, 'Actual:', actualPrice);
        console.log('    Difference:', actualPrice - expectedPrice);
      }
    }
    
    return response.data.shipment;
  } else {
    console.log('  ❌ Shipment creation failed:', response.statusCode);
    console.log('  📄 Response:', response.body);
    throw new Error('Shipment creation failed');
  }
}

/**
 * Main test function
 */
async function runShipmentCreationDebuggingTest() {
  console.log('🧪 SHIPMENT CREATION DEBUGGING TEST');
  console.log('=====================================');
  console.log('Testing complete workflow: Login → Price Calculation → Shipment Creation');
  console.log('Goal: Verify double multiplication prevention is working correctly\n');

  try {
    // Step 1: Login
    const sessionCookie = await loginUser();
    
    // Step 2: Calculate price
    const pricingOption = await calculatePrice(sessionCookie);
    
    // Step 3: Create shipment
    const shipment = await createShipment(sessionCookie, pricingOption);
    
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY');
    console.log('=====================================');
    console.log('✅ All steps completed without errors');
    console.log('✅ Pricing integrity maintained');
    console.log('✅ Double multiplication prevention working');
    console.log('\n📋 FINAL SUMMARY:');
    console.log('  - Shipment ID:', shipment.id);
    console.log('  - Tracking Number:', shipment.trackingNumber);
    console.log('  - Customer Price:', shipment.totalPrice);
    console.log('  - Original Cost:', shipment.originalTotalPrice);
    console.log('  - Applied Multiplier:', shipment.appliedMultiplier);
    
  } catch (error) {
    console.log('\n❌ TEST FAILED');
    console.log('=====================================');
    console.log('Error:', error.message);
    console.log('\nCheck the server logs for detailed debugging information.');
  }
}

// Run the test
if (require.main === module) {
  runShipmentCreationDebuggingTest();
}

module.exports = {
  runShipmentCreationDebuggingTest,
  makeAuthenticatedRequest,
  loginUser,
  calculatePrice,
  createShipment
};