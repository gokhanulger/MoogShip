import { Request, Response } from "express";
import { storage } from "../storage";
import { PickupStatus } from "@shared/schema";
import { sendPickupNotificationEmail, sendPickupApprovalEmail } from "../email";

// Get all pickup requests (admin only)
export const getPickupRequests = async (req: Request, res: Response) => {
  try {
    const pickupRequests = await storage.getAllPickupRequests();
    res.json(pickupRequests);
  } catch (error) {
    console.error("Error fetching pickup requests:", error);
    res.status(500).json({ message: "Failed to fetch pickup requests" });
  }
};

// Get only approved/scheduled pickup requests (admin only)
export const getApprovedPickupRequests = async (req: Request, res: Response) => {
  try {
    const allPickupRequests = await storage.getAllPickupRequests();
    const approvedPickups = allPickupRequests.filter(
      (pickup) => pickup.pickupStatus === PickupStatus.SCHEDULED
    );
    
    res.json(approvedPickups);
  } catch (error) {
    console.error("Error fetching approved pickup requests:", error);
    res.status(500).json({ message: "Failed to fetch approved pickup requests" });
  }
};

// Get pickup request details with associated shipments (admin only)
export const getPickupRequestDetails = async (req: Request, res: Response) => {
  try {
    const pickupId = parseInt(req.params.id);
    if (isNaN(pickupId)) {
      return res.status(400).json({ message: "Invalid pickup ID" });
    }

    const pickupWithShipments = await storage.getPickupRequestWithShipments(pickupId);
    if (!pickupWithShipments) {
      return res.status(404).json({ message: "Pickup request not found" });
    }

    res.json(pickupWithShipments);
  } catch (error) {
    console.error("Error fetching pickup request details:", error);
    res.status(500).json({ message: "Failed to fetch pickup request details" });
  }
};

// Update pickup request status (admin only)
export const updatePickupRequestStatus = async (req: Request, res: Response) => {
  try {
    const pickupId = parseInt(req.params.id);
    if (isNaN(pickupId)) {
      return res.status(400).json({ message: "Invalid pickup ID" });
    }

    const { status, notes } = req.body;
    
    // Validate status
    if (!Object.values(PickupStatus).includes(status)) {
      return res.status(400).json({ message: "Invalid pickup status" });
    }

    const updatedPickup = await storage.updatePickupRequestStatus(pickupId, status, notes);
    if (!updatedPickup) {
      return res.status(404).json({ message: "Pickup request not found" });
    }

    // Send email notification when pickup is scheduled
    if (status === PickupStatus.SCHEDULED) {
      try {
        // Get pickup details with shipments to include in email
        const pickupDetails = await storage.getPickupRequestWithShipments(pickupId);
        
        if (pickupDetails) {
          // Get user details
          const user = await storage.getUser(pickupDetails.pickupRequest.userId);
          
          if (user) {
            // Send notification email to administrators
            await sendPickupNotificationEmail({
              id: pickupDetails.pickupRequest.id,
              userId: pickupDetails.pickupRequest.userId,
              userName: user.name || user.username,
              pickupDate: new Date(pickupDetails.pickupRequest.pickupDate),
              pickupAddress: pickupDetails.pickupRequest.pickupAddress,
              pickupCity: pickupDetails.pickupRequest.pickupCity,
              pickupPostalCode: pickupDetails.pickupRequest.pickupPostalCode,
              pickupNotes: pickupDetails.pickupRequest.pickupNotes,
              shipmentCount: pickupDetails.shipments.length
            });
            
            // Also send approval notification to the user who requested the pickup
            if (user.email) {
              try {
                await sendPickupApprovalEmail({
                  id: pickupDetails.pickupRequest.id,
                  userId: pickupDetails.pickupRequest.userId,
                  userName: user.name || user.username,
                  pickupDate: pickupDetails.pickupRequest.pickupDate ? new Date(pickupDetails.pickupRequest.pickupDate) : new Date(),
                  pickupAddress: pickupDetails.pickupRequest.pickupAddress,
                  pickupCity: pickupDetails.pickupRequest.pickupCity,
                  pickupPostalCode: pickupDetails.pickupRequest.pickupPostalCode,
                  pickupNotes: pickupDetails.pickupRequest.pickupNotes,
                  shipmentCount: pickupDetails.shipments.length
                }, user.email);
                
                console.log(`Pickup approval notification sent to user ${user.id} (${user.email}) for pickup ID: ${pickupId}`);
              } catch (emailError) {
                console.error(`Error sending pickup approval email to user ${user.id} (${user.email}):`, emailError);
              }
            }
            
            console.log(`Pickup notification emails sent for pickup ID: ${pickupId}`);
          } else {
            console.error(`Could not find user for pickup ID: ${pickupId}, user ID: ${pickupDetails.pickupRequest.userId}`);
          }
        } else {
          console.error(`Failed to retrieve pickup details for notification email, pickup ID: ${pickupId}`);
        }
      } catch (emailError) {
        // Log error but don't fail the status update if email sending fails
        console.error(`Error sending pickup notification email for pickup ID: ${pickupId}:`, emailError);
      }
    }

    res.json(updatedPickup);
  } catch (error) {
    console.error("Error updating pickup request status:", error);
    res.status(500).json({ message: "Failed to update pickup request status" });
  }
};