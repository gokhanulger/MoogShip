import { storage } from '../storage';
import { ShipmentStatus } from '../../shared/schema';
import { detectCarrier as detectCarrierFromNumber } from '../utils/carrierDetection';
import { trackingBatchProcessor } from './trackingBatchProcessor';
import { addDeliveryNotificationToBatch, addTrackingExceptionToBatch, addDeliveryIssueToBatch } from '../utils/trackingBatchHelper';

// Track the running intervals
let trackingIntervals: NodeJS.Timeout[] = [];

// Track which shipments have been notified for delivery issues to avoid duplicates
const notifiedShipments = new Set<string>();

/**
 * Map carrier name from database to standardized carrier type
 */
function mapCarrierNameToType(carrierName: string): 'UPS' | 'DHL' | 'AFS' | 'GLS' | 'FEDEX' | 'ROYAL' | 'UNKNOWN' | null {
  if (!carrierName) return null;
  
  const normalizedName = carrierName.toLowerCase().trim();
  
  if (normalizedName.includes('ups')) return 'UPS';
  if (normalizedName.includes('dhl')) return 'DHL';
  if (normalizedName.includes('afs') || normalizedName.includes('transport')) return 'AFS';
  if (normalizedName.includes('gls')) return 'GLS';
  if (normalizedName.includes('fedex')) return 'FEDEX';
  if (normalizedName.includes('royal') || normalizedName.includes('mail')) return 'ROYAL';
  
  return 'UNKNOWN';
}

/**
 * Detect carrier based on tracking number format
 */
function detectCarrier(
  trackingNumber: string
): 'UPS' | 'DHL' | 'FedEx' | 'USPS' | 'RoyalMail' | 'GLS' | 'UNKNOWN' {
  const cleaned = trackingNumber.trim().replace(/\s+/g, '').toUpperCase();

  // ✅ UPS: 1Z + 16 alphanumeric = total 18
  if (/^1Z[A-Z0-9]{16}$/.test(cleaned)) {
    return 'UPS';
  }

  // ✅ DHL Express: 10-digit numeric
  if (/^\d{10}$/.test(cleaned)) {
    return 'DHL';
  }

  // ✅ DHL eCommerce / GlobalMail formats
  if (
    /^420\d{5,9}\d{10,20}$/.test(cleaned) || // DHL eComm (420 + zip)
    /^GM\d{16,20}$/.test(cleaned) ||         // Global Mail
    /^93\d{20,22}$/.test(cleaned) ||         // USPS hybrid via DHL
    /^[A-Z]{2}\d{9}US$/.test(cleaned) ||     // e.g. LX123456789US
    /^[A-Z0-9]{8,14}$/.test(cleaned)         // fallback
  ) {
    return 'DHL';
  }

  // ✅ FedEx: 12, 15, or 20-digit numeric (including SmartPost)
  if (/^\d{12}$/.test(cleaned) || /^\d{15}$/.test(cleaned) || /^\d{20}$/.test(cleaned)) {
    return 'FedEx';
  }

  // ✅ USPS:
  // - 20–22 digit numeric
  // - Starts with 94, 93, 92, 94 etc.
  // - Alphanumeric like EC123456789US
  if (
    /^\d{20,22}$/.test(cleaned) || 
    /^[A-Z]{2}\d{9}US$/.test(cleaned)
  ) {
    return 'USPS';
  }

  // ✅ Royal Mail: 13 chars, 2 letters + 9 digits + GB (e.g., AB123456789GB)
  if (/^[A-Z]{2}\d{9}GB$/.test(cleaned)) {
    return 'RoyalMail';
  }

  // ✅ GLS: Often 11–14 digit numeric or alphanumeric
  if (
    /^\d{11,14}$/.test(cleaned) || 
    /^[A-Z0-9]{8,14}$/.test(cleaned) // fallback GLS label
  ) {
    return 'GLS';
  }

  // ❓ Fallback
  return 'UNKNOWN';
}


/**
 * Calculate milliseconds until next scheduled time in Turkey timezone
 */
function getMillisecondsUntilTurkeyTime(targetHour: number): number {
  const now = new Date();
  const turkeyTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Istanbul"}));
  
  const target = new Date(turkeyTime);
  target.setHours(targetHour, 0, 0, 0);
  
  // If target time has passed today, schedule for tomorrow
  if (target <= turkeyTime) {
    target.setDate(target.getDate() + 1);
  }
  
  return target.getTime() - turkeyTime.getTime();
}

/**
 * Schedule tracking sync for specific Turkey time
 */
function scheduleTrackingSync(hour: number) {
  const delay = getMillisecondsUntilTurkeyTime(hour);
  const timeout = setTimeout(() => {
    console.log(`[TRACKING SCHEDULER] Running scheduled tracking sync at ${hour}:00 Turkey time`);
    syncAllTrackingData();
    
    // Schedule next occurrence (24 hours later)
    scheduleTrackingSync(hour);
  }, delay);
  
  trackingIntervals.push(timeout);
  
  const scheduleTime = new Date(Date.now() + delay);
  console.log(`[TRACKING SCHEDULER] Next sync at ${hour}:00 Turkey time scheduled for: ${scheduleTime.toLocaleString("en-US", {timeZone: "Europe/Istanbul"})}`);
}

/**
 * Background service that automatically syncs UPS and DHL tracking data at specific Turkey times
 * Runs at 6 AM, 14:00 (2 PM), and 22:00 (10 PM) Turkey time daily
 */
export async function startTrackingScheduler() {
  console.log('[TRACKING SCHEDULER] Starting automatic tracking updates at 6:00, 14:00, 22:00 Turkey time daily');

  // Schedule tracking sync for 3 times a day (Turkey time)
  scheduleTrackingSync(6);   // 6 AM
  scheduleTrackingSync(14);  // 2 PM
  scheduleTrackingSync(22);  // 10 PM

  // Also run an initial sync 5 minutes after server start to catch up on updates
  setTimeout(async () => {
    console.log('[TRACKING SCHEDULER] Running initial tracking sync 5 minutes after server start...');
    syncAllTrackingData().catch(error => {
      console.error('[TRACKING SCHEDULER] Initial sync failed:', error);
    });
  }, 5 * 60 * 1000); // 5 minutes delay
}

/**
 * Stop the tracking scheduler
 */
export function stopTrackingScheduler() {
  trackingIntervals.forEach(interval => clearTimeout(interval));
  trackingIntervals = [];
  console.log('[TRACKING SCHEDULER] Stopped automatic tracking updates');
}

/**
 * Manually sync all shipment tracking data with UPS and DHL
 */
export async function syncAllTrackingData() {
  try {
    console.log('[TRACKING SCHEDULER] Starting bulk tracking data sync...');
    
    // Get all shipments that have carrier tracking numbers and are not manually closed
    const shipments = await storage.getAllShipments();
    const shipmentsWithTracking = shipments.filter(s => 
      s.carrierTrackingNumber && 
      s.carrierTrackingNumber.trim() !== '' &&
      s.status !== ShipmentStatus.DELIVERED &&
      s.status !== ShipmentStatus.CANCELLED &&
      s.status !== ShipmentStatus.REJECTED &&
      !s.trackingClosed  // Exclude shipments where admin manually closed tracking
    );
    
    console.log(`[TRACKING SCHEDULER] Found ${shipmentsWithTracking.length} shipments with carrier tracking numbers to sync (excluding manually closed tracking)`);
    
    if (shipmentsWithTracking.length === 0) {
      console.log('[TRACKING SCHEDULER] No shipments to sync');
      return;
    }
    
    let updated = 0;
    let errors = 0;
    let skippedUnknownCarrier = 0;
    const statusCounts: Record<string, number> = {};
    const carrierCounts: Record<string, number> = {};

    for (const shipment of shipmentsWithTracking) {
      try {
        // Add delay between requests to avoid rate limiting (200ms is enough)
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use carrier from shipment data: check carrierName, manualCarrierName, and selectedService
        const carrierNameFromDb = shipment.carrierName ||
                                   (shipment as any).manualCarrierName ||
                                   (shipment as any).selectedService;
        let carrierType = carrierNameFromDb ? mapCarrierNameToType(carrierNameFromDb) : null;
        if (!carrierType || carrierType === 'UNKNOWN') {
          const detectedCarrier = detectCarrierFromNumber(shipment.carrierTrackingNumber!);
          carrierType = detectedCarrier as 'UPS' | 'DHL' | 'AFS' | 'GLS' | 'FEDEX' | 'ROYAL' | 'UNKNOWN';
          console.log(`[TRACKING SCHEDULER] Auto-detected carrier ${carrierType} for shipment ${shipment.id} (no carrier in DB)`);
        }
        console.log(`[TRACKING SCHEDULER] Processing ${carrierType} shipment ${shipment.id} (carrier: ${carrierNameFromDb || 'auto-detected'}) with tracking: ${shipment.carrierTrackingNumber}`);
        
        // Smart tracking: Check actual tracking number format to use correct API
        // Some shipments have multiple tracking numbers (AFS internal + UPS/DHL carrier)
        const trackingNum = shipment.carrierTrackingNumber!;
        const manualTrackingNum = (shipment as any).manualTrackingNumber;
        const afsBarkod = (shipment as any).afsBarkod;

        // Determine actual carrier from tracking number format
        let actualCarrier = carrierType;
        let actualTrackingNumber = trackingNum;

        // If tracking number starts with 1Z, it's UPS regardless of selectedService
        if (trackingNum.startsWith('1Z') || (manualTrackingNum && manualTrackingNum.startsWith('1Z'))) {
          actualCarrier = 'UPS';
          actualTrackingNumber = trackingNum.startsWith('1Z') ? trackingNum : manualTrackingNum;
        }
        // If tracking number starts with 003, it's AFS
        else if (trackingNum.startsWith('003') || (afsBarkod && afsBarkod.startsWith('003'))) {
          actualCarrier = 'AFS';
          actualTrackingNumber = afsBarkod || trackingNum;
        }
        // 10-digit numbers are typically DHL
        else if (/^\d{10}$/.test(trackingNum)) {
          actualCarrier = 'DHL';
        }

        if (actualCarrier !== carrierType) {
          console.log(`[TRACKING SCHEDULER] Carrier override: ${carrierType} → ${actualCarrier} based on tracking number format`);
        }

        let trackingData;
        if (actualCarrier === 'UPS') {
          const { trackPackage } = await import('../services/ups.js');
          trackingData = await trackPackage(actualTrackingNumber);
          
          // Check for customs charges and send notification if detected
          // BUT ONLY if the package is NOT already delivered
          if ((trackingData as any).customsChargesDue && trackingData.status !== 'DELIVERED') {
            const notificationKey = `${shipment.id}-customs-charges`;
            if (!notifiedShipments.has(notificationKey)) {
              try {
                const { sendCustomsChargesNotification } = await import('../email');
                const user = await storage.getUser(shipment.userId);
                
                if (user) {
                  await sendCustomsChargesNotification(
                    {
                      id: shipment.id,
                      carrierTrackingNumber: shipment.carrierTrackingNumber || undefined,
                      recipientName: shipment.receiverName,
                      recipientAddress: shipment.receiverAddress,
                      recipientCity: shipment.receiverCity,
                      recipientCountry: shipment.receiverCountry
                    },
                    {
                      status: trackingData.status,
                      statusDescription: trackingData.statusDescription,
                      statusTime: trackingData.statusTime
                    },
                    {
                      id: user.id,
                      name: user.name,
                      email: user.email
                    }
                  );
                  notifiedShipments.add(notificationKey);
                  console.log(`[TRACKING SCHEDULER] Customs charges notification sent for UPS shipment ${shipment.id}`);
                }
              } catch (notificationError) {
                console.error(`[TRACKING SCHEDULER] Failed to send customs charges notification for shipment ${shipment.id}:`, notificationError);
              }
            } else {
              console.log(`[TRACKING SCHEDULER] Customs charges notification already sent for shipment ${shipment.id}`);
            }
          } else if ((trackingData as any).customsChargesDue && trackingData.status === 'DELIVERED') {
            console.log(`[TRACKING SCHEDULER] Skipping customs charges notification for shipment ${shipment.id} - package already delivered`);
          }
        } else if (actualCarrier === 'DHL') {
          const { trackPackage } = await import('../services/dhl.js');
          trackingData = await trackPackage(actualTrackingNumber);
        } else if (actualCarrier === 'AFS') {
          const { trackAFS } = await import('../services/afstransport.js');
          trackingData = await trackAFS(actualTrackingNumber);
        } else if (actualCarrier === 'GLS') {
          const { trackPackage } = await import('../services/gls.js');
          trackingData = await trackPackage(actualTrackingNumber);
        } else if (actualCarrier === 'FEDEX') {
          const { trackPackage } = await import('../services/fedex.js');
          trackingData = await trackPackage(actualTrackingNumber);
        } else {
          console.log(`[TRACKING SCHEDULER] Skipping unsupported carrier ${actualCarrier} for tracking: ${actualTrackingNumber}`);
          skippedUnknownCarrier++;
          continue;
        }

        // Count carrier types and tracking statuses for summary
        carrierCounts[carrierType] = (carrierCounts[carrierType] || 0) + 1;
        statusCounts[trackingData.status || 'UNKNOWN'] = (statusCounts[trackingData.status || 'UNKNOWN'] || 0) + 1;

        // Map carrier status to our system status
        let newStatus = shipment.status;
        let shouldUpdate = false;
        
        // Enhanced status mapping based on tracking events
        if (trackingData.status === 'DELIVERED') {
          // Any delivery event moves to delivered
          if (shipment.status !== ShipmentStatus.DELIVERED) {
            newStatus = ShipmentStatus.DELIVERED;
            shouldUpdate = true;
            console.log(`[TRACKING SCHEDULER] Package ${shipment.id} delivered (${carrierType})`);
            
            // Add delivery notification to batch
            try {
              const success = await addDeliveryNotificationToBatch(
                shipment.id,
                shipment.userId,
                shipment.carrierTrackingNumber || undefined,
                (trackingData as any).location
              );
              
              if (success) {
                console.log(`[TRACKING SCHEDULER] Delivery notification added to batch for shipment ${shipment.id}`);
              } else {
                console.error(`[TRACKING SCHEDULER] Failed to add delivery notification to batch for shipment ${shipment.id}`);
              }
            } catch (notificationError) {
              console.error(`[TRACKING SCHEDULER] Failed to add delivery notification to batch for shipment ${shipment.id}:`, notificationError);
            }
          }
        } else if (trackingData.status === 'OUT_FOR_DELIVERY') {
          // Out for delivery means it's in transit - update from approved status
          if (shipment.status === ShipmentStatus.APPROVED) {
            newStatus = ShipmentStatus.IN_TRANSIT;
            shouldUpdate = true;
            console.log(`[TRACKING SCHEDULER] Package ${shipment.id} out for delivery, moving to in transit (${carrierType})`);
          }
        } else if (trackingData.status === 'IN_TRANSIT') {
          // Any transit events beyond label creation move to in transit
          if (shipment.status === ShipmentStatus.APPROVED) {
            newStatus = ShipmentStatus.IN_TRANSIT;
            shouldUpdate = true;
            console.log(`[TRACKING SCHEDULER] Package ${shipment.id} has transit events, moving to in transit (${carrierType})`);
          } else {
            console.log(`[TRACKING SCHEDULER] Package ${shipment.id} already ${shipment.status}, tracking shows IN_TRANSIT (${carrierType})`);
          }
        } else if (trackingData.status === 'PRE_TRANSIT' || trackingData.status === 'TRACKING_AVAILABLE') {
          // Label created but not yet picked up - this is normal for pre-transit
          // GLS returns TRACKING_AVAILABLE for this state
          console.log(`[TRACKING SCHEDULER] Package ${shipment.id} still ${trackingData.status} (label created, not picked up yet) (${actualCarrier})`);
        } else if (trackingData.status === 'EXCEPTION') {
          // Handle exceptions - send delivery issue notification
          console.log(`[TRACKING SCHEDULER] Package ${shipment.id} has exception status: ${trackingData.statusDescription} (${carrierType})`);
          
          // Check if shipment is delivered/completed/done - if so, don't send notifications
          const deliveredStatuses = ['delivered', 'completed', 'done'];
          if (deliveredStatuses.includes(shipment.status.toLowerCase())) {
            console.log(`[TRACKING SCHEDULER] Skipping exception notification for shipment ${shipment.id} - status is ${shipment.status} (notifications blocked for delivered/completed/done shipments)`);
          } else {
            const notificationKey = `${shipment.id}-exception`;
            if (!notifiedShipments.has(notificationKey)) {
              // Add tracking exception to batch
              try {
                const success = await addTrackingExceptionToBatch(
                  shipment.id,
                  shipment.userId,
                  'Exception',
                  trackingData.statusDescription || 'Package has encountered an exception during delivery',
                  shipment.carrierTrackingNumber || undefined
                );
                
                if (success) {
                  notifiedShipments.add(notificationKey);
                  console.log(`[TRACKING SCHEDULER] Exception notification added to batch for shipment ${shipment.id} (Exception)`);
                } else {
                  console.error(`[TRACKING SCHEDULER] Failed to add exception notification to batch for shipment ${shipment.id}`);
                }
              } catch (notificationError) {
                console.error(`[TRACKING SCHEDULER] Failed to add exception notification to batch for shipment ${shipment.id}:`, notificationError);
              }
            } else {
              console.log(`[TRACKING SCHEDULER] Exception notification already sent for shipment ${shipment.id}`);
            }
          }
        }
        
        // Check for specific exception patterns in status descriptions
        const statusDesc = trackingData.statusDescription?.toLowerCase() || '';
        const shouldNotifyException = statusDesc.includes('international shipment release') ||
                                    statusDesc.includes('delay') ||
                                    statusDesc.includes('exception') ||
                                    statusDesc.includes('shipment exception');
        
        if (shouldNotifyException && trackingData.status !== 'DELIVERED') {
          // Check if shipment is delivered/completed/done - if so, don't send notifications
          const deliveredStatuses = ['delivered', 'completed', 'done'];
          if (deliveredStatuses.includes(shipment.status.toLowerCase())) {
            console.log(`[TRACKING SCHEDULER] Skipping exception pattern notification for shipment ${shipment.id} - status is ${shipment.status} (notifications blocked for delivered/completed/done shipments)`);
          } else {
            const notificationKey = `${shipment.id}-exception-${statusDesc.replace(/[^a-z0-9]/g, '').substring(0, 20)}`;
            if (!notifiedShipments.has(notificationKey)) {
              console.log(`[TRACKING SCHEDULER] Package ${shipment.id} has exception pattern in description: ${trackingData.statusDescription} (${carrierType})`);
              
              try {
                let issueType = 'Tracking Issue';
                if (statusDesc.includes('international shipment release')) {
                  issueType = 'International Shipment Release';
                } else if (statusDesc.includes('delay')) {
                  issueType = 'Shipment Delay';
                } else if (statusDesc.includes('exception')) {
                  issueType = 'Shipment Exception';
                }
                
                const success = await addTrackingExceptionToBatch(
                  shipment.id,
                  shipment.userId,
                  issueType,
                  trackingData.statusDescription || 'Package tracking shows exception condition',
                  shipment.carrierTrackingNumber || undefined
                );
                
                if (success) {
                  notifiedShipments.add(notificationKey);
                  console.log(`[TRACKING SCHEDULER] Exception notification added to batch for shipment ${shipment.id} (${issueType})`);
                } else {
                  console.error(`[TRACKING SCHEDULER] Failed to add exception notification to batch for shipment ${shipment.id}`);
                }
              } catch (notificationError) {
                console.error(`[TRACKING SCHEDULER] Failed to add exception notification to batch for shipment ${shipment.id}:`, notificationError);
              }
            }
          }
        }
        
        // Check for delivery delays (packages in transit for more than 10 days)
        // Note: OUT_FOR_DELIVERY is excluded as it's a positive status update, not a delay
        if (trackingData.status === 'IN_TRANSIT') {
          const daysSinceCreated = shipment.createdAt 
            ? Math.floor((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
          
          // For extremely delayed shipments (30+ days), force send notification even if already sent
          const isCriticalDelay = daysSinceCreated > 30;
          
          if (daysSinceCreated > 10) {
            console.log(`[TRACKING SCHEDULER] Package ${shipment.id} has been in transit for ${daysSinceCreated} days - potential delay`);
            
            // Check if shipment is delivered/completed/done - if so, don't send notifications
            const deliveredStatuses = ['delivered', 'completed', 'done'];
            if (deliveredStatuses.includes(shipment.status.toLowerCase())) {
              console.log(`[TRACKING SCHEDULER] Skipping delay notification for shipment ${shipment.id} - status is ${shipment.status} (notifications blocked for delivered/completed/done shipments)`);
            } else {
              const notificationKey = `${shipment.id}-delay-${Math.floor(daysSinceCreated / 5) * 5}`; // Group by 5-day intervals
              if (!notifiedShipments.has(notificationKey) || isCriticalDelay) {
                // Add delivery issue to batch for delay
                try {
                  const success = await addDeliveryIssueToBatch(
                    shipment.id,
                    shipment.userId,
                    isCriticalDelay ? 'CRITICAL DELIVERY DELAY - IMMEDIATE ACTION REQUIRED' : 'Delivery Delay',
                    isCriticalDelay ? 
                      `🚨 URGENT: Shipment ${shipment.id} has been in transit for ${daysSinceCreated} days without delivery. This is extremely abnormal and requires immediate investigation. Package may be lost and customer communication is critical.` :
                      `Package has been in transit for ${daysSinceCreated} days without delivery. Current status: ${trackingData.statusDescription || trackingData.status}`,
                    shipment.carrierTrackingNumber || undefined
                  );
                  
                  if (success) {
                    notifiedShipments.add(notificationKey);
                    console.log(`[TRACKING SCHEDULER] Delivery delay notification added to batch for shipment ${shipment.id} (${daysSinceCreated} days)`);
                  } else {
                    console.error(`[TRACKING SCHEDULER] Failed to add delivery delay notification to batch for shipment ${shipment.id}`);
                  }
                } catch (notificationError) {
                  console.error(`[TRACKING SCHEDULER] Failed to add delivery delay notification to batch for shipment ${shipment.id}:`, notificationError);
                }
              } else {
                console.log(`[TRACKING SCHEDULER] Delay notification already sent for shipment ${shipment.id} at ${daysSinceCreated} days`);
              }
            }
          }
        }
        
        // Update shipment if status changed
        if (shouldUpdate && newStatus !== shipment.status) {
          await storage.updateShipment(shipment.id, {
            status: newStatus,
            updatedAt: new Date()
          });
          updated++;
          console.log(`[TRACKING SCHEDULER] Updated shipment ${shipment.id} status from ${shipment.status} to ${newStatus}`);
        }
        
      } catch (error) {
        errors++;
        console.error(`[TRACKING SCHEDULER] Error syncing shipment ${shipment.id} with tracking ${shipment.carrierTrackingNumber}:`, error);
      }
    }
    
    console.log(`[TRACKING SCHEDULER] ========== SYNC SUMMARY ==========`);
    console.log(`[TRACKING SCHEDULER] Total checked: ${shipmentsWithTracking.length}`);
    console.log(`[TRACKING SCHEDULER] Updated: ${updated}`);
    console.log(`[TRACKING SCHEDULER] Errors: ${errors}`);
    console.log(`[TRACKING SCHEDULER] Skipped (unknown carrier): ${skippedUnknownCarrier}`);
    console.log(`[TRACKING SCHEDULER] Carrier breakdown: ${JSON.stringify(carrierCounts)}`);
    console.log(`[TRACKING SCHEDULER] Tracking status breakdown: ${JSON.stringify(statusCounts)}`);
    console.log(`[TRACKING SCHEDULER] ==================================`);
    
  } catch (error) {
    console.error('[TRACKING SCHEDULER] Error during bulk tracking sync:', error);
  }
}

/**
 * Process pending tracking update batches and send consolidated emails
 */
export async function processPendingTrackingNotifications(): Promise<void> {
  try {
    console.log('[BATCH PROCESSOR] Starting processing of pending tracking notifications...');
    await trackingBatchProcessor.processTrackingUpdateBatches();
    console.log('[BATCH PROCESSOR] Completed processing of pending tracking notifications');
  } catch (error) {
    console.error('[BATCH PROCESSOR] Error processing pending tracking notifications:', error);
  }
}

/**
 * Start batch processing scheduler for consolidated tracking emails
 */
export function startBatchProcessingScheduler(): void {
  console.log('[BATCH PROCESSOR] Starting batch processing scheduler...');
  
  // New batch processing every 15 minutes
  const batchProcessingInterval = setInterval(async () => {
    console.log('[BATCH PROCESSOR] Running scheduled batch processing...');
    await processPendingTrackingNotifications();
  }, 15 * 60 * 1000); // 15 minutes
  
  // Store interval for cleanup
  trackingIntervals.push(batchProcessingInterval);
  
  console.log('[BATCH PROCESSOR] Batch processing scheduler started - running every 15 minutes');
  
  // Run initial batch processing after 2 minutes to catch any pending notifications
  setTimeout(async () => {
    console.log('[BATCH PROCESSOR] Running initial batch processing...');
    await processPendingTrackingNotifications();
  }, 2 * 60 * 1000); // 2 minutes delay
}