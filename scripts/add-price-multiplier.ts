import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adding price_multiplier column to users table...");
    
    // Check if the column already exists
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='price_multiplier'
    `);
    
    if (checkResult.rows.length === 0) {
      // Add the price_multiplier column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN price_multiplier REAL NOT NULL DEFAULT 1
      `);
      console.log("✅ price_multiplier column added successfully");
    } else {
      console.log("📝 price_multiplier column already exists");
    }
    
    console.log("Done!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();