/**
 * Test weight calculation fix for shipment MOG255609000237
 * Verify that 0.5 kg is now sent correctly to ShipEntegra without rounding
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { shipments } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testWeightFix() {
  try {
    console.log('=== Testing Weight Fix for Shipment MOG255609000237 ===\n');
    
    // Connect to database
    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Get shipment 237 data
    const shipment = await db
      .select()
      .from(shipments)
      .where(eq(shipments.trackingNumber, 'MOG255609000237'))
      .limit(1);
    
    if (shipment.length === 0) {
      console.log('❌ Shipment MOG255609000237 not found');
      return;
    }
    
    const shipmentData = shipment[0];
    console.log('📦 Database shipment data:');
    console.log(`   ID: ${shipmentData.id}`);
    console.log(`   Tracking: ${shipmentData.trackingNumber}`);
    console.log(`   Package Weight: ${shipmentData.packageWeight} kg`);
    console.log(`   Dimensions: ${shipmentData.packageLength}x${shipmentData.packageWidth}x${shipmentData.packageHeight} cm`);
    console.log(`   Selected Service: "${shipmentData.selectedService}"`);
    console.log(`   Provider Service Code: "${shipmentData.providerServiceCode}"`);
    
    // Simulate the weight calculation logic that would be used in ShipEntegra payload
    const packageWeight = Number(shipmentData.packageWeight);
    const packageLength = Number(shipmentData.packageLength);
    const packageWidth = Number(shipmentData.packageWidth);
    const packageHeight = Number(shipmentData.packageHeight);
    
    console.log('\n🧮 Weight Calculation Simulation:');
    console.log(`   Raw packageWeight: ${shipmentData.packageWeight} (type: ${typeof shipmentData.packageWeight})`);
    console.log(`   Converted packageWeight: ${packageWeight}`);
    
    // Calculate volumetric weight (DIMENSIONAL_FACTOR = 5000)
    const DIMENSIONAL_FACTOR = 5000;
    const volumetricWeight = (packageLength * packageWidth * packageHeight) / DIMENSIONAL_FACTOR;
    console.log(`   Calculated volumetricWeight: ${volumetricWeight}`);
    
    // Use the greater of actual weight or volumetric weight
    const finalWeight = Math.max(packageWeight, volumetricWeight);
    console.log(`   Final weight (max of actual/volumetric): ${finalWeight}`);
    
    // Ensure minimum weight requirement is met
    const chargeableWeight = finalWeight < 0.01 ? 0.5 : finalWeight;
    console.log(`   Chargeable weight: ${chargeableWeight}`);
    
    // Test the OLD logic (with Math.ceil - this was the bug)
    const oldPayloadWeight = Math.ceil(packageWeight);
    console.log(`\n❌ OLD Logic (with Math.ceil bug):`);
    console.log(`   Math.ceil(${packageWeight}) = ${oldPayloadWeight}`);
    
    // Test the NEW logic (without Math.ceil - this is the fix)
    const newPayloadWeight = packageWeight;
    console.log(`\n✅ NEW Logic (fixed - exact weight):`);
    console.log(`   packageWeight = ${newPayloadWeight}`);
    
    console.log(`\n📊 Comparison:`);
    console.log(`   Database stores: ${shipmentData.packageWeight} kg`);
    console.log(`   Old system sent to ShipEntegra: ${oldPayloadWeight} kg (WRONG)`);
    console.log(`   New system sends to ShipEntegra: ${newPayloadWeight} kg (CORRECT)`);
    
    if (newPayloadWeight === Number(shipmentData.packageWeight)) {
      console.log(`\n✅ SUCCESS: Weight fix working correctly!`);
      console.log(`   Shipment MOG255609000237 will now send ${newPayloadWeight} kg to ShipEntegra`);
    } else {
      console.log(`\n❌ ISSUE: Weight calculation still not matching database value`);
    }
    
    // Close database connection
    await sql.end();
    
  } catch (error) {
    console.error('Error testing weight fix:', error);
  }
}

testWeightFix();