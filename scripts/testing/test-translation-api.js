/**
 * Test script to verify translation API behavior
 */

async function testTranslationAPI() {
  const testCases = [
    { text: "ropa de hombre", expected: "Spanish" },
    { text: "erkek elbise", expected: "Turkish" },
    { text: "masa seti", expected: "Turkish" },
    { text: "men's clothing", expected: "English" }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n--- Testing: "${testCase.text}" ---`);
      
      const response = await fetch('http://localhost:3000/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: testCase.text })
      });

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const { originalText, translatedText, detectedLanguage, needsTranslation } = result.data;
        console.log(`Original: "${originalText}"`);
        console.log(`Translated: "${translatedText}"`);
        console.log(`Detected: ${detectedLanguage}`);
        console.log(`Needs Translation: ${needsTranslation}`);
      }
    } catch (error) {
      console.error(`Error testing "${testCase.text}":`, error);
    }
  }
}

testTranslationAPI();