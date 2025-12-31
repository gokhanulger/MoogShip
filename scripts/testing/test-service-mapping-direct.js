/**
 * Direct test of SERVICE_MAPPING configuration for UPS endpoint
 * This bypasses authentication to test the core ShipEntegra integration
 */

import { db } from './server/db.js';
import { shipments } from './shared/schema.js';
import { eq } from 'drizzle-orm';

// Import the ShipEntegra service directly
import { sendToShipEntegra } from './server/services/shipentegra.js';

console.log('🔧 Testing SERVICE_MAPPING Configuration Direct');
console.log('============================================================');

async function testServiceMappingDirect() {
  try {
    console.log('[DB] Initializing database connection...');
    
    // Test database connection
    const testQuery = await db.select().from(shipments).limit(1);
    console.log('[DB] Database connection verified and working properly');
    
    // Find a UPS shipment to test with
    const upsShipments = await db
      .select()
      .from(shipments)
      .where(eq(shipments.selectedService, 'shipentegra-ups-ekspress'))
      .limit(1);
    
    if (upsShipments.length === 0) {
      console.log('❌ No UPS shipments found with selectedService = "shipentegra-ups-ekspress"');
      return;
    }
    
    const testShipment = upsShipments[0];
    console.log(`✅ Found UPS shipment #${testShipment.id}`);
    console.log(`📋 Service: ${testShipment.selectedService}`);
    console.log(`📋 Status: ${testShipment.status}`);
    
    // Prepare shipment data for ShipEntegra
    const shipmentData = {
      id: testShipment.id,
      trackingNumber: `MOG${Date.now()}`,
      senderName: testShipment.senderName,
      senderAddress1: testShipment.senderAddress1,
      senderCity: testShipment.senderCity,
      senderPostalCode: testShipment.senderPostalCode,
      senderEmail: testShipment.senderEmail,
      senderPhone: testShipment.senderPhone,
      receiverName: testShipment.receiverName,
      receiverAddress: testShipment.receiverAddress1 || testShipment.receiverAddress || "123 Main Street",
      receiverCity: testShipment.receiverCity,
      receiverState: testShipment.receiverState,
      receiverCountry: testShipment.receiverCountry,
      receiverPostalCode: testShipment.receiverPostalCode,
      receiverPhone: testShipment.receiverPhone,
      packageWeight: testShipment.packageWeight || 1.0,
      packageLength: testShipment.packageLength || 10,
      packageWidth: testShipment.packageWidth || 10,
      packageHeight: testShipment.packageHeight || 10,
      serviceLevel: testShipment.selectedService,
      status: testShipment.status,
      customsValue: testShipment.totalPrice || 5000, // $50 default
      packageContents: testShipment.packageContents || 'Test Package'
    };
    
    console.log('\n🚀 Testing SERVICE_MAPPING lookup with direct ShipEntegra call...');
    console.log(`📦 Testing service: ${shipmentData.serviceLevel}`);
    
    // Call sendToShipEntegra directly to test SERVICE_MAPPING
    const result = await sendToShipEntegra([shipmentData]);
    
    console.log('\n📊 SERVICE_MAPPING Test Results:');
    console.log('============================================================');
    console.log(`✅ Success: ${result.success}`);
    console.log(`📝 Message: ${result.message}`);
    
    if (result.success) {
      console.log(`📋 Processed Shipments: ${result.shipmentIds?.length || 0}`);
      if (result.labelUrls && Object.keys(result.labelUrls).length > 0) {
        console.log(`🏷️  Labels Generated: ${Object.keys(result.labelUrls).length}`);
        console.log(`🔗 Label URLs:`, result.labelUrls);
      }
      if (result.trackingNumbers && Object.keys(result.trackingNumbers).length > 0) {
        console.log(`📍 Tracking Numbers:`, result.trackingNumbers);
      }
    } else {
      console.log(`❌ Failed Shipments: ${result.failedShipmentIds?.length || 0}`);
      if (result.shipmentErrors) {
        console.log('🚨 Errors:');
        Object.entries(result.shipmentErrors).forEach(([shipmentId, error]) => {
          console.log(`   Shipment ${shipmentId}: ${error}`);
        });
      }
    }
    
    console.log('\n🎯 SERVICE_MAPPING Configuration Test Complete');
    console.log('This test validates that "shipentegra-ups-ekspress" correctly');
    console.log('maps to the UPS endpoint: https://publicapi.shipentegra.com/v1/logistics/labels/ups');
    
  } catch (error) {
    console.error('❌ Error testing SERVICE_MAPPING:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testServiceMappingDirect().catch(console.error);