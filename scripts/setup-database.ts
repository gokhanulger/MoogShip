import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';
import { relations, sql } from 'drizzle-orm';

// Configure neon to use websockets for serverless connections
neonConfig.webSocketConstructor = ws;

async function setupDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  console.log('Initializing database connection...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  // Test the database connection
  try {
    const result = await db.execute(sql`SELECT 1 AS test`);
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }

  console.log('Database setup completed successfully');
  await pool.end();
}

setupDatabase().catch((err) => {
  console.error('Database setup failed:', err);
  process.exit(1);
});