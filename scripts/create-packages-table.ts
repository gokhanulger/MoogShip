import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Starting packages table creation script...");

  try {
    // Create the packages table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS packages (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
        name VARCHAR(255),
        description TEXT,
        weight DECIMAL(10, 2) NOT NULL,
        length DECIMAL(10, 2) NOT NULL,
        width DECIMAL(10, 2) NOT NULL,
        height DECIMAL(10, 2) NOT NULL,
        volumetric_weight DECIMAL(10, 2) GENERATED ALWAYS AS (length * width * height / 5000) STORED,
        billable_weight DECIMAL(10, 2) GENERATED ALWAYS AS (GREATEST(weight, length * width * height / 5000)) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Packages table created successfully");

    // Add index for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_packages_shipment_id ON packages(shipment_id)
    `);

    console.log("Added index for packages table");
    
    console.log("Schema update completed successfully!");
  } catch (error) {
    console.error("Error creating packages table:", error);
    process.exit(1);
  }

  process.exit(0);
}

main();