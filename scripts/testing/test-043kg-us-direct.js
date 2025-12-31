/**
 * Direct test of pricing services for 0.43kg package to US
 * This bypasses authentication and calls the pricing services directly
 */

import { calculateMoogShipPricing } from './server/services/pricing.js';

async function test043kgUSDirect() {
  try {
    console.log('\n📦 Testing 0.43kg package pricing to US (Direct API call)...\n');
    
    const params = {
      packageLength: 56,
      packageWidth: 8,
      packageHeight: 4,
      packageWeight: 0.43,
      receiverCountry: "US"
    };
    
    console.log('🚀 Request parameters:');
    console.log(JSON.stringify(params, null, 2));
    console.log('\n');
    
    // Call the pricing service directly
    const result = await calculateMoogShipPricing(params);
    
    console.log('📋 FULL API RESPONSE:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.options) {
      console.log('\n📊 PARSED PRICING OPTIONS:');
      result.options.forEach((option, index) => {
        console.log(`\n${index + 1}. ${option.displayName}`);
        console.log(`   Service Code: ${option.serviceName || option.providerServiceCode}`);
        console.log(`   Total Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   Cargo Price: $${(option.cargoPrice / 100).toFixed(2)}`);
        console.log(`   Fuel Cost: $${(option.fuelCost / 100).toFixed(2)}`);
        console.log(`   Delivery Time: ${option.deliveryTime}`);
        console.log(`   Service Type: ${option.serviceType}`);
        if (option.appliedMultiplier) {
          console.log(`   Applied Multiplier: ${option.appliedMultiplier}`);
        }
        if (option.originalTotalPrice) {
          console.log(`   Original Price: $${(option.originalTotalPrice / 100).toFixed(2)}`);
        }
      });
      
      console.log(`\n✅ Total services found: ${result.options.length}`);
      console.log(`🎯 Best option: ${result.bestOption || 'Not specified'}`);
      console.log(`💰 Currency: ${result.currency || 'USD'}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing pricing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
test043kgUSDirect();