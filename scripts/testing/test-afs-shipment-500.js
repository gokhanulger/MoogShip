/**
 * Test AFS Transport integration for shipment 500 with IOSS/DDP fix
 */

const fetch = require('node-fetch');

async function testAFSShipment500() {
  console.log('🚛 Testing AFS Transport integration for shipment 500...\n');
  
  try {
    // Call the admin API to process shipment 500
    console.log('📦 Triggering label generation for shipment 500...');
    
    const response = await fetch('http://localhost:5000/api/shipments/send-to-shipentegra', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use admin session cookie (this would need to be updated with actual session)
        'Cookie': 'connect.sid=s%3Aef1soWtmnW1VNaWgVqTIKwM3qP1nuohQ.ABC123'
      },
      body: JSON.stringify({
        shipmentIds: [500]
      })
    });
    
    console.log(`📊 Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('\n✅ API Response:');
      console.log(`   Success: ${result.success}`);
      console.log(`   Message: ${result.message}`);
      console.log(`   Successful Shipments: ${result.shipmentIds?.length || 0}`);
      console.log(`   Failed Shipments: ${result.failedShipmentIds?.length || 0}`);
      
      if (result.shipmentErrors && result.shipmentErrors[500]) {
        console.log(`   Error for Shipment 500: ${result.shipmentErrors[500]}`);
      }
      
      if (result.carrierTrackingNumbers && result.carrierTrackingNumbers[500]) {
        console.log(`   AFS Tracking Number: ${result.carrierTrackingNumbers[500]}`);
      }
      
    } else {
      const errorText = await response.text();
      console.log(`❌ API Error: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function checkShipmentStatus() {
  try {
    console.log('\n🔍 Checking shipment 500 status in database...');
    
    // Import database connection
    const { sql } = await import('@vercel/postgres');
    
    const result = await sql`
      SELECT id, status, selected_service, shipping_provider, carrier_name, 
             label_attempts, label_error, carrier_tracking_number
      FROM shipments 
      WHERE id = 500
    `;
    
    if (result.rows.length > 0) {
      const shipment = result.rows[0];
      console.log('📋 Shipment Details:');
      console.log(`   ID: ${shipment.id}`);
      console.log(`   Status: ${shipment.status}`);
      console.log(`   Service: ${shipment.selected_service}`);
      console.log(`   Provider: ${shipment.shipping_provider}`);
      console.log(`   Carrier: ${shipment.carrier_name}`);
      console.log(`   Label Attempts: ${shipment.label_attempts}`);
      console.log(`   Label Error: ${shipment.label_error || 'None'}`);
      console.log(`   Carrier Tracking: ${shipment.carrier_tracking_number || 'Not set'}`);
    }
    
  } catch (error) {
    console.error('Error checking shipment status:', error);
  }
}

async function main() {
  await checkShipmentStatus();
  await testAFSShipment500();
  
  // Wait a moment then check status again
  setTimeout(async () => {
    await checkShipmentStatus();
    process.exit(0);
  }, 3000);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});