/**
 * Test script to identify and fix duplicate address rendering in shipping labels
 * Also tests Turkish character preservation
 */

import { generateShippingLabel, cleanAddressText } from './server/services/labelGenerator.ts';

async function testLabelDuplicateFix() {
  console.log('🔍 Testing label generation for duplicate address and Turkish character issues...\n');

  // Test cleanAddressText function with problematic Turkish text
  const testAddress = "HAL L RIFAT PAŞAâ $ àÖ";
  const cleanedAddress = cleanAddressText(testAddress);
  console.log('📝 Address cleaning test:');
  console.log(`   Original: "${testAddress}"`);
  console.log(`   Cleaned:  "${cleanedAddress}"`);
  console.log(`   Turkish chars preserved: ${cleanedAddress.includes('Ş') && cleanedAddress.includes('A')}`);
  console.log('');

  // Create test shipment with Turkish characters in address
  const testShipment = {
    id: 999,
    senderName: "HALL RIFAT PAŞA",
    senderAddress: "HALL RIFAT PAŞA MAHALLESİ",
    senderCity: "İSTANBUL",
    senderPostalCode: "34000",
    receiverName: "TEST CUSTOMER",
    receiverAddress: "123 Main Street",
    receiverCity: "New York",
    receiverState: "NY",
    receiverPostalCode: "10001",
    receiverCountry: "United States",
    packageWeight: 1.0,
    packageLength: 20,
    packageWidth: 15,
    packageHeight: 10,
    packageContents: "Test Item",
    selectedService: "shipentegra-eco"
  };

  try {
    console.log('🏷️ Generating test label with Turkish characters...');
    const result = await generateShippingLabel(testShipment);
    
    if (result && result.labelPath) {
      console.log('✅ Label generated successfully');
      console.log(`   Label path: ${result.labelPath}`);
      console.log(`   PDF size: ${result.labelBase64 ? Math.round(result.labelBase64.length / 1024) : 0}KB`);
      console.log('');
      console.log('🎯 Please check the generated label for:');
      console.log('  1. No duplicate address in FROM section');
      console.log('  2. Turkish characters display correctly (PAŞA not PA A)');
      console.log('  3. Clean professional formatting');
    } else {
      console.log('❌ Label generation failed - no result returned');
    }
    
  } catch (error) {
    console.error('❌ Label generation error:', error.message);
  }
}

testLabelDuplicateFix();