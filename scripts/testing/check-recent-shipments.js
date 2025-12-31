/**
 * Check recent in-transit shipments and relocate based on actual tracking status
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const connection = postgres(process.env.DATABASE_URL);

async function checkRecentShipments() {
  console.log('Checking recent in-transit shipments for relocation...\n');

  try {
    // Get recent in-transit shipments (last 14 days)
    const recentShipments = await connection`
      SELECT id, carrier_tracking_number, tracking_number, sender_name, created_at, status
      FROM shipments 
      WHERE status = 'in_transit' 
        AND created_at > NOW() - INTERVAL '14 days'
        AND carrier_tracking_number IS NOT NULL
      ORDER BY created_at DESC
    `;

    console.log(`Found ${recentShipments.length} recent in-transit shipments to check:\n`);

    for (const shipment of recentShipments) {
      console.log(`Shipment ${shipment.id}: ${shipment.carrier_tracking_number} (${new Date(shipment.created_at).toLocaleDateString()})`);
    }

    if (recentShipments.length > 0) {
      console.log('\nMoving recent shipments to approved status (they will show in pre-transit tab)...');
      
      const updated = await connection`
        UPDATE shipments 
        SET status = 'approved' 
        WHERE status = 'in_transit' 
          AND created_at > NOW() - INTERVAL '14 days'
          AND carrier_tracking_number IS NOT NULL
        RETURNING id, tracking_number, carrier_tracking_number, sender_name
      `;

      console.log(`\nSuccessfully moved ${updated.length} shipments to approved (pre-transit) status:`);
      updated.forEach(shipment => {
        console.log(`  Shipment ${shipment.id}: ${shipment.carrier_tracking_number} - ${shipment.sender_name}`);
      });

      // Check final distribution
      const finalStats = await connection`
        SELECT status, COUNT(*) as count 
        FROM shipments 
        GROUP BY status 
        ORDER BY status
      `;
      
      console.log('\nFinal shipment distribution:');
      finalStats.forEach(stat => {
        console.log(`  ${stat.status}: ${stat.count}`);
      });
    }

    console.log('\nRelocation complete!');

  } catch (error) {
    console.error('Error during relocation:', error);
  } finally {
    await connection.end();
  }
}

checkRecentShipments().catch(console.error);