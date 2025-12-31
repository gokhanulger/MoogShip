import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds customs fields to the shipments table
 * - customsValue: Total value of items in cents
 * - customsItemCount: Total number of items for customs declaration
 */
async function addCustomsFields() {
  try {
    console.log('Adding customs value and item count fields to shipments table...');
    
    // First check if the columns already exist
    const checkQuery = sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'shipments' 
      AND column_name IN ('customs_value', 'customs_item_count');
    `;
    
    const existingColumns = await db.execute(checkQuery);
    const existingColumnNames = existingColumns.rows.map((row: any) => row.column_name);
    
    // Add columns that don't exist yet
    if (!existingColumnNames.includes('customs_value')) {
      console.log('Adding customs_value column...');
      await db.execute(sql`
        ALTER TABLE shipments 
        ADD COLUMN customs_value INTEGER;
      `);
      console.log('Added customs_value column');
    } else {
      console.log('customs_value column already exists');
    }
    
    if (!existingColumnNames.includes('customs_item_count')) {
      console.log('Adding customs_item_count column...');
      await db.execute(sql`
        ALTER TABLE shipments 
        ADD COLUMN customs_item_count INTEGER;
      `);
      console.log('Added customs_item_count column');
    } else {
      console.log('customs_item_count column already exists');
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
async function main() {
  try {
    await addCustomsFields();
    process.exit(0);
  } catch (error) {
    console.error('Failed to run migration:', error);
    process.exit(1);
  }
}

main();