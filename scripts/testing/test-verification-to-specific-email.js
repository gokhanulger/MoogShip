// Test script to send a verification email using the actual verification email template
import 'dotenv/config';
import { sendVerificationEmail } from './server/email';
import crypto from 'crypto';

// Mock user data
const user = {
  id: 999,
  username: 'testuser',
  name: 'Test User',
  email: 'etsyhesap18@gmail.com',
  isActive: true,
  isVerified: false,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Generate a test verification token
const token = crypto.randomBytes(32).toString('hex');

async function testVerificationEmail() {
  console.log(`Testing verification email to: ${user.email}`);
  console.log(`Using verification token: ${token}`);
  
  try {
    const result = await sendVerificationEmail(user, token);
    
    if (result.success) {
      console.log('✅ Verification email test successful! The email was sent.');
    } else {
      console.error('❌ Verification email test failed with error:', result.error);
    }
    
    // Additional debug info
    console.log('Complete test result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Unexpected error during test:', err);
    console.error(err);
  }
}

testVerificationEmail();