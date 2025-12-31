/**
 * Tracking Controller
 * 
 * Handles requests for tracking packages across different carriers.
 * Supports UPS, DHL, and AFS Transport with automatic carrier detection.
 * 
 * Public endpoint: /api/track
 * Methods: GET, POST
 * Parameters:
 *   - trackingNumber: The carrier's tracking number to look up
 *   - carrier: Optional - The carrier to use for tracking (UPS, DHL, AFS). If not provided, auto-detection is used.
 * 
 * Example usage:
 *   GET /api/track?trackingNumber=1Z12345E1234567890&carrier=UPS
 *   GET /api/track?trackingNumber=1Z12345E1234567890 (auto-detection)
 *   POST /api/track with body: { "trackingNumber": "1Z12345E1234567890", "carrier": "UPS" }
 *   POST /api/track with body: { "trackingNumber": "1Z12345E1234567890" } (auto-detection)
 */

import { Request, Response } from 'express';
import { trackPackageWithAutoDetection, detectCarrier, type CarrierType } from '../utils/carrierDetection';
import { trackPackage as trackUPS } from '../services/ups';
import { trackPackage as trackDHL } from '../services/dhl';
import { trackAFS } from '../services/afstransport';
import { trackPackage as trackGLS } from '../services/gls';
import { trackPackage as trackFedEx } from '../services/fedex';
import { z } from 'zod';

// Validation schema for tracking requests - carrier is now optional for auto-detection
const trackingSchema = z.object({
  trackingNumber: z.string().min(1, "Tracking number is required"),
  carrier: z.enum(['UPS', 'DHL', 'AFS', 'GLS', 'FEDEX']).optional()
});

/**
 * Track a package using the specified carrier (currently only UPS)
 * Supports both query parameters (GET) and request body (POST)
 */
export async function trackPackageController(req: Request, res: Response) {
  try {
    // Determine where to look for params based on HTTP method
    const params = req.method === 'POST' ? req.body : req.query;
    
    // Validate request parameters
    const validationResult = trackingSchema.safeParse(params);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data",
        details: validationResult.error.format(),
        help: "Provide a valid trackingNumber and carrier (UPS or DHL)"
      });
    }
    
    const { trackingNumber, carrier } = validationResult.data;
    
    // Auto-detect carrier if not provided
    const detectedCarrier = carrier || detectCarrier(trackingNumber);
    
    // Log tracking request
    console.log(`Tracking ${detectedCarrier} package: ${trackingNumber}`);
    
    // Track the package using the appropriate service
    let trackingResult;
    try {
      switch (detectedCarrier) {
        case 'UPS':
          trackingResult = await trackUPS(trackingNumber);
          
          // Check for customs charges and log if detected (but don't send email for manual tracking requests)
          if ((trackingResult as any).customsChargesDue) {
            console.log(`[TRACKING CONTROLLER] Customs charges detected for UPS tracking ${trackingNumber}: ${trackingResult.statusDescription}`);
          }
          break;
        case 'DHL':
          trackingResult = await trackDHL(trackingNumber);
          break;
        case 'FEDEX':
          trackingResult = await trackFedEx(trackingNumber);
          break;
        case 'AFS':
          trackingResult = await trackAFS(trackingNumber);
          break;
        case 'GLS':
          trackingResult = await trackGLS(trackingNumber);
          break;
        case 'UNKNOWN':
          trackingResult = {
            trackingNumber,
            carrier: 'UNKNOWN',
            status: 'UNKNOWN',
            statusDescription: 'Carrier could not be determined from tracking number format',
            statusTime: new Date().toISOString(),
            error: 'Unable to auto-detect carrier. Please specify carrier manually.'
          };
          break;
        default:
          return res.status(400).json({ 
            error: `Carrier "${detectedCarrier}" not supported yet`,
            supportedCarriers: ['UPS', 'DHL', 'FEDEX', 'AFS', 'GLS', 'UNKNOWN']
          });
      }
    } catch (error) {
      console.error(`Error tracking ${detectedCarrier} package ${trackingNumber}:`, error);
      return res.status(500).json({
        error: `Failed to track ${detectedCarrier} package`,
        message: error instanceof Error ? error.message : 'Unknown tracking error',
        trackingNumber,
        carrier: detectedCarrier
      });
    }
    
    // Check for tracking errors
    if ((trackingResult as any).error) {
      // Still return a 200 with the error info in the response
      // This allows the frontend to display the error message
      return res.status(200).json({
        ...trackingResult,
        _meta: {
          request: {
            trackingNumber,
            detectedCarrier: detectedCarrier,
            carrier: detectedCarrier
          },
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Return tracking information
    return res.status(200).json({
      ...trackingResult,
      _meta: {
        request: {
          trackingNumber,
          carrier
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error in tracking controller:', error);
    return res.status(500).json({ 
      error: 'Failed to retrieve tracking information',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}