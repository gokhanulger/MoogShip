import { storage } from "../storage";
import { InsertTrackingUpdateBatch } from "@shared/schema";

/**
 * Helper function to add tracking updates to batch instead of sending immediate notifications
 */
export async function addTrackingUpdateToBatch(
  shipmentId: number,
  userId: number,
  trackingData: {
    trackingNumber?: string;
    carrierTrackingNumber?: string;
    status?: string;
    statusDescription?: string;
    location?: string;
    issueType?: string;
  },
  notificationType: string = "status_update"
): Promise<boolean> {
  try {
    const batchData: InsertTrackingUpdateBatch = {
      shipmentId,
      userId,
      trackingNumber: trackingData.trackingNumber || null,
      carrierTrackingNumber: trackingData.carrierTrackingNumber || null,
      status: trackingData.status || null,
      statusDescription: trackingData.statusDescription || null,
      location: trackingData.location || null,
      issueType: trackingData.issueType || null,
      notificationType,
      isProcessed: false
    };

    await storage.createTrackingUpdateBatch(batchData);
    
    console.log(`📦 Added tracking update to batch for shipment ${shipmentId}, user ${userId}, type: ${notificationType}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to add tracking update to batch for shipment ${shipmentId}:`, error);
    return false;
  }
}

/**
 * Helper function for adding delivery issue notifications to batch
 */
export async function addDeliveryIssueToBatch(
  shipmentId: number,
  userId: number,
  issueType: string,
  issueDescription: string,
  trackingNumber?: string
): Promise<boolean> {
  return await addTrackingUpdateToBatch(
    shipmentId,
    userId,
    {
      trackingNumber,
      status: "ISSUE",
      statusDescription: issueDescription,
      issueType
    },
    "delivery_issue"
  );
}

/**
 * Helper function for adding delivery notifications to batch
 */
export async function addDeliveryNotificationToBatch(
  shipmentId: number,
  userId: number,
  trackingNumber?: string,
  location?: string
): Promise<boolean> {
  return await addTrackingUpdateToBatch(
    shipmentId,
    userId,
    {
      trackingNumber,
      status: "DELIVERED",
      statusDescription: "Package has been delivered",
      location
    },
    "delivery_confirmation"
  );
}

/**
 * Helper function for adding exception notifications to batch
 */
export async function addTrackingExceptionToBatch(
  shipmentId: number,
  userId: number,
  exceptionType: string,
  exceptionDescription: string,
  trackingNumber?: string
): Promise<boolean> {
  return await addTrackingUpdateToBatch(
    shipmentId,
    userId,
    {
      trackingNumber,
      status: "EXCEPTION",
      statusDescription: exceptionDescription,
      issueType: exceptionType
    },
    "tracking_exception"
  );
}