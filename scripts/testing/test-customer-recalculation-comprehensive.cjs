/**
 * Comprehensive test for customer recalculation with shipment 696 (EcoAFS service)
 * This simulates the exact frontend behavior including shipment data
 */

const https = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
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

async function testCustomerRecalculation() {
  console.log('🔧 Testing customer recalculation for shipment 696 (EcoAFS service)...\n');

  // Simulate shipment 696 data (EcoAFS service)
  const shipmentData = {
    id: 696,
    selectedService: "EcoAFS",
    serviceLevel: "Shipentegra", 
    shippingProvider: "afs",
    carrierName: "AFS Transport",
    packageLength: 56,
    packageWidth: 8,
    packageHeight: 4,
    packageWeight: 0.43,
    senderCity: "İstanbul",
    senderPostalCode: "34001",
    receiverCity: "Berlin",
    receiverPostalCode: "12557",
    receiverCountry: "DE"
  };

  console.log('📦 Simulating shipment data:', {
    id: shipmentData.id,
    selectedService: shipmentData.selectedService,
    serviceLevel: shipmentData.serviceLevel,
    shippingProvider: shipmentData.shippingProvider,
    carrierName: shipmentData.carrierName
  });

  // Test 1: Customer recalculation (should return only EcoAFS)
  console.log('\n🎯 Testing Customer Recalculation (useCustomerService: true)');
  console.log('Expected: Single "MoogShip GLS Eco" option with EcoAFS service');
  
  const customerRequestData = {
    senderPostalCode: shipmentData.senderPostalCode,
    senderCity: shipmentData.senderCity,
    receiverPostalCode: shipmentData.receiverPostalCode,
    receiverCity: shipmentData.receiverCity,
    receiverCountry: shipmentData.receiverCountry,
    packageLength: shipmentData.packageLength,
    packageWidth: shipmentData.packageWidth,
    packageHeight: shipmentData.packageHeight,
    packageWeight: shipmentData.packageWeight,
    serviceLevel: "standard",
    pieceCount: 1,
    selectedService: shipmentData.selectedService,
    useCustomerService: true, // CRITICAL: Customer recalculation flag
    originalSelectedService: shipmentData.selectedService,
    originalServiceLevel: shipmentData.serviceLevel,
    originalShippingProvider: shipmentData.shippingProvider,
    originalCarrierName: shipmentData.carrierName
  };

  const customerOptions = {
    hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
    port: 443,
    path: '/api/calculate-price',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  try {
    const customerResponse = await makeRequest(customerOptions, JSON.stringify(customerRequestData));
    
    console.log(`✅ Customer API Response Status: ${customerResponse.status}`);
    
    if (customerResponse.data && customerResponse.data.success) {
      const options = customerResponse.data.options || [];
      console.log(`\n🎯 Customer Recalculation Results:`);
      console.log(`- Success: ${customerResponse.data.success}`);
      console.log(`- Total options returned: ${options.length}`);
      console.log(`- Preserved customer service: ${customerResponse.data.preservedCustomerService || false}`);
      
      if (options.length > 0) {
        console.log(`- Main price: $${(options[0].totalPrice / 100).toFixed(2)}`);
      }
      
      console.log('\n📋 Service Options Returned:');
      options.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName || option.serviceName} - $${(option.totalPrice / 100).toFixed(2)} (${option.providerServiceCode || 'unknown'})`);
      });

      // Check if customer recalculation worked correctly
      if (options.length === 1 && customerResponse.data.preservedCustomerService) {
        console.log('\n✅ SUCCESS: Customer recalculation returned single service as expected!');
      } else if (options.length === 1) {
        console.log('\n⚠️  PARTIAL SUCCESS: Single option returned but preservedCustomerService flag missing');
      } else {
        console.log('\n❌ ISSUE: Customer recalculation returned multiple options instead of single original service');
      }
      
    } else {
      console.log('❌ Customer recalculation failed:', customerResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Error during customer recalculation test:', error.message);
  }

  // Test 2: Admin recalculation for comparison
  console.log('\n\n🔄 Testing Admin Recalculation (useCustomerService: false)');
  console.log('Expected: Multiple service options for admin selection');
  
  const adminRequestData = {
    ...customerRequestData,
    useCustomerService: false // Admin recalculation
  };

  try {
    const adminResponse = await makeRequest(customerOptions, JSON.stringify(adminRequestData));
    
    if (adminResponse.data && adminResponse.data.success) {
      const adminOptions = adminResponse.data.options || [];
      console.log(`📊 Admin Recalculation Results:`);
      console.log(`- Total options returned: ${adminOptions.length}`);
      
      console.log('📋 Admin Options:');
      adminOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName || option.serviceName} - $${(option.totalPrice / 100).toFixed(2)}`);
      });
      
      if (adminOptions.length > 1) {
        console.log('\n✅ Admin recalculation correctly returned multiple options');
      }
    }
    
  } catch (error) {
    console.error('❌ Error during admin recalculation test:', error.message);
  }

  console.log('\n🏁 Test completed!');
}

testCustomerRecalculation().catch(console.error);