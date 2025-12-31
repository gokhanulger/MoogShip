/**
 * Configure SendGrid verified sender for email campaigns
 * This script helps identify and configure the correct sender address
 */

import { MailService } from '@sendgrid/mail';
import dotenv from 'dotenv';

dotenv.config();

async function testSenderAddresses() {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('❌ SENDGRID_API_KEY not found');
    return;
  }

  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);

  // Common verified sender addresses to test
  const testAddresses = [
    'cs@moogship.com',
    'noreply@moogship.com',
    'gokhan@moogco.com', 
    'info@moogship.com',
    'support@moogship.com',
    'hello@moogship.com',
    'no-reply@moogship.com'
  ];

  console.log('🧪 Testing potential verified sender addresses...\n');

  for (const fromAddress of testAddresses) {
    try {
      console.log(`Testing: ${fromAddress}`);
      
      const testEmail = {
        to: 'gokhan@moogco.com',
        from: fromAddress,
        subject: 'SendGrid Sender Verification Test',
        text: `This is a test to verify ${fromAddress} as a sender.`,
        html: `<p>This is a test to verify <strong>${fromAddress}</strong> as a sender.</p>`
      };

      await mailService.send(testEmail);
      console.log(`✅ SUCCESS: ${fromAddress} is verified and working!\n`);
      
      // Found a working sender, update the environment suggestion
      console.log(`🔧 Add this to your .env file:`);
      console.log(`VERIFIED_SENDER_EMAIL=${fromAddress}\n`);
      
      return fromAddress;
      
    } catch (error) {
      console.log(`❌ FAILED: ${fromAddress}`);
      if (error.response && error.response.body && error.response.body.errors) {
        const errorMsg = error.response.body.errors[0].message;
        console.log(`   Reason: ${errorMsg}\n`);
      } else {
        console.log(`   Reason: ${error.message}\n`);
      }
    }
  }

  console.log('❌ No verified sender addresses found.');
  console.log('\n📋 Next steps:');
  console.log('1. Log into your SendGrid account');
  console.log('2. Go to Settings > Sender Authentication');
  console.log('3. Verify a sender identity (domain or single sender)');
  console.log('4. Use that verified address in the email campaigns');
  
  return null;
}

async function main() {
  const workingSender = await testSenderAddresses();
  
  if (workingSender) {
    console.log(`🎉 Email system ready with verified sender: ${workingSender}`);
  } else {
    console.log('\n🔧 Manual configuration required:');
    console.log('Please verify a sender address in SendGrid first.');
  }
}

main().catch(console.error);