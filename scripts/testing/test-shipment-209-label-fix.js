/**
 * Test actual label generation for shipment MOG252722000209 after legacy UPS mapping fix
 */

import { db } from './server/db.ts';
import { shipments } from './shared/schema.ts';
import { eq } from 'drizzle-orm';
import { createShipentegraOrderAndLabel } from './server/services/shipentegra.ts';

async function testShipment209LabelGeneration() {
  console.log('🔧 Testing Shipment MOG252722000209 Label Generation After Fix');
  console.log('============================================================');

  try {
    // Get the specific failing shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, 209))
      .limit(1);

    if (!shipment) {
      console.log('❌ Shipment #209 not found');
      return;
    }

    console.log('✅ Found shipment #209');
    console.log(`📋 Selected Service: "${shipment.selectedService}"`);
    console.log(`📋 Provider Service Code: "${shipment.providerServiceCode}"`);
    console.log(`📋 Current Status: ${shipment.status}`);
    console.log(`📋 Tracking Number: ${shipment.trackingNumber}`);
    console.log(`📋 Previous Error: ${shipment.labelError}`);

    // Prepare shipment data for label generation
    const shipmentData = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      senderName: shipment.senderName,
      senderAddress1: shipment.senderAddress1,
      senderCity: shipment.senderCity,
      senderPostalCode: shipment.senderPostalCode,
      senderEmail: shipment.senderEmail || 'test@moogship.com',
      senderPhone: shipment.senderPhone,
      receiverName: shipment.receiverName,
      receiverAddress: shipment.receiverAddress,
      receiverCity: shipment.receiverCity,
      receiverState: shipment.receiverState,
      receiverCountry: shipment.receiverCountry,
      receiverPostalCode: shipment.receiverPostalCode,
      receiverEmail: shipment.receiverEmail || 'receiver@example.com',
      receiverPhone: shipment.receiverPhone,
      packageWeight: shipment.packageWeight,
      packageLength: shipment.packageLength,
      packageWidth: shipment.packageWidth,
      packageHeight: shipment.packageHeight,
      serviceLevel: shipment.serviceLevel,
      status: shipment.status,
      description: shipment.packageContents || 'General goods',
      customsValue: shipment.declaredValue || 5000, // 50 USD in cents
      customsItemCount: 1,
      packageContents: shipment.packageContents || 'General goods',
      selectedService: shipment.selectedService,
      providerServiceCode: shipment.providerServiceCode
    };

    console.log('\n🎯 Testing Label Generation with Fixed Service Mapping...');
    console.log('Expected behavior:');
    console.log('- Legacy "UPS" provider code should map to "shipentegra-ups-ekspress"');
    console.log('- API should use UPS endpoint with specialService: "express"');
    console.log('- Label generation should succeed without validation errors');

    // Attempt label generation
    const result = await createShipentegraOrderAndLabel(shipmentData);

    console.log('\n📊 Label Generation Result:');
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    
    if (result.success) {
      console.log('✅ Label generation successful!');
      console.log('Tracking Numbers:', result.trackingNumbers);
      console.log('Carrier Tracking Numbers:', result.carrierTrackingNumbers);
      console.log('Label URLs:', result.labelUrls);
    } else {
      console.log('❌ Label generation failed');
      console.log('Errors:', result.shipmentErrors);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testShipment209LabelGeneration().catch(console.error);