/**
 * Test script to verify the Bahrain country/state mapping fix
 * This will test shipment 157 to ensure it maps to BH country and XX state (not US/NY)
 */

const shipmentData = {
  id: 157,
  trackingNumber: "MOG254435000157-2",
  senderName: "MOOG ENTERPRISE",
  senderAddress: "HALIL RIFAT PASA MAH. YUZER HAVUZ",
  senderCity: "ISTANBUL",
  senderPostalCode: "34300",
  senderPhone: "905407447911",
  senderEmail: "info@moogship.com",
  receiverName: "Imaan Ali",
  receiverAddress: "Road 839, block 408, Sanabis Villa 1003",
  receiverCity: "Manama",
  receiverCountry: "BH", // This should map to BH (Bahrain)
  receiverState: "", // This should map to XX (not US/NY)
  receiverPostalCode: "00000",
  receiverPhone: "+97332377966",
  receiverEmail: "p2gngzy3qw2bml9@marketplace.amazon.com",
  packageWeight: 1,
  packageLength: 10,
  packageWidth: 10,
  packageHeight: 1,
  status: "approved",
  serviceLevel: "standard",
  description: "silver nursing cups",
  packageContents: "silver nursing cups",
  customsValue: 3490, // 34.90 in cents
  customsItemCount: 1,
  totalPrice: 3490,
  pieceCount: 1
};

async function testBahrainMapping() {
  console.log("Testing Bahrain country/state mapping fix...");
  console.log("Original country:", shipmentData.receiverCountry);
  console.log("Original state:", shipmentData.receiverState || "(empty)");
  
  try {
    // Import the functions we need to test
    const { getCountryCode, getStateCode } = await import('./server/services/shipentegra.ts');
    
    // Test country mapping
    const mappedCountry = getCountryCode(shipmentData.receiverCountry);
    console.log("Mapped country code:", mappedCountry);
    
    // Test state mapping
    const mappedState = getStateCode(shipmentData.receiverCity, shipmentData.receiverCountry);
    console.log("Mapped state code:", mappedState);
    
    // Verify the fix
    if (mappedCountry === "BH" && mappedState === "XX") {
      console.log("✅ SUCCESS: Country and state correctly mapped!");
      console.log("  - Country: BH (Bahrain) ✓");
      console.log("  - State: XX (non-US country) ✓");
    } else {
      console.log("❌ FAILED: Incorrect mapping detected");
      console.log(`  - Expected: BH/XX, Got: ${mappedCountry}/${mappedState}`);
    }
    
    // Test the payload structure that would be sent to ShipEntegra
    const testPayload = {
      shippingAddress: {
        name: shipmentData.receiverName,
        address: shipmentData.receiverAddress,
        city: shipmentData.receiverCity,
        country: mappedCountry,
        state: mappedState,
        postalCode: shipmentData.receiverPostalCode,
        phone: shipmentData.receiverPhone,
        email: shipmentData.receiverEmail
      }
    };
    
    console.log("\nShipEntegra payload shipping address:");
    console.log(JSON.stringify(testPayload.shippingAddress, null, 2));
    
  } catch (error) {
    console.error("Error testing mapping:", error);
  }
}

testBahrainMapping();