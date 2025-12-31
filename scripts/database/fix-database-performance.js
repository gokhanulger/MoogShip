/**
 * Database Performance Fix and Health Check
 * Comprehensive script to resolve database performance issues
 */

import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function createOptimalIndexes() {
  console.log('[DB OPTIMIZE] Creating performance indexes...');
  
  try {
    // Create composite index for shipments query optimization
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_status_id_desc 
      ON shipments (status, id DESC)
    `);
    
    // Create index for user joins
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_user_id 
      ON shipments (user_id)
    `);
    
    // Create index for tracking queries
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_tracking 
      ON shipments (tracking_number) WHERE tracking_number IS NOT NULL
    `);
    
    // Create index for carrier tracking
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_carrier_tracking 
      ON shipments (carrier_tracking_number) WHERE carrier_tracking_number IS NOT NULL
    `);
    
    // Create index for label access optimization
    await db.execute(sql`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_shipments_labels 
      ON shipments (id) WHERE (label_path IS NOT NULL OR carrier_label_pdf IS NOT NULL)
    `);
    
    console.log('[DB OPTIMIZE] ✓ All performance indexes created successfully');
    return true;
  } catch (error) {
    console.error('[DB OPTIMIZE] ✗ Error creating indexes:', error);
    return false;
  }
}

async function testQueryPerformance() {
  console.log('[DB TEST] Testing query performance...');
  
  try {
    // Test 1: Raw SQL performance
    console.time('[DB TEST] Raw SQL query');
    const rawResult = await db.execute(sql`
      SELECT COUNT(*) as total 
      FROM shipments s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('approved', 'in_transit', 'delivered', 'pending', 'rejected')
    `);
    console.timeEnd('[DB TEST] Raw SQL query');
    
    // Test 2: Admin shipment loading simulation
    console.time('[DB TEST] Admin shipment query');
    const adminResult = await db.execute(sql`
      SELECT 
        s.id, s.status, s.total_price, s.tracking_number,
        u.company_name
      FROM shipments s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status IN ('approved', 'in_transit', 'delivered', 'pending', 'rejected')
      ORDER BY s.id DESC
      LIMIT 100
    `);
    console.timeEnd('[DB TEST] Admin shipment query');
    
    // Test 3: Label retrieval test
    console.time('[DB TEST] Label access query');
    const labelResult = await db.execute(sql`
      SELECT 
        id, label_path, carrier_label_pdf,
        CASE 
          WHEN label_path IS NOT NULL THEN true
          WHEN carrier_label_pdf IS NOT NULL THEN true
          ELSE false
        END as has_label
      FROM shipments
      WHERE status IN ('approved', 'in_transit', 'delivered')
      AND (label_path IS NOT NULL OR carrier_label_pdf IS NOT NULL)
      LIMIT 10
    `);
    console.timeEnd('[DB TEST] Label access query');
    
    console.log(`[DB TEST] Results: ${rawResult[0]?.total} total shipments, ${adminResult.length} admin records, ${labelResult.length} with labels`);
    return true;
  } catch (error) {
    console.error('[DB TEST] ✗ Performance test failed:', error);
    return false;
  }
}

async function fixPricingIssues() {
  console.log('[DB PRICING] Checking for pricing discrepancies...');
  
  try {
    // Find shipments with potential pricing issues (prices stored as cents instead of dollars)
    const suspiciousShipments = await db.execute(sql`
      SELECT id, total_price, original_total_price, status
      FROM shipments 
      WHERE total_price > 10000 
      AND status IN ('approved', 'in_transit', 'delivered')
      ORDER BY id DESC
      LIMIT 10
    `);
    
    console.log(`[DB PRICING] Found ${suspiciousShipments.length} shipments with prices > $100 (potential cent/dollar confusion)`);
    
    if (suspiciousShipments.length > 0) {
      console.log('[DB PRICING] Sample suspicious shipments:');
      suspiciousShipments.forEach(s => {
        console.log(`  - Shipment #${s.id}: $${(s.total_price / 100).toFixed(2)} (stored as ${s.total_price})`);
      });
    }
    
    // Check specific shipments mentioned by user (#324, #328, #329)
    const specificShipments = await db.execute(sql`
      SELECT id, total_price, original_total_price
      FROM shipments 
      WHERE id IN (324, 328, 329)
    `);
    
    console.log('[DB PRICING] Checking specific shipments #324, #328, #329:');
    specificShipments.forEach(s => {
      const totalPrice = s.total_price / 100;
      const originalPrice = s.original_total_price ? s.original_total_price / 100 : 'N/A';
      console.log(`  - Shipment #${s.id}: Total: $${totalPrice.toFixed(2)}, Original: $${originalPrice}`);
    });
    
    return true;
  } catch (error) {
    console.error('[DB PRICING] ✗ Pricing check failed:', error);
    return false;
  }
}

async function checkDatabaseHealth() {
  console.log('[DB HEALTH] Performing comprehensive health check...');
  
  try {
    // Check connection
    await db.execute(sql`SELECT 1 as test`);
    console.log('[DB HEALTH] ✓ Database connection healthy');
    
    // Check table sizes
    const tableStats = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats 
      WHERE tablename IN ('shipments', 'users')
      AND attname IN ('id', 'status', 'user_id')
      ORDER BY tablename, attname
    `);
    
    console.log('[DB HEALTH] ✓ Table statistics retrieved');
    
    // Check for slow queries
    const slowQueries = await db.execute(sql`
      SELECT query, calls, total_time, mean_time
      FROM pg_stat_statements 
      WHERE query LIKE '%shipments%'
      ORDER BY mean_time DESC
      LIMIT 5
    `);
    
    if (slowQueries.length > 0) {
      console.log('[DB HEALTH] Recent slow queries detected');
    } else {
      console.log('[DB HEALTH] ✓ No slow query data available (pg_stat_statements not enabled)');
    }
    
    return true;
  } catch (error) {
    console.error('[DB HEALTH] ✗ Health check failed:', error);
    return false;
  }
}

async function main() {
  console.log('=== Database Performance Fix & Health Check ===');
  console.log('Starting comprehensive database optimization...\n');
  
  try {
    // Step 1: Create optimal indexes
    const indexSuccess = await createOptimalIndexes();
    if (!indexSuccess) {
      console.log('⚠️  Index creation had issues, continuing...\n');
    }
    
    // Step 2: Test query performance
    const perfSuccess = await testQueryPerformance();
    if (!perfSuccess) {
      console.log('⚠️  Performance test had issues, continuing...\n');
    }
    
    // Step 3: Check pricing issues
    const pricingSuccess = await fixPricingIssues();
    if (!pricingSuccess) {
      console.log('⚠️  Pricing check had issues, continuing...\n');
    }
    
    // Step 4: Overall health check
    const healthSuccess = await checkDatabaseHealth();
    if (!healthSuccess) {
      console.log('⚠️  Health check had issues\n');
    }
    
    console.log('=== Database Optimization Complete ===');
    console.log('Results:');
    console.log(`  - Indexes: ${indexSuccess ? '✓ Created' : '✗ Failed'}`);
    console.log(`  - Performance: ${perfSuccess ? '✓ Tested' : '✗ Failed'}`);
    console.log(`  - Pricing: ${pricingSuccess ? '✓ Checked' : '✗ Failed'}`);
    console.log(`  - Health: ${healthSuccess ? '✓ Healthy' : '✗ Issues'}`);
    
  } catch (error) {
    console.error('Fatal error in database optimization:', error);
    process.exit(1);
  }
}

// Run the optimization
main().catch(console.error);