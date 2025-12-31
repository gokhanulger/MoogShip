/**
 * Fix shipment 195 service data and regenerate label
 * This corrects the service inconsistency and triggers proper label generation
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function fixShipment195() {
  try {
    console.log("Starting service fix for shipment 195");
    
    // First, let's analyze the current state
    const currentData = await pool.query(`
      SELECT id, selected_service, service_level, provider_service_code, 
             carrier_tracking_number, status, label_error
      FROM shipments WHERE id = 195
    `);
    
    console.log("Current shipment data:", currentData.rows[0]);
    
    // The issue: shipment has ECO service but UPS tracking number
    // This suggests it should be UPS Express service, not ECO
    
    // Check if this should be UPS Express based on the tracking number
    const hasUpsTracking = currentData.rows[0].carrier_tracking_number?.startsWith('1Z');
    
    if (hasUpsTracking) {
      console.log("Detected UPS tracking number, correcting service to UPS Express");
      
      // Update the service fields to match UPS Express
      await pool.query(`
        UPDATE shipments 
        SET selected_service = 'shipentegra-ups-ekspress',
            service_level = 'express',
            provider_service_code = 'shipentegra-ups-ekspress',
            label_error = NULL
        WHERE id = 195
      `);
      
      console.log("Updated service fields to UPS Express");
    } else {
      console.log("No UPS tracking detected, clearing carrier tracking and setting to ECO");
      
      // Clear the carrier tracking number and ensure ECO service
      await pool.query(`
        UPDATE shipments 
        SET selected_service = 'shipentegra-eco',
            service_level = 'eco',
            provider_service_code = 'shipentegra-eco',
            carrier_tracking_number = NULL,
            label_error = NULL
        WHERE id = 195
      `);
      
      console.log("Cleared carrier tracking and set to ECO service");
    }
    
    // Verify the changes
    const updatedData = await pool.query(`
      SELECT id, selected_service, service_level, provider_service_code, 
             carrier_tracking_number, status, label_error
      FROM shipments WHERE id = 195
    `);
    
    console.log("Updated shipment data:", updatedData.rows[0]);
    
    // Reset status to approved to allow label regeneration
    await pool.query(`
      UPDATE shipments 
      SET status = 'approved',
          label_url = NULL,
          label_pdf = NULL,
          carrier_label_url = NULL,
          carrier_label_pdf = NULL
      WHERE id = 195
    `);
    
    console.log("Reset shipment status and cleared existing labels");
    console.log("Shipment 195 is now ready for label regeneration through the admin interface");
    
  } catch (error) {
    console.error("Error fixing shipment 195:", error);
  } finally {
    await pool.end();
  }
}

fixShipment195().catch(console.error);