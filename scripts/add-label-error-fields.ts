import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds error tracking fields to the shipments table
 * - labelError: Text field to store error messages when label purchases fail
 * - labelAttempts: Integer to track number of attempts to purchase a label
 */
async function addLabelErrorFields() {
  console.log('Adding label error tracking fields to shipments table...');
  
  try {
    // Add labelError column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS label_error TEXT
    `);
    
    // Add labelAttempts column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS label_attempts INTEGER DEFAULT 0
    `);
    
    console.log('Successfully added label error tracking fields to shipments table');
  } catch (error) {
    console.error('Error adding label error tracking fields:', error);
    throw error;
  }
}

async function main() {
  try {
    await addLabelErrorFields();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();