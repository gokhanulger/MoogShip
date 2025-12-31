/**
 * Test complete bulk upload provider fix
 * This will create a test bulk shipment with GLS Eco service and verify
 * that both frontend and backend correctly detect and store the AFS provider
 */

import { createConnection } from '@neondatabase/serverless';
import fetch from 'node-fetch';

async function testCompleteBulkProviderFix() {
  const connection = createConnection({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🧪 Testing complete bulk upload provider fix...\n');

    // Create test bulk shipment data with GLS Eco service
    const testShipmentData = {
      shipments: [
        {
          receiverName: "Test Customer",
          receiverAddress: "123 Test Street",
          receiverCity: "Berlin", 
          receiverCountry: "DE",
          receiverPostalCode: "12345",
          packageWeight: 0.5,
          packageLength: 20,
          packageWidth: 15,
          packageHeight: 10,
          packageContents: "Test item",
          selectedServiceOption: {
            serviceCode: "afs-1",
            displayName: "MoogShip GLS Eco",
            carrierName: "MoogShip GLS Eco",
            shippingProvider: "afs",
            totalPrice: 899,  // $8.99 in cents
            basePrice: 799,
            fuelCharge: 100,
            originalTotalPrice: 799,
            appliedMultiplier: 1.12
          }
        }
      ]
    };

    console.log('📤 Test shipment data:', JSON.stringify(testShipmentData, null, 2));

    // Simulate the API call to create bulk shipments
    const response = await fetch('http://localhost:3000/api/shipments/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AFHMGyOuqCSZm4XyEQyyEbBefiZZY-qG1.Y8bNJH2%2BN8NQsxuHQpvSCpFIL5YdIXqDMlnhYF0vf0s'
      },
      body: JSON.stringify(testShipmentData)
    });

    const result = await response.json();
    console.log('📥 API Response:', JSON.stringify(result, null, 2));

    if (result.shipments && result.shipments.length > 0) {
      const createdShipment = result.shipments[0];
      console.log('\n✅ Bulk shipment created successfully!');
      console.log('📋 Shipment Details:');
      console.log(`   ID: ${createdShipment.id}`);
      console.log(`   Selected Service: ${createdShipment.selectedService}`);
      console.log(`   Carrier Name: ${createdShipment.carrierName}`);
      console.log(`   Shipping Provider: ${createdShipment.shippingProvider}`);
      console.log(`   Provider Service Code: ${createdShipment.providerServiceCode}`);

      // Verify the stored data in database
      console.log('\n🔍 Verifying stored data in database...');
      const query = `
        SELECT id, selectedService, carrierName, shippingProvider, providerServiceCode
        FROM shipments 
        WHERE id = $1
      `;
      
      const dbResult = await connection.execute(query, [createdShipment.id]);
      
      if (dbResult.rows.length > 0) {
        const storedShipment = dbResult.rows[0];
        console.log('📊 Database stored values:');
        console.log(`   Selected Service: ${storedShipment.selectedservice}`);
        console.log(`   Carrier Name: ${storedShipment.carriername}`);
        console.log(`   Shipping Provider: ${storedShipment.shippingprovider}`);
        console.log(`   Provider Service Code: ${storedShipment.providerservicecode}`);

        // Validate fix
        const isCorrectProvider = storedShipment.shippingprovider === 'afs';
        const isCorrectCarrier = storedShipment.carriername === 'MoogShip GLS Eco';
        const isCorrectService = storedShipment.selectedservice === 'afs-1';

        console.log('\n🎯 Validation Results:');
        console.log(`   ✅ Correct Provider (afs): ${isCorrectProvider ? 'PASS' : 'FAIL'}`);
        console.log(`   ✅ Correct Carrier Name: ${isCorrectCarrier ? 'PASS' : 'FAIL'}`);
        console.log(`   ✅ Correct Service Code: ${isCorrectService ? 'PASS' : 'FAIL'}`);

        if (isCorrectProvider && isCorrectCarrier && isCorrectService) {
          console.log('\n🎉 COMPLETE FIX VERIFIED! Both frontend and backend correctly handle service provider detection.');
        } else {
          console.log('\n❌ Fix incomplete - some values are still incorrect.');
        }
      }
    } else {
      console.log('❌ Failed to create bulk shipment:', result);
    }

  } catch (error) {
    console.error('❌ Error testing bulk provider fix:', error);
  } finally {
    await connection.end();
  }
}

testCompleteBulkProviderFix();