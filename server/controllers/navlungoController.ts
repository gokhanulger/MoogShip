/**
 * Navlungo Price Controller
 *
 * Handles all API endpoints for Navlungo price management.
 */

import { Request, Response } from "express";
import * as navlungoPricingService from "../services/navlungo-pricing";

// ============================================
// CHROME EXTENSION ENDPOINTS
// ============================================

/**
 * POST /api/navlungo/prices/batch
 * Receive scraped prices from Chrome extension
 */
export async function importPricesBatch(req: Request, res: Response) {
  try {
    const { prices, source = "chrome-extension" } = req.body;

    if (!prices || !Array.isArray(prices) || prices.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No prices provided"
      });
    }

    console.log(`[Navlungo] Receiving batch import: ${prices.length} prices from ${source}`);

    const result = await navlungoPricingService.createScrapeBatch(prices, source);

    res.json({
      success: true,
      batchId: result.batchId,
      pricesImported: result.pricesImported,
      message: `Successfully imported ${result.pricesImported} prices as batch #${result.batchId}`
    });

  } catch (error) {
    console.error("[Navlungo] Error importing prices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to import prices"
    });
  }
}

// ============================================
// ADMIN ENDPOINTS - BATCHES
// ============================================

/**
 * GET /api/admin/navlungo/batches
 * Get all batches with optional status filter
 */
export async function getBatches(req: Request, res: Response) {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as string;

    if (status === "pending") {
      const batches = await navlungoPricingService.getPendingBatches();
      return res.json({
        success: true,
        batches,
        total: batches.length
      });
    }

    const result = await navlungoPricingService.getBatches(limit, offset);
    res.json({
      success: true,
      batches: result.batches,
      total: result.total
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching batches:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch batches"
    });
  }
}

/**
 * GET /api/admin/navlungo/batches/:id/prices
 * Get all prices in a specific batch
 */
export async function getBatchPrices(req: Request, res: Response) {
  try {
    const batchId = parseInt(req.params.id);

    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid batch ID"
      });
    }

    const prices = await navlungoPricingService.getBatchPrices(batchId);

    res.json({
      success: true,
      prices,
      count: prices.length
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching batch prices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch batch prices"
    });
  }
}

/**
 * POST /api/admin/navlungo/batches/:id/approve
 * Approve a batch and activate its prices
 */
export async function approveBatch(req: Request, res: Response) {
  try {
    const batchId = parseInt(req.params.id);
    const { replaceExisting = true } = req.body;

    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid batch ID"
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const result = await navlungoPricingService.approveBatch(
      batchId,
      req.user.id,
      replaceExisting
    );

    res.json({
      success: true,
      approvedCount: result.approvedCount,
      message: `Batch #${batchId} approved: ${result.approvedCount} prices activated`
    });

  } catch (error) {
    console.error("[Navlungo] Error approving batch:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to approve batch"
    });
  }
}

/**
 * POST /api/admin/navlungo/batches/:id/reject
 * Reject a batch
 */
export async function rejectBatch(req: Request, res: Response) {
  try {
    const batchId = parseInt(req.params.id);
    const { reason } = req.body;

    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid batch ID"
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    await navlungoPricingService.rejectBatch(batchId, req.user.id, reason);

    res.json({
      success: true,
      message: `Batch #${batchId} rejected`
    });

  } catch (error) {
    console.error("[Navlungo] Error rejecting batch:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reject batch"
    });
  }
}

// ============================================
// ADMIN ENDPOINTS - PRICES
// ============================================

/**
 * GET /api/admin/navlungo/prices
 * Get all active prices with filtering
 */
export async function getPrices(req: Request, res: Response) {
  try {
    const filters = {
      countryCode: req.query.countryCode as string | undefined,
      carrier: req.query.carrier as string | undefined,
      minWeight: req.query.minWeight ? parseFloat(req.query.minWeight as string) : undefined,
      maxWeight: req.query.maxWeight ? parseFloat(req.query.maxWeight as string) : undefined
    };

    const prices = await navlungoPricingService.getActivePrices(filters);

    res.json({
      success: true,
      prices,
      count: prices.length
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching prices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch prices"
    });
  }
}

/**
 * PUT /api/admin/navlungo/prices/:id
 * Update a single price
 */
export async function updatePrice(req: Request, res: Response) {
  try {
    const priceId = parseInt(req.params.id);
    const { priceUsd, transitDays, status, isVisibleToCustomers, reason } = req.body;

    if (isNaN(priceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid price ID"
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const updates: any = {};
    if (priceUsd !== undefined) updates.priceUsd = priceUsd;
    if (transitDays !== undefined) updates.transitDays = transitDays;
    if (status !== undefined) updates.status = status;
    if (isVisibleToCustomers !== undefined) updates.isVisibleToCustomers = isVisibleToCustomers;

    const updatedPrice = await navlungoPricingService.updatePrice(
      priceId,
      updates,
      req.user.id,
      reason
    );

    res.json({
      success: true,
      price: updatedPrice
    });

  } catch (error) {
    console.error("[Navlungo] Error updating price:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update price"
    });
  }
}

/**
 * DELETE /api/admin/navlungo/prices/:id
 * Delete a price
 */
export async function deletePrice(req: Request, res: Response) {
  try {
    const priceId = parseInt(req.params.id);

    if (isNaN(priceId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid price ID"
      });
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    await navlungoPricingService.deletePrice(priceId, req.user.id);

    res.json({
      success: true,
      message: "Price deleted successfully"
    });

  } catch (error) {
    console.error("[Navlungo] Error deleting price:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete price"
    });
  }
}

// ============================================
// ADMIN ENDPOINTS - SERVICE SETTINGS
// ============================================

/**
 * GET /api/admin/navlungo/services
 * Get all service settings
 */
export async function getServiceSettings(req: Request, res: Response) {
  try {
    const settings = await navlungoPricingService.getAllServiceSettings();

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching service settings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch service settings"
    });
  }
}

/**
 * POST /api/admin/navlungo/services
 * Create or update a service setting
 */
export async function upsertServiceSetting(req: Request, res: Response) {
  try {
    const { carrier, service, displayName, isActive, sortOrder } = req.body;

    if (!carrier || !service || !displayName) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: carrier, service, displayName"
      });
    }

    const setting = await navlungoPricingService.upsertServiceSetting(
      carrier,
      service,
      displayName,
      isActive ?? true,
      sortOrder ?? 0
    );

    res.json({
      success: true,
      setting
    });

  } catch (error) {
    console.error("[Navlungo] Error upserting service setting:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update service setting"
    });
  }
}

/**
 * PUT /api/admin/navlungo/services/:id
 * Toggle service active status
 */
export async function toggleServiceSetting(req: Request, res: Response) {
  try {
    const settingId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (isNaN(settingId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid setting ID"
      });
    }

    if (isActive === undefined) {
      return res.status(400).json({
        success: false,
        error: "isActive field required"
      });
    }

    const setting = await navlungoPricingService.toggleServiceActive(settingId, isActive);

    res.json({
      success: true,
      setting
    });

  } catch (error) {
    console.error("[Navlungo] Error toggling service setting:", error);
    res.status(500).json({
      success: false,
      error: "Failed to toggle service setting"
    });
  }
}

// ============================================
// ADMIN ENDPOINTS - STATISTICS & METADATA
// ============================================

/**
 * GET /api/admin/navlungo/stats
 * Get price statistics
 */
export async function getStatistics(req: Request, res: Response) {
  try {
    const stats = await navlungoPricingService.getPriceStatistics();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching statistics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
}

/**
 * GET /api/admin/navlungo/countries
 * Get list of countries with active prices
 */
export async function getCountries(req: Request, res: Response) {
  try {
    const countries = await navlungoPricingService.getCountriesWithPrices();

    res.json({
      success: true,
      countries
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching countries:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch countries"
    });
  }
}

/**
 * GET /api/admin/navlungo/carriers
 * Get list of carriers with active prices
 */
export async function getCarriers(req: Request, res: Response) {
  try {
    const carriers = await navlungoPricingService.getCarriersWithPrices();

    res.json({
      success: true,
      carriers
    });

  } catch (error) {
    console.error("[Navlungo] Error fetching carriers:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch carriers"
    });
  }
}
