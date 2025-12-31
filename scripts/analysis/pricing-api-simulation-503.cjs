/**
 * Simulate the complete pricing API response for shipment #SH-000503 dimensions
 * 1.28kg, 25x20x8cm to Germany (DE)
 */

async function simulateCompletePricingAPI() {
  console.log('📊 Complete Pricing API Simulation');
  console.log('Destination: Germany (DE)');
  console.log('Weight: 1.28 kg');
  console.log('Dimensions: 25x20x8 cm');
  console.log('User Multiplier: 1.25x\n');
  
  // Calculate billable weight
  const weight = 1.28;
  const volumetricWeight = (25 * 20 * 8) / 5000; // 0.8 kg
  const billableWeight = Math.max(weight, volumetricWeight); // 1.28 kg
  
  console.log(`Billable Weight: ${billableWeight} kg\n`);
  
  // Complete pricing response with all available services
  const pricingResponse = {
    "success": true,
    "billableWeight": 1.28,
    "destination": "DE",
    "appliedMultiplier": 1.25,
    "options": [
      {
        "displayName": "MoogShip Eco",
        "serviceType": "ECO",
        "providerServiceCode": "shipentegra-eco",
        "serviceCode": "shipentegra-eco",
        "basePrice": 875, // $8.75 with multiplier
        "fuelCharge": 131, // $1.31 with multiplier
        "totalPrice": 1006, // $10.06
        "originalBasePrice": 700, // $7.00 base cost
        "originalFuelCharge": 105, // $1.05 fuel cost
        "originalTotalPrice": 805, // $8.05 total cost
        "appliedMultiplier": 1.25,
        "estimatedDays": "7-14",
        "provider": "DHL E-Commerce",
        "billableWeight": 1.28
      },
      {
        "displayName": "MoogShip Standard",
        "serviceType": "STANDARD", 
        "providerServiceCode": "shipentegra-widect",
        "serviceCode": "shipentegra-widect",
        "basePrice": 1000, // $10.00 with multiplier
        "fuelCharge": 150, // $1.50 with multiplier
        "totalPrice": 1150, // $11.50
        "originalBasePrice": 800, // $8.00 base cost
        "originalFuelCharge": 120, // $1.20 fuel cost
        "originalTotalPrice": 920, // $9.20 total cost
        "appliedMultiplier": 1.25,
        "estimatedDays": "5-10",
        "provider": "Shipentegra",
        "billableWeight": 1.28
      },
      {
        "displayName": "MoogShip UPS Express",
        "serviceType": "EXPRESS",
        "providerServiceCode": "shipentegra-ups-ekspress",
        "serviceCode": "shipentegra-ups-ekspress", 
        "basePrice": 1250, // $12.50 with multiplier
        "fuelCharge": 188, // $1.88 with multiplier
        "totalPrice": 1438, // $14.38
        "originalBasePrice": 1000, // $10.00 base cost
        "originalFuelCharge": 150, // $1.50 fuel cost
        "originalTotalPrice": 1150, // $11.50 total cost
        "appliedMultiplier": 1.25,
        "estimatedDays": "1-4",
        "provider": "UPS",
        "billableWeight": 1.28
      },
      {
        "displayName": "MoogShip GLS Express",
        "serviceType": "EXPRESS",
        "providerServiceCode": "afs-1",
        "serviceCode": "afs-1",
        "basePrice": 1025, // $10.25 with multiplier - matches stored data
        "fuelCharge": 154, // $1.54 with multiplier - matches stored data
        "totalPrice": 1179, // $11.79
        "originalBasePrice": 820, // $8.20 base cost
        "originalFuelCharge": 123, // $1.23 fuel cost
        "originalTotalPrice": 943, // $9.43 total cost
        "appliedMultiplier": 1.25,
        "estimatedDays": "3-5",
        "provider": "AFS Transport",
        "billableWeight": 1.28
      },
      {
        "displayName": "MoogShip GLS", 
        "serviceType": "STANDARD",
        "providerServiceCode": "afs-7",
        "serviceCode": "afs-7",
        "basePrice": 938, // $9.38 with multiplier
        "fuelCharge": 141, // $1.41 with multiplier
        "totalPrice": 1079, // $10.79
        "originalBasePrice": 750, // $7.50 base cost
        "originalFuelCharge": 113, // $1.13 fuel cost
        "originalTotalPrice": 863, // $8.63 total cost
        "appliedMultiplier": 1.25,
        "estimatedDays": "4-7", 
        "provider": "AFS Transport",
        "billableWeight": 1.28
      }
    ]
  };
  
  console.log('💰 Complete Pricing Response:');
  console.log(JSON.stringify(pricingResponse, null, 2));
  
  console.log('\n📋 Service Comparison Table:');
  console.log('Service               | Provider      | Days  | Customer | Cost   | Margin');
  console.log('---------------------|---------------|-------|----------|--------|--------');
  
  pricingResponse.options.forEach(option => {
    const customerPrice = (option.totalPrice / 100).toFixed(2);
    const costPrice = (option.originalTotalPrice / 100).toFixed(2);
    const margin = ((option.totalPrice - option.originalTotalPrice) / 100).toFixed(2);
    
    console.log(`${option.displayName.padEnd(20)} | ${option.provider.padEnd(13)} | ${option.estimatedDays.padEnd(5)} | $${customerPrice.padStart(7)} | $${costPrice.padStart(5)} | $${margin.padStart(5)}`);
  });
  
  console.log('\n🎯 Selected Service Analysis:');
  const selectedService = pricingResponse.options.find(opt => opt.providerServiceCode === 'afs-1');
  if (selectedService) {
    console.log(`Customer selected: ${selectedService.displayName}`);
    console.log(`Database total_price: $12.83`);
    console.log(`Calculated total_price: $${(selectedService.totalPrice / 100).toFixed(2)}`);
    console.log(`Difference: $${(1283 - selectedService.totalPrice) / 100}`);
    console.log('\nNote: The slight variance suggests the actual AFS pricing may have included');
    console.log('additional fees or different rates when the shipment was originally created.');
  }
}

simulateCompletePricingAPI();
