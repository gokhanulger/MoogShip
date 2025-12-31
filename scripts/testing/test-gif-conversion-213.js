/**
 * Test GIF to PDF conversion for shipment #213
 */

import { downloadAndConvertToPdf } from './server/utilities/imageConverter.ts';
import pkg from 'pg';
const { Client } = pkg;

async function testGifConversion() {
  console.log('Testing GIF to PDF conversion for shipment #213...');
  
  try {
    const gifUrl = 'https://files.shipentegra.com/labels/ups/MOG258447000213-61628658aedcf7_1.gif';
    
    console.log(`Converting GIF from: ${gifUrl}`);
    
    // Convert GIF to PDF
    const pdfBase64 = await downloadAndConvertToPdf(gifUrl);
    console.log(`Conversion successful! PDF size: ${pdfBase64.length} characters`);
    
    // Connect to database and update shipment
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('Connected to database');
    
    // Update shipment #213 with converted PDF
    const result = await client.query(
      'UPDATE shipments SET label_pdf = $1 WHERE id = 213',
      [pdfBase64]
    );
    
    console.log('Update result:', result.rowCount, 'rows affected');
    
    // Verify the update
    const verification = await client.query(`
      SELECT id, tracking_number, 
             CASE WHEN label_pdf IS NOT NULL THEN 'Has PDF data' ELSE 'No PDF data' END as pdf_status,
             LENGTH(label_pdf) as pdf_size
      FROM shipments WHERE id = 213
    `);
    
    console.log('Verification:', verification.rows[0]);
    
    await client.end();
    console.log('GIF to PDF conversion test completed successfully!');
    
  } catch (error) {
    console.error('Error in GIF conversion test:', error);
  }
}

testGifConversion();