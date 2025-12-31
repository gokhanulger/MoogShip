/**
 * Direct label regeneration for shipment 195 using the internal API
 * This bypasses HTTP calls and directly uses the shipment controller
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up environment
process.env.NODE_ENV = 'development';

async function regenerateLabelDirect() {
  try {
    console.log("🏷️ Starting direct label regeneration for shipment 195");
    
    // Import the storage and shipentegra modules
    const { createDatabaseOnlyStorage } = await import('./server/storage.js');
    const { createShipentegraOrderAndLabel } = await import('./server/services/shipentegra.js');
    
    console.log("📦 Modules loaded successfully");
    
    // Create storage instance
    const storage = createDatabaseOnlyStorage();
    
    // Get the shipment
    const shipment = await storage.getShipment(195);
    
    if (!shipment) {
      console.log("❌ Shipment 195 not found");
      return;
    }
    
    console.log("📋 Found shipment:", shipment.trackingNumber);
    console.log("   Status:", shipment.status);
    console.log("   Service:", shipment.selectedService);
    console.log("   Provider code:", shipment.providerServiceCode);
    console.log("   Current carrier tracking:", shipment.carrierTrackingNumber);
    
    // Clear any existing label error
    await storage.updateShipment(shipment.id, {
      labelError: null
    });
    
    console.log("🚀 Calling ShipEntegra label generation...");
    
    // Call the label generation function directly
    const result = await createShipentegraOrderAndLabel([shipment]);
    
    console.log("📋 Label generation result:");
    console.log("   Success:", result.success);
    console.log("   Message:", result.message);
    console.log("   Successful shipments:", result.successfulShipmentIds.length);
    console.log("   Failed shipments:", result.failedShipmentIds.length);
    
    if (result.success && result.successfulShipmentIds.includes(195)) {
      console.log("✅ Label generated successfully for shipment 195");
      
      // Get tracking numbers and label URLs
      const trackingNumber = result.trackingNumbers[195];
      const carrierTrackingNumber = result.carrierTrackingNumbers[195];
      const labelUrl = result.labelUrls[195];
      const labelPdf = result.labelPdfs[195];
      const carrierLabelUrl = result.carrierLabelUrls[195];
      const carrierLabelPdf = result.carrierLabelPdfs[195];
      
      console.log("📄 Generated data:");
      console.log("   Tracking Number:", trackingNumber || 'Not set');
      console.log("   Carrier Tracking:", carrierTrackingNumber || 'Not set');
      console.log("   Label URL:", labelUrl || 'Not set');
      console.log("   Label PDF:", labelPdf ? 'Generated' : 'Not generated');
      console.log("   Carrier Label URL:", carrierLabelUrl || 'Not set');
      console.log("   Carrier Label PDF:", carrierLabelPdf ? 'Generated' : 'Not generated');
      
      // Get updated shipment to verify changes
      const updatedShipment = await storage.getShipment(195);
      console.log("📦 Updated shipment status:", updatedShipment.status);
      console.log("📦 Label error:", updatedShipment.labelError || 'None');
      
    } else {
      console.log("❌ Label generation failed");
      
      if (result.failedShipmentIds.includes(195)) {
        // Get updated shipment to see error message
        const updatedShipment = await storage.getShipment(195);
        console.log("📄 Error details:", updatedShipment.labelError || 'No specific error recorded');
      }
    }
    
  } catch (error) {
    console.error("❌ Direct label regeneration error:", error);
  }
}

// Run the regeneration
regenerateLabelDirect().catch(console.error);