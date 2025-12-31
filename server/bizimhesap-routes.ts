/**
 * Bizim Hesap Integration Routes
 * API endpoints for invoice creation and management
 */
import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { bizimHesapService } from "./services/bizimhesap";

const router = Router();

// Schema for create invoice request
const createInvoiceSchema = z.object({
  shipmentId: z.number(),
  forceCreate: z.boolean().optional().default(false)
});

// Schema for bulk create invoices request
const bulkCreateInvoicesSchema = z.object({
  shipmentIds: z.array(z.number()),
  forceCreate: z.boolean().optional().default(false)
});

// Schema for reassign shipment owner request
const reassignOwnerSchema = z.object({
  shipmentId: z.number(),
  newUserId: z.number()
});

/**
 * Create invoice for a specific shipment
 */
router.post("/create-invoice", async (req, res) => {
  try {
    const { shipmentId, forceCreate } = createInvoiceSchema.parse(req.body);

    // Get shipment details
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Get shipment owner details
    const shipmentOwner = await storage.getUser(shipment.userId);
    if (!shipmentOwner) {
      return res.status(404).json({
        success: false,
        message: "Shipment owner not found"
      });
    }

    // Check if shipment has 3rd party tracking
    if (!shipment.carrierTrackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Shipment must have a 3rd party tracking number to create an invoice"
      });
    }

    // Check if invoice already exists (unless forced)
    if (shipment.bizimHesapInvoiceId && !forceCreate) {
      return res.status(400).json({
        success: false,
        message: "Invoice already exists for this shipment",
        invoiceId: shipment.bizimHesapInvoiceId
      });
    }

    // Create invoice
    const result = await bizimHesapService.createInvoiceForShipment(shipment, shipmentOwner);
    
    if (result.success && result.invoiceId) {
      // Update shipment with invoice information
      await storage.updateShipment(shipmentId, {
        bizimHesapInvoiceId: result.invoiceId,
        bizimHesapInvoiceCreated: new Date(),
        notes: `Bizim Hesap invoice created: ${result.invoiceId}`
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error creating invoice:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create invoice"
    });
  }
});

/**
 * Bulk create invoices for multiple shipments
 */
router.post("/bulk-create-invoices", async (req, res) => {
  try {
    console.log('Bulk invoice creation started:', req.body);
    const { shipmentIds, forceCreate } = bulkCreateInvoicesSchema.parse(req.body);
    console.log('Parsed request - shipmentIds:', shipmentIds, 'forceCreate:', forceCreate);

    // Get all shipments
    const shipments = await storage.getShipmentsByIds(shipmentIds);
    console.log('Found shipments:', shipments.length);
    
    if (shipments.length === 0) {
      console.log('No shipments found for IDs:', shipmentIds);
      return res.status(404).json({
        success: false,
        message: "No shipments found"
      });
    }

    // Filter shipments that have 3rd party tracking
    const eligibleShipments = shipments.filter(shipment => {
      const hasTracking = !!shipment.carrierTrackingNumber;
      const hasInvoice = !!shipment.bizimHesapInvoiceId;
      console.log(`Shipment ${shipment.id}: hasTracking=${hasTracking}, hasInvoice=${hasInvoice}, tracking=${shipment.carrierTrackingNumber}`);
      return hasTracking && (forceCreate || !hasInvoice);
    });

    console.log('Eligible shipments:', eligibleShipments.length, 'out of', shipments.length);

    if (eligibleShipments.length === 0) {
      console.log('No eligible shipments found');
      return res.status(400).json({
        success: false,
        message: "No eligible shipments found (must have 3rd party tracking and no existing invoice)"
      });
    }

    // Create invoices for eligible shipments
    console.log('Starting invoice creation for', eligibleShipments.length, 'shipments');
    const results = await bizimHesapService.createInvoicesForTrackedShipments(eligibleShipments, storage);
    console.log('Invoice creation results:', results);

    // Update shipments with invoice information
    for (const result of results.successful) {
      await storage.updateShipment(result.shipmentId, {
        bizimHesapInvoiceId: result.invoiceId,
        bizimHesapInvoiceCreated: new Date(),
        notes: `Bizim Hesap invoice created: ${result.invoiceId}`
      });
    }

    res.json({
      success: true,
      results: {
        total: shipments.length,
        eligible: eligibleShipments.length,
        successful: results.successful.length,
        failed: results.failed.length,
        details: results
      }
    });
  } catch (error) {
    console.error("Error creating bulk invoices:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create bulk invoices"
    });
  }
});

/**
 * Get invoice status for a shipment
 */
router.get("/invoice-status/:shipmentId", async (req, res) => {
  try {
    const shipmentId = parseInt(req.params.shipmentId);
    
    if (isNaN(shipmentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shipment ID"
      });
    }

    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    res.json({
      success: true,
      shipmentId: shipment.id,
      hasCarrierTracking: !!shipment.carrierTrackingNumber,
      carrierTrackingNumber: shipment.carrierTrackingNumber,
      hasInvoice: !!shipment.bizimHesapInvoiceId,
      invoiceId: shipment.bizimHesapInvoiceId,
      invoiceCreated: shipment.bizimHesapInvoiceCreated,
      notes: shipment.notes
    });
  } catch (error) {
    console.error("Error getting invoice status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get invoice status"
    });
  }
});

/**
 * Get all shipments eligible for invoice creation
 */
router.get("/eligible-shipments", async (req, res) => {
  console.log("🔍 BIZIM HESAP: Eligible shipments endpoint called");
  try {
    const allShipments = await storage.getAllShipments();
    console.log(`Total shipments found: ${allShipments.length}`);
    
    // Debug: Check first few shipments with tracking
    const shipmentsWithTracking = allShipments.filter(s => s.carrierTrackingNumber);
    console.log(`Shipments with carrier tracking: ${shipmentsWithTracking.length}`);
    shipmentsWithTracking.slice(0, 5).forEach(shipment => {
      console.log(`Shipment ${shipment.id}: tracking="${shipment.carrierTrackingNumber}", invoice="${shipment.bizimHesapInvoiceId}"`);
    });
    
    // Filter shipments that have 3rd party tracking but no invoice
    const eligibleShipments = allShipments.filter(shipment => 
      shipment.carrierTrackingNumber && !shipment.bizimHesapInvoiceId
    );
    
    console.log(`Eligible shipments found: ${eligibleShipments.length}`);

    // Get owner information for each shipment
    const shipmentSummaries = await Promise.all(
      eligibleShipments.map(async (shipment) => {
        const owner = await storage.getUser(shipment.userId);
        return {
          id: shipment.id,
          userId: shipment.userId,
          receiverName: shipment.receiverName,
          receiverCountry: shipment.receiverCountry,
          carrierTrackingNumber: shipment.carrierTrackingNumber,
          totalPrice: shipment.totalPrice,
          status: shipment.status,
          createdAt: shipment.createdAt,
          owner: owner ? {
            id: owner.id,
            username: owner.username,
            name: owner.name,
            email: owner.email,
            companyName: owner.companyName
          } : null
        };
      })
    );

    res.json({
      success: true,
      count: eligibleShipments.length,
      shipments: shipmentSummaries
    });
  } catch (error) {
    console.error("Error getting eligible shipments:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get eligible shipments"
    });
  }
});

/**
 * Get all users for shipment owner selection
 */
router.get("/users", async (req, res) => {
  try {
    const users = await storage.getAllUsers();
    
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      companyName: user.companyName
    }));

    res.json({
      success: true,
      users: userList
    });
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get users"
    });
  }
});

/**
 * Reassign shipment owner
 */
router.post("/reassign-owner", async (req, res) => {
  try {
    const { shipmentId, newUserId } = reassignOwnerSchema.parse(req.body);

    // Get shipment and verify it exists
    const shipment = await storage.getShipment(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found"
      });
    }

    // Get new user and verify they exist
    const newUser = await storage.getUser(newUserId);
    if (!newUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Update shipment ownership
    await storage.updateShipment(shipmentId, { userId: newUserId });

    res.json({
      success: true,
      message: "Shipment owner updated successfully",
      shipmentId,
      newOwner: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        companyName: newUser.companyName
      }
    });
  } catch (error) {
    console.error("Error reassigning shipment owner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to reassign shipment owner"
    });
  }
});

export default router;