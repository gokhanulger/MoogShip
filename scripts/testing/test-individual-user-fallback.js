/**
 * Test individual user fallback when no company name is available
 */

import { generateShippingLabel } from './server/services/labelGenerator.ts';

console.log('🔍 Testing individual user fallback...');

const testShipmentIndividual = {
  id: 999,
  senderName: "FALLBACK NAME", // This should be ignored
  senderAddress: "HAL L RIFAT PAŞAâ $ àÖ MAHALLESI Y ZER HAVUZ SOKAK PERPA T C MER B BLOK NO 1/1 KAPI NO 159 L / STANBUL",
  senderCity: "İSTANBUL",
  senderPostalCode: "34000",
  user: {
    id: 3,
    name: "INDIVIDUAL USER",
    companyName: null // No company name, should use individual name
  },
  receiverName: "Marco romero",
  receiverAddress: "3006 33rd St",
  receiverAddress2: "Apt 4c",
  receiverCity: "ASTORIA",
  receiverState: "DE",
  receiverPostalCode: "11102-1502",
  receiverCountry: "Germany",
  packageWeight: 0.5,
  packageLength: 15,
  packageWidth: 10,
  packageHeight: 1,
  packageContents: "General merchandise",
  selectedService: 'shipentegra-widect',
  piece: 1
};

console.log('🏷️ Generating test label for individual user...');
const { labelPath, labelBase64 } = await generateShippingLabel(testShipmentIndividual);

if (labelPath && labelBase64) {
  console.log('✅ Individual label generated successfully');
  console.log(`   Label path: ${labelPath}`);
  console.log(`   PDF size: ${Math.round(labelBase64.length * 0.75 / 1024)}KB`);
  console.log('\n🎯 Expected: Label should show "INDIVIDUAL USER" as sender name');
} else {
  console.log('❌ Failed to generate individual label');
}