/**
 * Test the country and state mapping for Bahrain shipments
 * This will simulate the exact mapping logic used in ShipEntegra
 */

// Simulate the getCountryCode function
function getCountryCode(countryNameOrCode) {
  if (!countryNameOrCode || typeof countryNameOrCode !== 'string') {
    console.log('Invalid country input:', countryNameOrCode);
    return 'US'; // Default fallback
  }
  
  // If input is already a 2-letter code, verify it's valid and return it
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
  
  // Otherwise, look up the code from the country name
  const countryCodes = {
    "United States": "US",
    "USA": "US",
    "United States of America": "US",
    "Canada": "CA",
    "United Kingdom": "GB",
    "UK": "GB",
    "Great Britain": "GB",
    "Germany": "DE",
    "France": "FR",
    "Italy": "IT",
    "Spain": "ES",
    "Australia": "AU",
    "Japan": "JP",
    "China": "CN",
    "Brazil": "BR",
    "Mexico": "MX",
    "India": "IN",
    "Russia": "RU",
    "South Korea": "KR",
    "Netherlands": "NL",
    "Belgium": "BE",
    "Switzerland": "CH",
    "Austria": "AT",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Finland": "FI",
    "Ireland": "IE",
    "Portugal": "PT",
    "Greece": "GR",
    "Poland": "PL",
    "Czech Republic": "CZ",
    "Hungary": "HU",
    "Romania": "RO",
    "Bulgaria": "BG",
    "Croatia": "HR",
    "Serbia": "RS",
    "Ukraine": "UA",
    "Turkey": "TR",
    "Israel": "IL",
    "United Arab Emirates": "AE",
    "UAE": "AE",
    "Saudi Arabia": "SA",
    "Egypt": "EG",
    "South Africa": "ZA",
    "Nigeria": "NG",
    "Kenya": "KE",
    "Singapore": "SG",
    "Malaysia": "MY",
    "Thailand": "TH",
    "Indonesia": "ID",
    "Philippines": "PH",
    "Vietnam": "VN",
    "New Zealand": "NZ",
    "Argentina": "AR",
    "Chile": "CL",
    "Colombia": "CO",
    "Peru": "PE",
    "Venezuela": "VE",
    "Bahrain": "BH"
  };

  return countryCodes[countryNameOrCode] || "US";
}

// Simulate the getStateCode function
function getStateCode(city, country) {
  const countryCode = getCountryCode(country);

  // For US, fallback to a default if we can't determine
  if (countryCode === "US") {
    console.warn(`Could not determine state code for city: ${city}. Using default US state code.`);
    return "NY"; // Default for US
  }

  // For Canada, also fallback
  if (countryCode === "CA") {
    console.warn(`Could not determine province code for city: ${city}. Using default Canada province code.`);
    return "ON"; // Default for Canada
  }

  // If all else fails, return XX
  return "XX";
}

// Test with the actual Bahrain shipment data
const testData = {
  receiverCity: "Manama",
  receiverCountry: "BH",
  receiverState: ""
};

console.log("=== Testing Bahrain Country/State Mapping ===");
console.log("Input data:");
console.log("  - City:", testData.receiverCity);
console.log("  - Country:", testData.receiverCountry);
console.log("  - State:", testData.receiverState || "(empty)");

// Test the mapping
const mappedCountry = getCountryCode(testData.receiverCountry);
const stateCode = testData.receiverState || getStateCode(testData.receiverCity, testData.receiverCountry);

console.log("\nMapped results:");
console.log("  - Country code:", mappedCountry);
console.log("  - State code:", stateCode);

// Create the final payload structure
const shippingAddress = {
  name: "Imaan Ali",
  address: "Road 839, block 408, Sanabis Villa 1003",
  city: testData.receiverCity,
  country: mappedCountry,
  state: stateCode,
  postalCode: "00000",
  phone: "+97332377966",
  email: "p2gngzy3qw2bml9@marketplace.amazon.com"
};

console.log("\nFinal ShipEntegra payload (shippingAddress):");
console.log(JSON.stringify(shippingAddress, null, 2));

// Verify the fix
if (mappedCountry === "BH" && stateCode === "XX") {
  console.log("\n✅ SUCCESS: Fix is working correctly!");
  console.log("  - Country correctly mapped to BH (Bahrain)");
  console.log("  - State correctly mapped to XX (non-US country)");
  console.log("  - No longer defaults to US/NY");
} else {
  console.log("\n❌ ISSUE: Mapping is incorrect");
  console.log(`  - Expected: BH/XX, Got: ${mappedCountry}/${stateCode}`);
}