/**
 * Update pre-transit shipments that may have been delivered
 * This checks all approved shipments with carrier tracking numbers
 */

import { db } from './server/db.ts';
import { shipments } from './shared/schema.ts';
import { eq, isNotNull, and, notInArray } from 'drizzle-orm';
import { trackPackage as trackUPS } from './server/services/ups.ts';
import { trackPackage as trackDHL } from './server/services/dhl.ts';
import { detectCarrier } from './server/utils/carrierDetection.ts';

async function updatePreTransitStatus() {
  console.log('Checking pre-transit shipments for status updates...\n');
  
  try {
    // Find all shipments with carrier tracking numbers that are not delivered or rejected
    const shipmentsToCheck = await db.select()
      .from(shipments)
      .where(
        and(
          isNotNull(shipments.carrierTrackingNumber),
          notInArray(shipments.status, ['delivered', 'rejected'])
        )
      );
    
    console.log(`Found ${shipmentsToCheck.length} shipments to check`);
    
    let checkedCount = 0;
    let updatedCount = 0;
    let deliveredCount = 0;
    let transitCount = 0;
    
    for (const shipment of shipmentsToCheck) {
      const carrierTrackingNumber = shipment.carrierTrackingNumber;
      
      if (!carrierTrackingNumber) continue;
      
      try {
        checkedCount++;
        console.log(`\nChecking shipment ${shipment.id} (${shipment.trackingNumber}) - Status: ${shipment.status}`);
        console.log(`  Carrier tracking: ${carrierTrackingNumber}`);
        
        // Detect carrier and track
        const carrier = detectCarrier(carrierTrackingNumber);
        console.log(`  Carrier: ${carrier}`);
        
        let trackingInfo;
        if (carrier === 'UPS') {
          trackingInfo = await trackUPS(carrierTrackingNumber);
        } else if (carrier === 'DHL') {
          trackingInfo = await trackDHL(carrierTrackingNumber);
        } else {
          console.log(`  Skipping unsupported carrier`);
          continue;
        }
        
        console.log(`  Current status: ${trackingInfo.status} - ${trackingInfo.statusDescription}`);
        
        // Determine if status needs to be updated
        let shouldUpdate = false;
        let newStatus = shipment.status;
        
        if (trackingInfo.status === 'DELIVERED') {
          if (shipment.status !== 'delivered') {
            newStatus = 'delivered';
            shouldUpdate = true;
            deliveredCount++;
            console.log(`  ✓ MOVING TO DELIVERED`);
          } else {
            console.log(`  ✓ Already delivered`);
          }
        } else if (trackingInfo.status === 'IN_TRANSIT' || trackingInfo.status === 'OUT_FOR_DELIVERY') {
          if (shipment.status === 'approved') {
            newStatus = 'in_transit';
            shouldUpdate = true;
            transitCount++;
            console.log(`  ✓ MOVING TO IN_TRANSIT`);
          } else {
            console.log(`  ✓ Already in transit`);
          }
        } else if (trackingInfo.status === 'PRE_TRANSIT') {
          console.log(`  ○ Staying in pre-transit (approved with tracking)`);
        } else {
          console.log(`  ? Unknown status: ${trackingInfo.status}`);
        }
        
        // Update if needed
        if (shouldUpdate) {
          await db.update(shipments)
            .set({ 
              status: newStatus,
              trackingInfo: JSON.stringify(trackingInfo)
            })
            .where(eq(shipments.id, shipment.id));
          
          updatedCount++;
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.error(`  ❌ Error checking shipment ${shipment.id}:`, error.message);
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Total checked: ${checkedCount}`);
    console.log(`Total updated: ${updatedCount}`);
    console.log(`Moved to delivered: ${deliveredCount}`);
    console.log(`Moved to in-transit: ${transitCount}`);
    
    // Show current status distribution
    const statusCounts = await db.execute(`
      SELECT status, COUNT(*) as count 
      FROM shipments 
      WHERE carrier_tracking_number IS NOT NULL 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('\n=== Current Status Distribution (with tracking) ===');
    statusCounts.rows.forEach(row => {
      console.log(`${row.status}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Error updating pre-transit status:', error);
  }
}

updatePreTransitStatus();