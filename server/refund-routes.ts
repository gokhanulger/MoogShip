import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertRefundRequestSchema } from "@shared/schema";
import { sendRefundRequestNotification, sendRefundStatusUpdateNotification } from "./refund-email";
import { authenticateToken } from "./middlewares/auth";

const router = Router();

// Middleware to ensure user is authenticated for all refund routes
router.use(authenticateToken);

// Get shipments by IDs for refund request display
router.post("/shipments", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    const { shipmentIds } = req.body;
    if (!Array.isArray(shipmentIds)) {
      return res.status(400).json({ error: "shipmentIds must be an array" });
    }

    // If admin, get all shipments, otherwise get user's shipments
    const allShipments = req.user.role === 'admin' 
      ? await storage.getAllShipments()
      : await storage.getUserShipments(req.user.id);
    const requestedShipments = allShipments.filter((s: any) => shipmentIds.includes(s.id));

    res.json(requestedShipments);
  } catch (error) {
    console.error('Error fetching shipments for refund request:', error);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

// User routes - Create refund request
router.post("/", async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }
    
    const user = req.user;
    
    // Handle shipment IDs - they might come as array or stringified JSON
    let shipmentIds: number[];
    if (Array.isArray(req.body.shipmentIds)) {
      shipmentIds = req.body.shipmentIds;
    } else if (typeof req.body.shipmentIds === 'string') {
      try {
        shipmentIds = JSON.parse(req.body.shipmentIds);
      } catch (e) {
        shipmentIds = [parseInt(req.body.shipmentIds)];
      }
    } else {
      return res.status(400).json({ error: "Invalid shipment IDs format" });
    }

    // Validate the request data
    const requestData = {
      userId: user.id,
      shipmentIds: JSON.stringify(shipmentIds),
      reason: req.body.reason,
      status: 'pending' as const
    };

    const validatedData = insertRefundRequestSchema.parse(requestData);
    
    // Check if any of the selected shipments are already included in existing refund requests
    const allRefundRequests = await storage.getRefundRequests(user.id);
    const existingShipmentIds = new Set();
    
    for (const request of allRefundRequests) {
      try {
        const requestShipmentIds = JSON.parse(request.shipmentIds);
        requestShipmentIds.forEach((id: number) => existingShipmentIds.add(id));
      } catch (e) {
        console.error("Error parsing shipment IDs from refund request:", e);
      }
    }
    
    const conflictingShipments = shipmentIds.filter(id => existingShipmentIds.has(id));
    if (conflictingShipments.length > 0) {
      return res.status(400).json({ 
        error: `Shipment(s) ${conflictingShipments.join(', ')} are already included in an existing refund request. Each shipment can only be refunded once.` 
      });
    }

    // Get shipments to verify ownership and status
    const userShipments = await storage.getUserShipments(user.id);
    const selectedShipments = userShipments.filter((s: any) => shipmentIds.includes(s.id));
    
    if (selectedShipments.length !== shipmentIds.length) {
      return res.status(400).json({ error: "Some shipments not found or not owned by user" });
    }

    // Create the refund request
    const refundRequest = await storage.createRefundRequest(validatedData);
    
    if (!refundRequest) {
      return res.status(500).json({ error: "Failed to create refund request" });
    }

    // Send notification email
    try {
      await sendRefundRequestNotification(user, refundRequest, selectedShipments);
    } catch (emailError) {
      console.error("Failed to send refund request notification:", emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json(refundRequest);
  } catch (error) {
    console.error("Error creating refund request:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create refund request" });
  }
});

// User routes - Get user's refund requests
router.get("/", async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }
    
    const user = req.user;

    // If user is admin, get all refund requests with user details, otherwise filter by user ID
    const refundRequests = user.role === 'admin' 
      ? await storage.getAllRefundRequestsWithUsers() 
      : await storage.getRefundRequests(user.id);
    res.json(refundRequests);
  } catch (error) {
    console.error("Error getting refund requests:", error);
    res.status(500).json({ error: "Failed to get refund requests" });
  }
});

// User routes - Get specific refund request
router.get("/:id", async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }
    
    const user = req.user;
    const id = parseInt(req.params.id);

    const refundRequest = await storage.getRefundRequest(id);
    
    if (!refundRequest) {
      return res.status(404).json({ error: "Refund request not found" });
    }

    // Check if user owns this request or is admin
    if (refundRequest.userId !== user.id && user.role !== 'admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(refundRequest);
  } catch (error) {
    console.error("Error getting refund request:", error);
    res.status(500).json({ error: "Failed to get refund request" });
  }
});

// Endpoint to fetch shipments by IDs for refund request display
router.post("/shipments", async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }
    
    const user = req.user;
    const { shipmentIds } = req.body;

    if (!shipmentIds || !Array.isArray(shipmentIds)) {
      return res.status(400).json({ error: "Invalid shipment IDs" });
    }

    console.log(`[REFUND] Fetching shipments ${shipmentIds.join(', ')} for user ${user.id}`);

    // Get all user shipments and filter by the requested IDs
    const userShipments = await storage.getUserShipments(user.id);
    const requestedShipments = userShipments.filter((shipment: any) => 
      shipmentIds.includes(shipment.id)
    );

    console.log(`[REFUND] Found ${requestedShipments.length} shipments out of ${shipmentIds.length} requested`);

    res.json(requestedShipments);
  } catch (error) {
    console.error("Error fetching shipments for refund request:", error);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

// Admin route - Process refund request (approve/reject)
router.patch("/admin/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    // Only admin can process refund requests
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const refundId = parseInt(req.params.id);
    const { status, processedAmount, adminNotes } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: "Valid status (approved/rejected) is required" });
    }

    // Get the refund request to check user and amount
    const refundRequest = await storage.getRefundRequest(refundId);
    if (!refundRequest) {
      return res.status(404).json({ error: "Refund request not found" });
    }

    // Process the refund request
    const updatedRequest = await storage.processRefundRequest(
      refundId,
      status,
      processedAmount,
      adminNotes,
      req.user.id
    );

    if (!updatedRequest) {
      return res.status(500).json({ error: "Failed to process refund request" });
    }

    // If approved, add the refund amount to user's balance
    if (status === 'approved' && processedAmount) {
      try {
        // processedAmount is already in cents, no conversion needed
        const amountInCents = processedAmount;
        
        // Add the refund amount to user's balance
        const updatedUser = await storage.updateUserBalance(refundRequest.userId, amountInCents);
        if (updatedUser) {
          console.log(`[REFUND] Added $${processedAmount} (${amountInCents} cents) to user ${refundRequest.userId} balance. New balance: $${(updatedUser.balance / 100).toFixed(2)}`);
          
          // Get shipment details for transaction description
          const shipmentIds = JSON.parse(refundRequest.shipmentIds);
          const shipments = await storage.getShipmentsByIds(shipmentIds);
          
          // Build tracking info for transaction description
          const trackingNumbers = shipments
            .filter(s => s.trackingNumber)
            .map(s => s.trackingNumber)
            .join(', ');
          
          const shipmentInfo = `Shipments: ${shipmentIds.join(', ')}`;
          const trackingInfo = trackingNumbers ? ` - Tracking: ${trackingNumbers}` : '';
          const description = `Refund approved for request #${refundId} (${shipmentInfo}${trackingInfo})`;
          
          // Use the first shipment with tracking number as the related shipment
          const primaryShipment = shipments.find(s => s.trackingNumber) || shipments[0];
          
          // Create transaction record for the refund with shipment details
          await storage.createTransaction(
            refundRequest.userId,
            amountInCents,
            description,
            primaryShipment?.id || undefined
          );
          console.log(`[REFUND] Transaction record created for refund #${refundId} with tracking info`);
        }
      } catch (balanceError) {
        console.error("Error updating user balance after refund approval:", balanceError);
        // Continue with response even if balance update fails
      }
    }

    // Send email notification to user about status change
    try {
      // Get user details
      const user = await storage.getUser(refundRequest.userId);
      if (user) {
        // Get shipment details for the email
        const shipmentIds = JSON.parse(refundRequest.shipmentIds);
        const shipments = await storage.getShipmentsByIds(shipmentIds);
        
        // Send email notification in both languages
        const emailSent = await sendRefundStatusUpdateNotification(
          user,
          updatedRequest,
          shipments,
          status as 'approved' | 'rejected',
          adminNotes
        );
        
        if (emailSent) {
          console.log(`[REFUND] Email notifications sent to ${user.email} for refund request ${refundId} (${status})`);
        } else {
          console.error(`[REFUND] Failed to send email notifications to ${user.email} for refund request ${refundId}`);
        }
      }
    } catch (emailError) {
      console.error("Error sending refund status update email:", emailError);
      // Continue with response even if email fails
    }

    console.log(`[REFUND] Admin ${req.user.id} ${status} refund request ${refundId} for $${processedAmount || refundRequest.requestedAmount}`);

    res.json(updatedRequest);
  } catch (error) {
    console.error("Error processing refund request:", error);
    res.status(500).json({ error: "Failed to process refund request" });
  }
});

// Admin route - Update refund tracking status
router.put("/:id/tracking", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required. Please log in." });
    }

    // Only admin can update tracking status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const refundId = parseInt(req.params.id);
    const {
      adminTrackingStatus,
      carrierRefundReference,
      submittedToCarrierAt,
      carrierResponseAt,
      expectedRefundDate,
      internalNotes
    } = req.body;

    if (!adminTrackingStatus) {
      return res.status(400).json({ error: "Admin tracking status is required" });
    }

    // Parse dates if provided
    const parsedSubmittedToCarrierAt = submittedToCarrierAt ? new Date(submittedToCarrierAt) : undefined;
    const parsedCarrierResponseAt = carrierResponseAt ? new Date(carrierResponseAt) : undefined;
    const parsedExpectedRefundDate = expectedRefundDate ? new Date(expectedRefundDate) : undefined;

    const updatedRequest = await storage.updateRefundTrackingStatus(
      refundId,
      adminTrackingStatus,
      carrierRefundReference,
      parsedSubmittedToCarrierAt,
      parsedCarrierResponseAt,
      parsedExpectedRefundDate,
      internalNotes
    );

    if (!updatedRequest) {
      return res.status(404).json({ error: "Refund request not found" });
    }

    console.log(`[REFUND] Admin ${req.user.id} updated tracking for refund ${refundId} to ${adminTrackingStatus}`);

    res.json(updatedRequest);
  } catch (error) {
    console.error("Error updating refund tracking status:", error);
    res.status(500).json({ error: "Failed to update tracking status" });
  }
});

export default router;