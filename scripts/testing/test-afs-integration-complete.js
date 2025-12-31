/**
 * Test complete AFS Transport integration with shipment 696
 * Verify the routing fix is working and process with new API credentials
 */

import { storage } from '../../server/storage.js';
import { processAFSShipments } from '../../server/services/afstransport.js';

async function testCompleteAFSIntegration() {
  try {
    console.log('🔍 Testing AFS Transport integration with shipment 696...');
    
    // Get shipment 696 details
    const shipment = await storage.getShipment(696);
    if (!shipment) {
      console.log('❌ Shipment 696 not found');
      return;
    }
    
    console.log(`📦 Shipment 696 details:`);
    console.log(`   Service: ${shipment.selectedService}`);
    console.log(`   Carrier: ${shipment.carrierName}`);
    console.log(`   Provider: ${shipment.shippingProvider}`);
    console.log(`   Status: ${shipment.status}`);
    
    // Verify this is an AFS service
    const isAFSService = shipment.selectedService?.toLowerCase().includes('ecoafs') || 
                        shipment.selectedService?.startsWith('afs-') ||
                        shipment.carrierName?.includes('AFS');
    
    console.log(`🔍 Is AFS Service: ${isAFSService}`);
    
    if (!isAFSService) {
      console.log('⚠️ Shipment 696 is not an AFS service');
      return;
    }
    
    // Test the AFS routing logic
    console.log('\n🚛 Testing AFS Transport processing...');
    
    const afsShipment = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      senderName: shipment.senderName,
      senderAddress: shipment.senderAddress,
      senderCity: shipment.senderCity,
      senderPostalCode: shipment.senderPostalCode,
      senderPhone: shipment.senderPhone,
      senderCountry: shipment.senderCountry || 'TR',
      receiverName: shipment.receiverName,
      receiverAddress: shipment.receiverAddress,
      receiverCity: shipment.receiverCity,
      receiverPostalCode: shipment.receiverPostalCode,
      receiverPhone: shipment.receiverPhone,
      receiverCountry: shipment.receiverCountry,
      packageLength: shipment.packageLength || 10,
      packageWidth: shipment.packageWidth || 10,
      packageHeight: shipment.packageHeight || 10,
      packageWeight: shipment.packageWeight || 0.5,
      packageContents: shipment.packageContents || 'general merchandise',
      pieceCount: shipment.piece_count || 1,
      customsValue: shipment.customsValue || 1000,
      totalPrice: shipment.totalPrice || 5000,
      gtip: shipment.gtip || "9999999999",
      iossNumber: shipment.iossNumber,
      selectedService: shipment.selectedService
    };
    
    console.log('📊 AFS Shipment payload prepared');
    console.log(`   GTIP: ${afsShipment.gtip}`);
    console.log(`   Customs Value: $${afsShipment.customsValue / 100}`);
    console.log(`   IOSS: ${afsShipment.iossNumber || 'None'}`);
    console.log(`   Weight: ${afsShipment.packageWeight}kg`);
    
    // Process through AFS Transport
    const result = await processAFSShipments([afsShipment]);
    
    console.log('\n📋 AFS Processing Results:');
    console.log(`   Successful: ${result.successfulShipmentIds?.length || 0}`);
    console.log(`   Failed: ${result.failedShipmentIds?.length || 0}`);
    
    if (result.successfulShipmentIds?.includes(696)) {
      console.log('✅ SUCCESS: Shipment 696 processed successfully through AFS Transport!');
      console.log(`   Tracking Number: ${result.carrierTrackingNumbers[696] || 'Not available'}`);
      console.log(`   Label PDF: ${result.carrierLabelPdfs[696] ? 'Generated' : 'Not available'}`);
    } else {
      console.log('❌ FAILED: Shipment 696 processing failed');
      if (result.shipmentErrors && result.shipmentErrors[696]) {
        console.log(`   Error: ${result.shipmentErrors[696]}`);
      }
    }
    
    // Check if tracking number was stored
    const updatedShipment = await storage.getShipment(696);
    if (updatedShipment.carrierTrackingNumber) {
      console.log(`✅ Carrier tracking number stored: ${updatedShipment.carrierTrackingNumber}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCompleteAFSIntegration();