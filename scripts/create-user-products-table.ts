import { db } from "../server/db";
import { userProducts } from "../shared/schema";

async function main() {
  console.log("Creating user_products table...");
  
  try {
    // Create the user_products table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price INTEGER NOT NULL,
        gtin TEXT,
        hs_code TEXT,
        weight REAL,
        length INTEGER,
        width INTEGER,
        height INTEGER,
        country_of_origin TEXT,
        manufacturer TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ user_products table created successfully!");
    
    // Add index on user_id for faster lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS user_products_user_id_idx ON user_products (user_id);
    `);
    
    console.log("✅ Index on user_id created successfully!");
    
    // Add index on name for faster searches when autocompleting
    await db.execute(`
      CREATE INDEX IF NOT EXISTS user_products_name_idx ON user_products (name);
    `);
    
    console.log("✅ Index on name created successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating user_products table:", error);
    process.exit(1);
  }
}

main();