/**
 * Clear all active sessions to fix session conflicts
 */
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');

async function clearAllSessions() {
  try {
    console.log('Starting session cleanup...');
    
    // Connect to database
    const sql = postgres(process.env.DATABASE_URL);
    const db = drizzle(sql);
    
    // Clear all sessions from the session store
    const result = await sql`DELETE FROM sessions`;
    console.log('Cleared sessions from database:', result.count);
    
    console.log('✓ All sessions cleared successfully');
    console.log('Please refresh your browser and log in again as admin');
    
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing sessions:', error);
    process.exit(1);
  }
}

clearAllSessions();