/**
 * External Price Management Routes
 *
 * All routes for the external price integration system.
 */

import { Router } from "express";
import { authenticateToken, isAdmin } from "./middlewares/auth";
import * as pricingController from "./controllers/pricingController";

const router = Router();

// ============================================
// CHROME EXTENSION ENDPOINTS (Public with optional API key)
// ============================================

// POST /api/external-pricing/prices/batch - Receive scraped prices from Chrome extension
router.post("/prices/batch", pricingController.importPricesBatch);

// ============================================
// ADMIN ENDPOINTS - Protected with authenticateToken + isAdmin
// ============================================

// Batches
router.get("/admin/batches", authenticateToken, isAdmin, pricingController.getBatches);
router.get("/admin/batches/:id/prices", authenticateToken, isAdmin, pricingController.getBatchPrices);
router.post("/admin/batches/:id/approve", authenticateToken, isAdmin, pricingController.approveBatch);
router.post("/admin/batches/:id/reject", authenticateToken, isAdmin, pricingController.rejectBatch);

// Prices
router.get("/admin/prices", authenticateToken, isAdmin, pricingController.getPrices);
router.put("/admin/prices/:id", authenticateToken, isAdmin, pricingController.updatePrice);
router.delete("/admin/prices/:id", authenticateToken, isAdmin, pricingController.deletePrice);

// Service Settings
router.get("/admin/services", authenticateToken, isAdmin, pricingController.getServiceSettings);
router.post("/admin/services", authenticateToken, isAdmin, pricingController.upsertServiceSetting);
router.put("/admin/services/:id", authenticateToken, isAdmin, pricingController.toggleServiceSetting);

// Statistics & Metadata
router.get("/admin/stats", authenticateToken, isAdmin, pricingController.getStatistics);
router.get("/admin/countries", authenticateToken, isAdmin, pricingController.getCountries);
router.get("/admin/carriers", authenticateToken, isAdmin, pricingController.getCarriers);

export default router;
