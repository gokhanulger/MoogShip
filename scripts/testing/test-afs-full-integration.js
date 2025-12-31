/**
 * Complete AFS Transport integration test with MoogShip transformation
 */

async function testFullAFSIntegration() {
  console.log("🚀 Testing complete AFS Transport integration...");

  // Test direct API call first
  const payload = {
    islem: "fiyat_hesapla",
    country_code: "US",
    shipments: [
      {
        weight: 1.0,
        length: 20,
        width: 15,
        height: 10,
      },
    ],
  };

  try {
    console.log("📦 Testing direct API call...");
    const response = await fetch("https://panel.afstransport.com/apiv2.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AFS_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const directData = await response.json();

    if (directData.hata) {
      console.error("❌ Direct API returned error:", directData.mesaj);
      return;
    }

    // Now test through MoogShip pricing system

    const pricingResponse = await fetch(
      "http://localhost:3000/api/pricing/calculate/all",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weight: 1.0,
          length: 20,
          width: 15,
          height: 10,
          countryCode: "US",
        }),
      },
    );

    const pricingData = await pricingResponse.json();

    // Check if AFS options are included
    const afsOptions = pricingData.allOptions?.filter(
      (option) =>
        option.displayName?.includes("GLS") ||
        option.providerServiceCode?.includes("afs"),
    );

    if (afsOptions && afsOptions.length > 0) {
      afsOptions.forEach((option, index) => {
        console.log(
          `  ${index + 1}. ${option.displayName}: $${(option.totalPrice / 100).toFixed(2)} (${option.deliveryTime})`,
        );
      });
    } else {
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

testFullAFSIntegration();
