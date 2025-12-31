import { db } from '../db';
import { dutyCalculationJobs, DutyJobStatus, type DutyCalculationJob } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { upsLandedCostService } from './ups-landed-cost';
import { easyshipService } from './easyship';

// Global type declaration for WebSocket notification function
declare global {
  var notifyDutyCalculationUpdate: ((sessionId: string, jobId: string, result: any, error?: string) => void) | undefined;
}

interface DutyJobData {
  originCountry: string;
  destinationCountry: string;
  customsValue: number; // in cents
  shippingCost: number; // in cents
  provider: string;
  packageDetails: {
    weight: number;
    dimensions: {
      length: number;
      width: number;
      height: number;
    };
    items: Array<{
      description: string;
      value: number;
      quantity: number;
      weight?: number;
      hsCode?: string;
    }>;
  };
}

class DutyJobProcessor {
  private isProcessing = false;
  private processInterval: NodeJS.Timeout | null = null;

  /**
   * Start the background job processor
   */
  start() {
    if (this.processInterval) {
      console.log('[DUTY PROCESSOR] Already running');
      return;
    }

    console.log('[DUTY PROCESSOR] Starting background duty calculation processor');
    
    // Process jobs every 10 seconds
    this.processInterval = setInterval(() => {
      this.processJobs().catch(error => {
        console.error('[DUTY PROCESSOR] Error in job processing:', error);
      });
    }, 10000);

    // Process jobs immediately on start
    this.processJobs().catch(error => {
      console.error('[DUTY PROCESSOR] Error in initial job processing:', error);
    });

    // Clean up expired jobs every 5 minutes
    setInterval(() => {
      this.cleanupExpiredJobs().catch(error => {
        console.error('[DUTY PROCESSOR] Error cleaning up expired jobs:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Stop the background job processor
   */
  stop() {
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
      console.log('[DUTY PROCESSOR] Stopped background duty calculation processor');
    }
  }

  /**
   * Process pending duty calculation jobs
   */
  private async processJobs() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // Get pending jobs, prioritize high priority ones
      const pendingJobs = await db
        .select()
        .from(dutyCalculationJobs)
        .where(eq(dutyCalculationJobs.status, DutyJobStatus.PENDING))
        .orderBy(dutyCalculationJobs.priority, dutyCalculationJobs.createdAt)
        .limit(5); // Process up to 5 jobs at once

      if (pendingJobs.length === 0) {
        return;
      }

      console.log(`[DUTY PROCESSOR] Processing ${pendingJobs.length} pending duty calculation jobs`);

      // Process jobs in parallel
      const jobPromises = pendingJobs.map(job => this.processJob(job));
      await Promise.allSettled(jobPromises);

    } catch (error) {
      console.error('[DUTY PROCESSOR] Error processing jobs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single duty calculation job
   */
  private async processJob(job: DutyCalculationJob) {
    const startTime = Date.now();
    
    try {
      console.log(`[DUTY PROCESSOR] Starting job ${job.jobId} (${job.provider}: ${job.originCountry} → ${job.destinationCountry})`);

      // Mark job as processing
      await db
        .update(dutyCalculationJobs)
        .set({
          status: DutyJobStatus.PROCESSING,
          startedAt: new Date()
        })
        .where(eq(dutyCalculationJobs.id, job.id));

      // Parse package details
      const packageDetails = job.packageDetails as DutyJobData['packageDetails'];
      
      // Convert cents to dollars
      const customsValueDollars = job.customsValue / 100;
      const shippingCostDollars = job.shippingCost / 100;

      let result: any = null;
      
      if (job.provider === 'ups' || job.provider === 'both') {
        try {
          // Import OpenAI duty calculator
          const { openAIDutyCalculator } = await import('./openai-duty-calculator');
          
          // Use the first item for calculation (most common case)
          const primaryItem = packageDetails.items[0];
          
          const openAIResult = await openAIDutyCalculator.calculateDutyRates({
            hsCode: primaryItem.hsCode,
            productDescription: primaryItem.description,
            originCountry: job.originCountry,
            destinationCountry: job.destinationCountry,
            productValue: customsValueDollars,
            shippingCost: shippingCostDollars,
            productWeight: packageDetails.weight
          });

          if (openAIResult.success) {
            const duties = openAIResult.estimatedDuty || 0;
            const taxes = openAIResult.estimatedTax || 0;
            const vat = openAIResult.estimatedVAT || 0;
            const total = openAIResult.totalEstimatedCost || 0;
            
            result = {
              provider: 'ChatGPT',
              success: true,
              duties: Math.round(duties * 100), // Convert to cents
              taxes: Math.round(taxes * 100),
              vat: Math.round(vat * 100),
              brokerageFees: 0, // ChatGPT doesn't calculate brokerage fees
              total: Math.round(total * 100),
              grandTotal: Math.round((total + shippingCostDollars) * 100),
              formattedDuties: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(duties),
              formattedTaxes: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(taxes),
              formattedVAT: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(vat),
              formattedBrokerageFees: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0),
              formattedTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total),
              formattedGrandTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total + shippingCostDollars),
              confidence: openAIResult.confidence,
              reasoning: openAIResult.reasoning,
              hsCodeUsed: openAIResult.hsCodeUsed,
              dutyRate: openAIResult.dutyRate,
              taxRate: openAIResult.taxRate,
              vatRate: openAIResult.vatRate
            };
            
            console.log(`[DUTY PROCESSOR] ChatGPT calculated duties: ${result.formattedTotal} (${openAIResult.confidence * 100}% confidence)`);
          }
        } catch (openAIError) {
          console.error(`[DUTY PROCESSOR] ChatGPT calculation failed for job ${job.jobId}:`, openAIError);
        }
      }

      // If UPS failed and easyship is requested, try easyship
      if (!result && (job.provider === 'easyship' || job.provider === 'both')) {
        try {
          const easyshipResult = await easyshipService.calculateTaxesAndDuties({
            originCountryCode: job.originCountry,
            destinationCountryCode: job.destinationCountry,
            items: packageDetails.items,
            shippingCost: shippingCostDollars,
            insuranceFee: 0
          });

          if (easyshipResult) {
            result = {
              provider: 'Easyship',
              success: true,
              duties: Math.round(easyshipResult.duty * 100),
              taxes: Math.round(easyshipResult.tax * 100),
              total: Math.round(easyshipResult.total * 100),
              formattedDuties: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(easyshipResult.duty),
              formattedTaxes: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(easyshipResult.tax),
              formattedTotal: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(easyshipResult.total)
            };
          }
        } catch (easyshipError) {
          console.error(`[DUTY PROCESSOR] Easyship calculation failed for job ${job.jobId}:`, easyshipError);
        }
      }

      const processingTime = Date.now() - startTime;

      if (result) {
        // Mark job as completed with results
        await db
          .update(dutyCalculationJobs)
          .set({
            status: DutyJobStatus.COMPLETED,
            resultData: result,
            processingTime,
            completedAt: new Date()
          })
          .where(eq(dutyCalculationJobs.id, job.id));

        console.log(`[DUTY PROCESSOR] Job ${job.jobId} completed successfully in ${processingTime}ms`);

        // Notify WebSocket clients if session ID exists
        if (job.sessionId) {
          this.notifyWebSocketClients(job.sessionId, job.jobId, result);
        }
      } else {
        // Mark job as failed
        await db
          .update(dutyCalculationJobs)
          .set({
            status: DutyJobStatus.FAILED,
            errorMessage: 'All duty calculation providers failed',
            processingTime,
            completedAt: new Date()
          })
          .where(eq(dutyCalculationJobs.id, job.id));

        console.log(`[DUTY PROCESSOR] Job ${job.jobId} failed after ${processingTime}ms`);

        // Notify WebSocket clients of failure
        if (job.sessionId) {
          this.notifyWebSocketClients(job.sessionId, job.jobId, null, 'Duty calculation failed');
        }
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Mark job as failed
      await db
        .update(dutyCalculationJobs)
        .set({
          status: DutyJobStatus.FAILED,
          errorMessage: `Processing error: ${(error as Error).message}`,
          processingTime,
          completedAt: new Date()
        })
        .where(eq(dutyCalculationJobs.id, job.id));

      console.error(`[DUTY PROCESSOR] Job ${job.jobId} failed with error:`, error);
    }
  }

  /**
   * Notify WebSocket clients of job completion
   */
  private notifyWebSocketClients(sessionId: string, jobId: string, result: any, error?: string) {
    try {
      // Use the global WebSocket notification function set up in routes.ts
      if (typeof global.notifyDutyCalculationUpdate === 'function') {
        global.notifyDutyCalculationUpdate(sessionId, jobId, result, error);
      } else {
        console.log(`[DUTY PROCESSOR] WebSocket not available, job ${jobId} completed but cannot notify session ${sessionId}`);
      }
    } catch (wsError) {
      console.error(`[DUTY PROCESSOR] Error notifying WebSocket clients for job ${jobId}:`, wsError);
    }
  }

  /**
   * Clean up expired jobs (older than 1 hour)
   */
  private async cleanupExpiredJobs() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const deletedJobs = await db
        .delete(dutyCalculationJobs)
        .where(
          and(
            lt(dutyCalculationJobs.createdAt, oneHourAgo),
            eq(dutyCalculationJobs.status, DutyJobStatus.COMPLETED)
          )
        );

      if (deletedJobs.rowCount && deletedJobs.rowCount > 0) {
        console.log(`[DUTY PROCESSOR] Cleaned up ${deletedJobs.rowCount} expired jobs`);
      }
    } catch (error) {
      console.error('[DUTY PROCESSOR] Error cleaning up expired jobs:', error);
    }
  }

  /**
   * Create a new duty calculation job
   */
  async createJob(data: {
    jobId: string;
    sessionId?: string;
    originCountry: string;
    destinationCountry: string;
    customsValue: number; // in cents
    shippingCost: number; // in cents
    provider: string;
    packageDetails: DutyJobData['packageDetails'];
    priority?: number;
  }) {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await db.insert(dutyCalculationJobs).values({
      jobId: data.jobId,
      sessionId: data.sessionId,
      originCountry: data.originCountry,
      destinationCountry: data.destinationCountry,
      customsValue: data.customsValue,
      shippingCost: data.shippingCost,
      provider: data.provider,
      packageDetails: data.packageDetails,
      priority: data.priority || 1,
      expiresAt
    });

    console.log(`[DUTY PROCESSOR] Created duty calculation job ${data.jobId}`);
  }

  /**
   * Get job status by job ID
   */
  async getJobStatus(jobId: string) {
    const job = await db
      .select()
      .from(dutyCalculationJobs)
      .where(eq(dutyCalculationJobs.jobId, jobId))
      .limit(1);

    return job[0] || null;
  }
}

// Export singleton instance
export const dutyJobProcessor = new DutyJobProcessor();