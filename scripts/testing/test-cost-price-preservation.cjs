/**
 * Test cost price preservation during customer recalculation
 * Verifies that originalBasePrice, originalFuelCharge, originalTotalPrice remain unchanged
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

async function testCostPricePreservation() {
  console.log('🧪 Testing cost price preservation during customer recalculation...\n');

  // First, check current state of shipment 696
  console.log('📋 Step 1: Checking current shipment 696 pricing state');
  
  const shipmentOptions = {
    hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
    port: 443,
    path: '/api/shipments/696',
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Cookie': 'connect.sid=s%3AFHMGyOuqCSZm4XyEQyyEbBefiZZY-qG1.Eu8wKaRMTf0B1CKD%2FQD%2FqXLVdYC%2F4oSHNyNqnQ0' // Admin session
    }
  };

  try {
    const currentState = await makeRequest(shipmentOptions);
    
    if (currentState.status === 200 && currentState.data) {
      const shipment = currentState.data;
      console.log('✅ Current shipment pricing state:');
      console.log(`- Customer Price: $${(shipment.totalPrice / 100).toFixed(2)}`);
      console.log(`- Cost Base Price: $${(shipment.originalBasePrice / 100).toFixed(2)}`);
      console.log(`- Cost Fuel Charge: $${(shipment.originalFuelCharge / 100).toFixed(2)}`);
      console.log(`- Cost Total Price: $${(shipment.originalTotalPrice / 100).toFixed(2)}`);
      console.log(`- Applied Multiplier: ${shipment.appliedMultiplier}`);
      
      // Store the current cost prices for comparison
      const originalCostPrices = {
        originalBasePrice: shipment.originalBasePrice,
        originalFuelCharge: shipment.originalFuelCharge,
        originalTotalPrice: shipment.originalTotalPrice
      };
      
      console.log('\n📋 Step 2: Performing customer recalculation...');
      
      // Perform customer recalculation
      const customerRequestData = {
        senderPostalCode: shipment.senderPostalCode || "34001",
        senderCity: shipment.senderCity || "İstanbul",
        receiverPostalCode: shipment.receiverPostalCode,
        receiverCity: shipment.receiverCity,
        receiverCountry: shipment.receiverCountry,
        packageLength: shipment.packageLength,
        packageWidth: shipment.packageWidth,
        packageHeight: shipment.packageHeight,
        packageWeight: shipment.packageWeight,
        serviceLevel: "standard",
        pieceCount: 1,
        selectedService: shipment.selectedService,
        useCustomerService: true, // Customer recalculation
        originalSelectedService: shipment.selectedService,
        originalServiceLevel: shipment.serviceLevel,
        originalShippingProvider: shipment.shippingProvider,
        originalCarrierName: shipment.carrierName
      };

      const pricingOptions = {
        hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
        port: 443,
        path: '/api/calculate-price',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      const pricingResponse = await makeRequest(pricingOptions, JSON.stringify(customerRequestData));
      
      if (pricingResponse.status === 200 && pricingResponse.data.success) {
        const option = pricingResponse.data.options[0];
        console.log(`✅ Customer recalculation returned: $${(option.totalPrice / 100).toFixed(2)}`);
        
        console.log('\n📋 Step 3: Simulating frontend price update...');
        
        // Simulate the frontend price update with cost price preservation
        const updatePayload = {
          basePrice: option.basePrice,
          fuelCharge: option.fuelCharge,
          totalPrice: option.totalPrice,
          appliedMultiplier: option.appliedMultiplier || 1.12,
          packageWeight: shipment.packageWeight,
          selectedService: option.providerServiceCode || option.serviceCode || shipment.selectedService,
          providerServiceCode: option.providerServiceCode || option.serviceCode,
          // Preserve existing cost prices for customer recalculation
          originalBasePrice: originalCostPrices.originalBasePrice,
          originalFuelCharge: originalCostPrices.originalFuelCharge,
          originalTotalPrice: originalCostPrices.originalTotalPrice
        };

        const updateOptions = {
          hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
          port: 443,
          path: '/api/shipments/696',
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': 'connect.sid=s%3AFHMGyOuqCSZm4XyEQyyEbBefiZZY-qG1.Eu8wKaRMTf0B1CKD%2FQD%2FqXLVdYC%2F4oSHNyNqnQ0'
          }
        };

        const updateResponse = await makeRequest(updateOptions, JSON.stringify(updatePayload));
        
        if (updateResponse.status === 200) {
          console.log('✅ Shipment update successful');
          
          console.log('\n📋 Step 4: Verifying cost price preservation...');
          
          // Check final state
          const finalState = await makeRequest(shipmentOptions);
          
          if (finalState.status === 200 && finalState.data) {
            const final = finalState.data;
            
            console.log('📊 Final pricing state:');
            console.log(`- Customer Price: $${(final.totalPrice / 100).toFixed(2)}`);
            console.log(`- Cost Base Price: $${(final.originalBasePrice / 100).toFixed(2)}`);
            console.log(`- Cost Fuel Charge: $${(final.originalFuelCharge / 100).toFixed(2)}`);
            console.log(`- Cost Total Price: $${(final.originalTotalPrice / 100).toFixed(2)}`);
            
            // Verify cost prices were preserved
            const costPreserved = (
              final.originalBasePrice === originalCostPrices.originalBasePrice &&
              final.originalFuelCharge === originalCostPrices.originalFuelCharge &&
              final.originalTotalPrice === originalCostPrices.originalTotalPrice
            );
            
            if (costPreserved) {
              console.log('\n✅ SUCCESS: Cost prices were perfectly preserved during customer recalculation!');
              console.log(`- Customer price updated: $${(shipment.totalPrice / 100).toFixed(2)} → $${(final.totalPrice / 100).toFixed(2)}`);
              console.log(`- Cost prices unchanged: $${(originalCostPrices.originalTotalPrice / 100).toFixed(2)} (preserved)`);
            } else {
              console.log('\n❌ ISSUE: Cost prices were modified during customer recalculation');
              console.log('Before:', originalCostPrices);
              console.log('After:', {
                originalBasePrice: final.originalBasePrice,
                originalFuelCharge: final.originalFuelCharge,
                originalTotalPrice: final.originalTotalPrice
              });
            }
          }
        } else {
          console.log('❌ Shipment update failed:', updateResponse.status);
        }
      } else {
        console.log('❌ Customer recalculation failed:', pricingResponse.status);
      }
    } else {
      console.log('❌ Failed to fetch shipment:', currentState.status);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n🏁 Cost price preservation test completed!');
}

testCostPricePreservation().catch(console.error);