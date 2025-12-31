/**
 * Comprehensive test script for free translation providers
 * Tests LibreTranslate, MyMemory, and offline dictionary fallback
 */

import fetch from 'node-fetch';

// Free translation services
const FREE_TRANSLATION_SERVICES = {
  LIBRE_TRANSLATE: 'https://libretranslate.de/translate',
  MYMEMORY: 'https://api.mymemory.translated.net/get'
};

/**
 * Try LibreTranslate free service
 */
async function testLibreTranslate(text, sourceLanguage) {
  try {
    console.log(`\n🔄 Testing LibreTranslate: "${text}" (${sourceLanguage} → en)`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(FREE_TRANSLATION_SERVICES.LIBRE_TRANSLATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLanguage,
        target: 'en',
        format: 'text'
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log(`❌ LibreTranslate failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = data.translatedText || null;
    
    if (result) {
      console.log(`✅ LibreTranslate result: "${result}"`);
    } else {
      console.log(`❌ LibreTranslate: No translation returned`);
    }
    
    return result;
  } catch (error) {
    console.log(`❌ LibreTranslate error: ${error.message}`);
    return null;
  }
}

/**
 * Try MyMemory free service
 */
async function testMyMemory(text, sourceLanguage) {
  try {
    console.log(`\n🔄 Testing MyMemory: "${text}" (${sourceLanguage} → en)`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const url = `${FREE_TRANSLATION_SERVICES.MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${sourceLanguage}|en`;
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log(`❌ MyMemory failed: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      console.log(`✅ MyMemory result: "${data.responseData.translatedText}"`);
      console.log(`📊 Match confidence: ${data.responseData.match || 'N/A'}`);
      return data.responseData.translatedText;
    } else {
      console.log(`❌ MyMemory: No valid translation (status: ${data.responseStatus})`);
    }
    
    return null;
  } catch (error) {
    console.log(`❌ MyMemory error: ${error.message}`);
    return null;
  }
}

/**
 * Test offline dictionary fallback
 */
function testOfflineDictionary(text, detectedLanguage) {
  console.log(`\n🔄 Testing Offline Dictionary: "${text}" (${detectedLanguage})`);
  
  const offlineTranslations = {
    'tr': {
      'masa': 'table',
      'seti': 'set',
      'masa seti': 'table set',
      'erkek': 'men',
      'elbise': 'dress',
      'kadın': 'women',
      'çocuk': 'children',
      'kitap': 'book',
      'oyuncak': 'toy',
      'çanta': 'bag',
      'ayakkabı': 'shoe',
      'telefon': 'phone'
    },
    'es': {
      'ropa': 'clothing',
      'hombre': 'men',
      'ropa de hombre': 'men clothing',
      'mujer': 'women',
      'niño': 'children',
      'vestido': 'dress',
      'camisa': 'shirt',
      'zapatos': 'shoes'
    },
    'fr': {
      'bonjour': 'hello',
      'monde': 'world', 
      'bonjour monde': 'hello world',
      'homme': 'men',
      'femme': 'women',
      'vêtement': 'clothing',
      'robe': 'dress',
      'chaussures': 'shoes'
    }
  };

  const lowerText = text.toLowerCase();
  const translations = offlineTranslations[detectedLanguage] || {};
  
  // Check for exact match first
  if (translations[lowerText]) {
    console.log(`✅ Offline Dictionary (exact): "${translations[lowerText]}"`);
    return translations[lowerText];
  }
  
  // Try word-by-word translation
  const words = lowerText.split(' ');
  const translatedWords = words.map(word => translations[word] || word);
  
  if (translatedWords.some(word => translations[word.toLowerCase()])) {
    const result = translatedWords.join(' ');
    console.log(`✅ Offline Dictionary (word-by-word): "${result}"`);
    return result;
  }
  
  console.log(`❌ Offline Dictionary: No translation found`);
  return null;
}

/**
 * Comprehensive test suite
 */
async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive free translation provider tests...\n');
  
  const testCases = [
    { text: 'bonjour monde', language: 'fr', description: 'French greeting' },
    { text: 'ropa de hombre', language: 'es', description: 'Spanish product name' },
    { text: 'masa seti', language: 'tr', description: 'Turkish product name' },
    { text: 'hello world', language: 'en', description: 'English text (should not translate)' },
    { text: 'vêtement femme', language: 'fr', description: 'French clothing term' },
    { text: 'zapatos niño', language: 'es', description: 'Spanish children shoes' }
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Test Case: ${testCase.description}`);
    console.log(`📥 Input: "${testCase.text}" (${testCase.language})`);
    console.log(`${'='.repeat(60)}`);
    
    if (testCase.language === 'en') {
      console.log(`ℹ️  Skipping translation for English text`);
      continue;
    }
    
    // Test LibreTranslate
    const libreResult = await testLibreTranslate(testCase.text, testCase.language);
    
    // Test MyMemory
    const myMemoryResult = await testMyMemory(testCase.text, testCase.language);
    
    // Test offline dictionary
    const offlineResult = testOfflineDictionary(testCase.text, testCase.language);
    
    // Summary
    console.log(`\n📊 Summary for "${testCase.text}":`);
    console.log(`   LibreTranslate: ${libreResult || 'Failed'}`);
    console.log(`   MyMemory: ${myMemoryResult || 'Failed'}`);
    console.log(`   Offline Dict: ${offlineResult || 'Failed'}`);
    
    const workingProviders = [libreResult, myMemoryResult, offlineResult].filter(Boolean);
    console.log(`   ✅ Working providers: ${workingProviders.length}/3`);
    
    if (workingProviders.length > 0) {
      console.log(`   🎯 Best result: "${workingProviders[0]}"`);
    } else {
      console.log(`   ⚠️  No working providers for this text`);
    }
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🏁 Free translation provider tests completed!');
  console.log(`${'='.repeat(60)}`);
}

// Run the tests
runComprehensiveTests().catch(console.error);