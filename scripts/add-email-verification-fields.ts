/**
 * This script adds email verification fields to the users table
 * - isEmailVerified: Boolean flag to track if the email has been verified
 * - emailVerificationToken: Token sent to user for email verification
 * - emailVerificationExpires: When the verification token expires
 */

import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addEmailVerificationFields() {
  try {
    console.log("Adding email verification fields to users table...");
    
    // Check if the columns already exist
    const checkIsEmailVerifiedQuery = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'is_email_verified';
    `;
    
    const checkEmailVerificationTokenQuery = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verification_token';
    `;
    
    const checkEmailVerificationExpiresQuery = sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verification_expires';
    `;
    
    const isEmailVerifiedExists = await db.execute(checkIsEmailVerifiedQuery);
    const emailVerificationTokenExists = await db.execute(checkEmailVerificationTokenQuery);
    const emailVerificationExpiresExists = await db.execute(checkEmailVerificationExpiresQuery);
    
    // Add isEmailVerified column if it doesn't exist
    if (isEmailVerifiedExists.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;
      `);
      console.log("Successfully added is_email_verified field to users table");
    } else {
      console.log("is_email_verified field already exists in users table, skipping");
    }
    
    // Add emailVerificationToken column if it doesn't exist
    if (emailVerificationTokenExists.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN email_verification_token TEXT;
      `);
      console.log("Successfully added email_verification_token field to users table");
    } else {
      console.log("email_verification_token field already exists in users table, skipping");
    }
    
    // Add emailVerificationExpires column if it doesn't exist
    if (emailVerificationExpiresExists.length === 0) {
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN email_verification_expires TIMESTAMP;
      `);
      console.log("Successfully added email_verification_expires field to users table");
    } else {
      console.log("email_verification_expires field already exists in users table, skipping");
    }
  } catch (error) {
    console.error("Error adding email verification fields to users table:", error);
    throw error;
  }
}

async function main() {
  try {
    await addEmailVerificationFields();
    console.log("Email verification fields migration completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();