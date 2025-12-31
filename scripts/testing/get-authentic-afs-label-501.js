/**
 * Get authentic AFS Transport waybill/label PDF for shipment 501
 * This follows the same process that worked for shipment 500
 */

import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

async function getAuthenticAFSLabel() {
  console.log('🔧 Getting authentic AFS Transport label for shipment 501...\n');
  
  try {
    // Initialize database connection
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    console.log('[DB] Database connection initialized');
    
    // Get shipment 501 details
    const shipmentResult = await pool.query(`
      SELECT id, tracking_number, carrier_tracking_number, selected_service, shipping_provider, 
             receiver_name, receiver_address, receiver_city, receiver_country, receiver_phone, receiver_postal_code,
             sender_name, sender_address1, sender_city, sender_postal_code, sender_phone,
             package_weight, package_length, package_width, package_height, piece_count,
             package_contents, customs_value, total_price, ioss_number
      FROM shipments 
      WHERE id = 501
    `);
    
    if (shipmentResult.rows.length === 0) {
      console.log('❌ Shipment 501 not found');
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log('📦 Shipment details loaded for AFS waybill creation');
    
    // Step 1: Create AFS waybill using the same process as shipment 500
    console.log('🚀 Creating fresh AFS waybill...');
    const waybillData = buildAFSWaybillData(shipment);
    const waybillResult = await createAFSWaybill(waybillData);
    
    if (waybillResult.hata === true) {
      console.log('❌ Failed to create AFS waybill:', waybillResult.mesaj);
      
      // Check if we can get the waybill PDF directly from the response
      if (waybillResult.waybill_pdf) {
        console.log('📄 Found waybill PDF in response, storing...');
        await storeCarrierLabelPdf(pool, 501, waybillResult.waybill_pdf);
        await pool.end();
        return;
      }
      
      await pool.end();
      return;
    }
    
    console.log('✅ AFS waybill created successfully');
    console.log('📋 Waybill result:', {
      success: !waybillResult.hata,
      tracking: waybillResult.barkod,
      hasWaybillPdf: !!waybillResult.waybill_pdf,
      hasInvoicePdf: !!waybillResult.invoice_pdf
    });
    
    // Step 2: Try to get label PDF from waybill response first
    if (waybillResult.waybill_pdf) {
      console.log('📄 Found waybill PDF in waybill response, using as carrier label...');
      await storeCarrierLabelPdf(pool, 501, waybillResult.waybill_pdf);
      await updateCarrierTrackingNumber(pool, 501, waybillResult.barkod);
      await pool.end();
      return;
    }
    
    // Step 3: If no PDF in waybill response, try label creation
    if (waybillResult.barkod) {
      console.log(`🏷️ Creating AFS label for tracking: ${waybillResult.barkod}...`);
      const labelResult = await createAFSLabel(waybillResult.barkod);
      
      if (labelResult.pdf) {
        console.log('📄 Label PDF retrieved successfully');
        await storeCarrierLabelPdf(pool, 501, labelResult.pdf);
        await updateCarrierTrackingNumber(pool, 501, waybillResult.barkod);
      } else {
        console.log('⚠️ No PDF in label response, but waybill was created successfully');
        console.log('📋 Label response:', labelResult);
        await updateCarrierTrackingNumber(pool, 501, waybillResult.barkod);
      }
    }
    
    await pool.end();
    console.log('\n🎉 Process completed - check shipment 501 for authentic AFS Transport data');
    
  } catch (error) {
    console.error('\n💥 Error getting authentic AFS label:', error);
    process.exit(1);
  }
}

// Build AFS waybill data (same as working integration)
function buildAFSWaybillData(shipment) {
  const formatTurkishAddress = (address) => {
    if (!address) return address;
    
    return address
      .replace(/\bmah\b/gi, 'Mahallesi')
      .replace(/\bmahallesi\b/gi, 'Mahallesi')
      .replace(/\bcad\b/gi, 'Caddesi')
      .replace(/\bcaddesi\b/gi, 'Caddesi')
      .replace(/\bsk\b/gi, 'Sokak')
      .replace(/\bsokak\b/gi, 'Sokak')
      .replace(/\bno:\s*/gi, 'No:')
      .replace(/\bno\s+/gi, 'No:')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const formattedSenderAddress = formatTurkishAddress(shipment.sender_address1 || '');
  const serviceId = parseInt(shipment.selected_service?.replace('afs-', '') || '7');
  
  return {
    islem: "waybill_olustur",
    alici: shipment.receiver_name || "",
    alici_telefon: shipment.receiver_phone || "+14252987618",
    alici_adres: shipment.receiver_address || "",
    alici_ulke: shipment.receiver_country || "DE", 
    alici_sehir: shipment.receiver_city || "",
    alici_posta_kodu: shipment.receiver_postal_code || "",
    gonderici: shipment.sender_name || "",
    gonderici_adres: formattedSenderAddress,
    gonderici_telefon: shipment.sender_phone || "905407447911",
    gonderici_ulke: "TR",
    gonderici_sehir: shipment.sender_city || "",
    gonderici_posta_kodu: shipment.sender_postal_code || "",
    gonderiler: [{
      kap: shipment.piece_count || 1,
      agirlik: shipment.package_weight || 1,
      uzunluk: shipment.package_length || 10,
      genislik: shipment.package_width || 10,
      yukseklik: shipment.package_height || 10
    }],
    servis_id: serviceId,
    beyan_id: 1,
    odeme_id: 1,
    fatura_icerigi: [{
      mal_cinsi: shipment.package_contents || "General Merchandise",
      adet: 1,
      tip_id: 1,
      birim_fiyat: (shipment.customs_value || shipment.total_price || 5000) / 100,
      gtip: "9999999999"
    }],
    kur: 1,
    referans_kodu: `${shipment.tracking_number}-${Date.now()}`,
    aciklama: `MoogShip shipment ${shipment.id}`,
    ddp: shipment.ioss_number ? 1 : 0,
    ioss: shipment.ioss_number || "",
    vat: "",
    eori: ""
  };
}

// Create AFS waybill
async function createAFSWaybill(waybillData) {
  const apiKey = process.env.AFS_TRANSPORT_API_KEY || 'fmdnh47u6zgcy';

  console.log('📤 Sending waybill request to AFS Transport...');

  const response = await fetch('https://panel.afstransport.com/apiv2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(waybillData)
  });

  const result = await response.json();
  console.log('📥 AFS waybill response received');
  
  return result;
}

// Create AFS label
async function createAFSLabel(barkod) {
  const apiKey = process.env.AFS_TRANSPORT_API_KEY || 'fmdnh47u6zgcy';
  
  const labelRequest = {
    islem: "etiket_olustur",
    barkod: barkod
  };

  console.log('📤 Sending label request to AFS Transport...');

  const response = await fetch('https://panel.afstransport.com/apiv2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(labelRequest)
  });

  const result = await response.json();
  console.log('📥 AFS label response received');
  
  return result;
}

// Store carrier label PDF in database
async function storeCarrierLabelPdf(pool, shipmentId, pdfData) {
  console.log(`💾 Storing carrier label PDF for shipment ${shipmentId}...`);
  
  await pool.query(`
    UPDATE shipments 
    SET carrier_label_pdf = $1, updated_at = NOW()
    WHERE id = $2
  `, [pdfData, shipmentId]);
  
  // Verify storage
  const result = await pool.query(`
    SELECT LENGTH(carrier_label_pdf) as pdf_size
    FROM shipments 
    WHERE id = $1
  `, [shipmentId]);
  
  if (result.rows.length > 0) {
    console.log(`✅ PDF stored successfully: ${result.rows[0].pdf_size} characters`);
  }
}

// Update carrier tracking number
async function updateCarrierTrackingNumber(pool, shipmentId, trackingNumber) {
  if (!trackingNumber) return;
  
  console.log(`🏷️ Updating carrier tracking number: ${trackingNumber}`);
  
  await pool.query(`
    UPDATE shipments 
    SET carrier_tracking_number = $1, updated_at = NOW()
    WHERE id = $2
  `, [trackingNumber, shipmentId]);
}

getAuthenticAFSLabel();