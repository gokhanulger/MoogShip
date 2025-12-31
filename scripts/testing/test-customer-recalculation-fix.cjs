/**
 * Test customer recalculation fix to verify useCustomerService flag is working
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

async function testCustomerRecalculation() {
  console.log('🧪 Testing customer recalculation with useCustomerService flag...\n');

  try {
    // Test customer recalculation for shipment 696 (EcoAFS service)
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
      selectedService: "EcoAFS",
      useCustomerService: true  // This is the critical flag that was missing
    };

    console.log('📦 Testing customer recalculation with request data:');
    console.log('- selectedService:', requestData.selectedService);
    console.log('- useCustomerService:', requestData.useCustomerService);
    console.log('- destination:', `${requestData.receiverCity}, ${requestData.receiverCountry}`);
    console.log('- weight:', `${requestData.packageWeight}kg\n`);

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
      console.log('- Total options returned:', pricing.options?.length || 0);
      console.log('- Main price:', `$${(pricing.totalPrice / 100).toFixed(2)}`);
      
      if (pricing.options && pricing.options.length > 0) {
        console.log('\n📋 Available Service Options:');
        pricing.options.forEach((option, index) => {
          console.log(`${index + 1}. ${option.displayName || option.serviceName} - $${(option.totalPrice / 100).toFixed(2)}`);
        });
        
        // Check if we got only the customer's original service
        if (pricing.options.length === 1) {
          const singleOption = pricing.options[0];
          if (singleOption.displayName?.includes('GLS Eco') || singleOption.serviceName?.includes('EcoAFS')) {
            console.log('\n✅ SUCCESS: Customer recalculation correctly returned only original EcoAFS service!');
          } else {
            console.log('\n❌ ISSUE: Single option returned but not EcoAFS service');
          }
        } else {
          console.log('\n❌ ISSUE: Customer recalculation returned multiple options instead of single original service');
        }
      } else {
        console.log('\n❌ No pricing options returned');
      }
    } else {
      console.log('❌ API Error:', response.data);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testCustomerRecalculation();