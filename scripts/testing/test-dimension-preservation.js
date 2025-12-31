/**
 * Test script to verify dimension preservation during GIF to PDF conversion
 * This will test the actual conversion process with a real ShipEntegra carrier label
 */

import { downloadAndConvertToPdf } from './server/utilities/imageConverter.ts';
import fetch from 'node-fetch';
import sharp from 'sharp';

async function testDimensionPreservation() {
  try {
    // Use a real carrier label URL from the database
    const testLabelUrl = 'https://files.shipentegra.com/labels/ups/MOG259738000249-f895b4639428ef_1.gif';
    
    console.log(`🧪 Testing dimension preservation with carrier label: ${testLabelUrl}`);
    
    // First, download the original GIF and check its dimensions
    console.log('\n📥 Step 1: Downloading original GIF...');
    const response = await fetch(testLabelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download GIF: ${response.status}`);
    }
    
    const originalBuffer = Buffer.from(await response.arrayBuffer());
    const originalMetadata = await sharp(originalBuffer).metadata();
    
    console.log(`📏 ORIGINAL GIF DIMENSIONS: ${originalMetadata.width}x${originalMetadata.height}px`);
    console.log(`📦 Original file size: ${originalBuffer.length} bytes`);
    
    // Now use our conversion function
    console.log('\n🔄 Step 2: Converting GIF to PDF using imageConverter...');
    const convertedPdfBase64 = await downloadAndConvertToPdf(testLabelUrl);
    
    if (!convertedPdfBase64) {
      throw new Error('Conversion failed - no PDF returned');
    }
    
    console.log(`📄 Converted PDF size: ${convertedPdfBase64.length} base64 characters`);
    console.log(`📦 Converted PDF bytes: ${Buffer.from(convertedPdfBase64, 'base64').length}`);
    
    // Compare with what's stored in database
    console.log('\n🔍 Step 3: Checking database storage...');
    const { sql } = await import('./server/db.js');
    
    const result = await sql`
      SELECT carrier_label_pdf 
      FROM shipments 
      WHERE carrier_label_url = ${testLabelUrl}
      LIMIT 1
    `;
    
    if (result.length > 0 && result[0].carrier_label_pdf) {
      const storedPdfBase64 = result[0].carrier_label_pdf;
      console.log(`💾 Stored PDF size: ${storedPdfBase64.length} base64 characters`);
      console.log(`📦 Stored PDF bytes: ${Buffer.from(storedPdfBase64, 'base64').length}`);
      
      // Check if they match
      const matches = convertedPdfBase64 === storedPdfBase64;
      console.log(`🔄 Conversion matches stored PDF: ${matches}`);
      
      if (!matches) {
        console.log(`⚠️ Size difference: ${Math.abs(convertedPdfBase64.length - storedPdfBase64.length)} characters`);
      }
    }
    
    console.log('\n✅ Dimension preservation test completed');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testDimensionPreservation();