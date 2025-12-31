/**
 * Test Turkish character preservation and duplicate address fix in label generation
 */

import { generateShippingLabel, cleanAddressText } from './server/services/labelGenerator.js';

async function testTurkishLabelFix() {
  console.log('🧪 Testing Turkish character preservation and duplicate address fix...');
  
  // Create test shipment with Turkish characters
  const testShipment = {
    id: 999,
    senderName: "HALL RIFAT PAŞA",
    senderAddress: "PERPAT MAHALLESİ RIFAT PAŞA CADDESİ NO:123",
    senderAddress2: null, // Test without second address first
    senderCity: "İSTANBUL",
    senderPostalCode: "34000",
    receiverName: "CUSTOMER TEST",
    receiverAddress: "123 Test Street",
    receiverCity: "New York",
    receiverState: "NY",
    receiverPostalCode: "10001",
    receiverCountry: "United States",
    receiverPhone: "+1234567890",
    packageContents: "Test Package",
    packageWeight: 1.0,
    packageLength: 10,
    packageWidth: 10,
    packageHeight: 10,
    selectedService: "MoogShip Eco",
    totalPrice: 1299,
    status: "approved"
  };

  try {
    console.log('📝 Test shipment data:');
    console.log('  Sender Name:', testShipment.senderName);
    console.log('  Sender Address:', testShipment.senderAddress);
    console.log('  Sender City:', testShipment.senderCity);
    
    // Generate label
    const result = await generateShippingLabel(testShipment);
    
    console.log('✅ Label generated successfully!');
    console.log('📄 Label path:', result.labelPath);
    console.log('📏 PDF size:', result.labelBase64.length, 'characters');
    
    // Test address cleaning function directly
    
    console.log('\n🔍 Testing cleanAddressText function:');
    const testTexts = [
      "HALL RIFAT PAŞA",
      "PERPAT MAHALLESİ RIFAT PAŞA CADDESİ",
      "İSTANBUL ŞİŞLİ",
      "BÜYÜKÇEKMECE ÇUKUROVA",
      "GÖKTÜRK MAHALLESI"
    ];
    
    for (const text of testTexts) {
      const cleaned = cleanAddressText(text);
      console.log(`  "${text}" -> "${cleaned}"`);
      
      // Check if Turkish characters are preserved
      const turkishChars = ['ş', 'ğ', 'ı', 'ü', 'ö', 'ç', 'İ', 'Ş', 'Ğ', 'Ü', 'Ö', 'Ç'];
      const preserved = turkishChars.some(char => text.includes(char) && cleaned.includes(char));
      const lost = turkishChars.some(char => text.includes(char) && !cleaned.includes(char));
      
      if (lost) {
        console.log(`    ❌ Turkish characters lost in: "${text}"`);
      } else if (preserved) {
        console.log(`    ✅ Turkish characters preserved`);
      }
    }
    
    console.log('\n🎯 Test completed - check generated label for:');
    console.log('  1. Turkish characters display correctly (no missing ş, ğ, ı, etc.)');
    console.log('  2. No duplicate address in FROM section');
    console.log('  3. Clean professional formatting');
    
  } catch (error) {
    console.error('❌ Label generation failed:', error.message);
  }
}

testTurkishLabelFix();