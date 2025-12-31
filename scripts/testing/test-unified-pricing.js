/**
 * Test unified pricing system to verify AFS Transport integration
 */

import fetch from 'node-fetch';

async function testUnifiedPricing() {
  try {
    const testPayload = {
      weight: 1.0,
      length: 20,
      width: 15,
      height: 10,
      countryCode: "US"
    };

    const publicUrl = process.env.REPL_URL || 'https://64a16594-abd1-49b2-9383-39620759d013-00-12hpoujf36yq8.worf.replit.dev';
    const response = await fetch(`${publicUrl}/api/pricing/moogship-options`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-token"
      },
      body: JSON.stringify(testPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return;
    }

    const pricingData = await response.json();

    const afsOptions = pricingData.allOptions?.filter(option => 
      option.displayName?.includes('GLS') || 
      option.providerServiceCode?.includes('afs') ||
      option.serviceName?.toLowerCase().includes('gls')
    ) || [];
    
    const shipentegraOptions = pricingData.allOptions?.filter(option => 
      !option.displayName?.includes('GLS') && 
      !option.providerServiceCode?.includes('afs')
    ) || [];
    
    if (pricingData.allOptions && pricingData.allOptions.length > 0) {
      if (afsOptions.length === 0) {
        await testAFSAuthentication();
      }
    }

  } catch (error) {
  }
}

async function testAFSAuthentication() {
  const payload = {
    islem: "fiyat_hesapla",
    country_code: "US",
    shipments: [{
      weight: 1.0,
      length: 20,
      width: 15,
      height: 10
    }]
  };

  const authMethods = [
    { name: "Bearer Token", headers: { "Authorization": `Bearer ${process.env.AFS_API_KEY}` }},
    { name: "API Key Header", headers: { "x-api-key": process.env.AFS_API_KEY }},
    { name: "Token Header", headers: { "token": process.env.AFS_API_KEY }},
    { name: "API Token Header", headers: { "api-token": process.env.AFS_API_KEY }},
  ];

  for (const method of authMethods) {
    try {
      const response = await fetch("https://panel.afstransport.com/apiv2.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...method.headers
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!data.hata && data.prices) {
        return method.name;
      }
    } catch (error) {
    }
  }
  
  return null;
}

testUnifiedPricing();