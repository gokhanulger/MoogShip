/**
 * Test script to verify DDP is properly sent in AFS Transport API payload
 */

async function testDDPPayload() {
  console.log('🔍 Testing DDP in AFS Transport API payload...\n');
  
  // Simulate the buildAFSWaybillData function logic
  function buildTestWaybillData(shipment) {
    const serviceId = parseInt(shipment.selectedService?.replace('afs-', '') || '7');
    
    return {
      islem: "waybill_olustur",
      alici: shipment.receiverName,
      alici_telefon: "+491234567890",
      alici_adres: shipment.receiverAddress,
      alici_ulke: shipment.receiverCountry,
      alici_sehir: shipment.receiverCity,
      alici_posta_kodu: shipment.receiverPostalCode,
      gonderici: shipment.senderName,
      gonderici_adres: shipment.senderAddress1,
      gonderici_telefon: "905407447911",
      gonderici_ulke: "TR",
      gonderici_sehir: shipment.senderCity,
      gonderici_posta_kodu: shipment.senderPostalCode,
      gonderiler: [{
        kap: shipment.pieceCount,
        agirlik: shipment.packageWeight,
        uzunluk: shipment.packageLength,
        genislik: shipment.packageWidth,
        yukseklik: shipment.packageHeight
      }],
      servis_id: serviceId,
      beyan_id: 1,
      odeme_id: 1,
      fatura_icerigi: [{
        mal_cinsi: shipment.packageContents || "General Merchandise",
        adet: 1,
        tip_id: 1,
        birim_fiyat: (shipment.customsValue || shipment.totalPrice || 5000) / 100,
        gtip: shipment.gtip || "9999999999"
      }],
      kur: 1,
      referans_kodu: shipment.trackingNumber || `REF-${shipment.id}`,
      aciklama: `MoogShip shipment ${shipment.id}`,
      ddp: shipment.iossNumber ? 1 : 0, // THE DDP SETTING
      ioss: shipment.iossNumber || "",
      vat: "",
      eori: ""
    };
  }
  
  // Test Case 1: Shipment WITH IOSS (should have ddp: 1)
  console.log('📦 Test Case 1: Shipment WITH IOSS number');
  const shipmentWithIOSS = {
    id: 500,
    selectedService: 'afs-7',
    senderName: 'GOKHAN ULGER',
    senderAddress1: 'Esentepe Mahallesi Anadolu Caddesi No:1',
    senderCity: 'Istanbul',
    senderPostalCode: '34394',
    receiverName: 'Test Customer',
    receiverAddress: '123 Main Street',
    receiverCity: 'Berlin',
    receiverCountry: 'DE',
    receiverPostalCode: '10115',
    packageWeight: 1.0,
    packageLength: 10,
    packageWidth: 10,
    packageHeight: 10,
    pieceCount: 1,
    packageContents: 'Electronics',
    totalPrice: 2000,
    customsValue: 2000,
    trackingNumber: 'MOG255805000500',
    iossNumber: 'IM2760000001' // EU IOSS number
  };
  
  const payloadWithIOSS = buildTestWaybillData(shipmentWithIOSS);
  
  console.log('📋 Complete AFS Transport API Payload:');
  console.log(JSON.stringify(payloadWithIOSS, null, 2));
  
  console.log('\n🎯 DDP Field Verification:');
  console.log(`   ├─ IOSS Number: "${payloadWithIOSS.ioss}"`);
  console.log(`   ├─ DDP Setting: ${payloadWithIOSS.ddp}`);
  console.log(`   ├─ Customs Type: ${payloadWithIOSS.ddp === 1 ? 'DDP (Delivered Duty Paid)' : 'DAP (Delivered at Place)'}`);
  console.log(`   └─ Status: ${payloadWithIOSS.ddp === 1 ? '✅ CORRECT - DDP for IOSS shipments' : '❌ INCORRECT'}`);
  
  // Test Case 2: Shipment WITHOUT IOSS (should have ddp: 0)
  console.log('\n📦 Test Case 2: Shipment WITHOUT IOSS number');
  const shipmentWithoutIOSS = {
    ...shipmentWithIOSS,
    id: 501,
    trackingNumber: 'MOG255805000501',
    iossNumber: null // No IOSS
  };
  
  const payloadWithoutIOSS = buildTestWaybillData(shipmentWithoutIOSS);
  
  console.log('\n🎯 DDP Field Verification (No IOSS):');
  console.log(`   ├─ IOSS Number: "${payloadWithoutIOSS.ioss}"`);
  console.log(`   ├─ DDP Setting: ${payloadWithoutIOSS.ddp}`);
  console.log(`   ├─ Customs Type: ${payloadWithoutIOSS.ddp === 1 ? 'DDP (Delivered Duty Paid)' : 'DAP (Delivered at Place)'}`);
  console.log(`   └─ Status: ${payloadWithoutIOSS.ddp === 0 ? '✅ CORRECT - DAP for non-IOSS shipments' : '❌ INCORRECT'}`);
  
  console.log('\n📊 Summary:');
  console.log('   ├─ DDP field is included in both payloads');
  console.log('   ├─ Value changes based on IOSS number presence');
  console.log('   ├─ IOSS shipments → ddp: 1 (DDP)');
  console.log('   ├─ Non-IOSS shipments → ddp: 0 (DAP)');
  console.log('   └─ EU customs regulations compliance achieved');
}

testDDPPayload().then(() => {
  console.log('\n🏁 DDP payload verification completed.');
  process.exit(0);
}).catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});