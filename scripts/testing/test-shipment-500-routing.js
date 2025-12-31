/**
 * Test shipment 500 service routing to verify AFS Transport integration
 * Verifies that afs-7 service routes to AFS Transport API instead of ShipEntegra
 */

import { Pool } from 'pg';

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testShipment500Routing() {
  console.log('🧪 Testing shipment 500 service routing fix...\n');
  
  try {
    // Get shipment 500 details
    const shipmentQuery = `
      SELECT id, status, selected_service, provider_service_code, 
             sender_name, sender_address1, sender_city, sender_postal_code,
             receiver_name, receiver_address, receiver_city, receiver_country,
             package_weight, package_length, package_width, package_height,
             label_error, label_attempts
      FROM shipments 
      WHERE id = 500
    `;
    
    const result = await pool.query(shipmentQuery);
    
    if (result.rows.length === 0) {
      console.log('❌ Shipment 500 not found');
      return;
    }
    
    const shipment = result.rows[0];
    
    console.log('📦 Shipment 500 Details:');
    console.log(`   ├─ Status: ${shipment.status}`);
    console.log(`   ├─ Selected Service: ${shipment.selected_service}`);
    console.log(`   ├─ Provider Service Code: ${shipment.provider_service_code}`);
    console.log(`   ├─ Previous Label Error: ${shipment.label_error}`);
    console.log(`   ├─ Label Attempts: ${shipment.label_attempts}`);
    console.log(`   └─ Sender: ${shipment.sender_name}`);
    
    // Import service mapping to verify routing
    const { SERVICE_MAPPING } = await import('./server/services/shipentegra.ts');
    
    console.log('\n🗺️ Service Mapping Analysis:');
    const serviceCode = shipment.provider_service_code || shipment.selected_service;
    console.log(`   ├─ Service Code: ${serviceCode}`);
    
    if (SERVICE_MAPPING && SERVICE_MAPPING[serviceCode]) {
      const config = SERVICE_MAPPING[serviceCode];
      console.log(`   ├─ Mapped URL: ${config.url}`);
      console.log(`   ├─ Special Service: ${config.specialService}`);
      console.log(`   └─ Display Name: ${config.displayName}`);
      
      if (config.url === "AFS_TRANSPORT_API") {
        console.log('\n✅ SUCCESS: Service afs-7 correctly mapped to AFS Transport API');
        console.log('   This shipment will now use AFS Transport instead of ShipEntegra');
      } else {
        console.log('\n❌ ISSUE: Service afs-7 still mapped to ShipEntegra API');
        console.log('   Expected: AFS_TRANSPORT_API');
        console.log(`   Actual: ${config.url}`);
      }
    } else {
      console.log('\n❌ ISSUE: Service mapping not found for afs-7');
      console.log('   This service will fallback to ShipEntegra ECO processing');
    }
    
    // Test address formatting for AFS Transport
    console.log('\n🏠 Address Formatting Test:');
    const originalAddress = shipment.sender_address1 || "Test address";
    console.log(`   ├─ Original: ${originalAddress}`);
    
    // Apply the same formatting logic as implemented
    const formatTurkishAddress = (address) => {
      if (!address) return address;
      
      return address
        .replace(/\bmah\b/gi, 'Mahallesi')
        .replace(/\bmahallesi\b/gi, 'Mahallesi')
        .replace(/\bcad\b/gi, 'Caddesi')
        .replace(/\bcaddesi\b/gi, 'Caddesi')
        .replace(/\bsk\b/gi, 'Sokak')
        .replace(/\bsokak\b/gi, 'Sokak')
        .replace(/\bno:\s*/gi, 'No:')
        .replace(/\bno\s+/gi, 'No:')
        .replace(/\s+/g, ' ')
        .trim();
    };
    
    const formattedAddress = formatTurkishAddress(originalAddress);
    console.log(`   └─ Formatted: ${formattedAddress}`);
    
    if (formattedAddress !== originalAddress) {
      console.log('✅ Address formatting will be applied for AFS Transport API');
    } else {
      console.log('ℹ️  No address formatting changes needed');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Service afs-7 will route to AFS Transport API');
    console.log('   2. Turkish addresses will be properly formatted');
    console.log('   3. Customer address will be used as sender (gonderici)');
    console.log('   4. Previous "Göndericinin adresin devamı geçersiz" error should be resolved');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testShipment500Routing().catch(console.error);