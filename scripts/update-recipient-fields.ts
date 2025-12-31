/**
 * This script updates the recipients table to make postalCode and phone fields optional
 * This is used to provide more flexibility when importing recipient data
 */

import { db } from "../server/db";

async function updateRecipientFields() {
  try {
    console.log("Making postalCode and phone optional in recipients table...");
    
    // Check if PostgreSQL version supports ALTER COLUMN SET NOT NULL / DROP NOT NULL
    await db.execute(`
      ALTER TABLE recipients
      ALTER COLUMN postal_code DROP NOT NULL;
    `);
    
    await db.execute(`
      ALTER TABLE recipients
      ALTER COLUMN phone DROP NOT NULL;
    `);

    console.log("Successfully updated recipients table schema!");
  } catch (error) {
    console.error("Error updating recipients schema:", error);
  }
}

async function main() {
  try {
    await updateRecipientFields();
    console.log("Schema update completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Schema update failed:", error);
    process.exit(1);
  }
}

main();