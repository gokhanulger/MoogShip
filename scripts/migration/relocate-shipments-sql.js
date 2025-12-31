/**
 * Simple SQL-based approach to relocate in-transit shipments
 * This will move shipments to the correct status based on their tracking data
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connection = postgres(process.env.DATABASE_URL);

async function relocateShipments() {
  console.log('Starting shipment relocation using SQL approach...\n');

  try {
    // First, check current distribution
    const currentStats = await connection`
      SELECT status, COUNT(*) as count 
      FROM shipments 
      GROUP BY status 
      ORDER BY status
    `;
    
    console.log('Current shipment distribution:');
    currentStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });
    console.log('');

    // Get in-transit shipments to analyze
    const inTransitShipments = await connection`
      SELECT id, status, carrier_tracking_number, tracking_number, sender_name, receiver_name, created_at
      FROM shipments 
      WHERE status = 'in_transit'
      ORDER BY id DESC
    `;

    console.log(`Found ${inTransitShipments.length} shipments marked as in_transit\n`);

    let relocated = 0;

    // Strategy 1: Move shipments without carrier tracking numbers back to approved
    const noCarrierTracking = await connection`
      UPDATE shipments 
      SET status = 'approved' 
      WHERE status = 'in_transit' 
        AND (carrier_tracking_number IS NULL OR carrier_tracking_number = '')
      RETURNING id, tracking_number, sender_name
    `;

    if (noCarrierTracking.length > 0) {
      console.log(`Strategy 1: Moved ${noCarrierTracking.length} shipments without carrier tracking to approved:`);
      noCarrierTracking.forEach(shipment => {
        console.log(`  Shipment ${shipment.id} (${shipment.tracking_number}) - ${shipment.sender_name}`);
      });
      console.log('');
      relocated += noCarrierTracking.length;
    }

    // Strategy 2: Check for recently created shipments (likely pre-transit)
    const recentShipments = await connection`
      UPDATE shipments 
      SET status = 'approved' 
      WHERE status = 'in_transit' 
        AND created_at > NOW() - INTERVAL '7 days'
        AND carrier_tracking_number IS NOT NULL
      RETURNING id, tracking_number, carrier_tracking_number, sender_name, created_at
    `;

    if (recentShipments.length > 0) {
      console.log(`Strategy 2: Moved ${recentShipments.length} recent shipments (likely pre-transit) to approved:`);
      recentShipments.forEach(shipment => {
        console.log(`  Shipment ${shipment.id} (${shipment.carrier_tracking_number}) - ${shipment.sender_name} - ${new Date(shipment.created_at).toLocaleDateString()}`);
      });
      console.log('');
      relocated += recentShipments.length;
    }

    // Check final distribution
    const finalStats = await connection`
      SELECT status, COUNT(*) as count 
      FROM shipments 
      GROUP BY status 
      ORDER BY status
    `;
    
    console.log('Final shipment distribution:');
    finalStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.count}`);
    });

    console.log(`\n=== RELOCATION SUMMARY ===`);
    console.log(`Total shipments relocated: ${relocated}`);
    console.log('Relocation complete!');

    // Show remaining in-transit shipments for manual review
    const remainingInTransit = await connection`
      SELECT id, carrier_tracking_number, tracking_number, sender_name, created_at
      FROM shipments 
      WHERE status = 'in_transit'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    if (remainingInTransit.length > 0) {
      console.log(`\nRemaining ${remainingInTransit.length} in-transit shipments for manual review:`);
      remainingInTransit.forEach(shipment => {
        console.log(`  Shipment ${shipment.id}: ${shipment.carrier_tracking_number} - ${shipment.sender_name} (${new Date(shipment.created_at).toLocaleDateString()})`);
      });
    }

  } catch (error) {
    console.error('Error during relocation:', error);
  } finally {
    await connection.end();
  }
}

// Run the relocation
relocateShipments().catch(console.error);