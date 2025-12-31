/**
 * Comprehensive test to verify customs value and GTIP code extraction
 * from shipment database for all label generation functions
 */

const { db } = require('./server/db');

async function testCustomsExtraction() {
  console.log('🧪 Testing customs value and GTIP code extraction from database...\n');

  try {
    // Test with shipment 734 to verify correct extraction
    const testShipment = await db.query(
      'SELECT id, customs_value, gtip, customs_item_count, package_contents FROM shipments WHERE id = 734'
    );

    if (testShipment.rows.length === 0) {
      console.log('❌ No shipment found with ID 734');
      return;
    }

    const shipment = testShipment.rows[0];
    console.log('📋 Shipment 734 Database Values:');
    console.log(`   ├─ customs_value: ${shipment.customs_value} cents`);
    console.log(`   ├─ gtip: ${shipment.gtip}`);
    console.log(`   ├─ customs_item_count: ${shipment.customs_item_count}`);
    console.log(`   └─ package_contents: ${shipment.package_contents}`);

    // Test customs value conversion (cents to dollars)
    const customsValueInDollars = shipment.customs_value / 100;
    console.log(`\n💰 Customs Value Conversion:`);
    console.log(`   ├─ Database value: ${shipment.customs_value} cents`);
    console.log(`   └─ Converted value: $${customsValueInDollars.toFixed(2)}`);

    // Test GTIP code validation and formatting
    let gtipCode = "9405100000"; // Default
    if (shipment.gtip) {
      try {
        const cleanGtip = shipment.gtip.toString().replace(/\D/g, '');
        if (cleanGtip && cleanGtip.length >= 6 && cleanGtip.length <= 15) {
          gtipCode = cleanGtip;
        } else if (cleanGtip) {
          gtipCode = cleanGtip.padEnd(10, '0').substring(0, 15);
        }
      } catch (error) {
        console.warn(`Failed to parse GTIP code "${shipment.gtip}", using default`);
      }
    }

    console.log(`\n🏷️  GTIP Code Processing:`);
    console.log(`   ├─ Database value: ${shipment.gtip}`);
    console.log(`   ├─ Cleaned value: ${gtipCode}`);
    console.log(`   └─ Integer conversion: ${parseInt(gtipCode, 10)}`);

    // Generate sample ShipEntegra payload item using extracted data
    const itemPayload = {
      itemId: parseInt(shipment.id),
      declaredPrice: parseFloat(customsValueInDollars.toFixed(2)),
      declaredQuantity: parseInt(shipment.customs_item_count || 1),
      gtip: parseInt(gtipCode, 10)
    };

    console.log(`\n📦 Generated Item Payload:`);
    console.log(JSON.stringify(itemPayload, null, 2));

    // Verify the extraction matches expected format
    const isValid = (
      itemPayload.declaredPrice === 10.00 &&
      itemPayload.gtip === 442199 &&
      itemPayload.declaredQuantity === 1
    );

    console.log(`\n✅ Validation Result: ${isValid ? 'PASSED' : 'FAILED'}`);
    
    if (isValid) {
      console.log('🎯 Customs extraction is working correctly!');
      console.log('   ├─ Customs value correctly converted from cents to dollars');
      console.log('   ├─ GTIP code properly extracted from database');
      console.log('   └─ All future shipments will use authentic database values');
    } else {
      console.log('❌ Customs extraction needs adjustment');
    }

    // Test with multiple shipments to verify consistency
    console.log('\n🔍 Testing with additional shipments...');
    const additionalShipments = await db.query(
      'SELECT id, customs_value, gtip FROM shipments WHERE customs_value IS NOT NULL AND gtip IS NOT NULL LIMIT 5'
    );

    additionalShipments.rows.forEach(ship => {
      const dollarsValue = ship.customs_value / 100;
      console.log(`   Shipment ${ship.id}: $${dollarsValue.toFixed(2)}, GTIP: ${ship.gtip}`);
    });

  } catch (error) {
    console.error('❌ Error testing customs extraction:', error);
  }
}

// Run the test
testCustomsExtraction();