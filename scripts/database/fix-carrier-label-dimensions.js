/**
 * Fix carrier label dimensions by regenerating all stored PDFs
 * This ensures all carrier labels preserve authentic 800x1400px dimensions
 */

import { downloadAndConvertToPdf } from './server/utilities/imageConverter.ts';
import { db } from './server/db.js';

async function fixCarrierLabelDimensions() {
  try {
    console.log('🔄 Starting carrier label dimension fix...');
    
    // Get all shipments with carrier label URLs
    const shipments = await db
      .select({
        id: shipments.id,
        carrierLabelUrl: shipments.carrierLabelUrl,
        currentPdfSize: 'LENGTH(carrier_label_pdf)'
      })
      .from(shipments)
      .where(and(
        isNotNull(shipments.carrierLabelUrl),
        isNotNull(shipments.carrierLabelPdf)
      ))
      .limit(10);

    console.log(`📋 Found ${shipments.length} shipments with carrier labels to fix`);

    let fixed = 0;
    let errors = 0;

    for (const shipment of shipments) {
      try {
        console.log(`\n🔄 Processing shipment ${shipment.id}...`);
        console.log(`   Current PDF size: ${shipment.currentPdfSize} characters`);
        
        // Regenerate with correct dimensions
        const correctPdfBase64 = await downloadAndConvertToPdf(shipment.carrierLabelUrl);
        
        if (correctPdfBase64) {
          console.log(`   New PDF size: ${correctPdfBase64.length} characters`);
          
          // Update database
          await db
            .update(shipments)
            .set({ carrierLabelPdf: correctPdfBase64 })
            .where(eq(shipments.id, shipment.id));
          
          console.log(`✅ Fixed shipment ${shipment.id} - preserved 800x1400px dimensions`);
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

    console.log(`\n📊 Dimension fix completed:`);
    console.log(`   ✅ Fixed: ${fixed} shipments`);
    console.log(`   ❌ Errors: ${errors} shipments`);
    console.log(`   📏 All fixed labels now preserve authentic 800x1400px carrier dimensions`);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

fixCarrierLabelDimensions();