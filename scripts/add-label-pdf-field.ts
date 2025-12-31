import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the label_pdf field to the shipments table
 * This is used to store the actual PDF data of shipping labels
 */
async function addLabelPdfField() {
  try {
    console.log("Adding label_pdf field to shipments table...");
    
    // Check if the column already exists
    const checkQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shipments' AND column_name = 'label_pdf'
    `;
    
    const result = await db.execute(checkQuery);
    
    if (result.length === 0) {
      // Column doesn't exist, create it
      await db.execute(sql`
        ALTER TABLE shipments
        ADD COLUMN label_pdf TEXT
      `);
      console.log("Successfully added label_pdf field to shipments table");
    } else {
      console.log("label_pdf field already exists in shipments table");
    }
  } catch (error) {
    console.error("Error adding label_pdf field:", error);
    throw error;
  }
}

async function main() {
  try {
    await addLabelPdfField();
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

main();