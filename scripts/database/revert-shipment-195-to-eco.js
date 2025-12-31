/**
 * Revert shipment 195 back to ECO service and clear the UPS tracking number
 * This maintains the ECO service selection as intended by the user
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function revertShipment195ToEco() {
  try {
    console.log("Reverting shipment 195 to ECO service and clearing UPS tracking");
    
    // Revert to ECO service and clear the conflicting UPS tracking number
    await pool.query(`
      UPDATE shipments 
      SET selected_service = 'shipentegra-eco',
          service_level = 'eco',
          provider_service_code = 'shipentegra-eco',
          carrier_tracking_number = NULL,
          status = 'approved',
          label_url = NULL,
          label_pdf = NULL,
          carrier_label_url = NULL,
          carrier_label_pdf = NULL,
          label_error = NULL
      WHERE id = 195
    `);
    
    console.log("Successfully reverted shipment 195 to ECO service");
    
    // Verify the changes
    const updatedData = await pool.query(`
      SELECT id, selected_service, service_level, provider_service_code, 
             carrier_tracking_number, status, tracking_number
      FROM shipments WHERE id = 195
    `);
    
    console.log("Updated shipment data:", updatedData.rows[0]);
    console.log("Shipment 195 is now properly configured as ECO service and ready for ECO label generation");
    
  } catch (error) {
    console.error("Error reverting shipment 195:", error);
  } finally {
    await pool.end();
  }
}

revertShipment195ToEco().catch(console.error);