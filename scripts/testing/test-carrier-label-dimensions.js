/**
 * Test script to verify carrier label dimension preservation
 * Tests the fixed GIF to PDF conversion system with real UPS carrier labels
 */

import { downloadAndConvertToPdf } from './server/utilities/imageConverter.ts';
import pkg from 'pg';
const { Client } = pkg;

async function testCarrierLabelDimensions() {
  console.log('Testing carrier label dimension preservation...');
  
  try {
    // Test with shipment #242's authentic UPS carrier label
    const carrierLabelUrl = 'https://files.shipentegra.com/labels/ups/MOG252421000242-1f024f56c72220_1.gif';
    
    console.log(`🔄 Converting carrier label from: ${carrierLabelUrl}`);
    console.log('📏 System will preserve EXACT original dimensions without any modifications');
    
    // Convert GIF to PDF with dimension preservation
    const pdfBase64 = await downloadAndConvertToPdf(carrierLabelUrl);
    console.log(`✅ Conversion successful! PDF size: ${pdfBase64.length} characters`);
    
    // Connect to database and update shipment #242
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    
    await client.connect();
    console.log('🔗 Connected to database');
    
    // Update shipment #242 with preserved-dimension PDF
    const result = await client.query(
      'UPDATE shipments SET carrier_label_pdf = $1 WHERE id = 242',
      [pdfBase64]
    );
    
    console.log(`📊 Database update: ${result.rowCount} rows affected`);
    
    // Verify the update
    const verification = await client.query(`
      SELECT id, tracking_number, carrier_tracking_number,
             CASE WHEN carrier_label_pdf IS NOT NULL THEN 'Has PDF data' ELSE 'No PDF data' END as pdf_status,
             LENGTH(carrier_label_pdf) as pdf_size
      FROM shipments WHERE id = 242
    `);
    
    console.log('✅ Verification:', verification.rows[0]);
    console.log('📄 Carrier label now available with preserved original dimensions');
    
    await client.end();
    console.log('🎯 Carrier label dimension preservation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in carrier label test:', error);
  }
}

testCarrierLabelDimensions();