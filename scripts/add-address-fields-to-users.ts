/**
 * This script adds separate address fields to the users table
 * - address1: Primary address line (max 35 chars for ShipEntegra)
 * - address2: Secondary address line (optional)
 * 
 * This allows the system to maintain properly formatted address fields that meet
 * ShipEntegra's 35-character limitation per address line.
 */

import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function addAddressFieldsToUsers() {
  try {
    console.log("Adding address1 and address2 fields to users table...");
    
    // Check if the columns already exist
    const checkQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('address1', 'address2')
    `;
    
    const result = await db.execute(checkQuery);
    
    // Extract existing column names
    const existingColumns = result.rows.map((row: any) => row.column_name);
    
    // If address1 doesn't exist, add it
    if (!existingColumns.includes('address1')) {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN address1 TEXT
      `);
      console.log("✅ Added address1 column to users table");
    } else {
      console.log("⚠️ address1 column already exists, skipping");
    }
    
    // If address2 doesn't exist, add it
    if (!existingColumns.includes('address2')) {
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN address2 TEXT
      `);
      console.log("✅ Added address2 column to users table");
    } else {
      console.log("⚠️ address2 column already exists, skipping");
    }

    // Check if there are existing users with address data to migrate
    const usersQuery = sql`
      SELECT id, address 
      FROM users 
      WHERE address IS NOT NULL AND address != ''
    `;
    
    const usersResult = await db.execute(usersQuery);
    const usersToUpdate = usersResult.rows;
    
    if (usersToUpdate.length > 0) {
      console.log(`Found ${usersToUpdate.length} users with existing address data to migrate`);
      
      for (const user of usersToUpdate) {
        const addressValue = user.address;
        
        // Simple logic to split address - if it's longer than 35 chars, divide it
        let address1 = addressValue;
        let address2 = '';
        
        if (addressValue.length > 35) {
          // Try to find a good place to split the address
          const spaceIndex = addressValue.lastIndexOf(' ', 35);
          if (spaceIndex > 10) { // Don't split if the space is too early in the string
            address1 = addressValue.substring(0, spaceIndex);
            address2 = addressValue.substring(spaceIndex + 1);
          } else {
            // Just cut at 35 characters if no good splitting point found
            address1 = addressValue.substring(0, 35);
            address2 = addressValue.substring(35);
          }
        }
        
        // Update the user with the new address fields
        await db.execute(sql`
          UPDATE users 
          SET address1 = ${address1}, address2 = ${address2}
          WHERE id = ${user.id}
        `);
      }
      
      console.log(`✅ Updated ${usersToUpdate.length} users with split address data`);
    } else {
      console.log("No existing address data to migrate");
    }
    
    console.log("Address fields migration completed successfully!");
  } catch (error) {
    console.error("Error adding address fields to users table:", error);
    throw error;
  }
}

async function main() {
  try {
    await addAddressFieldsToUsers();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

main();