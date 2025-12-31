import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { boolean, pgTable, timestamp } from 'drizzle-orm/pg-core';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize a postgres connection
const connectionString = process.env.DATABASE_URL || '';
const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

// Migration to add sentToShipEntegra fields to the shipments table
async function addShipEntegraFields() {
  try {
    console.log('Adding ShipEntegra fields to the shipments table...');
    
    // Check if columns already exist
    try {
      await sql`
        ALTER TABLE shipments
        ADD COLUMN IF NOT EXISTS sent_to_shipentegra BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS sent_to_shipentegra_at TIMESTAMP
      `;
      console.log('Successfully added ShipEntegra fields to the shipments table');
    } catch (error) {
      console.error('Error adding ShipEntegra fields to the shipments table:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

// Run the migration
addShipEntegraFields()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });