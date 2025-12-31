import { packageItems } from '../shared/schema';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Creating package_items table...');
    
    // First, check if the table already exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'package_items'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('package_items table already exists, skipping creation.');
      return;
    }
    
    // Create the package_items table
    await db.execute(sql`
      CREATE TABLE package_items (
        id SERIAL PRIMARY KEY,
        shipment_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        price INTEGER NOT NULL,
        gtin TEXT,
        hs_code TEXT,
        weight REAL,
        length INTEGER,
        width INTEGER,
        height INTEGER,
        country_of_origin TEXT,
        manufacturer TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
      );
    `);
    
    console.log('Successfully created package_items table.');
  } catch (error) {
    console.error('Error creating package_items table:', error);
    process.exit(1);
  }
}

main();