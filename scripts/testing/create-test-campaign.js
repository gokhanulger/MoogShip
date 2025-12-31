/**
 * Create a test email campaign to demonstrate the To section functionality
 */
const { drizzle } = require("drizzle-orm/postgres-js");
const postgres = require("postgres");

const sql = postgres(process.env.DATABASE_URL);
const db = drizzle(sql);

async function createTestCampaign() {
  try {
    const result = await sql`
      INSERT INTO email_campaigns (title, subject, content, text_content, status, created_by, created_at)
      VALUES (
        'Test Campaign for To Section',
        'Welcome to Moogship',
        '<h1>Welcome!</h1><p>Thank you for choosing Moogship for your shipping needs.</p>',
        'Welcome! Thank you for choosing Moogship for your shipping needs.',
        'draft',
        1,
        NOW()
      )
      RETURNING id, title, status
    `;
    
    console.log('✅ Created test campaign:', result[0]);
    console.log('Now refresh the Email Campaigns page to see your draft campaign');
    console.log('Then click the "Send" button to open the user selection dialog with the "To" section');
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error.message);
  } finally {
    await sql.end();
  }
}

createTestCampaign();