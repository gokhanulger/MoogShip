/**
 * Comprehensive fix for double multiplication pricing issues
 * This script corrects all shipments where prices were incorrectly multiplied twice
 */

import pg from 'pg';
const { Client } = pg;

async function fixDoubleMultiplicationIssues() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Find all shipments with pricing inconsistencies
    const result = await client.query(`
      SELECT id, total_price, original_total_price, applied_multiplier, base_price, fuel_charge, original_base_price, original_fuel_charge,
        ROUND(original_total_price * applied_multiplier) as expected_total,
        (total_price - ROUND(original_total_price * applied_multiplier)) as price_diff
      FROM shipments 
      WHERE applied_multiplier IS NOT NULL 
        AND applied_multiplier > 1 
        AND original_total_price IS NOT NULL
        AND ABS(total_price - ROUND(original_total_price * applied_multiplier)) > 50
      ORDER BY id DESC
    `);

    let fixedCount = 0;
    let zeropriceFixed = 0;

    for (const row of result.rows) {
      const { id, total_price, original_total_price, applied_multiplier, base_price, fuel_charge, original_base_price, original_fuel_charge, expected_total, price_diff } = row;
      
      // Handle zero price shipments (shipments 230, 229, 217)
      if (total_price === 0) {
        const correctCustomerPrice = Math.round(original_total_price * applied_multiplier);
        const correctBasePrice = original_base_price ? Math.round(original_base_price * applied_multiplier) : null;
        const correctFuelPrice = original_fuel_charge ? Math.round(original_fuel_charge * applied_multiplier) : null;

        await client.query(`
          UPDATE shipments 
          SET 
            total_price = $1,
            base_price = $2,
            fuel_charge = $3
          WHERE id = $4
        `, [correctCustomerPrice, correctBasePrice, correctFuelPrice, id]);

        zeropriceFixed++;
        fixedCount++;
        continue;
      }

      // Handle double-multiplied shipments
      if (price_diff > 100) { // If price difference is more than $1.00
        // The current total_price appears to be double-multiplied
        // We need to reverse-engineer the correct cost price
        const assumedCostPrice = Math.round(total_price / (applied_multiplier * applied_multiplier));
        const correctCustomerPrice = Math.round(assumedCostPrice * applied_multiplier);
        
        // Calculate component prices
        let correctCostBase = null;
        let correctCostFuel = null;
        let correctCustomerBase = null;
        let correctCustomerFuel = null;

        if (base_price && fuel_charge) {
          // Reverse-engineer cost components
          correctCostBase = Math.round(base_price / (applied_multiplier * applied_multiplier));
          correctCostFuel = Math.round(fuel_charge / (applied_multiplier * applied_multiplier));
          correctCustomerBase = Math.round(correctCostBase * applied_multiplier);
          correctCustomerFuel = Math.round(correctCostFuel * applied_multiplier);
        }

        await client.query(`
          UPDATE shipments 
          SET 
            original_total_price = $1,
            total_price = $2,
            original_base_price = $3,
            base_price = $4,
            original_fuel_charge = $5,
            fuel_charge = $6
          WHERE id = $7
        `, [
          assumedCostPrice, 
          correctCustomerPrice,
          correctCostBase,
          correctCustomerBase,
          correctCostFuel,
          correctCustomerFuel,
          id
        ]);

        console.log(`   ✅ Fixed double multiplication:`);
        console.log(`      Cost: $${(assumedCostPrice / 100).toFixed(2)} → Customer: $${(correctCustomerPrice / 100).toFixed(2)}`);
        fixedCount++;
      }
    }

    const verification = await client.query(`
      SELECT COUNT(*) as remaining_issues
      FROM shipments 
      WHERE applied_multiplier IS NOT NULL 
        AND applied_multiplier > 1 
        AND original_total_price IS NOT NULL
        AND total_price > 0
        AND ABS(total_price - ROUND(original_total_price * applied_multiplier)) > 50
    `);

  } catch (error) {
  } finally {
    await client.end();
  }
}

// Run the fix
fixDoubleMultiplicationIssues();