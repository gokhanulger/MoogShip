/**
 * Create test waybill and label for AFS Transport to receive live API keys
 * This will create a test shipment using the demo API key and send the waybill number to AFS
 */

import fetch from 'node-fetch';

/**
 * Create waybill using AFS Transport API
 */
async function createAFSWaybill(waybillData) {
  const apiKey = 'fmdnh47u6zgcy'; // Demo API key

  const response = await fetch('https://panel.afstransport.com/apiv2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(waybillData)
  });

  return await response.json();
}

/**
 * Create label using AFS Transport API
 */
async function createAFSLabel(barkod) {
  const apiKey = 'fmdnh47u6zgcy'; // Demo API key

  const labelRequest = {
    islem: "etiket_olustur",
    barkod: barkod
  };

  const response = await fetch('https://panel.afstransport.com/apiv2.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify(labelRequest)
  });

  return await response.json();
}

async function createTestWaybillForAFS() {
  console.log("🚀 Creating test waybill for AFS Transport to receive live API keys...");
  
  // Test waybill data based on AFS example
  const waybillData = {
    islem: "waybill_olustur",
    alici: "Ahmet Aydın",
    alici_telefon: "00491782536147",
    alici_adres: "Krieger Str 16",
    alici_ulke: "DE",
    alici_sehir: "Cologne",
    alici_posta_kodu: "51147",
    gonderici: "MoogShip Demo",
    gonderici_adres: "İstanbul Caddesi, No: 19",
    gonderici_telefon: "00902125551122",
    gonderici_ulke: "TR",
    gonderici_sehir: "Istanbul",
    gonderici_posta_kodu: "34160",
    gonderiler: [
      {
        kap: 1,
        agirlik: 1.3,
        uzunluk: 10,
        genislik: 20,
        yukseklik: 35
      },
      {
        kap: 1,
        agirlik: 2.5,
        uzunluk: 10,
        genislik: 20,
        yukseklik: 35
      }
    ],
    servis_id: 1,
    beyan_id: 2,
    odeme_id: 1,
    fatura_icerigi: [
      {
        mal_cinsi: "Electronics",
        adet: 1,
        tip_id: 1,
        birim_fiyat: 25,
        gtip: "850015"
      },
      {
        mal_cinsi: "Clothing",
        adet: 1,
        tip_id: 1,
        birim_fiyat: 25,
        gtip: "62040001"
      }
    ],
    kur: 1,
    referans_kodu: `moogship-test-waybill-${Date.now()}`,
    aciklama: "MoogShip test waybill for API key activation",
    ddp: 0,
    ioss: "",
    vat: "",
    eori: ""
  };

  try {
    // Step 1: Create waybill
    console.log("📦 Step 1: Creating waybill...");
    const waybillResponse = await createAFSWaybill(waybillData);
    
    console.log("📊 Raw waybill response:", JSON.stringify(waybillResponse, null, 2));
    
    if (waybillResponse.hata) {
      console.error("❌ Waybill creation failed:", waybillResponse.mesaj);
      return;
    }

    console.log("✅ Waybill created successfully!");
    console.log("📄 Waybill ID (etsy_id):", waybillResponse.etsy_id);
    console.log("🏷️ Tracking Numbers:", waybillResponse.takip_kodlari);
    console.log("💰 Cost:", waybillResponse.ucret);
    console.log("📋 Waybill PDF:", waybillResponse.waybill_pdf);

    // Step 2: Create label using the tracking number
    if (waybillResponse.takip_kodlari && waybillResponse.takip_kodlari.length > 0) {
      const trackingNumber = waybillResponse.takip_kodlari[0]; // Use first tracking number
      console.log("\n📦 Step 2: Creating shipping label...");
      const labelResponse = await createAFSLabel(trackingNumber);
      
      console.log("📄 Label creation response:", JSON.stringify(labelResponse, null, 2));
      
      // Final instructions for getting live API keys
      console.log("\n🎯 SUCCESS! Test waybill and label created.");
      console.log("📧 Next steps to get live AFS Transport API keys:");
      console.log("   1. Send this waybill ID to AFS Transport: " + waybillResponse.etsy_id);
      console.log("   2. Send this tracking number to AFS Transport: " + trackingNumber);
      console.log("   3. Request live API key for production use");
      console.log("   4. Update environment variable AFS_API_KEY with live key");
      console.log("   5. Waybill PDF available at: " + waybillResponse.waybill_pdf);
    }

  } catch (error) {
    console.error("❌ Test waybill creation failed:", error);
  }
}

// Run the test
createTestWaybillForAFS().catch(console.error);