/**
 * Fix admin "Original Price" column to display actual ShipEntegra cost prices
 * instead of customer prices. This ensures proper financial visibility for admins.
 */

// Use the existing database connection from the project
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { eq, isNotNull } = require('drizzle-orm');

// Simplified schema definition for this script
const { pgTable, text, serial, integer, real, timestamp } = require('drizzle-orm/pg-core');

const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  totalPrice: integer("total_price"),
  originalTotalPrice: integer("original_total_price"),
  appliedMultiplier: real("applied_multiplier"),
  basePrice: integer("base_price"),
  fuelCharge: integer("fuel_charge"),
  originalBasePrice: integer("original_base_price"),
  originalFuelCharge: integer("original_fuel_charge")
});

async function fixAdminOriginalPrices() {
  console.log('🔧 FIXING ADMIN ORIGINAL PRICE DISPLAY');
  console.log('=' .repeat(60));
  
  // Create database connection using the same method as the main app
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);
  
  try {
    // Get all shipments where originalTotalPrice exists
    const shipmentsWithOriginalPrices = await db
      .select()
      .from(shipments)
      .where(isNotNull(shipments.originalTotalPrice));
    
    console.log(`📊 Found ${shipmentsWithOriginalPrices.length} shipments with originalTotalPrice data`);
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    let issuesFound = 0;
    
    for (const shipment of shipmentsWithOriginalPrices) {
      const shipmentId = shipment.id;
      const customerPrice = shipment.totalPrice; // What customer pays
      const storedOriginalPrice = shipment.originalTotalPrice; // What's currently stored as "original"
      const appliedMultiplier = shipment.appliedMultiplier || 1.0;
      
      // Calculate what the true ShipEntegra cost should be
      const trueShipEntegraCost = Math.round(customerPrice / appliedMultiplier);
      
      console.log(`\n📦 Shipment #${shipmentId}:`);
      console.log(`  💰 Customer Price: $${(customerPrice / 100).toFixed(2)}`);
      console.log(`  📋 Stored "Original": $${(storedOriginalPrice / 100).toFixed(2)}`);
      console.log(`  🔢 Applied Multiplier: ${appliedMultiplier}`);
      console.log(`  🎯 True ShipEntegra Cost: $${(trueShipEntegraCost / 100).toFixed(2)}`);
      
      // Check if originalTotalPrice is incorrectly storing customer price
      if (Math.abs(storedOriginalPrice - customerPrice) < 10) { // Within 10 cents (same price)
        console.log(`  ❌ ISSUE: originalTotalPrice contains customer price instead of cost price`);
        
        // Update to store the true ShipEntegra cost
        await db
          .update(shipments)
          .set({
            originalTotalPrice: trueShipEntegraCost,
            originalBasePrice: shipment.originalBasePrice ? 
              Math.round(shipment.originalBasePrice / appliedMultiplier) : 
              Math.round((shipment.basePrice || 0) / appliedMultiplier),
            originalFuelCharge: shipment.originalFuelCharge ? 
              Math.round(shipment.originalFuelCharge / appliedMultiplier) : 
              Math.round((shipment.fuelCharge || 0) / appliedMultiplier)
          })
          .where(eq(shipments.id, shipmentId));
          
        console.log(`  ✅ FIXED: Updated originalTotalPrice to $${(trueShipEntegraCost / 100).toFixed(2)}`);
        fixedCount++;
        
      } else if (Math.abs(storedOriginalPrice - trueShipEntegraCost) < 10) { // Already correct
        console.log(`  ✅ CORRECT: originalTotalPrice already contains proper cost price`);
        alreadyCorrect++;
        
      } else {
        console.log(`  ⚠️  UNUSUAL: Stored original price doesn't match expected patterns`);
        console.log(`    Expected cost: $${(trueShipEntegraCost / 100).toFixed(2)}`);
        console.log(`    Current stored: $${(storedOriginalPrice / 100).toFixed(2)}`);
        console.log(`    Customer price: $${(customerPrice / 100).toFixed(2)}`);
        issuesFound++;
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`  ✅ Fixed shipments: ${fixedCount}`);
    console.log(`  ✅ Already correct: ${alreadyCorrect}`);
    console.log(`  ⚠️  Issues found: ${issuesFound}`);
    console.log(`  📋 Total processed: ${shipmentsWithOriginalPrices.length}`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS: Admin "Original Price" column will now display true ShipEntegra cost prices!');
      console.log('💡 Admins can now see proper cost vs customer price breakdown for financial analysis.');
    } else if (alreadyCorrect === shipmentsWithOriginalPrices.length) {
      console.log('\n✅ All shipments already have correct originalTotalPrice values.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin original prices:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixAdminOriginalPrices()
    .then(() => {
      console.log('\n🏁 Fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix failed:', error);
      process.exit(1);
    });
}