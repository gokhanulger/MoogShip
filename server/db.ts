import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { sql } from 'drizzle-orm';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Connection management
const CONNECTION_RETRY_LIMIT = 5;
const CONNECTION_RETRY_DELAY_MS = 5000;

// Global connection status tracking
export const globalConnectionStatus = {
  isConnected: false,
  isRetrying: false,
  failedAttempts: 0,
  lastError: null as Error | null,
  pool: null as Pool | null,
  db: null as ReturnType<typeof drizzle> | null,
};

console.log('[DB] Initializing database connection...');

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize connection pool
export const createConnectionPool = (): { pool: Pool, db: ReturnType<typeof drizzle> } => {
  const databaseUrl = process.env.DATABASE_URL;
  console.log('[DB] Creating connection pool with DATABASE_URL length:', databaseUrl?.length);
  console.log('[DB] DATABASE_URL hostname:', databaseUrl ? new URL(databaseUrl).hostname : 'undefined');
  console.log('[DB] NODE_ENV:', process.env.NODE_ENV);
  console.log('[DB] REPL_ID:', process.env.REPL_ID || 'undefined');
  
  const pool = new Pool({ connectionString: databaseUrl });
  console.log('[DB] Drizzle ORM initialized directly');
  const db = drizzle(pool, { schema });
  
  // Update global reference
  globalConnectionStatus.pool = pool;
  globalConnectionStatus.db = db;
  
  return { pool, db };
};

// Initial connection creation
const { pool, db } = createConnectionPool();
export { pool, db };

// Test the database connection
export async function testConnection(): Promise<boolean> {
  try {
    if (!globalConnectionStatus.pool || !globalConnectionStatus.db) {
      console.error('[DB] Pool or DB not initialized');
      return false;
    }
    
    // Simple query to test connection
    await globalConnectionStatus.db.execute(sql`SELECT 1 AS test`);
    console.log('[DB] Test query executed successfully');
    
    globalConnectionStatus.isConnected = true;
    return true;
  } catch (error) {
    console.error('[DB] Connection test failed:', error);
    globalConnectionStatus.isConnected = false;
    globalConnectionStatus.lastError = error instanceof Error ? error : new Error(String(error));
    globalConnectionStatus.failedAttempts++;
    return false;
  }
}

// Recreate connection pool if needed
export async function recreateConnectionPool(): Promise<boolean> {
  globalConnectionStatus.isRetrying = true;
  
  try {
    console.log('[DB] Attempting to recreate connection pool...');
    
    // Close existing pool if it exists
    if (globalConnectionStatus.pool) {
      try {
        await globalConnectionStatus.pool.end();
      } catch (err) {
        console.warn('[DB] Error closing existing pool:', err);
      }
    }
    
    // Create new connection
    const { pool: newPool, db: newDb } = createConnectionPool();
    globalConnectionStatus.pool = newPool;
    globalConnectionStatus.db = newDb;
    
    // Test the new connection
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('[DB] Successfully reconnected to database');
      globalConnectionStatus.failedAttempts = 0;
    } else {
      console.error('[DB] Failed to reconnect to database');
      globalConnectionStatus.failedAttempts++;
    }
    
    globalConnectionStatus.isRetrying = false;
    return isConnected;
  } catch (error) {
    console.error('[DB] Error recreating connection:', error);
    globalConnectionStatus.lastError = error instanceof Error ? error : new Error(String(error));
    globalConnectionStatus.failedAttempts++;
    globalConnectionStatus.isRetrying = false;
    return false;
  }
}

// Ensure required tables exist (for new tables added without migration)
async function ensureTablesExist(): Promise<void> {
  try {
    // Create pricingCalculationLogs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pricing_calculation_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        username TEXT,
        shipment_id INTEGER,
        package_weight REAL NOT NULL,
        package_length REAL,
        package_width REAL,
        package_height REAL,
        volumetric_weight REAL,
        billable_weight REAL,
        receiver_country TEXT NOT NULL,
        user_multiplier REAL NOT NULL,
        country_multiplier REAL,
        weight_multiplier REAL,
        combined_multiplier REAL NOT NULL,
        country_rule_source TEXT,
        weight_rule_source TEXT,
        applied_rules JSONB,
        api_responses JSONB,
        base_price INTEGER,
        final_price INTEGER,
        selected_service TEXT,
        pricing_options JSONB,
        request_source TEXT,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[DB] Ensured pricing_calculation_logs table exists');

    // Add api_responses column if it doesn't exist (for existing tables)
    await db.execute(sql`
      ALTER TABLE pricing_calculation_logs
      ADD COLUMN IF NOT EXISTS api_responses JSONB
    `);
    console.log('[DB] Ensured api_responses column exists');

    // Add pricing_method column to users table if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS pricing_method TEXT NOT NULL DEFAULT 'default'
    `);
    console.log('[DB] Ensured pricing_method column exists in users table');
  } catch (error) {
    console.error('[DB] Error ensuring tables exist:', error);
  }
}

// Run a test connection when this module loads and set up periodic health checks
testConnection().then(async isConnected => {
  if (isConnected) {
    console.log('[DB] Database connection verified and working properly');
    globalConnectionStatus.failedAttempts = 0;
    // Ensure all required tables exist
    await ensureTablesExist();
  } else {
    console.error('[DB] WARNING: Could not verify database connection');
    // Schedule a retry if initial connection fails
    if (globalConnectionStatus.failedAttempts < CONNECTION_RETRY_LIMIT) {
      console.log(`[DB] Scheduling connection retry in ${CONNECTION_RETRY_DELAY_MS}ms...`);
      setTimeout(() => {
        recreateConnectionPool().catch(console.error);
      }, CONNECTION_RETRY_DELAY_MS);
    }
  }
}).catch(err => {
  console.error('[DB] Error testing connection:', err);
  globalConnectionStatus.lastError = err;
});

// Set up periodic connection health check every 5 minutes
setInterval(async () => {
  if (!globalConnectionStatus.isConnected && !globalConnectionStatus.isRetrying) {
    console.log('[DB] Running periodic connection health check...');
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('[DB] Periodic health check: Database connection is healthy');
    } else {
      console.warn('[DB] Periodic health check: Database connection is unhealthy');
      if (globalConnectionStatus.failedAttempts < CONNECTION_RETRY_LIMIT) {
        await recreateConnectionPool();
      }
    }
  }
}, 300000); // 5 minutes