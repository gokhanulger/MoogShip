/**
 * Fix shipment 501 carrier label PDF by generating it from AFS Transport tracking number
 */

import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

// AFS Transport label creation function
async function createAFSLabel(trackingNumber) {
  const labelRequest = {
    islem: "etiket_olustur",
    barkod: trackingNumber
  };

  console.log('📤 AFS label request payload:', labelRequest);

  const response = await fetch('https://panel.afstransport.com/apiv2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.AFS_TRANSPORT_API_KEY || 'fmdnh47u6zgcy'
    },
    body: JSON.stringify(labelRequest)
  });

  const result = await response.json();
  
  // Log response without exposing PDF content
  const logResult = result && typeof result === 'object' ? { ...result } : result;
  if (logResult && typeof logResult === 'object' && logResult.pdf) {
    logResult.pdf = `[PDF Content]`;
  }
  console.log('📄 AFS label response:', logResult);

  return result;
}

async function fixShipment501CarrierLabel() {
  console.log('🔧 Fixing carrier label for shipment 501...\n');
  
  try {
    // Initialize database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('[DB] Database connection initialized');
    
    // Get shipment 501 details
    const shipmentResult = await pool.query(`
      SELECT id, tracking_number, carrier_tracking_number, selected_service, shipping_provider
      FROM shipments 
      WHERE id = 501
    `);
    
    if (shipmentResult.rows.length === 0) {
      console.log('❌ Shipment 501 not found');
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log('📦 Shipment details:', {
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      carrier_tracking_number: shipment.carrier_tracking_number,
      selected_service: shipment.selected_service,
      shipping_provider: shipment.shipping_provider
    });
    
    if (!shipment.carrier_tracking_number) {
      console.log('❌ No carrier tracking number found for shipment 501');
      return;
    }
    
    // Generate AFS Transport label using the tracking number
    console.log('🏷️ Generating AFS Transport label...');
    const labelResult = await createAFSLabel(shipment.carrier_tracking_number);
    
    console.log('📊 AFS label generation result:', {
      success: !labelResult.hata,
      message: labelResult.mesaj,
      hasPdf: !!labelResult.pdf
    });
    
    if (labelResult.hata) {
      console.log('❌ AFS label generation failed:', labelResult.mesaj);
      return;
    }
    
    if (!labelResult.pdf) {
      console.log('❌ No PDF returned from AFS Transport API');
      return;
    }
    
    // Store the carrier label PDF in database
    console.log('💾 Storing carrier label PDF in database...');
    await pool.query(`
      UPDATE shipments 
      SET carrier_label_pdf = $1, updated_at = NOW()
      WHERE id = 501
    `, [labelResult.pdf]);
    
    // Verify storage
    const verificationResult = await pool.query(`
      SELECT 
        carrier_label_pdf IS NOT NULL as has_pdf,
        LENGTH(carrier_label_pdf) as pdf_size
      FROM shipments 
      WHERE id = 501
    `);
    
    if (verificationResult.rows.length > 0) {
      const result = verificationResult.rows[0];
      console.log('\n🔍 Storage Verification:');
      console.log(`   PDF Stored: ${result.has_pdf}`);
      console.log(`   PDF Size: ${result.pdf_size} characters`);
      
      if (result.has_pdf && result.pdf_size > 1000) {
        console.log('\n🎉 SUCCESS! Carrier label PDF generated and stored for shipment 501');
        console.log('   Users can now download the carrier label');
      }
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('\n💥 Error fixing shipment 501 carrier label:', error);
    process.exit(1);
  }
}

fixShipment501CarrierLabel();