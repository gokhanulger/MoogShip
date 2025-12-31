/**
 * Download the actual AFS Transport PDF from the URL stored in shipment 501
 */

import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

async function downloadAFSPdf() {
  console.log('📥 Downloading authentic AFS Transport PDF for shipment 501...\n');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    // Get the PDF URL from shipment 501
    const result = await pool.query(`
      SELECT id, carrier_label_pdf 
      FROM shipments 
      WHERE id = 501
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Shipment 501 not found');
      return;
    }
    
    const pdfUrl = result.rows[0].carrier_label_pdf;
    console.log('🔗 PDF URL found:', pdfUrl);
    
    if (!pdfUrl || !pdfUrl.startsWith('http')) {
      console.log('❌ Invalid PDF URL format');
      return;
    }
    
    // Download the PDF from AFS Transport
    console.log('📥 Downloading PDF from AFS Transport...');
    const response = await fetch(pdfUrl);
    
    if (!response.ok) {
      console.log('❌ Failed to download PDF:', response.status, response.statusText);
      return;
    }
    
    // Convert to base64
    const pdfBuffer = await response.buffer();
    const pdfBase64 = pdfBuffer.toString('base64');
    
    console.log(`📄 PDF downloaded successfully: ${pdfBase64.length} characters`);
    console.log(`📊 PDF size: ${Math.round(pdfBuffer.length / 1024)} KB`);
    
    // Store the actual PDF content in database
    await pool.query(`
      UPDATE shipments 
      SET carrier_label_pdf = $1, updated_at = NOW()
      WHERE id = 501
    `, [pdfBase64]);
    
    // Verify storage
    const verifyResult = await pool.query(`
      SELECT 
        LENGTH(carrier_label_pdf) as pdf_size,
        LEFT(carrier_label_pdf, 20) as pdf_start
      FROM shipments 
      WHERE id = 501
    `);
    
    if (verifyResult.rows.length > 0) {
      const verify = verifyResult.rows[0];
      console.log('\n🔍 Storage Verification:');
      console.log(`   PDF Size: ${verify.pdf_size} characters`);
      console.log(`   PDF Start: ${verify.pdf_start}...`);
      
      if (verify.pdf_start.startsWith('JVBERi0x')) {
        console.log('✅ Valid PDF base64 content detected');
        console.log('\n🎉 SUCCESS! Authentic AFS Transport PDF stored for shipment 501');
      } else {
        console.log('⚠️ PDF content may not be valid base64');
      }
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('\n💥 Error downloading AFS PDF:', error);
    process.exit(1);
  }
}

downloadAFSPdf();