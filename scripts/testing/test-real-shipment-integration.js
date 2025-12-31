/**
 * Test the integrated conditional label generation with a real approved shipment
 */
import { Pool } from '@neondatabase/serverless';
import fetch from 'node-fetch';

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testRealShipmentIntegration() {
  console.log('🧪 Testing Real Shipment Integration');
  console.log('=====================================');
  
  try {
    // Find an approved shipment with a known service
    const query = `
      SELECT id, tracking_number, selected_service, package_weight, 
             receiver_country, sender_name, receiver_name
      FROM shipments 
      WHERE status = 'approved' 
      AND selected_service IS NOT NULL
      AND selected_service != ''
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ No approved shipments found for testing');
      return;
    }
    
    const shipment = result.rows[0];
    console.log(`📦 Testing with Shipment #${shipment.id}`);
    console.log(`🏷️  Service: ${shipment.selected_service}`);
    console.log(`📍 Destination: ${shipment.receiver_country}`);
    console.log(`⚖️  Weight: ${shipment.package_weight}kg`);
    
    // Test the send to carrier endpoint
    console.log('\n🚀 Testing Label Generation via API...');
    
    const response = await fetch('http://localhost:5000/api/send-to-carrier', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shipmentIds: [shipment.id]
      })
    });
    
    const responseData = await response.json();
    
    console.log('\n📊 API Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Success: ${responseData.success}`);
    console.log(`Message: ${responseData.message}`);
    
    if (responseData.success) {
      console.log('\n✅ Label Generation Results:');
      console.log(`Successful Shipments: ${responseData.successfulShipmentIds?.length || 0}`);
      console.log(`Failed Shipments: ${responseData.failedShipmentIds?.length || 0}`);
      
      if (responseData.trackingNumbers) {
        console.log('📍 Tracking Numbers:', responseData.trackingNumbers);
      }
      
      if (responseData.labelUrls) {
        console.log('🔗 Label URLs:', responseData.labelUrls);
      }
      
      if (responseData.shipmentErrors && Object.keys(responseData.shipmentErrors).length > 0) {
        console.log('⚠️  Errors:', responseData.shipmentErrors);
      }
    } else {
      console.log('❌ Label generation failed');
      if (responseData.error) {
        console.log(`Error: ${responseData.error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testRealShipmentIntegration();