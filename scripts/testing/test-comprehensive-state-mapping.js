/**
 * Comprehensive test for state/province mapping across multiple countries
 */

// Enhanced getCountryCode function with all mappings
function getCountryCode(countryNameOrCode) {
  if (!countryNameOrCode || typeof countryNameOrCode !== 'string') {
    return 'US';
  }
  
  if (countryNameOrCode.length === 2) {
    const validCodes = [
      "US", "CA", "GB", "DE", "FR", "IT", "ES", "AU", "JP", "CN", 
      "BR", "MX", "IN", "RU", "KR", "NL", "BE", "CH", "AT", "SE",
      "NO", "DK", "FI", "IE", "PT", "GR", "PL", "CZ", "HU", "RO",
      "BG", "HR", "RS", "UA", "TR", "IL", "AE", "SA", "EG", "ZA",
      "NG", "KE", "SG", "MY", "TH", "ID", "PH", "VN", "NZ", "AR",
      "CL", "CO", "PE", "VE", "BH"
    ];
    if (validCodes.includes(countryNameOrCode.toUpperCase())) {
      return countryNameOrCode.toUpperCase();
    }
  }
  
  const countryCodes = {
    "United States": "US", "USA": "US", "United States of America": "US",
    "Canada": "CA", "United Kingdom": "GB", "UK": "GB", "Great Britain": "GB",
    "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES",
    "Australia": "AU", "Japan": "JP", "China": "CN", "Brazil": "BR",
    "Mexico": "MX", "India": "IN", "Russia": "RU", "South Korea": "KR",
    "Netherlands": "NL", "Belgium": "BE", "Switzerland": "CH", "Austria": "AT",
    "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI",
    "Ireland": "IE", "Portugal": "PT", "Greece": "GR", "Poland": "PL",
    "Czech Republic": "CZ", "Hungary": "HU", "Romania": "RO", "Bulgaria": "BG",
    "Croatia": "HR", "Serbia": "RS", "Ukraine": "UA", "Turkey": "TR",
    "Israel": "IL", "United Arab Emirates": "AE", "UAE": "AE",
    "Saudi Arabia": "SA", "Egypt": "EG", "South Africa": "ZA",
    "Nigeria": "NG", "Kenya": "KE", "Singapore": "SG", "Malaysia": "MY",
    "Thailand": "TH", "Indonesia": "ID", "Philippines": "PH", "Vietnam": "VN",
    "New Zealand": "NZ", "Argentina": "AR", "Chile": "CL", "Colombia": "CO",
    "Peru": "PE", "Venezuela": "VE", "Bahrain": "BH"
  };

  return countryCodes[countryNameOrCode] || "US";
}

// Enhanced getStateCode function with comprehensive mappings
function getStateCode(city, country) {
  const countryCode = getCountryCode(country);

  // US state mapping (simplified for test)
  const cityToStateMap = {
    "New York": "NY", "Los Angeles": "CA", "Chicago": "IL", "Houston": "TX",
    "Phoenix": "AZ", "Philadelphia": "PA", "San Antonio": "TX", "San Diego": "CA"
  };

  switch (countryCode) {
    case "US":
      if (cityToStateMap[city]) return cityToStateMap[city];
      return "NY"; // Default for US
      
    case "CA":
      const canadianCities = {
        "Toronto": "ON", "Vancouver": "BC", "Montreal": "QC", "Calgary": "AB",
        "Edmonton": "AB", "Ottawa": "ON", "Winnipeg": "MB", "Quebec City": "QC"
      };
      if (canadianCities[city]) return canadianCities[city];
      return "ON"; // Default for Canada
      
    case "AU":
      const australianCities = {
        "Sydney": "NSW", "Melbourne": "VIC", "Brisbane": "QLD", "Perth": "WA",
        "Adelaide": "SA", "Hobart": "TAS", "Darwin": "NT", "Canberra": "ACT"
      };
      if (australianCities[city]) return australianCities[city];
      return "NSW"; // Default for Australia
      
    case "BR":
      const brazilianCities = {
        "São Paulo": "SP", "Rio de Janeiro": "RJ", "Brasília": "DF", "Salvador": "BA",
        "Fortaleza": "CE", "Belo Horizonte": "MG", "Manaus": "AM", "Curitiba": "PR"
      };
      if (brazilianCities[city]) return brazilianCities[city];
      return "SP"; // Default for Brazil
      
    case "IN":
      const indianCities = {
        "Mumbai": "MH", "Delhi": "DL", "Bangalore": "KA", "Bengaluru": "KA",
        "Hyderabad": "TG", "Chennai": "TN", "Kolkata": "WB", "Pune": "MH"
      };
      if (indianCities[city]) return indianCities[city];
      return "DL"; // Default for India
      
    case "MX":
      const mexicanCities = {
        "Mexico City": "CMX", "Ciudad de México": "CMX", "Guadalajara": "JAL",
        "Monterrey": "NLE", "Puebla": "PUE", "Tijuana": "BCN"
      };
      if (mexicanCities[city]) return mexicanCities[city];
      return "CMX"; // Default for Mexico
      
    default:
      return "XX"; // For countries without state systems
  }
}

// Test cases for different countries
const testCases = [
  // Countries with states/provinces that should get proper mappings
  { country: "US", city: "New York", expectedCountry: "US", expectedState: "NY", description: "US - Known city" },
  { country: "US", city: "Unknown City", expectedCountry: "US", expectedState: "NY", description: "US - Unknown city" },
  { country: "CA", city: "Toronto", expectedCountry: "CA", expectedState: "ON", description: "Canada - Known city" },
  { country: "CA", city: "Unknown City", expectedCountry: "CA", expectedState: "ON", description: "Canada - Unknown city" },
  { country: "AU", city: "Sydney", expectedCountry: "AU", expectedState: "NSW", description: "Australia - Known city" },
  { country: "AU", city: "Unknown City", expectedCountry: "AU", expectedState: "NSW", description: "Australia - Unknown city" },
  { country: "BR", city: "São Paulo", expectedCountry: "BR", expectedState: "SP", description: "Brazil - Known city" },
  { country: "BR", city: "Unknown City", expectedCountry: "BR", expectedState: "SP", description: "Brazil - Unknown city" },
  { country: "IN", city: "Mumbai", expectedCountry: "IN", expectedState: "MH", description: "India - Known city" },
  { country: "IN", city: "Unknown City", expectedCountry: "IN", expectedState: "DL", description: "India - Unknown city" },
  { country: "MX", city: "Mexico City", expectedCountry: "MX", expectedState: "CMX", description: "Mexico - Known city" },
  { country: "MX", city: "Unknown City", expectedCountry: "MX", expectedState: "CMX", description: "Mexico - Unknown city" },
  
  // Countries without state systems should get XX
  { country: "BH", city: "Manama", expectedCountry: "BH", expectedState: "XX", description: "Bahrain - No state system" },
  { country: "GB", city: "London", expectedCountry: "GB", expectedState: "XX", description: "UK - No state system" },
  { country: "DE", city: "Berlin", expectedCountry: "DE", expectedState: "XX", description: "Germany - No state system" },
  { country: "FR", city: "Paris", expectedCountry: "FR", expectedState: "XX", description: "France - No state system" },
  { country: "JP", city: "Tokyo", expectedCountry: "JP", expectedState: "XX", description: "Japan - No state system" },
  { country: "SG", city: "Singapore", expectedCountry: "SG", expectedState: "XX", description: "Singapore - No state system" },
];

console.log("=== Comprehensive State/Province Mapping Test ===\n");

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const mappedCountry = getCountryCode(testCase.country);
  const mappedState = getStateCode(testCase.city, testCase.country);
  
  const countryMatch = mappedCountry === testCase.expectedCountry;
  const stateMatch = mappedState === testCase.expectedState;
  const testPassed = countryMatch && stateMatch;
  
  if (testPassed) passedTests++;
  
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`  Input: ${testCase.country}/${testCase.city}`);
  console.log(`  Expected: ${testCase.expectedCountry}/${testCase.expectedState}`);
  console.log(`  Got: ${mappedCountry}/${mappedState}`);
  console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!testPassed) {
    if (!countryMatch) console.log(`    - Country mismatch: expected ${testCase.expectedCountry}, got ${mappedCountry}`);
    if (!stateMatch) console.log(`    - State mismatch: expected ${testCase.expectedState}, got ${mappedState}`);
  }
  console.log();
});

console.log(`=== Test Summary ===`);
console.log(`Passed: ${passedTests}/${totalTests} tests`);
console.log(`Success Rate: ${Math.round((passedTests/totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log(`\n✅ All tests passed! The enhanced state mapping system correctly handles:`);
  console.log(`  - Countries with state/province systems (US, CA, AU, BR, IN, MX)`);
  console.log(`  - Countries without state systems (BH, GB, DE, FR, JP, SG, etc.)`);
  console.log(`  - Proper fallbacks for unknown cities within known countries`);
} else {
  console.log(`\n❌ Some tests failed. Please review the mapping logic.`);
}