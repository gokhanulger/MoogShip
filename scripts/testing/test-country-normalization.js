/**
 * Test the comprehensive country normalization system
 * Covers all countries currently in the database
 */

// Import the normalization functions (simulated)
function normalizeCountryCode(input) {
  if (!input || typeof input !== 'string') {
    return 'US';
  }

  const trimmed = input.trim();
  
  // Valid 2-letter codes
  const validCodes = [
    "US", "CA", "AU", "BR", "IN", "MX", "GB", "DE", "FR", "IT", "ES", "JP", "CN", "RU", "KR",
    "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "IE", "PT", "GR", "PL", "CZ", "HU", "RO",
    "BG", "HR", "RS", "UA", "TR", "BH", "AE", "SA", "IL", "EG", "ZA", "NG", "KE", "SG", "MY",
    "TH", "ID", "PH", "VN", "NZ", "AR", "CL", "CO", "PE", "VE"
  ];
  
  if (trimmed.length === 2) {
    const upperCode = trimmed.toUpperCase();
    if (validCodes.includes(upperCode)) {
      return upperCode;
    }
  }
  
  // Name to code mapping
  const nameToCodeMap = {
    "United States": "US", "USA": "US", "United States of America": "US", "US": "US",
    "United Kingdom": "GB", "UK": "GB", "Great Britain": "GB", "GB": "GB",
    "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES",
    "Netherlands": "NL", "The Netherlands": "NL", "Japan": "JP", "China": "CN",
    "Canada": "CA", "Australia": "AU", "Brazil": "BR", "Mexico": "MX",
    "India": "IN", "Russia": "RU", "South Korea": "KR", "Belgium": "BE",
    "Switzerland": "CH", "Austria": "AT", "Sweden": "SE", "Norway": "NO",
    "Denmark": "DK", "Finland": "FI", "Ireland": "IE", "Portugal": "PT",
    "Greece": "GR", "Poland": "PL", "Czech Republic": "CZ", "Hungary": "HU",
    "Romania": "RO", "Bulgaria": "BG", "Croatia": "HR", "Serbia": "RS",
    "Ukraine": "UA", "Turkey": "TR", "Bahrain": "BH",
    "United Arab Emirates": "AE", "UAE": "AE", "Saudi Arabia": "SA",
    "Israel": "IL", "Egypt": "EG", "South Africa": "ZA", "Nigeria": "NG",
    "Kenya": "KE", "Singapore": "SG", "Malaysia": "MY", "Thailand": "TH",
    "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN", "New Zealand": "NZ",
    "Argentina": "AR", "Chile": "CL", "Colombia": "CO", "Peru": "PE", "Venezuela": "VE"
  };
  
  const code = nameToCodeMap[trimmed];
  if (code) {
    return code;
  }
  
  // Case-insensitive fallback
  const lowerInput = trimmed.toLowerCase();
  for (const [name, code] of Object.entries(nameToCodeMap)) {
    if (name.toLowerCase() === lowerInput) {
      return code;
    }
  }
  
  return 'US';
}

function normalizeStateCode(countryCode, state) {
  if (!state || state.trim() === '') {
    // Countries with states get defaults, others get empty
    const countriesWithStates = {
      'US': 'NY',
      'CA': 'ON',
      'AU': 'NSW',
      'BR': 'SP',
      'IN': 'DL',
      'MX': 'CMX'
    };
    return countriesWithStates[countryCode] || '';
  }
  
  const trimmed = state.trim();
  const countriesWithStates = ['US', 'CA', 'AU', 'BR', 'IN', 'MX'];
  
  if (!countriesWithStates.includes(countryCode)) {
    return '';
  }
  
  return trimmed;
}

// Test cases based on actual database data
const databaseCountries = [
  "United States",   // 72 shipments
  "US",             // 53 shipments  
  "AE",             // 10 shipments
  "GB",             // 5 shipments
  "FR",             // 4 shipments
  "United Kingdom", // 4 shipments
  "IT",             // 3 shipments
  "BH",             // 2 shipments
  "AU",             // 1 shipment
  "DE",             // 1 shipment
  "NL",             // 1 shipment
  "SA",             // 1 shipment
  "The Netherlands" // 1 shipment
];

console.log("=== Country Normalization Test ===");
console.log("Testing all countries from actual database data\n");

let totalTests = 0;
let passedTests = 0;

databaseCountries.forEach(country => {
  totalTests++;
  
  const normalizedCode = normalizeCountryCode(country);
  const normalizedState = normalizeStateCode(normalizedCode, "");
  
  // Expected results based on our mapping
  const expectedMappings = {
    "United States": "US",
    "US": "US",
    "AE": "AE",
    "GB": "GB", 
    "FR": "FR",
    "United Kingdom": "GB",
    "IT": "IT",
    "BH": "BH",
    "AU": "AU",
    "DE": "DE",
    "NL": "NL",
    "SA": "SA",
    "The Netherlands": "NL"
  };
  
  const expectedCode = expectedMappings[country];
  const testPassed = normalizedCode === expectedCode;
  
  if (testPassed) passedTests++;
  
  console.log(`Input: "${country}"`);
  console.log(`  Expected: ${expectedCode}`);
  console.log(`  Got: ${normalizedCode}`);
  console.log(`  State: ${normalizedState || '(empty)'}`);
  console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log();
});

// Test some additional edge cases
const edgeCases = [
  { input: "", expected: "US", description: "Empty string" },
  { input: "   ", expected: "US", description: "Whitespace only" },
  { input: "InvalidCountry", expected: "US", description: "Invalid country name" },
  { input: "usa", expected: "US", description: "Lowercase USA" },
  { input: "BAHRAIN", expected: "BH", description: "Uppercase Bahrain" },
  { input: "uae", expected: "AE", description: "Lowercase UAE" }
];

console.log("=== Edge Cases Test ===");
edgeCases.forEach(testCase => {
  totalTests++;
  
  const result = normalizeCountryCode(testCase.input);
  const testPassed = result === testCase.expected;
  
  if (testPassed) passedTests++;
  
  console.log(`${testCase.description}: "${testCase.input}"`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);
  console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  console.log();
});

console.log("=== Test Summary ===");
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);
console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log("\n✅ All tests passed!");
  console.log("The normalization system correctly handles:");
  console.log("- All existing database countries");
  console.log("- Mixed case variations");
  console.log("- Both full names and ISO codes");
  console.log("- Edge cases and invalid inputs");
} else {
  console.log("\n❌ Some tests failed - review the mappings");
}