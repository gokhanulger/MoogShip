/**
 * Test API call to label endpoint to verify TypeScript controller debugging output
 */

import https from 'https';

async function testLabelAPI() {
  console.log('🧪 Testing API call to /api/shipments/198/label...');
  
  const options = {
    hostname: '64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev',
    port: 443,
    path: '/api/shipments/198/label',
    method: 'GET',
    headers: {
      'Cookie': 'connect.sid=s%3AALXSyMpWqmyIR-Ts0dPNF_nQqA-ln0qg.VKPN%2F3IKg84k%2B4FZcQ9a9EgaDdOUeI4gAw5RoE7pu5Q',
      'Accept': 'application/pdf'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`🧪 Response status: ${res.statusCode}`);
      console.log(`🧪 Response headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`🧪 Response length: ${data.length} bytes`);
        if (res.statusCode === 200) {
          console.log('🧪 ✅ Label API call successful!');
        } else {
          console.log('🧪 ❌ Label API call failed');
          console.log('🧪 Response body:', data.substring(0, 500));
        }
        resolve(res.statusCode);
      });
    });
    
    req.on('error', (error) => {
      console.error('🧪 API call error:', error);
      reject(error);
    });
    
    req.end();
  });
}

testLabelAPI().catch(console.error);