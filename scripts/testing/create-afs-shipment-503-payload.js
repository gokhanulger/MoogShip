/**
 * Create complete AFS Transport payload for shipment #SH-000503
 * With specified parameters: DDP customs, EcoAFS service (ID 1), Non-document declaration (ID 2), Sender paid (ID 1)
 */

const shipmentData = {
  id: 503,
  userId: 2,
  senderName: "MOOG ENTERPRISE",
  senderAddress: "HALIL RIFAT PASA MAH. YUZER HAVUZ",
  senderCity: "ISTANBUL", 
  senderPostalCode: "34300",
  senderPhone: "+905052878705",
  senderEmail: "gokhan@moogco.com",
  receiverName: "Serhan bilir",
  receiverAddress: "Rodgaustraße 18",
  receiverCity: "Dietzenbach",
  receiverCountry: "DE",
  receiverPostalCode: "63128", 
  receiverPhone: "491628164250",
  receiverEmail: "info@moogship.com",
  packageLength: 25,
  packageWidth: 20,
  packageHeight: 8,
  packageWeight: 1.28,
  packageContents: "Reading Book",
  pieceCount: 1,
  customsValue: 50.00,
  gtip: "4901990000", // Books GTIP code
  iossNumber: "IM2760000184"
};

// Build complete AFS Transport waybill payload
function buildAFSWaybillPayload(shipment) {
  return {
    // Operation type
    islem: "waybill_olustur",
    
    // Receiver (Alici) information
    alici: shipment.receiverName,
    alici_telefon: shipment.receiverPhone,
    alici_adres: shipment.receiverAddress,
    alici_ulke: shipment.receiverCountry,
    alici_sehir: shipment.receiverCity,
    alici_posta_kodu: shipment.receiverPostalCode,
    
    // Sender (Gonderici) information - Customer as sender
    gonderici: shipment.senderName,
    gonderici_adres: shipment.senderAddress,
    gonderici_telefon: shipment.senderPhone.replace('+', ''),
    gonderici_ulke: "TR",
    gonderici_sehir: shipment.senderCity,
    gonderici_posta_kodu: shipment.senderPostalCode,
    
    // Package information (Gonderiler)
    gonderiler: [{
      kap: shipment.pieceCount,
      agirlik: shipment.packageWeight,
      uzunluk: shipment.packageLength,
      genislik: shipment.packageWidth,
      yukseklik: shipment.packageHeight
    }],
    
    // Service configuration as requested
    servis_id: 1,     // EcoAFS service (ID 1)
    beyan_id: 2,      // Beyanname Türü: Doküman Harici (ID 2) 
    odeme_id: 1,      // Ödeme Türü: Gönderici Ödemeli (ID 1)
    
    // Customs declaration (Fatura İçeriği)
    fatura_icerigi: [{
      mal_cinsi: shipment.packageContents,
      adet: shipment.pieceCount,
      tip_id: 1,        // Product type ID
      birim_fiyat: shipment.customsValue,
      gtip: shipment.gtip
    }],
    
    // Currency and reference
    kur: 1,
    referans_kodu: `MOG255609000${shipment.id}-${Date.now()}`,
    aciklama: `MoogShip shipment ${shipment.id}`,
    
    // Customs configuration as requested
    ddp: 1,           // Gümrükleme Türü: DDP (as requested)
    ioss: shipment.iossNumber || "",
    vat: "",
    eori: ""
  };
}

// Create the payload
const afsPayload = buildAFSWaybillPayload(shipmentData);

console.log("🚀 AFS Transport Waybill Payload for Shipment #SH-000503:");
console.log("=" .repeat(80));
console.log(JSON.stringify(afsPayload, null, 2));

console.log("\n📋 Payload Configuration Summary:");
console.log("- Gümrükleme Türü: DDP (ddp: 1)");
console.log("- Servis: EcoAFS (servis_id: 1)");  
console.log("- Beyanname Türü: Doküman Harici (beyan_id: 2)");
console.log("- Ödeme Türü: Gönderici Ödemeli (odeme_id: 1)");
console.log("- Customer as Sender: " + afsPayload.gonderici);
console.log("- IOSS Number: " + afsPayload.ioss);
console.log("- Package Weight: " + afsPayload.gonderiler[0].agirlik + " kg");
console.log("- Customs Value: $" + afsPayload.fatura_icerigi[0].birim_fiyat);

// Simulate API call payload size
const payloadString = JSON.stringify(afsPayload);
console.log("\n📊 Payload Statistics:");
console.log("- Payload Size: " + payloadString.length + " characters");
console.log("- Number of Fields: " + Object.keys(afsPayload).length);
console.log("- Package Count: " + afsPayload.gonderiler.length);
console.log("- Customs Items: " + afsPayload.fatura_icerigi.length);

