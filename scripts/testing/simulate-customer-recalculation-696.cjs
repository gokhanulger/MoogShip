/**
 * Simulate customer recalculation for shipment 696
 * This tests the customer recalculation button functionality which should use
 * the customer's original EcoAFS service without any equivalent service mapping
 */

const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

    req.on('error', (err) => {
      reject(err);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function simulateCustomerRecalculation() {
  console.log('🧪 Simulating customer recalculation for shipment 696...\n');

  try {
    // First, get the current shipment data
    console.log('📊 Step 1: Fetching current shipment data...');
    const shipmentQuery = `
      SELECT id, selected_service, carrier_name, shipping_provider, provider_service_code,
             package_length, package_width, package_height, package_weight,
             receiver_country, base_price, fuel_charge, total_price,
             original_base_price, original_fuel_charge, original_total_price,
             applied_multiplier
      FROM shipments 
      WHERE id = 696;
    `;
    
    const shipmentResult = await pool.query(shipmentQuery);
    const shipment = shipmentResult.rows[0];
    
    console.log('Current shipment data:');
    console.table([{
      id: shipment.id,
      selectedService: shipment.selected_service,
      carrierName: shipment.carrier_name,
      shippingProvider: shipment.shipping_provider,
      country: shipment.receiver_country,
      weight: `${shipment.package_weight}kg`,
      totalPrice: `$${(shipment.total_price / 100).toFixed(2)}`,
      originalPrice: `$${(shipment.original_total_price / 100).toFixed(2)}`,
      multiplier: shipment.applied_multiplier
    }]);

    // Step 2: Simulate the customer recalculation API call
    console.log('\n🔄 Step 2: Simulating customer recalculation...');
    console.log('Customer recalculation should use original service: EcoAFS');
    console.log('No equivalent service mapping should be applied');
    
    const requestPayload = {
      senderPostalCode: "34000",
      senderCity: "Istanbul", 
      receiverPostalCode: "12557",
      receiverCity: "Berlin",
      receiverCountry: shipment.receiver_country,
      packageLength: shipment.package_length,
      packageWidth: shipment.package_width, 
      packageHeight: shipment.package_height,
      packageWeight: shipment.package_weight,
      pieceCount: 1,
      serviceLevel: "standard", // Required by schema
      selectedService: shipment.selected_service, // Customer's original service: EcoAFS
      includeInsurance: false,
      customsValue: 10,
      useCustomerService: true // Flag to indicate customer recalculation
    };

    console.log('Request payload:');
    console.log(JSON.stringify(requestPayload, null, 2));

    const options = {
      hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
      port: 443,
      path: '/api/calculate-price',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A8q6yJxCjyoqL5YAD_uWJ0oNOqEfQWmk4.V4TLF%2BWjBqXz7rBkOYqjt8%2FyZEjWBbGo7FMpON%2BNlpc'
      }
    };

    try {
      const response = await makeRequest(options, JSON.stringify(requestPayload));
      
      console.log('\n📋 Step 3: Analyzing recalculation response...');
      console.log(`Status: ${response.status}`);
      
      if (response.status === 200 && response.data) {
        console.log('\n✅ Customer recalculation successful!');
        
        // Check if EcoAFS service was used
        const result = response.data;
        console.log('\nRecalculation results:');
        
        if (result.options && result.options.length > 0) {
          console.log('Available service options:');
          result.options.forEach((option, index) => {
            console.log(`${index + 1}. ${option.displayName} - $${(option.totalPrice / 100).toFixed(2)} (${option.providerServiceCode})`);
          });
          
          // Check if EcoAFS is present in results
          const ecoAfsOption = result.options.find(opt => 
            opt.providerServiceCode === 'EcoAFS' || 
            opt.serviceName === 'EcoAFS' ||
            opt.displayName?.includes('GLS Eco')
          );
          
          if (ecoAfsOption) {
            console.log('\n✅ EcoAFS service found in recalculation results:');
            console.table([{
              service: ecoAfsOption.displayName || ecoAfsOption.serviceName,
              code: ecoAfsOption.providerServiceCode,
              price: `$${(ecoAfsOption.totalPrice / 100).toFixed(2)}`,
              originalPrice: `$${(ecoAfsOption.originalTotalPrice / 100).toFixed(2)}`,
              multiplier: ecoAfsOption.appliedMultiplier
            }]);
          } else {
            console.log('\n❌ EcoAFS service not found in recalculation results');
            console.log('This indicates the customer recalculation may not be preserving the original service');
          }
        }
        
        // Verify customer service preservation
        console.log('\n🔍 Step 4: Customer service preservation verification:');
        if (result.selectedOption) {
          const selectedService = result.selectedOption.providerServiceCode || result.selectedOption.serviceName;
          if (selectedService === 'EcoAFS') {
            console.log('✅ Customer recalculation correctly preserved EcoAFS service');
          } else {
            console.log(`❌ Customer recalculation changed service from EcoAFS to ${selectedService}`);
          }
        }
        
      } else {
        console.log('❌ Recalculation failed or returned unexpected response');
        console.log('Response:', response.data);
      }
      
    } catch (apiError) {
      console.log('❌ API request failed:', apiError.message);
      console.log('This might indicate the pricing service needs authentication or has other issues');
    }

    console.log('\n📋 Summary:');
    console.log('- Customer recalculation should use exact original service (EcoAFS)');
    console.log('- No equivalent service mapping should be applied');
    console.log('- Service should route to AFS Transport provider');
    console.log('- Price calculation should respect customer\'s original choice');

  } catch (error) {
    console.error('❌ Error simulating customer recalculation:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  simulateCustomerRecalculation();
}

module.exports = { simulateCustomerRecalculation };