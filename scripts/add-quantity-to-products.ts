// Script to add the quantity field to user_products table
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adding quantity field to user_products table...");
    
    // Check if column exists first to avoid errors
    const checkColumnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_products' AND column_name = 'quantity'
    `);
    
    if (checkColumnExists.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE user_products
        ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1
      `);
      console.log("✅ Successfully added quantity field to user_products table");
    } else {
      console.log("✅ quantity field already exists in user_products table");
    }
    
  } catch (error) {
    console.error("❌ Error adding quantity field to user_products table:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();