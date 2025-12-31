/**
 * Test script to debug SERVICE_MAPPING configuration lookup
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

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testServiceMappingDebug() {
  console.log("🧪 Testing SERVICE_MAPPING Configuration Lookup");
  console.log("=" .repeat(60));
  
  // Test creating a UPS shipment to trigger the SERVICE_MAPPING lookup
  const testShipment = {
    senderName: "Test Sender",
    senderAddress1: "123 Test St",
    senderCity: "Istanbul",
    senderPostalCode: "34000",
    senderEmail: "test@example.com",
    senderPhone: "+90 555 123 4567",
    receiverName: "Test Receiver",
    receiverAddress: "456 Test Ave",
    receiverCity: "New York",
    receiverState: "NY",
    receiverCountry: "United States",
    receiverPostalCode: "10001",
    receiverPhone: "+1 555 987 6543",
    packageWeight: 2.5,
    packageLength: 20,
    packageWidth: 15,
    packageHeight: 10,
    packageContents: "Test Product - Electronics",
    customsValue: 10000, // $100.00 in cents
    selectedService: "shipentegra-ups-ekspress", // This should trigger UPS endpoint
    providerServiceCode: "shipentegra-ups-ekspress"
  };

  try {
    console.log("📦 Creating test shipment with UPS service...");
    console.log(`🏷️  Selected Service: ${testShipment.selectedService}`);
    console.log(`🔧 Provider Service Code: ${testShipment.providerServiceCode}`);
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/shipments',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A8rQnvH2wIxJnWnhZYkjbD5T5V9xGqLcK.abcdef123456' // Replace with actual session
      }
    };

    const response = await makeRequest(options, JSON.stringify(testShipment));
    
    console.log(`📊 Response Status: ${response.statusCode}`);
    
    if (response.statusCode === 200 || response.statusCode === 201) {
      const responseData = JSON.parse(response.data);
      console.log("✅ Shipment created successfully");
      console.log(`📋 Shipment ID: ${responseData.id}`);
      
      // Now approve and send to trigger label generation
      console.log("\n🚀 Attempting to approve and send shipment...");
      
      const approveOptions = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/shipments/${responseData.id}/send-approved`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': options.headers.Cookie
        }
      };
      
      const approveResponse = await makeRequest(approveOptions, JSON.stringify({}));
      console.log(`📊 Approve Response Status: ${approveResponse.statusCode}`);
      
      if (approveResponse.statusCode === 200) {
        console.log("✅ Shipment approved and sent - Check server logs for SERVICE_MAPPING debug output");
      } else {
        console.log("❌ Failed to approve shipment");
        console.log("Response:", approveResponse.data);
      }
      
    } else {
      console.log("❌ Failed to create shipment");
      console.log("Response:", response.data);
    }
    
  } catch (error) {
    console.error("❌ Error testing SERVICE_MAPPING:", error.message);
  }
}

testServiceMappingDebug();