/**
 * Test script to verify offline translation functionality
 * when OpenAI API quota is exceeded
 */

import fetch from 'node-fetch';

async function testOfflineTranslation() {
  console.log('Testing offline translation system...\n');
  
  const testCases = [
    'ropa de hombre',
    'masa seti', 
    'erkek elbise',
    'hello world',
    'zapatos',
    'ayakkabı'
  ];
  
  for (const text of testCases) {
    try {
      console.log(`Testing: "${text}"`);
      
      const response = await fetch('http://localhost:5000/api/translate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text })
      });
      
      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
        continue;
      }
      
      const result = await response.json();
      
      console.log(`  Language: ${result.detectedLanguage}`);
      console.log(`  Original: ${result.originalText}`);
      console.log(`  Translated: ${result.translatedText}`);
      console.log(`  Needs Translation: ${result.needsTranslation}`);
      console.log(`  Confidence: ${result.confidence}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
      console.log('');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
    }
  }
}

testOfflineTranslation().catch(console.error);