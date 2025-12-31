import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the receiver_email field to the shipments table
 * This is used to store the recipient's email address
 */
async function addReceiverEmailField() {
  try {
    console.log("Adding receiver_email field to shipments table...");
    
    // Execute the SQL query directly on the pool
    await pool.query(`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS receiver_email TEXT;
    `);
    
    console.log("Successfully added receiver_email field to shipments table");
  } catch (error) {
    console.error("Error adding receiver_email field:", error);
    throw error;
  }
}

async function main() {
  try {
    await addReceiverEmailField();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();