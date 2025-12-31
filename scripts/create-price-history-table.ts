import { pool } from "../server/db";

async function main() {
  console.log("Creating price_history table if it doesn't exist...");
  
  try {
    // Create the price_history table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS price_history (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        previous_base_price INTEGER NOT NULL,
        previous_fuel_charge INTEGER NOT NULL,
        previous_total_price INTEGER NOT NULL,
        new_base_price INTEGER NOT NULL,
        new_fuel_charge INTEGER NOT NULL,
        new_total_price INTEGER NOT NULL,
        dimensions_changed BOOLEAN DEFAULT FALSE,
        weight_changed BOOLEAN DEFAULT FALSE,
        address_changed BOOLEAN DEFAULT FALSE,
        service_level_changed BOOLEAN DEFAULT FALSE,
        is_auto_recalculation BOOLEAN DEFAULT TRUE,
        change_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    console.log("✅ price_history table created or already exists");
    
    // Create an index on shipment_id for faster queries
    const createIndexQuery = `
      CREATE INDEX IF NOT EXISTS idx_price_history_shipment_id ON price_history(shipment_id);
    `;
    
    await pool.query(createIndexQuery);
    console.log("✅ Index created on price_history(shipment_id)");

    console.log("Done! The price history table is ready to use.");
  } catch (error) {
    console.error("❌ Error creating price_history table:", error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main().catch(console.error);