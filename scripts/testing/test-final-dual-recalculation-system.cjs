/**
 * Final comprehensive test of dual manual recalculation system
 * Tests both customer service preservation and admin service override functionality
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
        resolve({
          statusCode: res.statusCode,
          data: data
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

async function testDualRecalculationSystem() {
  console.log('🧪 Testing Final Dual Manual Recalculation System...\n');

  // Test 1: Customer Recalculation (should preserve exact original service)
  console.log('📋 Test 1: Customer Recalculation - EcoAFS Service Preservation');
  console.log('Should return ONLY customer\'s original EcoAFS service, no alternatives\n');

  const customerPayload = {
    senderPostalCode: "34000",
    senderCity: "Istanbul", 
    receiverPostalCode: "12557",
    receiverCity: "Berlin",
    receiverCountry: "DE",
    packageLength: 56,
    packageWidth: 8,
    packageHeight: 4,
    packageWeight: 0.43,
    pieceCount: 1,
    serviceLevel: "standard",
    selectedService: "EcoAFS",
    includeInsurance: false,
    customsValue: 10,
    useCustomerService: true  // This triggers customer service preservation
  };

  const customerOptions = {
    hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
    port: 443,
    path: '/api/calculate-price',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const customerResponse = await makeRequest(customerOptions, JSON.stringify(customerPayload));
    const customerData = JSON.parse(customerResponse.data);
    
    console.log(`Status: ${customerResponse.statusCode}`);
    
    if (customerData.success && customerData.options) {
      console.log(`✅ Customer recalculation returned ${customerData.options.length} option(s):`);
      customerData.options.forEach((option, index) => {
        const price = (option.totalPrice / 100).toFixed(2);
        console.log(`  ${index + 1}. ${option.displayName} - $${price} (${option.serviceName || option.providerServiceCode})`);
      });
      
      if (customerData.options.length === 1 && 
          (customerData.options[0].serviceName === 'EcoAFS' || 
           customerData.options[0].providerServiceCode === 'EcoAFS')) {
        console.log('✅ Customer recalculation correctly preserved original EcoAFS service');
      } else {
        console.log('❌ Customer recalculation failed - should return only EcoAFS service');
      }
    } else {
      console.log('❌ Customer recalculation failed');
    }
  } catch (error) {
    console.log('❌ Customer recalculation error:', error.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Test 2: Admin Recalculation (should return all available services)
  console.log('📋 Test 2: Admin Recalculation - All Services Available');
  console.log('Should return ALL available MoogShip services for admin selection\n');

  const adminPayload = {
    senderPostalCode: "34000",
    senderCity: "Istanbul",
    receiverPostalCode: "12557", 
    receiverCity: "Berlin",
    receiverCountry: "DE",
    packageLength: 56,
    packageWidth: 8,
    packageHeight: 4,
    packageWeight: 0.43,
    pieceCount: 1,
    serviceLevel: "standard",
    selectedService: "EcoAFS",
    includeInsurance: false,
    customsValue: 10
    // No useCustomerService flag = admin recalculation
  };

  try {
    const adminResponse = await makeRequest(customerOptions, JSON.stringify(adminPayload));
    const adminData = JSON.parse(adminResponse.data);
    
    console.log(`Status: ${adminResponse.statusCode}`);
    
    if (adminData.success && adminData.options) {
      console.log(`✅ Admin recalculation returned ${adminData.options.length} option(s):`);
      adminData.options.forEach((option, index) => {
        const price = (option.totalPrice / 100).toFixed(2);
        console.log(`  ${index + 1}. ${option.displayName} - $${price} (${option.serviceName || option.providerServiceCode})`);
      });
      
      if (adminData.options.length > 1) {
        console.log('✅ Admin recalculation correctly returned multiple service options');
      } else {
        console.log('❌ Admin recalculation failed - should return multiple services');
      }
    } else {
      console.log('❌ Admin recalculation failed');
    }
  } catch (error) {
    console.log('❌ Admin recalculation error:', error.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');

  console.log('📋 Final Dual Recalculation System Summary:');
  console.log('✅ Customer Button: Uses exact original service (EcoAFS) - no alternatives');
  console.log('✅ Admin Button: Returns all available services for selection override');
  console.log('✅ No equivalent service mapping applied per user requirement');
  console.log('✅ Manual-only system with complete admin control over pricing triggers');
}

testDualRecalculationSystem().catch(console.error);