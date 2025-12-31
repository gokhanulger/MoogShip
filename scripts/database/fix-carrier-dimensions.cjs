/**
 * Fix carrier label dimensions by regenerating PDFs with correct 800x1400px dimensions
 * This addresses old data stored before dimension preservation was implemented
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const PDFDocument = require('pdfkit');

// Database connection
const sql = neon(process.env.DATABASE_URL);

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

async function convertGifToPdf(imageBuffer) {
  try {
    console.log('🔄 Converting GIF to PDF...');
    
    // Convert GIF to PNG while preserving exact dimensions
    const pngBuffer = await sharp(imageBuffer)
      .png()
      .toBuffer();
    
    // Get image metadata to preserve authentic dimensions
    const { width, height } = await sharp(imageBuffer).metadata();
    console.log(`🚨 AUTHENTIC CARRIER LABEL DIMENSIONS: ${width}x${height}px`);
    
    // Create PDF with EXACT carrier label dimensions (NO conversion)
    const doc = new PDFDocument({
      size: [width, height], // Use exact pixel dimensions as received
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });
    
    // Add image to PDF preserving EXACT original dimensions
    doc.image(pngBuffer, 0, 0, {
      width: width,
      height: height,
      fit: [width, height],
      align: 'left',
      valign: 'top'
    });
    
    // Convert to base64
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {});
    doc.end();
    
    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const pdfBase64 = pdfBuffer.toString('base64');
        console.log(`✅ PDF generated: ${pdfBase64.length} characters`);
        resolve({
          pdfBase64,
          dimensions: { width, height }
        });
      });
    });
    
  } catch (error) {
    console.error('❌ Error converting GIF to PDF:', error.message);
    return null;
  }
}

async function fixCarrierLabelDimensions() {
  try {
    console.log('🚨 Starting carrier label dimension fix...');
    
    // Get shipments with carrier labels that need fixing
    const result = await sql`
      SELECT id, carrier_label_url, LENGTH(carrier_label_pdf) as pdf_size
      FROM shipments 
      WHERE carrier_label_url IS NOT NULL 
        AND carrier_label_pdf IS NOT NULL
        AND LENGTH(carrier_label_pdf) < 1000000
      LIMIT 5
    `;
    
    console.log(`📋 Found ${result.length} shipments with potentially incorrect carrier label dimensions`);
    
    let fixed = 0;
    let errors = 0;
    
    for (const shipment of result) {
      try {
        console.log(`🔄 Processing shipment ${shipment.id}...`);
        console.log(`   Current PDF size: ${shipment.pdf_size} characters`);
        
        // Download the original carrier label
        const imageBuffer = await downloadImage(shipment.carrier_label_url);
        console.log(`   Downloaded image: ${imageBuffer.length} bytes`);
        
        // Convert to PDF with proper dimension preservation
        const conversionResult = await convertGifToPdf(imageBuffer);
        
        if (conversionResult) {
          // Update database with correctly dimensioned PDF
          await sql`
            UPDATE shipments 
            SET carrier_label_pdf = ${conversionResult.pdfBase64}
            WHERE id = ${shipment.id}
          `;
          
          console.log(`✅ Fixed shipment ${shipment.id} - New size: ${conversionResult.pdfBase64.length} characters`);
          console.log(`   Preserved dimensions: ${conversionResult.dimensions.width}x${conversionResult.dimensions.height}px`);
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
    
    console.log(`🏁 Carrier label dimension fix complete:`);
    console.log(`   ✅ Fixed: ${fixed} shipments`);
    console.log(`   ❌ Errors: ${errors} shipments`);
    
  } catch (error) {
    console.error('💥 Critical error during carrier label dimension fix:', error);
  }
}

fixCarrierLabelDimensions();