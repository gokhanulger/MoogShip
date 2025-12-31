/**
 * This script adds separate carrier label fields to the shipments table
 * - carrierLabelUrl: Store the URL for carrier labels
 * - carrierLabelPdf: Store the PDF data for carrier labels
 * 
 * This allows the system to maintain both MoogShip labels and carrier labels simultaneously 
 * instead of overwriting one with the other.
 */
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addCarrierLabelFields() {
  console.log('Adding carrier label fields to shipments table...');
  
  try {
    // Add carrierLabelUrl field
    await db.execute(sql`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS carrier_label_url TEXT;
    `);
    console.log('Added carrier_label_url column');
    
    // Add carrierLabelPdf field
    await db.execute(sql`
      ALTER TABLE shipments
      ADD COLUMN IF NOT EXISTS carrier_label_pdf TEXT;
    `);
    console.log('Added carrier_label_pdf column');
    
    console.log('Successfully added carrier label fields to shipments table');
  } catch (error) {
    console.error('Error adding carrier label fields:', error);
    throw error;
  }
}

async function main() {
  try {
    await addCarrierLabelFields();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();