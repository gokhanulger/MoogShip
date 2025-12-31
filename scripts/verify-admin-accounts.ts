/**
 * This script updates all admin accounts to have isEmailVerified=true
 * This ensures admin accounts like admin@moogship.com bypass email verification
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function verifyAdminAccounts() {
  try {
    console.log("Starting admin account verification script...");
    
    // Update all admin accounts to be verified
    const result = await db
      .update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      })
      .where(
        eq(users.role, "admin")
      )
      .returning({ 
        id: users.id, 
        username: users.username, 
        email: users.email
      });
    
    if (result.length === 0) {
      console.log("No admin accounts found to update");
      return;
    }
    
    console.log(`Successfully verified ${result.length} admin account(s):`);
    result.forEach(user => {
      console.log(`- ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
    });
    
    console.log("Admin account verification completed successfully");
  } catch (error) {
    console.error("Error verifying admin accounts:", error);
  } finally {
    // Ensure database connection is properly closed
    process.exit(0);
  }
}

// Run the script
verifyAdminAccounts();