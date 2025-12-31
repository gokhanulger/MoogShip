import { db } from "../server/db";
import { userProducts } from "../shared/schema";
import { sql } from "drizzle-orm";

async function addSkuToProducts() {
  try {
    console.log("Adding sku column to user_products table...");
    
    // Check if the column exists first
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_products' AND column_name = 'sku';
    `);
    
    if (checkColumn.length === 0) {
      // Add the column if it doesn't exist
      await db.execute(sql`
        ALTER TABLE user_products 
        ADD COLUMN IF NOT EXISTS sku TEXT;
      `);
      console.log("Successfully added sku column to user_products table");
    } else {
      console.log("Column 'sku' already exists in user_products table");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error in migration:", error);
  } finally {
    process.exit(0);
  }
}

addSkuToProducts();