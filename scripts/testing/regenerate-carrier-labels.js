/**
 * Regenerate carrier label PDFs with correct 800x1400px dimensions
 * This fixes old data that was stored before dimension preservation was implemented
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { shipments } from './shared/schema.ts';
import { isNotNull, and, eq } from 'drizzle-orm';
import { downloadAndConvertToPdf } from './server/utilities/imageConverter.ts';

const sql = neon(process.env.DATABASE_URL);
const database = drizzle(sql);

async function regenerateCarrierLabels() {
  try {
    console.log('🚨 Starting carrier label dimension fix...');
    
    // Get all shipments with carrier label URLs that need regeneration
    const shipmentsToFix = await database
      .select({
        id: shipments.id,
        carrierLabelUrl: shipments.carrierLabelUrl,
        currentPdfLength: shipments.carrierLabelPdf
      })
      .from(shipments)
      .where(and(
        isNotNull(shipments.carrierLabelUrl),
        isNotNull(shipments.carrierLabelPdf)
      ))
      .limit(10);

    console.log(`📋 Found ${shipmentsToFix.length} shipments with carrier labels to regenerate`);

    let fixed = 0;
    let errors = 0;

    for (const shipment of shipmentsToFix) {
      try {
        console.log(`🔄 Processing shipment ${shipment.id}...`);
        
        // Check current PDF size to identify old data
        const currentSize = shipment.currentPdfLength ? shipment.currentPdfLength.length : 0;
        console.log(`   Current PDF size: ${currentSize} characters`);
        
        // Download and convert with proper dimension preservation
        const { pdfBase64, dimensions } = await downloadAndConvertToPdf(shipment.carrierLabelUrl);
        
        if (pdfBase64) {
          // Update with correctly dimensioned PDF
          await database
            .update(shipments)
            .set({
              carrierLabelPdf: pdfBase64
            })
            .where(eq(shipments.id, shipment.id));
            
          console.log(`✅ Fixed shipment ${shipment.id} - New size: ${pdfBase64.length} characters, Dimensions: ${dimensions.width}x${dimensions.height}px`);
          fixed++;
        } else {
          console.log(`❌ Failed to regenerate PDF for shipment ${shipment.id}`);
          errors++;
        }
        
      } catch (error) {
        console.error(`❌ Error processing shipment ${shipment.id}:`, error.message);
        errors++;
      }
    }
    
    console.log(`🏁 Carrier label regeneration complete:`);
    console.log(`   ✅ Fixed: ${fixed} shipments`);
    console.log(`   ❌ Errors: ${errors} shipments`);
    
  } catch (error) {
    console.error('💥 Critical error during carrier label regeneration:', error);
  }
}

regenerateCarrierLabels();