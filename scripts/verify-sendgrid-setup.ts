/**
 * This script verifies SendGrid configuration and sends a test email
 * It helps diagnose SendGrid API issues and email delivery problems
 */

import { MailService } from '@sendgrid/mail';
import * as dotenv from 'dotenv';
import { createInterface } from 'readline';

// Load environment variables from .env file
dotenv.config();

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    readline.question(query, (answer) => {
      resolve(answer);
    });
  });
};

async function verifySendGridSetup() {
  try {
    console.log("===== SendGrid Configuration Verification =====");

    // Check API key
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error("❌ SendGrid API key is missing - Please add SENDGRID_API_KEY to your .env file");
      return;
    }
    console.log("✅ SendGrid API key found");

    // Initialize SendGrid
    const mailService = new MailService();
    mailService.setApiKey(apiKey);
    
    // Get test email recipient
    const recipientEmail = await askQuestion("Enter an email address to receive a test email: ");
    if (!recipientEmail || !recipientEmail.includes('@')) {
      console.error("❌ Invalid email format");
      return;
    }

    // Determine sender email (should be verified in SendGrid)
    const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
    console.log(`Using sender email: ${senderEmail}`);
    
    // Send test email
    console.log("Sending test email...");
    
    const msg = {
      to: recipientEmail,
      from: senderEmail,
      subject: 'MoogShip - SendGrid Test Email',
      text: 'This is a test email from MoogShip to verify SendGrid integration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="color: #333;">MoogShip SendGrid Test</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e9ecef; border-radius: 0 0 5px 5px; background-color: white;">
            <p>This is a test email from MoogShip to verify SendGrid integration.</p>
            <p>If you received this email, it means the SendGrid configuration is working correctly.</p>
            <p>Sent at: ${new Date().toISOString()}</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e9ecef;" />
            <p style="color: #6c757d; font-size: 12px;">This is an automated test message.</p>
          </div>
        </div>
      `
    };

    try {
      await mailService.send(msg);
      console.log("✅ Test email sent successfully!");
      console.log(`Check the inbox of ${recipientEmail} for the test email`);
      console.log("If the email doesn't arrive within a few minutes, check:");
      console.log("1. Spam/junk folder");
      console.log("2. SendGrid dashboard for any sending issues");
      console.log("3. Verify that the sender email is verified in SendGrid");
    } catch (error) {
      console.error("❌ Failed to send test email");
      
      // Extract detailed error information
      if (error.response && error.response.body && error.response.body.errors) {
        console.error("\nDetailed SendGrid errors:");
        error.response.body.errors.forEach((err, index) => {
          console.error(`${index + 1}. ${err.message}`);
        });
      } else {
        console.error("Error details:", error);
      }
      
      console.log("\nCommon solutions:");
      console.log("1. Make sure your SendGrid API key has email sending permissions");
      console.log("2. Verify that the sender email (cs@moogship.com) is verified in SendGrid");
      console.log("3. Check if your account is in a trial period with sending limitations");
      console.log("4. Ensure there are no SendGrid sending restrictions on your account");
    }
  } catch (error) {
    console.error("Error testing SendGrid setup:", error);
  } finally {
    readline.close();
    process.exit(0);
  }
}

verifySendGridSetup();