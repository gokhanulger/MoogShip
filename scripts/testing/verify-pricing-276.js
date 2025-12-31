/**
 * Verify pricing for shipment 276 to check if original API cost is correct
 * Shipment details: 1kg, 5x5x5cm package to US with UPS service
 */

import https from 'https';

async function getShipentegraAccessToken() {
  const clientId = 'b55524c23d9f62423c26089ab3526e81';
  const clientSecret = 'b1b345e6daf0c3a49d9c09b7df1a6c5e';
  
  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials'
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'publicapi.shipentegra.com',
      port: 443,
      path: '/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`Token error: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testShipment276Pricing() {
  try {
    console.log('🔍 Testing shipment 276 pricing parameters...');
    console.log('📦 Package: 1kg, 5x5x5cm to US (UPS service)');
    
    const accessToken = await getShipentegraAccessToken();
    console.log('✅ Got Shipentegra access token');

    // Same parameters as shipment 276
    const payload = {
      country: 'US',
      kgDesi: 1,
      seCarrier: 'shipentegra-ups-ekspress',
      packageQuantity: 1
    };

    console.log('🚀 API Request payload:', JSON.stringify(payload, null, 2));

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify(payload);
      
      const options = {
        hostname: 'publicapi.shipentegra.com',
        port: 443,
        path: '/v1/calculate/all',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            console.log('📊 API Response status:', res.statusCode);
            console.log('📊 Full API response:', JSON.stringify(response, null, 2));

            if (response.data && Array.isArray(response.data)) {
              console.log('\n💰 Pricing Results:');
              response.data.forEach((service, index) => {
                const totalCents = Math.round((service.total_price || service.totalPrice || 0) * 100);
                const totalDollars = (totalCents / 100).toFixed(2);
                console.log(`${index + 1}. ${service.service_name || service.serviceName}:`);
                console.log(`   Total: $${totalDollars} (${totalCents} cents)`);
                console.log(`   Base: $${((service.base_price || service.basePrice || 0)).toFixed(2)}`);
                console.log(`   Fuel: $${((service.fuel_charge || service.fuelCharge || 0)).toFixed(2)}`);
              });

              // Find UPS service
              const upsService = response.data.find(s => 
                (s.service_name || s.serviceName || '').toLowerCase().includes('ups') ||
                (s.service_name || s.serviceName || '').toLowerCase().includes('ekspress')
              );

              if (upsService) {
                const totalCents = Math.round((upsService.total_price || upsService.totalPrice || 0) * 100);
                console.log(`\n🎯 UPS Service Found: ${upsService.service_name || upsService.serviceName}`);
                console.log(`💵 API Total: $${(totalCents / 100).toFixed(2)} (${totalCents} cents)`);
                console.log(`💾 Database stored: $16.83 (1683 cents)`);
                console.log(`👤 Customer price: $21.04 (2104 cents) [1683 × 1.25 = ${Math.round(1683 * 1.25)}]`);
                
                if (totalCents === 1683) {
                  console.log('✅ PRICING CORRECT: API matches database original cost');
                } else {
                  console.log('❌ PRICING MISMATCH: API vs database difference');
                  console.log(`   Difference: ${totalCents - 1683} cents = $${((totalCents - 1683) / 100).toFixed(2)}`);
                }
              } else {
                console.log('❌ UPS service not found in response');
              }
            } else {
              console.log('❌ Unexpected response format');
            }
            
            resolve();
          } catch (error) {
            console.error('❌ JSON parse error:', error);
            console.log('Raw response:', data);
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.error('❌ Error testing pricing:', error);
  }
}

testShipment276Pricing();