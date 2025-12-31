/**
 * Test script to verify authentic carrier label dimensions from ShipEntegra API
 * This will capture actual label sizes and test the adaptive display system
 */

import { storage } from './server/storage.js';
import { createShipentegraOrderAndLabel } from './server/services/shipentegra.js';

async function testAuthenticLabelDimensions() {
  console.log('🧪 Starting authentic carrier label dimension test...');
  
  try {
    // Find a recent approved shipment for testing
    const allShipments = await storage.getAllShipments();
    const approvedShipments = allShipments.filter(s => s.status === 'APPROVED' && s.totalPrice > 0);
    
    if (approvedShipments.length === 0) {
      console.log('❌ No approved shipments found for testing');
      return;
    }
    
    // Use the most recent approved shipment
    const testShipment = approvedShipments[0];
    console.log(`📦 Testing with shipment #${testShipment.id} (${testShipment.receiverCity}, ${testShipment.receiverCountry})`);
    
    // Test carrier label generation to capture authentic dimensions
    console.log('🚀 Requesting authentic carrier label from ShipEntegra API...');
    
    const labelResult = await createShipentegraOrderAndLabel(testShipment);
    
    if (labelResult.success) {
      console.log('✅ Successfully received carrier label from API');
      console.log(`📋 Label URL: ${labelResult.labelUrl || 'No URL provided'}`);
      console.log(`📄 Label PDF size: ${labelResult.labelPdf ? (labelResult.labelPdf.length / 1024).toFixed(1) + 'KB' : 'No PDF data'}`);
      
      // The actual dimensions will be logged by the imageConverter.ts with 🚨 alerts
      console.log('🔍 Check console output above for "ACTUAL CARRIER LABEL DIMENSIONS FROM API" alerts');
      
      // Update the test shipment with the real carrier label data
      if (labelResult.labelUrl || labelResult.labelPdf) {
        await storage.updateShipment(testShipment.id, {
          carrierLabelUrl: labelResult.labelUrl || `test-carrier-label-${testShipment.id}.pdf`,
          carrierLabelPdf: labelResult.labelPdf
        });
        
        console.log(`✅ Updated shipment #${testShipment.id} with authentic carrier label data`);
        console.log('🎯 You can now test the adaptive modal by viewing this carrier label in the dashboard');
        console.log(`📱 Navigate to: /admin/shipments and click the carrier label button for shipment #${testShipment.id}`);
      }
      
    } else {
      console.log('❌ Failed to generate carrier label:', labelResult.message);
      console.log('💡 This may be due to API credentials or shipment data requirements');
    }
    
  } catch (error) {
    console.error('❌ Error testing authentic label dimensions:', error);
    console.log('💡 Ensure ShipEntegra API credentials are properly configured');
  }
}

async function main() {
  console.log('🏷️ AUTHENTIC CARRIER LABEL DIMENSION TEST');
  console.log('==========================================');
  console.log('This test will:');
  console.log('1. Generate a real carrier label from ShipEntegra API');
  console.log('2. Capture authentic label dimensions with 🚨 alerts');
  console.log('3. Update a shipment with real carrier label data');
  console.log('4. Enable testing of the adaptive modal display\n');
  
  await testAuthenticLabelDimensions();
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Check console output for dimension alerts (🚨)');
  console.log('2. Open MoogShip dashboard in browser');
  console.log('3. Navigate to Admin > All Shipments');
  console.log('4. Click carrier label button to test adaptive modal');
  console.log('5. Verify modal adapts to authentic API dimensions');
  
  process.exit(0);
}

main().catch(console.error);