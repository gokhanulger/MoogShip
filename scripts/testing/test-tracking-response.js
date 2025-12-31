/**
 * Test tracking response by triggering the existing tracking system
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
const sql = postgres(connectionString);

async function testTrackingResponse() {
  const trackingNumber = '1Z5EY7350494742302';
  
  console.log(`Testing tracking response for: ${trackingNumber}`);
  console.log('='.repeat(50));
  
  try {
    // Find the shipment with this tracking number
    const shipment = await sql`
      SELECT id, carrier_tracking_number, status, created_at, updated_at 
      FROM shipments 
      WHERE carrier_tracking_number = ${trackingNumber}
      LIMIT 1
    `;
    
    if (shipment.length === 0) {
      console.log('No shipment found with that tracking number');
      return;
    }
    
    console.log('Found shipment:', shipment[0]);
    
    // Make a direct API call to the backend tracking endpoint
    const response = await fetch('http://localhost:5000/api/tracking/manual-update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        trackingNumber: trackingNumber,
        shipmentId: shipment[0].id
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('\nTracking API Response:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('Error from tracking API:', response.status, await response.text());
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await sql.end();
  }
}

testTrackingResponse();