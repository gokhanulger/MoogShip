/**
 * Test the SendGrid email service directly
 */
import { sendReturnAccessGrantedEmail, sendReturnAccessRevokedEmail } from './server/services/returnAccessEmailService.js';

async function testEmailService() {
  console.log('Testing SendGrid email service...');
  
  const testUser = {
    id: 2,
    name: 'GOKHAN ULGER',
    email: 'gulger@moogship.com', // Replace with your actual email for testing
    username: 'gulger'
  };
  
  const testAdmin = {
    id: 1,
    name: 'Admin User',
    username: 'admin'
  };
  
  try {
    console.log('Sending test grant access email...');
    const grantResult = await sendReturnAccessGrantedEmail(testUser, testAdmin);
    console.log('Grant email result:', grantResult);
    
    console.log('Sending test revoke access email...');
    const revokeResult = await sendReturnAccessRevokedEmail(testUser, testAdmin);
    console.log('Revoke email result:', revokeResult);
    
  } catch (error) {
    console.error('Email test failed:', error);
  }
}

testEmailService();