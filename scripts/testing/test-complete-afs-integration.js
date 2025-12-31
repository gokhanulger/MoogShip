/**
 * Test complete AFS Transport integration with database storage verification
 * This tests the full workflow from waybill creation to database storage
 */

async function testCompleteAFSIntegration() {
  console.log('🚛 Testing complete AFS Transport integration with database storage...\n');
  
  try {
    // Import required modules
    const { createDatabaseOnlyStorage } = await import('../../server/storage.ts');
    const { processAFSShipments } = await import('../../server/services/afstransport.ts');
    
    console.log('📦 Modules loaded successfully');
    
    // Create storage instance
    const storage = createDatabaseOnlyStorage();
    
    // Get shipment 500 (should be an AFS shipment)
    const shipment = await storage.getShipment(500);
    
    if (!shipment) {
      console.log('❌ Shipment 500 not found');
      return;
    }
    
    console.log('📋 Current shipment 500 state:');
    console.log(`   Service: ${shipment.selectedService}`);
    console.log(`   Provider: ${shipment.shippingProvider}`);
    console.log(`   Carrier: ${shipment.carrierName}`);
    console.log(`   Status: ${shipment.status}`);
    console.log(`   Current Carrier Tracking: ${shipment.carrierTrackingNumber || 'Not set'}`);
    console.log(`   Current Carrier Label PDF: ${shipment.carrierLabelPdf ? 'Present' : 'Not set'}`);
    console.log(`   IOSS Number: ${shipment.iossNumber || 'Not provided'}`);
    
    // Verify this is an AFS shipment
    const isAFSShipment = shipment.selectedService?.startsWith('afs-') || 
                         shipment.providerServiceCode?.startsWith('afs-') ||
                         shipment.shippingProvider === 'afs';
    
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
    
    console.log('\n🚀 Processing AFS shipment...');
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
      console.log('\n✅ AFS Transport Processing SUCCESS!');
      console.log(`   MoogShip Tracking: ${result.trackingNumbers[500] || 'Not set'}`);
      console.log(`   AFS Tracking: ${result.carrierTrackingNumbers[500] || 'Not set'}`);
      console.log(`   Label PDF: ${result.carrierLabelPdfs[500] ? 'Generated' : 'Not generated'}`);
      
      // Now test database storage using the shipment controller pattern
      console.log('\n💾 Testing database storage...');
      
      // Update the database with successful results (similar to shipmentController.ts)
      const updateData = {
        sentToShipEntegra: true,
        sentToShipEntegraAt: new Date(),
        labelAttempts: (shipment.labelAttempts || 0) + 1,
        labelError: null
      };
      
      // Store tracking numbers
      if (result.trackingNumbers && result.trackingNumbers[500]) {
        updateData.trackingNumber = result.trackingNumbers[500];
        console.log(`   Updating MoogShip tracking: ${result.trackingNumbers[500]}`);
      }
      
      if (result.carrierTrackingNumbers && result.carrierTrackingNumbers[500]) {
        updateData.carrierTrackingNumber = result.carrierTrackingNumbers[500];
        console.log(`   Updating AFS tracking: ${result.carrierTrackingNumbers[500]}`);
      }
      
      // Store label PDFs
      if (result.carrierLabelPdfs && result.carrierLabelPdfs[500]) {
        updateData.carrierLabelPdf = result.carrierLabelPdfs[500];
        console.log(`   Storing AFS label PDF: ${result.carrierLabelPdfs[500].length} characters`);
      }
      
      // Update the shipment in database
      await storage.updateShipment(500, updateData);
      console.log('   Database update completed');
      
      // Verify the database storage
      const updatedShipment = await storage.getShipment(500);
      console.log('\n🔍 Database Verification:');
      console.log(`   Carrier Tracking Number: ${updatedShipment.carrierTrackingNumber || 'NOT STORED'}`);
      console.log(`   Carrier Label PDF: ${updatedShipment.carrierLabelPdf ? 'STORED (' + updatedShipment.carrierLabelPdf.length + ' chars)' : 'NOT STORED'}`);
      console.log(`   Label Attempts: ${updatedShipment.labelAttempts || 0}`);
      console.log(`   Sent to ShipEntegra: ${updatedShipment.sentToShipEntegra || false}`);
      
      if (updatedShipment.carrierTrackingNumber && updatedShipment.carrierLabelPdf) {
        console.log('\n🎉 COMPLETE SUCCESS! AFS Transport integration working with database storage');
      } else {
        console.log('\n⚠️ Partial success - some data not stored properly');
      }
      
    } else if (result.failedShipmentIds.includes(500)) {
      console.log('\n❌ AFS Transport Processing FAILED:');
      console.log(`   Error: ${result.shipmentErrors[500] || 'Unknown error'}`);
      
      // Check for specific error types
      const error = result.shipmentErrors[500] || '';
      if (error.includes('IOSS numarası bulunan gönderi DAP olamaz')) {
        console.log('   This is the IOSS/DDP customs error - fix should have resolved this');
      } else if (error.includes('işlem boş')) {
        console.log('   This is the payload format error - fix should have resolved this');
      }
    } else {
      console.log('\n❓ Unexpected result - shipment not in success or failed arrays');
    }
    
  } catch (error) {
    console.error('\n💥 Critical error during AFS integration test:', error);
  }
}

// Run the test
testCompleteAFSIntegration();