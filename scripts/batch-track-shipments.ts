/**
 * Batch Track Shipments Script
 * 
 * This script runs the batch tracking functionality to update the tracking
 * information for all shipments with carrier tracking numbers.
 */

import { batchTrackShipments } from '../server/services/batchTracking';

async function main() {
  try {
    console.log('Starting batch tracking for all shipments...');
    
    const result = await batchTrackShipments();
    
    console.log('\n--- Batch Tracking Results ---');
    console.log(`Total Shipments: ${result.totalShipments}`);
    console.log(`Processed: ${result.processedShipments}`);
    console.log(`Updated: ${result.updatedShipments}`);
    console.log(`Failed: ${result.failedShipments}`);
    
    if (result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. Tracking Number: ${error.trackingNumber}`);
        console.log(`   Error: ${error.error}`);
      });
    }
    
    if (result.results.length > 0) {
      console.log('\nResults:');
      result.results.forEach((item, index) => {
        console.log(`${index + 1}. Shipment ID: ${item.shipmentId}`);
        console.log(`   Tracking Number: ${item.trackingNumber}`);
        console.log(`   Carrier Tracking Number: ${item.carrierTrackingNumber}`);
        console.log(`   Status: ${item.previousStatus} → ${item.newStatus}`);
        if (item.trackingInfo.status) {
          console.log(`   Carrier Status: ${item.trackingInfo.status}`);
        }
        if (item.trackingInfo.location) {
          console.log(`   Location: ${item.trackingInfo.location}`);
        }
        console.log('---');
      });
    }
    
    console.log('\nBatch tracking completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error in batch tracking script:', error);
    process.exit(1);
  }
}

main();