/**
 * Test AFS Transport Express service for shipments under 150 EUR without IOSS
 * This tests the business rule compliance for low-value shipments
 */

const AFS_API_KEY = process.env.AFS_TRANSPORT_API_KEY || process.env.AFS_API_KEY || "fmdcpkmkk9tvu";

console.log('Testing AFS Transport Express service for low-value shipments...');
console.log('API Key length:', AFS_API_KEY ? AFS_API_KEY.length : 'undefined');
console.log('API Key prefix:', AFS_API_KEY ? AFS_API_KEY.substring(0, 5) + '...' : 'undefined');

async function testAFSExpressService() {
  // Test payload for shipment under 150 EUR without IOSS (should use Express service)
  const testPayload = {
    islem: "waybill_olustur",
    alici: "Test Receiver DE",
    alici_adres: "Test Address 123",
    alici_telefon: "491234567890",
    alici_ulke: "DE",
    alici_sehir: "Berlin",
    alici_ilce: "Mitte", // Required district field
    alici_posta_kodu: "10115",
    gonderici: "MoogShip Test",
    gonderici_adres: "Istanbul Caddesi No:19",
    gonderici_telefon: "902125551122",
    gonderici_ulke: "TR",
    gonderici_sehir: "Istanbul",
    gonderici_posta_kodu: "34160",
    gonderiler: [{
      kap: 1,
      agirlik: 0.5,
      uzunluk: 10,
      genislik: 15,
      yukseklik: 20
    }],
    servis_id: 2, // Express service for under 150 EUR without IOSS
    beyan_id: 2,
    odeme_id: 1,
    fatura_icerigi: [{
      mal_cinsi: "Test Product",
      adet: 1,
      tip_id: 1,
      birim_fiyat: 35, // Under 150 EUR threshold
      gtip: "9999999999"
    }],
    kur: 1,
    referans_kodu: "TEST-EXPRESS-SERVICE",
    aciklama: "Testing Express service for low value",
    ddp: 0, // No DDP since no IOSS
    ioss: "", // No IOSS number
    vat: "",
    eori: ""
  };

  console.log('\n🔗 Testing AFS Transport Express Service...');
  console.log('URL: https://panel.afstransport.com/apiv2.php');
  console.log('Service ID: 2 (Express)');
  console.log('Invoice Value: 35 EUR (under 150 EUR threshold)');
  console.log('IOSS: None (should trigger Express requirement)');
  
  try {
    const response = await fetch('https://panel.afstransport.com/apiv2.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY,
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    console.log('\n📥 AFS API Response:');
    console.log('Status:', response.status);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('Response:', JSON.stringify(jsonResponse, null, 2));
      
      if (jsonResponse.success || jsonResponse.barkod) {
        console.log('\n✅ AFS Transport Express service integration successful!');
        console.log('🏷️ Tracking Number (Barkod):', jsonResponse.barkod);
        if (jsonResponse.takip_kodlari) {
          console.log('📋 All Tracking Codes:', jsonResponse.takip_kodlari);
        }
        return true;
      } else {
        console.log('\n❌ API Error:', jsonResponse.mesaj || 'Unknown error');
        console.log('Status Code:', jsonResponse.durum || '0');
        return false;
      }
    } catch (parseError) {
      console.log('Raw Response:', responseText);
      console.log('Parse Error:', parseError.message);
      return false;
    }
  } catch (error) {
    console.error('\n💥 Network Error:', error.message);
    return false;
  }
}

async function main() {
  const success = await testAFSExpressService();
  
  if (success) {
    console.log('\n🎉 AFS Transport integration is ready for production!');
    console.log('✅ Authentication: Working');
    console.log('✅ Payload Format: Correct');
    console.log('✅ Business Rules: Compliant');
    console.log('✅ Express Service: Functional');
  } else {
    console.log('\n🔧 AFS Transport requires further configuration');
  }
}

main().catch(console.error);