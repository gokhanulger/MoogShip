/**
 * Test direct customer recalculation to isolate API vs UI issue
 */

const https = require('https');

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function testDirectCustomerButton() {
  console.log('🔧 Testing direct customer recalculation for shipment 696...\n');

  try {
    // Get shipment 696 data first
    const shipmentOptions = {
      hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
      port: 443,
      path: '/api/shipments/696',
      method: 'GET',
      headers: {
        'Cookie': 'connect.sid=s%3AFHMGyOuqCSZm4XyEQyyEbBefiZZY-qG1.gGOdR8vWN%2FMSLGm%2BzZfDxfSDHqEtgjfrJCRMQhOO6S'
      }
    };

    const shipmentResponse = await makeRequest(shipmentOptions);
    console.log('📦 Retrieved shipment data:', {
      id: shipmentResponse.data.id,
      selectedService: shipmentResponse.data.selectedService,
      serviceLevel: shipmentResponse.data.serviceLevel,
      shippingProvider: shipmentResponse.data.shippingProvider,
      carrierName: shipmentResponse.data.carrierName
    });

    // Test customer recalculation with useCustomerService: true
    const requestData = {
      senderPostalCode: "34001",
      senderCity: "Istanbul", 
      receiverPostalCode: "12557",
      receiverCity: "Berlin",
      receiverCountry: "DE",
      packageLength: 56,
      packageWidth: 8,
      packageHeight: 4,
      packageWeight: 0.43,
      serviceLevel: "standard",
      pieceCount: 1,
      selectedService: shipmentResponse.data.selectedService, // Use exact original service
      useCustomerService: true,  // This is the critical flag
      // Include shipment's original service data for customer recalculation
      originalSelectedService: shipmentResponse.data.selectedService,
      originalServiceLevel: shipmentResponse.data.serviceLevel,
      originalShippingProvider: shipmentResponse.data.shippingProvider,
      originalCarrierName: shipmentResponse.data.carrierName
    };

    console.log('\n🎯 Direct customer recalculation request:');
    console.log('- selectedService:', requestData.selectedService);
    console.log('- useCustomerService:', requestData.useCustomerService);
    console.log('- Expected result: Single service matching original selection\n');

    const options = {
      hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
      port: 443,
      path: '/api/calculate-price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AFHMGyOuqCSZm4XyEQyyEbBefiZZY-qG1.gGOdR8vWN%2FMSLGm%2BzZfDxfSDHqEtgjfrJCRMQhOO6S'
      }
    };

    const response = await makeRequest(options, JSON.stringify(requestData));
    
    console.log('✅ API Response Status:', response.status);
    
    if (response.status === 200) {
      const pricing = response.data;
      console.log('\n🎯 Customer Recalculation Results:');
      console.log('- Success:', pricing.success);
      console.log('- Total options returned:', pricing.options?.length || 0);
      console.log('- Main price:', `$${(pricing.totalPrice / 100).toFixed(2)}`);
      
      if (pricing.options && pricing.options.length > 0) {
        console.log('\n📋 Service Options Returned:');
        pricing.options.forEach((option, index) => {
          console.log(`${index + 1}. ${option.displayName || option.serviceName} - $${(option.totalPrice / 100).toFixed(2)}`);
        });
        
        if (pricing.options.length === 1) {
          console.log('\n✅ SUCCESS: Customer recalculation returned single service as expected!');
          console.log(`✅ Service: ${pricing.options[0].displayName || pricing.options[0].serviceName}`);
        } else {
          console.log('\n❌ ISSUE: Customer recalculation returned multiple options');
        }
      }
      
      // Test admin recalculation for comparison
      console.log('\n\n🔄 Testing admin recalculation for comparison...');
      const adminRequestData = { ...requestData, useCustomerService: false };
      
      const adminResponse = await makeRequest(options, JSON.stringify(adminRequestData));
      
      if (adminResponse.status === 200) {
        const adminPricing = adminResponse.data;
        console.log('📊 Admin Recalculation Results:');
        console.log('- Total options returned:', adminPricing.options?.length || 0);
        
        if (adminPricing.options && adminPricing.options.length > 0) {
          console.log('📋 Admin Options:');
          adminPricing.options.forEach((option, index) => {
            console.log(`${index + 1}. ${option.displayName || option.serviceName} - $${(option.totalPrice / 100).toFixed(2)}`);
          });
        }
      }
      
    } else {
      console.log('❌ API Error:', response.data);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testDirectCustomerButton();