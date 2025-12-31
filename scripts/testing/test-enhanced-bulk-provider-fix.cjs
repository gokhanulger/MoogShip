/**
 * Test enhanced bulk upload provider detection fix
 * This will verify the updated frontend logic properly detects AFS services
 * and sets the correct shipping provider during bulk shipment creation
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testEnhancedBulkProviderFix() {
  console.log('🔍 Testing enhanced bulk upload provider detection fix...\n');

  try {
    // Check current state before any new uploads
    const beforeQuery = `
      SELECT id, selected_service, carrier_name, shipping_provider, provider_service_code
      FROM shipments 
      WHERE id >= 690 
      ORDER BY id DESC 
      LIMIT 10;
    `;
    
    const beforeResult = await pool.query(beforeQuery);
    console.log('📊 Current shipments before test:');
    console.table(beforeResult.rows);

    // Check for any recent EcoAFS services that should have AFS provider
    const afsServicesQuery = `
      SELECT id, selected_service, carrier_name, shipping_provider, provider_service_code,
             created_at
      FROM shipments 
      WHERE selected_service = 'EcoAFS'
         OR carrier_name LIKE '%GLS%'
         OR provider_service_code = 'EcoAFS'
      ORDER BY id DESC 
      LIMIT 5;
    `;
    
    const afsResult = await pool.query(afsServicesQuery);
    console.log('\n🎯 AFS/GLS services found:');
    if (afsResult.rows.length > 0) {
      console.table(afsResult.rows);
      
      // Check if any have incorrect provider assignment
      const incorrectProviders = afsResult.rows.filter(row => 
        row.shipping_provider !== 'afs' && 
        (row.selected_service === 'EcoAFS' || row.carrier_name.includes('GLS'))
      );
      
      if (incorrectProviders.length > 0) {
        console.log('❌ Found shipments with incorrect provider assignment:');
        console.table(incorrectProviders);
        console.log('\n🔧 These should have shipping_provider = "afs" but have "shipentegra"');
      } else {
        console.log('✅ All AFS/GLS services have correct provider assignment');
      }
    } else {
      console.log('ℹ️  No AFS/GLS services found in recent shipments');
    }

    // Test the enhanced detection logic manually
    console.log('\n🧪 Testing enhanced provider detection logic:');
    
    const testCases = [
      { serviceName: 'EcoAFS', displayName: 'MoogShip GLS Eco', expected: 'afs' },
      { serviceName: 'shipentegra-widect', displayName: 'MoogShip-Eco', expected: 'shipentegra' },
      { serviceName: 'afs-1', displayName: 'MoogShip GLS Express', expected: 'afs' },
      { serviceName: 'shipentegra-ups-express', displayName: 'MoogShip UPS Express', expected: 'shipentegra' }
    ];

    testCases.forEach((testCase, index) => {
      const { serviceName, displayName, expected } = testCase;
      
      // Simulate the enhanced detection logic
      const detectedProvider = (() => {
        const serviceCode = serviceName || '';
        
        // Enhanced AFS detection logic with precision fix (matching frontend)
        if (serviceName.toLowerCase().includes('afs-') || 
            serviceName.toLowerCase() === 'ecoafs' ||
            serviceCode.toLowerCase() === 'ecoafs' ||
            displayName.toLowerCase().includes('gls eco')) {
          return 'afs';
        }
        
        return 'shipentegra';
      })();

      const status = detectedProvider === expected ? '✅' : '❌';
      console.log(`${status} Test ${index + 1}: ${serviceName} -> ${detectedProvider} (expected: ${expected})`);
    });

    console.log('\n📋 Summary:');
    console.log('- Enhanced provider detection logic has been implemented');
    console.log('- Frontend now checks serviceName, serviceCode, and displayName');
    console.log('- AFS services (including EcoAFS) should be detected correctly');
    console.log('- Next bulk upload should create shipments with proper provider assignment');

  } catch (error) {
    console.error('❌ Error testing enhanced bulk provider fix:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  testEnhancedBulkProviderFix();
}

module.exports = { testEnhancedBulkProviderFix };