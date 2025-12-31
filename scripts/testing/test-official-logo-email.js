// Script to test sending an email with the exact official MoogShip logo

import { sendEmail } from './server/email.ts';
import fs from 'fs';

async function sendLogoTest() {
  console.log('Sending test email with the OFFICIAL MoogShip logo...');
  
  // Read the official logo base64 string from the file
  const logoBase64 = fs.readFileSync('./official_logo_base64.txt', 'utf8');
  
  // Use the verified sender from environment variable or default to cs@moogship.com
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  const recipientEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  // Prepare email with the exact MoogShip logo
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Official Logo Test</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <!-- Header with Logo -->
            <tr>
              <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <!-- MoogShip OFFICIAL Logo -->
                <img src="data:image/jpeg;base64,${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Official Logo">
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 0 40px 40px 40px;">
                <!-- Content Container -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <!-- Headline -->
                  <tr>
                    <td style="padding: 0 0 30px 0; border-bottom: 1px solid #eeeeee;">
                      <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">Official MoogShip Logo Test Email</h1>
                    </td>
                  </tr>
                  
                  <!-- Message -->
                  <tr>
                    <td style="padding: 30px 0 0 0;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        This is a test email to verify the exact official MoogShip logo appears correctly.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td style="padding: 20px 40px; background-color: #f7f7f7; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
                <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: center;">
                  © 2025 MoogShip Global Shipping Solutions. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
  
  try {
    const result = await sendEmail({
      to: recipientEmail,
      from: senderEmail,
      subject: "OFFICIAL MoogShip Logo Test",
      text: "This is a test of the OFFICIAL MoogShip logo in email templates",
      html: emailHtml
    });
    
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('Test with official logo email sent successfully.');
    } else {
      console.error('Failed to send test with official logo email:', result.error);
    }
  } catch (error) {
    console.error('Error sending test with official logo email:', error);
  }
}

// Execute the test
sendLogoTest();