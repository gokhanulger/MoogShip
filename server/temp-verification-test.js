import { generateVerificationToken, sendVerificationEmail } from './email.js';

// Create a mock user for testing
const testUser = {
  id: 999,
  username: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  // Add other required user fields here
};

// Generate a test verification token
const token = generateVerificationToken();
console.log('Generated test token:', token);

// Test the verification email function
async function testEmailVerification() {
  try {
    console.log('Sending verification email to test user...');
    
    // Detailed logging of the user object
    console.log('Test user object:', JSON.stringify(testUser, null, 2));
    
    // Add debug logging around the sendVerificationEmail call
    console.log('About to call sendVerificationEmail');
    const result = await sendVerificationEmail(testUser, token);
    console.log('After calling sendVerificationEmail, result:', result);
    
    if (result.success) {
      console.log('Verification email sent successfully!');
    } else {
      console.error('Failed to send verification email:', result.error);
    }
  } catch (error) {
    console.error('Error testing verification email:', error);
  }
}

// Run the test
testEmailVerification().catch(console.error);