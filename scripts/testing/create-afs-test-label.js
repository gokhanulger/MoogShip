/**
 * Create a complete test shipping label for AFS Transport API key activation
 * This will create a waybill and generate the shipping label to share with AFS
 */

import fetch from 'node-fetch';

// AFS Transport API configuration
const AFS_API_URL = 'https://panel.afstransport.com/apiv2.php';
const AFS_API_KEY = 'fmdnh47u6zgcy'; // Demo API key

/**
 * Create waybill using AFS Transport API
 */
async function createAFSWaybill(waybillData) {
  try {
    console.log('🚀 Creating AFS waybill...');
    
    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY
      },
      body: JSON.stringify(waybillData)
    });

    const result = await response.json();
    console.log('📦 Waybill response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Waybill creation error:', error);
    throw error;
  }
}

/**
 * Create label using AFS Transport API
 */
async function createAFSLabel(trackingNumber) {
  try {
    console.log('🏷️ Creating shipping label for:', trackingNumber);
    
    const labelRequest = {
      islem: "etiket_olustur",
      barkod: trackingNumber
    };

    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY
      },
      body: JSON.stringify(labelRequest)
    });

    const result = await response.json();
    console.log('📄 Label response:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error) {
    console.error('❌ Label creation error:', error);
    throw error;
  }
}

async function createTestLabelForAFS() {
  console.log('📦 Creating test shipping label for AFS Transport API key activation...\n');

  // Create waybill with test data
  const waybillData = {
    islem: "waybill_olustur",
    alici: "MoogShip Test Customer",
    alici_telefon: "+90 555 123 4567",
    alici_adres: "Test Address 123, Test District",
    alici_ulke: "TR",
    alici_sehir: "Istanbul",
    alici_posta_kodu: "34000",
    gonderici: "MoogShip LLC",
    gonderici_adres: "1234 Business Ave, Suite 100",
    gonderici_telefon: "+1 555 987 6543",
    gonderici_ulke: "US",
    gonderici_sehir: "Seattle",
    gonderici_posta_kodu: "98101",
    gonderiler: [
      {
        kap: 1,
        agirlik: 0.5,
        uzunluk: 20,
        genislik: 15,
        yukseklik: 10
      }
    ],
    servis_id: 1,
    beyan_id: 1,
    odeme_id: 1,
    fatura_icerigi: [
      {
        mal_cinsi: "Test Product for API Integration",
        adet: 1,
        tip_id: 1,
        birim_fiyat: 25.00,
        gtip: "62040001"
      }
    ],
    kur: 1,
    referans_kodu: `moogship-api-key-request-${Date.now()}`,
    aciklama: "Test shipment for AFS Transport API key activation - MoogShip Integration",
    ddp: 0,
    ioss: "",
    vat: "",
    eori: ""
  };

  try {
    // Step 1: Create waybill
    console.log('📋 Step 1: Creating waybill...');
    const waybillResponse = await createAFSWaybill(waybillData);
    
    if (waybillResponse.hata) {
      console.error('❌ Waybill creation failed:', waybillResponse.mesaj);
      return;
    }

    console.log('✅ Waybill created successfully!');
    console.log('📄 Waybill ID (etsy_id):', waybillResponse.etsy_id);
    console.log('🏷️ Tracking Numbers:', waybillResponse.takip_kodlari);
    console.log('💰 Cost:', waybillResponse.ucret, 'TL');
    console.log('📋 Waybill PDF:', waybillResponse.waybill_pdf);
    console.log('📄 Invoice PDF:', waybillResponse.invoice_pdf);

    // Step 2: Create shipping label
    if (waybillResponse.takip_kodlari && waybillResponse.takip_kodlari.length > 0) {
      const trackingNumber = waybillResponse.takip_kodlari[0];
      console.log('\n🏷️ Step 2: Creating shipping label...');
      const labelResponse = await createAFSLabel(trackingNumber);
      
      if (!labelResponse.hata) {
        console.log('✅ Shipping label created successfully!');
      }
      
      // Summary for AFS Transport
      console.log('\n' + '='.repeat(60));
      console.log('📧 INFORMATION TO SHARE WITH AFS TRANSPORT');
      console.log('='.repeat(60));
      console.log('📦 Waybill ID:', waybillResponse.etsy_id);
      console.log('🏷️ Tracking Number:', trackingNumber);
      console.log('💰 Total Cost:', waybillResponse.ucret, 'TL');
      console.log('📋 Waybill PDF Link:', waybillResponse.waybill_pdf);
      console.log('📄 Invoice PDF Link:', waybillResponse.invoice_pdf);
      console.log('📝 Reference Code:', waybillData.referans_kodu);
      console.log('🔑 Demo API Key Used:', AFS_API_KEY);
      console.log('');
      console.log('📧 Message for AFS Transport:');
      console.log('   "Dear AFS Transport Team,');
      console.log('   ');
      console.log('   We have successfully integrated your API and created test');
      console.log('   waybill and shipping labels using your demo API key.');
      console.log('   ');
      console.log(`   Waybill ID: ${waybillResponse.etsy_id}`);
      console.log(`   Tracking Number: ${trackingNumber}`);
      console.log('   ');
      console.log('   Please provide live API credentials to complete our');
      console.log('   MoogShip platform integration.');
      console.log('   ');
      console.log('   Best regards,');
      console.log('   MoogShip Development Team"');
      console.log('='.repeat(60));
      
    } else {
      console.error('❌ No tracking numbers received from waybill creation');
    }

  } catch (error) {
    console.error('❌ Error creating test label:', error);
  }
}

// Run the test
createTestLabelForAFS().then(() => {
  console.log('\n🎯 Test label creation completed!');
}).catch(error => {
  console.error('❌ Test failed:', error);
});