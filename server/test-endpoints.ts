// Test endpoint for manually fixing AFS PDF downloads
import { Router } from 'express';
import { createAFSWaybill } from './services/afstransport.js';
import * as storage from './storage.js';

const router = Router();

// Test endpoint to manually fix AFS PDF downloads
router.post('/test/fix-afs-pdf/:shipmentId', async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId);
    console.log(`🔧 [TEST] Manual AFS PDF fix for shipment ${shipmentId}`);
    
    // Get the shipment
    const shipment = await storage.storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    console.log(`📦 [TEST] Shipment data: ${JSON.stringify(shipment, null, 2)}`);
    
    // Check if it's an AFS shipment
    if (!shipment.selectedService?.includes('afs')) {
      return res.status(400).json({ error: 'Not an AFS shipment' });
    }
    
    // Try to recreate the waybill and download PDF
    console.log(`🔄 [TEST] Attempting to recreate AFS waybill...`);
    const result = await createAFSWaybill([shipment]);
    
    console.log(`📋 [TEST] AFS waybill result:`, JSON.stringify(result, null, 2));
    
    if (result.success && result.carrierLabelPdfs[shipmentId]) {
      // Update the shipment with the PDF data
      await storage.storage.updateShipment(shipmentId, {
        carrierLabelPdf: result.carrierLabelPdfs[shipmentId]
      });
      
      console.log(`✅ [TEST] Successfully fixed PDF for shipment ${shipmentId}`);
      
      res.json({
        success: true,
        message: `PDF fixed for shipment ${shipmentId}`,
        pdfSize: result.carrierLabelPdfs[shipmentId].length,
        pdfPreview: result.carrierLabelPdfs[shipmentId].substring(0, 100)
      });
    } else {
      console.error(`❌ [TEST] Failed to fix PDF for shipment ${shipmentId}:`, result.error);
      res.status(500).json({
        error: 'Failed to retrieve PDF',
        details: result.error || 'Unknown error'
      });
    }
    
  } catch (error) {
    console.error(`❌ [TEST] Error in manual AFS PDF fix:`, error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;