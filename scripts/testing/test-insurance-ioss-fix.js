/**
 * Test script to verify and fix insurance boolean and IOSS field transfer
 */

import pg from 'pg';
const { Pool } = pg;

async function testInsuranceAndIOSSFix() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('🧪 Testing current database state for shipment 766...');
    
    const result = await pool.query(
      'SELECT id, customs_value, gtip, insurance_value, is_insured, ioss_number FROM shipments WHERE id = 766'
    );
    
    const shipment = result.rows[0];
    console.log('📊 Current database values:', shipment);
    
    // Expected fix: is_insured should be true when insurance_value > 0
    const shouldBeInsured = shipment.insurance_value > 0;
    console.log(`✅ Insurance value: ${shipment.insurance_value} (should set is_insured to ${shouldBeInsured})`);
    
    // Test if IOSS number field exists and is populated
    console.log(`📋 IOSS number: "${shipment.ioss_number}" (should contain tax ID)`);
    
    // Fix the insurance boolean if needed
    if (shipment.insurance_value > 0 && !shipment.is_insured) {
      console.log('🔧 Fixing insurance boolean flag...');
      await pool.query(
        'UPDATE shipments SET is_insured = true WHERE id = 766'
      );
      console.log('✅ Fixed insurance boolean flag');
    }
    
    // Show the fixed state
    const fixedResult = await pool.query(
      'SELECT id, customs_value, gtip, insurance_value, is_insured, ioss_number FROM shipments WHERE id = 766'
    );
    
    console.log('🎯 Final database state:', fixedResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await pool.end();
  }
}

testInsuranceAndIOSSFix();