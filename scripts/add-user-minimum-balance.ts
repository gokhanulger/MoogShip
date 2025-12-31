/**
 * This script adds the minimum_balance field to the users table
 * This is used to set per-user minimum balance limits
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addUserMinimumBalanceField() {
  try {
    console.log("Adding minimum_balance field to users table...");
    
    // Check if the column already exists
    const checkColumnQuery = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'minimum_balance';
    `;
    
    const columnExists = await db.execute(checkColumnQuery);
    
    if (columnExists.length === 0) {
      // Column doesn't exist, add it
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN minimum_balance INTEGER;
      `);
      console.log("Successfully added minimum_balance field to users table");
    } else {
      console.log("minimum_balance field already exists in users table, skipping");
    }
  } catch (error) {
    console.error("Error adding minimum_balance field to users table:", error);
    throw error;
  }
}

async function main() {
  try {
    await addUserMinimumBalanceField();
    console.log("User minimum balance field migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();