/**
 * Direct test of AFS Transport integration with shipment 500
 * Tests the complete IOSS/DDP fix implementation
 */

async function testAFSDirectIntegration() {
  console.log('🚛 Testing AFS Transport integration directly...\n');
  
  try {
    // Import required modules
    const { createDatabaseOnlyStorage } = await import('./server/storage.js');
    const { processAFSShipments } = await import('./server/services/afstransport.js');
    
    console.log('📦 Modules loaded successfully');
    
    // Create storage instance
    const storage = createDatabaseOnlyStorage();
    
    // Get shipment 500
    const shipment = await storage.getShipment(500);
    
    if (!shipment) {
      console.log('❌ Shipment 500 not found');
      return;
    }
    
    console.log('📋 Found shipment 500:');
    console.log(`   Service: ${shipment.selectedService}`);
    console.log(`   Provider: ${shipment.shippingProvider}`);
    console.log(`   Carrier: ${shipment.carrierName}`);
    console.log(`   Status: ${shipment.status}`);
    console.log(`   IOSS Number: ${shipment.iossNumber || 'Not provided'}`);
    
    // Verify this is an AFS shipment
    const isAFSShipment = shipment.selectedService?.startsWith('afs-') || 
                         shipment.providerServiceCode?.startsWith('afs-');
    
    console.log(`   Is AFS Shipment: ${isAFSShipment ? 'YES' : 'NO'}`);
    
    if (!isAFSShipment) {
      console.log('❌ This is not an AFS shipment, cannot test AFS integration');
      return;
    }
    
    // Format shipment for AFS processing
    const afsShipment = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber,
      selectedService: shipment.selectedService,
      providerServiceCode: shipment.providerServiceCode,
      senderName: shipment.senderName,
      senderAddress1: shipment.senderAddress1 || shipment.senderAddress,
      senderCity: shipment.senderCity,
      senderPostalCode: shipment.senderPostalCode,
      senderPhone: shipment.senderPhone,
      senderEmail: shipment.senderEmail,
      receiverName: shipment.receiverName,
      receiverAddress: shipment.receiverAddress,
      receiverCity: shipment.receiverCity,
      receiverState: shipment.receiverState,
      receiverCountry: shipment.receiverCountry,
      receiverPostalCode: shipment.receiverPostalCode,
      receiverPhone: shipment.receiverPhone,
      receiverEmail: shipment.receiverEmail,
      packageWeight: shipment.packageWeight,
      packageLength: shipment.packageLength,
      packageWidth: shipment.packageWidth,
      packageHeight: shipment.packageHeight,
      pieceCount: shipment.pieceCount,
      packageContents: shipment.packageContents,
      customsValue: shipment.customsValue,
      totalPrice: shipment.totalPrice,
      iossNumber: shipment.iossNumber,
      gtip: shipment.gtip
    };
    
    console.log('\n🚀 Processing AFS shipment with IOSS/DDP fix...');
    console.log(`   IOSS Number: ${afsShipment.iossNumber || 'NOT PROVIDED'}`);
    console.log(`   Expected DDP: ${afsShipment.iossNumber ? '1 (DDP)' : '0 (DAP)'}`);
    
    // Process the shipment through AFS Transport
    const result = await processAFSShipments([afsShipment]);
    
    console.log('\n📊 AFS Processing Results:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Successful Shipments: ${result.shipmentIds.length}`);
    console.log(`   Failed Shipments: ${result.failedShipmentIds.length}`);
    
    if (result.shipmentIds.includes(500)) {
      console.log('\n✅ AFS Transport Integration SUCCESS!');
      console.log(`   MoogShip Tracking: ${result.trackingNumbers[500] || 'Not set'}`);
      console.log(`   AFS Tracking: ${result.carrierTrackingNumbers[500] || 'Not set'}`);
      console.log('   IOSS/DDP customs handling worked correctly');
      
      // Update the database with successful results
      if (result.carrierTrackingNumbers[500]) {
        await storage.updateShipment(500, {
          carrierTrackingNumber: result.carrierTrackingNumbers[500],
          labelError: null,
          labelAttempts: (shipment.labelAttempts || 0) + 1,
          sentToShipEntegra: true,
          sentToShipEntegraAt: new Date()
        });
        console.log('   Database updated with AFS tracking number');
      }
      
    } else if (result.failedShipmentIds.includes(500)) {
      console.log('\n❌ AFS Transport Integration FAILED:');
      console.log(`   Error: ${result.shipmentErrors[500] || 'Unknown error'}`);
      
      // Check if this is still the IOSS/DDP error
      if (result.shipmentErrors[500]?.includes('IOSS') || 
          result.shipmentErrors[500]?.includes('DAP') ||
          result.shipmentErrors[500]?.includes('DDP')) {
        console.log('   This is still the IOSS/DDP customs error');
        console.log('   The fix may not be working correctly');
      }
    }
    
    console.log('\n🔍 Final Status Check...');
    const updatedShipment = await storage.getShipment(500);
    console.log(`   Label Attempts: ${updatedShipment.labelAttempts}`);
    console.log(`   Label Error: ${updatedShipment.labelError || 'None'}`);
    console.log(`   Carrier Tracking: ${updatedShipment.carrierTrackingNumber || 'Not set'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testAFSDirectIntegration().then(() => {
  console.log('\n🏁 AFS Transport integration test completed');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});