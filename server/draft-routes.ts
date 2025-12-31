import express from "express";
import type { Request, Response } from "express";
import { storage } from "./storage";
import { z } from "zod";
import { insertDraftShipmentSchema } from "@shared/schema";
import { authenticateToken } from "./middlewares/auth";

const router = express.Router();

// Middleware to ensure user is authenticated for all draft routes
router.use(authenticateToken);

// Get all draft shipments for the current user
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const drafts = await storage.getUserDraftShipments(userId);
    
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching draft shipments:", error);
    res.status(500).json({ message: "Failed to fetch draft shipments" });
  }
});

// Get a single draft shipment by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }
    
    const draft = await storage.getDraftShipment(draftId);
    
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    // Ensure the draft belongs to the current user
    if (draft.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(draft);
  } catch (error) {
    console.error("Error fetching draft shipment:", error);
    res.status(500).json({ message: "Failed to fetch draft shipment" });
  }
});

// Create a new draft shipment
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Since this is a draft, we'll be very permissive with validation
    // and handle missing fields on the server side
    let draftData = req.body;
    
    // Ensure userId is set
    draftData = {
      ...draftData,
      userId: userId, // Always set the userId from the authenticated user
    };
    
    console.log("Creating draft with data:", draftData);
    
    try {
      // Instead of using strict validation, we'll just ensure userId is present
      if (!userId) {
        throw new Error("User ID is required");
      }
    } catch (validationError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: (validationError as Error).message 
      });
    }
    
    // Create the draft
    const draft = await storage.createDraftShipment(userId, draftData);
    
    res.status(201).json(draft);
  } catch (error) {
    console.error("Error creating draft shipment:", error);
    res.status(500).json({ message: "Failed to create draft shipment" });
  }
});

// Convert a draft to a real shipment
router.post("/:id/convert", async (req: Request, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }
    
    // Get the draft to verify ownership
    const draft = await storage.getDraftShipment(draftId);
    
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    // Ensure the draft belongs to the current user
    if (draft.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Convert draft to shipment
    const shipment = await storage.convertDraftToShipment(draftId, userId);
    
    res.status(201).json(shipment);
  } catch (error) {
    console.error("Error converting draft to shipment:", error);
    res.status(500).json({ message: "Failed to convert draft to shipment" });
  }
});

// Update an existing draft shipment
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }
    
    const draft = await storage.getDraftShipment(draftId);
    
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    // Ensure the draft belongs to the current user
    if (draft.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Update the draft
    const updatedDraft = await storage.updateDraftShipment(draftId, req.body);
    
    res.json(updatedDraft);
  } catch (error) {
    console.error("Error updating draft shipment:", error);
    res.status(500).json({ message: "Failed to update draft shipment" });
  }
});

// Delete a draft shipment
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const draftId = parseInt(req.params.id);
    const userId = req.user!.id;
    
    if (isNaN(draftId)) {
      return res.status(400).json({ message: "Invalid draft ID" });
    }
    
    const draft = await storage.getDraftShipment(draftId);
    
    if (!draft) {
      return res.status(404).json({ message: "Draft not found" });
    }
    
    // Ensure the draft belongs to the current user
    if (draft.userId !== userId) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    // Delete the draft
    await storage.deleteDraftShipment(draftId);
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting draft shipment:", error);
    res.status(500).json({ message: "Failed to delete draft shipment" });
  }
});



export default router;