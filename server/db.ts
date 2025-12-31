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

// Run a test connection when this module loads and set up periodic health checks
testConnection().then(isConnected => {
  if (isConnected) {
    console.log('[DB] Database connection verified and working properly');
    globalConnectionStatus.failedAttempts = 0;
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