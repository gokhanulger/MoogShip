/**
 * External Price Service
 *
 * Handles price calculations using external prices stored in the database.
 * Prices are scraped via Chrome extension and approved by admins before activation.
 */

import { db } from "../db";
import {
  navlungoPrices,
  navlungoServiceSettings,
  navlungoScrapeBatches,
  navlungoPriceAuditLogs,
  type NavlungoPrice,
  type NavlungoServiceSetting,
  type NavlungoScrapeBatch
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
export async function getNavlungoPrices(
  countryCode: string,
  weight: number
): Promise<NavlungoPrice[]> {
  const normalizedCountry = normalizeCountryCode(countryCode);
  const matchingWeight = findMatchingWeight(weight);

  console.log(`[ExternalPricing] Looking up prices for ${normalizedCountry}, ${weight}kg → bracket: ${matchingWeight}kg`);

  const prices = await db.select()
    .from(navlungoPrices)
    .where(and(
      eq(navlungoPrices.countryCode, normalizedCountry),
      eq(navlungoPrices.weight, matchingWeight),
      eq(navlungoPrices.status, "active"),
      eq(navlungoPrices.isVisibleToCustomers, true)
    ));

  console.log(`[ExternalPricing] Found ${prices.length} active prices`);
  return prices;
}

/**
 * Get active service settings (which carriers/services to show)
 */
export async function getActiveServiceSettings(): Promise<NavlungoServiceSetting[]> {
  return db.select()
    .from(navlungoServiceSettings)
    .where(eq(navlungoServiceSettings.isActive, true))
    .orderBy(asc(navlungoServiceSettings.sortOrder));
}

/**
 * Calculate external pricing and return MoogShip format
 */
export async function calculateNavlungoPricing(
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
    const prices = await getNavlungoPrices(countryCode, chargeableWeight);

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
        id: `navlungo-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}-${price.id}`,
        serviceName: `navlungo-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}`,
        displayName,
        cargoPrice: finalPrice,
        fuelCost: 0, // external prices include fuel
        totalPrice: finalPrice,
        deliveryTime: price.transitDays || "3-7 business days",
        serviceType: price.service.toLowerCase().includes("express") ? "EXPRESS" : "ECO",
        description: `${displayName} shipping service`,
        providerServiceCode: `navlungo-${price.carrier.toLowerCase()}-${price.service.toLowerCase()}`,
        originalCargoPrice: basePrice,
        originalFuelCost: 0,
        originalTotalPrice: basePrice,
        appliedMultiplier: skipMultiplier ? 1 : userMultiplier,
        isNavlungoOption: true
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
  const [batch] = await db.insert(navlungoScrapeBatches)
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

      await db.insert(navlungoPrices)
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
  await db.update(navlungoScrapeBatches)
    .set({ totalPrices: imported })
    .where(eq(navlungoScrapeBatches.id, batch.id));

  console.log(`[ExternalPricing] Imported ${imported}/${prices.length} prices for batch #${batch.id}`);

  return { batchId: batch.id, pricesImported: imported };
}

/**
 * Get all pending batches
 */
export async function getPendingBatches(): Promise<NavlungoScrapeBatch[]> {
  return db.select()
    .from(navlungoScrapeBatches)
    .where(eq(navlungoScrapeBatches.status, "pending"))
    .orderBy(desc(navlungoScrapeBatches.scrapedAt));
}

/**
 * Get all batches with pagination
 */
export async function getBatches(
  limit: number = 50,
  offset: number = 0
): Promise<{ batches: NavlungoScrapeBatch[]; total: number }> {
  const [batches, countResult] = await Promise.all([
    db.select()
      .from(navlungoScrapeBatches)
      .orderBy(desc(navlungoScrapeBatches.scrapedAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` })
      .from(navlungoScrapeBatches)
  ]);

  return {
    batches,
    total: Number(countResult[0]?.count || 0)
  };
}

/**
 * Get prices for a specific batch
 */
export async function getBatchPrices(batchId: number): Promise<NavlungoPrice[]> {
  return db.select()
    .from(navlungoPrices)
    .where(eq(navlungoPrices.batchId, batchId))
    .orderBy(asc(navlungoPrices.countryCode), asc(navlungoPrices.weight), asc(navlungoPrices.carrier));
}

/**
 * Approve a batch - activate all prices in the batch
 */
export async function approveBatch(
  batchId: number,
  adminUserId: number,
  replaceExisting: boolean = true
): Promise<{ approvedCount: number }> {
  const batchPrices = await getBatchPrices(batchId);

  if (batchPrices.length === 0) {
    throw new Error("No prices found in batch");
  }

  let approvedCount = 0;

  for (const price of batchPrices) {
    // If replacing existing, disable old prices for same route
    if (replaceExisting) {
      await db.update(navlungoPrices)
        .set({
          status: "disabled",
          isVisibleToCustomers: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(navlungoPrices.countryCode, price.countryCode),
          eq(navlungoPrices.weight, price.weight),
          eq(navlungoPrices.carrier, price.carrier),
          eq(navlungoPrices.service, price.service),
          eq(navlungoPrices.status, "active")
        ));
    }

    // Activate the new price
    await db.update(navlungoPrices)
      .set({
        status: "active",
        isVisibleToCustomers: true,
        approvedAt: new Date(),
        approvedBy: adminUserId,
        updatedAt: new Date()
      })
      .where(eq(navlungoPrices.id, price.id));

    // Log the approval
    await db.insert(navlungoPriceAuditLogs)
      .values({
        priceId: price.id,
        action: "approved",
        previousValue: { status: price.status },
        newValue: { status: "active" },
        userId: adminUserId,
        reason: `Batch #${batchId} approved`
      });

    approvedCount++;
  }

  // Update batch status
  await db.update(navlungoScrapeBatches)
    .set({
      status: "approved",
      approvedPrices: approvedCount,
      processedAt: new Date(),
      processedBy: adminUserId
    })
    .where(eq(navlungoScrapeBatches.id, batchId));

  console.log(`[ExternalPricing] Batch #${batchId} approved: ${approvedCount} prices activated`);

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
  await db.update(navlungoScrapeBatches)
    .set({
      status: "rejected",
      processedAt: new Date(),
      processedBy: adminUserId,
      notes: reason
    })
    .where(eq(navlungoScrapeBatches.id, batchId));

  console.log(`[ExternalPricing] Batch #${batchId} rejected`);
}

/**
 * Get all active prices with filtering
 */
export async function getActivePrices(filters?: {
  countryCode?: string;
  carrier?: string;
  minWeight?: number;
  maxWeight?: number;
}): Promise<NavlungoPrice[]> {
  let query = db.select()
    .from(navlungoPrices)
    .where(eq(navlungoPrices.status, "active"));

  // Note: For dynamic filtering, we'd need to build the where clause dynamically
  // For now, we'll filter in memory for simplicity
  const prices = await query.orderBy(
    asc(navlungoPrices.countryCode),
    asc(navlungoPrices.weight),
    asc(navlungoPrices.carrier)
  );

  // Apply filters in memory
  return prices.filter(p => {
    if (filters?.countryCode && p.countryCode !== filters.countryCode) return false;
    if (filters?.carrier && p.carrier !== filters.carrier) return false;
    if (filters?.minWeight && p.weight < filters.minWeight) return false;
    if (filters?.maxWeight && p.weight > filters.maxWeight) return false;
    return true;
  });
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
): Promise<NavlungoPrice> {
  // Get current price for audit log
  const [currentPrice] = await db.select()
    .from(navlungoPrices)
    .where(eq(navlungoPrices.id, priceId));

  if (!currentPrice) {
    throw new Error("Price not found");
  }

  // Update price
  const [updatedPrice] = await db.update(navlungoPrices)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(navlungoPrices.id, priceId))
    .returning();

  // Log the update
  await db.insert(navlungoPriceAuditLogs)
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
    .from(navlungoPrices)
    .where(eq(navlungoPrices.id, priceId));

  if (!currentPrice) {
    throw new Error("Price not found");
  }

  // Log deletion before deleting
  await db.insert(navlungoPriceAuditLogs)
    .values({
      priceId,
      action: "deleted",
      previousValue: currentPrice,
      newValue: null,
      userId: adminUserId
    });

  // Delete the price
  await db.delete(navlungoPrices)
    .where(eq(navlungoPrices.id, priceId));
}

// ============================================
// SERVICE SETTINGS FUNCTIONS
// ============================================

/**
 * Get all service settings
 */
export async function getAllServiceSettings(): Promise<NavlungoServiceSetting[]> {
  return db.select()
    .from(navlungoServiceSettings)
    .orderBy(asc(navlungoServiceSettings.sortOrder), asc(navlungoServiceSettings.carrier));
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
): Promise<NavlungoServiceSetting> {
  // Check if setting exists
  const [existing] = await db.select()
    .from(navlungoServiceSettings)
    .where(and(
      eq(navlungoServiceSettings.carrier, carrier),
      eq(navlungoServiceSettings.service, service)
    ));

  if (existing) {
    // Update existing
    const [updated] = await db.update(navlungoServiceSettings)
      .set({
        displayName,
        isActive,
        sortOrder,
        updatedAt: new Date()
      })
      .where(eq(navlungoServiceSettings.id, existing.id))
      .returning();
    return updated;
  } else {
    // Create new
    const [created] = await db.insert(navlungoServiceSettings)
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
): Promise<NavlungoServiceSetting> {
  const [updated] = await db.update(navlungoServiceSettings)
    .set({
      isActive,
      updatedAt: new Date()
    })
    .where(eq(navlungoServiceSettings.id, settingId))
    .returning();

  return updated;
}

/**
 * Get unique countries with active prices
 */
export async function getCountriesWithPrices(): Promise<Array<{ countryCode: string; countryName: string; priceCount: number }>> {
  const result = await db.select({
    countryCode: navlungoPrices.countryCode,
    countryName: navlungoPrices.countryName,
    priceCount: sql<number>`count(*)`
  })
    .from(navlungoPrices)
    .where(eq(navlungoPrices.status, "active"))
    .groupBy(navlungoPrices.countryCode, navlungoPrices.countryName)
    .orderBy(asc(navlungoPrices.countryName));

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
  const result = await db.selectDistinct({ carrier: navlungoPrices.carrier })
    .from(navlungoPrices)
    .where(eq(navlungoPrices.status, "active"))
    .orderBy(asc(navlungoPrices.carrier));

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
    .from(navlungoPrices)
    .where(eq(navlungoPrices.status, "active"));

  const [pendingCount] = await db.select({ count: sql<number>`count(*)` })
    .from(navlungoPrices)
    .where(eq(navlungoPrices.status, "pending"));

  const countries = await getCountriesWithPrices();
  const carriers = await getCarriersWithPrices();

  const [lastBatch] = await db.select({ scrapedAt: navlungoScrapeBatches.scrapedAt })
    .from(navlungoScrapeBatches)
    .where(eq(navlungoScrapeBatches.status, "approved"))
    .orderBy(desc(navlungoScrapeBatches.scrapedAt))
    .limit(1);

  return {
    totalActive: Number(activeCount?.count || 0),
    totalPending: Number(pendingCount?.count || 0),
    totalCountries: countries.length,
    totalCarriers: carriers.length,
    lastUpdated: lastBatch?.scrapedAt || null
  };
}
