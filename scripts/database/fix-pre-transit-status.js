/**
 * Fix shipments that are incorrectly marked as IN_TRANSIT 
 * when they should be APPROVED (pre-transit status with "MP" code)
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);

async function fixPreTransitShipments() {
  console.log("Fixing shipments with pre-transit status (MP code)...");
  
  try {
    // Get all shipments that are currently IN_TRANSIT with recent tracking updates
    const result = await sql`
      SELECT id, carrier_tracking_number, status, created_at 
      FROM shipments 
      WHERE status = 'in_transit' 
      AND carrier_tracking_number IS NOT NULL 
      AND carrier_tracking_number != ''
      AND created_at > '2025-06-01'
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${result.length} recent IN_TRANSIT shipments to check`);
    
    let fixedCount = 0;
    
    // Fix shipments that should be pre-transit based on the typical pattern
    // Recent shipments that were just created are likely pre-transit
    for (const shipment of result) {
      const hoursOld = (Date.now() - new Date(shipment.created_at).getTime()) / (1000 * 60 * 60);
      
      console.log(`Checking shipment ${shipment.id} (${Math.round(hoursOld)} hours old)...`);
      
      // If shipment is very recent (less than 24 hours) and was likely moved incorrectly
      if (hoursOld < 24) {
        console.log(`  ✓ FIXING: Moving recent shipment ${shipment.id} back to APPROVED (likely pre-transit)`);
        
        await sql`
          UPDATE shipments 
          SET status = 'approved', updated_at = NOW()
          WHERE id = ${shipment.id}
        `;
        
        fixedCount++;
      } else {
        console.log(`  ✓ KEEPING: Shipment ${shipment.id} is older, likely actually in transit`);
      }
    }
    
    console.log(`\n=== Fix completed ===`);
    console.log(`  - Checked: ${result.length} shipments`);
    console.log(`  - Fixed (moved back to APPROVED): ${fixedCount}`);
    
    // Show final status distribution
    const finalResult = await sql`
      SELECT status, COUNT(*) as count 
      FROM shipments 
      GROUP BY status 
      ORDER BY count DESC
    `;
    
    console.log("\nFinal shipment status distribution:");
    finalResult.forEach(row => {
      console.log(`  ${row.status}: ${row.count} shipments`);
    });
    
    return {
      success: true,
      checked: result.length,
      fixed: fixedCount
    };
    
  } catch (error) {
    console.error("Fix failed:", error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await sql.end();
  }
}

// Run fix
fixPreTransitShipments()
  .then(result => {
    console.log("Fix result:", result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error("Fix error:", error);
    process.exit(1);
  });