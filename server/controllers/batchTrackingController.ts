/**
 * Batch Tracking Controller
 * 
 * Provides API endpoints for batch tracking of shipments
 */

import { Request, Response } from 'express';
import { batchTrackShipments, trackShipment } from '../services/batchTracking';
import { z } from 'zod';

// Schema for validating tracking a single shipment
const singleTrackSchema = z.object({
  shipmentId: z.number({
    required_error: "Shipment ID is required",
    invalid_type_error: "Shipment ID must be a number"
  })
});

/**
 * Handle batch tracking request for all eligible shipments
 */
export async function batchTrackController(req: Request, res: Response) {
  try {
    // Check if the user is an admin (should already be verified by middleware)
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only administrators can perform batch tracking operations'
      });
    }

    const result = await batchTrackShipments();
    
    return res.status(200).json({
      success: true,
      ...result,
      message: `Tracked ${result.processedShipments} shipments. Updated ${result.updatedShipments} shipment statuses.`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in batch tracking controller:', error);
    return res.status(500).json({
      error: 'Failed to perform batch tracking',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Track a single shipment by ID
 */
export async function trackSingleShipmentController(req: Request, res: Response) {
  try {
    // Parse and validate the shipment ID
    const { shipmentId } = singleTrackSchema.parse({ 
      shipmentId: parseInt(req.params.id, 10) 
    });
    
    const trackingResult = await trackShipment(shipmentId);
    
    if (!trackingResult) {
      return res.status(404).json({
        error: 'Tracking failed',
        message: 'Could not find or track the specified shipment',
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(200).json({
      success: true,
      shipmentId,
      trackingInfo: trackingResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in single tracking controller:', error);
    
    // Check if this is a validation error
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid shipment ID',
        details: error.format(),
        timestamp: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      error: 'Failed to track shipment',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}