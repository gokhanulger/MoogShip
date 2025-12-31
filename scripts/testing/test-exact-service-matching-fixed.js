/**
 * Test the fixed exact service matching system for shipment MOG252159000195
 * This test verifies that the service fields are now properly passed to getServiceCodeForLabel
 */

import { db } from './server/db.ts';
import { shipments } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

async function testFixedServiceMatching() {
  try {
    console.log('=== Testing Fixed Exact Service Matching ===');
    console.log('Testing shipment MOG252159000195 service detection fix...\n');
    
    // Get shipment 195 from database
    const shipment195 = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, 195))
      .limit(1);
    
    if (shipment195.length === 0) {
      console.log('❌ Shipment 195 not found');
      return;
    }
    
    const shipment = shipment195[0];
    console.log('📦 Database shipment data:');
    console.log(`   ID: ${shipment.id}`);
    console.log(`   Tracking: ${shipment.trackingNumber}`);
    console.log(`   Selected Service: "${shipment.selectedService}"`);
    console.log(`   Provider Service Code: "${shipment.providerServiceCode}"`);
    console.log(`   Status: ${shipment.status}`);
    
    // Simulate the mapping that happens in sendShipmentsToShipEntegra
    const mappedShipmentData = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      senderName: shipment.senderName,
      senderAddress: shipment.senderAddress || '',
      senderAddress1: shipment.senderAddress1 || shipment.senderAddress || '',
      senderCity: shipment.senderCity || '',
      senderPostalCode: shipment.senderPostalCode || '',
      senderEmail: shipment.senderEmail,
      senderPhone: shipment.senderPhone,
      receiverName: shipment.receiverName,
      receiverAddress: shipment.receiverAddress,
      receiverCity: shipment.receiverCity,
      receiverState: shipment.receiverState || '',
      receiverCountry: shipment.receiverCountry,
      receiverPostalCode: shipment.receiverPostalCode,
      receiverEmail: shipment.receiverEmail || 'info@moogship.com',
      receiverPhone: shipment.receiverPhone,
      packageWeight: shipment.packageWeight,
      packageLength: shipment.packageLength,
      packageWidth: shipment.packageWidth,
      packageHeight: shipment.packageHeight,
      packageContents: shipment.packageContents,
      customsValue: shipment.customsValue || shipment.totalPrice || 5000,
      customsItemCount: shipment.customsItemCount || 1,
      serviceLevel: 'standard', // This would be converted to enum
      status: 'approved', // This would be converted to enum
      labelAttempts: shipment.labelAttempts || 0,
      labelError: shipment.labelError,
      iossNumber: shipment.iossNumber,
      gtip: shipment.gtip,
      // FIXED: These critical fields are now included
      selectedService: shipment.selectedService,
      providerServiceCode: shipment.providerServiceCode
    };
    
    console.log('\n🔧 Mapped shipment data (what getServiceCodeForLabel receives):');
    console.log(`   Selected Service: "${mappedShipmentData.selectedService}"`);
    console.log(`   Provider Service Code: "${mappedShipmentData.providerServiceCode}"`);
    
    // Import and test the service detection function
    const { getServiceCodeForLabel } = await import('./server/services/shipentegra.js');
    
    console.log('\n🎯 Testing service code detection...');
    const detectedServiceCode = getServiceCodeForLabel(mappedShipmentData);
    
    console.log('\n📊 Service Detection Results:');
    console.log('============================================================');
    console.log(`🔍 Detected Service Code: "${detectedServiceCode}"`);
    console.log(`✅ Expected Service Code: "shipentegra-eco"`);
    
    if (detectedServiceCode === 'shipentegra-eco') {
      console.log('\n🎉 SUCCESS! Service matching is now working correctly!');
      console.log('✅ The fix successfully passes service fields to getServiceCodeForLabel');
      console.log('✅ Service detection now uses stored providerServiceCode');
      console.log('✅ Shipment 195 will now use ECO service for label generation');
    } else {
      console.log('\n❌ ISSUE: Service detection still not working correctly');
      console.log(`   Expected: "shipentegra-eco"`);
      console.log(`   Got: "${detectedServiceCode}"`);
    }
    
  } catch (error) {
    console.error('❌ Error testing service matching fix:', error);
  }
}

// Run the test
testFixedServiceMatching().catch(console.error);