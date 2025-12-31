/**
 * Test modal authentication for shipment 266 carrier label
 * This simulates the exact API calls the modal makes
 */

const { apiRequest } = require('./server/db/index.js');

async function testModalAuthentication() {
  console.log('🧪 Testing modal authentication for shipment 266...\n');

  try {
    // 1. Test label format detection (this works without auth)
    console.log('1. Testing label format detection...');
    const formatResponse = await fetch('http://localhost:5000/api/shipments/266/label-format');
    const formatData = await formatResponse.json();
    console.log('Format detection result:', formatData);

    // 2. Test authenticated shipment data fetch (this is where authentication matters)
    console.log('\n2. Testing authenticated shipment data fetch...');
    const shipmentResponse = await fetch('http://localhost:5000/api/shipments/266', {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A...' // This would be the actual session cookie
      }
    });
    
    if (shipmentResponse.ok) {
      const shipmentData = await shipmentResponse.json();
      console.log('✅ Authenticated shipment data retrieved successfully');
      console.log('Carrier label data:', {
        hasCarrierLabelPdf: !!shipmentData.carrier_label_pdf,
        carrierLabelSize: shipmentData.carrier_label_pdf?.length || 0,
        hasCarrierLabelUrl: !!shipmentData.carrier_label_url,
        carrierLabelUrl: shipmentData.carrier_label_url
      });
    } else {
      console.log('❌ Authentication failed:', shipmentResponse.status, shipmentResponse.statusText);
    }

    // 3. Test PNG endpoint directly
    console.log('\n3. Testing PNG endpoint...');
    const pngResponse = await fetch('http://localhost:5000/api/shipments/266/label/png?type=carrier');
    console.log('PNG endpoint result:', {
      status: pngResponse.status,
      statusText: pngResponse.statusText,
      contentType: pngResponse.headers.get('content-type'),
      contentLength: pngResponse.headers.get('content-length')
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function main() {
  await testModalAuthentication();
}

if (require.main === module) {
  main();
}