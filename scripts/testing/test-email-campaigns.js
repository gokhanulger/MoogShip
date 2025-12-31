/**
 * Test email campaigns functionality
 */
import { MailService } from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

const mailService = new MailService();

async function testSendGridConnection() {
  console.log('Testing SendGrid configuration...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SENDGRID_API_KEY not found in environment variables');
    return false;
  }
  
  console.log('✅ SENDGRID_API_KEY found');
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  
  // Test email sending
  try {
    console.log('Sending test email...');
    
    const testEmail = {
      to: 'gokhan@moogco.com', // Use your actual email
      from: 'cs@moogship.com', // Using cs@moogship.com as sender
      subject: 'Test Email Campaign - Moogship',
      text: 'This is a test email from the Moogship email campaigns system.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email Campaign</h2>
          <p>This is a test email from the Moogship email campaigns system.</p>
          <p>If you receive this email, the SendGrid integration is working correctly.</p>
          <br>
          <p>Best regards,<br>Moogship Team</p>
        </div>
      `
    };
    
    const result = await mailService.send(testEmail);
    console.log('✅ Test email sent successfully!');
    console.log('SendGrid response:', result[0].statusCode);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error('Error details:', error.response?.body || error.message);
    
    if (error.response?.body?.errors) {
      error.response.body.errors.forEach(err => {
        console.error(`- ${err.message}`);
      });
    }
    
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Email Campaigns System\n');
  
  const isWorking = await testSendGridConnection();
  
  if (isWorking) {
    console.log('\n✅ Email system is working correctly!');
  } else {
    console.log('\n❌ Email system needs configuration.');
    console.log('\nPossible issues:');
    console.log('1. SendGrid API key is invalid or expired');
    console.log('2. Sender email address not verified in SendGrid');
    console.log('3. SendGrid account suspended or limited');
    console.log('4. Network connectivity issues');
  }
}

main().catch(console.error);