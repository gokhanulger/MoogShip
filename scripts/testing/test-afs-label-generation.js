/**
 * Test AFS Transport label generation for shipment 500
 * This will verify the complete integration including label PDF storage
 */

import { createAFSLabel } from './server/services/afstransport.js';

async function testAFSLabelGeneration() {
  console.log('🏷️ Testing AFS Transport label generation...\n');
  
  try {
    // Use the existing AFS tracking number from shipment 500
    const afsTrackingNumber = 'AFS94845551';
    console.log(`📦 Testing label generation for tracking: ${afsTrackingNumber}`);
    
    // Generate the label
    console.log('🚀 Calling AFS Transport label API...');
    const labelResult = await createAFSLabel(afsTrackingNumber);
    
    console.log('\n📊 Label Generation Results:');
    console.log(`   Success: ${!labelResult.hata}`);
    console.log(`   Message: ${labelResult.mesaj || 'No message'}`);
    console.log(`   Has PDF: ${!!labelResult.pdf}`);
    
    if (labelResult.pdf) {
      console.log(`   PDF Size: ${labelResult.pdf.length} characters`);
      console.log('✅ Label PDF generated successfully');
      
      // Now test storing this in the database
      console.log('\n💾 Testing database storage...');
      
      const { sql } = await import('drizzle-orm');
      const { db } = await import('./server/db.js');
      
      await db.execute(sql`
        UPDATE shipments 
        SET carrier_label_pdf = ${labelResult.pdf}
        WHERE id = 500
      `);
      
      console.log('✅ Label PDF stored in database');
      
      // Verify storage
      const result = await db.execute(sql`
        SELECT carrier_label_pdf IS NOT NULL as has_pdf, 
               LENGTH(carrier_label_pdf) as pdf_size
        FROM shipments 
        WHERE id = 500
      `);
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        console.log(`🔍 Verification: PDF stored=${row.has_pdf}, size=${row.pdf_size} chars`);
      }
      
    } else {
      console.log('❌ No PDF generated');
      if (labelResult.hata) {
        console.log(`   Error: ${labelResult.mesaj}`);
      }
    }
    
  } catch (error) {
    console.error('\n💥 Error during AFS label generation test:', error.message);
  }
}

testAFSLabelGeneration();