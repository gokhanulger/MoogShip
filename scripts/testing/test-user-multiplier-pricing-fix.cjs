/**
 * Test script to verify the user multiplier pricing fix
 * This tests that API cost prices are properly multiplied by user multiplier to show customer prices
 */

async function testUserMultiplierPricingFix() {
  try {
    console.log('🧪 TESTING: User multiplier pricing fix...');
    
    // Import the pricing service
    const { calculateMoogShipPricing } = await import('./server/services/moogship-pricing.js');
    
    // Test parameters for shipment 696 (0.43kg to Germany)
    const testParams = {
      packageLength: 56,
      packageWidth: 8,
      packageHeight: 4,
      packageWeight: 0.43,
      receiverCountry: 'DE',
      userMultiplier: 1.12 // User ID 35's multiplier
    };
    
    console.log('📊 Test parameters:', testParams);
    
    // Call pricing with user multiplier
    const pricingResult = await calculateMoogShipPricing(
      testParams.packageLength,
      testParams.packageWidth,
      testParams.packageHeight,
      testParams.packageWeight,
      testParams.receiverCountry,
      testParams.userMultiplier
    );
    
    console.log('✅ Pricing calculation completed');
    console.log('📋 Result summary:', {
      success: pricingResult.success,
      optionCount: pricingResult.options?.length || 0,
      currency: pricingResult.currency
    });
    
    if (pricingResult.success && pricingResult.options) {
      console.log('\n🔍 PRICING ANALYSIS:');
      
      pricingResult.options.forEach((option, index) => {
        console.log(`\n${index + 1}. ${option.displayName} (${option.serviceName})`);
        console.log(`   Customer Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   - Cargo: $${(option.cargoPrice / 100).toFixed(2)}`);
        console.log(`   - Fuel: $${(option.fuelCost / 100).toFixed(2)}`);
        
        if (option.originalTotalPrice) {
          console.log(`   Cost Price: $${(option.originalTotalPrice / 100).toFixed(2)}`);
          console.log(`   - Original Cargo: $${(option.originalCargoPrice / 100).toFixed(2)}`);
          console.log(`   - Original Fuel: $${(option.originalFuelCost / 100).toFixed(2)}`);
          console.log(`   Applied Multiplier: ${option.appliedMultiplier}`);
          
          // Verify multiplier calculation
          const expectedCustomerPrice = Math.round(option.originalTotalPrice * option.appliedMultiplier);
          const actualCustomerPrice = option.totalPrice;
          const isCorrect = expectedCustomerPrice === actualCustomerPrice;
          
          console.log(`   ✓ Multiplier Check: ${option.originalTotalPrice} × ${option.appliedMultiplier} = ${expectedCustomerPrice} (Actual: ${actualCustomerPrice}) ${isCorrect ? '✅' : '❌'}`);
        }
      });
      
      // Check if we have the expected EcoAFS service for shipment 696
      const ecoService = pricingResult.options.find(opt => 
        opt.serviceName === 'EcoAFS' || opt.displayName.includes('GLS Eco')
      );
      
      if (ecoService) {
        console.log('\n🎯 SHIPMENT 696 VERIFICATION:');
        console.log(`   Service: ${ecoService.displayName}`);
        console.log(`   Customer sees: $${(ecoService.totalPrice / 100).toFixed(2)}`);
        console.log(`   Our cost: $${(ecoService.originalTotalPrice / 100).toFixed(2)}`);
        console.log(`   Profit margin: ${((ecoService.totalPrice - ecoService.originalTotalPrice) / ecoService.originalTotalPrice * 100).toFixed(1)}%`);
        
        // Expected values for shipment 696
        const expectedCustomerPrice = 729; // $7.29 from logs
        const expectedCostPrice = 651; // Cost price before multiplier
        
        if (Math.abs(ecoService.totalPrice - expectedCustomerPrice) <= 5) {
          console.log(`   ✅ Customer price matches expected: $7.29`);
        } else {
          console.log(`   ❌ Customer price mismatch: expected ~$7.29, got $${(ecoService.totalPrice / 100).toFixed(2)}`);
        }
      } else {
        console.log('\n❌ EcoAFS service not found in pricing options');
      }
      
    } else {
      console.log('❌ Pricing calculation failed:', pricingResult);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testUserMultiplierPricingFix();