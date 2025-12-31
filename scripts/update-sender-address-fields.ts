import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script updates the sender address fields in the shipments table
 * to support the 35 character limit for ShipEntegra API:
 * - Replaces single senderAddress with senderAddress1 and senderAddress2
 * - Updates existing data to properly migrate values
 */
async function updateSenderAddressFields() {
  try {
    console.log("Updating sender address fields in shipments table...");
    
    // Check if the columns already exist
    const checkQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shipments' AND column_name = 'sender_address1'
    `;
    
    const result = await db.execute(checkQuery);
    
    // The result will be an object with rows property
    if (result.rows && result.rows.length === 0) {
      // First add the new columns 
      await db.execute(sql`
        ALTER TABLE shipments
        ADD COLUMN sender_address1 TEXT,
        ADD COLUMN sender_address2 TEXT
      `);
      
      console.log("Successfully added sender_address1 and sender_address2 columns");
      
      // Copy data from sender_address to sender_address1
      // For existing shipments, we'll put everything in address1 and leave address2 empty
      await db.execute(sql`
        UPDATE shipments 
        SET sender_address1 = sender_address
      `);
      
      console.log("Successfully copied existing sender address data to sender_address1");
      
      // Make sender_address1 NOT NULL after data migration
      await db.execute(sql`
        ALTER TABLE shipments
        ALTER COLUMN sender_address1 SET NOT NULL
      `);
      
      console.log("Successfully set NOT NULL constraint on sender_address1");
      
      // We'll keep the original sender_address column for now to avoid breaking existing code
      // It can be removed later after all code is updated to use the new columns
    } else {
      console.log("sender_address1 and sender_address2 fields already exist in shipments table");
    }
  } catch (error) {
    console.error("Error updating sender address fields:", error);
    throw error;
  }
}

async function main() {
  try {
    await updateSenderAddressFields();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

main();