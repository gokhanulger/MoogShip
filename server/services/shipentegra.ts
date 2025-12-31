import fetch from "node-fetch";
import { ServiceLevel, ShipmentStatus } from "@shared/schema";
import { db } from "../db"; // Import database connection
import * as storage from "../storage"; // Import storage for retrieving package items
import {
  normalizeCountryCode,
  normalizeStateCode,
  formatAddressForAPI,
  formatCityForAPI,
} from "@shared/countries";

// Response for sendToShipEntegra
interface SendToShipEntegraResponse {
  success: boolean;
  message: string;
  shipmentIds: number[];
  failedShipmentIds?: number[];
  trackingNumbers?: { [key: number]: string }; // Moogship internal tracking numbers
  carrierTrackingNumbers?: { [key: number]: string }; // 3rd party carrier tracking numbers
  labelUrls?: { [key: number]: string }; // MoogShip label URLs
  labelPdfs?: { [key: number]: string | null }; // MoogShip base64 encoded PDF data
  carrierLabelUrls?: { [key: number]: string }; // 3rd party carrier label URLs
  carrierLabelPdfs?: { [key: number]: string | null }; // 3rd party carrier base64 encoded PDF data
  shipmentErrors?: { [key: number]: string }; // Detailed error messages for each failed shipment
  duplicateOrderErrors?: { [key: number]: boolean }; // Flag to indicate duplicate order errors for specific shipments
}

// ShipEntegra Order Response
interface ShipentegraOrderResponse {
  status: string;
  data: {
    orderId: string;
    se_tracking_number?: string;
  };
  message?: string;
}

// ShipEntegra Label Response
interface ShipentegraLabelResponse {
  status: string;
  data: {
    label: string;
    courier: string;
    trackingNumber: string;
    invoice?: string; // PDF invoice URL for carrier labels
    shipEntegraLabel?: string; // ShipEntegra-branded invoice document
    carrierLabelUrl?: string; // PNG label URL for DHL E-Commerce API
  };
  message?: string;
}

/**
 * Base URLs for the Shipentegra API - Updated based on API documentation
 */
const SHIPENTEGRA_TOKEN_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_PRICE_URL =
  "https://publicapi.shipentegra.com/v1/tools/calculate/all"; // Updated to use calculate/all endpoint
// Updated URLs from the Google Apps Script
const SHIPENTEGRA_CREATE_ORDER_URL =
  "https://publicapi.shipentegra.com/v1/orders/manual";
const SHIPENTEGRA_FIND_ORDERS_URL =
  "https://publicapi.shipentegra.com/v1/orders";

/**
 * Service mapping configuration with URLs and special service codes
 * Updated with accurate API endpoints from ShipEntegra documentation
 */
const SERVICE_MAPPING: Record<
  string,
  {
    url: string;
    specialService: string | number;
    displayName: string;
    unsupportedCountries?: string[];
  }
> = {
  // ShipEntegra branded services - all use main endpoint with special service codes
  "shipentegra-express": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-express",
    displayName: "MoogShip Express",
    unsupportedCountries: ["SA", "AE", "KW", "QA", "BH", "OM"], // Gulf countries not supported by EXPRESS
  },
  "shipentegra-eco": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Eco",
  },
  "shipentegra-ups-ekspress": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/ups",
    specialService: "shipentegra-express",
    displayName: "MoogShip UPS Express",
  },
  "shipentegra-ups-express": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/ups",
    specialService: "",
    displayName: "MoogShip UPS Express",
  },
  "shipentegra-ups-standart": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/ups",
    specialService: "shipentegra-expedited",
    displayName: "MoogShip UPS Standard",
  },
  "shipentegra-worldwide-standard": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-worldwide-standard",
    displayName: "MoogShip Standard",
  },
  "shipentegra-widect": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip-Eco",
  },
  "shipentegra-amerika-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Amerika Eco Plus",
  },
  "shipentegra-almanya-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Almanya Eco Plus",
  },
  "shipentegra-avustralya-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Avustralya Eco Plus",
  },
  "shipentegra-fransa-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Fransa Eco Plus",
  },
  "shipentegra-global-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip Global Eco Plus",
  },
  "shipentegra-ingiltere-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-ingiltere-eko-plus",
    displayName: "MoogShip İngiltere Eco Plus",
  },
  "shipentegra-fedex-amerika-standard": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-fedex-amerika-standard",
    displayName: "MoogShip FedEx Amerika Standard",
  },
  "shipentegra-fedex": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-fedex",
    displayName: "MoogShip FedEx",
  },
  "shipentegra-dhl": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra",
    specialService: "shipentegra-dhl",
    displayName: "MoogShip DHL Express",
  },

  // Direct carrier services - use native carrier endpoints
  "se-ups": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/ups",
    specialService: "shipentegra-express",
    displayName: "MoogShip UPS",
  },
  "se-fedex": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/fedex",
    specialService: "",
    displayName: "MoogShip FedEx",
  },
  "se-fedex-us": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/fedex",
    specialService: "x1",
    displayName: "MoogShip FedEx Amerika",
  },
  "se-usps": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/usps",
    specialService: 1,
    displayName: "MoogShip USPS",
  },
  "se-dhlecommerce": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/dhlecommerce",
    specialService: "",
    displayName: "MoogShip DHL E-Commerce",
  },
  "se-dhlecommerce-eko-plus": {
    url: "https://publicapi.shipentegra.com/v1/logistics/labels/shipentegra/dhlecommerce",
    specialService: "",
    displayName: "MoogShip DHL E-Commerce Eco Plus",
  },

  // AFS Transport services - use dedicated AFS Transport API
  "afs-gls": {
    url: "AFS_TRANSPORT_API", // Special marker for AFS Transport API routing
    specialService: "gls",
    displayName: "MoogShip GLS",
  },
  "afs-gls-express": {
    url: "AFS_TRANSPORT_API",
    specialService: "gls-express",
    displayName: "MoogShip GLS Express",
  },
  "afs-1": {
    url: "AFS_TRANSPORT_API",
    specialService: "1",
    displayName: "MoogShip GLS",
  },
  "afs-2": {
    url: "AFS_TRANSPORT_API",
    specialService: "2",
    displayName: "MoogShip GLS",
  },
  "afs-3": {
    url: "AFS_TRANSPORT_API",
    specialService: "3",
    displayName: "MoogShip GLS",
  },
  "afs-4": {
    url: "AFS_TRANSPORT_API",
    specialService: "4",
    displayName: "MoogShip GLS",
  },
  "afs-5": {
    url: "AFS_TRANSPORT_API",
    specialService: "5",
    displayName: "MoogShip GLS",
  },
  "afs-6": {
    url: "AFS_TRANSPORT_API",
    specialService: "6",
    displayName: "MoogShip GLS",
  },
  "afs-7": {
    url: "AFS_TRANSPORT_API",
    specialService: "7",
    displayName: "MoogShip GLS",
  },
  "afs-8": {
    url: "AFS_TRANSPORT_API",
    specialService: "8",
    displayName: "MoogShip GLS",
  },
  "afs-9": {
    url: "AFS_TRANSPORT_API",
    specialService: "9",
    displayName: "MoogShip GLS",
  },
  "afs-10": {
    url: "AFS_TRANSPORT_API",
    specialService: "10",
    displayName: "MoogShip GLS",
  },
};

// Verify SERVICE_MAPPING initialization at module load
// SERVICE_MAPPING initialized with 21 services

// Dimensional factor for calculating volumetric weight
const DIMENSIONAL_FACTOR = 5000; // For cm³ to kg conversion

/**
 * Split address into address1 and address2 based on 35-character limit
 * As advised by ShipEntegra tech support
 */
function splitAddressForShipEntegra(fullAddress: string): { address1: string; address2?: string } {
  const trimmedAddress = fullAddress.trim();
  
  // If address is 35 characters or less, put it all in address1
  if (trimmedAddress.length <= 35) {
    return { address1: trimmedAddress };
  }
  
  // Find the best place to split (prefer word boundaries)
  let splitIndex = 35;
  
  // Look for a space, comma, or other separator within the last 10 characters of the limit
  for (let i = 35; i >= 25; i--) {
    const char = trimmedAddress[i];
    if (char === ' ' || char === ',' || char === '-') {
      splitIndex = i;
      break;
    }
  }
  
  const address1 = trimmedAddress.substring(0, splitIndex).trim();
  const address2 = trimmedAddress.substring(splitIndex).trim();
  
  return {
    address1: address1.length > 35 ? address1.substring(0, 35).trim() : address1,
    address2: address2.length > 0 ? (address2.length > 35 ? address2.substring(0, 35).trim() : address2) : undefined
  };
}

/**
 * Centralized function to build ShipEntegra shippingAddress object
 * Ensures consistent address formatting across all code paths
 */
function buildShippingAddress(shipment: any, stateCode?: string): any {
  // Check if receiverAddress2 is already contained in receiverAddress to avoid duplication
  let fullAddress = shipment.receiverAddress || "";
  
  if (shipment.receiverAddress2 && 
      shipment.receiverAddress2.trim() !== "" && 
      !fullAddress.includes(shipment.receiverAddress2.trim())) {
    // Only add receiverAddress2 if it's not already in the main address
    fullAddress = [fullAddress, shipment.receiverAddress2].filter(Boolean).join(", ").trim();
  }
  
  // Split address based on 35-character limit
  const addressSplit = splitAddressForShipEntegra(formatAddressForAPI(fullAddress));
  
  // Get normalized country code
  const countryCode = getCountryCode(shipment.receiverCountry);
  
  // Ensure proper state for US/CA shipments
  let normalizedState = (shipment.receiverState || stateCode || "").trim();
  if ((countryCode === "US" || countryCode === "CA") && !normalizedState) {
    console.warn(`⚠️ Missing state for ${countryCode} shipment ${shipment.id}. This may cause ShipEntegra validation error.`);
  }
  
  // Helper function to check if a value is effectively empty or a placeholder
  const isEmptyOrPlaceholder = (value: string | null | undefined): boolean => {
    if (!value || value.trim() === "") return true;
    const trimmed = value.trim();
    return trimmed === "(Not provided)" || 
           trimmed === "Not provided" ||
           trimmed === "N/A" ||
           trimmed === "n/a" ||
           trimmed === "-";
  };
  
  // TESTING: Send single "address" field combining address1 and address2
  const combinedAddress = addressSplit.address2 
    ? `${addressSplit.address1}, ${addressSplit.address2}`.trim()
    : addressSplit.address1;
  
  const shippingAddress = {
    name: (shipment.receiverName || "").trim(),
    address: combinedAddress,  // Single address field combining both lines
    city: formatCityForAPI((shipment.receiverCity || "").trim()),
    country: countryCode,
    state: normalizedState,
    postalCode: (shipment.receiverPostalCode || "").trim(),
    phone: isEmptyOrPlaceholder(shipment.receiverPhone) ? "+14252987618" : shipment.receiverPhone.trim(),
    email: "info@moogship.com",
  };
  
  // Log the shipping address being sent
  console.info(`📦 ShipEntegra Shipping Address for shipment ${shipment.id}:`, JSON.stringify(shippingAddress, null, 2));
  
  return shippingAddress;
}

// Cache for access token to prevent too many auth requests
let cachedAccessToken: {
  token: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
} | null = null;

// Interface for shipment data when sending to ShipEntegra
interface ShipEntegraSubmitData {
  id: number;
  userId?: number; // Added for logging
  trackingNumber: string;
  senderName: string;
  senderAddress: string; // Kept for backward compatibility
  senderAddress1?: string; // Primary address line (max 35 chars for ShipEntegra)
  senderAddress2?: string; // Secondary address line (optional)
  senderCity: string;
  senderPostalCode: string;
  senderEmail: string;
  senderPhone: string;
  receiverName: string;
  receiverAddress: string;
  receiverAddress2?: string; // Added for apartment/suite numbers
  receiverCity: string;
  receiverState?: string; // State/province code, may be provided or derived
  receiverCountry: string;
  receiverPostalCode: string;
  receiverEmail?: string; // Made optional since it may not be available in all shipments
  receiverPhone: string;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  serviceLevel: ServiceLevel;
  status: ShipmentStatus;
  orderNumber?: string; // Added for order creation
  description?: string; // Added for order description
  customsValue?: number; // Total value of items in cents
  customsItemCount?: number; // Total number of items for customs declaration
  packageContents?: string; // Package contents description
  labelAttempts?: number; // Number of attempts to purchase label
  labelError?: string | null; // Error message from failed label purchase
  totalPrice?: number; // Total price of the shipment in cents
  pieceCount?: number; // Number of physical packages in the shipment
  piece_count?: number; // Database field name for piece count
  gtip?: string | number | null | undefined; // GTIP/HS code for customs declaration
  iossNumber?: string | null | undefined; // IOSS number for EU shipments
  selectedService?: string | null; // User's selected MoogShip service (Eco, UPS, Standard)
  providerServiceCode?: string; // Added for service mapping
  packageItems?: Array<{
    id: number;
    name: string;
    description?: string;
    quantity: number;
    price: number;
    weight: number;
    htsCode: string;
    countryOfOrigin: string;
  }>; // Package items for detailed customs declaration
  currency?: string; // Add currency for customs
}

/**
 * Interface for ShipEntegra find orders response
 */
interface ShipentegraFindOrdersResponse {
  status: string;
  data: {
    orders: Array<{
      orderId: string;
      order_id: string;
      se_tracking_number?: string;
    }>;
  };
  message?: string;
}

// API credentials from environment variables
// Now only using environment variables without fallbacks
const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

// API credentials from environment variables

// Response interfaces for new calculate/all endpoint
interface MoogShipPriceOption {
  id: string;
  serviceName: string;
  displayName: string;
  cargoPrice: number;
  fuelCost: number;
  additionalFee?: number; // Pass-through fees (not multiplied by user margin)
  totalPrice: number;
  deliveryTime: string;
  serviceType: string;
  description?: string;
  providerServiceCode: string;
}

interface MoogShipPriceResponse {
  success: boolean;
  options: MoogShipPriceOption[];
  bestOption?: string;
  currency: string;
  // Legacy format properties that the controller expects
  basePrice?: number;
  fuelCharge?: number;
  additionalFee?: number; // Pass-through fee (not multiplied)
  totalPrice?: number;
  estimatedDeliveryDays?: number;
  carrierName?: string;
}

// Single carrier price response
interface ShipentegraApiResponse {
  status: string;
  time?: string;
  code?: number;
  data: {
    success: boolean;
    price: number;
    fuel?: number; // Fuel surcharge
    pricing?: string; // Pricing template used
    uniqueCode?: string; // Unique pricing code
    accessToken?: string; // For auth responses
    expiresIn?: number; // For auth responses
  };
  message?: string;
}

// Multi-carrier price response with multiple service options
interface ShipentegraMultiCarrierResponse {
  status: string;
  time?: string;
  code?: number;
  data: {
    generalInfo?: string;
    bestCarrier?: string;
    uniqueCode?: string;
    prices: Array<{
      cargoPrice: number;
      fuelCost: number;
      additionalFee?: number; // Additional fees that should be pass-through (not multiplied)
      totalPrice: number;
      serviceType: string;
      serviceName: string;
      clearServiceName?: string;
      additionalDescription?: string;
    }>;
  };
  message?: string;
}

/**
 * Get an access token from Shipentegra API using the format from the attachment
 */
async function getShipentegraAccessToken(): Promise<string | null> {
  try {
    // Check if we have a valid cached token AND the credentials haven't changed
    if (
      cachedAccessToken &&
      cachedAccessToken.expiresAt > Date.now() &&
      cachedAccessToken.clientId === CLIENT_ID &&
      cachedAccessToken.clientSecret === CLIENT_SECRET
    ) {
      return cachedAccessToken.token;
    } else if (cachedAccessToken) {
      // Clear the cached token
      cachedAccessToken = null;
    }

    // Validate credentials
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return null;
    }

    // Prepare the payload for token request - EXACTLY as in the Google Apps Script example
    const payload = {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    };

    // Enhanced browser-like approach to bypass CloudFlare
    const response = await fetch(SHIPENTEGRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Origin: "https://publicapi.shipentegra.com",
        Referer: "https://publicapi.shipentegra.com/",
        Connection: "keep-alive",
        DNT: "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Security: Removed ShipEntegra token error debug logging
      return null;
    }

    const responseData = await response.json();

    // Type assertion to handle the response data
    const data = responseData as ShipentegraApiResponse;

    if (data.status === "success" && data.data && data.data.accessToken) {
      const token = data.data.accessToken;
      const expiresIn = data.data.expiresIn || 3600; // Default to 1 hour

      // Cache the token with the credentials that were used to get it
      cachedAccessToken = {
        token: token,
        expiresAt: Date.now() + expiresIn * 1000,
        clientId: CLIENT_ID || "",
        clientSecret: CLIENT_SECRET || "",
      };

      return token;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

/**
 * Makes a request to the Shipentegra API to calculate shipping prices
 */
export async function calculateShippingPrice(
  senderPostalCode: string,
  senderCity: string,
  receiverPostalCode: string,
  receiverCity: string,
  receiverCountry: string,
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  serviceLevel: ServiceLevel,
): Promise<any> {
  try {
    // Get access token
    const accessToken = await getShipentegraAccessToken();
    if (!accessToken) {
      return {
        basePrice: 2000, // $20 fallback
        fuelCharge: 300,
        totalPrice: 2300,
        currency: "USD",
        estimatedDeliveryDays: 5,
        carrierName: "UPS Express",
      };
    }

    // All shipments originate from Turkey
    const ORIGIN_COUNTRY_CODE = "TR";

    // Calculate volumetric weight
    const volumetricWeight =
      (packageLength * packageWidth * packageHeight) / DIMENSIONAL_FACTOR;

    // Use the greater of actual weight or volumetric weight
    const finalWeight = Math.max(packageWeight, volumetricWeight);

    // Ensure minimum weight requirement is met
    const chargeableWeight = finalWeight < 0.01 ? 0.5 : finalWeight;

    // Map destination country to country code
    const destinationCountryCode = getCountryCode(receiverCountry);

    // Don't specify carrier - let the API return all available options
    // The `/calculate/all` endpoint returns all available carriers when no specific carrier is specified
    console.log(`[SHIPENTEGRA] Calculating prices for all carriers - weight: ${chargeableWeight}kg, destination: ${destinationCountryCode}`);

    // Prepare request payload - don't specify carrier to get all options
    const payload = {
      country: destinationCountryCode, // Destination country code
      kgDesi: chargeableWeight, // Weight in kg
      // Don't specify seCarrier to get all available options
      isAmazonShipment: 0, // Not an Amazon shipment
    };

    // Weight calculation complete

    // Enhanced browser-like headers to bypass CloudFlare
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`, // This is the correct format for Shipentegra
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://publicapi.shipentegra.com",
      Referer: "https://publicapi.shipentegra.com/",
      Connection: "keep-alive",
      DNT: "1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    };

    const response = await fetch(SHIPENTEGRA_PRICE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        basePrice: 2000, // $20 fallback
        fuelCharge: 300,
        totalPrice: 2300,
        currency: "USD",
        estimatedDeliveryDays: 5,
        carrierName: "UPS Express",
      };
    }

    const responseData = await response.json();

    // Cast responseData to appropriate interface for type safety
    const typedResponse = responseData as any;

    // Check if the response has a valid status
    if (typedResponse.status !== "success") {
      return {
        basePrice: 2000, // $20 fallback
        fuelCharge: 300,
        totalPrice: 2300,
        currency: "USD",
        estimatedDeliveryDays: 5,
        carrierName: "UPS Express",
      };
    }

    // Handle the new calculate/all endpoint response format
    if (typedResponse.data && "prices" in typedResponse.data) {
      const multiCarrierResponse =
        responseData as ShipentegraMultiCarrierResponse;

      // Transform Shipentegra response to MoogShip branded options
      return transformToMoogShipOptions(multiCarrierResponse);
    } else {
      return {
        basePrice: 2000, // $20 fallback
        fuelCharge: 300,
        totalPrice: 2300,
        currency: "USD",
        estimatedDeliveryDays: 5,
        carrierName: "UPS Express",
      };
    }
  } catch (error) {
    return {
      basePrice: 2000, // $20 fallback
      fuelCharge: 300,
      totalPrice: 2300,
      currency: "USD",
      estimatedDeliveryDays: 5,
      carrierName: "UPS Express",
    };
  }
}

/**
 * Transform Shipentegra API response to MoogShip branded pricing options
 */
function transformToMoogShipOptions(
  response: ShipentegraMultiCarrierResponse,
): MoogShipPriceResponse {
  const { prices } = response.data;

  if (!prices || prices.length === 0) {
    return {
      success: false,
      options: [],
      currency: "USD",
      // Legacy format fallback to prevent 500 errors
      basePrice: 2000,
      fuelCharge: 300,
      totalPrice: 2300,
      estimatedDeliveryDays: 5,
      carrierName: "UPS Express",
    };
  }

  // Sort prices by total cost and take the best 3 options
  const sortedPrices = prices.sort((a, b) => a.totalPrice - b.totalPrice);
  const topThreeOptions = sortedPrices.slice(0, 3);

  // Transform to MoogShip branded options
  const moogShipOptions: MoogShipPriceOption[] = topThreeOptions.map(
    (price, index) => {
      // Extract delivery time from Turkish description
      const deliveryMatch = price.additionalDescription?.match(
        /(\d+-\d+\s*iş\s*günü)/,
      );
      const deliveryTime = deliveryMatch
        ? deliveryMatch[1].replace("iş günü", "business days")
        : "2-5 business days";

      // Create MoogShip service names and provider codes based on price tier
      let displayName = "";
      let serviceType = "";
      let providerServiceCode = "";

      // Map based on actual service name instead of index position
      const serviceName = price.serviceName || "";

      if (
        serviceName === "shipentegra-ups-express" ||
        serviceName.toLowerCase().includes("ups")
      ) {
        displayName = "MoogShip UPS Express";
        serviceType = "EXPRESS";
        providerServiceCode = "shipentegra-ups-express";
      } else if (
        serviceName === "shipentegra-widect" ||
        serviceName.toLowerCase().includes("widect")
      ) {
        displayName = "MoogShip-Eco";
        serviceType = "ECO";
        providerServiceCode = "shipentegra-widect";
      } else if (
        serviceName === "shipentegra-worldwide-standard" ||
        serviceName.toLowerCase().includes("worldwide")
      ) {
        displayName = "MoogShip Worldwide Standard";
        serviceType = "STANDARD";
        providerServiceCode = "shipentegra-worldwide-standard";
      } else if (
        serviceName.toLowerCase().includes("amerika") ||
        serviceName.toLowerCase().includes("eko")
      ) {
        displayName = "MoogShip Worldwide Standard";
        serviceType = "STANDARD";
        providerServiceCode = "shipentegra-worldwide-standard";
      } else {
        // Default fallback
        displayName = "MoogShip-Eco";
        serviceType = "ECO";
        providerServiceCode = "shipentegra-widect";
      }

      // Extract additionalFee if present
      const additionalFee = price.additionalFee || 0;
      
      // Note: The totalPrice from API should already include all fees
      // We're just converting to cents and passing through
      const totalInCents = Math.round(price.totalPrice * 100);
      
      return {
        id: `moogship-${serviceType.toLowerCase()}`,
        serviceName: price.serviceName,
        displayName,
        cargoPrice: Math.round(price.cargoPrice * 100), // Convert to cents
        fuelCost: Math.round(price.fuelCost * 100), // Convert to cents
        additionalFee: Math.round(additionalFee * 100), // Convert to cents
        totalPrice: totalInCents, // This should include all fees from API
        deliveryTime,
        serviceType,
        description: `${displayName} shipping service`,
        providerServiceCode, // Critical field for proper service selection
      };
    },
  );

  // Get the first/best option for the legacy format
  const bestOption = moogShipOptions[0];
  
  return {
    // Legacy format that the controller expects
    basePrice: bestOption?.cargoPrice || 2000,
    fuelCharge: bestOption?.fuelCost || 300,
    additionalFee: bestOption?.additionalFee || 0, // Pass-through fee
    totalPrice: bestOption?.totalPrice || 2300,
    currency: "USD",
    estimatedDeliveryDays: 5,
    carrierName: bestOption?.displayName || "UPS Express",
    // New format for frontend options
    success: true,
    options: moogShipOptions,
    bestOption: moogShipOptions[0]?.id,
  };
}

// Continue with the rest of the original function for backward compatibility
function handleLegacySingleCarrierResponse(
  typedResponse: any,
  serviceLevel: ServiceLevel,
) {
  try {
    if (typedResponse.data && "success" in typedResponse.data) {
      // This is a single carrier response
      const singleCarrierResponse = typedResponse as ShipentegraApiResponse;

      // Verify the response contains valid price data
      if (
        singleCarrierResponse.data.success &&
        typeof singleCarrierResponse.data.price === "number"
      ) {
        // Get base price and fuel surcharge from API
        const basePrice = singleCarrierResponse.data.price;
        const fuelSurcharge = singleCarrierResponse.data.fuel || 0;
        const subtotal = basePrice + fuelSurcharge;

        // Return the formatted response without taxes - using cents for consistency with the UI
        return {
          basePrice: Math.round(basePrice * 100), // Convert to cents to match UI expectation
          fuelCharge: Math.round(fuelSurcharge * 100), // Convert to cents
          totalPrice: Math.round(subtotal * 100), // Convert to cents (no tax)
          currency: "USD", // Default currency
          estimatedDeliveryDays: getEstimatedDeliveryDays(serviceLevel),
          carrierName: "UPS Ekspress", // Default carrier name for single-carrier responses
        };
      } else {
        const errorMsg = singleCarrierResponse.message || "Invalid price data";

        return {
          basePrice: 2000, // $20 fallback
          fuelCharge: 300,
          totalPrice: 2300,
          currency: "USD",
          estimatedDeliveryDays: 5,
          carrierName: "UPS Express",
        };
      }
    } else {
      // Unknown response format - return legacy format for backward compatibility

      return {
        basePrice: 2000, // $20 fallback
        fuelCharge: 300,
        totalPrice: 2300,
        currency: "USD",
        estimatedDeliveryDays: 5,
        carrierName: "UPS Express",
      };
    }
  } catch (error) {
    return {
      basePrice: 2000, // $20 fallback
      fuelCharge: 300,
      totalPrice: 2300,
      currency: "USD",
      estimatedDeliveryDays: 5,
      carrierName: "UPS Express",
    };
  }
}

/**
 * Map country names or codes to ISO country codes
 * Handles both full country names and 2-letter country codes
 */
// List of EU country codes
const EU_COUNTRY_CODES = [
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
];

/**
 * Get service code for label purchasing - uses stored provider service code or falls back to mapping
 * This supports the generic provider system where service codes are stored directly
 */
function getServiceCodeForLabel(shipment: any): string {
  // First priority: Use stored provider service code but check if it needs mapping (legacy data)
  if (shipment.providerServiceCode) {
    // Check if this is a legacy generic service code that needs mapping
    if (
      shipment.providerServiceCode === "UPS" ||
      shipment.providerServiceCode === "DHL" ||
      shipment.providerServiceCode === "FEDEX" ||
      !shipment.providerServiceCode.includes("shipentegra-")
    ) {
      const mappedCode = mapServiceNameToCode(shipment.providerServiceCode);

      return mappedCode;
    }

    return shipment.providerServiceCode;
  }

  // Second priority: Use stored selected service (current system)
  if (shipment.selectedService) {
    const mappedCode = mapServiceNameToCode(shipment.selectedService);
    return mappedCode;
  }

  // Third priority: Try to derive from serviceLevel
  if (shipment.serviceLevel) {
    const mappedCode = mapServiceNameToCode(shipment.serviceLevel);
    return mappedCode;
  }

  // Fallback

  return "shipentegra-ups-ekspress";
}

/**
 * Map service names to ShipEntegra service codes
 * Used for backward compatibility when provider service code is not stored
 */
/**
 * Check if a service is supported for a specific destination country
 */
function isServiceSupportedForCountry(
  serviceCode: string,
  countryCode: string,
): boolean {
  const serviceConfig = SERVICE_MAPPING[serviceCode];
  if (!serviceConfig || !serviceConfig.unsupportedCountries) {
    return true; // If no restrictions defined, assume supported
  }
  return !serviceConfig.unsupportedCountries.includes(countryCode);
}

/**
 * Get alternative service for unsupported destinations
 */
function getAlternativeService(
  originalService: string,
  countryCode: string,
): string {
  // For Gulf countries where EXPRESS is not supported, use UPS Express instead
  if (["SA", "AE", "KW", "QA", "BH", "OM"].includes(countryCode)) {
    if (originalService === "shipentegra-express") {
      return "shipentegra-ups-express"; // UPS Express works for Gulf countries
    }
  }
  return originalService; // Return original if no alternative needed
}

function mapServiceNameToCode(serviceName: string): string {
  const nameLower = serviceName.toLowerCase();

  // Handle legacy generic UPS service codes - these need proper mapping
  if (nameLower === "ups") {
    return "shipentegra-ups-ekspress";
  }

  // FEDEX SERVICE MAPPING - Add proper FedEx detection logic
  if (nameLower.includes("fedex")) {
    // Specific FedEx service variants
    if (nameLower.includes("amerika") || nameLower.includes("us")) {
      return "se-fedex-us";
    }
    if (nameLower.includes("standard")) {
      return "shipentegra-fedex-amerika-standard";
    }
    // Default FedEx service
    return "shipentegra-fedex";
  }

  // Direct service name mapping to codes
  if (nameLower.includes("amerika eko plus"))
    return "shipentegra-amerika-eko-plus";
  if (nameLower.includes("international express"))
    return "shipentegra-international-express";
  if (nameLower.includes("ingiltere eko plus"))
    return "shipentegra-ingiltere-eko-plus";
  if (nameLower.includes("worldwide standard"))
    return "shipentegra-worldwide-standard";
  if (nameLower.includes("ups express")) return "shipentegra-ups-ekspress";
  if (nameLower.includes("ups standard") || nameLower.includes("ups standart"))
    return "shipentegra-ups-standart";
  if (nameLower.includes("widect")) return "shipentegra-widect";
  if (
    nameLower.includes("express") &&
    !nameLower.includes("ups") &&
    !nameLower.includes("international") &&
    !nameLower.includes("fedex")
  )
    return "shipentegra-express";
  if (
    nameLower.includes("eco") &&
    !nameLower.includes("amerika") &&
    !nameLower.includes("plus")
  )
    return "shipentegra-eco";

  // Legacy mapping for simplified service names
  if (nameLower.includes("economy")) return "shipentegra-eco";
  if (nameLower.includes("standard") || nameLower.includes("standart"))
    return "shipentegra-ups-standart";

  // Changed fallback from UPS to Express service
  return "shipentegra-express"; // Default fallback - removed UPS preference
}

/**
 * Check if a country is in the EU by its country code
 */
/**
 * Check if a country is in the EU by its country code
 * This function is case-insensitive to handle different formats of country codes
 */
export function isEUCountry(countryCode: string): boolean {
  // Handle undefined, null, or empty strings
  if (!countryCode) {
    return false;
  }

  // Convert to uppercase for case-insensitive comparison
  return EU_COUNTRY_CODES.includes(countryCode.toUpperCase());
}

/**
 * Checks if a country is one that requires HMRC numbers (UK and Sweden)
 * This function is case-insensitive to handle different formats of country codes
 */
export function isHMRCCountry(countryCode: string): boolean {
  // Handle undefined, null, or empty strings
  if (!countryCode) {
    return false;
  }

  // Convert to uppercase for case-insensitive comparison
  const upperCode = countryCode.toUpperCase();
  return upperCode === "GB" || upperCode === "SE";
}

function getCountryCode(countryNameOrCode: string): string {
  // Validate input
  if (!countryNameOrCode || typeof countryNameOrCode !== "string") {
    return "US"; // Default fallback
  }

  // If input is already a 2-letter code, verify it's valid and return it
  if (countryNameOrCode.length === 2) {
    // Check if it's a valid country code by looking through all values
    const validCodes = [
      "US",
      "CA",
      "GB",
      "DE",
      "FR",
      "IT",
      "ES",
      "AU",
      "JP",
      "CN",
      "BR",
      "MX",
      "IN",
      "RU",
      "KR",
      "NL",
      "BE",
      "CH",
      "AT",
      "SE",
      "NO",
      "DK",
      "FI",
      "IE",
      "PT",
      "GR",
      "PL",
      "CZ",
      "HU",
      "RO",
      "BG",
      "HR",
      "RS",
      "UA",
      "TR",
      "IL",
      "AE",
      "SA",
      "EG",
      "ZA",
      "NG",
      "KE",
      "SG",
      "MY",
      "TH",
      "ID",
      "PH",
      "VN",
      "NZ",
      "AR",
      "CL",
      "CO",
      "PE",
      "VE",
      "BH",
    ];
    if (validCodes.includes(countryNameOrCode.toUpperCase())) {
      return countryNameOrCode.toUpperCase();
    }
  }

  // Otherwise, look up the code from the country name
  const countryCodes: { [key: string]: string } = {
    "United States": "US",
    USA: "US",
    "United States of America": "US",
    Canada: "CA",
    "United Kingdom": "GB",
    UK: "GB",
    "Great Britain": "GB",
    Germany: "DE",
    France: "FR",
    Italy: "IT",
    Spain: "ES",
    Australia: "AU",
    Japan: "JP",
    China: "CN",
    Brazil: "BR",
    Mexico: "MX",
    India: "IN",
    Russia: "RU",
    "South Korea": "KR",
    Netherlands: "NL",
    Belgium: "BE",
    Switzerland: "CH",
    Austria: "AT",
    Sweden: "SE",
    Norway: "NO",
    Denmark: "DK",
    Finland: "FI",
    Ireland: "IE",
    Portugal: "PT",
    Greece: "GR",
    Poland: "PL",
    "Czech Republic": "CZ",
    Hungary: "HU",
    Romania: "RO",
    Bulgaria: "BG",
    Croatia: "HR",
    Serbia: "RS",
    Ukraine: "UA",
    Turkey: "TR",
    Israel: "IL",
    "United Arab Emirates": "AE",
    UAE: "AE",
    "Saudi Arabia": "SA",
    Egypt: "EG",
    "South Africa": "ZA",
    Nigeria: "NG",
    Kenya: "KE",
    Singapore: "SG",
    Malaysia: "MY",
    Thailand: "TH",
    Indonesia: "ID",
    Philippines: "PH",
    Vietnam: "VN",
    "New Zealand": "NZ",
    Argentina: "AR",
    Chile: "CL",
    Colombia: "CO",
    Peru: "PE",
    Venezuela: "VE",
    Bahrain: "BH",
  };

  return countryCodes[countryNameOrCode] || "US"; // Default to US if country code not found
}

/**
 * Map city/state information to 2-character state/province codes
 * This is required for ShipEntegra API for all addresses
 */
function getStateCode(city: string, country: string): string {
  // Always need to return a 2-character state code for all countries
  const countryCode = getCountryCode(country);

  // US state mapping
  const usStateCodes: { [key: string]: string } = {
    Alabama: "AL",
    Alaska: "AK",
    Arizona: "AZ",
    Arkansas: "AR",
    California: "CA",
    Colorado: "CO",
    Connecticut: "CT",
    Delaware: "DE",
    Florida: "FL",
    Georgia: "GA",
    Hawaii: "HI",
    Idaho: "ID",
    Illinois: "IL",
    Indiana: "IN",
    Iowa: "IA",
    Kansas: "KS",
    Kentucky: "KY",
    Louisiana: "LA",
    Maine: "ME",
    Maryland: "MD",
    Massachusetts: "MA",
    Michigan: "MI",
    Minnesota: "MN",
    Mississippi: "MS",
    Missouri: "MO",
    Montana: "MT",
    Nebraska: "NE",
    Nevada: "NV",
    "New Hampshire": "NH",
    "New Jersey": "NJ",
    "New Mexico": "NM",
    "New York": "NY",
    "North Carolina": "NC",
    "North Dakota": "ND",
    Ohio: "OH",
    Oklahoma: "OK",
    Oregon: "OR",
    Pennsylvania: "PA",
    "Rhode Island": "RI",
    "South Carolina": "SC",
    "South Dakota": "SD",
    Tennessee: "TN",
    Texas: "TX",
    Utah: "UT",
    Vermont: "VT",
    Virginia: "VA",
    Washington: "WA",
    "West Virginia": "WV",
    Wisconsin: "WI",
    Wyoming: "WY",
    "District of Columbia": "DC",
  };

  // Canadian province mapping
  const canadaProvinceCodes: { [key: string]: string } = {
    Alberta: "AB",
    "British Columbia": "BC",
    Manitoba: "MB",
    "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL",
    "Northwest Territories": "NT",
    "Nova Scotia": "NS",
    Nunavut: "NU",
    Ontario: "ON",
    "Prince Edward Island": "PE",
    Quebec: "QC",
    Saskatchewan: "SK",
    Yukon: "YT",
  };

  // Australian state mapping
  const australiaStateCodes: { [key: string]: string } = {
    "New South Wales": "NSW",
    Victoria: "VIC",
    Queensland: "QLD",
    "Western Australia": "WA",
    "South Australia": "SA",
    Tasmania: "TAS",
    "Northern Territory": "NT",
    "Australian Capital Territory": "ACT",
  };

  // Brazil state mapping
  const brazilStateCodes: { [key: string]: string } = {
    Acre: "AC",
    Alagoas: "AL",
    Amapá: "AP",
    Amazonas: "AM",
    Bahia: "BA",
    Ceará: "CE",
    "Distrito Federal": "DF",
    "Espírito Santo": "ES",
    Goiás: "GO",
    Maranhão: "MA",
    "Mato Grosso": "MT",
    "Mato Grosso do Sul": "MS",
    "Minas Gerais": "MG",
    Pará: "PA",
    Paraíba: "PB",
    Paraná: "PR",
    Pernambuco: "PE",
    Piauí: "PI",
    "Rio de Janeiro": "RJ",
    "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS",
    Rondônia: "RO",
    Roraima: "RR",
    "Santa Catarina": "SC",
    "São Paulo": "SP",
    Sergipe: "SE",
    Tocantins: "TO",
  };

  // India state mapping
  const indiaStateCodes: { [key: string]: string } = {
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    Assam: "AS",
    Bihar: "BR",
    Chhattisgarh: "CG",
    Goa: "GA",
    Gujarat: "GJ",
    Haryana: "HR",
    "Himachal Pradesh": "HP",
    Jharkhand: "JH",
    Karnataka: "KA",
    Kerala: "KL",
    "Madhya Pradesh": "MP",
    Maharashtra: "MH",
    Manipur: "MN",
    Meghalaya: "ML",
    Mizoram: "MZ",
    Nagaland: "NL",
    Odisha: "OR",
    Punjab: "PB",
    Rajasthan: "RJ",
    Sikkim: "SK",
    "Tamil Nadu": "TN",
    Telangana: "TG",
    Tripura: "TR",
    "Uttar Pradesh": "UP",
    Uttarakhand: "UK",
    "West Bengal": "WB",
    Delhi: "DL",
  };

  // Mexico state mapping
  const mexicoStateCodes: { [key: string]: string } = {
    Aguascalientes: "AGU",
    "Baja California": "BCN",
    "Baja California Sur": "BCS",
    Campeche: "CAM",
    Chiapas: "CHP",
    Chihuahua: "CHH",
    "Ciudad de México": "CMX",
    Coahuila: "COA",
    Colima: "COL",
    Durango: "DUR",
    Guanajuato: "GTO",
    Guerrero: "GRO",
    Hidalgo: "HID",
    Jalisco: "JAL",
    México: "MEX",
    Michoacán: "MIC",
    Morelos: "MOR",
    Nayarit: "NAY",
    "Nuevo León": "NLE",
    Oaxaca: "OAX",
    Puebla: "PUE",
    Querétaro: "QRO",
    "Quintana Roo": "ROO",
    "San Luis Potosí": "SLP",
    Sinaloa: "SIN",
    Sonora: "SON",
    Tabasco: "TAB",
    Tamaulipas: "TAM",
    Tlaxcala: "TLA",
    Veracruz: "VER",
    Yucatán: "YUC",
    Zacatecas: "ZAC",
  };

  // Map of cities to their state codes (for common cities)
  const cityToStateMap: { [key: string]: string } = {
    // US Major cities
    "New York": "NY",
    "Los Angeles": "CA",
    Chicago: "IL",
    Houston: "TX",
    Phoenix: "AZ",
    Philadelphia: "PA",
    "San Antonio": "TX",
    "San Diego": "CA",
    Dallas: "TX",
    "San Jose": "CA",
    Austin: "TX",
    Jacksonville: "FL",
    "Fort Worth": "TX",
    Columbus: "OH",
    Charlotte: "NC",
    "San Francisco": "CA",
    Indianapolis: "IN",
    Seattle: "WA",
    Denver: "CO",
    Boston: "MA",
    "Las Vegas": "NV",
    Miami: "FL",
    Atlanta: "GA",
    Detroit: "MI",
    Portland: "OR",
    Memphis: "TN",
    Louisville: "KY",
    Baltimore: "MD",
    Milwaukee: "WI",
    Albuquerque: "NM",
    Tucson: "AZ",
    Fresno: "CA",
    Sacramento: "CA",
    "Kansas City": "MO",
    "Colorado Springs": "CO",
    Omaha: "NE",
    Raleigh: "NC",
    Oakland: "CA",
    Minneapolis: "MN",
    Tulsa: "OK",
    Cleveland: "OH",
    Wichita: "KS",
    Arlington: "TX",
    "New Orleans": "LA",
    Bakersfield: "CA",
    Tampa: "FL",
    Honolulu: "HI",
    Orlando: "FL",
    Pittsburgh: "PA",
    Cincinnati: "OH",
    "St. Louis": "MO",
    Greensboro: "NC",
    Newark: "NJ",
    Toledo: "OH",
    Durham: "NC",
    Plano: "TX",
    Nashville: "TN",
    Buffalo: "NY",
    Lincoln: "NE",
    "Fort Wayne": "IN",
    "St. Paul": "MN",
    Granby: "CT", // From the error we saw in the logs
    Sylva: "NC", // Example from logs
  };

  // First check if we can directly match the city to a state for US
  if (countryCode === "US" && cityToStateMap[city]) {
    return cityToStateMap[city];
  }

  // Check for state/province mappings by country
  switch (countryCode) {
    case "US":
      return "NY"; // Default for US

    case "CA":
      // Try to match Canadian cities or provinces
      if (canadaProvinceCodes[city]) {
        return canadaProvinceCodes[city];
      }

      return "ON"; // Default for Canada

    case "AU":
      // Try to match Australian cities or states
      if (australiaStateCodes[city]) {
        return australiaStateCodes[city];
      }
      // Common Australian city mappings
      const australianCities: { [key: string]: string } = {
        Sydney: "NSW",
        Melbourne: "VIC",
        Brisbane: "QLD",
        Perth: "WA",
        Adelaide: "SA",
        Hobart: "TAS",
        Darwin: "NT",
        Canberra: "ACT",
      };
      if (australianCities[city]) {
        return australianCities[city];
      }

      return "NSW"; // Default for Australia

    case "BR":
      // Try to match Brazilian cities or states
      if (brazilStateCodes[city]) {
        return brazilStateCodes[city];
      }
      // Common Brazilian city mappings
      const brazilianCities: { [key: string]: string } = {
        "São Paulo": "SP",
        "Rio de Janeiro": "RJ",
        Brasília: "DF",
        Salvador: "BA",
        Fortaleza: "CE",
        "Belo Horizonte": "MG",
        Manaus: "AM",
        Curitiba: "PR",
        Recife: "PE",
        "Porto Alegre": "RS",
      };
      if (brazilianCities[city]) {
        return brazilianCities[city];
      }

      return "SP"; // Default for Brazil

    case "IN":
      // Try to match Indian cities or states
      if (indiaStateCodes[city]) {
        return indiaStateCodes[city];
      }
      // Common Indian city mappings
      const indianCities: { [key: string]: string } = {
        Mumbai: "MH",
        Delhi: "DL",
        Bangalore: "KA",
        Bengaluru: "KA",
        Hyderabad: "TG",
        Chennai: "TN",
        Kolkata: "WB",
        Pune: "MH",
        Ahmedabad: "GJ",
        Jaipur: "RJ",
        Surat: "GJ",
        Lucknow: "UP",
        Kanpur: "UP",
        Nagpur: "MH",
        Indore: "MP",
        Thane: "MH",
        Bhopal: "MP",
        Visakhapatnam: "AP",
        Pimpri: "MH",
        Patna: "BR",
      };
      if (indianCities[city]) {
        return indianCities[city];
      }

      return "DL"; // Default for India

    case "MX":
      // Try to match Mexican cities or states
      if (mexicoStateCodes[city]) {
        return mexicoStateCodes[city];
      }
      // Common Mexican city mappings
      const mexicanCities: { [key: string]: string } = {
        "Mexico City": "CMX",
        "Ciudad de México": "CMX",
        Guadalajara: "JAL",
        Monterrey: "NLE",
        Puebla: "PUE",
        Tijuana: "BCN",
        León: "GTO",
        Juárez: "CHH",
        Torreón: "COA",
        Querétaro: "QRO",
        "San Luis Potosí": "SLP",
        Mérida: "YUC",
        Mexicali: "BCN",
        Aguascalientes: "AGU",
        Acapulco: "GRO",
        Cuernavaca: "MOR",
      };
      if (mexicanCities[city]) {
        return mexicanCities[city];
      }
      // Security: Removed Mexican state code warning debug logging
      return "CMX"; // Default for Mexico

    default:
      // For countries without state/province systems or countries we don't have mappings for
      return "XX";
  }
}

/**
 * Send shipment data to ShipEntegra for processing
 * @param shipments Array of shipment data to send
 * @returns Response with success/failure status and shipment IDs
 */
export async function sendToShipEntegra(
  shipments: ShipEntegraSubmitData[],
): Promise<SendToShipEntegraResponse> {
  // Security: Removed service start debug logging

  // CRITICAL FIX: Separate AFS, Aramex, and ShipEntegra shipments BEFORE processing
  const afsShipments = shipments.filter((shipment) => {
    const service =
      shipment.selectedService || shipment.providerServiceCode || "";
    const serviceLower = service.toLowerCase();
    const isAFSService =
      service.startsWith("afs-") ||
      serviceLower.includes("ecoafs") ||
      serviceLower === "ecoafs" ||
      serviceLower.includes("gls");
    
    // Security: Removed service routing debug logging
    return isAFSService;
  });

  const aramexShipments = shipments.filter((shipment) => {
    const service =
      shipment.selectedService || shipment.providerServiceCode || "";
    const serviceLower = service.toLowerCase();
    const isAramexService =
      service.startsWith("aramex-") ||
      serviceLower.includes("aramex") ||
      serviceLower === "aramex";
    console.log(`🔍 ARAMEX FILTER: Shipment ${shipment.id} - Service: "${service}" - IsAramex: ${isAramexService}`);
    return isAramexService;
  });

  const shipentegraShipments = shipments.filter((shipment) => {
    const service =
      shipment.selectedService || shipment.providerServiceCode || "";
    const serviceLower = service.toLowerCase();
    const isAFSService =
      service.startsWith("afs-") ||
      serviceLower.includes("ecoafs") ||
      serviceLower === "ecoafs" ||
      serviceLower.includes("gls");
    const isAramexService =
      service.startsWith("aramex-") ||
      serviceLower.includes("aramex") ||
      serviceLower === "aramex";
    return !isAFSService && !isAramexService;
  });

  // Security: Removed shipment count debug logging

  // Process AFS shipments separately
  let afsResults: any = {
    successfulShipmentIds: [],
    failedShipmentIds: [],
    trackingNumbers: {},
    carrierTrackingNumbers: {},
    labelUrls: {},
    labelPdfs: {},
    carrierLabelUrls: {},
    carrierLabelPdfs: {},
    shipmentErrors: {},
  };

  if (afsShipments.length > 0) {
    // Security: Removed AFS routing debug logging
    try {
      const { processAFSShipments } = await import("./afstransport");
      afsResults = await processAFSShipments(afsShipments);
      // Security: Removed AFS completion debug logging
    } catch (error) {
      // Security: Removed AFS error debug logging
      afsResults.failedShipmentIds = afsShipments.map((s) => s.id);
      afsShipments.forEach((s) => {
        afsResults.shipmentErrors[s.id] =
          `AFS Transport processing failed: ${error}`;
      });
    }
  }

  // Process Aramex shipments separately
  let aramexResults: any = {
    successfulShipmentIds: [],
    failedShipmentIds: [],
    trackingNumbers: {},
    carrierTrackingNumbers: {},
    labelUrls: {},
    labelPdfs: {},
    carrierLabelUrls: {},
    carrierLabelPdfs: {},
    shipmentErrors: {},
  };

  if (aramexShipments.length > 0) {
    console.log(`🚀 ARAMEX ROUTING: Processing ${aramexShipments.length} Aramex shipments`);
    try {
      const { processAramexShipments } = await import("./aramex");
      aramexResults = await processAramexShipments(aramexShipments);
      console.log(`✅ ARAMEX ROUTING: Completed processing ${aramexResults.successfulShipmentIds.length} successful Aramex shipments`);
    } catch (error) {
      console.error(`❌ ARAMEX ROUTING ERROR:`, error);
      aramexResults.failedShipmentIds = aramexShipments.map((s) => s.id);
      aramexShipments.forEach((s) => {
        aramexResults.shipmentErrors[s.id] =
          `Aramex processing failed: ${error}`;
      });
    }
  }

  // If all shipments were AFS or Aramex (no ShipEntegra), return combined results
  if (shipentegraShipments.length === 0) {
    const totalSuccessful = afsResults.successfulShipmentIds.length + aramexResults.successfulShipmentIds.length;
    const totalFailed = afsResults.failedShipmentIds.length + aramexResults.failedShipmentIds.length;
    
    console.log(`📊 NON-SHIPENTEGRA RESULTS: AFS: ${afsResults.successfulShipmentIds.length} successful, Aramex: ${aramexResults.successfulShipmentIds.length} successful`);
    
    return {
      success: totalSuccessful > 0,
      message:
        totalSuccessful > 0
          ? `Successfully processed ${afsResults.successfulShipmentIds.length} AFS and ${aramexResults.successfulShipmentIds.length} Aramex shipments`
          : `Failed to process non-ShipEntegra shipments`,
      shipmentIds: [...afsResults.successfulShipmentIds, ...aramexResults.successfulShipmentIds],
      failedShipmentIds: [...afsResults.failedShipmentIds, ...aramexResults.failedShipmentIds],
      trackingNumbers: { ...afsResults.trackingNumbers, ...aramexResults.trackingNumbers },
      carrierTrackingNumbers: { ...afsResults.carrierTrackingNumbers, ...aramexResults.carrierTrackingNumbers },
      labelUrls: { ...afsResults.labelUrls, ...aramexResults.labelUrls },
      labelPdfs: { ...afsResults.labelPdfs, ...aramexResults.labelPdfs },
      carrierLabelUrls: { ...afsResults.carrierLabelUrls, ...aramexResults.carrierLabelUrls },
      carrierLabelPdfs: { ...afsResults.carrierLabelPdfs, ...aramexResults.carrierLabelPdfs },
      shipmentErrors: { ...afsResults.shipmentErrors, ...aramexResults.shipmentErrors },
    };
  }

  // Continue with ShipEntegra processing for remaining shipments
  // Security: Removed ShipEntegra shipment count debug logging
  shipments = shipentegraShipments; // Replace shipments array with ShipEntegra-only shipments

  // Initialize tracking info early
  let trackingNumbers: { [key: number]: string } = {}; // Moogship's internal tracking numbers
  let carrierTrackingNumbers: { [key: number]: string } = {}; // ShipEntegra/carrier tracking numbers
  let labelUrls: { [key: number]: string } = {};
  let labelPdfs: { [key: number]: string } = {}; // Store PDF data for each shipment
  let carrierLabelUrls: { [key: number]: string } = {}; // Store carrier label URLs
  let carrierLabelPdfs: { [key: number]: string } = {}; // Store carrier label PDFs
  let shipmentErrors: { [key: number]: string } = {}; // Store detailed error messages by shipment ID

  if (!shipments || shipments.length === 0) {
    // Merge AFS results with empty ShipEntegra results
    return {
      success: afsResults.successfulShipmentIds.length > 0,
      message:
        afsResults.successfulShipmentIds.length > 0
          ? `Successfully processed ${afsResults.successfulShipmentIds.length} AFS shipments`
          : `No shipments to process`,
      shipmentIds: afsResults.successfulShipmentIds,
      failedShipmentIds: afsResults.failedShipmentIds,
      trackingNumbers: afsResults.trackingNumbers,
      carrierTrackingNumbers: afsResults.carrierTrackingNumbers,
      labelUrls: afsResults.labelUrls,
      labelPdfs: afsResults.labelPdfs,
      carrierLabelUrls: afsResults.carrierLabelUrls,
      carrierLabelPdfs: afsResults.carrierLabelPdfs,
      shipmentErrors: afsResults.shipmentErrors,
    };
  }

  // Make sure all shipments are in APPROVED status
  const nonApprovedShipments = shipments.filter(
    (s) => s.status !== ShipmentStatus.APPROVED,
  );
  if (nonApprovedShipments.length > 0) {
    // Filter out non-approved shipments
    const approvedShipments = shipments.filter(
      (s) => s.status === ShipmentStatus.APPROVED,
    );
    if (approvedShipments.length === 0) {
      return {
        success: false,
        message: "No approved shipments to send",
        shipmentIds: [],
        failedShipmentIds: nonApprovedShipments.map((s) => s.id),
        trackingNumbers: {},
        carrierTrackingNumbers: {},
        labelUrls: {},
      };
    }
  }

  try {
    // Get access token
    const accessToken = await getShipentegraAccessToken();
    if (!accessToken) {
      return {
        success: false,
        message:
          "Failed to authenticate with ShipEntegra API. Please check API credentials.",
        shipmentIds: [],
        failedShipmentIds: shipments.map((s) => s.id),
        trackingNumbers: {},
        carrierTrackingNumbers: {},
        labelUrls: {}, // No changes to MoogShip label URLs
        labelPdfs: {}, // No changes to MoogShip label PDFs
        carrierLabelUrls: {}, // Include empty carrier label URLs
        carrierLabelPdfs: {}, // Include empty carrier label PDFs
      };
    }

    // Set up API headers
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    // Track successful and failed shipments
    const successfulShipmentIds: number[] = [];
    const failedShipmentIds: number[] = [];

    // Process each shipment separately
    for (const shipment of shipments) {
      // Only process approved shipments
      if (shipment.status !== ShipmentStatus.APPROVED) {
        failedShipmentIds.push(shipment.id);
        continue;
      }

      try {
        // Get the service code for ShipEntegra carrier
        let serviceType = getServiceCodeForLabel(shipment);

        // Check if the service is supported for the destination country
        const destinationCountry = normalizeCountryCode(
          shipment.receiverCountry,
        );
        if (!isServiceSupportedForCountry(serviceType, destinationCountry)) {
          console.log(
            `⚠️ Service ${serviceType} not supported for country ${destinationCountry}, using alternative service`,
          );
          serviceType = getAlternativeService(serviceType, destinationCountry);
          console.log(`✅ Using alternative service: ${serviceType}`);
        }

        // Make sure all dimensions and weight are numbers
        const packageLength = Number(shipment.packageLength);
        const packageWidth = Number(shipment.packageWidth);
        const packageHeight = Number(shipment.packageHeight);
        const packageWeight = Number(shipment.packageWeight);

        // Calculate volumetric weight
        const volumetricWeight =
          (packageLength * packageWidth * packageHeight) / DIMENSIONAL_FACTOR;

        // Use the greater of actual weight or volumetric weight
        const finalWeight = Math.max(packageWeight, volumetricWeight);

        // Ensure minimum weight requirement is met
        const chargeableWeight = finalWeight < 0.01 ? 0.5 : finalWeight;

        // Normalize the country code to ensure consistency
        let destinationCountryCode = normalizeCountryCode(
          shipment.receiverCountry,
        );

        // Normalize the state code based on the country
        const stateCode = normalizeStateCode(
          destinationCountryCode,
          shipment.receiverState,
        );

        // Modify tracking number for retry attempts by appending -counter
        let trackingNumberForShipment = shipment.trackingNumber;

        // Fixed logic to ensure labelAttempts is properly checked
        if (shipment.labelAttempts && shipment.labelAttempts > 0) {
          // Force convert to number if it's a string or similar
          const attemptCounter = Number(shipment.labelAttempts);
          trackingNumberForShipment = `${shipment.trackingNumber}-${attemptCounter}`;
        }

        // Define the package item interface that corresponds to our database schema
        interface PackageItemType {
          id: number;
          shipmentId: number;
          name: string;
          description: string | null;
          quantity: number;
          price: number;
          gtin: string | null;
          hsCode: string | null;
          weight: number | null;
          length: number | null;
          width: number | null;
          height: number | null;
          countryOfOrigin: string | null;
          manufacturer: string | null;
          sku?: string; // May or may not be present in the DB
          createdAt: Date | null;
          updatedAt: Date | null;
        }

        // Get package items for this shipment
        let packageItems: PackageItemType[] = [];
        try {
          // Use db directly to fetch package items
          const { packageItems: packageItemsTable } = await import(
            "@shared/schema"
          );
          const { eq, asc } = await import("drizzle-orm");

          // Fetch the package items directly from the database
          packageItems = await db
            .select()
            .from(packageItemsTable)
            .where(eq(packageItemsTable.shipmentId, shipment.id))
            .orderBy(asc(packageItemsTable.id));
        } catch (error) {
          // Continue with empty items array
        }

        // Get current user profile data for shipFrom address
        let userProfile: any = null;
        try {
          const { users } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");

          // Fetch user profile data
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.id, Number(shipment.userId)))
            .limit(1);

          if (userResult.length > 0) {
            userProfile = userResult[0];
          }
        } catch (error) {
          console.warn(
            `Failed to fetch user profile for shipment ${shipment.id}:`,
            error,
          );
        }

        // Define the payload interface with proper typing
        interface ShipentegraOrderPayload {
          number: string;
          packageQuantity: number;
          reference1: string;
          description: string;
          currency: string;
          weight: number;
          width: number;
          height: number;
          length: number;
          iossNumber?: string; // IOSS number for EU shipments
          shipFrom?: {
            // Add shipFrom field for sender address
            name: string;
            address1: string; // Full concatenated address
            city: string;
            country: string; // Added missing country field
            zipCode: string;
            phone: string;
            email?: string; // Added email for sender
          };
          shippingAddress: {
            name: string;
            address1: string;
            address2?: string;
            city: string;
            country: string;
            state: string;
            postalCode: string;
            phone: string;
            email: string;
          };
          items: ShipentegraOrderItem[];
        }

        // Prepare payload for this shipment using the recommended format
        const payload: ShipentegraOrderPayload = {
          number: trackingNumberForShipment, // Use modified tracking number for retries
          packageQuantity: shipment.pieceCount || shipment.piece_count || 1, // Use piece_count from database with fallback
          reference1: shipment.trackingNumber, // Use MG tracking ID as reference1 as requested
          description: (
            shipment.packageContents ||
            shipment.description ||
            `Package - ${shipment.id}`
          ).substring(0, 50), // Truncate to 50 characters maximum as required by ShipEntegra API
           currency: shipment.currency || "USD", // Use user-selected customs currency or fallback to USD
          weight: packageWeight, // Use exact weight value without rounding
          width: Math.ceil(packageWidth), // Round up width using the numeric value
          height: Math.ceil(packageHeight), // Round up height using the numeric value
          length: Math.ceil(packageLength), // Round up length using the numeric value
          shipFrom: {
            name: userProfile?.name || shipment.senderName,
            address1: (() => {
              // Use current user profile address instead of shipment sender address
              let rawAddress = "";

              // Priority 1: Use current user's address from profile
              if (userProfile?.address && userProfile.address.trim()) {
                rawAddress = userProfile.address.trim();
              }
              // Fallback: Use shipment sender address if user profile has no address
              else if (
                shipment.senderAddress &&
                shipment.senderAddress.trim()
              ) {
                rawAddress = shipment.senderAddress.trim();
              }
              // Priority 2: Combine senderAddress1 and senderAddress2 from shipment
              else if (shipment.senderAddress1 || shipment.senderAddress2) {
                rawAddress = [shipment.senderAddress1, shipment.senderAddress2]
                  .filter(Boolean)
                  .join(" ")
                  .trim();
              }

              // Apply address formatting (colon to dot conversion)
              const formattedAddress = formatAddressForAPI(rawAddress);

              // Clean and format the address (preserve important address details like No:)
              const cleanedAddress = formattedAddress
                .replace(/\s+/g, " ") // Normalize multiple spaces to single space
                .trim()
                .substring(0, 35); // Limit to 35 characters maximum

              // Only add fallback if user has no address at all and we need minimum 5 chars for API
              if (cleanedAddress.length < 5) {
                console.warn(
                  `⚠️ User has no address in profile (${cleanedAddress.length} chars). Shipment ID: ${shipment.id}`,
                );
                // Return the user's city if available, otherwise minimal fallback
                const fallbackCity =
                  userProfile?.city || shipment.senderCity || "";
                return fallbackCity && fallbackCity.trim().length >= 5
                  ? fallbackCity.trim().substring(0, 35)
                  : "Address Required";
              }

              console.log(
                `✅ Using user profile address (${cleanedAddress.length} chars): "${cleanedAddress}"`,
              );
              return cleanedAddress;
            })(),
            city: formatCityForAPI(
              userProfile?.city || shipment.senderCity || "",
            ),
            country: "TR", // Add Turkey country code for sender address
            zipCode:
              userProfile?.postal_code || shipment.senderPostalCode || "",
            phone: "905407447911", // Always use this fixed phone number as requested
            email: "info@moogship.com", // Always use this fixed email as requested
          },
          shippingAddress: buildShippingAddress(shipment, stateCode),
          items: [],
        };

        // Debug the final payload weight value
        console.log(`  Final order payload weight: ${payload.weight}`);
        console.log(
          `  Full payload for order creation:`,
          JSON.stringify(payload, null, 2),
        );

        // Add IOSS number if this is an EU shipment and IOSS number is provided
        console.log(
          `Checking IOSS conditions: Is ${destinationCountryCode} an EU country? ${isEUCountry(destinationCountryCode)}`,
        );
        console.log(
          `IOSS number provided? ${Boolean(shipment.iossNumber)}, Value: ${shipment.iossNumber}`,
        );

        if (isEUCountry(destinationCountryCode) && shipment.iossNumber) {
          console.log(
            `Adding IOSS number ${shipment.iossNumber} for EU shipment to ${destinationCountryCode}`,
          );
          payload.iossNumber = shipment.iossNumber;
        } else {
          console.log(
            `Not adding IOSS number. EU country: ${isEUCountry(destinationCountryCode)}, IOSS number: ${shipment.iossNumber || "not provided"}`,
          );
        }

        // Define the items array for the payload
        interface ShipentegraOrderItem {
          name: string;
          quantity: number;
          unitPrice: number;
          sku: string;
          gtip: number;
        }

        const itemsArray: ShipentegraOrderItem[] = [];

        // If we have package items, use them for the items array
        if (packageItems && packageItems.length > 0) {
          // Map package items to the items array format expected by ShipEntegra
          packageItems.forEach((item) => {
            // Get hsCode from either hsCode or gtin field
            const hsCodeValue = item.hsCode || item.gtin || null;
            let gtipCode = 940510; // Default GTIP code for postal packages

            // Try to convert hsCode to integer if it exists
            if (hsCodeValue) {
              try {
                // Remove any non-numeric characters and convert to integer
                const cleanHsCode = hsCodeValue.toString().replace(/\D/g, "");
                if (cleanHsCode) {
                  gtipCode = parseInt(cleanHsCode, 10);
                }
              } catch (error) {}
            }

            // Validate and format item name (min 1, max 100 characters)
            let itemName = item.name || `Item - ${item.id}`;
            if (itemName.length < 1) {
              itemName = `Item - ${item.id}`;
            } else if (itemName.length > 100) {
              itemName = itemName.substring(0, 100);
              console.warn(`Item name truncated to 100 characters for shipment ${shipment.id}, item ${item.id}`);
            }

            // Add the item to the array
            itemsArray.push({
              name: itemName,
              quantity: item.quantity || 1, // Use individual item quantity
              unitPrice: item.price ? item.price / 100 : 50.0, // Convert cents to dollars
              sku: item.sku || `SKU-${shipment.id}-${item.id}`,
              gtip: gtipCode,
            });
          });
        } else {
          // Fallback to a single generic item using shipment's customs data
          let gtipCode = 940510; // Default GTIP code for postal packages

          // Use the actual GTIP code from the shipment database if available
          if (shipment.gtip) {
            try {
              // Clean and convert GTIP from database to integer
              const cleanGtip = shipment.gtip.toString().replace(/\D/g, "");
              if (cleanGtip) {
                gtipCode = parseInt(cleanGtip, 10);
              }
            } catch (error) {
              console.warn(
                `Failed to parse GTIP code "${shipment.gtip}", using default`,
              );
            }
          }

          // Validate and format item name (min 1, max 100 characters)
          let itemName = shipment.packageContents ||
            shipment.description ||
            `Package Item - ${shipment.id}`;
          if (itemName.length < 1) {
            itemName = `Package Item - ${shipment.id}`;
          } else if (itemName.length > 100) {
            itemName = itemName.substring(0, 100);
            console.warn(`Item name truncated to 100 characters for shipment ${shipment.id}`);
          }

          itemsArray.push({
            name: itemName,
            quantity: shipment.customsItemCount || 1,
            // Use the actual customs value from the shipment data, convert from cents to dollars
            unitPrice: shipment.customsValue
              ? shipment.customsValue / 100
              : shipment.totalPrice
                ? shipment.totalPrice / 100
                : 50.0,
            sku: `SKU-${shipment.id}`,
            gtip: gtipCode, // Use actual GTIP from database or default
          });
        }

        // Assign the items array to the payload
        payload.items = itemsArray;

        // Simplified matching Google Apps Script implementation
        const response = await fetch(SHIPENTEGRA_CREATE_ORDER_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();

          // Try to parse the error text to get more detailed information
          let detailedErrorMessage = `Failed to purchase label from ShipEntegra (${response.status})`;
          try {
            const errorJson = JSON.parse(errorText);
            // Check if this is a ShipEntegra detailed error format
            if (
              errorJson.status === "fail" &&
              errorJson.data &&
              Array.isArray(errorJson.data)
            ) {
              // Extract the detailed description if available
              const errorDetails = errorJson.data
                .map((err: any) => err.description || err.message || null)
                .filter(Boolean)
                .join("; ");

              if (errorDetails) {
                detailedErrorMessage = errorDetails;
              }
            }
          } catch (parseError) {
            // If we can't parse the error as JSON, just use the raw error text
          }

          // Store the shipment ID with its detailed error message for later processing
          failedShipmentIds.push(shipment.id);

          // Store the error message in a shipment-specific map to be returned
          shipmentErrors[shipment.id] = detailedErrorMessage;

          continue;
        }

        const responseData =
          (await response.json()) as ShipentegraOrderResponse;

        // Check if the response indicates success
        if (responseData.status === "success" && responseData.data.orderId) {
          // Now we need to generate a label for this order using our conditional routing system
          try {
            // Call our conditional label generation system
            const labelResult = await processLabel(
              responseData.data.orderId,
              shipment,
              accessToken,
            );

            if (labelResult.success) {
              console.log(`\n🎯 === SHIPENTEGRA LABEL SUCCESS FOR SHIPMENT ${shipment.id} ===`);
              console.log(`✅ [SHIPENTEGRA LABEL] Label created successfully for shipment ${shipment.id}`);
              console.log(`📋 [SHIPENTEGRA DEBUG] Label result details:`, JSON.stringify(labelResult, null, 2));
              
              // Update tracking info in response
              successfulShipmentIds.push(shipment.id);
              trackingNumbers[shipment.id] = shipment.trackingNumber; // Store Moogship internal tracking number
              console.log(`📝 Stored Moogship tracking number: ${shipment.trackingNumber}`);

              if (labelResult.trackingNumber) {
                carrierTrackingNumbers[shipment.id] = labelResult.trackingNumber; // Store carrier tracking number
                console.log(`🚛 CARRIER TRACKING STORED: ${labelResult.trackingNumber}`);
                console.log(`🧪 CARRIER DETECTION PREVIEW: Testing patterns for ${labelResult.trackingNumber}`);
                console.log(`   - UPS Pattern (^1Z[A-Z0-9]{16}$): ${/^1Z[A-Z0-9]{16}$/i.test(labelResult.trackingNumber)}`);
                console.log(`   - DHL Pattern (^\\d{10,30}$ && length >= 20): ${/^\d{10,30}$/.test(labelResult.trackingNumber) && labelResult.trackingNumber.length >= 20}`);
                console.log(`   - FedEx Pattern (^\\d{12}$): ${/^\d{12}$/.test(labelResult.trackingNumber)}`);
              } else {
                console.log(`❌ [CARRIER TRACKING] No carrier tracking number in label result`);
              }

              if (labelResult.carrierLabelUrl) {
                // For Shipentegra services, the label is actually a carrier label
                carrierLabelUrls[shipment.id] = labelResult.carrierLabelUrl;
                console.log(`🔗 CARRIER LABEL URL STORED: ${labelResult.carrierLabelUrl}`);
              } else {
                console.log(`❌ [CARRIER LABEL URL] No carrier label URL in result`);
              }

              if (labelResult.carrierLabelPdf) {
                console.log(`📄 [SHIPENTEGRA PDF] Carrier label PDF found, size: ${labelResult.carrierLabelPdf.length} characters`);
                console.log(`📄 [SHIPENTEGRA PDF] PDF preview: ${labelResult.carrierLabelPdf.substring(0, 50)}...`);
                
                // For Shipentegra services, the label PDF is actually a carrier label PDF
                carrierLabelPdfs[shipment.id] = labelResult.carrierLabelPdf;
                console.log(`✅ CARRIER LABEL PDF STORED: ${labelResult.carrierLabelPdf.length} characters`);
              } else {
                console.log(`❌ [SHIPENTEGRA PDF] No carrier label PDF found in result`);
                console.log(`🔍 [SHIPENTEGRA PDF] Available keys in result: ${Object.keys(labelResult)}`);
              }
              
              console.log(`📊 FINAL STORAGE SUMMARY FOR SHIPMENT ${shipment.id}:`);
              console.log(`   - Moogship Tracking: ${trackingNumbers[shipment.id] || 'NOT SET'}`);
              console.log(`   - Carrier Tracking: ${carrierTrackingNumbers[shipment.id] || 'NOT SET'}`);
              console.log(`   - Carrier Label URL: ${carrierLabelUrls[shipment.id] ? 'SET' : 'NOT SET'}`);
              console.log(`   - Carrier Label PDF: ${carrierLabelPdfs[shipment.id] ? `SET (${carrierLabelPdfs[shipment.id].length} chars)` : 'NOT SET'}`);
              console.log(`🎯 === END SHIPENTEGRA SUCCESS PROCESSING ===\n`);
              
            } else {
              // Check for duplicate order errors
              if (labelResult.duplicateOrderError) {
                shipmentErrors[shipment.id] =
                  `Duplicate order: ${labelResult.message}`;
              } else {
                shipmentErrors[shipment.id] =
                  labelResult.message || "Unknown label generation error";
              }

              failedShipmentIds.push(shipment.id);
              continue;
            }
          } catch (labelError) {
            // Still mark as success because the order was created
            successfulShipmentIds.push(shipment.id);
          }
        } else {
          // Extract detailed error information
          let errorMessage = responseData.message || "Unknown error";

          // Check for specific error conditions
          if (
            errorMessage.includes("IOSS") &&
            errorMessage.includes("required")
          ) {
            const destinationCountryCode = getCountryCode(
              shipment.receiverCountry,
            );
            const isHmrcCountry = isHMRCCountry(destinationCountryCode);

            if (isHmrcCountry) {
              const countryName =
                destinationCountryCode === "GB" ? "UK" : "Sweden";
              errorMessage = `HMRC number is required for ${countryName} shipments. Please add an HMRC number and try again.`;
            } else {
              errorMessage =
                "IOSS number is required for European shipments under 150 EUR. Please add an IOSS number and try again.";
            }
          }
          
          // Check for insufficient balance errors
          if (errorMessage.includes("cargo balance is not enough") || 
              errorMessage.includes("insufficient balance") ||
              errorMessage.includes("balance is not enough")) {
            errorMessage = "Your cargo balance is not enough to create label.";
          }

          // Add to failed shipments and store the error message
          failedShipmentIds.push(shipment.id);
          shipmentErrors[shipment.id] = errorMessage;
        }
      } catch (error) {
        // Create a detailed error message
        let errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Add to failed shipments and store the error message
        failedShipmentIds.push(shipment.id);
        shipmentErrors[shipment.id] = errorMessage;
      }
    }

    // Merge AFS, Aramex, and ShipEntegra results
    const mergedSuccessfulIds = [
      ...afsResults.successfulShipmentIds,
      ...aramexResults.successfulShipmentIds,
      ...successfulShipmentIds,
    ];
    const mergedFailedIds = [
      ...afsResults.failedShipmentIds,
      ...aramexResults.failedShipmentIds,
      ...failedShipmentIds,
    ];
    const mergedTrackingNumbers = {
      ...afsResults.trackingNumbers,
      ...aramexResults.trackingNumbers,
      ...trackingNumbers,
    };
    const mergedCarrierTrackingNumbers = {
      ...afsResults.carrierTrackingNumbers,
      ...aramexResults.carrierTrackingNumbers,
      ...carrierTrackingNumbers,
    };
    const mergedLabelUrls = { 
      ...afsResults.labelUrls, 
      ...aramexResults.labelUrls,
      ...labelUrls 
    };
    const mergedLabelPdfs = { 
      ...afsResults.labelPdfs,
      ...aramexResults.labelPdfs,
      ...labelPdfs 
    };
    const mergedCarrierLabelUrls = { 
      ...afsResults.carrierLabelUrls,
      ...aramexResults.carrierLabelUrls,
      ...carrierLabelUrls 
    };
    const mergedCarrierLabelPdfs = { 
      ...afsResults.carrierLabelPdfs,
      ...aramexResults.carrierLabelPdfs,
      ...carrierLabelPdfs 
    };
    const mergedShipmentErrors = {
      ...afsResults.shipmentErrors,
      ...aramexResults.shipmentErrors,
      ...shipmentErrors,
    };

    console.log(
      `📊 [FINAL RESULTS] Total successful: ${mergedSuccessfulIds.length}, Total failed: ${mergedFailedIds.length}`,
    );

    // Return merged results
    if (mergedSuccessfulIds.length === 0) {
      return {
        success: false,
        message: `Failed to process all shipments`,
        shipmentIds: [],
        failedShipmentIds: mergedFailedIds,
        trackingNumbers: mergedTrackingNumbers,
        carrierTrackingNumbers: mergedCarrierTrackingNumbers,
        labelUrls: mergedLabelUrls,
        labelPdfs: mergedLabelPdfs,
        carrierLabelUrls: mergedCarrierLabelUrls,
        carrierLabelPdfs: mergedCarrierLabelPdfs,
        shipmentErrors: mergedShipmentErrors,
      };
    } else if (mergedFailedIds.length === 0) {
      return {
        success: true,
        message: `Successfully processed all shipments`,
        shipmentIds: mergedSuccessfulIds,
        trackingNumbers: mergedTrackingNumbers,
        carrierTrackingNumbers: mergedCarrierTrackingNumbers,
        labelUrls: mergedLabelUrls,
        labelPdfs: mergedLabelPdfs,
        carrierLabelUrls: mergedCarrierLabelUrls,
        carrierLabelPdfs: mergedCarrierLabelPdfs,
      };
    } else {
      return {
        success: true,
        message: `Successfully processed ${mergedSuccessfulIds.length} out of ${mergedSuccessfulIds.length + mergedFailedIds.length} shipments`,
        shipmentIds: mergedSuccessfulIds,
        failedShipmentIds: mergedFailedIds,
        trackingNumbers: mergedTrackingNumbers,
        carrierTrackingNumbers: mergedCarrierTrackingNumbers,
        labelUrls: mergedLabelUrls,
        labelPdfs: mergedLabelPdfs,
        carrierLabelUrls: mergedCarrierLabelUrls,
        carrierLabelPdfs: mergedCarrierLabelPdfs,
        shipmentErrors: mergedShipmentErrors,
      };
    }
  } catch (error) {
    // Create a generic error message for all shipments in this case
    const genericErrorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const shipmentErrorMap: { [key: number]: string } = {};

    // Add the error message to each shipment ID
    shipments.forEach((s) => {
      shipmentErrorMap[s.id] = genericErrorMessage;
    });

    return {
      success: false,
      message: `Error: ${genericErrorMessage}`,
      shipmentIds: [],
      failedShipmentIds: shipments.map((s) => s.id),
      trackingNumbers: {},
      carrierTrackingNumbers: {},
      labelUrls: {}, // No changes to MoogShip label URLs
      labelPdfs: {}, // No changes to MoogShip label PDFs
      carrierLabelUrls: {}, // Include empty carrier label URLs
      carrierLabelPdfs: {}, // Include empty carrier label PDFs
      shipmentErrors: shipmentErrorMap,
    };
  }
}

/**
 * Creates a ShipEntegra order and generates a shipping label
 * Based on the Google Apps Script implementation provided by the user's attachment
 */
export async function createShipentegraOrderAndLabel(
  shipment: ShipEntegraSubmitData,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  labelUrl?: string; // This is the carrier label URL
  labelPdf?: string | null; // This is the carrier label PDF (Base64 encoded)
  duplicateOrderError?: boolean; // Flag for duplicate order number errors
}> {
  try {
    // Get access token
    const accessToken = await getShipentegraAccessToken();
    if (!accessToken) {
      console.error("Failed to get ShipEntegra access token");
      return {
        success: false,
        message: "Authentication failed. Please check your API credentials.",
      };
    }

    // Modify order number for retry attempts to make it unique
    let baseOrderNumber = shipment.orderNumber || `ORDER-${shipment.id}`;

    // Create a truly unique order number by adding both the attempt number AND a timestamp
    const attemptNumber = shipment.labelAttempts || 0;
    const timestamp = Date.now(); // Add current timestamp for uniqueness
    const orderNumber = `${baseOrderNumber}${attemptNumber}-${timestamp}`;

    console.log(
      `Using NEW UNIQUE order number for shipment ${shipment.id}: ${orderNumber}`,
    );

    // Use customs values if available, otherwise default values
    const quantity = shipment.customsItemCount || 1;
    const unitPrice = shipment.customsValue
      ? Number(shipment.customsValue) / 100
      : 50.0; // Convert cents to dollars

    // Log the customs values being used
    console.log(
      `Using customs values - Item count: ${quantity}, Value: $${unitPrice.toFixed(2)}`,
    );

    // Default product details
    const productName =
      shipment.packageContents || shipment.description || "Package Item";
    const sku = `SKU-${shipment.id}`;
    // Default GTIP code with proper length (minimum 6 characters as required by UPS)
    const gtip = "9405100000"; // Default GTIP code for postal packages as string with valid length

    // Enhanced browser-like headers for API requests to bypass CloudFlare
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://publicapi.shipentegra.com",
      Referer: "https://publicapi.shipentegra.com/",
      Connection: "keep-alive",
      DNT: "1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    };

    console.log("Checking if order already exists...");

    // Check if order already exists
    try {
      const findOrdersResponse = await fetch(
        `${SHIPENTEGRA_FIND_ORDERS_URL}?orderNumber=${orderNumber}`,
        {
          method: "GET",
          headers,
        },
      );

      if (findOrdersResponse.ok) {
        const findOrdersData =
          (await findOrdersResponse.json()) as ShipentegraFindOrdersResponse;
        console.log("Find orders response:", JSON.stringify(findOrdersData));

        if (
          findOrdersData.status === "success" &&
          findOrdersData.data.orders.length > 0
        ) {
          // Find the matching order
          const existingOrder = findOrdersData.data.orders.find(
            (order) =>
              order.order_id === orderNumber || order.orderId === orderNumber,
          );

          if (existingOrder) {
            console.log("Found existing order:", JSON.stringify(existingOrder));

            if (existingOrder.se_tracking_number) {
              console.log(
                "Order already has tracking number:",
                existingOrder.se_tracking_number,
              );

              // We would need to get the label URL, but our example doesn't show how to retrieve it
              // Let's assume we need to regenerate the label
              return await processLabel(
                existingOrder.orderId || existingOrder.order_id,
                shipment,
                accessToken,
              );
            } else {
              return await processLabel(
                existingOrder.orderId || existingOrder.order_id,
                shipment,
                accessToken,
              );
            }
          }
        }
      } else {
        const errorText = await findOrdersResponse.text();

        // Continue with order creation since we couldn't verify if it exists
      }
    } catch (error) {
      // Continue with order creation since we couldn't verify if it exists
    }

    // Get state code
    const stateCode = getStateCode(
      shipment.receiverCity,
      shipment.receiverCountry,
    );

    // Create the order payload exactly matching the required format
    // For retries, add a counter suffix to tracking number to make it unique
    const trackingNumberWithSuffix =
      shipment.labelAttempts && shipment.labelAttempts > 0
        ? `${shipment.trackingNumber}-${shipment.labelAttempts}`
        : shipment.trackingNumber;

    // Check if destination country is in the EU and if IOSS number is provided
    const destinationCountryCode = getCountryCode(shipment.receiverCountry);

    const orderPayload: any = {
      number: orderNumber, // Use the unique order number we generated above
      packageQuantity: quantity,
      reference1: shipment.trackingNumber, // Use MG tracking ID instead of SKU
      description: productName,
      currency: "USD", // Default customs currency
      weight: Math.ceil(shipment.packageWeight), // Round up weight
      width: Math.ceil(shipment.packageWidth), // Round up width
      height: Math.ceil(shipment.packageHeight), // Round up height
      length: Math.ceil(shipment.packageLength), // Round up length
      shipFrom: {
        name: (shipment.senderName || "").trim(),
        address1: (() => {
          const fullAddress = (
            shipment.senderAddress1 ||
            shipment.senderAddress ||
            ""
          ).trim();
          let formattedAddress = formatAddressForAPI(fullAddress);
          if (formattedAddress.length > 35) {
            console.log(
              `ShipEntegra: Truncated sender address from "${formattedAddress}" (${formattedAddress.length} chars) to "${formattedAddress.substring(0, 35)}" (35 chars)`,
            );
            return formattedAddress.substring(0, 35);
          }
          return formattedAddress;
        })(),
        // address2 removed as per requirements
        city: formatCityForAPI((shipment.senderCity || "").trim()),
        country: "TR", // Turkey country code for sender
        zipCode: (shipment.senderPostalCode || "").trim(),
        phone: "905407447911", // Always use this fixed phone number as requested
        email: "info@moogship.com", // Always use this fixed email as requested
      },
      shippingAddress: buildShippingAddress(shipment, stateCode),
      items: [
        {
          name: productName,
          quantity: quantity,
          unitPrice: unitPrice, // Customs value
          sku: sku,
          gtip: gtip,
        },
      ],
    };

    // Add IOSS number for EU shipments or HMRC number for UK/Sweden
    if (
      isEUCountry(destinationCountryCode) &&
      !isHMRCCountry(destinationCountryCode) &&
      shipment.iossNumber
    ) {
      orderPayload.iossNumber = shipment.iossNumber;
    } else if (isHMRCCountry(destinationCountryCode) && shipment.iossNumber) {
      orderPayload.iossNumber = shipment.iossNumber; // Use same field for HMRC number
    } else {
    }

    // Debug: Log the complete payload being sent to ShipEntegra
    console.log("🔍 ShipEntegra API Payload Debug:");
    console.log("Shipment data received:", {
      id: shipment.id,
      senderName: shipment.senderName,
      senderAddress: shipment.senderAddress,
      senderAddress1: shipment.senderAddress1,
      senderCity: shipment.senderCity,
      receiverCountry: shipment.receiverCountry,
    });
    console.log(
      "shipFrom object:",
      JSON.stringify(orderPayload.shipFrom, null, 2),
    );
    console.log(
      "shippingAddress object:",
      JSON.stringify(orderPayload.shippingAddress, null, 2),
    );
    console.log("Complete orderPayload keys:", Object.keys(orderPayload));

    // Log before making the API call
    console.info(`🚀 Making ShipEntegra API call for shipment ${shipment.id}`);
    console.info(`📝 Order payload keys: ${Object.keys(orderPayload)}`);
    
    // CRITICAL FINAL LOGGING: Show exact payload being sent to ShipEntegra
    console.log(`[ShipEntegra] Final label payload for shipment ${shipment.id}:`, JSON.stringify({
      url: SHIPENTEGRA_CREATE_ORDER_URL,
      headers: headers,
      body: orderPayload
    }, null, 2));
    
    // Make the order creation request
    const orderResponse = await fetch(SHIPENTEGRA_CREATE_ORDER_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(orderPayload),
    });

    if (!orderResponse.ok) {
      // Try to parse JSON error response first
      let errorText: string;
      let errorData: any = null;

      try {
        // Attempt to parse as JSON
        const responseText = await orderResponse.text();
        errorText = responseText;

        try {
          // Try to parse as JSON to extract more detailed error info
          errorData = JSON.parse(responseText);
        } catch (jsonError) {}
      } catch (textError) {
        // Fallback if we can't even get the response text
        errorText = `HTTP ${orderResponse.status} - Could not read response body`;
        console.error("Failed to read error response:", textError);
      }

      // Form a detailed error message that includes all available information
      let detailedErrorMessage = `${orderResponse.status} - ${errorText}`;

      // Extract more specific error details if available in JSON format
      if (errorData) {
        if (
          errorData.status === "fail" &&
          errorData.data &&
          Array.isArray(errorData.data)
        ) {
          // Extract specific error messages from the data array
          const errorMessages = errorData.data
            .map((err: any) => {
              if (err.description)
                return `${err.message || "Error"}: ${err.description}`;
              return err.message || "Unknown error";
            })
            .join("; ");

          if (errorMessages) {
            detailedErrorMessage = `${orderResponse.status} - ${errorMessages}`;
          }
        } else if (errorData.message) {
          // Just use the top-level message if available
          detailedErrorMessage = `${orderResponse.status} - ${errorData.message}`;
        }
      }

      console.error(`Failed to create order: ${detailedErrorMessage}`);

      // Check if the error is about duplicate order numbers
      if (
        errorText.includes("Tekrarlanan sipariş numarası") ||
        errorText.includes("duplicate order") ||
        errorText.includes("already exists")
      ) {
        // Increment label attempts in database to track retry history
        try {
          const currentAttempts = shipment.labelAttempts || 0;
          const updatedAttempts = currentAttempts + 1;

          // We'll use the database directly to update the retry counter
          const db = await import("../db");
          await db.pool.query(
            "UPDATE shipments SET label_attempts = $1, label_error = $2 WHERE id = $3",
            [updatedAttempts, detailedErrorMessage, shipment.id],
          );

          // Return specific error for duplicate order numbers with manual retry instructions
          return {
            success: false,
            message: `Duplicate order number detected (attempt #${updatedAttempts}). Please try again manually to use a new order number format.`,
            duplicateOrderError: true,
          };
        } catch (dbError) {
          console.error("Failed to update retry counter in database:", dbError);
          // Continue with the general error response
        }
      }

      // Check for IOSS/HMRC number errors for EU, UK, and Sweden shipments
      const isIossError =
        (errorText.includes("IOSS") && errorText.includes("required")) ||
        (errorData &&
          errorData.data &&
          Array.isArray(errorData.data) &&
          errorData.data.some(
            (err: any) =>
              err.message === "ERR.IOSS" ||
              (err.description && err.description.includes("IOSS")),
          ));

      const destinationCountryCode = getCountryCode(shipment.receiverCountry);
      const isHmrcCountry = isHMRCCountry(destinationCountryCode);

      if (isIossError) {
        let errorMessageUpdate = detailedErrorMessage;

        // Custom message based on destination country
        if (isHmrcCountry) {
          const countryName = destinationCountryCode === "GB" ? "UK" : "Sweden";
          console.log(
            `Detected missing HMRC number error for ${countryName} shipment.`,
          );
          errorMessageUpdate = `HMRC number is required for ${countryName} shipments. Please add an HMRC number and try again.`;
        } else {
          console.log("Detected missing IOSS number error for EU shipment.");
          errorMessageUpdate =
            "IOSS number is required for European shipments under 150 EUR. Please add an IOSS number and try again.";
        }

        // Update database with the specific error
        try {
          const db = await import("../db");
          await db.pool.query(
            "UPDATE shipments SET label_error = $1 WHERE id = $2",
            [errorMessageUpdate, shipment.id],
          );
          console.log(
            `Updated shipment ${shipment.id} with ${isHmrcCountry ? "HMRC" : "IOSS"} error message`,
          );
        } catch (dbError) {
          console.error("Failed to update error message in database:", dbError);
        }
      }

      // For all other types of errors, also update the error message in the database
      try {
        const db = await import("../db");
        await db.pool.query(
          "UPDATE shipments SET label_error = $1 WHERE id = $2",
          [detailedErrorMessage, shipment.id],
        );
        console.log(
          `Updated shipment ${shipment.id} with error message: ${detailedErrorMessage}`,
        );
      } catch (dbError) {
        console.error("Failed to update error message in database:", dbError);
      }

      return {
        success: false,
        message: `Failed to create order: ${detailedErrorMessage}`,
      };
    }

    const orderData = (await orderResponse.json()) as ShipentegraOrderResponse;
    console.log(`\n📋 ===== ORDER CREATION SUCCESS RESPONSE =====`);
    console.log(`✅ Success Response Body:`);
    console.log(JSON.stringify(orderData, null, 2));

    if (orderData.status === "success" && orderData.data.orderId) {
      // Now generate the label
      return await processLabel(orderData.data.orderId, shipment, accessToken);
    } else {
      console.error(
        "Order creation failed:",
        orderData.message || "Unknown error",
      );
      return {
        success: false,
        message: `Failed to create order: ${orderData.message || "Unknown error"}`,
      };
    }
  } catch (error) {
    console.error("Error in createShipentegraOrderAndLabel:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Build package array for AFS Transport waybill
 */
function buildPackageArray(shipment: ShipEntegraSubmitData) {
  // If we have package items, create individual packages
  if (
    shipment.packageItems &&
    Array.isArray(shipment.packageItems) &&
    shipment.packageItems.length > 0
  ) {
    return shipment.packageItems.map((item) => ({
      kap: 1, // Each item is typically 1 piece
      agirlik:
        Number(item.weight) ||
        Number(shipment.packageWeight) / shipment.packageItems!.length,
      uzunluk: Number(shipment.packageLength), // Use shipment dimensions for all items
      genislik: Number(shipment.packageWidth),
      yukseklik: Number(shipment.packageHeight),
    }));
  }

  // Default single package
  return [
    {
      kap: shipment.pieceCount || shipment.piece_count || 1,
      agirlik: Number(shipment.packageWeight),
      uzunluk: Number(shipment.packageLength),
      genislik: Number(shipment.packageWidth),
      yukseklik: Number(shipment.packageHeight),
    },
  ];
}

/**
 * Build invoice items for AFS Transport waybill
 */
function buildInvoiceItems(shipment: ShipEntegraSubmitData) {
  // If we have package items, use them for detailed invoice
  if (
    shipment.packageItems &&
    Array.isArray(shipment.packageItems) &&
    shipment.packageItems.length > 0
  ) {
    return shipment.packageItems.map((item) => ({
      mal_cinsi: item.name || item.description || "Product",
      adet: Number(item.quantity) || 1,
      tip_id: 1,
      birim_fiyat: Math.round(Number(item.price) / 100 || 25), // Convert cents to dollars
      gtip: item.htsCode || "123456789",
    }));
  }

  // Default single item
  return [
    {
      mal_cinsi:
        shipment.packageContents ||
        shipment.description ||
        `Package - ${shipment.id}`,
      adet: shipment.pieceCount || shipment.piece_count || 1,
      tip_id: 1,
      birim_fiyat: Math.round((shipment.customsValue || 5000) / 100),
      gtip: "123456789",
    },
  ];
}

/**
 * Process AFS Transport label generation for GLS services
 */
async function processAFSLabel(
  shipment: ShipEntegraSubmitData,
  serviceConfig: { url: string; specialService: string; displayName: string },
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  labelUrl?: string;
  labelPdf?: string | null;
  duplicateOrderError?: boolean;
}> {
  console.log(
    `🚛 Routing AFS service to dedicated AFS Transport processing system...`,
  );
  console.log(`📦 Shipment ID: ${shipment.id}`);
  console.log(`🎯 Service: ${serviceConfig.displayName}`);

  try {
    // Import and use the dedicated AFS Transport processing system
    const { processAFSShipments } = await import("./afstransport");

    // Convert ShipEntegraSubmitData to format expected by AFS processing
    const afsShipment = {
      id: shipment.id,
      trackingNumber: shipment.trackingNumber || `MOG${Date.now()}`,
      selectedService: shipment.selectedService || shipment.providerServiceCode,
      providerServiceCode: shipment.providerServiceCode,
      senderName: shipment.senderName,
      senderAddress1: shipment.senderAddress1 || shipment.senderAddress,
      senderCity: shipment.senderCity,
      senderPostalCode: shipment.senderPostalCode,
      senderPhone: shipment.senderPhone,
      senderEmail: shipment.senderEmail,
      receiverName: shipment.receiverName,
      receiverAddress: shipment.receiverAddress,
      receiverCity: shipment.receiverCity,
      receiverPostalCode: shipment.receiverPostalCode,
      receiverCountry: shipment.receiverCountry,
      receiverPhone: shipment.receiverPhone,
      receiverEmail: shipment.receiverEmail,
      packageWeight: shipment.packageWeight,
      packageLength: shipment.packageLength,
      packageWidth: shipment.packageWidth,
      packageHeight: shipment.packageHeight,
      packageContents: shipment.packageContents,
      pieceCount: shipment.piece_count || 1,
      customsValue: shipment.customsValue,
      totalPrice: shipment.totalPrice || 5000,
      gtip: shipment.gtip || "940510",
    };

    console.log(
      `🚛 Calling AFS Transport processing system for shipment ${shipment.id}...`,
    );

    // Process the shipment through AFS Transport
    const result = await processAFSShipments([afsShipment]);

    if (result.successfulShipmentIds.includes(shipment.id)) {
      console.log(
        `✅ AFS Transport processing successful for shipment ${shipment.id}`,
      );

      return {
        success: true,
        message: `${serviceConfig.displayName} label generated via AFS Transport`,
        orderId: shipment.id.toString(),
        trackingNumber: result.carrierTrackingNumbers[shipment.id],
        labelUrl: result.carrierLabelUrls[shipment.id],
        labelPdf: result.carrierLabelPdfs[shipment.id],
        duplicateOrderError: false,
      };
    } else {
      console.error(
        `❌ AFS Transport processing failed for shipment ${shipment.id}:`,
        result.shipmentErrors[shipment.id],
      );

      return {
        success: false,
        message:
          result.shipmentErrors[shipment.id] ||
          "AFS Transport processing failed",
        duplicateOrderError: false,
      };
    }
  } catch (error: any) {
    console.error(`❌ Error in AFS Transport label processing:`, error);
    return {
      success: false,
      message: `AFS Transport processing error: ${error.message}`,
      duplicateOrderError: false,
    };
  }
}

/**
 * Detect carrier type from service level for conditional label generation
 */
function detectCarrierFromService(
  serviceLevel: string,
): "UPS" | "DHL" | "FEDEX" | "AFS" | "ECO" {
  console.log(`🔍 CARRIER DETECTION ANALYSIS:`);
  console.log(`   ├─ Input service: "${serviceLevel}"`);

  const serviceLower = serviceLevel.toLowerCase();
  console.log(`   ├─ Normalized: "${serviceLower}"`);

  let detectedCarrier: "UPS" | "DHL" | "FEDEX" | "AFS" | "ECO";

  if (serviceLower.includes("afs") || serviceLower.includes("gls")) {
    detectedCarrier = "AFS";
    console.log(`   ├─ Match found: AFS (contains 'afs' or 'gls')`);
  } else if (serviceLower.includes("ups")) {
    detectedCarrier = "UPS";
    console.log(`   ├─ Match found: UPS (contains 'ups')`);
  } else if (serviceLower.includes("dhl")) {
    detectedCarrier = "DHL";
    console.log(`   ├─ Match found: DHL (contains 'dhl')`);
  } else if (serviceLower.includes("fedex")) {
    detectedCarrier = "FEDEX";
    console.log(`   ├─ Match found: FEDEX (contains 'fedex')`);
  } else {
    detectedCarrier = "ECO";
    console.log(`   ├─ No carrier match, defaulting to ECO`);
  }

  console.log(`   └─ FINAL DETECTION: ${detectedCarrier}`);
  return detectedCarrier;
}

/**
 * Process the label generation for a ShipEntegra order using exact service code
 * Uses the exact service code selected during price calculation for label purchasing
 */
async function processLabel(
  orderId: string,
  shipment: ShipEntegraSubmitData,
  accessToken: string,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  carrierLabelUrl?: string; // This is the carrier label URL
  carrierLabelPdf?: string | null; // This is the carrier label PDF (Base64 encoded)
  duplicateOrderError?: boolean; // Flag for duplicate order number errors
}> {
  try {
    // Get the exact service code that was selected during price calculation
    const serviceCode = getServiceCodeForLabel(shipment);

    console.log(`🎯 Label purchasing with exact service code: ${serviceCode}`);

    // Normalize for internal aliases
    const normalizedServiceCode =
      serviceCode === "shipentegra-eco-primary"
        ? "shipentegra-eco"
        : serviceCode;
    const serviceConfig =
      SERVICE_MAPPING[normalizedServiceCode as keyof typeof SERVICE_MAPPING];

    if (!serviceConfig) {
      console.error(
        `❌ No service configuration found for service code: ${serviceCode}`,
      );
      // Fallback to ECO processing for unknown services
      return await processEcoLabel(orderId, shipment, accessToken);
    }

    console.log(`📋 Using service configuration:`, {
      url: serviceConfig.url,
      specialService: serviceConfig.specialService,
      displayName: serviceConfig.displayName,
    });

    // Check if this is an AFS Transport service
    if (serviceConfig.url === "AFS_TRANSPORT_API") {
      console.log(
        `🚛 Routing to AFS Transport API for service: ${serviceCode}`,
      );
      return await processAFSLabel(shipment, {
        url: serviceConfig.url,
        specialService: serviceConfig.specialService.toString(),
        displayName: serviceConfig.displayName,
      });
    }

    // Call the exact API endpoint with the exact service configuration
    return await processServiceWithExactConfig(
      orderId,
      shipment,
      accessToken,
      serviceConfig,
      serviceCode,
    );
  } catch (error: any) {
    console.error(
      `❌ ERROR in processLabel for shipment ${shipment.id}:`,
      error,
    );
    return {
      success: false,
      message: `Label processing error: ${error.message}`,
    };
  }
}

/**
 * Process label with exact service configuration
 * Uses the exact API endpoint and service settings that were selected during price calculation
 */
async function processServiceWithExactConfig(
  orderId: string,
  shipment: ShipEntegraSubmitData,
  accessToken: string,
  serviceConfig: {
    url: string;
    specialService: string | number;
    displayName: string;
  },
  serviceCode: string,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  carrierLabelUrl?: string;
  carrierLabelPdf?: string | null;
  duplicateOrderError?: boolean;
}> {
  console.log(`\n🚀 ===== EXACT SERVICE LABEL PROCESSING =====`);
  console.log(`📦 Order ID: ${orderId}`);
  console.log(`📋 Shipment ID: ${shipment.id}`);
  console.log(`🎯 Service Code: ${serviceCode}`);
  console.log(`🔧 Service Config:`, serviceConfig);
  console.log(`📍 Destination: ${shipment.receiverCountry}`);

  try {
    // Prepare package items for the API request
    const packageItems = [];

    if (
      shipment.packageItems &&
      Array.isArray(shipment.packageItems) &&
      shipment.packageItems.length > 0
    ) {
      console.log(
        `📦 Processing ${shipment.packageItems.length} package items for label API`,
      );

      for (const item of shipment.packageItems) {
        const packageItem = {
          itemId: item.id,
          name: item.name || "Package Item",
          description: item.description || item.name || "Package Item",
          quantity: item.quantity || 1,
          price: item.price ? item.price / 100 : 10, // Convert cents to dollars
          weight:
            (item.weight || shipment.packageWeight || 1) / (item.quantity || 1), // Weight per item
          htsCode: item.htsCode || "9999.00.0000", // Use actual HTS code or fallback
          countryOfOrigin: item.countryOfOrigin || "TR",
        };

        packageItems.push(packageItem);
        console.log(
          `   📋 Item: ${packageItem.name}, Qty: ${packageItem.quantity}, Price: $${packageItem.price}, HTS: ${packageItem.htsCode}`,
        );
      }
    } else {
      // Create default package item if none provided
      console.log("📦 No package items found, creating default item");
      packageItems.push({
        itemId: 1,
        name: shipment.packageContents || "General Merchandise",
        description: shipment.packageContents || "General Merchandise",
        quantity: 1,
        price: Math.round((shipment.customsValue || 5000) / 100), // Convert cents to dollars
        weight: shipment.packageWeight || 1,
        htsCode: "9999.00.0000",
        countryOfOrigin: "TR",
      });
    }

    // Build the label request payload
    const labelPayload = {
      orderId: orderId,
      specialService: serviceConfig.specialService,
      packageItems: packageItems,
    };

    console.log(`\n🚀 ===== LABEL PURCHASE API CALL =====`);
    console.log(`🎯 Service: ${serviceConfig.displayName}`);
    console.log(`🌐 Endpoint: ${serviceConfig.url}`);
    console.log(`🔑 Authorization: Bearer ${accessToken.substring(0, 20)}...`);
    console.log(`📦 Full Request Payload:`);
    console.log(JSON.stringify(labelPayload, null, 2));

    // Make the API call to the exact service endpoint
    const labelResponse = await fetch(serviceConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(labelPayload),
    });

    console.log(`\n📡 ===== API RESPONSE =====`);
    console.log(
      `📊 Response Status: ${labelResponse.status} ${labelResponse.statusText}`,
    );
    console.log(
      `📋 Response Headers:`,
      Object.fromEntries(labelResponse.headers.entries()),
    );

    if (!labelResponse.ok) {
      const errorText = await labelResponse.text();
      console.log(`❌ Error Response Body:`, errorText);
      console.error(`❌ ${serviceConfig.displayName} API Error:`, errorText);

      // Check for duplicate order error
      if (
        errorText.includes("duplicate") ||
        errorText.includes("already exists")
      ) {
        return {
          success: false,
          message: `Duplicate order error: ${errorText}`,
          duplicateOrderError: true,
        };
      }

      return {
        success: false,
        message: `${serviceConfig.displayName} API error: ${errorText}`,
      };
    }

    const labelData = (await labelResponse.json()) as ShipentegraLabelResponse;
    console.log(`\n📋 ===== FULL API RESPONSE =====`);
    console.log(`✅ Success Response Body:`);
    console.log(JSON.stringify(labelData, null, 2));

    if (labelData.status === "success" && labelData.data) {
      console.log(
        `✅ ${serviceConfig.displayName} label generated successfully`,
      );

      // Download and convert label to PDF using enhanced imageConverter
      let labelPdfContent: string | null = null;

      if (labelData.data.label) {
        try {
          console.log(
            `📥 🚨 DOWNLOADING AUTHENTIC CARRIER LABEL: ${labelData.data.label} 🚨`,
          );

          console.log(`📄 [SHIPENTEGRA PDF] Processing label URL: ${labelData.data.label}`);
          console.log(`📄 [SHIPENTEGRA PDF] Label type detected: ${labelData.data.label.toLowerCase().endsWith(".gif") ? "GIF" : "Other"}`);
          
          // Use the enhanced imageConverter for proper dimension preservation
          const { downloadAndConvertToPdf } = await import(
            "../utilities/imageConverter"
          );

          // Check if it's a GIF that needs conversion to PDF
          if (labelData.data.label.toLowerCase().endsWith(".gif")) {
            console.log(
              `🔄 [SHIPENTEGRA PDF] Converting GIF carrier label to PDF with authentic dimensions`,
            );

            try {
              // Use enhanced converter that preserves exact carrier dimensions
              labelPdfContent = await downloadAndConvertToPdf(
                labelData.data.label,
              );
              console.log(
                `✅ [SHIPENTEGRA PDF] GIF successfully converted to PDF, size: ${labelPdfContent?.length || 0} characters`,
              );
              if (labelPdfContent) {
                console.log(`📄 [SHIPENTEGRA PDF] PDF preview: ${labelPdfContent.substring(0, 50)}...`);
              }
            } catch (conversionError) {
              console.error(`❌ [SHIPENTEGRA PDF] GIF conversion failed:`, conversionError);
              labelPdfContent = null;
            }
          } else {
            // For non-GIF files, download directly
            console.log(`📥 [SHIPENTEGRA PDF] Downloading non-GIF label directly`);
            try {
              const labelFileResponse = await fetch(labelData.data.label);
              console.log(`📄 [SHIPENTEGRA PDF] Download response status: ${labelFileResponse.status}`);
              console.log(`📄 [SHIPENTEGRA PDF] Response headers:`, Object.fromEntries(labelFileResponse.headers.entries()));
              
              if (labelFileResponse.ok) {
                const buffer = await labelFileResponse.buffer();
                labelPdfContent = buffer.toString("base64");
                console.log(`✅ [SHIPENTEGRA PDF] Direct download successful, size: ${labelPdfContent.length} characters`);
                console.log(`📄 [SHIPENTEGRA PDF] PDF preview: ${labelPdfContent.substring(0, 50)}...`);
              } else {
                const errorText = await labelFileResponse.text();
                console.error(`❌ [SHIPENTEGRA PDF] Download failed: ${labelFileResponse.status} - ${labelFileResponse.statusText}`);
                console.error(`❌ [SHIPENTEGRA PDF] Error response: ${errorText.substring(0, 200)}`);
                labelPdfContent = null;
              }
            } catch (downloadError) {
              console.error(`❌ [SHIPENTEGRA PDF] Download error:`, downloadError);
              console.error(`❌ [SHIPENTEGRA PDF] Error stack:`, (downloadError as Error)?.stack);
              labelPdfContent = null;
            }
          }
        } catch (downloadError) {
          console.error(
            `❌ Error downloading/converting label:`,
            downloadError,
          );
        }
      }

      return {
        success: true,
        message: `${serviceConfig.displayName} label generated successfully`,
        orderId,
        trackingNumber: labelData.data.trackingNumber,
        carrierLabelUrl: labelData.data.label,
        carrierLabelPdf: labelPdfContent,
        duplicateOrderError: false,
      };
    } else {
      console.error(
        `❌ ${serviceConfig.displayName} label generation failed:`,
        labelData.message || "Unknown error",
      );
      return {
        success: false,
        message: `${serviceConfig.displayName} label generation failed: ${labelData.message || "Unknown error"}`,
      };
    }
  } catch (error: any) {
    console.error(
      `❌ Error in ${serviceConfig.displayName} label processing:`,
      error,
    );
    return {
      success: false,
      message: `${serviceConfig.displayName} processing error: ${error.message}`,
    };
  }
}

/**
 * Process carrier-specific label generation (UPS, DHL, FedEx)
 */
async function processCarrierSpecificLabel(
  orderId: string,
  shipment: ShipEntegraSubmitData,
  accessToken: string,
  carrierType: "UPS" | "DHL" | "FEDEX",
  serviceType: string,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  carrierLabelUrl?: string;
  carrierLabelPdf?: string | null;
  duplicateOrderError?: boolean;
}> {
  // Security: Removed carrier processing debug logging

  // Get the service configuration for this carrier
  // Security: Removed service lookup debug logging

  const serviceConfig =
    SERVICE_MAPPING[serviceType as keyof typeof SERVICE_MAPPING];
  // Security: Removed config debug logging
  if (!serviceConfig) {
    return {
      success: false,
      message: `No service configuration found for service type: ${serviceType}`,
    };
  }

  // Check if package is going to Germany (special handling required)
  const isGermany =
    shipment.receiverCountry === "Germany" ||
    shipment.receiverCountry === "DE" ||
    getCountryCode(shipment.receiverCountry) === "DE";

  // Security: Removed country and weight debug logging

  // Make sure weight is a number
  const packageWeight = Number(shipment.packageWeight);

  // Define the package item interface that corresponds to our database schema
  interface PackageItemType {
    id: number;
    shipmentId: number;
    name: string;
    description: string | null;
    quantity: number;
    price: number;
    gtin: string | null;
    hsCode: string | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    countryOfOrigin: string | null;
    manufacturer: string | null;
    sku?: string; // May or may not be present in the DB
    createdAt: Date | null;
    updatedAt: Date | null;
  }

  // Get package items for this shipment
  let packageItems: PackageItemType[] = [];
  try {
    // Use db directly to fetch package items
    const { packageItems: packageItemsTable } = await import("@shared/schema");
    const { eq, asc } = await import("drizzle-orm");

    // Fetch the package items directly from the database
    packageItems = await db
      .select()
      .from(packageItemsTable)
      .where(eq(packageItemsTable.shipmentId, shipment.id))
      .orderBy(asc(packageItemsTable.id));

    // Security: Removed package items debug logging
  } catch (error) {
    // Security: Removed error debug logging
    // Continue with empty items array
  }

  // Create items array for the payload - each package item should be a separate entry
  const itemsArray = [];

  if (packageItems && packageItems.length > 0) {
    // Create an item entry for each package item
    for (const item of packageItems) {
      // Priority order:
      // 1. Use shipment.gtip field if exists (this comes from the user's input in the form)
      // 2. Use item.hsCode or item.gtin as fallback
      // 3. Default to a standard code if nothing else works

      // First check if we have a value from the shipment's GTIP field (this would be set by user in the UI)
      let gtipCode = shipment.gtip || null;

      // If no shipment-level GTIP, fall back to item-level codes
      if (!gtipCode) {
        const hsCodeValue = item.hsCode || item.gtin || null;
        gtipCode = "9405100000"; // Default GTIP code for postal package as string with valid length

        // Try to convert hsCode to a valid string if it exists
        if (hsCodeValue) {
          try {
            // Remove any non-numeric characters and ensure length is valid (6-15 chars)
            const cleanHsCode = hsCodeValue.toString().replace(/\D/g, "");
            if (
              cleanHsCode &&
              cleanHsCode.length >= 6 &&
              cleanHsCode.length <= 15
            ) {
              gtipCode = cleanHsCode;
            } else if (cleanHsCode) {
              // If the code is too short, pad it with zeros to reach minimum length
              gtipCode = cleanHsCode.padEnd(10, "0").substring(0, 15);
              // Security: Removed GTIP modification debug logging
            }
          } catch (error) {
            // Security: Removed hsCode parsing debug logging
          }
        }
      } else {
        // If using shipment-level GTIP, ensure it's in the correct format
        try {
          // Allow both numeric and alphanumeric GTIP codes
          const cleanGtip = gtipCode.toString().replace(/[^a-zA-Z0-9]/g, "");

          if (cleanGtip && cleanGtip.length >= 6 && cleanGtip.length <= 15) {
            gtipCode = cleanGtip;
          } else if (cleanGtip) {
            // If the code is too short, pad it with zeros to reach minimum length
            gtipCode = cleanGtip.padEnd(10, "0").substring(0, 15);
            // Security: Removed shipment-level GTIP modification debug logging
          } else {
            // If cleaning resulted in an empty string, use default
            gtipCode = "9405100000";
            console.log("Empty GTIP after cleaning, using default code");
          }
        } catch (error) {
          console.warn(
            `Could not parse shipment GTIP "${gtipCode}", using default`,
          );
          gtipCode = "9405100000";
        }
      }

      console.log(
        `Using GTIP code: ${gtipCode} for item ${item.id} (${item.name || "unnamed"})`,
      );

      // Add each item as a separate entry in the items array
      itemsArray.push({
        itemId: Number(item.id), // Use integer item ID as per API spec
        declaredPrice: Number(
          (item.price ? item.price / 100 : 50.0).toFixed(2),
        ), // Convert cents to dollars with 2 decimals
        declaredQuantity: Number(item.quantity || 1),
        gtip: Number(gtipCode), // Convert GTIP to number as per API spec
      });
    }
  } else {
    // Fallback to generic item if no package items found using shipment's customs data
    let gtipCode = "9405100000"; // Default GTIP code for postal packages

    // Use the actual GTIP code from the shipment database if available
    if (shipment.gtip) {
      try {
        // Clean and convert GTIP from database to valid format
        const cleanGtip = shipment.gtip.toString().replace(/\D/g, "");
        if (cleanGtip && cleanGtip.length >= 6 && cleanGtip.length <= 15) {
          gtipCode = cleanGtip;
        } else if (cleanGtip) {
          // If the code is too short, pad it with zeros to reach minimum length
          gtipCode = cleanGtip.padEnd(10, "0").substring(0, 15);
        }
      } catch (error) {
        console.warn(
          `Failed to parse GTIP code "${shipment.gtip}", using default`,
        );
      }
    }

    itemsArray.push({
      itemId: Number(shipment.id), // Use integer shipment ID as per API spec
      declaredPrice: Number(
        (shipment.customsValue ? shipment.customsValue / 100 : 50.0).toFixed(2),
      ), // Convert cents to dollars with 2 decimals
      declaredQuantity: Number(shipment.customsItemCount || 1),
      gtip: Number(gtipCode), // Use actual GTIP from database or default
    });
  }

  console.log(
    `📋 Using ${carrierType} service configuration from SERVICE_MAPPING`,
  );

  // Following the official ShipEntegra API specification format
  const labelPayload: any = {
    orderId: Number(orderId), // Use numeric orderId as per API spec
    specialService: serviceConfig.specialService, // Use mapped special service code
    content:
      shipment.packageContents ||
      shipment.description ||
      `Package - ${shipment.id}`,
    weight: Number(packageWeight.toFixed(2)), // Use decimal weight as per API spec
    currency: "USD",
    items: itemsArray, // Use the dynamically built items array
  };

  // Check if destination country is in the EU and IOSS number is provided
  const destinationCountryCode = getCountryCode(shipment.receiverCountry);
  const isEuDestination = isEUCountry(destinationCountryCode);
  const hasIossNumber =
    Boolean(shipment.iossNumber) && shipment.iossNumber?.trim() !== "";

  // Security: Removed IOSS/HMRC and payload debug logging

  if (
    isEUCountry(destinationCountryCode) &&
    !isHMRCCountry(destinationCountryCode) &&
    shipment.iossNumber
  ) {
    // Security: Removed IOSS number debug logging
    labelPayload.iossNumber = shipment.iossNumber;
  } else if (isHMRCCountry(destinationCountryCode) && shipment.iossNumber) {
    // Security: Removed HMRC number debug logging
    labelPayload.iossNumber = shipment.iossNumber;
  } else {
    // Security: Removed IOSS/HMRC number debug logging
  }

  // Make the label generation request with enhanced browser-like headers
  const labelResponse = await fetch(serviceConfig.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Origin: "https://publicapi.shipentegra.com",
      Referer: "https://publicapi.shipentegra.com/",
      Connection: "keep-alive",
      DNT: "1",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(labelPayload),
  });

  if (!labelResponse.ok) {
    // Handle errors similar to the ECO system but with carrier-specific messaging
    let errorText: string;
    let errorData: any = null;

    try {
      const responseText = await labelResponse.text();
      errorText = responseText;

      try {
        errorData = JSON.parse(responseText);
        // Security: Removed label error response debug logging
      } catch (jsonError) {
        // Security: Removed JSON error debug logging
      }
    } catch (textError) {
      errorText = `HTTP ${labelResponse.status} - Could not read response body`;
      // Security: Removed error response debug logging
    }

    let detailedErrorMessage = `${labelResponse.status} - ${errorText}`;

    if (errorData) {
      if (
        errorData.status === "fail" &&
        errorData.data &&
        Array.isArray(errorData.data)
      ) {
        const errorMessages = errorData.data
          .map((err: any) => {
            if (err.description)
              return `${err.message || "Error"}: ${err.description}`;
            return err.message || "Unknown error";
          })
          .join("; ");

        if (errorMessages) {
          detailedErrorMessage = `${labelResponse.status} - ${errorMessages}`;
        }
      } else if (errorData.message) {
        detailedErrorMessage = `${labelResponse.status} - ${errorData.message}`;
      }
    }

    // Security: Removed shipment ID and error details debug logging

    // Update the error message in the database for this shipment
    try {
      const db = await import("../db");
      await db.pool.query(
        "UPDATE shipments SET label_error = $1 WHERE id = $2",
        [detailedErrorMessage, shipment.id],
      );
      // Security: Removed shipment ID and error message debug logging
    } catch (dbError) {
      // Security: Removed database error debug logging
    }

    return {
      success: false,
      message: detailedErrorMessage,
    };
  }

  // Process successful response
  const labelData = (await labelResponse.json()) as ShipentegraLabelResponse;
  // Security: Removed label response debug logging

  if (labelData.status === "success" && labelData.data) {
    // Security: Removed label generation success debug logging

    // Analyze the document URLs to identify shipping label vs invoice
    const labelUrl = labelData.data.label;
    const invoiceUrl = labelData.data.invoice;
    const shipEntegraUrl = labelData.data.shipEntegraLabel;

    // Security: Removed label URL debug logging

    // Check URL patterns to identify document types
    const isLabelAnInvoice =
      labelUrl &&
      (labelUrl.includes("invoice") ||
        labelUrl.includes("fatura") ||
        labelUrl.includes("CR3H_") || // Common ShipEntegra invoice pattern
        labelUrl.includes("_invoice_"));

    const isInvoiceALabel =
      invoiceUrl &&
      (invoiceUrl.includes("label") ||
        invoiceUrl.includes("etiket") ||
        (!invoiceUrl.includes("invoice") &&
          !invoiceUrl.includes("fatura") &&
          !invoiceUrl.includes("CR3H_")));

    const isShipEntegraInvoice =
      shipEntegraUrl &&
      (shipEntegraUrl.includes("CR3H_") ||
        shipEntegraUrl.includes("invoice") ||
        shipEntegraUrl.includes("fatura"));

    // Security: Removed URL analysis debug logging

    // Determine the correct shipping label URL
    // Priority: GIF labels > non-invoice PDFs > any available document
    let actualLabelUrl = labelUrl;

    if (isLabelAnInvoice && isInvoiceALabel) {
      // Security: Removed URL swapping debug logging
      actualLabelUrl = invoiceUrl;
    } else if (isLabelAnInvoice && !invoiceUrl) {
      // Security: Removed warning message about missing alternative URL
    }

    // Additional validation - prefer GIF labels over PDF invoices
    if (labelUrl && labelUrl.includes(".gif")) {
      // Security: Removed GIF label confirmation debug logging
      actualLabelUrl = labelUrl;
    }

    // Download and convert the actual SHIPPING LABEL
    let labelPdfBase64 = null;

    if (actualLabelUrl) {
      try {
        // Security: Removed label download URL debug logging

        // Check if this is a GIF image that needs conversion to PDF
        const isGifLabel = actualLabelUrl.includes(".gif");

        if (isGifLabel) {
          // Security: Removed GIF conversion debug logging
          // Import the converter dynamically to avoid circular dependencies
          const { downloadAndConvertToPdf } = await import(
            "../utilities/imageConverter"
          );
          labelPdfBase64 = await downloadAndConvertToPdf(actualLabelUrl);
          // Security: Removed GIF conversion success debug logging
        } else {
          // Download PDF directly
          const labelResponse = await fetch(actualLabelUrl);
          if (labelResponse.ok) {
            const labelBuffer = await labelResponse.arrayBuffer();
            labelPdfBase64 = Buffer.from(labelBuffer).toString("base64");
            // Security: Removed PDF download success debug logging
          } else {
            // Security: Removed download failure warning
          }
        }
      } catch (error) {
        // Security: Removed error debug logging
      }
    }

    return {
      success: true,
      message: `${carrierType} label generated successfully`,
      orderId: orderId,
      trackingNumber: labelData.data.trackingNumber,
      carrierLabelUrl: actualLabelUrl, // Use the correctly identified shipping label URL
      carrierLabelPdf: labelPdfBase64, // Base64 PDF data for carrierDF viewer
    };
  } else {
    // Security: Removed label generation failure debug logging
    return {
      success: false,
      message:
        labelData.message || `Unknown ${carrierType} label generation error`,
    };
  }
}

/**
 * Process ECO label generation system
 */
async function processEcoLabel(
  orderId: string,
  shipment: ShipEntegraSubmitData,
  accessToken: string,
): Promise<{
  success: boolean;
  message: string;
  orderId?: string;
  trackingNumber?: string;
  carrierLabelUrl?: string;
  carrierLabelPdf?: string | null;
  duplicateOrderError?: boolean;
}> {
  // Security: Removed ECO label generation debug logging

  try {
    // Import database instance
    const { db } = await import("../db");

    // Extract service type from shipment
    const serviceType = shipment.selectedService || shipment.serviceLevel;
    // Security: Removed service type debug logging

    // Calculate package weight
    const packageWeight = shipment.packageWeight || 1;
    // Security: Removed package weight debug logging

    // Check if destination is Germany
    const isGermany =
      shipment.receiverCountry?.toLowerCase().includes("germany") ||
      shipment.receiverCountry?.toLowerCase() === "de";

    // Define the package item interface that corresponds to our database schema
    interface PackageItemType {
      id: number;
      shipmentId: number;
      name: string;
      description: string | null;
      quantity: number;
      price: number;
      gtin: string | null;
      hsCode: string | null;
      weight: number | null;
      length: number | null;
      width: number | null;
      height: number | null;
      countryOfOrigin: string | null;
      manufacturer: string | null;
      sku?: string; // May or may not be present in the DB
      createdAt: Date | null;
      updatedAt: Date | null;
    }

    // Get package items for this shipment
    let packageItems: PackageItemType[] = [];
    try {
      // Use db directly to fetch package items
      const { packageItems: packageItemsTable } = await import(
        "@shared/schema"
      );
      const { eq, asc } = await import("drizzle-orm");

      // Fetch the package items directly from the database
      packageItems = await db
        .select()
        .from(packageItemsTable)
        .where(eq(packageItemsTable.shipmentId, shipment.id))
        .orderBy(asc(packageItemsTable.id));

      // Security: Removed package items debug logging
    } catch (error) {
      // Security: Removed package items error debug logging
      // Continue with empty items array
    }

    // Create items array for the payload - each package item should be a separate entry
    const itemsArray = [];

    if (packageItems && packageItems.length > 0) {
      // Create an item entry for each package item
      for (const item of packageItems) {
        // Priority order:
        // 1. Use shipment.gtip field if exists (this comes from the user's input in the form)
        // 2. Use item.hsCode or item.gtin as fallback
        // 3. Default to a standard code if nothing else works

        // First check if we have a value from the shipment's GTIP field (this would be set by user in the UI)
        let gtipCode = shipment.gtip || null;

        // If no shipment-level GTIP, fall back to item-level codes
        if (!gtipCode) {
          const hsCodeValue = item.hsCode || item.gtin || null;
          gtipCode = "9405100000"; // Default GTIP code for postal package as string with valid length

          // Try to convert hsCode to a valid string if it exists
          if (hsCodeValue) {
            try {
              // Remove any non-numeric characters and ensure length is valid (6-15 chars)
              const cleanHsCode = hsCodeValue.toString().replace(/\D/g, "");
              if (
                cleanHsCode &&
                cleanHsCode.length >= 6 &&
                cleanHsCode.length <= 15
              ) {
                gtipCode = cleanHsCode;
              } else if (cleanHsCode) {
                // If the code is too short, pad it with zeros to reach minimum length
                gtipCode = cleanHsCode.padEnd(10, "0").substring(0, 15);
                // Security: Removed GTIP code modification debug logging
              }
            } catch (error) {
              // Security: Removed hsCode parsing error debug logging
            }
          }
        } else {
          // If using shipment-level GTIP, ensure it's in the correct format
          try {
            // Allow both numeric and alphanumeric GTIP codes
            const cleanGtip = gtipCode.toString().replace(/[^a-zA-Z0-9]/g, "");

            if (cleanGtip && cleanGtip.length >= 6 && cleanGtip.length <= 15) {
              gtipCode = cleanGtip;
            } else if (cleanGtip) {
              // If the code is too short, pad it with zeros to reach minimum length
              gtipCode = cleanGtip.padEnd(10, "0").substring(0, 15);
              // Security: Removed shipment GTIP modification debug logging
            } else {
              // If cleaning resulted in an empty string, use default
              gtipCode = "9405100000";
              // Security: Removed empty GTIP debug logging
            }
          } catch (error) {
            // Security: Removed shipment GTIP parsing error debug logging
            gtipCode = "9405100000";
          }
        }

        // Security: Removed GTIP code usage debug logging

        // Add each item as a separate entry in the items array
        itemsArray.push({
          itemId: Number(item.id), // Use integer item ID as per API spec
          declaredPrice: Number(
            (item.price ? item.price / 100 : 50.0).toFixed(2),
          ), // Convert cents to dollars with 2 decimals
          declaredQuantity: Number(item.quantity || 1),
          gtip: Number(gtipCode), // Convert GTIP to number as per API spec
        });
      }
    } else {
      // Fallback to generic item if no package items found using shipment's customs data
      let gtipCode = "9405100000"; // Default GTIP code for postal packages

      // Use the actual GTIP code from the shipment database if available
      if (shipment.gtip) {
        try {
          // Clean and convert GTIP from database to valid format
          const cleanGtip = shipment.gtip.toString().replace(/\D/g, "");
          if (cleanGtip && cleanGtip.length >= 6 && cleanGtip.length <= 15) {
            gtipCode = cleanGtip;
          } else if (cleanGtip) {
            // If the code is too short, pad it with zeros to reach minimum length
            gtipCode = cleanGtip.padEnd(10, "0").substring(0, 15);
          }
        } catch (error) {
          // Security: Removed GTIP code parsing error debug logging
        }
      }

      itemsArray.push({
        itemId: Number(shipment.id),
        declaredPrice: Number(
          (shipment.customsValue ? shipment.customsValue / 100 : 50.0).toFixed(
            2,
          ),
        ), // Convert cents to dollars with 2 decimals
        declaredQuantity: Number(shipment.customsItemCount || 1),
        gtip: Number(gtipCode), // Use actual GTIP from database or default
      });
    }

    // Get service configuration from the new service mapping
    const normalizedServiceType =
      serviceType === "shipentegra-eco-primary"
        ? "shipentegra-eco"
        : serviceType;
    const serviceConfig =
      SERVICE_MAPPING[normalizedServiceType as keyof typeof SERVICE_MAPPING];
    if (!serviceConfig) {
      // Security: Removed service configuration error debug logging
      return {
        success: false,
        message: `Unsupported service type: ${serviceType}`,
      };
    }

    // Security: Removed service configuration debug logging

    // Following the official ShipEntegra API specification format
    const labelPayload: any = {
      orderId: Number(orderId), // Use numeric orderId as per API spec
      specialService: serviceConfig.specialService, // Use mapped special service code
      content:
        shipment.packageContents ||
        shipment.description ||
        `Package - ${shipment.id}`,
      weight: Number(packageWeight.toFixed(2)), // Use decimal weight as per API spec
      currency: "USD",
      items: itemsArray, // Use the dynamically built items array
    };

    // Check if destination country is in the EU and IOSS number is provided
    const destinationCountryCode = getCountryCode(shipment.receiverCountry);
    const isEuDestination = isEUCountry(destinationCountryCode);
    const hasIossNumber =
      Boolean(shipment.iossNumber) && shipment.iossNumber?.trim() !== "";

    // Security: Removed IOSS processing debug logging

    if (
      isEUCountry(destinationCountryCode) &&
      !isHMRCCountry(destinationCountryCode) &&
      shipment.iossNumber
    ) {
      // Security: Removed IOSS number addition debug logging
      labelPayload.iossNumber = shipment.iossNumber;
    } else if (isHMRCCountry(destinationCountryCode) && shipment.iossNumber) {
      // Security: Removed HMRC number addition debug logging
      labelPayload.iossNumber = shipment.iossNumber;
    } else {
      // Security: Removed IOSS/HMRC number processing debug logging
    }

    // Security: Removed comprehensive ShipEntegra API payload logging that exposed sensitive business data

    // Make the label generation request with enhanced browser-like headers
    const labelResponse = await fetch(serviceConfig.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Origin: "https://publicapi.shipentegra.com",
        Referer: "https://publicapi.shipentegra.com/",
        Connection: "keep-alive",
        DNT: "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(labelPayload),
    });

    if (!labelResponse.ok) {
      // Try to parse JSON error response first
      let errorText: string;
      let errorData: any = null;

      try {
        // Attempt to parse as JSON
        const responseText = await labelResponse.text();
        errorText = responseText;

        try {
          // Try to parse as JSON to extract more detailed error info
          errorData = JSON.parse(responseText);
          // Security: Removed label error response debug logging
        } catch (jsonError) {
          // Security: Removed invalid JSON error debug logging
        }
      } catch (textError) {
        // Fallback if we can't even get the response text
        errorText = `HTTP ${labelResponse.status} - Could not read response body`;
        // Security: Removed label error response debug logging
      }

      // Form a detailed error message that includes all available information
      let detailedErrorMessage = `${labelResponse.status} - ${errorText}`;

      // Extract more specific error details if available in JSON format
      if (errorData) {
        if (
          errorData.status === "fail" &&
          errorData.data &&
          Array.isArray(errorData.data)
        ) {
          // Extract specific error messages from the data array
          const errorMessages = errorData.data
            .map((err: any) => {
              if (err.description)
                return `${err.message || "Error"}: ${err.description}`;
              return err.message || "Unknown error";
            })
            .join("; ");

          if (errorMessages) {
            detailedErrorMessage = `${labelResponse.status} - ${errorMessages}`;
          }
        } else if (errorData.message) {
          // Just use the top-level message if available
          detailedErrorMessage = `${labelResponse.status} - ${errorData.message}`;
        }
      }

      console.error(
        `ShipEntegra label error for shipment ${shipment.id}: ${detailedErrorMessage}`,
      );

      // Update the error message in the database for this shipment
      try {
        const db = await import("../db");
        await db.pool.query(
          "UPDATE shipments SET label_error = $1 WHERE id = $2",
          [detailedErrorMessage, shipment.id],
        );
        // Security: Removed shipment label error update debug logging
      } catch (dbError) {
        // Security: Removed database update error debug logging
      }

      // Check for IOSS/HMRC number errors for EU, UK, and Sweden shipments
      const isIossError =
        (errorText.includes("IOSS") && errorText.includes("required")) ||
        (errorData &&
          errorData.data &&
          Array.isArray(errorData.data) &&
          errorData.data.some(
            (err: any) =>
              err.message === "ERR.IOSS" ||
              (err.description && err.description.includes("IOSS")),
          ));

      const destinationCountryCode = getCountryCode(shipment.receiverCountry);
      const isHmrcCountry = isHMRCCountry(destinationCountryCode);

      if (isIossError) {
        let errorMessageUpdate = detailedErrorMessage;

        // Custom message based on destination country
        if (isHmrcCountry) {
          const countryName = destinationCountryCode === "GB" ? "UK" : "Sweden";
          console.log(
            `Detected missing HMRC number error for ${countryName} shipment.`,
          );
          errorMessageUpdate = `HMRC number is required for ${countryName} shipments. Please add an HMRC number and try again.`;
        } else {
          console.log("Detected missing IOSS number error for EU shipment.");
          errorMessageUpdate =
            "IOSS number is required for European shipments under 150 EUR. Please add an IOSS number and try again.";
        }

        detailedErrorMessage = errorMessageUpdate;

        // Update database with the specific error
        try {
          const db = await import("../db");
          await db.pool.query(
            "UPDATE shipments SET label_error = $1 WHERE id = $2",
            [errorMessageUpdate, shipment.id],
          );
          // Security: Removed user-friendly error message update debug logging
        } catch (dbError) {
          // Security: Removed database error update debug logging
        }
      }

      return {
        success: false,
        message: `Failed to generate label: ${detailedErrorMessage}`,
        orderId,
        duplicateOrderError: false,
      };
    }

    const labelData = (await labelResponse.json()) as ShipentegraLabelResponse;
    // Security: Removed DHL E-Commerce label response debug logging

    if (labelData.status === "success" && labelData.data) {
      // DHL E-Commerce API uses different field names for PNG labels
      const labelUrl =
        (labelData.data as any).carrierLabelUrl || labelData.data.label;
      const trackingNumber = labelData.data.trackingNumber;
      const courier = labelData.data.courier;

      // Security: Removed DHL E-Commerce label creation success debug logging

      if (!labelUrl) {
        // Security: Removed DHL E-Commerce label URL error debug logging
        return {
          success: false,
          message: "No label URL found in DHL E-Commerce response",
          orderId,
          duplicateOrderError: false,
        };
      }

      // Download and convert the label content
      let labelPdfContent: string | undefined;
      try {
        // Check format of the label URL to determine conversion method
        const isPngLabel = labelUrl.includes(".png");
        const isGifLabel = labelUrl.includes(".gif");

        // Security: Removed label format detection debug logging

        if (isPngLabel || isGifLabel) {
          // Security: Removed PNG/GIF to PDF conversion debug logging
          const { downloadAndConvertToPdf } = await import(
            "../utilities/imageConverter"
          );
          labelPdfContent = await downloadAndConvertToPdf(labelUrl);
          // Security: Removed conversion success debug logging
        } else {
          // Download PDF directly using existing utility
          const { downloadPdfFromUrl } = await import("../utilities/pdfUtils");
          labelPdfContent = (await downloadPdfFromUrl(labelUrl)) || undefined;
          if (labelPdfContent) {
            // Security: Removed PDF download success debug logging
          } else {
            // Security: Removed PDF download failure debug logging
          }
        }
      } catch (pdfError) {
        // Security: Removed PDF download error debug logging
      }

      return {
        success: true,
        message:
          "DHL E-Commerce order created and label generated successfully",
        orderId,
        trackingNumber: trackingNumber,
        carrierLabelUrl: labelUrl,
        carrierLabelPdf: labelPdfContent,
        duplicateOrderError: false,
      };
    } else {
      // Security: Removed label generation failure debug logging
      return {
        success: false,
        message: `Failed to generate label: ${labelData.message || "Unknown error"}`,
        orderId,
        duplicateOrderError: false,
      };
    }
  } catch (error) {
    // Security: Removed ECO label processing error debug logging
    return {
      success: false,
      message: `Error processing ECO label: ${error instanceof Error ? error.message : "Unknown error"}`,
      orderId,
      duplicateOrderError: false,
    };
  }
}

/**
 * Get estimated delivery days based on service level
 */
function getEstimatedDeliveryDays(serviceLevel: ServiceLevel): number {
  switch (serviceLevel) {
    case ServiceLevel.STANDARD:
      return 5; // 3-5 business days
    case ServiceLevel.EXPRESS:
      return 2; // 2 business days
    case ServiceLevel.PRIORITY:
      return 1; // Next day delivery
    default:
      return 5;
  }
}

/**
 * Generates fallback price data when the API is unavailable
 * This provides a fallback calculation using the same algorithm and parameters from Turkey
 * Updated to match ShipEntegra price calculation more closely
 */
function generateFallbackPriceData(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  serviceLevel: ServiceLevel,
): any {
  // Security: Removed fallback price calculation warning debug logging

  // All shipments originate from Turkey
  const ORIGIN_COUNTRY = "TR";

  // Calculate volumetric weight
  const volumetricWeight =
    (packageLength * packageWidth * packageHeight) / DIMENSIONAL_FACTOR;

  // Use the greater of actual weight or volumetric weight
  const finalWeight = Math.max(packageWeight, volumetricWeight);

  // Ensure minimum weight requirement is met
  const chargeableWeight = finalWeight < 0.01 ? 0.5 : finalWeight;

  // Base price calculation - Reference scale based on package weight
  let basePrice: number;

  if (chargeableWeight <= 0.5) {
    basePrice = 15.0; // Minimum price for very light packages
  } else if (chargeableWeight <= 2) {
    basePrice = 15.0 + (chargeableWeight - 0.5) * 10; // $10 per kg over 0.5kg
  } else if (chargeableWeight <= 5) {
    basePrice = 30.0 + (chargeableWeight - 2) * 8; // $8 per kg over 2kg
  } else if (chargeableWeight <= 10) {
    basePrice = 54.0 + (chargeableWeight - 5) * 7; // $7 per kg over 5kg
  } else if (chargeableWeight <= 20) {
    basePrice = 89.0 + (chargeableWeight - 10) * 6; // $6 per kg over 10kg
  } else {
    basePrice = 149.0 + (chargeableWeight - 20) * 5; // $5 per kg over 20kg
  }

  // Apply service level multiplier
  const serviceLevelMultiplier =
    serviceLevel === ServiceLevel.STANDARD
      ? 1.0 // Standard shipping
      : serviceLevel === ServiceLevel.EXPRESS
        ? 1.5 // Express - 50% more
        : serviceLevel === ServiceLevel.PRIORITY
          ? 2.0 // Priority - 100% more
          : 1.0; // Default to standard

  // Apply service level multiplier to base price
  basePrice = basePrice * serviceLevelMultiplier;

  // Add fuel surcharge based on weight (varies by weight, heavier = higher percentage)
  const fuelPercentage =
    chargeableWeight <= 5
      ? 0.15
      : chargeableWeight <= 10
        ? 0.17
        : chargeableWeight <= 20
          ? 0.19
          : 0.2;
  const fuelSurcharge = basePrice * fuelPercentage;

  // Total price is base price plus fuel surcharge
  const totalPrice = basePrice + fuelSurcharge;

  // Estimated delivery days based on service level
  const estimatedDeliveryDays = getEstimatedDeliveryDays(serviceLevel);

  // Security: Removed fallback price calculation debug logging

  return {
    basePrice: Math.round(basePrice * 100), // Convert to cents
    fuelCharge: Math.round(fuelSurcharge * 100), // Convert to cents
    totalPrice: Math.round(totalPrice * 100), // Convert to cents
    currency: "USD", // Default currency
    estimatedDeliveryDays: estimatedDeliveryDays, // Delivery estimate
    carrierName: "UPS Express (Estimated)", // Indicate this is an estimate
  };
}
