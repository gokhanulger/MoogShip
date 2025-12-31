/**
 * Test carrier label access for shipment 266 to debug the exact issue
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function testCarrierLabel266() {
  console.log('🧪 Testing carrier label access for shipment 266...\n');
  
  try {
    // 1. Get shipment data
    console.log('1. Fetching shipment 266 data...');
    const shipment = await sql`
      SELECT id, selected_service, provider_service_code, 
             label_url, label_pdf IS NOT NULL as has_label_pdf,
             carrier_label_url, carrier_label_pdf IS NOT NULL as has_carrier_label_pdf,
             LENGTH(carrier_label_pdf) as carrier_label_size,
             SUBSTRING(carrier_label_pdf, 1, 20) as carrier_label_header
      FROM shipments WHERE id = 266
    `;
    
    console.log('Shipment 266 data:', shipment[0]);
    
    // 2. Test label format detection endpoint
    console.log('\n2. Testing label format detection...');
    const formatResponse = await fetch('http://localhost:5000/api/shipments/266/label-format');
    const formatData = await formatResponse.json();
    console.log('Format detection result:', formatData);
    
    // 3. Test carrier data endpoint
    console.log('\n3. Testing carrier data endpoint...');
    const carrierResponse = await fetch('http://localhost:5000/api/shipments/266');
    const carrierData = await carrierResponse.json();
    console.log('Carrier data result:', {
      id: carrierData.id,
      has_carrier_label_pdf: !!carrierData.carrier_label_pdf,
      has_carrier_label_url: !!carrierData.carrier_label_url,
      carrier_label_url: carrierData.carrier_label_url,
      carrier_label_pdf_length: carrierData.carrier_label_pdf?.length || 0,
      carrier_label_pdf_header: carrierData.carrier_label_pdf?.substring(0, 20) || 'NONE'
    });
    
    // 4. Test PNG endpoint
    console.log('\n4. Testing PNG endpoint...');
    const pngResponse = await fetch('http://localhost:5000/api/shipments/266/label/png?type=carrier');
    console.log('PNG endpoint response:', {
      status: pngResponse.status,
      statusText: pngResponse.statusText,
      contentType: pngResponse.headers.get('content-type'),
      contentLength: pngResponse.headers.get('content-length')
    });
    
    if (pngResponse.ok) {
      console.log('✅ PNG endpoint working correctly');
    } else {
      const errorText = await pngResponse.text();
      console.log('❌ PNG endpoint error:', errorText);
    }
    
    // 5. Check PNG data validity
    console.log('\n5. Checking PNG data validity...');
    if (shipment[0].has_carrier_label_pdf) {
      const fullData = await sql`SELECT carrier_label_pdf FROM shipments WHERE id = 266`;
      const pngData = fullData[0].carrier_label_pdf;
      const isPngHeader = pngData.startsWith('iVBORw0KGgo');
      
      console.log('PNG data validation:', {
        length: pngData.length,
        isPngHeader,
        header: pngData.substring(0, 20),
        isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(pngData)
      });
      
      if (isPngHeader) {
        console.log('✅ Valid PNG base64 data found');
      } else {
        console.log('❌ Invalid PNG data - not a valid PNG header');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCarrierLabel266();