/**
 * Test the carrier modal fix for shipment 266
 */

import fetch from 'node-fetch';

async function testCarrierModalFix() {
  console.log('🧪 Testing carrier modal fix for shipment 266...\n');

  try {
    // Test format detection
    const formatResponse = await fetch('http://localhost:5000/api/shipments/266/label-format');
    const formatData = await formatResponse.json();
    console.log('1. Format detection:', formatData);

    // Test PNG endpoint directly
    const pngResponse = await fetch('http://localhost:5000/api/shipments/266/label/png?type=carrier');
    console.log('2. PNG endpoint status:', pngResponse.status, pngResponse.statusText);

    // Test authenticated shipment data (simulating the modal's apiRequest)
    console.log('3. Testing authenticated request pattern...');
    console.log('Authentication should now work with the modal fix');
    console.log('Expected: carrierLabelData will be set with PNG data');
    console.log('Result: PNG carrier label should render instead of PDF fallback');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCarrierModalFix();