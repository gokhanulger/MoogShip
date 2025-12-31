/**
 * Generate exact ShipEntegra API payload for shipment MOG253047000312
 */

const shipment = {
  id: 312,
  senderName: "Naturalbabaygif",
  senderAddress: "Kaynarca Mahallesi Deniz Caddesi",
  senderAddress1: "Kaynarca Mahallesi Deniz caddesi",
  senderAddress2: " ",
  senderCity: "Istanbul",
  senderPostalCode: "18340",
  receiverName: "Emily Brussell",
  receiverAddress: "5008 Black Falcon road ",
  receiverCity: "Shelbyville",
  receiverState: "KY",
  receiverCountry: "US",
  receiverPostalCode: "40065",
  receiverPhone: "+14287564314",
  receiverEmail: "es090498@gmail.com",
  packageLength: 56,
  packageWidth: 8,
  packageHeight: 4,
  packageWeight: 0.43,
  packageContents: "crib hanger",
  pieceCount: 1,
  trackingNumber: "MOG253047000312",
  selectedService: "standard",
  providerServiceCode: "shipentegra-widect"
};

// Calculate dimensions and weight
const packageLength = Math.ceil(parseFloat(shipment.packageLength));
const packageWidth = Math.ceil(parseFloat(shipment.packageWidth));
const packageHeight = Math.ceil(parseFloat(shipment.packageHeight));
const packageWeight = parseFloat(shipment.packageWeight); // No rounding for weight

// Generate tracking number with retry suffix
const trackingNumberForShipment = `${shipment.trackingNumber}-${Date.now()}`;

// Map US state
const stateCode = shipment.receiverState || "XX";
const destinationCountryCode = "US";

// Create the exact payload structure
const payload = {
  number: trackingNumberForShipment,
  packageQuantity: shipment.pieceCount || 1,
  reference1: shipment.trackingNumber,
  description: shipment.packageContents || `Package - ${shipment.id}`,
  currency: "USD",
  weight: packageWeight,
  width: packageWidth,
  height: packageHeight,
  length: packageLength,
  shipFrom: {
    name: shipment.senderName,
    address1: shipment.senderAddress || [
      shipment.senderAddress1,
      shipment.senderAddress2
    ].filter(Boolean).join(' ').trim(),
    city: shipment.senderCity,
    country: "TR",
    zipCode: shipment.senderPostalCode,
    phone: "905407447911",
    email: "info@moogship.com"
  },
  shippingAddress: {
    name: shipment.receiverName,
    address: shipment.receiverAddress?.split(' ').slice(0, -4).join(' ') || shipment.receiverAddress,
    city: shipment.receiverCity,
    country: destinationCountryCode,
    state: stateCode,
    postalCode: shipment.receiverPostalCode,
    phone: shipment.receiverPhone || "+14252987618",
    email: shipment.receiverEmail || "info@moogship.com"
  },
  items: []
};

console.log("ShipEntegra API Request Payload for MOG253047000312:");
console.log("=".repeat(60));
console.log(JSON.stringify(payload, null, 2));