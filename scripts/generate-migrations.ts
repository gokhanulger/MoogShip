import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// This script will generate the SQL for creating the tables defined in our schema
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('Migrations complete!');

  await pool.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});