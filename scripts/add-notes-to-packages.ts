import { pool } from '../server/db';

async function addNotesToPackages() {
  console.log('Adding notes field to packages table...');
  
  try {
    // Check if the column already exists to avoid errors
    const checkColumnQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'packages' AND column_name = 'notes'
    `;
    
    const { rows: columnCheck } = await pool.query(checkColumnQuery);
    
    if (columnCheck.length === 0) {
      // Add the notes column
      await pool.query(`
        ALTER TABLE packages
        ADD COLUMN notes TEXT
      `);
      console.log('Successfully added notes column to packages table');
    } else {
      console.log('Notes column already exists in packages table');
    }
  } catch (error) {
    console.error('Error adding notes field to packages table:', error);
    throw error;
  }
}

async function main() {
  try {
    await addNotesToPackages();
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();