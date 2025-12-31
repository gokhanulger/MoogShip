import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds the carrier_tracking_number field to the shipments table
 * This is used to store third-party carrier tracking numbers from shipping providers like ShipEntegra
 */
async function addCarrierTrackingNumber() {
  console.log('Adding carrier_tracking_number field to shipments table...');
  
  try {
    // Add carrier_tracking_number column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS carrier_tracking_number TEXT
    `);
    
    console.log('Successfully added carrier_tracking_number field to shipments table');
  } catch (error) {
    console.error('Error adding carrier_tracking_number field:', error);
    throw error;
  }
}

async function main() {
  try {
    await addCarrierTrackingNumber();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();