/**
 * Check specific UPS tracking number status
 */

import { trackPackage } from './server/services/ups.ts';
import { sql } from './server/db.ts';

async function checkSpecificTracking() {
  const trackingNumber = '1Z5EY7350491804241';
  console.log(`Checking UPS tracking for: ${trackingNumber}\n`);
  
  try {
    // Check current UPS status
    const trackingInfo = await trackPackage(trackingNumber);
    
    console.log('Current UPS Status:');
    console.log(`  Status: ${trackingInfo.status}`);
    console.log(`  Description: ${trackingInfo.statusDescription}`);
    console.log(`  Location: ${trackingInfo.location || 'N/A'}`);
    
    // Check shipment details
    const shipmentResult = await sql`
      SELECT id, tracking_number, status, created_at, updated_at
      FROM shipments 
      WHERE carrier_tracking_number = ${trackingNumber}
    `;
    
    if (shipmentResult.length > 0) {
      const shipment = shipmentResult[0];
      console.log('\nShipment Details:');
      console.log(`  ID: ${shipment.id}`);
      console.log(`  MoogShip Number: ${shipment.tracking_number}`);
      console.log(`  Current Status: ${shipment.status}`);
      console.log(`  Created: ${shipment.created_at}`);
      console.log(`  Days Old: ${Math.floor((Date.now() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60 * 24))}`);
      
      // Recommend action based on status
      if (trackingInfo.status === 'DELIVERED') {
        console.log('\n✅ RECOMMENDATION: Move to DELIVERED status');
        
        await sql`
          UPDATE shipments 
          SET status = 'delivered',
              tracking_info = ${JSON.stringify(trackingInfo)},
              updated_at = NOW()
          WHERE id = ${shipment.id}
        `;
        
        console.log('✅ Updated shipment to delivered status');
        
      } else if (trackingInfo.status === 'PRE_TRANSIT') {
        console.log('\n⏳ RECOMMENDATION: Keep in pre-transit (not picked up yet)');
      } else if (trackingInfo.status === 'IN_TRANSIT') {
        console.log('\n🚛 RECOMMENDATION: Move to IN_TRANSIT status');
        
        await sql`
          UPDATE shipments 
          SET status = 'in_transit',
              tracking_info = ${JSON.stringify(trackingInfo)},
              updated_at = NOW()
          WHERE id = ${shipment.id}
        `;
        
        console.log('✅ Updated shipment to in_transit status');
      }
    }
    
  } catch (error) {
    console.error('Error checking tracking:', error.message);
  }
}

checkSpecificTracking();