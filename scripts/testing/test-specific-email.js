// Test script to send a verification email to a specific address
// This will help debug email delivery issues

import 'dotenv/config';
import { sendEmail } from './server/email';

// For ES modules, we need to use this since there's no special call to run this main function
// Adding this allows the script to execute and finish properly

const recipient = 'etsyhesap18@gmail.com';
const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';

async function testSpecificEmail() {
  console.log(`Testing email delivery to: ${recipient}`);
  console.log(`Using sender: ${senderEmail}`);
  
  try {
    // Generate basic verification-like email
    const result = await sendEmail({
      to: recipient,
      from: senderEmail,
      subject: 'MoogShip: Email Verification Test',
      text: 'This is a test email to verify email delivery capabilities. If you received this, email delivery is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1170c9;">MoogShip Email Test</h1>
          <p>This is a test email to verify email delivery capabilities.</p>
          <p>If you received this, email delivery is working correctly.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
        </div>
      `
    });
    
    if (result.success) {
      console.log('✅ Email test successful! The email was sent.');
    } else {
      console.error('❌ Email test failed with error:', result.error);
    }
    
    // Additional debug info
    console.log('Complete test result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('❌ Unexpected error during test:', err);
  }
}

testSpecificEmail();