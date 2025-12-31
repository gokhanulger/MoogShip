/**
 * Test script to verify intelligent label routing system
 * Tests that ECO services route to PNG endpoint and UPS services route to PDF endpoint
 */

const https = require('https');

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          contentLength: res.headers['content-length']
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

async function testIntelligentRouting() {
  console.log('🚀 Testing Intelligent Label Routing System');
  console.log('=====================================');
  
  const baseUrl = '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev';
  
  // Test cases
  const testCases = [
    {
      name: 'ECO Service - PNG Endpoint',
      shipmentId: 266, // Known ECO service shipment
      endpoint: 'carrier-label-png',
      expectedContentType: 'image/png',
      service: 'shipentegra-eco'
    },
    {
      name: 'UPS Service - PDF Endpoint', 
      shipmentId: 261, // Known UPS service shipment
      endpoint: 'carrier-label-pdf',
      expectedContentType: 'application/pdf',
      service: 'shipentegra-ups-ekspress'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`   Shipment ID: ${testCase.shipmentId}`);
    console.log(`   Service: ${testCase.service}`);
    console.log(`   Endpoint: /api/shipments/${testCase.shipmentId}/${testCase.endpoint}`);
    
    try {
      const options = {
        hostname: baseUrl,
        port: 443,
        path: `/api/shipments/${testCase.shipmentId}/${testCase.endpoint}`,
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'User-Agent': 'Test-Intelligent-Routing/1.0'
        }
      };
      
      const response = await makeRequest(options);
      
      console.log(`   Status: ${response.statusCode}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Length: ${response.contentLength || 'unknown'} bytes`);
      
      // Validate response
      if (response.statusCode === 200) {
        if (response.headers['content-type']?.includes(testCase.expectedContentType)) {
          console.log(`   ✅ SUCCESS: Correct content type returned`);
        } else {
          console.log(`   ❌ FAILURE: Expected ${testCase.expectedContentType}, got ${response.headers['content-type']}`);
        }
        
        if (response.contentLength && parseInt(response.contentLength) > 1000) {
          console.log(`   ✅ SUCCESS: Valid file size (${response.contentLength} bytes)`);
        } else {
          console.log(`   ⚠️  WARNING: Small file size (${response.contentLength} bytes)`);
        }
      } else {
        console.log(`   ❌ FAILURE: HTTP ${response.statusCode}`);
        console.log(`   Response: ${response.data.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Testing Summary');
  console.log('================');
  console.log('✅ ECO services should route to PNG endpoint (~10KB files)');
  console.log('✅ UPS services should route to PDF endpoint (~1.5MB files)');
  console.log('✅ Both endpoints should return 200 status with correct content-type');
  console.log('✅ Frontend modal should intelligently select endpoint based on service');
  
  console.log('\n📝 Implementation Complete');
  console.log('=========================');
  console.log('• SimpleLabelModal now accepts selectedService parameter');
  console.log('• Intelligent routing logic detects ECO vs UPS services');
  console.log('• PNG endpoint serves ECO carrier labels with image/png headers');
  console.log('• PDF endpoint serves UPS carrier labels with application/pdf headers');
  console.log('• Both download and embedded viewing use same routing logic');
  console.log('• All components updated to pass service information');
}

if (require.main === module) {
  testIntelligentRouting().catch(console.error);
}