/**
 * Batch Tracking Service
 *
 * This service performs tracking operations on multiple shipments at once
 * to update their current status and tracking information.
 */

import { db } from "../db";
import { shipments, ShipmentStatus } from "@shared/schema";
import { eq, isNotNull, and, or, notInArray } from "drizzle-orm";
import {
  trackPackage as trackUPS,
  TrackingResult as UPSTrackingResult,
} from "./ups";
import { trackPackage as trackDHL, DHLTrackingResult } from "./dhl";
import { trackAFS, TrackingResult as AFSTrackingResult } from "./afstransport";
import { detectCarrier, CarrierType } from "../utils/carrierDetection";
import { trackPackage as trackGLS } from "./gls";

/**
 * Map carrier name from database to standardized carrier type
 */
function mapCarrierNameToType(carrierName: string): CarrierType | null {
  if (!carrierName) return null;
  
  const normalizedName = carrierName.toLowerCase().trim();
  
  if (normalizedName.includes('ups')) return 'UPS';
  if (normalizedName.includes('dhl')) return 'DHL';
  if (normalizedName.includes('afs') || normalizedName.includes('transport')) return 'AFS';
  if (normalizedName.includes('gls')) return 'GLS';
  if (normalizedName.includes('royal') || normalizedName.includes('mail')) return 'ROYAL';
  
  return 'UNKNOWN';
}

type TrackingResult = UPSTrackingResult | DHLTrackingResult | AFSTrackingResult;

interface BatchTrackingResult {
  totalShipments: number;
  processedShipments: number;
  updatedShipments: number;
  failedShipments: number;
  errors: Array<{
    trackingNumber: string;
    carrier: CarrierType;
    error: string;
  }>;
  results: Array<{
    shipmentId: number;
    trackingNumber: string;
    carrierTrackingNumber: string;
    carrier: CarrierType;
    previousStatus: string;
    newStatus: string;
    trackingInfo: TrackingResult;
  }>;
}

/**
 * Track all shipments in the database that have carrier tracking numbers
 * but are not yet marked as delivered
 */
export async function batchTrackShipments(): Promise<BatchTrackingResult> {
  console.log("Starting batch tracking of shipments...");

  const result: BatchTrackingResult = {
    totalShipments: 0,
    processedShipments: 0,
    updatedShipments: 0,
    failedShipments: 0,
    errors: [],
    results: [],
  };

  try {
    // Find all shipments with carrier tracking numbers OR manual tracking numbers
    // that are currently in transit or pre-transit
    // Skip already delivered shipments to avoid unnecessary API calls
    const shipmentsToTrack = await db
      .select()
      .from(shipments)
      .where(
        and(
          or(
            isNotNull(shipments.carrierTrackingNumber),
            isNotNull(shipments.manualTrackingNumber)
          ),
          notInArray(shipments.status, [
            ShipmentStatus.DELIVERED,
            ShipmentStatus.REJECTED,
          ]),
        ),
      );

    result.totalShipments = shipmentsToTrack.length;
    console.log(`Found ${shipmentsToTrack.length} shipments to track`);

    // Process each shipment
    for (const shipment of shipmentsToTrack) {
      // Use carrier tracking number if available, otherwise fall back to manual tracking number
      const carrierTrackingNumber = shipment.carrierTrackingNumber || shipment.manualTrackingNumber;

      if (!carrierTrackingNumber) {
        continue; // Skip if no tracking number at all
      }

      try {
        result.processedShipments++;
        console.log(
          `Processing shipment ${shipment.id} with tracking number ${carrierTrackingNumber}`,
        );

        // Use carrier from shipment data if available, otherwise auto-detect
        let carrier = shipment.carrierName ? mapCarrierNameToType(shipment.carrierName) : null;
        if (!carrier || carrier === 'UNKNOWN') {
          carrier = detectCarrier(carrierTrackingNumber);
        }
        console.log(
          `Processing ${carrier} shipment ${shipment.id} (carrier: ${shipment.carrierName || 'auto-detected'}) with tracking: ${carrierTrackingNumber}`,
        );

        // For AFS shipments, use AFS barkod for API tracking if available
        let trackingNumberForAPI = carrierTrackingNumber;
        if (carrier === "AFS" && shipment.afsBarkod) {
          trackingNumberForAPI = shipment.afsBarkod;
          console.log(
            `🎯 [AFS TRACKING] Using AFS barkod for API tracking: ${trackingNumberForAPI}`,
          );
        }

        const carrierName = carrier?.toUpperCase() || "";

        let trackingInfo: TrackingResult;
        if (carrierName.includes("UPS")) {
          trackingInfo = await trackUPS(carrierTrackingNumber);
        } else if (carrierName.includes("DHL")) {
          trackingInfo = await trackDHL(carrierTrackingNumber);
        } else if (carrierName.includes("AFS")) {
          trackingInfo = await trackAFS(trackingNumberForAPI);
        } else if (carrierName.includes("GLS")) {
          trackingInfo = await trackGLS(carrierTrackingNumber);
        } else {
          console.log(
            `Skipping unsupported carrier ${carrier} for tracking: ${carrierTrackingNumber}`,
          );
          continue;
        }

        console.log(
          `🚛 Shipment ${shipment.id}: ${carrier} returned status="${trackingInfo.status}", description="${trackingInfo.statusDescription}"`,
        );

        // Determine if status needs to be updated
        let shouldUpdateStatus = false;
        let newStatus = shipment.status;

        // Enhanced status mapping based on tracking events
        if (trackingInfo.status === "DELIVERED") {
          // Any delivery event moves to delivered
          if (shipment.status !== ShipmentStatus.DELIVERED) {
            newStatus = ShipmentStatus.DELIVERED;
            shouldUpdateStatus = true;
            console.log(
              `📦 Shipment ${shipment.id}: Moving to DELIVERED (${carrier})`,
            );
          }
        } else if (trackingInfo.status === "OUT_FOR_DELIVERY") {
          // Out for delivery is in transit for our system
          if (shipment.status === ShipmentStatus.IN_TRANSIT) {
            // Already in transit, no change needed but update tracking info
          } else if (shipment.status === ShipmentStatus.APPROVED) {
            newStatus = ShipmentStatus.IN_TRANSIT;
            shouldUpdateStatus = true;
            console.log(
              `📦 Shipment ${shipment.id}: Out for delivery, moving to IN_TRANSIT (${carrier})`,
            );
          }
        } else if (trackingInfo.status === "IN_TRANSIT") {
          // Any transit events beyond label creation move to in transit
          if (shipment.status === ShipmentStatus.APPROVED) {
            newStatus = ShipmentStatus.IN_TRANSIT;
            shouldUpdateStatus = true;
            console.log(
              `📦 Shipment ${shipment.id}: Has transit events, moving to IN_TRANSIT (${carrier})`,
            );
          }
        } else if (trackingInfo.status === "PRE_TRANSIT") {
          // Only label/info events - keep current status
          console.log(
            `📦 Shipment ${shipment.id}: Only label events, keeping current status (${carrier})`,
          );
        } else if (trackingInfo.status === "EXCEPTION") {
          // Log exceptions for manual review
          console.log(
            `⚠️  Shipment ${shipment.id}: Exception status - ${trackingInfo.statusDescription} (${carrier})`,
          );
        }

        // Prepare update object
        const updateData: any = {
          trackingInfo: JSON.stringify(trackingInfo),
          ...(shouldUpdateStatus ? { status: newStatus } : {}),
        };

        // Store GLS tracking number if available from AFS tracking
        if (carrier === "AFS" && (trackingInfo as any).glsTrackingNumber) {
          console.log(
            `🎯 [GLS STORAGE] Storing GLS tracking number for shipment ${shipment.id}: ${(trackingInfo as any).glsTrackingNumber}`,
          );
          updateData.carrierTrackingNumber = (trackingInfo as any).glsTrackingNumber;
        }

        // Update shipment with tracking results and GLS number
        const updatedShipment = await db
          .update(shipments)
          .set(updateData)
          .where(eq(shipments.id, shipment.id))
          .returning();

        if (updatedShipment.length > 0) {
          if (shouldUpdateStatus) {
            result.updatedShipments++;
          }

          result.results.push({
            shipmentId: shipment.id,
            trackingNumber: shipment.trackingNumber || "",
            carrierTrackingNumber:
              updateData.carrierTrackingNumber || carrierTrackingNumber,
            carrier,
            previousStatus: shipment.status,
            newStatus: newStatus,
            trackingInfo,
          });
        }
      } catch (error) {
        result.failedShipments++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        console.error(`Error tracking shipment ${shipment.id}:`, errorMessage);

        result.errors.push({
          trackingNumber: carrierTrackingNumber,
          carrier: detectCarrier(carrierTrackingNumber),
          error: errorMessage,
        });
      }
    }

    console.log(
      `Batch tracking completed. Updated ${result.updatedShipments} of ${result.totalShipments} shipments.`,
    );
    return result;
  } catch (error) {
    console.error("Error in batch tracking:", error);
    throw error;
  }
}

/**
 * Track a specific shipment to update its tracking information
 * @param shipmentId - The ID of the shipment to track
 */
export async function trackShipment(
  shipmentId: number,
): Promise<TrackingResult | null> {
  try {
    // Find the shipment
    const [shipment] = await db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId));

    if (!shipment) {
      console.error(`Shipment ${shipmentId} not found`);
      return null;
    }

    const carrierTrackingNumber = shipment.carrierTrackingNumber;

    if (!carrierTrackingNumber) {
      console.error(`Shipment ${shipmentId} has no carrier tracking number`);
      return null;
    }

    // Detect carrier and track the package
    const carrier = detectCarrier(carrierTrackingNumber);
    
    let trackingInfo: TrackingResult;
    if (carrier === 'UPS') {
      trackingInfo = await trackUPS(carrierTrackingNumber);
    } else if (carrier === 'DHL') {
      trackingInfo = await trackDHL(carrierTrackingNumber);
    } else if (carrier === 'AFS') {
      trackingInfo = await trackAFS(carrierTrackingNumber);
    } else {
      console.error(`Unsupported carrier ${carrier} for tracking`);
      return null;
    }

    // Update tracking info and potentially status
    let shouldUpdateStatus = false;
    let newStatus = shipment.status;

    // Map carrier status to shipment status
    if (
      trackingInfo.status === "DELIVERED" &&
      shipment.status !== ShipmentStatus.DELIVERED
    ) {
      newStatus = ShipmentStatus.DELIVERED;
      shouldUpdateStatus = true;
    } else if (
      trackingInfo.status === "IN_TRANSIT" &&
      shipment.status !== ShipmentStatus.IN_TRANSIT
    ) {
      newStatus = ShipmentStatus.IN_TRANSIT;
      shouldUpdateStatus = true;
    } else if (
      trackingInfo.status === "OUT_FOR_DELIVERY" &&
      shipment.status !== ShipmentStatus.IN_TRANSIT
    ) {
      // Treat "out for delivery" as "in transit" for our system
      newStatus = ShipmentStatus.IN_TRANSIT;
      shouldUpdateStatus = true;
    }

    // Update the shipment
    await db
      .update(shipments)
      .set({
        trackingInfo: JSON.stringify(trackingInfo),
        ...(shouldUpdateStatus ? { status: newStatus } : {}),
      })
      .where(eq(shipments.id, shipmentId));

    return trackingInfo;
  } catch (error) {
    console.error(`Error tracking shipment ${shipmentId}:`, error);
    return null;
  }
}
