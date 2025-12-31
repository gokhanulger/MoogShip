/**
 * Final test to verify shipment 264 PNG carrier label system
 */

import { neon } from '@neondatabase/serverless';

async function testShipment264Final() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    // Get shipment 264 data
    const result = await sql`
      SELECT 
        id,
        carrier_label_url,
        carrier_label_pdf,
        CASE 
          WHEN carrier_label_pdf IS NOT NULL THEN LENGTH(carrier_label_pdf)
          ELSE 0
        END as pdf_data_length,
        CASE 
          WHEN carrier_label_pdf IS NOT NULL THEN SUBSTRING(carrier_label_pdf, 1, 20)
          ELSE 'NO_DATA'
        END as pdf_data_sample
      FROM shipments 
      WHERE id = 264
    `;
    
    if (result.length === 0) {
      console.log('❌ Shipment 264 not found');
      return;
    }
    
    const shipment = result[0];
    
    console.log('🔍 Shipment 264 Final Test Results:');
    console.log('=================================');
    console.log(`ID: ${shipment.id}`);
    console.log(`Carrier Label URL: ${shipment.carrier_label_url || 'NO_URL'}`);
    console.log(`Has PNG Data: ${shipment.carrier_label_pdf ? 'YES' : 'NO'}`);
    console.log(`PNG Data Length: ${shipment.pdf_data_length} characters`);
    console.log(`PNG Data Sample: ${shipment.pdf_data_sample}`);
    
    // Determine routing logic
    const hasLocalData = !!shipment.carrier_label_pdf;
    const hasExternalUrl = !!shipment.carrier_label_url;
    
    console.log('\n🎯 Modal Routing Logic:');
    console.log('=====================');
    console.log(`Has Local PNG Data: ${hasLocalData}`);
    console.log(`Has External URL: ${hasExternalUrl}`);
    
    if (hasLocalData) {
      console.log('✅ Will use: /api/shipments/264/label/png?type=carrier');
    } else if (hasExternalUrl) {
      console.log(`✅ Will use: ${shipment.carrier_label_url}`);
    } else {
      console.log('❌ No PNG source available');
    }
    
    // Test PNG data validity if available
    if (hasLocalData) {
      const isValidPNG = shipment.carrier_label_pdf.startsWith('iVBORw0KGgo');
      console.log(`PNG Data Valid: ${isValidPNG ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('Error testing shipment 264:', error);
  }
}

testShipment264Final();