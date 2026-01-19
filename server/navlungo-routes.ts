/**
 * Navlungo Price Management Routes
 *
 * All routes for the Navlungo price integration system.
 */

import { Router } from "express";
import { authenticateToken, isAdmin } from "./middlewares/auth";
import * as navlungoController from "./controllers/navlungoController";

const router = Router();

// ============================================
// CHROME EXTENSION ENDPOINTS (Public with optional API key)
// ============================================

// POST /api/navlungo/prices/batch - Receive scraped prices from Chrome extension
router.post("/prices/batch", navlungoController.importPricesBatch);

// ============================================
// ADMIN ENDPOINTS - Protected with authenticateToken + isAdmin
// ============================================

// Batches
router.get("/admin/batches", authenticateToken, isAdmin, navlungoController.getBatches);
router.get("/admin/batches/:id/prices", authenticateToken, isAdmin, navlungoController.getBatchPrices);
router.post("/admin/batches/:id/approve", authenticateToken, isAdmin, navlungoController.approveBatch);
router.post("/admin/batches/:id/reject", authenticateToken, isAdmin, navlungoController.rejectBatch);

// Prices
router.get("/admin/prices", authenticateToken, isAdmin, navlungoController.getPrices);
router.put("/admin/prices/:id", authenticateToken, isAdmin, navlungoController.updatePrice);
router.delete("/admin/prices/:id", authenticateToken, isAdmin, navlungoController.deletePrice);

// Service Settings
router.get("/admin/services", authenticateToken, isAdmin, navlungoController.getServiceSettings);
router.post("/admin/services", authenticateToken, isAdmin, navlungoController.upsertServiceSetting);
router.put("/admin/services/:id", authenticateToken, isAdmin, navlungoController.toggleServiceSetting);

// Statistics & Metadata
router.get("/admin/stats", authenticateToken, isAdmin, navlungoController.getStatistics);
router.get("/admin/countries", authenticateToken, isAdmin, navlungoController.getCountries);
router.get("/admin/carriers", authenticateToken, isAdmin, navlungoController.getCarriers);

export default router;
