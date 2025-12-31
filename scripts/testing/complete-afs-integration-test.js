/**
 * Complete AFS Transport integration test with fresh waybill creation
 * This will create a new waybill and label, then store results in database
 */

import fetch from 'node-fetch';

const AFS_API_URL = "https://panel.afstransport.com/apiv2.php";
const AFS_API_KEY = process.env.AFS_API_KEY || "fmdnh47u6zgcy";

// First create a waybill to get a valid barkod
async function createTestWaybill() {
  const waybillPayload = {
    islem: "waybill_olustur",
    alici: "Test Recipient",
    alici_telefon: "+4915123456789",
    alici_adres: "Test Street 123",
    alici_ulke: "DE",
    alici_sehir: "Berlin",
    alici_posta_kodu: "10115",
    gonderici: "MOOG ENTERPRISE",
    gonderici_adres: "HALIL RIFAT PASA MAH. YUZER HAVUZ",
    gonderici_telefon: "905052878705",
    gonderici_ulke: "TR",
    gonderici_sehir: "ISTANBUL",
    gonderici_posta_kodu: "34300",
    gonderiler: JSON.stringify([{
      kap: 1,
      agirlik: 0.5,
      uzunluk: 20,
      genislik: 15,
      yukseklik: 10
    }]),
    servis_id: 1,
    beyan_id: 2,
    odeme_id: 1,
    fatura_icerigi: JSON.stringify([{
      mal_cinsi: "Test Item",
      adet: 1,
      tip_id: 1,
      birim_fiyat: 25.00,
      gtip: "9999999999"
    }]),
    kur: 1,
    referans_kodu: `TEST-${Date.now()}`,
    aciklama: "Test waybill for label creation",
    ddp: 1,
    ioss: "",
    vat: "",
    eori: "",
    key: AFS_API_KEY
  };

  try {
    const formData = new URLSearchParams();
    Object.entries(waybillPayload).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': AFS_API_KEY
      },
      body: formData
    });

    const responseText = await response.text();
    console.log("🚀 Waybill Creation Response:");
    console.log("Status:", response.status);
    console.log("Response:", responseText);

    try {
      const data = JSON.parse(responseText);
      return data.barkod || null;
    } catch (e) {
      console.log("Could not parse waybill response as JSON");
      return null;
    }
  } catch (error) {
    console.error("Waybill creation failed:", error.message);
    return null;
  }
}

// Create label using the barkod from waybill response
async function createLabel(barkod) {
  console.log(`\n🏷️ Creating label for barkod: ${barkod}`);
  
  const labelPayload = {
    islem: "etiket_olustur",
    barkod: barkod
  };

  try {
    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY
      },
      body: JSON.stringify(labelPayload)
    });

    const responseText = await response.text();
    
    console.log("📥 Label Creation Response:");
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Response Body:", responseText);

    // Try to parse as JSON
    try {
      const labelData = JSON.parse(responseText);
      console.log("\n📊 Parsed Label Response:");
      console.log(JSON.stringify(labelData, null, 2));
      return labelData;
    } catch (e) {
      console.log("Response is not valid JSON, showing raw response above");
      return { error: "Invalid JSON response", raw: responseText };
    }

  } catch (error) {
    console.error("Label creation request failed:", error.message);
    return { error: error.message };
  }
}

// Also try with form data encoding
async function createLabelFormData(barkod) {
  console.log(`\n🏷️ Creating label with form data for barkod: ${barkod}`);
  
  const formData = new URLSearchParams();
  formData.append('islem', 'etiket_olustur');
  formData.append('barkod', barkod);
  formData.append('key', AFS_API_KEY);

  try {
    const response = await fetch(AFS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'x-api-key': AFS_API_KEY
      },
      body: formData
    });

    const responseText = await response.text();
    
    console.log("📥 Label Creation Response (Form Data):");
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Response Body:", responseText);

    try {
      const labelData = JSON.parse(responseText);
      console.log("\n📊 Parsed Label Response (Form Data):");
      console.log(JSON.stringify(labelData, null, 2));
      return labelData;
    } catch (e) {
      console.log("Response is not valid JSON, showing raw response above");
      return { error: "Invalid JSON response", raw: responseText };
    }

  } catch (error) {
    console.error("Label creation request failed:", error.message);
    return { error: error.message };
  }
}

async function completeAFSIntegrationTest() {
  console.log("🧪 Complete AFS Transport Integration Test");
  console.log("=" .repeat(60));
  
  // Step 1: Create waybill to get valid barkod
  const barkod = await createTestWaybill();
  
  if (barkod) {
    console.log(`\n✅ Got barkod from waybill: ${barkod}`);
    
    // Step 2: Create label with JSON payload
    const labelResponse1 = await createLabel(barkod);
    
    // Step 3: Create label with form data
    const labelResponse2 = await createLabelFormData(barkod);
    
    console.log("\n📋 Integration Summary:");
    console.log("- Waybill barkod:", barkod);
    console.log("- JSON response:", labelResponse1.error ? "Failed" : "Success");
    console.log("- Form data response:", labelResponse2.error ? "Failed" : "Success");
    
  } else {
    console.log("\n❌ Could not get valid barkod from waybill creation");
    
    // Try with example barkod anyway
    console.log("\n🔄 Trying with example barkod...");
    await createLabel("api-waybill-ornek");
    await createLabelFormData("api-waybill-ornek");
  }
}

completeAFSIntegrationTest().catch(console.error);
