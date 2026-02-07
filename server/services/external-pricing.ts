/**
 * External Price Service
 *
 * Handles price calculations using external prices stored in the database.
 * Prices are scraped via Chrome extension and approved by admins before activation.
 */

import { db } from "../db";
import {
  externalPrices,
  externalServiceSettings,
  externalScrapeBatches,
  externalPriceAuditLogs,
  type ExternalPrice,
  type ExternalServiceSetting,
  type ExternalScrapeBatch
} from "@shared/schema";
import { eq, and, gte, lte, desc, asc, inArray, sql } from "drizzle-orm";
import { normalizeCountryCode } from "@shared/countries";
import type { MoogShipPriceOption, MoogShipPriceResponse } from "./moogship-pricing";

// Standard weight brackets for external pricing
const WEIGHT_BRACKETS = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5,
  5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30
];

/**
 * Find the matching weight bracket for a given weight
 * Rounds up to the next bracket (standard cargo practice)
 */
export function findMatchingWeight(weight: number): number {
  // Find the first bracket >= the given weight
  const matchingWeight = WEIGHT_BRACKETS.find(w => w >= weight);
  return matchingWeight || 30; // Max out at 30kg
}

/**
 * Get active external prices for a country and weight
 */
export async function getExternalPrices(
  countryCode: string,
  weight: number
): Promise<ExternalPrice[]> {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const matchingWeight = findMatchingWeight(weight);

  console.log(`[ExternalPricing] Looking up prices for ${normalizedCountry}, ${weight}kg → bracket: ${matchingWeight}kg`);

  const prices = await db.select()
    .from(externalPrices)
    .where(and(
      eq(externalPrices.countryCode, normalizedCountry),
      eq(externalPrices.weight, matchingWeight),
      eq(externalPrices.status, "active"),
      eq(externalPrices.isVisibleToCustomers, true)
    ));

  console.log(`[ExternalPricing] Found ${prices.length} active prices`);
  return prices;
}

/**
 * Get active service settings (which carriers/services to show)
 */
export async function getActiveServiceSettings(): Promise<ExternalServiceSetting[]> {
  return db.select()
    .from(externalServiceSettings)
    .where(eq(externalServiceSettings.isActive, true))
    .orderBy(asc(externalServiceSettings.sortOrder));
}

/**
 * Calculate external pricing and return MoogShip format
 */
export async function calculateExternalPricing(
  packageLength: number,
  packageWidth: number,
  packageHeight: number,
  packageWeight: number,
  receiverCountry: string,
  userMultiplier: number = 1.0,
  skipMultiplier: boolean = false,
  userId?: number
): Promise<MoogShipPriceResponse> {
  try {
    const countryCode = normalizeCountryCode(receiverCountry);

    // Calculate volumetric weight
    const volumetricWeight = (packageLength * packageWidth * packageHeight) / 5000;
    const chargeableWeight = Math.max(packageWeight, volumetricWeight);
    const matchingWeight = findMatchingWeight(chargeableWeight);

    console.log(`[ExternalPricing] Calculating prices for ${countryCode}`);
    console.log(`[ExternalPricing] Weight: actual=${packageWeight}kg, volumetric=${volumetricWeight.toFixed(2)}kg, chargeable=${chargeableWeight.toFixed(2)}kg, bracket=${matchingWeight}kg`);

    // Get prices from database
    const prices = await getExternalPrices(countryCode, chargeableWeight);

    if (prices.length === 0) {
      console.log(`[ExternalPricing] No prices found for ${countryCode} at ${matchingWeight}kg`);
      return {
        success: false,
        options: [],
        currency: "USD",
        error: "No external prices available for this destination"
      };
    }

    // Get active service settings
    const serviceSettings = await getActiveServiceSettings();
    const activeServiceKeys = new Set(
      serviceSettings.map(s => `${s.carrier}-${s.service}`)
    );

    // Create a map for display names
    const displayNameMap = new Map<string, string>();
    serviceSettings.forEach(s => {
      displayNameMap.set(`${s.carrier}-${s.service}`, s.displayName);
    });

    // Filter prices to only include active services
    const filteredPrices = prices.filter(p =>
      activeServiceKeys.has(`${p.carrier}-${p.service}`)
    );

    console.log(`[ExternalPricing] After service filtering: ${filteredPrices.length} prices`);

    // Convert to MoogShip price options
    const options: MoogShipPriceOption[] = filteredPrices.map(price => {
      const serviceKey = `${price.carrier}-${price.service}`;
      const displayName = displayNameMap.get(serviceKey) || `MoogShip ${price.carrier} ${price.service}`;

      // Apply multiplier
      const basePrice = price.priceUsd;
      const finalPrice = skipMultiplier
        ? basePrice
        : Math.round(basePrice * userMultiplier);

      return {
        id: `ext-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}-${price.id}`,
        serviceName: `ext-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}`,
        displayName,
        cargoPrice: finalPrice,
        fuelCost: 0, // external prices include fuel
        totalPrice: finalPrice,
        deliveryTime: price.transitDays || "3-7 business days",
        serviceType: price.service.toLowerCase().includes("express") ? "EXPRESS" : "ECO",
        description: `${displayName} shipping service`,
        providerServiceCode: `ext-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}`,
        originalCargoPrice: basePrice,
        originalFuelCost: 0,
        originalTotalPrice: basePrice,
        appliedMultiplier: skipMultiplier ? 1 : userMultiplier,
        isExternalOption: true
      };
    });

    // Sort by price (cheapest first) and limit to 4 options
    const sortedOptions = options
      .sort((a, b) => a.totalPrice - b.totalPrice)
      .slice(0, 4);

    return {
      success: true,
      options: sortedOptions,
      bestOption: sortedOptions[0]?.id,
      currency: "USD"
    };

  } catch (error) {
    console.error("[ExternalPricing] Error calculating prices:", error);
    return {
      success: false,
      options: [],
      currency: "USD",
      error: "Failed to calculate external prices"
    };
  }
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Create a new scrape batch and import prices
 */
export async function createScrapeBatch(
  prices: Array<{
    country: string;
    countryName?: string;
    weight: number;
    carrier: string;
    service: string;
    price: number;
    currency: string;
    transitDays?: string;
    timestamp?: string;
  }>,
  source: string = "chrome-extension"
): Promise<{ batchId: number; pricesImported: number }> {
  // Create batch first
  const [batch] = await db.insert(externalScrapeBatches)
    .values({
      totalPrices: prices.length,
      source,
      status: "pending",
      scrapedAt: new Date()
    })
    .returning();

  console.log(`[ExternalPricing] Created batch #${batch.id} with ${prices.length} prices`);

  // Import prices with batch ID
  let imported = 0;
  for (const p of prices) {
    try {
      // Convert price to USD cents
      let priceUsd = Math.round(p.price * 100); // Assume price is in dollars

      // Normalize country code
      const countryCode = normalizeCountryCode(p.country);
      const countryName = p.countryName || p.country;

      await db.insert(externalPrices)
        .values({
          countryCode,
          countryName,
          weight: p.weight,
          carrier: p.carrier,
          service: p.service || "Standard",
          priceUsd,
          transitDays: p.transitDays || null,
          status: "pending",
          isVisibleToCustomers: false,
          scrapedAt: p.timestamp ? new Date(p.timestamp) : new Date(),
          batchId: batch.id
        });

      imported++;
    } catch (err) {
      console.error(`[ExternalPricing] Failed to import price:`, err);
    }
  }

  // Update batch with actual imported count
  await db.update(externalScrapeBatches)
    .set({ totalPrices: imported })
    .where(eq(externalScrapeBatches.id, batch.id));

  console.log(`[ExternalPricing] Imported ${imported}/${prices.length} prices for batch #${batch.id}`);

  return { batchId: batch.id, pricesImported: imported };
}

/**
 * Get all pending batches
 */
export async function getPendingBatches(): Promise<ExternalScrapeBatch[]> {
  return db.select()
    .from(externalScrapeBatches)
    .where(eq(externalScrapeBatches.status, "pending"))
    .orderBy(desc(externalScrapeBatches.scrapedAt));
}

/**
 * Get all batches with pagination
 */
export async function getBatches(
  limit: number = 50,
  offset: number = 0
): Promise<{ batches: ExternalScrapeBatch[]; total: number }> {
  const [batches, countResult] = await Promise.all([
    db.select()
      .from(externalScrapeBatches)
      .orderBy(desc(externalScrapeBatches.scrapedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(externalScrapeBatches)
  ]);

  return {
    batches,
    total: Number(countResult[0]?.count || 0)
  };
}

/**
 * Get prices for a specific batch
 */
export async function getBatchPrices(batchId: number): Promise<ExternalPrice[]> {
  return db.select()
    .from(externalPrices)
    .where(eq(externalPrices.batchId, batchId))
    .orderBy(asc(externalPrices.countryCode), asc(externalPrices.weight), asc(externalPrices.carrier));
}

/**
 * Approve a batch - activate all prices in the batch (OPTIMIZED with bulk SQL)
 */
export async function approveBatch(
  batchId: number,
  adminUserId: number,
  replaceExisting: boolean = true
): Promise<{ approvedCount: number }> {
  // Get count first
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(externalPrices)
    .where(eq(externalPrices.batchId, batchId));

  const approvedCount = Number(countResult?.count || 0);

  if (approvedCount === 0) {
    throw new Error("No prices found in batch");
  }

  console.log(`[ExternalPricing] Starting bulk approval for batch #${batchId} with ${approvedCount} prices`);

  // Step 1: If replacing existing, disable ALL old active prices that match any price in this batch
  // Using a single bulk update with subquery
  if (replaceExisting) {
    await db.execute(sql`
      UPDATE external_prices
      SET status = 'disabled', is_visible_to_customers = false, updated_at = NOW()
      WHERE status = 'active'
      AND id NOT IN (SELECT id FROM external_prices WHERE batch_id = ${batchId})
      AND (country_code, weight, carrier, service) IN (
        SELECT country_code, weight, carrier, service
        FROM external_prices
        WHERE batch_id = ${batchId}
      )
    `);
  }

  // Step 2: Activate ALL prices in this batch with a single UPDATE
  await db.update(externalPrices)
    .set({
      status: "active",
      isVisibleToCustomers: true,
      approvedAt: new Date(),
      approvedBy: adminUserId,
      updatedAt: new Date()
    })
    .where(eq(externalPrices.batchId, batchId));

  // Step 3: Update batch status
  await db.update(externalScrapeBatches)
    .set({
      status: "approved",
      approvedPrices: approvedCount,
      processedAt: new Date(),
      processedBy: adminUserId
    })
    .where(eq(externalScrapeBatches.id, batchId));

  console.log(`[ExternalPricing] Batch #${batchId} approved: ${approvedCount} prices activated (bulk)`);

  return { approvedCount };
}

/**
 * Reject a batch - mark as rejected without activating
 */
export async function rejectBatch(
  batchId: number,
  adminUserId: number,
  reason?: string
): Promise<void> {
  await db.update(externalScrapeBatches)
    .set({
      status: "rejected",
      processedAt: new Date(),
      processedBy: adminUserId,
      notes: reason
    })
    .where(eq(externalScrapeBatches.id, batchId));

  console.log(`[ExternalPricing] Batch #${batchId} rejected`);
}

/**
 * Get active prices with filtering and pagination
 */
export async function getActivePrices(filters?: {
  countryCode?: string;
  carrier?: string;
  minWeight?: number;
  maxWeight?: number;
  page?: number;
  limit?: number;
}): Promise<{ prices: ExternalPrice[]; total: number; page: number; totalPages: number }> {
  const page = filters?.page || 1;
  const limit = filters?.limit || 100; // Default 100 per page
  const offset = (page - 1) * limit;

  // Build conditions array
  const conditions = [eq(externalPrices.status, "active")];

  if (filters?.countryCode) {
    conditions.push(eq(externalPrices.countryCode, filters.countryCode));
  }
  if (filters?.carrier) {
    conditions.push(eq(externalPrices.carrier, filters.carrier));
  }
  if (filters?.minWeight) {
    conditions.push(gte(externalPrices.weight, filters.minWeight));
  }
  if (filters?.maxWeight) {
    conditions.push(lte(externalPrices.weight, filters.maxWeight));
  }

  // Get total count
  const [countResult] = await db.select({ count: sql<number>`count(*)` })
    .from(externalPrices)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);
  const totalPages = Math.ceil(total / limit);

  // Get paginated results
  const prices = await db.select()
    .from(externalPrices)
    .where(and(...conditions))
    .orderBy(
      asc(externalPrices.countryCode),
      asc(externalPrices.weight),
      asc(externalPrices.carrier)
    )
    .limit(limit)
    .offset(offset);

  return { prices, total, page, totalPages };
}

/**
 * Update a single price
 */
export async function updatePrice(
  priceId: number,
  updates: {
    priceUsd?: number;
    transitDays?: string;
    status?: string;
    isVisibleToCustomers?: boolean;
  },
  adminUserId: number,
  reason?: string
): Promise<ExternalPrice> {
  // Get current price for audit log
  const [currentPrice] = await db.select()
    .from(externalPrices)
    .where(eq(externalPrices.id, priceId));

  if (!currentPrice) {
    throw new Error("Price not found");
  }

  // Update price
  const [updatedPrice] = await db.update(externalPrices)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(externalPrices.id, priceId))
    .returning();

  // Log the update
  await db.insert(externalPriceAuditLogs)
    .values({
      priceId,
      action: "updated",
      previousValue: currentPrice,
      newValue: updatedPrice,
      userId: adminUserId,
      reason
    });

  return updatedPrice;
}

/**
 * Delete a price
 */
export async function deletePrice(
  priceId: number,
  adminUserId: number
): Promise<void> {
  // Get current price for audit log
  const [currentPrice] = await db.select()
    .from(externalPrices)
    .where(eq(externalPrices.id, priceId));

  if (!currentPrice) {
    throw new Error("Price not found");
  }

  // Log deletion before deleting
  await db.insert(externalPriceAuditLogs)
    .values({
      priceId,
      action: "deleted",
      previousValue: currentPrice,
      newValue: null,
      userId: adminUserId
    });

  // Delete the price
  await db.delete(externalPrices)
    .where(eq(externalPrices.id, priceId));
}

// ============================================
// SERVICE SETTINGS FUNCTIONS
// ============================================

/**
 * Get all service settings
 */
export async function getAllServiceSettings(): Promise<ExternalServiceSetting[]> {
  return db.select()
    .from(externalServiceSettings)
    .orderBy(asc(externalServiceSettings.sortOrder), asc(externalServiceSettings.carrier));
}

/**
 * Create or update a service setting
 */
export async function upsertServiceSetting(
  carrier: string,
  service: string,
  displayName: string,
  isActive: boolean = true,
  sortOrder: number = 0
): Promise<ExternalServiceSetting> {
  // Check if setting exists
  const [existing] = await db.select()
    .from(externalServiceSettings)
    .where(and(
      eq(externalServiceSettings.carrier, carrier),
      eq(externalServiceSettings.service, service)
    ));

  if (existing) {
    // Update existing
    const [updated] = await db.update(externalServiceSettings)
      .set({
        displayName,
        isActive,
        sortOrder,
        updatedAt: new Date()
      })
      .where(eq(externalServiceSettings.id, existing.id))
      .returning();
    return updated;
  } else {
    // Create new
    const [created] = await db.insert(externalServiceSettings)
      .values({
        carrier,
        service,
        displayName,
        isActive,
        sortOrder
      })
      .returning();
    return created;
  }
}

/**
 * Toggle service visibility
 */
export async function toggleServiceActive(
  settingId: number,
  isActive: boolean
): Promise<ExternalServiceSetting> {
  const [updated] = await db.update(externalServiceSettings)
    .set({
      isActive,
      updatedAt: new Date()
    })
    .where(eq(externalServiceSettings.id, settingId))
    .returning();

  return updated;
}

/**
 * Get unique countries with active prices
 */
export async function getCountriesWithPrices(): Promise<Array<{ countryCode: string; countryName: string; priceCount: number }>> {
  const result = await db.select({
    countryCode: externalPrices.countryCode,
    countryName: externalPrices.countryName,
    priceCount: sql<number>`count(*)`
  })
    .from(externalPrices)
    .where(eq(externalPrices.status, "active"))
    .groupBy(externalPrices.countryCode, externalPrices.countryName)
    .orderBy(asc(externalPrices.countryName));

  return result.map(r => ({
    countryCode: r.countryCode,
    countryName: r.countryName,
    priceCount: Number(r.priceCount)
  }));
}

/**
 * Get unique carriers with active prices
 */
export async function getCarriersWithPrices(): Promise<string[]> {
  const result = await db.selectDistinct({ carrier: externalPrices.carrier })
    .from(externalPrices)
    .where(eq(externalPrices.status, "active"))
    .orderBy(asc(externalPrices.carrier));

  return result.map(r => r.carrier);
}

/**
 * Get price statistics
 */
export async function getPriceStatistics(): Promise<{
  totalActive: number;
  totalPending: number;
  totalCountries: number;
  totalCarriers: number;
  lastUpdated: Date | null;
}> {
  const [activeCount] = await db.select({ count: sql<number>`count(*)` })
    .from(externalPrices)
    .where(eq(externalPrices.status, "active"));

  const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(externalPrices)
    .where(eq(externalPrices.status, "pending"));

  const countries = await getCountriesWithPrices();
  const carriers = await getCarriersWithPrices();

  const [lastBatch] = await db.select({ scrapedAt: externalScrapeBatches.scrapedAt })
    .from(externalScrapeBatches)
    .where(eq(externalScrapeBatches.status, "approved"))
    .orderBy(desc(externalScrapeBatches.scrapedAt))
    .limit(1);

  return {
    totalActive: Number(activeCount?.count || 0),
    totalPending: Number(pendingCount?.count || 0),
    totalCountries: countries.length,
    totalCarriers: carriers.length,
    lastUpdated: lastBatch?.scrapedAt || null
  };
}

/**
 * Seed default service settings for external pricing.
 * Idempotent - safe to call multiple times (upsert logic).
 */
export async function seedDefaultServiceSettings(): Promise<void> {
  const defaults = [
    { carrier: "UPS", service: "Express", displayName: "MoogShip UPS Express", sortOrder: 1 },
    { carrier: "FEDEX", service: "Express", displayName: "MoogShip FedEx Express", sortOrder: 2 },
    { carrier: "THY", service: "Ekonomi", displayName: "MoogShip Widect Eco", sortOrder: 3 },
    { carrier: "ARAMEX", service: "Express", displayName: "MoogShip Aramex Express", sortOrder: 4 },
  ];

  for (const setting of defaults) {
    await upsertServiceSetting(
      setting.carrier,
      setting.service,
      setting.displayName,
      true,
      setting.sortOrder
    );
  }

  console.log(`[ExternalPricing] Seeded ${defaults.length} default service settings`);
}
