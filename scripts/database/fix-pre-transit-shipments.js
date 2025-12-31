/**
 * Fix shipments that were incorrectly moved to IN_TRANSIT status
 * when they should remain APPROVED (pre-transit - label created but not picked up)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Create database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function fixPreTransitShipments() {
  console.log("Starting pre-transit shipment status fix...");
  
  try {
    // Get all shipments that are currently IN_TRANSIT and have carrier tracking numbers
    const result = await sql`
      SELECT id, carrier_tracking_number, status, tracking_info 
      FROM shipments 
      WHERE status = 'in_transit' 
      AND carrier_tracking_number IS NOT NULL 
      AND carrier_tracking_number != ''
      ORDER BY id
    `;
    
    console.log(`Found ${result.length} IN_TRANSIT shipments with tracking numbers`);
    
    let checkedCount = 0;
    let fixedCount = 0;
    let errorCount = 0;
    
    // Import UPS tracking service
    const { trackPackage } = await import('./server/services/ups.ts');
    
    for (const shipment of result) {
      try {
        checkedCount++;
        console.log(`\nChecking shipment ${shipment.id} (${shipment.carrier_tracking_number})...`);
        
        // Get current UPS status
        const upsData = await trackPackage(shipment.carrier_tracking_number);
        
        console.log(`  UPS Status: ${upsData.status}`);
        console.log(`  UPS Description: ${upsData.statusDescription}`);
        
        // Check if this should be PRE_TRANSIT (label created but not picked up)
        if (upsData.status === 'PRE_TRANSIT') {
          console.log(`  ✓ FIXING: Moving shipment ${shipment.id} from IN_TRANSIT back to APPROVED (pre-transit)`);
          
          // Update shipment status back to APPROVED
          await sql`
            UPDATE shipments 
            SET status = 'approved', updated_at = NOW()
            WHERE id = ${shipment.id}
          `;
          
          fixedCount++;
        } else if (upsData.status === 'IN_TRANSIT' || upsData.status === 'OUT_FOR_DELIVERY') {
          console.log(`  ✓ CORRECT: Shipment ${shipment.id} is properly IN_TRANSIT`);
        } else if (upsData.status === 'DELIVERED') {
          console.log(`  ✓ UPDATE: Shipment ${shipment.id} should be DELIVERED`);
          
          await sql`
            UPDATE shipments 
            SET status = 'delivered', updated_at = NOW()
            WHERE id = ${shipment.id}
          `;
          
          fixedCount++;
        } else {
          console.log(`  ? UNKNOWN: Shipment ${shipment.id} has unknown status: ${upsData.status}`);
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`  ❌ ERROR checking shipment ${shipment.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log("\n=== Pre-transit shipment fix completed ===");
    console.log(`  - Total checked: ${checkedCount}`);
    console.log(`  - Fixed: ${fixedCount}`);
    console.log(`  - Errors: ${errorCount}`);
    
    // Show updated status distribution
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
      checked: checkedCount,
      fixed: fixedCount,
      errors: errorCount
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