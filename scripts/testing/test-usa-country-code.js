/**
 * Test script to verify USA country code change and test label purchasing
 * This will test a direct label generation call to see if USA works better than US
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

const SHIPENTEGRA_AUTH_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_ORDER_URL = "https://publicapi.shipentegra.com/v1/orders/manual";
const SHIPENTEGRA_LABEL_URL = "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra";

/**
 * Get access token from ShipEntegra API
 */
async function getAccessToken() {
  try {
    const response = await fetch(SHIPENTEGRA_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET
      })
    });

    const data = await response.json();
    
    if (data.status === 'success') {
      console.log('✅ Authentication successful');
      return data.data.accessToken;
    } else {
      throw new Error(`Authentication failed: ${data.message}`);
    }
  } catch (error) {
    console.error('❌ Authentication error:', error);
    throw error;
  }
}

/**
 * Test order creation with USA country code
 */
async function createTestOrder(accessToken, countryCode) {
  const orderPayload = {
    number: `TEST-USA-${Date.now()}`,
    packageQuantity: 1,
    reference1: `TEST-USA-${Date.now()}`,
    description: "Test Package for USA Country Code",
    currency: "USD",
    weight: 1, // 0.6kg - above the 0.5kg limit for US
    width: 10,
    height: 10,
    length: 10,
    shipFrom: {
      name: "MOOG ENTERPRISE",
      address1: "HALIL RIFAT PASA MAH. YUZER HAVUZ",
      city: "ISTANBUL",
      zipCode: "34300",
      phone: "905407447911",
      email: "info@moogship.com"
    },
    shippingAddress: {
      name: "TEST USER",
      address: "6825 176th Ave NE",
      city: "Redmond",
      country: countryCode, // This is the key test - US vs USA
      state: "WA",
      postalCode: "98052",
      phone: "14257864314",
      email: "test@example.com"
    },
    items: [
      {
        name: "Test Package",
        quantity: 1,
        unitPrice: 100,
        sku: "TEST-001",
        gtip: 112341234
      }
    ]
  };

  console.log(`\n🧪 Testing order creation with country code: ${countryCode}`);
  console.log(`📦 Package weight: 0.6kg (above 0.5kg limit)`);
  console.log(`📋 Order payload:`, JSON.stringify(orderPayload, null, 2));

  try {
    const response = await fetch(SHIPENTEGRA_ORDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(orderPayload)
    });

    const data = await response.json();
    console.log(`📡 Order creation response:`, JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      return data.data.orderId;
    } else {
      console.error(`❌ Order creation failed: ${data.message}`);
      return null;
    }
  } catch (error) {
    console.error('❌ Order creation error:', error);
    return null;
  }
}

/**
 * Test label purchasing with Eco service
 */
async function purchaseEcoLabel(accessToken, orderId) {
  const labelPayload = {
    orderId: orderId,
    specialService: "shipentegra-eco",
    packageItems: [
      {
        itemId: 1,
        name: "Test Package",
        description: "Test Package for USA Country Code",
        quantity: 1,
        price: 100,
        weight: 0.6, // 0.6kg - above the 0.5kg limit
        htsCode: "9999.00.0000",
        countryOfOrigin: "TR"
      }
    ]
  };

  console.log(`\n🏷️ Testing ECO label purchase for order: ${orderId}`);
  console.log(`📦 Package weight: 0.6kg (testing weight limit)`);
  console.log(`📋 Label payload:`, JSON.stringify(labelPayload, null, 2));

  try {
    const response = await fetch(SHIPENTEGRA_LABEL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(labelPayload)
    });

    const data = await response.json();
    console.log(`📡 Label purchase response:`, JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      console.log(`✅ ECO label purchased successfully!`);
      return true;
    } else {
      console.log(`❌ ECO label purchase failed: ${data.message}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Label purchase error:', error);
    return false;
  }
}

/**
 * Main test function
 */
async function runCountryCodeTest() {
  console.log('🧪 ===== TESTING USA vs US COUNTRY CODE =====\n');

  try {
    // Get access token
    const accessToken = await getAccessToken();

    // Test 1: Create order with "US" country code
    console.log('\n📍 TEST 1: Creating order with "US" country code');
    const orderIdUS = await createTestOrder(accessToken, "US");
    
    if (orderIdUS) {
      console.log(`✅ Order created with US: ${orderIdUS}`);
      const labelSuccessUS = await purchaseEcoLabel(accessToken, orderIdUS);
      console.log(`🏷️ ECO label with US: ${labelSuccessUS ? 'SUCCESS' : 'FAILED'}`);
    }

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Create order with "USA" country code
    console.log('\n📍 TEST 2: Creating order with "USA" country code');
    const orderIdUSA = await createTestOrder(accessToken, "USA");
    
    if (orderIdUSA) {
      console.log(`✅ Order created with USA: ${orderIdUSA}`);
      const labelSuccessUSA = await purchaseEcoLabel(accessToken, orderIdUSA);
      console.log(`🏷️ ECO label with USA: ${labelSuccessUSA ? 'SUCCESS' : 'FAILED'}`);
    }

    console.log('\n🎯 ===== TEST RESULTS SUMMARY =====');
    console.log(`📍 US Country Code: ${orderIdUS ? 'Order Created' : 'Order Failed'}`);
    console.log(`📍 USA Country Code: ${orderIdUSA ? 'Order Created' : 'Order Failed'}`);
    console.log('\nCheck the detailed responses above to see weight limit behavior differences.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runCountryCodeTest();