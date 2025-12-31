/**
 * This script adds insurance-related fields to the shipments table and creates an insurance_ranges table
 * - insuranceValue: The declared value of the shipment for insurance (in cents)
 * - insuranceCost: The cost of the insurance (in cents)
 * - isInsured: Whether the shipment is insured
 * 
 * It also creates a new table insurance_ranges to store admin-defined insurance pricing tiers
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;

// For migrations and simple queries
const migrationClient = postgres(connectionString, { max: 1 });
const db = drizzle(migrationClient);

async function addInsuranceFields() {
  console.log("Adding insurance fields to shipments table...");
  
  // Check if the fields already exist in the shipments table
  const insuranceFieldsExist = await db.execute(sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'shipments' AND column_name = 'insurance_value'
  `);

  if (insuranceFieldsExist.length > 0) {
    console.log("Insurance fields already exist in the shipments table.");
  } else {
    // Add insurance fields to the shipments table
    await db.execute(sql`
      ALTER TABLE shipments 
      ADD COLUMN insurance_value INTEGER,
      ADD COLUMN insurance_cost INTEGER,
      ADD COLUMN is_insured BOOLEAN DEFAULT FALSE
    `);
    console.log("Insurance fields added to shipments table successfully.");
  }

  // Check if the insurance_ranges table exists
  const insuranceRangesTableExists = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_name = 'insurance_ranges'
  `);

  if (insuranceRangesTableExists.length > 0) {
    console.log("Insurance ranges table already exists.");
  } else {
    // Create the insurance_ranges table
    await db.execute(sql`
      CREATE TABLE insurance_ranges (
        id SERIAL PRIMARY KEY,
        min_value INTEGER NOT NULL,
        max_value INTEGER NOT NULL,
        insurance_cost INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER NOT NULL
      )
    `);

    // Create a unique index on min_value and max_value
    await db.execute(sql`
      CREATE UNIQUE INDEX value_range_idx ON insurance_ranges (min_value, max_value)
    `);

    console.log("Insurance ranges table created successfully.");
  }
}

async function main() {
  try {
    await addInsuranceFields();
    console.log("Insurance migration completed successfully.");
  } catch (error) {
    console.error("Error during migration:", error);
  } finally {
    await migrationClient.end();
  }
}

main();