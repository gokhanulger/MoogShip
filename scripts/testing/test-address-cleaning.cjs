/**
 * Test Turkish character preservation in address cleaning
 */

// Simple test of the regex patterns used in cleanAddressText
function testCleanAddressText(text) {
  if (!text) return "";
  
  return text
    // Remove severe database encoding artifacts first
    .replace(/Â[^a-zA-Z]*/g, '') // Remove Â and any following non-letter characters
    .replace(/Ä[^a-zA-Z]*/g, 'A') // Replace Ä and cleanup
    .replace(/Ö(?![a-zA-ZİıŞşĞğÜüÇçÖö])/g, 'O') // Replace isolated Ö but preserve Turkish Ö
    .replace(/à[^a-zA-Z]*/g, 'a') // Replace à and cleanup
    .replace(/["`$@]/g, '') // Remove specific problematic characters: backtick, quote, dollar, at
    .replace(/‚/g, '') // Remove comma-like artifacts
    .replace(/Ô/g, 'O') // Replace Ô with O
    .replace(/á\d*/g, '') // Remove á followed by any digits
    // PRESERVE Turkish characters - enhanced preservation including all variants
    .replace(/[^\w\s\-.,\/\(\)İıŞşĞğÜüÇçÖöĀāĪīŪūĒēŌōĂăĔĕĭŏŭ]/g, ' ') // Keep Turkish and extended Latin characters
    // Standardize common Turkish address abbreviations
    .replace(/MAH\./gi, 'MAHALLESI')
    .replace(/SK\./gi, 'SOKAK')
    .replace(/CAD\./gi, 'CADDESI')
    .replace(/NO:/gi, 'NO')
    // Clean up spacing and artifacts - but preserve Turkish characters
    .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
    .replace(/^\s*[^\wİıŞşĞğÜüÇçÖö\s]+\s*/, '') // Remove leading non-alphanumeric characters but preserve Turkish
    .replace(/\s*[^\wİıŞşĞğÜüÇçÖö\s]+\s*$/, '') // Remove trailing non-alphanumeric characters but preserve Turkish
    .trim();
}

console.log('🧪 Testing Turkish character preservation:');

const testTexts = [
  'HALL RIFAT PAŞA',
  'PERPAT MAHALLESİ RIFAT PAŞA CADDESİ',
  'İSTANBUL ŞİŞLİ',
  'BÜYÜKÇEKMECE ÇUKUROVA',
  'GÖKTÜRK MAHALLESI'
];

testTexts.forEach(text => {
  const cleaned = testCleanAddressText(text);
  console.log(`"${text}" -> "${cleaned}"`);
  
  const turkishChars = ['ş', 'ğ', 'ı', 'ü', 'ö', 'ç', 'İ', 'Ş', 'Ğ', 'Ü', 'Ö', 'Ç'];
  const lost = turkishChars.some(char => text.includes(char) && !cleaned.includes(char));
  if (lost) {
    console.log('  ❌ Turkish characters lost');
  } else {
    console.log('  ✅ Turkish characters preserved');
  }
});