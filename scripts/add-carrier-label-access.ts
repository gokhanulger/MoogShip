/**
 * This script adds the can_access_carrier_labels field to the users table
 * This is used to control whether regular users can access third-party carrier labels
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addCarrierLabelAccessField() {
  try {
    console.log("Adding can_access_carrier_labels column to users table...");
    
    // Add column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS can_access_carrier_labels BOOLEAN DEFAULT FALSE;
    `);
    
    console.log("✅ Successfully added can_access_carrier_labels column to users table");
  } catch (error) {
    console.error("❌ Error adding can_access_carrier_labels column to users table:", error);
    throw error;
  }
}

async function main() {
  try {
    await addCarrierLabelAccessField();
    console.log("✅ Migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

main();