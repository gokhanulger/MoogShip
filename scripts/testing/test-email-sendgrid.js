/**
 * Test SendGrid email functionality directly
 */
import { MailService } from '@sendgrid/mail';

async function testSendGridEmail() {
  console.log('Testing SendGrid email service...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY environment variable not found');
    return false;
  }
  
  console.log('SendGrid API key exists:', process.env.SENDGRID_API_KEY.substring(0, 10) + '...');
  
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  
  const testEmail = {
    to: 'test@example.com', // Replace with your test email
    from: 'cs@moogship.com', // Verified SendGrid sender
    subject: 'Test Email from Return Management System',
    text: 'This is a test email to verify SendGrid integration.',
    html: '<p>This is a test email to verify SendGrid integration.</p>'
  };
  
  try {
    console.log('Attempting to send test email...');
    const response = await mailService.send(testEmail);
    console.log('Email sent successfully!');
    console.log('Response:', response[0].statusCode, response[0].statusMessage);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    if (error.response) {
      console.error('Error body:', error.response.body);
    }
    return false;
  }
}

testSendGridEmail();