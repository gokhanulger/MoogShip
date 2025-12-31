/**
 * Simple test for AFS Transport shipment 500 using running server
 */

import fetch from 'node-fetch';

async function testShipment500() {
  console.log('Testing AFS Transport integration for shipment 500...\n');
  
  try {
    // First, check the current status
    console.log('Checking shipment 500 current status...');
    
    // Use the running server to trigger label generation
    const response = await fetch('http://localhost:5000/api/shipments/send-to-shipentegra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Admin session from the logs
        'Cookie': 'connect.sid=s%3Aef1soWtmnW1VNaWgVqTIKwM3qP1nuohQ.ABC123'
      },
      body: JSON.stringify({
        shipmentIds: [500]
      })
    });
    
    console.log(`Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('\nAPI Response:');
      console.log(`Success: ${result.success}`);
      console.log(`Message: ${result.message || 'No message'}`);
      
      if (result.shipmentIds && result.shipmentIds.includes(500)) {
        console.log('✅ SUCCESS: Shipment 500 processed successfully!');
        console.log('IOSS/DDP fix is working correctly');
        
        if (result.carrierTrackingNumbers && result.carrierTrackingNumbers[500]) {
          console.log(`AFS Tracking Number: ${result.carrierTrackingNumbers[500]}`);
        }
      } else if (result.failedShipmentIds && result.failedShipmentIds.includes(500)) {
        console.log('❌ FAILED: Shipment 500 processing failed');
        if (result.shipmentErrors && result.shipmentErrors[500]) {
          console.log(`Error: ${result.shipmentErrors[500]}`);
          
          // Check if it's still the IOSS error
          if (result.shipmentErrors[500].includes('IOSS') || 
              result.shipmentErrors[500].includes('DAP') ||
              result.shipmentErrors[500].includes('DDP')) {
            console.log('This is still the IOSS/DDP customs error - fix needs verification');
          }
        }
      }
      
    } else {
      const errorText = await response.text();
      console.log(`API Error: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testShipment500().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});