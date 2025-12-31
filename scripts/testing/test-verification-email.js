// Simple script to test sending a verification email to a test user

import { sendVerificationEmail } from './server/email.ts';

// Mock user object for testing
const testUser = {
  id: 999,
  name: 'Test User',
  email: process.env.TEST_EMAIL || 'test@example.com', // Use environment variable if available
  username: 'testuser'
};

// Generate a test token for verification
const testToken = 'test-verification-token-' + Date.now();

// Try sending the verification email
async function sendTest() {
  console.log('Sending test verification email to:', testUser.email);
  console.log('Using test token:', testToken);
  
  try {
    const result = await sendVerificationEmail(testUser, testToken);
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('Test verification email sent successfully.');
    } else {
      console.error('Failed to send test verification email:', result.error);
    }
  } catch (error) {
    console.error('Error sending test verification email:', error);
  }
}

// Execute the test
sendTest();