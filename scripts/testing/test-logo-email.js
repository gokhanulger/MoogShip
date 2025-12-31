// Simple script to test sending a verification email with the updated logo

import { sendEmail } from './server/email.ts';

async function sendLogoTest() {
  console.log('Sending test email with updated logo...');
  
  // Use the verified sender from environment variable or default to cs@moogship.com
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  const recipientEmail = process.env.TEST_EMAIL || 'test@example.com';
  
  // Prepare email with the MoogShip logo
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Logo Test</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <!-- Header with Logo -->
            <tr>
              <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <!-- MoogShip Official Logo -->
                <img src="data:image/jpeg;base64,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" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
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
                      <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">MoogShip Logo Test Email</h1>
                    </td>
                  </tr>
                  
                  <!-- Message -->
                  <tr>
                    <td style="padding: 30px 0 0 0;">
                      <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        This is a test email to verify the MoogShip logo appears correctly.
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
      subject: "MoogShip Logo Test",
      text: "This is a test of the MoogShip logo in email templates",
      html: emailHtml
    });
    
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('Test logo email sent successfully.');
    } else {
      console.error('Failed to send test logo email:', result.error);
    }
  } catch (error) {
    console.error('Error sending test logo email:', error);
  }
}

// Execute the test
sendLogoTest();