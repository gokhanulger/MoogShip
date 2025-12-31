import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the customs_item_count field to the shipments table if it doesn't exist already
 * This is used to store the total number of items for customs declaration
 */
async function addCustomsItemCountField() {
  try {
    console.log("Adding customs_item_count field to shipments table...");
    
    // Execute the SQL query directly on the pool
    await pool.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS customs_item_count INTEGER;
    `);
    
    console.log("Successfully added customs_item_count field to shipments table");
  } catch (error) {
    console.error("Error adding customs_item_count field:", error);
    throw error;
  }
}

async function main() {
  try {
    await addCustomsItemCountField();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();