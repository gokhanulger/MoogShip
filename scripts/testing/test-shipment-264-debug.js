/**
 * Debug script to test shipment 264 PNG carrier label display
 * This will trace the exact data flow and identify the failure point
 */

import { db } from './server/db/index.js';

async function debugShipment264() {
  console.log('=== DEBUGGING SHIPMENT 264 PNG CARRIER LABEL ===');
  
  try {
    // 1. Check database data
    console.log('\n1. Checking database data...');
    const shipmentResult = await db.query(`
      SELECT id, tracking_number, carrier_label_url, 
             CASE WHEN carrier_label_pdf IS NOT NULL THEN 'HAS_DATA' ELSE 'NO_DATA' END as has_pdf,
             LENGTH(carrier_label_pdf) as pdf_length,
             SUBSTRING(carrier_label_pdf, 1, 20) as pdf_sample
      FROM shipments WHERE id = 264
    `);
    
    if (shipmentResult.rows.length === 0) {
      console.log('❌ Shipment 264 not found in database');
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log('📊 Database data:', {
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      carrier_label_url: shipment.carrier_label_url,
      has_pdf: shipment.has_pdf,
      pdf_length: shipment.pdf_length,
      pdf_sample: shipment.pdf_sample
    });
    
    // 2. Test format detection logic
    console.log('\n2. Testing format detection...');
    const isEcoService = false; // shipment 264 is not eco
    const hasLabel = !!(shipment.carrier_label_url || shipment.has_pdf === 'HAS_DATA');
    
    let format = 'pdf'; // Default
    if (shipment.carrier_label_url) {
      if (shipment.carrier_label_url.includes('.png')) {
        format = 'png';
      } else if (shipment.carrier_label_url.includes('.gif')) {
        format = 'png'; // GIF converted to PNG display
      }
    }
    
    console.log('🎯 Format detection result:', {
      format,
      hasLabel,
      isEcoService,
      carrierLabelUrl: shipment.carrier_label_url
    });
    
    // 3. Simulate modal data fetching
    console.log('\n3. Simulating modal data fetching...');
    if (format === 'png' && shipment.has_pdf === 'HAS_DATA') {
      console.log('✅ PNG carrier label should be displayable');
      console.log('📝 Modal should use: data:image/png;base64,' + shipment.pdf_sample + '...');
    } else {
      console.log('❌ PNG carrier label cannot be displayed');
      console.log('Reasons:', {
        formatNotPng: format !== 'png',
        noPdfData: shipment.has_pdf !== 'HAS_DATA'
      });
    }
    
    // 4. Check PNG data validity
    console.log('\n4. Checking PNG data validity...');
    const fullPdfResult = await db.query(`
      SELECT carrier_label_pdf FROM shipments WHERE id = 264
    `);
    
    if (fullPdfResult.rows[0] && fullPdfResult.rows[0].carrier_label_pdf) {
      const pngData = fullPdfResult.rows[0].carrier_label_pdf;
      const isPngHeader = pngData.startsWith('iVBORw0KGgo');
      console.log('🖼️ PNG data check:', {
        length: pngData.length,
        isPngHeader,
        header: pngData.substring(0, 20)
      });
      
      if (isPngHeader) {
        console.log('✅ Valid PNG base64 data found');
      } else {
        console.log('❌ Invalid PNG data - does not start with PNG header');
      }
    } else {
      console.log('❌ No PNG data found in database');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugShipment264();