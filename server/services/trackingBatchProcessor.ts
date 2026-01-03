import { storage } from "../storage";
import { sendConsolidatedUserTrackingReport, sendConsolidatedAdminTrackingReport } from "../notification-emails";
import { TrackingUpdateBatch, User, Shipment } from "@shared/schema";

/**
 * Batch processor for sending consolidated tracking update emails
 */
export class TrackingBatchProcessor {
  private isProcessing = false;

  /**
   * Process all unprocessed tracking updates and send consolidated emails
   * @param sendAdminEmail - If true, also send admin tracking report (default: false for scheduled runs)
   */
  async processTrackingUpdateBatches(sendAdminEmail: boolean = false): Promise<void> {
    // Prevent concurrent processing
    if (this.isProcessing) {
      console.log("⏳ Tracking batch processing already in progress, skipping...");
      return;
    }

    this.isProcessing = true;
    console.log("🚀 Starting tracking batch processing...");

    try {
      // Get all unprocessed tracking updates
      const unprocessedUpdates = await storage.getUnprocessedTrackingUpdates();
      
      if (unprocessedUpdates.length === 0) {
        console.log("📭 No unprocessed tracking updates found");
        return;
      }

      console.log(`📦 Found ${unprocessedUpdates.length} unprocessed tracking updates`);

      // Get shipment and user data for all updates
      const enrichedUpdates = await this.enrichTrackingUpdates(unprocessedUpdates);

      // Group updates by user for consolidated user emails
      const updatesByUser = this.groupUpdatesByUser(enrichedUpdates);

      // Send consolidated emails to users
      await this.sendUserNotifications(updatesByUser);

      // Send consolidated admin notification only if explicitly requested (once daily)
      if (sendAdminEmail) {
        await this.sendAdminNotification(enrichedUpdates);
      }

      // Mark all updates as processed
      const updateIds = unprocessedUpdates.map(update => update.id);
      await storage.markTrackingUpdatesAsProcessed(updateIds);

      console.log(`✅ Successfully processed ${unprocessedUpdates.length} tracking updates`);
    } catch (error) {
      console.error("❌ Error processing tracking update batches:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Enrich tracking updates with shipment and user data
   */
  private async enrichTrackingUpdates(
    updates: TrackingUpdateBatch[]
  ): Promise<(TrackingUpdateBatch & { shipment: Shipment; user: User })[]> {
    const enrichedUpdates = [];

    for (const update of updates) {
      try {
        // Get shipment data
        const shipment = await storage.getShipment(update.shipmentId);
        if (!shipment) {
          console.warn(`⚠️ Shipment ${update.shipmentId} not found for tracking update ${update.id}`);
          continue;
        }

        // Get user data
        const user = await storage.getUser(update.userId);
        if (!user) {
          console.warn(`⚠️ User ${update.userId} not found for tracking update ${update.id}`);
          continue;
        }

        enrichedUpdates.push({
          ...update,
          shipment,
          user
        });
      } catch (error) {
        console.error(`❌ Error enriching tracking update ${update.id}:`, error);
      }
    }

    return enrichedUpdates;
  }

  /**
   * Group tracking updates by user
   */
  private groupUpdatesByUser(
    updates: (TrackingUpdateBatch & { shipment: Shipment; user: User })[]
  ): Map<number, (TrackingUpdateBatch & { shipment: Shipment; user: User })[]> {
    const updatesByUser = new Map();

    for (const update of updates) {
      const userId = update.userId;
      if (!updatesByUser.has(userId)) {
        updatesByUser.set(userId, []);
      }
      updatesByUser.get(userId).push(update);
    }

    return updatesByUser;
  }

  /**
   * Send consolidated email notifications to users
   */
  private async sendUserNotifications(
    updatesByUser: Map<number, (TrackingUpdateBatch & { shipment: Shipment; user: User })[]>
  ): Promise<void> {
    console.log(`📧 Sending consolidated emails to ${updatesByUser.size} users`);

    for (const [userId, userUpdates] of Array.from(updatesByUser)) {
      try {
        // Get the user (we already have it in the updates, but get the first one)
        const user = userUpdates[0].user;

        console.log(`📬 Sending consolidated tracking report to ${user.email} (${userUpdates.length} updates)`);

        // Send consolidated email to the user
        const result = await sendConsolidatedUserTrackingReport(user, userUpdates);

        if (result.success) {
          console.log(`✅ Successfully sent consolidated tracking report to ${user.email}`);
        } else {
          console.error(`❌ Failed to send consolidated tracking report to ${user.email}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending consolidated email to user ${userId}:`, error);
      }
    }
  }

  /**
   * Send consolidated admin notification with all updates
   */
  private async sendAdminNotification(
    updates: (TrackingUpdateBatch & { shipment: Shipment; user: User })[]
  ): Promise<void> {
    if (updates.length === 0) return;

    console.log(`🚨 Sending consolidated admin tracking report for ${updates.length} updates`);

    try {
      const result = await sendConsolidatedAdminTrackingReport(updates);

      if (result.success) {
        console.log(`✅ Successfully sent consolidated admin tracking report`);
      } else {
        console.error(`❌ Failed to send consolidated admin tracking report:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error sending consolidated admin tracking report:`, error);
    }
  }

  /**
   * Process tracking updates for a specific user only
   */
  async processUserTrackingUpdates(userId: number): Promise<void> {
    try {
      console.log(`🔍 Processing tracking updates for user ${userId}...`);

      // Get unprocessed updates for this specific user
      const userUpdates = await storage.getUnprocessedTrackingUpdatesByUser(userId);

      if (userUpdates.length === 0) {
        console.log(`📭 No unprocessed tracking updates found for user ${userId}`);
        return;
      }

      console.log(`📦 Found ${userUpdates.length} unprocessed tracking updates for user ${userId}`);

      // Enrich with shipment and user data
      const enrichedUpdates = await this.enrichTrackingUpdates(userUpdates);

      if (enrichedUpdates.length === 0) {
        console.log(`⚠️ No valid tracking updates found for user ${userId} after enrichment`);
        return;
      }

      // Get user data from the first update
      const user = enrichedUpdates[0].user;

      // Send consolidated email to the user
      console.log(`📬 Sending consolidated tracking report to ${user.email} (${enrichedUpdates.length} updates)`);

      const result = await sendConsolidatedUserTrackingReport(user, enrichedUpdates);

      if (result.success) {
        // Mark these updates as processed
        const updateIds = userUpdates.map(update => update.id);
        await storage.markTrackingUpdatesAsProcessed(updateIds);
        
        console.log(`✅ Successfully processed ${userUpdates.length} tracking updates for user ${userId}`);
      } else {
        console.error(`❌ Failed to send consolidated tracking report to user ${userId}:`, result.error);
      }
    } catch (error) {
      console.error(`❌ Error processing tracking updates for user ${userId}:`, error);
    }
  }
}

// Export singleton instance
export const trackingBatchProcessor = new TrackingBatchProcessor();