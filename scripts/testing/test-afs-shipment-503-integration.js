/**
 * Test AFS Transport integration for shipment #SH-000503
 * Creates actual waybill and demonstrates tracking retrieval
 */

const fetch = require('node-fetch');

// AFS Transport API configuration
const AFS_API_URL = "https://panel.afstransport.com/apiv2.php";
const AFS_API_KEY = process.env.AFS_API_KEY || "fmdnh47u6zgcy"; // Demo API key

// Complete payload for shipment #SH-000503 with requested parameters
const waybillPayload = {
  islem: "waybill_olustur",
  alici: "Serhan bilir",
  alici_telefon: "491628164250",
  alici_adres: "Rodgaustraße 18",
  alici_ulke: "DE",
  alici_sehir: "Dietzenbach", 
  alici_posta_kodu: "63128",
  gonderici: "MOOG ENTERPRISE",
  gonderici_adres: "HALIL RIFAT PASA MAH. YUZER HAVUZ",
  gonderici_telefon: "905052878705",
  gonderici_ulke: "TR",
  gonderici_sehir: "ISTANBUL",
  gonderici_posta_kodu: "34300",
  gonderiler: JSON.stringify([{
    kap: 1,
    agirlik: 1.28,
    uzunluk: 25,
    genislik: 20,
    yukseklik: 8
  }]),
  servis_id: 1,      // EcoAFS service (ID 1)
  beyan_id: 2,       // Beyanname Türü: Doküman Harici (ID 2)
  odeme_id: 1,       // Ödeme Türü: Gönderici Ödemeli (ID 1)
  fatura_icerigi: JSON.stringify([{
    mal_cinsi: "Reading Book",
    adet: 1,
    tip_id: 1,
    birim_fiyat: 50.00,
    gtip: "4901990000"
  }]),
  kur: 1,
  referans_kodu: `MOG255609000503-${Date.now()}`,
  aciklama: "MoogShip shipment 503",
  ddp: 1,            // Gümrükleme Türü: DDP (as requested)
  ioss: "IM2760000184",
  vat: "",
  eori: "",
  key: AFS_API_KEY
};

async function createAFSWaybill() {
  console.log("🚀 Creating AFS Transport waybill for shipment #SH-000503");
  console.log("📋 Payload configuration:");
  console.log("- Gümrükleme Türü: DDP (ddp: 1)");
  console.log("- Servis: EcoAFS (servis_id: 1)");  
  console.log("- Beyanname Türü: Doküman Harici (beyan_id: 2)");
  console.log("- Ödeme Türü: Gönderici Ödemeli (odeme_id: 1)");
  
  try {
    // Create form data for API call
    const formData = new URLSearchParams();
    Object.entries(waybillPayload).forEach(([key, value]) => {
      formData.append(key, value);
    });

    console.log("\n📤 Sending waybill creation request...");
    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const responseText = await response.text();
    console.log("\n📥 AFS Transport waybill response:");
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    let waybillData;
    try {
      waybillData = JSON.parse(responseText);
    } catch (e) {
      console.log("Response is not JSON, raw response:");
      console.log(responseText);
      return null;
    }

    if (!waybillData.hata && waybillData.barkod) {
      console.log("\n✅ Waybill created successfully!");
      console.log("- Tracking Number:", waybillData.barkod);
      console.log("- Waybill ID:", waybillData.waybill_id || "N/A");
      console.log("- Service:", "EcoAFS");
      
      if (waybillData.waybill_pdf) {
        console.log("- Waybill PDF URL:", waybillData.waybill_pdf);
      }
      
      return waybillData.barkod;
    } else {
      console.log("\n❌ Waybill creation failed:");
      console.log("Error:", waybillData.mesaj || "Unknown error");
      return null;
    }
  } catch (error) {
    console.error("\n❌ API call failed:", error.message);
    return null;
  }
}

async function createAFSLabel(trackingNumber) {
  if (!trackingNumber) return null;
  
  console.log(`\n🏷️ Creating label for tracking: ${trackingNumber}`);
  
  try {
    const labelPayload = new URLSearchParams({
      islem: "label_olustur",
      barkod: trackingNumber,
      key: AFS_API_KEY
    });

    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: labelPayload
    });

    const responseText = await response.text();
    console.log("📥 Label creation response:");
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    try {
      const labelData = JSON.parse(responseText);
      if (!labelData.hata && labelData.label_pdf) {
        console.log("✅ Label created successfully!");
        console.log("- Label PDF URL:", labelData.label_pdf);
        return labelData.label_pdf;
      } else {
        console.log("❌ Label creation failed:", labelData.mesaj);
        return null;
      }
    } catch (e) {
      console.log("Label response is not JSON, raw response:");
      console.log(responseText);
      return null;
    }
  } catch (error) {
    console.error("❌ Label creation failed:", error.message);
    return null;
  }
}

async function getAFSTracking(trackingNumber) {
  if (!trackingNumber) return null;
  
  console.log(`\n📍 Retrieving tracking info for: ${trackingNumber}`);
  
  try {
    const trackingPayload = new URLSearchParams({
      islem: "takip_sorgula", 
      barkod: trackingNumber,
      key: AFS_API_KEY
    });

    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: trackingPayload
    });

    const responseText = await response.text();
    console.log("📥 Tracking response:");
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    try {
      const trackingData = JSON.parse(responseText);
      if (!trackingData.hata) {
        console.log("✅ Tracking data retrieved successfully!");
        console.log("- Status:", trackingData.durum || "N/A");
        console.log("- Last Update:", trackingData.son_guncellenme || "N/A");
        if (trackingData.tracking_events) {
          console.log("- Events:", trackingData.tracking_events.length);
        }
        return trackingData;
      } else {
        console.log("❌ Tracking retrieval failed:", trackingData.mesaj);
        return null;
      }
    } catch (e) {
      console.log("Tracking response is not JSON, raw response:");
      console.log(responseText);
      return null;
    }
  } catch (error) {
    console.error("❌ Tracking retrieval failed:", error.message);
    return null;
  }
}

// Execute complete integration test
async function runCompleteTest() {
  console.log("🧪 AFS Transport Integration Test for Shipment #SH-000503");
  console.log("=" .repeat(60));
  
  // Step 1: Create waybill
  const trackingNumber = await createAFSWaybill();
  
  if (trackingNumber) {
    // Step 2: Create label
    await createAFSLabel(trackingNumber);
    
    // Step 3: Get tracking info
    await getAFSTracking(trackingNumber);
    
    console.log("\n📊 Database Update Operations Required:");
    console.log(`UPDATE shipments SET`);
    console.log(`  carrier_tracking_number = '${trackingNumber}',`);
    console.log(`  carrier_name = 'AFS Transport',`);
    console.log(`  shipping_provider = 'afs'`);
    console.log(`WHERE id = 503;`);
  }
  
  console.log("\n✨ Integration test completed");
}

runCompleteTest().catch(console.error);
