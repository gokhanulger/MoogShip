/**
 * Comprehensive fix for bulk upload pricing bug
 * This script corrects all affected shipments and verifies the fix
 */

import pg from 'pg';

const { Client } = pg;

async function fixBulkPricingIssues() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Find all shipments with inflated pricing (likely from bulk upload)
    const inflatedShipments = await client.query(`
      SELECT id, total_price, base_price, fuel_charge, original_total_price, applied_multiplier, created_at
      FROM shipments 
      WHERE total_price > 50000  -- Prices over $500 are likely inflated
        AND created_at >= '2025-01-01'  -- Recent shipments
      ORDER BY id DESC
    `);

    console.log(`\n🔍 Found ${inflatedShipments.rows.length} shipments with potentially inflated pricing:`);

    let fixedCount = 0;
    
    for (const shipment of inflatedShipments.rows) {
      const { id, total_price, base_price, fuel_charge, original_total_price } = shipment;
      
      // Check if this looks like a 100x inflation (price should be divided by 100)
      const correctedTotal = Math.round(total_price / 100);
      const correctedBase = Math.round(base_price / 100);
      const correctedFuel = Math.round(fuel_charge / 100);
      const correctedOriginal = original_total_price ? Math.round(original_total_price / 100) : correctedTotal;
      
      // Only fix if the corrected price makes sense ($5-50 range)
      if (correctedTotal >= 500 && correctedTotal <= 5000) {
        console.log(`\n📝 Fixing shipment #${id}:`);
        console.log(`   Before: Total $${(total_price / 100).toFixed(2)}, Base $${(base_price / 100).toFixed(2)}, Fuel $${(fuel_charge / 100).toFixed(2)}`);
        console.log(`   After:  Total $${(correctedTotal / 100).toFixed(2)}, Base $${(correctedBase / 100).toFixed(2)}, Fuel $${(correctedFuel / 100).toFixed(2)}`);
        
        await client.query(`
          UPDATE shipments 
          SET 
            total_price = $1,
            base_price = $2,
            fuel_charge = $3,
            original_total_price = $4
          WHERE id = $5
        `, [correctedTotal, correctedBase, correctedFuel, correctedOriginal, id]);
        
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} shipments with inflated pricing`);

    // Verify the fix by checking recent shipments
    const verificationQuery = await client.query(`
      SELECT id, total_price, base_price, fuel_charge, created_at
      FROM shipments 
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log(`\n📊 Recent shipments verification (last 24 hours):`);
    for (const shipment of verificationQuery.rows) {
      const { id, total_price, base_price, fuel_charge } = shipment;
      console.log(`   Shipment #${id}: Total $${(total_price / 100).toFixed(2)}, Base $${(base_price / 100).toFixed(2)}, Fuel $${(fuel_charge / 100).toFixed(2)}`);
    }

    // Final health check
    const healthCheck = await client.query(`
      SELECT COUNT(*) as suspicious_count
      FROM shipments 
      WHERE total_price > 50000  -- Over $500
        AND created_at >= NOW() - INTERVAL '7 days'
    `);

    const suspiciousCount = parseInt(healthCheck.rows[0].suspicious_count);
    console.log(`\n🏥 Health Check: ${suspiciousCount} shipments with prices over $500 in last 7 days`);
    
    if (suspiciousCount === 0) {
      console.log('✅ All pricing appears normal!');
    } else {
      console.log('⚠️  Some high-priced shipments remain - may need manual review');
    }

  } catch (error) {
    console.error('❌ Error fixing bulk pricing issues:', error);
  } finally {
    await client.end();
  }
}

// Run the fix
fixBulkPricingIssues();