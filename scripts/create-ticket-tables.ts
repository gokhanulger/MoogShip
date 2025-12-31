import { db } from '../server/db';
import { schema } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Creating support ticket tables...');

  try {
    // Create support_tickets table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        assigned_to INTEGER,
        related_shipment_id INTEGER,
        closed_at TIMESTAMP WITH TIME ZONE,
        closed_by INTEGER,
        closure_reason TEXT
      )
    `);

    console.log('Created support_tickets table');

    // Create ticket_responses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        is_admin_response BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        attachment_url TEXT
      )
    `);

    console.log('Created ticket_responses table');

    console.log('Support ticket tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error in migration script:', err);
  process.exit(1);
});