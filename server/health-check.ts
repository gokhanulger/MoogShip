/**
 * Database Health Monitoring System
 * Real-time performance tracking and optimization
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: Date;
  queryTime: number;
  shipmentCount: number;
  details: string[];
}

interface LabelTestResult {
  success: boolean;
  shipmentId: number;
  hasLabel: boolean;
  retrievalTime: number;
  error?: string;
}

class DatabaseHealthMonitor {
  private lastHealthCheck: Date | null = null;
  private consecutiveFailures = 0;

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const details: string[] = [];
    
    try {
      // Test basic connectivity
      await db.execute(sql`SELECT 1 as test`);
      details.push('✓ Database connection healthy');
      
      // Test shipment query performance
      console.time('[HEALTH] Shipment query performance');
      const shipmentResult = await db.execute(sql`
        SELECT COUNT(*) as total
        FROM shipments s
        WHERE s.status IN ('approved', 'in_transit', 'delivered', 'pending', 'rejected')
      `);
      console.timeEnd('[HEALTH] Shipment query performance');
      
      const queryTime = Date.now() - startTime;
      const shipmentCount = shipmentResult.rows[0]?.total || 0;
      
      details.push(`✓ Query executed in ${queryTime}ms`);
      details.push(`✓ Found ${shipmentCount} active shipments`);
      
      // Performance assessment
      let status: 'healthy' | 'degraded' | 'critical';
      if (queryTime < 100) {
        status = 'healthy';
        details.push('✓ Performance: Excellent (<100ms)');
        this.consecutiveFailures = 0;
      } else if (queryTime < 1000) {
        status = 'degraded';
        details.push('⚠ Performance: Acceptable (100-1000ms)');
      } else {
        status = 'critical';
        details.push('✗ Performance: Poor (>1000ms)');
        this.consecutiveFailures++;
      }
      
      this.lastHealthCheck = new Date();
      
      return {
        status,
        timestamp: this.lastHealthCheck,
        queryTime,
        shipmentCount: Number(shipmentCount),
        details
      };
      
    } catch (error) {
      this.consecutiveFailures++;
      details.push(`✗ Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        status: 'critical',
        timestamp: new Date(),
        queryTime: Date.now() - startTime,
        shipmentCount: 0,
        details
      };
    }
  }
  
  async testLabelRetrieval(shipmentId: number): Promise<LabelTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await db.execute(sql`
        SELECT 
          id,
          label_pdf,
          carrier_label_pdf,
          CASE 
            WHEN label_pdf IS NOT NULL OR carrier_label_pdf IS NOT NULL 
            THEN true 
            ELSE false 
          END as has_label
        FROM shipments
        WHERE id = ${shipmentId}
      `);
      
      const retrievalTime = Date.now() - startTime;
      const shipment = result.rows[0];
      
      if (!shipment) {
        return {
          success: false,
          shipmentId,
          hasLabel: false,
          retrievalTime,
          error: 'Shipment not found'
        };
      }
      
      return {
        success: true,
        shipmentId,
        hasLabel: Boolean(shipment.has_label),
        retrievalTime
      };
      
    } catch (error) {
      return {
        success: false,
        shipmentId,
        hasLabel: false,
        retrievalTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  async fixSlowQueries(): Promise<{ fixed: boolean; message: string; details: string[] }> {
    const details: string[] = [];
    
    try {
      // Check if we need to create performance indexes
      const indexCheck = await db.execute(sql`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'shipments' 
        AND indexname LIKE 'idx_shipments_%'
      `);
      
      const existingIndexes = indexCheck.rows.map(row => row.indexname);
      details.push(`Found ${existingIndexes.length} existing performance indexes`);
      
      // Create missing performance indexes
      if (!existingIndexes.includes('idx_shipments_status_id')) {
        await db.execute(sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status_id 
          ON shipments (status, id DESC)
        `);
        details.push('✓ Created status+id composite index');
      }
      
      if (!existingIndexes.includes('idx_shipments_user_id')) {
        await db.execute(sql`
          CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_user_id 
          ON shipments (user_id)
        `);
        details.push('✓ Created user_id index');
      }
      
      // Test query performance after optimization
      console.time('[OPTIMIZE] Post-optimization test');
      await db.execute(sql`
        SELECT s.id, s.status, u.company_name
        FROM shipments s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.status IN ('approved', 'in_transit', 'delivered')
        ORDER BY s.id DESC
        LIMIT 50
      `);
      console.timeEnd('[OPTIMIZE] Post-optimization test');
      
      details.push('✓ Query optimization complete');
      
      return {
        fixed: true,
        message: 'Database performance optimized successfully',
        details
      };
      
    } catch (error) {
      details.push(`✗ Optimization failed: ${error instanceof Error ? error.message : String(error)}`);
      
      return {
        fixed: false,
        message: 'Failed to optimize database performance',
        details
      };
    }
  }
  
  getHealthSummary(): { 
    isHealthy: boolean; 
    lastCheck: Date | null; 
    failureCount: number;
  } {
    return {
      isHealthy: this.consecutiveFailures === 0,
      lastCheck: this.lastHealthCheck,
      failureCount: this.consecutiveFailures
    };
  }
}

export const healthMonitor = new DatabaseHealthMonitor();