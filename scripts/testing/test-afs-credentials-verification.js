/**
 * Test AFS Transport API credentials verification
 * This script tests the new API key and verifies the complete integration workflow
 */

import fetch from "node-fetch";

// Test with environment variable
const AFS_API_KEY = process.env.AFS_TRANSPORT_API_KEY || process.env.AFS_API_KEY;

console.log('Testing AFS Transport API credentials...');
console.log('API Key length:', AFS_API_KEY ? AFS_API_KEY.length : 'undefined');
console.log('API Key prefix:', AFS_API_KEY ? AFS_API_KEY.substring(0, 5) + '...' : 'undefined');

async function testAFSCredentials() {
  const testPayload = {
    islem: "waybill_olustur",
    alici: "Test Receiver",
    alici_adres: "Test Address 123",
    alici_telefon: "1234567890",
    alici_ulke: "US",
    alici_sehir: "New York",
    alici_ilce: "Manhattan", // Required district field
    alici_posta_kodu: "10001",
    gonderici: "Test Sender",
    gonderici_adres: "Sender Address 456",
    gonderici_telefon: "0987654321",
    gonderici_ulke: "TR",
    gonderici_sehir: "Istanbul",
    gonderici_posta_kodu: "34000",
    gonderiler: [{
      kap: 1,
      agirlik: 0.5,
      uzunluk: 10,
      genislik: 10,
      yukseklik: 10
    }],
    servis_id: 1,
    beyan_id: 2,
    odeme_id: 1,
    fatura_icerigi: [{
      mal_cinsi: "test item",
      adet: 1,
      tip_id: 1,
      birim_fiyat: 10,
      gtip: "9999999999"
    }],
    kur: 1,
    referans_kodu: "TEST-CREDENTIALS-2025",
    aciklama: "Testing updated API credentials",
    ddp: 0, // Required field
    ioss: "",
    vat: "",
    eori: ""
  };

  console.log('\n🔗 Testing AFS Transport API...');
  console.log('URL: https://panel.afstransport.com/apiv2.php');
  
  try {
    const response = await fetch('https://panel.afstransport.com/apiv2.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': AFS_API_KEY,
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    console.log('\n📥 AFS API Response:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    if (result.hata) {
      console.log('\n❌ API Error:', result.mesaj);
      console.log('Status Code:', result.durum);
      return false;
    } else {
      console.log('\n✅ API Success! Waybill created successfully');
      if (result.takip_kodlari) {
        console.log('Tracking numbers:', result.takip_kodlari);
      }
      return true;
    }
    
  } catch (error) {
    console.error('\n💥 Request failed:', error.message);
    return false;
  }
}

// Run the test
testAFSCredentials()
  .then(success => {
    if (success) {
      console.log('\n🎉 AFS Transport integration is ready!');
    } else {
      console.log('\n🚫 AFS Transport credentials need to be updated');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });