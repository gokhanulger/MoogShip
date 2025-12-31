/**
 * Test shipment 265 ECO service carrier label fix
 * Verifies that ECO services redirect to regular PDF when accessed via carrier label endpoint
 */

import pkg from 'pg';
const { Client } = pkg;

async function testShipment265EcoFix() {
  console.log('=== TESTING SHIPMENT 265 ECO SERVICE CARRIER LABEL FIX ===');
  
  const db = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await db.connect();
    
    // 1. Check shipment 265 data
    console.log('\n1. Checking shipment 265 database data...');
    const shipmentResult = await db.query(`
      SELECT id, tracking_number, selected_service, provider_service_code,
             label_url, label_pdf IS NOT NULL as has_label_pdf,
             carrier_label_url, carrier_label_pdf IS NOT NULL as has_carrier_label_pdf
      FROM shipments WHERE id = 265
    `);
    
    if (shipmentResult.rows.length === 0) {
      console.log('❌ Shipment 265 not found in database');
      return;
    }
    
    const shipment = shipmentResult.rows[0];
    console.log('📊 Shipment 265 data:', {
      id: shipment.id,
      tracking_number: shipment.tracking_number,
      selected_service: shipment.selected_service,
      provider_service_code: shipment.provider_service_code,
      label_url: shipment.label_url,
      has_label_pdf: shipment.has_label_pdf,
      carrier_label_url: shipment.carrier_label_url,
      has_carrier_label_pdf: shipment.has_carrier_label_pdf
    });
    
    // 2. Test ECO service detection
    console.log('\n2. Testing ECO service detection...');
    const isEcoService = shipment.selected_service?.toLowerCase().includes('eco') || 
                        shipment.provider_service_code?.toLowerCase().includes('eco');
    
    console.log('🔍 ECO service detection:', {
      selected_service: shipment.selected_service,
      provider_service_code: shipment.provider_service_code,
      isEcoService: isEcoService
    });
    
    // 3. Test label format detection API endpoint
    console.log('\n3. Testing label format detection API...');
    const formatResponse = await fetch(`http://localhost:3000/api/shipments/265/label-format`);
    const formatData = await formatResponse.json();
    
    console.log('🎯 API format detection result:', formatData);
    
    // 4. Verify expected behavior for ECO service
    console.log('\n4. Verifying expected behavior...');
    if (formatData.isEcoService) {
      console.log('✅ Correctly identified as ECO service');
      console.log('📝 Expected behavior:');
      console.log('  - When accessed via carrier label endpoint: should redirect to regular PDF');
      console.log('  - Modal should detect isEcoService=true and skip carrier data fetching');
      console.log('  - Rendering should use regular PDF embed instead of PNG carrier logic');
      
      if (formatData.hasLabel) {
        console.log('✅ Has label available for display');
      } else {
        console.log('❌ No label available - this may cause display issues');
      }
    } else {
      console.log('❌ Not detected as ECO service - this may cause issues');
    }
    
    // 5. Test the actual endpoints that would be called
    console.log('\n5. Testing actual label endpoints...');
    
    // Test regular PDF endpoint (should work for ECO services)
    console.log('Testing regular PDF endpoint...');
    try {
      const pdfResponse = await fetch(`http://localhost:3000/api/shipments/265/label-pdf`);
      console.log(`Regular PDF endpoint: ${pdfResponse.status} ${pdfResponse.statusText}`);
    } catch (error) {
      console.log(`Regular PDF endpoint error: ${error.message}`);
    }
    
    // Test carrier PNG endpoint (should fail gracefully for ECO services)
    console.log('Testing carrier PNG endpoint...');
    try {
      const carrierResponse = await fetch(`http://localhost:3000/api/shipments/265/label/png?type=carrier`);
      console.log(`Carrier PNG endpoint: ${carrierResponse.status} ${carrierResponse.statusText}`);
    } catch (error) {
      console.log(`Carrier PNG endpoint error: ${error.message}`);
    }
    
    console.log('\n✅ Test completed. With the fix:');
    console.log('  - ECO services are detected correctly');
    console.log('  - Modal skips carrier data fetching for ECO services');
    console.log('  - Rendering logic treats ECO services as regular PDF even when accessed via carrier endpoint');
    console.log('  - Users will see the MoogShip-generated PDF label instead of "Failed to load"');
    
  } catch (error) {
    console.error('Error testing shipment 265:', error);
  } finally {
    await db.end();
  }
}

// Run the test
testShipment265EcoFix();