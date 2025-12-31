import { db } from '../server/db';
import bcrypt from 'bcrypt';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    // Generate a new hash for 'admin123'
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 8);
    console.log(`New password hash: ${hashedPassword}`);
    
    // Update the admin user's password in the database
    const result = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.username, 'admin'))
      .returning({ id: users.id, username: users.username });
    
    if (result.length === 0) {
      console.log('Admin user not found');
    } else {
      console.log(`Reset password for ${result[0].username} (ID: ${result[0].id})`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    process.exit(0);
  }
}

main();