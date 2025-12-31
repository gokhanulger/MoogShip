/**
 * Test script to fetch pricing for 5.59 kg package to USA
 * and display the full API response
 */

import { calculateMoogShipPricing } from './server/services/moogship-pricing.js';

async function test559kgPricing() {
  try {
    console.log('=== TESTING 5.59 KG PACKAGE TO USA ===\n');
    
    const packageData = {
      length: 30,    // cm
      width: 30,     // cm  
      height: 30,    // cm
      weight: 5.59,  // kg
      country: 'US'
    };
    
    console.log('Package Details:');
    console.log(`- Dimensions: ${packageData.length} x ${packageData.width} x ${packageData.height} cm`);
    console.log(`- Weight: ${packageData.weight} kg`);
    console.log(`- Destination: ${packageData.country}`);
    console.log('\n=== FETCHING PRICING DATA ===\n');
    
    const result = await calculateMoogShipPricing(
      packageData.length,
      packageData.width,
      packageData.height,
      packageData.weight,
      packageData.country
    );
    
    console.log('=== FULL API RESPONSE ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.options) {
      console.log('\n=== SERVICE BREAKDOWN ===');
      result.options.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName}`);
        console.log(`   - Service Name: ${option.serviceName}`);
        console.log(`   - Provider Code: ${option.providerServiceCode || 'N/A'}`);
        console.log(`   - Service Type: ${option.serviceType || 'N/A'}`);
        console.log(`   - Total Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   - Cargo Price: $${(option.cargoPrice / 100).toFixed(2)}`);
        console.log(`   - Fuel Cost: $${(option.fuelCost / 100).toFixed(2)}`);
        console.log(`   - Delivery: ${option.deliveryTime}`);
        console.log(`   - Description: ${option.description}`);
        console.log();
      });
      
      console.log('=== PRICE RANKING ===');
      const sortedOptions = [...result.options].sort((a, b) => a.totalPrice - b.totalPrice);
      sortedOptions.forEach((option, index) => {
        console.log(`${index + 1}. ${option.displayName} - $${(option.totalPrice / 100).toFixed(2)} (${option.providerServiceCode})`);
      });
    }
    
  } catch (error) {
    console.error('Error fetching pricing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

test559kgPricing();