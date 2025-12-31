/**
 * Direct test of MoogShip label generation for shipment 198
 * This bypasses routing to test the core label generation functionality
 */

import { storage } from './server/storage.js';
import { generateShippingLabel, getLabelUrl } from './server/services/labelGenerator.js';

async function testDirectLabelGeneration() {
  try {
    console.log('🏷️ DIRECT TEST: Starting direct label generation test for shipment 198');
    
    // Get shipment data directly from storage
    const shipment = await storage.getShipment(198);
    
    if (!shipment) {
      console.error('🏷️ DIRECT TEST: Shipment 198 not found');
      return;
    }
    
    console.log('🏷️ DIRECT TEST: Shipment 198 data:', {
      id: shipment.id,
      selected_service: shipment.selected_service,
      shipping_provider: shipment.shipping_provider,
      provider_service_code: shipment.provider_service_code,
      status: shipment.status,
      labelUrl: shipment.labelUrl,
      labelPdf: !!shipment.labelPdf
    });
    
    // Test MoogShip label generation directly
    console.log('🏷️ DIRECT TEST: Calling generateShippingLabel...');
    const labelPath = await generateShippingLabel(shipment);
    console.log('🏷️ DIRECT TEST: Label generated at path:', labelPath);
    
    // Test URL generation
    const labelUrl = getLabelUrl(labelPath);
    console.log('🏷️ DIRECT TEST: Label URL:', labelUrl);
    
    // Update shipment with label URL
    console.log('🏷️ DIRECT TEST: Updating shipment with label URL...');
    await storage.updateShipment(shipment.id, { labelUrl });
    
    // Verify update
    const updatedShipment = await storage.getShipment(198);
    console.log('🏷️ DIRECT TEST: Updated shipment labelUrl:', updatedShipment.labelUrl);
    
    console.log('🏷️ DIRECT TEST: Test completed successfully!');
    
  } catch (error) {
    console.error('🏷️ DIRECT TEST: Error during direct label generation test:', error);
    if (error.stack) {
      console.error('🏷️ DIRECT TEST: Stack trace:', error.stack);
    }
  }
}

// Run the test
testDirectLabelGeneration();