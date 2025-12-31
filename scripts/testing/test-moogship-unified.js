/**
 * Test MoogShip unified pricing system with AFS Transport integration
 */

import { calculateAFSTransportPricing } from './server/services/afstransport.ts';
import { calculateMoogShipPricing } from './server/services/moogship-pricing.ts';

async function testMoogShipUnified() {
  console.log("🚀 Testing MoogShip unified pricing system...");
  
  try {
    // Test AFS Transport integration directly
    console.log("\n📡 Testing AFS Transport service...");
    const afsResult = await calculateAFSTransportPricing(5, 5, 5, 1, "DE");
    
    console.log("AFS Transport Result:");
    console.log(`- Success: ${afsResult.success}`);
    console.log(`- Options: ${afsResult.options.length}`);
    console.log(`- Currency: ${afsResult.currency}`);
    
    if (afsResult.options.length > 0) {
      console.log("AFS GLS Options:");
      afsResult.options.forEach((option, index) => {
        console.log(`  ${index + 1}. ${option.displayName}
     - Price: $${(option.totalPrice / 100).toFixed(2)}
     - Delivery: ${option.deliveryTime}
     - Service Type: ${option.serviceType}
     - Provider Code: ${option.providerServiceCode}`);
      });
    }
    
    // Test unified pricing system
    console.log("\n🎯 Testing unified MoogShip pricing system...");
    const unifiedResult = await calculateMoogShipPricing(5, 5, 5, 1, "DE");
    
    console.log("Unified Pricing Result:");
    console.log(`- Success: ${unifiedResult.success}`);
    console.log(`- Total Options: ${unifiedResult.options.length}`);
    console.log(`- Currency: ${unifiedResult.currency}`);
    console.log(`- Best Option: ${unifiedResult.bestOption}`);
    
    if (unifiedResult.options.length > 0) {
      console.log("All MoogShip Options:");
      unifiedResult.options.forEach((option, index) => {
        const isGLS = option.displayName?.includes('GLS') || option.providerServiceCode?.includes('afs');
        const provider = isGLS ? '[AFS]' : '[Shipentegra]';
        console.log(`  ${index + 1}. ${provider} ${option.displayName}
     - Price: $${(option.totalPrice / 100).toFixed(2)}
     - Delivery: ${option.deliveryTime}
     - Service Type: ${option.serviceType}`);
      });
      
      // Count by provider
      const afsOptions = unifiedResult.options.filter(opt => 
        opt.displayName?.includes('GLS') || opt.providerServiceCode?.includes('afs')
      );
      const shipentegraOptions = unifiedResult.options.filter(opt => 
        !opt.displayName?.includes('GLS') && !opt.providerServiceCode?.includes('afs')
      );
      
      console.log(`\n📊 Summary:
- AFS Transport (GLS) options: ${afsOptions.length}
- Shipentegra options: ${shipentegraOptions.length}
- Total unified options: ${unifiedResult.options.length}`);
      
      if (afsOptions.length > 0) {
        console.log("✅ AFS Transport successfully integrated into unified pricing!");
      } else {
        console.log("⚠️ No AFS options found in unified pricing");
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

testMoogShipUnified();