/**
 * Storage Layer Double Multiplication Fix Verification
 * Simple test to verify the fix is working correctly
 */

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

console.log('🧪 STORAGE LAYER DOUBLE MULTIPLICATION FIX VERIFICATION');
console.log('Testing that new shipments get proper cost/customer price separation...\n');

async function testStorageLayerFix() {
  try {
    // Check recent shipments to verify the fix
    console.log('📋 Checking recent shipments for proper pricing...');
    
    const result = await pool.query(`
      SELECT 
        id,
        total_price,
        original_total_price,
        applied_multiplier,
        (total_price != original_total_price) as prices_different,
        created_at
      FROM shipments 
      WHERE id >= 299
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log('Recent shipments analysis:');
    
    let correctShipments = 0;
    let buggyShipments = 0;
    
    for (const shipment of result.rows) {
      const customerPrice = (shipment.total_price / 100).toFixed(2);
      const costPrice = (shipment.original_total_price / 100).toFixed(2);
      const multiplier = shipment.applied_multiplier;
      const pricesDifferent = shipment.prices_different;
      
      console.log(`\n📦 Shipment #${shipment.id}:`);
      console.log(`   💰 Customer Price: $${customerPrice}`);
      console.log(`   💲 Cost Price: $${costPrice}`);
      console.log(`   📊 Multiplier: ${multiplier}`);
      console.log(`   ✅ Proper Separation: ${pricesDifferent ? 'YES' : 'NO'}`);
      
      if (pricesDifferent) {
        correctShipments++;
        console.log(`   🎉 CORRECT: Storage layer working properly`);
      } else {
        buggyShipments++;
        console.log(`   ❌ BUG: Identical prices detected - double multiplication issue`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   ✅ Correct shipments: ${correctShipments}`);
    console.log(`   ❌ Buggy shipments: ${buggyShipments}`);
    
    if (buggyShipments === 0) {
      console.log('\n🎉 SUCCESS: Storage layer fix is working correctly!');
      console.log('   All new shipments have proper cost/customer price separation');
      console.log('   Admin interface will show different "Orijinal Fiyat" and "Fiyat" values');
    } else {
      console.log('\n⚠️  WARNING: Some shipments still have double multiplication bug');
      console.log('   Storage layer fix may need additional work');
    }
    
    // Test the specific fix for shipment #301
    console.log('\n📋 Verifying shipment #301 correction...');
    const shipment301 = await pool.query(`
      SELECT 
        id,
        total_price,
        original_total_price,
        applied_multiplier
      FROM shipments 
      WHERE id = 301
    `);
    
    if (shipment301.rows.length > 0) {
      const s = shipment301.rows[0];
      const expectedCostPrice = Math.round(s.total_price / s.applied_multiplier);
      
      console.log(`Shipment #301 verification:`);
      console.log(`  Customer Price: $${(s.total_price / 100).toFixed(2)}`);
      console.log(`  Cost Price: $${(s.original_total_price / 100).toFixed(2)}`);
      console.log(`  Expected Cost: $${(expectedCostPrice / 100).toFixed(2)}`);
      
      if (s.original_total_price === expectedCostPrice) {
        console.log(`  ✅ FIXED: Shipment #301 has correct pricing`);
      } else {
        console.log(`  ❌ ERROR: Shipment #301 still has incorrect pricing`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

// Run verification
testStorageLayerFix();