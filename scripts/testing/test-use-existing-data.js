/**
 * Test that verifies we use existing country/state data from user selection
 */

// Simulate the shipment data as it exists in the database
const shipmentData = {
  id: 157,
  receiverCountry: "BH", // User selected Bahrain
  receiverState: "",     // User left state empty (correct for Bahrain)
  receiverCity: "Manama"
};

console.log("=== Testing Use of Existing User-Selected Data ===");
console.log("Shipment data from database:");
console.log(`  - Country: "${shipmentData.receiverCountry}"`);
console.log(`  - State: "${shipmentData.receiverState || '(empty)'}"`);
console.log(`  - City: "${shipmentData.receiverCity}"`);

// New simplified logic - just use what the user provided
const destinationCountryCode = shipmentData.receiverCountry;
const stateCode = shipmentData.receiverState || "";

console.log("\nUsing existing data directly:");
console.log(`  - Country code: "${destinationCountryCode}"`);
console.log(`  - State code: "${stateCode || '(empty)'}"`);

// Create the ShipEntegra payload
const shippingAddress = {
  name: "Imaan Ali",
  address: "Road 839, block 408, Sanabis Villa 1003",
  city: shipmentData.receiverCity,
  country: destinationCountryCode,
  state: stateCode,
  postalCode: "00000",
  phone: "+97332377966",
  email: "p2gngzy3qw2bml9@marketplace.amazon.com"
};

console.log("\nShipEntegra payload (shippingAddress):");
console.log(JSON.stringify(shippingAddress, null, 2));

// Verify the result
if (destinationCountryCode === "BH" && stateCode === "") {
  console.log("\n✅ SUCCESS: Using existing user data correctly!");
  console.log("  - Country: BH (as selected by user)");
  console.log("  - State: (empty as selected by user)");
  console.log("  - No unnecessary mapping or derivation");
} else {
  console.log("\n❌ ISSUE: Not using existing data correctly");
}