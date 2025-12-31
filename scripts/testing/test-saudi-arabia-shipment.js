#!/usr/bin/env node

import https from 'https';

// Test ShipEntegra order creation for Saudi Arabia destination
async function testSaudiArabiaShipment() {
  try {
    console.log('\n🇸🇦 Testing ShipEntegra order creation for Saudi Arabia (EXPRESS service)...\n');
    
    // First get access token
    console.log('🔑 Getting ShipEntegra access token...\n');
    
    const tokenPayload = {
      clientId: process.env.SHIPENTEGRA_CLIENT_ID,
      clientSecret: process.env.SHIPENTEGRA_CLIENT_SECRET
    };
    
    const tokenOptions = {
      hostname: 'publicapi.shipentegra.com',
      port: 443,
      path: '/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Length': JSON.stringify(tokenPayload).length
      }
    };
    
    const tokenResult = await makeRequest(tokenOptions, JSON.stringify(tokenPayload));
    
    if (tokenResult.statusCode !== 200) {
      console.log('❌ Failed to get access token:', tokenResult.statusCode);
      console.log(tokenResult.body);
      return;
    }
    
    const tokenResponse = JSON.parse(tokenResult.body);
    const accessToken = tokenResponse.data?.accessToken;
    
    if (!accessToken) {
      console.log('❌ No access token in response');
      console.log(tokenResult.body);
      return;
    }
    
    console.log('✅ Access token obtained successfully\n');
    
    // Test order creation payload based on shipment #852
    const orderPayload = {
      number: "MOG254342000852",
      packageQuantity: 1,
      reference1: "SH-000852",
      description: "Test package to Saudi Arabia",
      currency: "USD",
      weight: 2,
      width: 42,
      height: 9,
      length: 64,
      shipFrom: {
        name: "Turgut Office T",
        address1: "Osmangazi Mh. Adagulu Sk. 15/2",
        city: "Istanbul",
        country: "TR",
        zipCode: "34387",
        phone: "905407447911",
        email: "info@moogship.com"
      },
      shippingAddress: {
        name: "Maha AlTuwaijri",
        address: "8307 Abrad Street - Al Khuzama",
        city: "Riyadh",
        country: "SA",
        state: "",
        postalCode: "12582",
        phone: "+966123456789",
        email: "test@example.com"
      },
      items: [
        {
          name: "Test Item",
          description: "Test item description",
          quantity: 1,
          price: 100.00,
          gtin: "9999999999",
          hsCode: "9999999999",
          weight: 2,
          countryOfOrigin: "TR"
        }
      ],
      specialService: ""
    };
    
    console.log('📦 Order creation payload:');
    console.log(JSON.stringify(orderPayload, null, 2));
    console.log('\n');
    
    // Test ORDER creation for UPS EXPRESS service (should work for SA)
    const orderOptions = {
      hostname: 'publicapi.shipentegra.com',
      port: 443,
      path: '/v1/logistics/orders/shipentegra/ups',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Length': JSON.stringify(orderPayload).length
      }
    };
    
    console.log('🚀 Creating ShipEntegra UPS EXPRESS order for Saudi Arabia...\n');
    
    const orderResult = await makeRequest(orderOptions, JSON.stringify(orderPayload));
    
    console.log(`📊 Response Status: ${orderResult.statusCode}`);
    console.log('📄 Response Body:');
    console.log(orderResult.body);
    
    if (orderResult.statusCode === 200) {
      console.log('\n✅ Order created successfully!');
      const orderResponse = JSON.parse(orderResult.body);
      console.log('Order ID:', orderResponse.data?.orderId);
      console.log('Tracking Number:', orderResponse.data?.se_tracking_number);
    } else {
      console.log('\n❌ Order creation failed');
      try {
        const errorResponse = JSON.parse(orderResult.body);
        console.log('Error message:', errorResponse.message);
        console.log('Error details:', errorResponse.errors || 'No detailed errors');
      } catch (e) {
        console.log('Raw error response:', orderResult.body);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Helper function to make HTTPS requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
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

// Run the test
testSaudiArabiaShipment().catch(console.error);