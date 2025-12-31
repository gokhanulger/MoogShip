import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Starting price multiplier update for all users...");
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users to update`);
    
    // Track successful and failed updates
    let successCount = 0;
    let failedCount = 0;
    
    // Update each user's price multiplier to 1.45
    for (const user of allUsers) {
      try {
        await db
          .update(users)
          .set({ priceMultiplier: 1.45 })
          .where(eq(users.id, user.id));
        
        console.log(`Updated user ${user.username} (ID: ${user.id}) to price multiplier 1.45`);
        successCount++;
      } catch (error) {
        console.error(`Failed to update user ${user.username} (ID: ${user.id}):`, error);
        failedCount++;
      }
    }
    
    console.log("Price multiplier update completed:");
    console.log(`- ${successCount} users successfully updated`);
    console.log(`- ${failedCount} users failed to update`);
    
  } catch (error) {
    console.error("Error during price multiplier update:", error);
  } finally {
    process.exit(0);
  }
}

main();