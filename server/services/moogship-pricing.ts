import fetch from "node-fetch";
import { ServiceLevel } from "@shared/schema";
import {
  normalizeCountryCode,
  isEuropeOrUK,
  getDefaultCityForCountry,
} from "@shared/countries";
import {
  calculateAFSTransportPricing,
  type AFSPriceOption,
} from "./afstransport";
import { storage } from "../storage";
import { calculateNavlungoPricing, getNavlungoPrices } from "./navlungo-pricing";

function getDefaultPostalCode(countryCode: string): string {
  const codes: Record<string, string> = {
    US: "10001", // New York
    DE: "10115", // Berlin
    FR: "75001", // Paris
    GB: "SW1A 1AA", // London
    AE: "11001", // Dubai - Valid UAE code
    SA: "11564", // Riyadh
    JO: "11183", // Amman
    EG: "11511", // Cairo
    LB: "1107 2810", // Beirut
    CA: "M5H 2N2", // Toronto
    AU: "2000", // Sydney
    // Add more as needed
  };
  return codes[countryCode] || "11001"; // Default to Dubai for unknown countries
}



// API credentials from environment variables
const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;

const SHIPENTEGRA_TOKEN_URL = "https://publicapi.shipentegra.com/v1/auth/token";
const SHIPENTEGRA_PRICE_URL =
  "https://publicapi.shipentegra.com/v1/tools/calculate/all";

// Cache for access token
let cachedAccessToken: {
  token: string;
  expiresAt: number;
  clientId: string;
  clientSecret: string;
} | null = null;

// MoogShip pricing interfaces
export interface MoogShipPriceOption {
  id: string;
  serviceName: string;
  displayName: string;
  cargoPrice: number;
  fuelCost: number;
  additionalFee?: number;
  totalPrice: number;
  deliveryTime: string;
  serviceType: string;
  description?: string;
  providerServiceCode?: string;
  isAFSOption?: boolean; // Flag to identify AFS options for multiplier handling
}

export interface MoogShipPriceResponse {
  success: boolean;
  options: MoogShipPriceOption[];
  bestOption?: string;
  currency: string;
  error?: string;
  // Raw API responses for logging
  rawApiResponses?: {
    shipentegra?: any;
    aramex?: any;
    afs?: any;
    timestamp: string;
    requestParams: {
      packageLength: number;
      packageWidth: number;
      packageHeight: number;
      packageWeight: number;
      receiverCountry: string;
    };
  };
}

// Shipentegra API response interfaces
interface ShipentegraApiResponse {
  status: string;
  time?: string;
  code?: number;
  data: {
    accessToken?: string;
    expiresIn?: number;
    prices?: Array<{
      serviceType: string;
      clearServiceName: string;
      serviceName: string;
      cargoPrice: number;
      fuelCost: number;
      totalPrice: number;
      additionalDescription?: string;
      fuelMultiplier?: number;
      pricing?: string;
      tooltip?: string;
      discount?: number;
      discountedCargoPrice?: number;
    }>;
  };
  message?: string;
}

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
      totalPrice: number;
      additionalFee?: number;
      serviceType: string;
      serviceName: string;
      clearServiceName?: string;
      additionalDescription?: string;
    }>;
  };
  message?: string;
}

/**
 * Get access token from Shipentegra API
 */
async function getShipentegraAccessToken(): Promise<string | null> {
  try {
    // Check if we have a valid cached token
    if (
      cachedAccessToken &&
      cachedAccessToken.expiresAt > Date.now() &&
      cachedAccessToken.clientId === CLIENT_ID &&
      cachedAccessToken.clientSecret === CLIENT_SECRET
    ) {
      return cachedAccessToken.token;
    }

    // Validate credentials
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return null;
    }

    const payload = {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    };

    const response = await fetch(SHIPENTEGRA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return null;
    }

    const responseData = await response.json();
    const data = responseData as ShipentegraApiResponse;

    if (data.status === "success" && data.data && data.data.accessToken) {
      const token = data.data.accessToken;
      const expiresIn = data.data.expiresIn || 3600;

      // Cache the token
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
 * Calculate price multiplier using HYBRID priority system
 *
 * Priority order:
 * 1. Country rule (if exists for this country) → Use country pricing
 * 2. Weight rule (if exists for this weight range) → Use weight pricing
 * 3. Base multiplier only (fallback)
 *
 * This allows flexible per-country OR per-weight pricing for the same user.
 * Example: USA → weight-based, Germany → fixed 1.3x, UK → weight-based
 *
 * Formula: (Cargo + Fuel) × multiplier + additionalFee
 */
async function calculateCombinedMultiplier(
  userMultiplier: number,
  receiverCountry: string,
  packageWeight: number,
  skipMultiplier: boolean = false,
  userId?: number
): Promise<{
  combinedMultiplier: number;
  countryMultiplier: number | null;
  weightRangeMultiplier: number | null;
  appliedMultipliers: string[];
  countryRuleSource: 'user_specific' | 'global' | null;
  weightRuleSource: 'user_specific' | 'global' | null;
  countryRuleDetails: any;
  weightRuleDetails: any;
  fixedPriceAdjustment: number; // For fixed discounts/markups
  pricingMethod: string;
}> {
  // Default return for admin pricing (skip multiplier)
  if (skipMultiplier) {
    return {
      combinedMultiplier: 1,
      countryMultiplier: null,
      weightRangeMultiplier: null,
      appliedMultipliers: ["admin_pricing"],
      countryRuleSource: null,
      weightRuleSource: null,
      countryRuleDetails: null,
      weightRuleDetails: null,
      fixedPriceAdjustment: 0,
      pricingMethod: 'admin',
    };
  }

  const appliedMultipliers: string[] = [`user_base_${userMultiplier}`];
  let combinedMultiplier = userMultiplier;
  let countryMultiplier: number | null = null;
  let weightRangeMultiplier: number | null = null;
  let countryRuleSource: 'user_specific' | 'global' | null = null;
  let weightRuleSource: 'user_specific' | 'global' | null = null;
  let countryRuleDetails: any = null;
  let weightRuleDetails: any = null;
  let fixedPriceAdjustment = 0; // Positive for markup, negative for discount
  let pricingMethod = 'default'; // Will be set to 'country' or 'weight' based on what's applied

  try {
    const countryCode = normalizeCountryCode(receiverCountry);
    let ruleApplied = false;

    // ============================================
    // HYBRID SYSTEM: Priority 1 - Check Country Rules First
    // ============================================
    if (userId && !ruleApplied) {
      const userCountryRule = await storage.getUserCountryPricingRule(userId, countryCode);
      if (userCountryRule) {
        ruleApplied = true;
        pricingMethod = 'country';
        countryRuleSource = 'user_specific';
        countryRuleDetails = {
          ruleId: userCountryRule.id,
          countryCode: userCountryRule.countryCode,
          priceMultiplier: userCountryRule.priceMultiplier,
          fixedDiscount: userCountryRule.fixedDiscount,
          fixedMarkup: userCountryRule.fixedMarkup,
          notes: userCountryRule.notes,
        };

        if (userCountryRule.priceMultiplier) {
          countryMultiplier = userCountryRule.priceMultiplier;
          // OVERRIDE: Country rule replaces base multiplier entirely (not multiplicative)
          combinedMultiplier = countryMultiplier;
          appliedMultipliers.push(`country_override_${countryCode}_${countryMultiplier}`);
        } else if (userCountryRule.fixedDiscount) {
          fixedPriceAdjustment -= userCountryRule.fixedDiscount;
          appliedMultipliers.push(`country_fixed_discount_${countryCode}_${userCountryRule.fixedDiscount}`);
        } else if (userCountryRule.fixedMarkup) {
          fixedPriceAdjustment += userCountryRule.fixedMarkup;
          appliedMultipliers.push(`country_fixed_markup_${countryCode}_${userCountryRule.fixedMarkup}`);
        }

        console.log(`💰 HYBRID: Country rule found for ${countryCode} → using country pricing`);
      }
    }

    // ============================================
    // HYBRID SYSTEM: Priority 2 - Check Weight Rules (if no country rule)
    // ============================================
    if (userId && !ruleApplied) {
      const userWeightRule = await storage.getUserWeightPricingRule(userId, packageWeight);
      if (userWeightRule) {
        ruleApplied = true;
        pricingMethod = 'weight';
        weightRuleSource = 'user_specific';
        weightRuleDetails = {
          ruleId: userWeightRule.id,
          ruleName: userWeightRule.ruleName,
          minWeight: userWeightRule.minWeight,
          maxWeight: userWeightRule.maxWeight,
          priceMultiplier: userWeightRule.priceMultiplier,
          perKgDiscount: userWeightRule.perKgDiscount,
          perKgMarkup: userWeightRule.perKgMarkup,
          fixedDiscount: userWeightRule.fixedDiscount,
          fixedMarkup: userWeightRule.fixedMarkup,
          notes: userWeightRule.notes,
        };

        if (userWeightRule.priceMultiplier) {
          weightRangeMultiplier = userWeightRule.priceMultiplier;
          // OVERRIDE: Weight rule replaces base multiplier entirely (not multiplicative)
          combinedMultiplier = weightRangeMultiplier;
          appliedMultipliers.push(`weight_override_${weightRangeMultiplier}`);
        } else if (userWeightRule.perKgDiscount) {
          // Per-kg discount: subtract (perKgDiscount × weight) from final price
          fixedPriceAdjustment -= userWeightRule.perKgDiscount * packageWeight;
          appliedMultipliers.push(`weight_per_kg_discount_${userWeightRule.perKgDiscount}`);
        } else if (userWeightRule.perKgMarkup) {
          // Per-kg markup: add (perKgMarkup × weight) to final price
          fixedPriceAdjustment += userWeightRule.perKgMarkup * packageWeight;
          appliedMultipliers.push(`weight_per_kg_markup_${userWeightRule.perKgMarkup}`);
        } else if (userWeightRule.fixedDiscount) {
          fixedPriceAdjustment -= userWeightRule.fixedDiscount;
          appliedMultipliers.push(`weight_fixed_discount_${userWeightRule.fixedDiscount}`);
        } else if (userWeightRule.fixedMarkup) {
          fixedPriceAdjustment += userWeightRule.fixedMarkup;
          appliedMultipliers.push(`weight_fixed_markup_${userWeightRule.fixedMarkup}`);
        }

        console.log(`💰 HYBRID: No country rule for ${countryCode}, weight rule found → using weight pricing`);
      }
    }

    // ============================================
    // HYBRID SYSTEM: Priority 3 - Base Multiplier Only (fallback)
    // ============================================
    if (!ruleApplied) {
      console.log(`💰 HYBRID: No country/weight rules found → using base multiplier only`);
    }

    console.log(`💰 Pricing calculation (HYBRID):
      - User Multiplier: ${userMultiplier}
      - UserId: ${userId || 'none'}
      - Applied Method: ${pricingMethod}
      - Country: ${countryCode}
      - Weight: ${packageWeight}kg
      - Country Multiplier: ${countryMultiplier || 'none'}
      - Weight Multiplier: ${weightRangeMultiplier || 'none'}
      - Combined Multiplier: ${combinedMultiplier}
      - Fixed Adjustment: ${fixedPriceAdjustment} cents
      - Applied: ${appliedMultipliers.join(', ')}`);

  } catch (error) {
    console.error("Error calculating multiplier:", error);
  }

  return {
    combinedMultiplier,
    countryMultiplier,
    weightRangeMultiplier,
    appliedMultipliers,
    countryRuleSource,
    weightRuleSource,
    countryRuleDetails,
    weightRuleDetails,
    fixedPriceAdjustment,
    pricingMethod,
  };
}

/**
 * Calculate shipping prices using multiple providers (Shipentegra + AFS Transport) with MoogShip branding
 */
export async function calculateMoogShipPricing(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  receiverCountry: string,
  userMultiplier: number = 1.0,
  skipMultiplier: boolean = false, // New parameter to skip multiplier for admin pricing
  userId?: number, // Optional: for user-specific pricing rules (overrides global rules)
): Promise<MoogShipPriceResponse> {
  // Initialize raw API responses object
  const rawApiResponses: MoogShipPriceResponse['rawApiResponses'] = {
    timestamp: new Date().toISOString(),
    requestParams: {
      packageLength,
      packageWidth,
      packageHeight,
      packageWeight,
      receiverCountry,
    },
  };

  try {
    // Validate country parameter before proceeding
    if (
      !receiverCountry ||
      typeof receiverCountry !== "string" ||
      receiverCountry.trim() === ""
    ) {
      return { ...generateFallbackPricing(), rawApiResponses };
    }

    // Calculate Shipentegra, AFS Transport, and Aramex pricing in parallel
    const [shipentegraResult, afsResult, aramexResult] =
      await Promise.allSettled([
        calculateShipentegraOptions(
          packageLength,
          packageWidth,
          packageHeight,
          packageWeight,
          receiverCountry,
        ),
        calculateAFSTransportPricing(
          receiverCountry,
          packageWeight,
          packageLength,
          packageWidth,
          packageHeight,
          1.0,
        ), // Pass 1.0 to prevent premature multiplier application
        calculateAramexOptions(
          packageLength,
          packageWidth,
          packageHeight,
          packageWeight,
          receiverCountry,
        ),
      ]);

    console.log(
      "🚀 MULTI-PROVIDER PRICING: API calls completed, processing results...",
    );

    // Capture raw API responses for logging
    rawApiResponses.shipentegra = shipentegraResult.status === "fulfilled"
      ? {
          success: shipentegraResult.value.success,
          optionsCount: shipentegraResult.value.options?.length || 0,
          options: shipentegraResult.value.options?.map(o => ({
            serviceName: o.serviceName,
            displayName: o.displayName,
            cargoPrice: o.cargoPrice,
            fuelCost: o.fuelCost,
            additionalFee: o.additionalFee || 0,
            totalPrice: o.totalPrice,
            serviceType: o.serviceType,
            deliveryTime: o.deliveryTime,
          })),
        }
      : { error: shipentegraResult.reason?.message || 'Request failed' };

    rawApiResponses.aramex = aramexResult.status === "fulfilled"
      ? {
          success: aramexResult.value.success,
          optionsCount: aramexResult.value.options?.length || 0,
          options: aramexResult.value.options?.map(o => ({
            serviceName: o.serviceName,
            displayName: o.displayName,
            cargoPrice: o.cargoPrice,
            fuelCost: o.fuelCost,
            totalPrice: o.totalPrice,
            serviceType: o.serviceType,
            deliveryTime: o.deliveryTime,
          })),
          error: aramexResult.value.error,
        }
      : { error: aramexResult.reason?.message || 'Request failed' };

    rawApiResponses.afs = afsResult.status === "fulfilled"
      ? {
          success: afsResult.value.success,
          optionsCount: afsResult.value.options?.length || 0,
          options: afsResult.value.options?.map(o => ({
            serviceName: o.serviceName,
            displayName: o.displayName,
            cargoPrice: o.cargoPrice,
            fuelCost: o.fuelCost,
            totalPrice: o.totalPrice,
            serviceType: o.serviceType,
            deliveryTime: o.deliveryTime,
          })),
          error: afsResult.value.error,
        }
      : { error: afsResult.reason?.message || 'Request failed' };

    // Debug AFS Transport result status
    if (afsResult.status === "fulfilled") {
      console.log("🟢 AFS Transport result:", afsResult.value.success);
      if (!afsResult.value.success && afsResult.value.error) {
        console.log("🔴 AFS Transport error:", afsResult.value.error);
      }
      console.log(
        "🟢 AFS Transport options count:",
        afsResult.value.options?.length || 0,
      );
    } else {
      console.log("❌ AFS Transport call rejected:", afsResult.reason);
    }

    // Debug Aramex result status
    if (aramexResult.status === "fulfilled") {
      console.log("🟡 Aramex result:", aramexResult.value.success);
      if (!aramexResult.value.success && aramexResult.value.error) {
        console.log("🔴 Aramex error:", aramexResult.value.error);
      }
      console.log(
        "🟡 Aramex options count:",
        aramexResult.value.options?.length || 0,
      );
      console.log("🟡 Aramex full value:", JSON.stringify(aramexResult.value, null, 2));
    } else {
      console.log("❌ Aramex call rejected:", aramexResult.reason);
      console.log("❌ Aramex rejection stack:", aramexResult.reason?.stack);
    }

    // Collect all successful pricing options
    const allOptions: MoogShipPriceOption[] = [];

    // Add Shipentegra options if successful
    if (
      shipentegraResult.status === "fulfilled" &&
      shipentegraResult.value.success
    ) {
      console.log("🔵 SHIPENTEGRA: Adding options to main pricing result:", 
        shipentegraResult.value.options.map(o => ({
          serviceName: o.serviceName,
          displayName: o.displayName,
          totalPrice: o.totalPrice
        }))
      );
      allOptions.push(...shipentegraResult.value.options);
    } else {
      console.log("❌ SHIPENTEGRA: Result not successful or rejected:", 
        shipentegraResult.status === "fulfilled" ? 
        `success: ${shipentegraResult.value.success}` : 
        `rejected: ${shipentegraResult.reason}`
      );
    }

    // AFS Transport disabled - no longer adding AFS options to pricing
    // if (
    //   afsResult.status === "fulfilled" &&
    //   afsResult.value.success &&
    //   afsResult.value.options &&
    //   Array.isArray(afsResult.value.options)
    // ) {
    //   // Only add AFS Transport options for Europe and UK destinations
    //   if (isEuropeOrUK(receiverCountry)) {
    //     // Convert AFS options to MoogShip format - mark as AFS to avoid double multiplication
    //     const afsOptions: MoogShipPriceOption[] = afsResult.value.options.map(
    //       (option) => ({
    //         id: option.id,
    //         serviceName: option.serviceName,
    //         displayName: option.displayName,
    //         cargoPrice: option.cargoPrice,
    //         fuelCost: option.fuelCost,
    //         totalPrice: option.totalPrice,
    //         deliveryTime: option.deliveryTime,
    //         serviceType: option.serviceType,
    //         description: option.description,
    //         providerServiceCode: option.providerServiceCode,
    //         isAFSOption: true, // Mark to prevent double multiplication
    //       }),
    //     );
    //     allOptions.push(...afsOptions);
    //   }
    // } else if (isEuropeOrUK(receiverCountry)) {
    //   // Don't add any fallback - if AFS Transport is unavailable, don't show any AFS services
    //   console.log("🚫 AFS Transport unavailable for", receiverCountry, "- no AFS services will be shown");
    // }

    // Add Aramex options if successful (for all international destinations)
    if (
      aramexResult.status === "fulfilled" &&
      aramexResult.value.success &&
      aramexResult.value.options &&
      Array.isArray(aramexResult.value.options)
    ) {
      // Convert Aramex options to MoogShip format
      const aramexOptions: MoogShipPriceOption[] =
        aramexResult.value.options.map((option) => ({
          id: option.id,
          serviceName: option.serviceName,
          displayName: option.displayName,
          cargoPrice: option.cargoPrice,
          fuelCost: option.fuelCost,
          totalPrice: option.totalPrice,
          deliveryTime: option.deliveryTime,
          serviceType: option.serviceType,
          description: option.description,
          providerServiceCode: option.providerServiceCode,
          isAramexOption: true, // Mark as Aramex for identification
        }));
      allOptions.push(...aramexOptions);
    }

    // If we have options from either provider, return them
    if (allOptions.length > 0) {
      // Calculate combined multiplier (user + country + weight-based)
      // If userId is provided, user-specific pricing rules will override global rules
      const multiplierData = await calculateCombinedMultiplier(
        userMultiplier,
        receiverCountry,
        packageWeight,
        skipMultiplier,
        userId
      );

      // CRITICAL FIX: Apply combined multiplier only when not skipped (for admin pricing)
      const multipliedOptions = allOptions.map((option) => {
        // If skipMultiplier is true (admin pricing), return options without multiplier
        if (skipMultiplier) {
          return {
            ...option,
            // Store original cost prices for reference
            originalCargoPrice: option.cargoPrice,
            originalFuelCost: option.fuelCost,
            originalTotalPrice: option.totalPrice,
            appliedMultiplier: 1, // No multiplier applied
            appliedMultipliers: multiplierData.appliedMultipliers,
            countryRuleSource: multiplierData.countryRuleSource,
            weightRuleSource: multiplierData.weightRuleSource,
            countryRuleDetails: multiplierData.countryRuleDetails,
            weightRuleDetails: multiplierData.weightRuleDetails,
          };
        }

        // Check if this is an AFS or Aramex option using the flags we set
        const isAFSOption = (option as any).isAFSOption === true;
        const isAramexOption = (option as any).isAramexOption === true;

        // Apply pricing: (Cargo + Fuel) × multiplier + additionalFee + fixedAdjustment
        const multipliedCargoPrice = Math.round(option.cargoPrice * multiplierData.combinedMultiplier);
        const multipliedFuelCost = Math.round(option.fuelCost * multiplierData.combinedMultiplier);
        const additionalFee = option.additionalFee || 0;
        const fixedAdjustment = multiplierData.fixedPriceAdjustment || 0;
        // Ensure price doesn't go below zero after adjustments
        const newTotalPrice = Math.max(0, multipliedCargoPrice + multipliedFuelCost + additionalFee + fixedAdjustment);

        console.log("💰 PRICE CALCULATION:", {
          serviceName: option.serviceName,
          originalCargoPrice: option.cargoPrice,
          originalFuelCost: option.fuelCost,
          additionalFee,
          multiplier: multiplierData.combinedMultiplier,
          fixedAdjustment,
          pricingMethod: multiplierData.pricingMethod,
          multipliedCargoPrice,
          multipliedFuelCost,
          finalTotalPrice: newTotalPrice
        });

        return {
          ...option,
          cargoPrice: multipliedCargoPrice,
          fuelCost: multipliedFuelCost,
          additionalFee,
          totalPrice: newTotalPrice,
          // Store original cost prices for admin visibility
          originalCargoPrice: option.cargoPrice,
          originalFuelCost: option.fuelCost,
          originalAdditionalFee: additionalFee,
          originalTotalPrice: option.totalPrice,
          appliedMultiplier: multiplierData.combinedMultiplier,
          appliedMultipliers: multiplierData.appliedMultipliers,
          countryMultiplier: multiplierData.countryMultiplier,
          weightRangeMultiplier: multiplierData.weightRangeMultiplier,
          countryRuleSource: multiplierData.countryRuleSource,
          weightRuleSource: multiplierData.weightRuleSource,
          countryRuleDetails: multiplierData.countryRuleDetails,
          weightRuleDetails: multiplierData.weightRuleDetails,
          fixedPriceAdjustment: fixedAdjustment,
          pricingMethod: multiplierData.pricingMethod,
        };
      });

      // CRITICAL FIX: Deduplicate Express services to prevent multiple selection bug
      const deduplicatedOptions = deduplicateExpressServices(multipliedOptions);

      // Filter to only show the 4 specific pricing options requested by user
      // Priority: Shipentegra UPS Express over AFS UPS Express when both available
      const hasShipentegraUPS = deduplicatedOptions.some(
        (opt) => opt.serviceName === "shipentegra-ups-express",
      );

      const allowedServices = [
        "shipentegra-eco-primary", // PRIMARY ECO: "Shipentegra" ($5.89) - highest priority ECO
        "shipentegra-widect", // FALLBACK ECO: only when primary not available
        "shipentegra-ups-express", // UPS Express service
        "shipentegra-fedex", // FedEx service support
        "shipentegra-worldwide-standard", // Worldwide Standard service
        "EcoAFS", // AFS Transport ECO service for Europe
        "shipentegra-ingiltere-eko-plus", //Ingiltere eco
        // Aramex services (with index patterns that match the actual generation)
        "aramex-ppx-0", // Aramex Priority Parcel Express (MoogShip Aramex Express)
        "aramex-plx-1", // Aramex Priority Letter Express (MoogShip Aramex Letter)  
        "aramex-epx-2", // Aramex Economy Parcel Express (MoogShip Aramex Economy)
        "aramex-gdx-3", // Aramex Ground Express (MoogShip Aramex Ground)
        // Also allow without index for flexibility
        "aramex-ppx", "aramex-plx", "aramex-epx", "aramex-gdx",
        // Prioritize Shipentegra UPS Express when available, fallback to AFS UPS Express
        hasShipentegraUPS ? "shipentegra-ups-express" : "afs-ups-express",
      ];

      const filteredOptions = deduplicatedOptions.filter((option) =>
        allowedServices.includes(option.serviceName),
      );

      // Remove duplicates based on serviceName and displayName, keeping the cheaper option
      const optionMap = new Map();

      for (const option of filteredOptions) {
        const key = `${option.serviceName}-${option.displayName}`;
        const existing = optionMap.get(key);

        // If no existing option or this one is cheaper, keep this one
        if (!existing || option.totalPrice < existing.totalPrice) {
          optionMap.set(key, option);
        }
      }

      const uniqueOptions = Array.from(optionMap.values());

      // Sort by price (cheapest first) and limit to 4 options maximum
      const finalOptions = uniqueOptions
        .sort((a, b) => a.totalPrice - b.totalPrice)
        .slice(0, 4);

      return {
        success: true,
        options: finalOptions,
        bestOption: finalOptions[0]?.id,
        currency: "USD",
        rawApiResponses,
      };
    }

    // If both providers failed, return fallback pricing
    return { ...generateFallbackPricing(), rawApiResponses };
  } catch (error) {
    return { ...generateFallbackPricing(), rawApiResponses };
  }
}

/**
 * Calculate Shipentegra pricing options (existing functionality)
 */
export async function calculateShipentegraOptions(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  receiverCountry: string,
): Promise<MoogShipPriceResponse> {
  console.log("🔵 SHIPENTEGRA PRICING API START:", {
    dimensions: `${packageLength}x${packageWidth}x${packageHeight}cm`,
    weight: `${packageWeight}kg`,
    country: receiverCountry,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get access token
    console.log("🔵 SHIPENTEGRA: Getting access token...");
    const accessToken = await getShipentegraAccessToken();
    if (!accessToken) {
      console.log("❌ SHIPENTEGRA: Failed to get access token");
      return { success: false, options: [], currency: "USD" };
    }
    console.log("✅ SHIPENTEGRA: Access token obtained successfully");

    // Calculate volumetric weight
    const volumetricWeight =
      (packageLength * packageWidth * packageHeight) / 5000;
    const chargeableWeight = Math.max(packageWeight, volumetricWeight);

    console.log("🔵 SHIPENTEGRA: Weight calculations:", {
      actual: `${packageWeight}kg`,
      volumetric: `${volumetricWeight.toFixed(3)}kg`,
      chargeable: `${chargeableWeight.toFixed(3)}kg`,
    });

    // Map destination country to country code
    const destinationCountryCode = normalizeCountryCode(receiverCountry);
    console.log(
      "🔵 SHIPENTEGRA: Country mapping:",
      `${receiverCountry} → ${destinationCountryCode}`,
    );

    // Prepare request payload for /calculate/all endpoint
    const payload = {
      country: destinationCountryCode,
      kgDesi: chargeableWeight,
      isAmazonShipment: 0,
    };

    console.log(
      "🔵 SHIPENTEGRA: API request payload:",
      JSON.stringify(payload, null, 2),
    );

    const response = await fetch(SHIPENTEGRA_PRICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(payload),
    });

    console.log(
      "🔵 SHIPENTEGRA: API response status:",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      console.log("❌ SHIPENTEGRA: API request failed");
      return { success: false, options: [], currency: "USD" };
    }

    const responseData =
      (await response.json()) as ShipentegraMultiCarrierResponse;
    console.log(
      "🔵 SHIPENTEGRA: Raw API response services:",
      JSON.stringify(
        responseData.data?.prices?.map((p) => ({
          serviceName: p.serviceName,
          clearServiceName: p.clearServiceName,
          totalPrice: p.totalPrice,
        })),
        null,
        2,
      ),
    );

    const typedResponse = responseData as ShipentegraMultiCarrierResponse;

    if (typedResponse.status !== "success") {
      console.log(
        "❌ SHIPENTEGRA: API response status not success:",
        typedResponse.status,
      );
      return { success: false, options: [], currency: "USD" };
    }

    console.log(
      "🔵 SHIPENTEGRA: Raw pricing options count:",
      typedResponse.data?.prices?.length || 0,
    );

    // Transform response to MoogShip branded options
    const transformedResult = transformToMoogShipOptions(typedResponse);
    console.log(
      "🔵 SHIPENTEGRA: Transformed result:",
      JSON.stringify(
        transformedResult.options.map((o) => ({
          displayName: o.displayName,
          serviceName: o.serviceName,
          totalPrice: o.totalPrice,
        })),
        null,
        2,
      ),
    );

    // Check specifically for UK service
    const ukService = typedResponse.data?.prices?.find(
      (p) =>
        p.serviceName === "shipentegra-ingiltere-eko-plus" ||
        (p.serviceName && p.serviceName.toLowerCase().includes("ingiltere")),
    );
    if (ukService) {
      console.log("🇬🇧 UK SERVICE FOUND in raw data:", {
        serviceName: ukService.serviceName,
        clearServiceName: ukService.clearServiceName,
        totalPrice: ukService.totalPrice,
      });
    } else {
      console.log("❌ UK SERVICE NOT FOUND in raw ShipEntegra data");
    }

    return transformedResult;
  } catch (error) {
    // Security: Removed pricing calculation error debug logging
    return { success: false, options: [], currency: "USD" };
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
    return generateFallbackPricing();
  }

  // Log all raw services before filtering
  console.log("🔍 RAW SHIPENTEGRA SERVICES BEFORE FILTERING:", 
    prices.map(p => ({
      serviceName: p.serviceName,
      clearServiceName: p.clearServiceName,
      totalPrice: p.totalPrice
    }))
  );

  // Filter for specific services: Eco, UPS, Widect, and FedEx
  const targetServices = ["eco", "ups", "widect", "fedex", "ingiltere"];
  const filteredPrices = prices.filter((price) => {
    const serviceName = (price.serviceName || "").toLowerCase();
    const clearName = (price.clearServiceName || "").toLowerCase();
    const isIncluded = targetServices.some(
      (target) =>
        serviceName.includes(target) ||
        clearName.includes(target) ||
        serviceName === "shipentegra",
    );
    
    // Log UK service filtering specifically
    if (serviceName.includes("ingiltere") || clearName.includes("ingiltere")) {
      console.log("🇬🇧 UK SERVICE FILTERING:", {
        serviceName: price.serviceName,
        clearServiceName: price.clearServiceName,
        isIncluded,
        totalPrice: price.totalPrice
      });
    }
    
    return isIncluded;
  });

  console.log("🔍 FILTERED SHIPENTEGRA SERVICES AFTER FILTERING:", 
    filteredPrices.map(p => ({
      serviceName: p.serviceName,
      clearServiceName: p.clearServiceName,
      totalPrice: p.totalPrice
    }))
  );

  // Prioritize specific services with proper ECO service priority
  const prioritizedPrices: Array<(typeof prices)[0]> = [];

  // 1. Add UPS Express service first (highest priority)
  const upsExpress = filteredPrices.find(
    (p) =>
      p.serviceName === "shipentegra-ups-express" ||
      (p.serviceName &&
        p.serviceName.toLowerCase().includes("ups") &&
        p.serviceName.toLowerCase().includes("express")),
  );
  if (upsExpress) {
    prioritizedPrices.push(upsExpress);
  }

  // 2. Add FedEx service (second priority)
  const fedex = filteredPrices.find(
    (p) =>
      p.serviceName === "shipentegra-fedex" ||
      (p.serviceName && p.serviceName.toLowerCase().includes("fedex")),
  );
  if (fedex && !prioritizedPrices.includes(fedex)) {
    prioritizedPrices.push(fedex);
  }

  // 3. Add PRIMARY ECO service (Shipentegra $5.89) - highest priority for ECO
  const primaryEco = filteredPrices.find(
    (p) => p.serviceName === "Shipentegra" && p.serviceType === "ECO",
  );
  if (primaryEco && !prioritizedPrices.includes(primaryEco)) {
    prioritizedPrices.push(primaryEco);
  }

  // 4. Add FALLBACK ECO service (shipentegra-widect $9.89) - only if primary ECO not available
  if (!primaryEco) {
    const widect = filteredPrices.find(
      (p) =>
        p.serviceName === "shipentegra-widect" ||
        (p.serviceName && p.serviceName.toLowerCase().includes("widect")),
    );
    if (widect && !prioritizedPrices.includes(widect)) {
      prioritizedPrices.push(widect);
    }
  }

  // 5. Add Ingiltere Eco Plus for UK
  const ingiltereEcoPlus = filteredPrices.find(
    (p) => p.serviceName === "shipentegra-ingiltere-eko-plus",
  );
  if (ingiltereEcoPlus && !prioritizedPrices.includes(ingiltereEcoPlus)) {
    prioritizedPrices.push(ingiltereEcoPlus);
  }

  console.log(
    "🔧 PRIORITIZED SERVICES:",
    prioritizedPrices.map((p) => ({
      serviceName: p.serviceName,
      displayName: p.displayName,
    })),
  );

  // If we don't have enough prioritized services, fall back to cheapest available
  const additionalPrices = prices.filter((p) => !prioritizedPrices.includes(p));
  console.log(
    "🔧 ADDITIONAL SERVICES:",
    additionalPrices.map((p) => ({
      serviceName: p.serviceName,
      displayName: p.displayName,
    })),
  );

  const finalPrices =
    prioritizedPrices.length >= 3
      ? prioritizedPrices.slice(0, 4)
      : [...prioritizedPrices, ...additionalPrices].slice(0, 4);

  console.log(
    "🔧 FINAL SERVICES FOR TRANSFORMATION:",
    finalPrices.map((p) => ({
      serviceName: p.serviceName,
      displayName: p.displayName,
    })),
  );

  // Transform to MoogShip branded options
  const moogShipOptions: MoogShipPriceOption[] = finalPrices.map(
    (price, index) => {
      // Extract delivery time from Turkish description
      const deliveryMatch = price.additionalDescription?.match(
        /(\d+-\d+\s*iş\s*günü)/,
      );
      const deliveryTime = deliveryMatch
        ? deliveryMatch[1].replace("iş günü", "business days")
        : "2-5 business days";

      // Map service names to exact display names as requested
      let displayName = "";
      let serviceName = price.serviceName || "";

      // Normalize service name to handle API inconsistencies
      const normalizedServiceName = serviceName.toLowerCase();

      console.log(
        "🔧 SERVICE MAPPING: Original serviceName:",
        serviceName,
        "Normalized:",
        normalizedServiceName,
      );

      // Use exact service name mapping based on user specifications with ECO priority
      if (serviceName === "Shipentegra" && price.serviceType === "ECO") {
        // PRIMARY ECO SERVICE: "Shipentegra" ($5.89) - this is our main MoogShip ECO
        displayName = "MoogShip ECO";
        serviceName = "shipentegra-eco-primary"; // Use unique service name for primary ECO
      } else if (
        serviceName === "shipentegra-widect" ||
        normalizedServiceName.includes("widect")
      ) {
        // FALLBACK ECO SERVICE: "shipentegra-widect" ($9.89) - only when primary ECO not available
        displayName = "MoogShip-Eco";
        serviceName = "shipentegra-widect";
      } else if (
        serviceName === "shipentegra-ingiltere-eko-plus" ||
        normalizedServiceName.includes("ingiltere-eko-plus")
      ) {
        displayName = "MoogShip UK Eco";
        serviceName = "shipentegra-ingiltere-eko-plus";
      } else if (
        serviceName === "shipentegra-ups-express" ||
        (normalizedServiceName.includes("ups") &&
          normalizedServiceName.includes("express"))
      ) {
        displayName = "MoogShip UPS Express";
        serviceName = "shipentegra-ups-express";
      } else if (
        serviceName === "shipentegra-fedex" ||
        normalizedServiceName.includes("fedex")
      ) {
        displayName = "MoogShip FedEx";
        serviceName = "shipentegra-fedex";
      } else if (
        serviceName === "shipentegra-worldwide-standard" ||
        normalizedServiceName.includes("worldwide-standard")
      ) {
        displayName = "MoogShip Worldwide Standard";
        serviceName = "shipentegra-worldwide-standard";
      } else if (
        normalizedServiceName.includes("amerika") ||
        normalizedServiceName.includes("eko") ||
        (normalizedServiceName === "shipentegra" && price.serviceType !== "ECO")
      ) {
        // Handle other "Shipentegra" variants and eco services
        console.log(
          "🔧 SERVICE MAPPING: Mapping eco variant to fallback ECO service:",
          serviceName,
        );
        displayName = "MoogShip-Eco";
        serviceName = "shipentegra-widect";
      } else {
        // For other services, map them to one of the allowed services based on service type
        console.log(
          "🔧 SERVICE MAPPING: Fallback mapping for unknown service:",
          serviceName,
        );
        if (price.serviceType?.toLowerCase().includes("express")) {
          displayName = "MoogShip UPS Express";
          serviceName = "shipentegra-ups-express";
        } else if (normalizedServiceName.includes("fedex")) {
          displayName = "MoogShip FedEx";
          serviceName = "shipentegra-fedex";
        } else {
          displayName = "MoogShip-Eco";
          serviceName = "shipentegra-widect";
        }
      }

      console.log("🔧 SERVICE MAPPING: Final result:", {
        original: price.serviceName,
        final: serviceName,
        display: displayName,
      });

      // Determine service type based on the transformed name for the specific services
      let serviceType = "";
      if (displayName.toLowerCase().includes("eco")) {
        serviceType = "ECO";
      } else if (displayName.toLowerCase().includes("ups")) {
        serviceType = "EXPRESS"; // UPS services are express level
      } else if (displayName.toLowerCase().includes("fedex")) {
        serviceType = "EXPRESS"; // FedEx services are express level
      } else if (
        serviceName === "shipentegra-widect" ||
        displayName === "MoogShip-Eco"
      ) {
        serviceType = "ECO"; // shipentegra-widect maps to ECO service type
      } else if (displayName.toLowerCase().includes("express")) {
        serviceType = "EXPRESS";
      } else if (displayName.toLowerCase().includes("standard")) {
        serviceType = "STANDARD";
      } else {
        serviceType =
          index === 0 ? "ECO" : index === 1 ? "EXPRESS" : "STANDARD";
      }

      // Extract additionalFee if present
      const additionalFee = price.additionalFee || 0;
      
      if (additionalFee > 0) {
        console.log("💰 ADDITIONAL FEE FOUND:", {
          serviceName: serviceName,
          additionalFee: additionalFee,
          additionalFeeCents: Math.round(additionalFee * 100)
        });
      }
      
      return {
        id: `moogship-${serviceName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}-${serviceType.toLowerCase()}`,
        serviceName: serviceName, // Use the mapped serviceName for filtering
        displayName,
        cargoPrice: Math.round(price.cargoPrice * 100), // Convert to cents
        fuelCost: Math.round(price.fuelCost * 100), // Convert to cents
        additionalFee: Math.round(additionalFee * 100), // Convert to cents
        totalPrice: Math.round(price.totalPrice * 100), // Convert to cents
        deliveryTime,
        serviceType,
        description: `${displayName} shipping service with ${deliveryTime} delivery`,
      };
    },
  );

  return {
    success: true,
    options: moogShipOptions,
    bestOption: moogShipOptions[0]?.id,
    currency: "USD",
  };
}

/**
 * Deduplicate Express services to prevent multiple selection bug
 * This ensures proper Express service selection, keeping UPS Express, FedEx, and other distinct services
 */
function deduplicateExpressServices(
  options: MoogShipPriceOption[],
): MoogShipPriceOption[] {
  // Get unique service types based on display name - keep UPS Express, FedEx, and others separate
  const uniqueServices = new Map<string, MoogShipPriceOption>();

  options.forEach((opt) => {
    const displayName = opt.displayName.toLowerCase();
    const serviceType = opt.serviceType;

    // Create unique keys for different service types
    let serviceKey = "";
    if (displayName.includes("ups")) {
      serviceKey = "ups-express";
    } else if (displayName.includes("fedex")) {
      serviceKey = "fedex";
    } else if (displayName.includes("gls") && displayName.includes("express")) {
      serviceKey = "gls-express";
    } else if (displayName.includes("eco")) {
      serviceKey = "eco";
    } else if (displayName.includes("standard")) {
      serviceKey = "standard";
    } else {
      serviceKey = displayName.replace(/\s+/g, "-");
    }

    // Only add if we haven't seen this service type before, or if it's a better option
    if (
      !uniqueServices.has(serviceKey) ||
      uniqueServices.get(serviceKey)!.totalPrice > opt.totalPrice
    ) {
      uniqueServices.set(serviceKey, opt);
    }
  });

  const result = Array.from(uniqueServices.values());
  console.log(
    "✅ Deduplicated services:",
    result.map((s) => s.displayName),
  );

  return result;
}

/**
 * Calculate Aramex pricing options
 */
async function calculateAramexOptions(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  receiverCountry: string,
): Promise<MoogShipPriceResponse> {
  console.log("🟡 ARAMEX PRICING API START:", {
    dimensions: `${packageLength}x${packageWidth}x${packageHeight}cm`,
    weight: `${packageWeight}kg`,
    country: receiverCountry,
    timestamp: new Date().toISOString(),
  });

  try {
    // Import and use the Aramex rate calculation function
    console.log("🔶 ARAMEX: Importing calculateAramexRates function...");
    const { calculateAramexRates } = await import("./aramex");
    console.log("🔶 ARAMEX: Successfully imported calculateAramexRates");

    const requestPayload = {
      originAddress: {
        city: "Istanbul",
        countryCode: "TR",
        postalCode: "34394",
        address: "MoogShip Logistics Center",
      },
      destinationAddress: {
        city: getDefaultCityForCountry(receiverCountry),
        countryCode: normalizeCountryCode(receiverCountry),
        postalCode: getDefaultPostalCode(receiverCountry),
        address: "Customer Address",
      },
      weightKg: packageWeight,
      numberOfPieces: 1,
      dimensions: {
        length: packageLength,
        width: packageWidth,
        height: packageHeight
      }
    };

    console.log(
      "🔶 ARAMEX: Calling calculateAramexRates with payload:",
      JSON.stringify(requestPayload, null, 2),
    );

    const rates = await calculateAramexRates(requestPayload);

    console.log("🔶 ARAMEX: Received rates array:", rates);
    console.log("🔶 ARAMEX: Rates array length:", rates.length);

    if (rates.length === 0) {
      console.log("❌ ARAMEX: No rates returned from API");
      return { success: false, options: [], currency: "USD" };
    }

    console.log(`✅ ARAMEX: Found ${rates.length} rates`);

    // Convert Aramex rates to MoogShip format
    const moogShipOptions: MoogShipPriceOption[] = rates.map((rate, index) => {
      const deliveryTime = `${rate.estimatedDays} business days`;
      
      // Map Aramex service codes to customer-facing display names (PPX ONLY)
      const getDisplayName = (serviceCode: string): string => {
        const serviceNames: Record<string, string> = {
          'PPX': 'MoogShip Aramex Express', // Priority Parcel Express ONLY
          // Note: All other services excluded per user request
        };
        return serviceNames[serviceCode] || 'MoogShip Aramex';
      };

      return {
        id: `aramex-${rate.serviceCode.toLowerCase()}-${index}`,
        serviceName: `aramex-${rate.serviceCode.toLowerCase()}`,
        displayName: getDisplayName(rate.serviceCode),
        cargoPrice: Math.round(rate.amount * 100), // Convert to cents
        fuelCost: 0, // Aramex includes fuel in total price
        totalPrice: Math.round(rate.amount * 100), // Convert to cents
        deliveryTime,
        serviceType: rate.serviceType,
        description: `${getDisplayName(rate.serviceCode)} shipping service with ${deliveryTime} delivery`,
        providerServiceCode: `aramex-${rate.serviceCode.toLowerCase()}`,
      };
    });

    return {
      success: true,
      options: moogShipOptions,
      bestOption: moogShipOptions[0]?.id,
      currency: "USD",
    };
  } catch (error: any) {
    console.error("❌ ARAMEX PRICING ERROR:", error);
    console.error("❌ ARAMEX PRICING ERROR STACK:", error.stack);
    return {
      success: false,
      options: [],
      currency: "USD",
      error: error.message,
    };
  }
}

/**
 * Generate fallback pricing when API is unavailable
 */
function generateFallbackPricing(): MoogShipPriceResponse {
  // NO FALLBACK PRICING: When services are unavailable, return empty options
  // Users should only see authentic pricing from operational APIs
  return {
    success: false,
    options: [],
    currency: "USD",
  };
}

// ============================================
// NAVLUNGO INTEGRATION
// ============================================

/**
 * Check if Navlungo prices are available for a specific route
 */
export async function hasNavlungoPrices(
  countryCode: string,
  weight: number
): Promise<boolean> {
  try {
    const prices = await getNavlungoPrices(countryCode, weight);
    return prices.length > 0;
  } catch (error) {
    console.error("[MoogShip] Error checking Navlungo prices:", error);
    return false;
  }
}

/**
 * Calculate pricing with Navlungo as primary source, falling back to Shipentegra
 *
 * Priority:
 * 1. Check Navlungo prices first
 * 2. If no Navlungo prices available, use existing Shipentegra/Aramex pricing
 *
 * @param useNavlungo - Force Navlungo usage (default: true when available)
 */
export async function calculateCombinedPricing(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  receiverCountry: string,
  userMultiplier: number = 1.0,
  skipMultiplier: boolean = false,
  userId?: number,
  useNavlungo: boolean = true
): Promise<MoogShipPriceResponse> {
  const countryCode = normalizeCountryCode(receiverCountry);

  // Calculate volumetric weight
  const volumetricWeight = (packageLength * packageWidth * packageHeight) / 5000;
  const chargeableWeight = Math.max(packageWeight, volumetricWeight);

  console.log(`[MoogShip] Combined pricing for ${countryCode}, ${chargeableWeight.toFixed(2)}kg (useNavlungo: ${useNavlungo})`);

  // Check Navlungo first if enabled
  if (useNavlungo) {
    const navlungoAvailable = await hasNavlungoPrices(countryCode, chargeableWeight);

    if (navlungoAvailable) {
      console.log(`[MoogShip] Using Navlungo prices for ${countryCode}`);
      const navlungoResult = await calculateNavlungoPricing(
        packageLength,
        packageWidth,
        packageHeight,
        packageWeight,
        receiverCountry,
        userMultiplier,
        skipMultiplier,
        userId
      );

      if (navlungoResult.success && navlungoResult.options.length > 0) {
        return {
          ...navlungoResult,
          rawApiResponses: {
            navlungo: {
              success: true,
              optionsCount: navlungoResult.options.length,
              options: navlungoResult.options
            },
            timestamp: new Date().toISOString(),
            requestParams: {
              packageLength,
              packageWidth,
              packageHeight,
              packageWeight,
              receiverCountry,
            }
          }
        };
      }
    }

    console.log(`[MoogShip] No Navlungo prices for ${countryCode}, falling back to Shipentegra`);
  }

  // Fall back to existing pricing (Shipentegra + Aramex)
  return calculateMoogShipPricing(
    packageLength,
    packageWidth,
    packageHeight,
    packageWeight,
    receiverCountry,
    userMultiplier,
    skipMultiplier,
    userId
  );
}

/**
 * Get pricing source for a specific route
 * Returns 'navlungo' if Navlungo prices available, 'shipentegra' otherwise
 */
export async function getPricingSource(
  countryCode: string,
  weight: number
): Promise<'navlungo' | 'shipentegra'> {
  const hasNavlungo = await hasNavlungoPrices(countryCode, weight);
  return hasNavlungo ? 'navlungo' : 'shipentegra';
}
