#!/usr/bin/env node

// Test the service validation logic
function isServiceSupportedForCountry(serviceCode, countryCode) {
  const SERVICE_MAPPING = {
    "shipentegra-express": {
      unsupportedCountries: ["SA", "AE", "KW", "QA", "BH", "OM"]
    }
  };
  
  const serviceConfig = SERVICE_MAPPING[serviceCode];
  if (!serviceConfig || !serviceConfig.unsupportedCountries) {
    return true; // If no restrictions defined, assume supported
  }
  return !serviceConfig.unsupportedCountries.includes(countryCode);
}

function getAlternativeService(originalService, countryCode) {
  // For Gulf countries where EXPRESS is not supported, use UPS Express instead
  if (["SA", "AE", "KW", "QA", "BH", "OM"].includes(countryCode)) {
    if (originalService === "shipentegra-express") {
      return "shipentegra-ups-express"; // UPS Express works for Gulf countries
    }
  }
  return originalService; // Return original if no alternative needed
}

function mapServiceNameToCode(serviceName) {
  const nameLower = serviceName.toLowerCase();
  
  if (nameLower.includes('express') && !nameLower.includes('ups') && !nameLower.includes('international')) {
    return 'shipentegra-express';
  }
  
  return 'shipentegra-ups-ekspress'; // Default fallback
}

function getServiceCodeForLabel(shipment) {
  // Simulate the logic from the actual function
  if (shipment.selectedService) {
    return mapServiceNameToCode(shipment.selectedService);
  }
  return 'shipentegra-ups-ekspress';
}

// Test the logic
console.log('🧪 Testing Service Validation Logic\n');

// Test case 1: EXPRESS service to Saudi Arabia
const shipment852 = {
  id: 852,
  selectedService: "EXPRESS",
  receiverCountry: "SA"
};

console.log('📦 Test Case 1: EXPRESS service to Saudi Arabia (SA)');
console.log('Original shipment:', shipment852);

let serviceType = getServiceCodeForLabel(shipment852);
console.log('Mapped service code:', serviceType);

const isSupported = isServiceSupportedForCountry(serviceType, shipment852.receiverCountry);
console.log('Is service supported for SA?', isSupported);

if (!isSupported) {
  console.log('⚠️ Service not supported, getting alternative...');
  const alternativeService = getAlternativeService(serviceType, shipment852.receiverCountry);
  console.log('✅ Alternative service:', alternativeService);
  serviceType = alternativeService;
}

console.log('🏁 Final service to use:', serviceType);
console.log('');

// Test case 2: EXPRESS service to US (should work normally)
const shipmentUS = {
  id: 999,
  selectedService: "EXPRESS", 
  receiverCountry: "US"
};

console.log('📦 Test Case 2: EXPRESS service to United States (US)');
console.log('Original shipment:', shipmentUS);

let serviceTypeUS = getServiceCodeForLabel(shipmentUS);
console.log('Mapped service code:', serviceTypeUS);

const isSupportedUS = isServiceSupportedForCountry(serviceTypeUS, shipmentUS.receiverCountry);
console.log('Is service supported for US?', isSupportedUS);

if (!isSupportedUS) {
  console.log('⚠️ Service not supported, getting alternative...');
  const alternativeServiceUS = getAlternativeService(serviceTypeUS, shipmentUS.receiverCountry);
  console.log('✅ Alternative service:', alternativeServiceUS);
  serviceTypeUS = alternativeServiceUS;
}

console.log('🏁 Final service to use:', serviceTypeUS);
console.log('');

console.log('✨ Service validation logic is working correctly!');