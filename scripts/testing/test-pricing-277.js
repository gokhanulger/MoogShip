/**
 * Test pricing API for shipment #277 parameters
 * 1kg package to US with UPS service
 */

async function getShipentegraAccessToken() {
  const response = await fetch('https://publicapi.shipentegra.com/v1/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      clientId: 'b55524c23d9f62423c26089ab3526e81',
      clientSecret: 'c76fb6c0c1e46a78fc76fb6c0c1e46a7'
    })
  });

  const data = await response.json();
  return data.data.accessToken;
}

async function testShipment277Pricing() {
  try {
    console.log('🔍 Testing pricing for shipment #277 parameters...');
    console.log('📦 Package: 1kg to US (UPS service)');
    
    const accessToken = await getShipentegraAccessToken();
    console.log('✅ Got access token');

    const pricingPayload = {
      country: 'US',
      kgDesi: 1.0
    };

    console.log('🚀 Pricing payload:', JSON.stringify(pricingPayload, null, 2));

    const pricingResponse = await fetch('https://publicapi.shipentegra.com/v1/calculate/all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(pricingPayload)
    });

    const pricingData = await pricingResponse.json();
    
    console.log('\n📊 PRICING API RESPONSE:');
    console.log('Status:', pricingData.status);
    console.log('Full response:', JSON.stringify(pricingData, null, 2));

    if (pricingData.data && Array.isArray(pricingData.data)) {
      console.log('\n💰 PRICING OPTIONS:');
      pricingData.data.forEach((option, index) => {
        console.log(`\n${index + 1}. ${option.serviceName || option.displayName}`);
        console.log(`   Base Price: $${(option.basePrice / 100).toFixed(2)}`);
        console.log(`   Fuel Charge: $${(option.fuelCharge / 100).toFixed(2)}`);
        console.log(`   Total Price: $${(option.totalPrice / 100).toFixed(2)}`);
        console.log(`   Provider Code: ${option.providerServiceCode || option.serviceCode}`);
      });

      // Find UPS service specifically
      const upsOption = pricingData.data.find(option => 
        (option.providerServiceCode && option.providerServiceCode.includes('ups')) ||
        (option.serviceCode && option.serviceCode.includes('ups')) ||
        (option.serviceName && option.serviceName.toLowerCase().includes('ups')) ||
        (option.displayName && option.displayName.toLowerCase().includes('ups'))
      );

      if (upsOption) {
        console.log('\n🎯 UPS SERVICE FOUND:');
        console.log(`   Service: ${upsOption.serviceName || upsOption.displayName}`);
        console.log(`   Total Price: $${(upsOption.totalPrice / 100).toFixed(2)}`);
        console.log(`   Stored Original: $16.83`);
        console.log(`   Difference: ${upsOption.totalPrice === 1683 ? '✅ MATCH' : '❌ DIFFERENT'}`);
      } else {
        console.log('\n❌ No UPS service found in response');
      }
    } else {
      console.log('❌ No pricing data found in response');
    }

  } catch (error) {
    console.error('❌ Error testing pricing:', error);
  }
}

testShipment277Pricing();