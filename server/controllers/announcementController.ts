import { Request, Response } from "express";
import { storage } from "../storage";
import { AnnouncementPriority, insertAnnouncementSchema } from "@shared/schema";
import { z } from "zod";

/**
 * Get all announcements (admin only)
 */
export const getAllAnnouncements = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    const announcements = await storage.getAllAnnouncements();
    res.json(announcements);
  } catch (error) {
    console.error("Error getting all announcements:", error);
    res.status(500).json({ message: "Failed to get announcements" });
  }
};

/**
 * Get active announcements (all users)
 */
export const getActiveAnnouncements = async (req: Request, res: Response) => {
  try {
    const announcements = await storage.getActiveAnnouncements();
    res.json(announcements);
  } catch (error) {
    console.error("Error getting active announcements:", error);
    res.status(500).json({ message: "Failed to get active announcements" });
  }
};

/**
 * Create a new announcement (admin only)
 */
export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    // Process the request body to convert string date to actual Date object
    const requestData = { ...req.body };
    
    // If expiresAt is provided as a string, convert it to a Date object
    if (requestData.expiresAt && typeof requestData.expiresAt === 'string') {
      requestData.expiresAt = new Date(requestData.expiresAt);
    }
    
    // Validate request body with processed data
    const announcementData = insertAnnouncementSchema.parse(requestData);
    
    // Set default priority if not provided
    if (!announcementData.priority) {
      announcementData.priority = AnnouncementPriority.NORMAL;
    }
    
    // Create announcement
    const announcement = await storage.createAnnouncement(
      announcementData, 
      req.user.id
    );
    
    res.status(201).json(announcement);
  } catch (error) {
    console.error("Error creating announcement:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid announcement data", 
        errors: error.errors
      });
    }
    
    res.status(500).json({ message: "Failed to create announcement" });
  }
};

/**
 * Update an announcement (admin only)
 */
export const updateAnnouncement = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid announcement ID" });
    }
    
    // Get existing announcement
    const existingAnnouncement = await storage.getAnnouncement(id);
    if (!existingAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    
    // Process the request body to convert string date to actual Date object
    const requestData = { ...req.body };
    
    // If expiresAt is provided as a string, convert it to a Date object
    if (requestData.expiresAt && typeof requestData.expiresAt === 'string') {
      requestData.expiresAt = new Date(requestData.expiresAt);
    }
    
    // Update announcement with processed data
    const updatedAnnouncement = await storage.updateAnnouncement(id, requestData);
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error("Error updating announcement:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Invalid announcement data", 
        errors: error.errors
      });
    }
    
    res.status(500).json({ message: "Failed to update announcement" });
  }
};

/**
 * Delete an announcement (admin only)
 */
export const deleteAnnouncement = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid announcement ID" });
    }
    
    // Get existing announcement
    const existingAnnouncement = await storage.getAnnouncement(id);
    if (!existingAnnouncement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    
    // Delete announcement
    await storage.deleteAnnouncement(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Failed to delete announcement" });
  }
};

/**
 * Get a single announcement by ID (admin only)
 */
export const getAnnouncementById = async (req: Request, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized access" });
    }
    
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid announcement ID" });
    }
    
    const announcement = await storage.getAnnouncement(id);
    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }
    
    res.json(announcement);
  } catch (error) {
    console.error("Error getting announcement:", error);
    res.status(500).json({ message: "Failed to get announcement" });
  }
};

/**
 * Get login popup announcements for the current user
 * Returns announcements marked as showOnLogin that the user hasn't seen yet
 */
export const getLoginPopupAnnouncements = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const announcements = await storage.getLoginPopupAnnouncements(req.user.id);
    res.json(announcements);
  } catch (error) {
    console.error("Error getting login popup announcements:", error);
    res.status(500).json({ message: "Failed to get login popup announcements" });
  }
};

/**
 * Mark an announcement as viewed by the current user
 */
export const markAnnouncementViewed = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const announcementId = parseInt(req.params.id);
    if (isNaN(announcementId)) {
      return res.status(400).json({ message: "Invalid announcement ID" });
    }

    await storage.markAnnouncementAsViewed(req.user.id, announcementId);
    res.status(204).send();
  } catch (error) {
    console.error("Error marking announcement as viewed:", error);
    res.status(500).json({ message: "Failed to mark announcement as viewed" });
  }
};