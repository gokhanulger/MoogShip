/**
 * Test script to verify bulk shipment package creation fix
 * This will check if recent bulk shipments have proper package records
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testBulkPackageFix() {
  try {
    console.log('🔍 Testing bulk shipment package creation fix...');
    
    // Get recent shipments (last 10) to check for package records
    const shipmentsQuery = `
      SELECT 
        s.id,
        s.sender_name,
        s.receiver_name,
        s.created_at,
        s.package_weight,
        s.package_length,
        s.package_width,
        s.package_height,
        COUNT(p.id) as package_count
      FROM shipments s
      LEFT JOIN packages p ON s.id = p.shipment_id
      WHERE s.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY s.id, s.sender_name, s.receiver_name, s.created_at, s.package_weight, s.package_length, s.package_width, s.package_height
      ORDER BY s.created_at DESC
      LIMIT 10
    `;
    
    const result = await pool.query(shipmentsQuery);
    const shipments = result.rows;
    
    console.log(`\n📊 Found ${shipments.length} recent shipments:`);
    
    let shipmentsWithPackages = 0;
    let shipmentsWithoutPackages = 0;
    
    for (const shipment of shipments) {
      const hasPackages = shipment.package_count > 0;
      const status = hasPackages ? '✅' : '❌';
      
      console.log(`${status} Shipment #${shipment.id} (${shipment.receiver_name}): ${shipment.package_count} packages`);
      
      if (hasPackages) {
        shipmentsWithPackages++;
        
        // Get detailed package info for shipments with packages
        const packageQuery = `
          SELECT name, weight, length, width, height, description
          FROM packages 
          WHERE shipment_id = $1
        `;
        const packageResult = await pool.query(packageQuery, [shipment.id]);
        
        packageResult.rows.forEach((pkg, index) => {
          console.log(`   📦 Package ${index + 1}: ${pkg.name} - ${pkg.weight}kg, ${pkg.length}×${pkg.width}×${pkg.height}cm`);
        });
      } else {
        shipmentsWithoutPackages++;
        console.log(`   ⚠️  No packages found for shipment with dimensions: ${shipment.package_weight}kg, ${shipment.package_length}×${shipment.package_width}×${shipment.package_height}cm`);
      }
    }
    
    console.log('\n📈 Summary:');
    console.log(`✅ Shipments with packages: ${shipmentsWithPackages}`);
    console.log(`❌ Shipments without packages: ${shipmentsWithoutPackages}`);
    
    if (shipmentsWithoutPackages === 0) {
      console.log('🎉 SUCCESS: All recent shipments have proper package records!');
    } else {
      console.log(`🔧 NEEDS FIX: ${shipmentsWithoutPackages} shipments are missing package records`);
    }
    
    // Test the specific functionality that was broken
    console.log('\n🧪 Testing package editing functionality simulation...');
    
    if (shipments.length > 0) {
      const testShipment = shipments[0];
      
      if (testShipment.package_count > 0) {
        console.log(`✅ Shipment #${testShipment.id} has ${testShipment.package_count} packages - editing should work`);
      } else {
        console.log(`❌ Shipment #${testShipment.id} has no packages - would show "no packages found" error`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing bulk package fix:', error);
  } finally {
    await pool.end();
  }
}

testBulkPackageFix();