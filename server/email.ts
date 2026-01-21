import { MailService } from '@sendgrid/mail';
import { User } from "@shared/schema";
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';

// Set up SendGrid if API key is available
let mailService: MailService | null = null;
if (process.env.SENDGRID_API_KEY) {
  mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('SendGrid service initialized with API key');
} else {
  console.warn('SENDGRID_API_KEY not found, email sending may fail');
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
  bcc?: string;  // Added BCC support for sending to multiple recipients
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
    encoding?: string;
  }>;
}

// Create a NodeMailer SMTP transport as a fallback
let smtpTransport: nodemailer.Transporter | null = null;

// Try to initialize SMTP transport if credentials are provided
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    console.log('SMTP transport initialized as fallback');
  } catch (error) {
    console.error('Failed to initialize SMTP transport:', error);
  }
}

export async function sendEmail(params: EmailParams): Promise<{success: boolean, error?: any}> {
  try {
    // Check if we're in a development or testing environment
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    // Validate email addresses
    if (!params.to || !params.from) {
      console.error('Invalid email parameters: missing to or from address');
      return {
        success: false,
        error: 'Invalid email parameters'
      };
    }
    
    // Build email data using proper types that the SendGrid API expects
    // Add sender name to improve deliverability
    const fromWithName = params.from.includes('<') 
      ? params.from 
      : `MoogShip <${params.from}>`;
    
    // Prepare content array for SendGrid
    const content = [];
    if (params.text) {
      content.push({
        type: 'text/plain',
        value: params.text
      });
    }
    if (params.html) {
      content.push({
        type: 'text/html',
        value: params.html
      });
    }
    
    // If no content provided, add a default text message
    if (content.length === 0) {
      content.push({
        type: 'text/plain',
        value: 'This email was sent from MoogShip.'
      });
    }
    
    // Email settings that improve deliverability and avoid spam filters
    const msg = {
      to: params.to,
      from: fromWithName,  // Use the formatted sender with name
      subject: params.subject,
      content: content,    // Use content array format for SendGrid
      bcc: params.bcc,         // Include BCC if available
      attachments: params.attachments || [], // Include attachments if available
      // Add tracking settings to disable click and open tracking (improves deliverability)
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false },
        ganalytics: { enable: false }
      },
      // Add mail settings to bypass spam filters
      mailSettings: {
        bypassListManagement: { enable: true },
        sandboxMode: { enable: false }
      },
      // Add custom headers to improve deliverability
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High'
      }
    };
    
    // In development mode, we can log the email instead of sending it
    if (isDevelopment && process.env.EMAIL_DEBUG === 'true') {
      console.log('====== EMAIL DEBUG MODE ======');
      console.log('To:', params.to);
      console.log('From:', params.from);
      console.log('Subject:', params.subject);
      console.log('Text:', params.text);
      console.log('HTML:', params.html?.substring(0, 200) + '...');
      if (params.attachments && params.attachments.length > 0) {
        console.log('Attachments:', params.attachments.map(a => `${a.filename} (${a.contentType || 'application/octet-stream'})`));
      }
      console.log('===============================');
      return { success: true };
    }
    
    // Save email details to logs directory for debugging
    if (isDevelopment || process.env.SAVE_EMAIL_LOGS === 'true') {
      try {
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const recipientSafe = params.to.replace(/[^\w\s]/g, '_');
        const logDir = path.join(process.cwd(), 'logs');
        
        // Create logs directory if it doesn't exist
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `email_${timestamp}_${recipientSafe}.json`);
        const logData = {
          timestamp: new Date().toISOString(),
          to: params.to,
          from: params.from,
          subject: params.subject,
          text: params.text,
          html: params.html,
          attachments: params.attachments ? params.attachments.map(a => ({
            filename: a.filename,
            contentType: a.contentType || 'application/octet-stream',
            size: a.content ? Math.round(a.content.length / 1024) + ' KB' : 'Unknown'
          })) : [],
        };
        
        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log(`Email debug log saved to ${logFile}`);
      } catch (error) {
        console.warn('Failed to save email log:', error);
      }
    }
    
    // Try to send using SendGrid
    if (mailService) {
      try {
        const response = await mailService.send(msg as any);
        console.log(`Email sent successfully via SendGrid to ${params.to}`);
        // Log SendGrid response metadata for debugging
        const [sgResponse] = response;
        console.log('SendGrid Response Status Code:', sgResponse.statusCode);
        console.log('SendGrid Response Headers:', sgResponse.headers);
        
        return { success: true };
      } catch (error: any) {
        // If this is a test mode or we have a fallback, continue to try SMTP
        console.error(`SendGrid email sending failed:`, error?.response?.body || error);
        
        // If no fallback and not development, report the error
        if (!smtpTransport && !isDevelopment) {
          return { 
            success: false, 
            error: error?.response?.body || error 
          };
        }
      }
    }
    
    // If SendGrid failed or wasn't configured, try SMTP fallback
    if (smtpTransport) {
      try {
        // Convert SendGrid parameters to Nodemailer format
        const smtpMsg = {
          to: params.to,
          from: params.from,
          bcc: params.bcc,
          subject: params.subject,
          text: params.text,
          html: params.html,
          attachments: params.attachments?.map(attachment => ({
            filename: attachment.filename,
            content: attachment.content,
            contentType: attachment.contentType,
            encoding: attachment.encoding || 'base64'
          })) || [],
          // Add priority headers for better delivery
          priority: "high" as const,
          headers: {
            'X-Priority': '1',
            'Importance': 'high',
            'X-MSMail-Priority': 'High'
          }
        };
        
        const result = await smtpTransport.sendMail(smtpMsg);
        console.log(`Email sent successfully via SMTP to ${params.to}`);
        console.log('SMTP Message ID:', result.messageId);
        
        return { success: true };
      } catch (error) {
        console.error('SMTP email sending failed:', error);
        return { success: false, error };
      }
    }
    
    // If we're in development mode and all sending methods failed
    if (isDevelopment) {
      console.warn('Development mode: Email would be sent here but all sending methods failed');
      // In development, we'll still consider it a success to avoid blocking testing
      return { success: true };
    }
    
    // Both SendGrid and SMTP failed, and we're not in development mode
    return { 
      success: false, 
      error: 'No email transport method available' 
    };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error };
  }
}

// Generate a verification token 
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Generate password reset token
export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to get base64 encoded logo
function getBase64Logo(): string {
  try {
    // Read the logo file
    const logoPath = path.join(process.cwd(), 'public', 'images', 'moogship_logo.jpeg');
    const logoData = readFileSync(logoPath);
    // Convert to base64
    return `data:image/jpeg;base64,${logoData.toString('base64')}`;
  } catch (error) {
    console.error('Error reading logo file:', error);
    // Return empty string if logo file can't be read
    return '';
  }
}

// Send verification email to newly registered user
/**
 * Send a notification email to admins when a user schedules a pickup
 * @param pickupData Pickup request data containing details about the scheduled pickup
 */
export async function sendPickupNotificationEmail(pickupData: {
  id: number; 
  userId: number;
  userName: string;
  pickupDate: Date;
  pickupAddress?: string;
  pickupCity?: string;
  pickupPostalCode?: string;
  pickupNotes?: string;
  shipmentCount: number;
}): Promise<{success: boolean, error?: any, sentCount?: number, totalCount?: number}> {
  // Set recipient addresses
  const recipientEmails = ['oguzhan@moogco.com', 'info@moogship.com', 'sercan@moogship.com', 'gokhan@moogco.com'];
  
  // Use custom sender email if specified in environment, defaulting to cs@moogship.com
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  
  // Format the pickup date nicely with proper error handling
  let formattedDate;
  try {
    // Ensure we have a valid date
    const dateObj = pickupData.pickupDate instanceof Date ? 
      pickupData.pickupDate : 
      new Date(pickupData.pickupDate);
    
    // Check if date is valid before formatting
    if (!isNaN(dateObj.getTime())) {
      formattedDate = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      console.warn(`Warning: Invalid date format for pickup ID ${pickupData.id}:`, pickupData.pickupDate);
      formattedDate = 'Belirtilen tarihte / On the specified date';
    }
  } catch (error) {
    console.error(`Error formatting date for pickup ID ${pickupData.id}:`, error);
    formattedDate = 'Belirtilen tarihte / On the specified date';
  }
  
  const emailSubject = `MoogShip: Yeni Paket Alım Talebi / New Pickup Request (#${pickupData.id})`;
  
  // Create email HTML content
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Pickup Notification</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">MoogShip Paket Alım Bildirimi</h1>
                      <p style="margin: 5px 0 0; color: #666;">Pickup Request Notification</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 0 40px 40px 40px;">
                <!-- Content Container -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <!-- Turkish Section -->
                  <tr>
                    <td style="padding: 30px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        TÜRKÇE
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>Yeni bir paket alım talebi oluşturuldu.</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Paket Alım No:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">#${pickupData.id}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Müşteri:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.userName} (ID: ${pickupData.userId})</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Tarih:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Paket Sayısı:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.shipmentCount}</td>
                          </tr>
                          ${pickupData.pickupAddress ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Adres:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupAddress}</td>
                          </tr>` : ''}
                          ${pickupData.pickupCity ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Şehir:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupCity}</td>
                          </tr>` : ''}
                          ${pickupData.pickupPostalCode ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Posta Kodu:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupPostalCode}</td>
                          </tr>` : ''}
                        </table>

                        ${pickupData.pickupNotes ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff; border-radius: 5px; border: 1px solid #ddd;">
                          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Notlar:</p>
                          <p style="margin: 0; font-size: 14px;">${pickupData.pickupNotes}</p>
                        </div>` : ''}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Section divider -->
                  <tr>
                    <td style="padding: 20px 0;">
                      <hr style="border: 0; border-top: 1px dashed #cccccc; margin: 0;">
                    </td>
                  </tr>
                  
                  <!-- English Section -->
                  <tr>
                    <td style="padding: 10px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        ENGLISH
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>A new pickup request has been scheduled.</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 30px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Pickup ID:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">#${pickupData.id}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Customer:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.userName} (ID: ${pickupData.userId})</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Date:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Number of Packages:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.shipmentCount}</td>
                          </tr>
                          ${pickupData.pickupAddress ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Address:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupAddress}</td>
                          </tr>` : ''}
                          ${pickupData.pickupCity ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">City:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupCity}</td>
                          </tr>` : ''}
                          ${pickupData.pickupPostalCode ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Postal Code:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupPostalCode}</td>
                          </tr>` : ''}
                        </table>

                        ${pickupData.pickupNotes ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff; border-radius: 5px; border: 1px solid #ddd;">
                          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Notes:</p>
                          <p style="margin: 0; font-size: 14px;">${pickupData.pickupNotes}</p>
                        </div>` : ''}
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Closing -->
                  <tr>
                    <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #505050;">
                        Teşekkürler / Thank you,<br>
                        <strong>MoogShip Team</strong>
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
  
  // Create plain text version for email clients that don't display HTML
  const emailText = `
=================================================================
          MoogShip Paket Alım Bildirimi / Pickup Notification
=================================================================

========================== TÜRKÇE ===========================

Yeni bir paket alım talebi oluşturuldu.

Paket Alım No: #${pickupData.id}
Müşteri: ${pickupData.userName} (ID: ${pickupData.userId})
Tarih: ${formattedDate}
Paket Sayısı: ${pickupData.shipmentCount}
${pickupData.pickupAddress ? `Adres: ${pickupData.pickupAddress}` : ''}
${pickupData.pickupCity ? `Şehir: ${pickupData.pickupCity}` : ''}
${pickupData.pickupPostalCode ? `Posta Kodu: ${pickupData.pickupPostalCode}` : ''}

${pickupData.pickupNotes ? `Notlar: ${pickupData.pickupNotes}` : ''}

================================================================

========================= ENGLISH ===========================

A new pickup request has been scheduled.

Pickup ID: #${pickupData.id}
Customer: ${pickupData.userName} (ID: ${pickupData.userId})
Date: ${new Date(pickupData.pickupDate).toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})}
Number of Packages: ${pickupData.shipmentCount}
${pickupData.pickupAddress ? `Address: ${pickupData.pickupAddress}` : ''}
${pickupData.pickupCity ? `City: ${pickupData.pickupCity}` : ''}
${pickupData.pickupPostalCode ? `Postal Code: ${pickupData.pickupPostalCode}` : ''}

${pickupData.pickupNotes ? `Notes: ${pickupData.pickupNotes}` : ''}

=================================================================

© 2025 MoogShip Global Shipping Solutions. All rights reserved.
  `;
  
  console.log(`Sending pickup notification email to: ${recipientEmails.join(', ')}`);
  
  let successCount = 0;
  const errors = [];
  
  // Send email to each recipient
  for (const recipientEmail of recipientEmails) {
    try {
      const result = await sendEmail({
        to: recipientEmail,
        from: senderEmail,
        subject: emailSubject,
        text: emailText,
        html: emailHtml
      });
      
      if (result.success) {
        successCount++;
        console.log(`Pickup notification email sent successfully to ${recipientEmail}`);
      } else {
        console.error(`Failed to send pickup notification email to ${recipientEmail}:`, result.error);
        errors.push({ recipient: recipientEmail, error: result.error });
      }
    } catch (error) {
      console.error(`Error sending pickup notification email to ${recipientEmail}:`, error);
      errors.push({ recipient: recipientEmail, error });
    }
  }
  
  return {
    success: successCount > 0,
    error: errors.length > 0 ? errors : undefined,
    sentCount: successCount,
    totalCount: recipientEmails.length
  };
}

export async function sendPasswordResetEmail(user: User, resetToken: string, resetUrl?: string): Promise<{success: boolean, error?: any}> {
  // Use provided resetUrl or generate a fallback
  const finalResetUrl = resetUrl || `${process.env.APP_URL || 'https://app.moogship.com'}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Şifre Sıfırlama</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="padding: 40px 40px 20px 40px; text-align: center; background-color: #ffffff;">
            <img src="https://i.imgur.com/your-logo.png" alt="Moogship Logo" style="max-width: 150px; height: auto;">
          </td>
        </tr>
        
        <tr>
          <td style="padding: 0 40px 20px 40px; text-align: center; background-color: #ffffff;">
            <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">Şifre Sıfırlama / Password Reset</h1>
          </td>
        </tr>
        
        <!-- Turkish Section -->
        <tr>
          <td style="padding: 30px 40px 10px 40px;">
            <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
              TÜRKÇE
            </p>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 15px 40px 10px 40px;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
              Merhaba <strong>${user.name}</strong>,
            </p>
            <p style="margin: 15px 0; font-size: 16px; line-height: 1.5; color: #505050;">
              Moogship hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki butona tıklayarak yeni şifrenizi belirleyebilirsiniz.
            </p>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 20px 40px;">
            <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
              <tr>
                <td bgcolor="#1170c9" style="border-radius: 6px;">
                  <a href="${finalResetUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; display: inline-block; font-weight: bold;">Şifremi Sıfırla</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 0 40px 20px 40px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666666; text-align: center;">
              Bu bağlantı 1 saat içinde geçerliliğini yitirecektir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.
            </p>
          </td>
        </tr>
        
        <!-- Section divider -->
        <tr>
          <td style="padding: 20px 40px;">
            <hr style="border: 0; border-top: 1px dashed #cccccc; margin: 0;">
          </td>
        </tr>
        
        <!-- English Section -->
        <tr>
          <td style="padding: 10px 40px 10px 40px;">
            <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
              ENGLISH
            </p>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 15px 40px 10px 40px;">
            <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
              Hello <strong>${user.name}</strong>,
            </p>
            <p style="margin: 15px 0; font-size: 16px; line-height: 1.5; color: #505050;">
              You requested a password reset for your Moogship account. Click the button below to set a new password.
            </p>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 20px 40px;">
            <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
              <tr>
                <td bgcolor="#1170c9" style="border-radius: 6px;">
                  <a href="${finalResetUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; display: inline-block; font-weight: bold;">Reset My Password</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 0 40px 30px 40px;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666666; text-align: center;">
              This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="padding: 30px 40px; background-color: #f8f9fa; border-top: 1px solid #e9ecef;">
            <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666666; text-align: center;">
              <strong>Moogship</strong><br>
              Global E-commerce Shipping Solutions<br>
              <a href="mailto:cs@moogship.com" style="color: #1170c9;">cs@moogship.com</a>
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const textContent = `
Şifre Sıfırlama / Password Reset

TÜRKÇE:
Merhaba ${user.name},

Moogship hesabınız için şifre sıfırlama talebinde bulundunuz. Aşağıdaki bağlantıya tıklayarak yeni şifrenizi belirleyebilirsiniz:

${finalResetUrl}

Bu bağlantı 1 saat içinde geçerliliğini yitirecektir. Eğer bu talebi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.

---

ENGLISH:
Hello ${user.name},

You requested a password reset for your Moogship account. Click the link below to set a new password:

${finalResetUrl}

This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.

---
Moogship - Global E-commerce Shipping Solutions
cs@moogship.com
  `;

  return await sendEmail({
    to: user.email,
    from: 'cs@moogship.com',
    subject: 'Şifre Sıfırlama / Password Reset - Moogship',
    text: textContent,
    html: htmlContent
  });
}

export async function sendVerificationEmail(user: User, token: string): Promise<{success: boolean, error?: any}> {
  // Validate user and token
  if (!user || !user.email || !token) {
    console.error('Invalid user data or token for verification email:', { 
      userId: user?.id, 
      hasEmail: !!user?.email, 
      hasToken: !!token 
    });
    return { 
      success: false, 
      error: 'Invalid user data or token' 
    };
  }
  
  // Get domain from environment variable or use default
  const domain = process.env.PUBLIC_DOMAIN || 'app.moogship.com';
  
  // Primary domain for production
  const primaryDomain = `https://${domain}`;
  
  // Use direct API verification endpoints
  // Use full path to ensure it works with any domain
  const verificationUrl = `${primaryDomain}/api/verify-email/${token}`;
  
  // Get base64 encoded logo for embedding directly in email
  const logoBase64 = getBase64Logo();
  
  // Keep logoUrl as fallback for email clients that don't support base64 images
  const logoUrl = `${primaryDomain}/images/moogship_logo.jpeg`;
  
  // Log verification URL for debugging
  console.log(`Verification URL for email: ${verificationUrl}`);
  
  // Use custom sender email if specified in environment, defaulting to cs@moogship.com
  // Note: This email must be verified in SendGrid as a Sender Identity
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  
  const emailSubject = 'MoogShip: E-posta Doğrulama / Email Verification';
  
  // Branded HTML template with externally hosted logo
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Email Verification</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <!-- Header with Logo -->
            <tr>
              <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <!-- MoogShip Logo as Base64 Embedded Image (works more reliably in email clients) -->
                <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
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
                      <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">E-posta Doğrulama / Email Verification</h1>
                    </td>
                  </tr>
                  
                  <!-- Section Header for Turkish -->
                  <tr>
                    <td style="padding: 30px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        TÜRKÇE
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>Merhaba ${user.name || user.username},</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          MoogShip hesabınızı oluşturduğunuz için teşekkür ederiz. Lütfen aşağıdaki butona tıklayarak e-posta adresinizi doğrulayın:
                        </p>
                        
                        <!-- Action Button -->
                        <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                          <tr>
                            <td bgcolor="#2E6FC1" style="border-radius: 4px;">
                              <a href="${verificationUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">E-posta Adresini Doğrula</a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          Buton çalışmıyorsa, lütfen bu bağlantıyı tarayıcınıza kopyalayıp yapıştırın:
                        </p>
                        <p style="margin: 10px 0 20px; font-size: 14px; line-height: 1.5; color: #1170c9; word-break: break-all;">
                          ${verificationUrl}
                        </p>
                        
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777;">
                          Bu doğrulama bağlantısı 24 saat içinde geçerliliğini yitirecektir. Eğer bir hesap oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.
                        </p>
                        
                        <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #777777; background-color: #fff3cd; padding: 8px; border-radius: 4px; border-left: 3px solid #ffc107;">
                          <strong>Önemli Not:</strong> E-posta doğrulandıktan sonra, hesabınızın giriş yapabilmek için yönetici onayı gerekecektir.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Section divider -->
                  <tr>
                    <td style="padding: 20px 0;">
                      <hr style="border: 0; border-top: 1px dashed #cccccc; margin: 0;">
                    </td>
                  </tr>
                  
                  <!-- Section Header for English -->
                  <tr>
                    <td style="padding: 10px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        ENGLISH
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>Hello ${user.name || user.username},</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 30px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Thanks for creating a MoogShip account. Please verify your email address by clicking the button below:
                        </p>
                        
                        <!-- Action Button -->
                        <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                          <tr>
                            <td bgcolor="#2E6FC1" style="border-radius: 4px;">
                              <a href="${verificationUrl}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">Verify Email Address</a>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          If the button doesn't work, please copy and paste this link into your browser:
                        </p>
                        <p style="margin: 10px 0 20px; font-size: 14px; line-height: 1.5; color: #1170c9; word-break: break-all;">
                          ${verificationUrl}
                        </p>
                        
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777;">
                          This verification link will expire in 24 hours. If you did not create an account, please disregard this email.
                        </p>
                        
                        <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; color: #777777; background-color: #fff3cd; padding: 8px; border-radius: 4px; border-left: 3px solid #ffc107;">
                          <strong>Important Note:</strong> After email verification, your account will require admin approval before you can log in.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Closing -->
                  <tr>
                    <td style="padding: 30px 0 0 0; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #505050;">
                        Teşekkürler / Thank you,<br>
                        <strong>The MoogShip Team</strong>
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
  
  // Plaintext version for email clients that don't display HTML
  const emailText = `
=================================================================
           MoogShip: E-posta Doğrulama / Email Verification
=================================================================

========================== TÜRKÇE ===========================

Merhaba ${user.name || user.username},

MoogShip hesabınızı oluşturduğunuz için teşekkür ederiz. 
Lütfen aşağıdaki bağlantı ile e-posta adresinizi doğrulayın:

${verificationUrl}

Bu doğrulama bağlantısı 24 saat içinde geçerliliğini yitirecektir. 
Eğer bir hesap oluşturmadıysanız, lütfen bu e-postayı dikkate almayın.

ÖNEMLİ NOT: E-posta doğrulandıktan sonra, hesabınızın giriş yapabilmek 
için yönetici onayı gerekecektir.

================================================================

========================= ENGLISH ===========================

Hello ${user.name || user.username},

Thanks for creating a MoogShip account. 
Please verify your email address using the link below:

${verificationUrl}

This verification link will expire in 24 hours.
If you did not create an account, you can safely ignore this email.

IMPORTANT NOTE: After email verification, your account will require 
admin approval before you can log in.

=================================================================

© 2025 MoogShip Global Shipping Solutions. All rights reserved.
  `;
  
  console.log(`Attempting to send verification email to: ${user.email} (from: ${senderEmail})`);
  
  const result = await sendEmail({
    to: user.email,
    from: senderEmail,
    subject: emailSubject,
    text: emailText,
    html: emailHtml
  });
  
  if (!result.success) {
    console.error(`Failed to send verification email to ${user.email}:`, result.error);
  }
  
  return result;
}

/**
 * Send a notification email to a user when their pickup request is approved
        
        <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hello ${user.name},
        </p>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset your password for your MoogShip account. Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          If the button doesn't work, you can also copy and paste this link into your browser:
        </p>
        
        <p style="color: #007bff; font-size: 14px; word-break: break-all; margin-bottom: 20px;">
          ${resetUrl}
        </p>
        
        <p style="color: #888; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
          <strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.
        </p>
        
        <p style="color: #888; font-size: 14px; line-height: 1.6;">
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #888; font-size: 12px; text-align: center;">
          © 2024 MoogShip. All rights reserved.<br>
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const textContent = `
Password Reset Request

Hello ${user.name},

We received a request to reset your password for your MoogShip account. Visit this link to reset your password:

${resetUrl}

Important: This password reset link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

© 2024 MoogShip. All rights reserved.
This is an automated message, please do not reply to this email.
  `;

  return sendEmail({
    to: user.email,
    from: senderEmail,
    subject: subject,
    text: textContent,
    html: htmlContent
  });
}

/**
 * Send a notification email to a user when their pickup request is approved
 * @param pickupData Pickup request data containing details about the approved pickup
 * @param userEmail The email address of the user who requested the pickup
 */
export async function sendPickupApprovalEmail(pickupData: {
  id: number;
  userId: number;
  userName: string;
  pickupDate: Date;
  pickupAddress?: string;
  pickupCity?: string;
  pickupPostalCode?: string;
  pickupNotes?: string;
  shipmentCount: number;
}, userEmail: string): Promise<{success: boolean, error?: any}> {
  // Use custom sender email if specified in environment, defaulting to cs@moogship.com
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  
  // Format the pickup date nicely with error handling
  let formattedDate;
  try {
    // Ensure we have a valid date object
    if (pickupData.pickupDate && !isNaN(new Date(pickupData.pickupDate).getTime())) {
      formattedDate = new Date(pickupData.pickupDate).toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      console.warn(`Invalid pickup date encountered for pickup ID ${pickupData.id}`);
      formattedDate = 'Belirtilen tarihte / On the specified date';
    }
  } catch (error) {
    console.error(`Error formatting pickup date for ID ${pickupData.id}:`, error);
    formattedDate = 'Belirtilen tarihte / On the specified date';
  }
  
  const emailSubject = `MoogShip: Paket Alım Talebiniz Onaylandı / Your Pickup Request is Approved (#${pickupData.id})`;
  
  // Create email HTML content
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Pickup Approval</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            <!-- Header -->
            <tr>
              <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <h1 style="font-size: 24px; color: #1170c9; margin: 0; font-weight: 600;">MoogShip Paket Alım Onayı</h1>
                      <p style="margin: 5px 0 0; color: #666;">Pickup Request Approval</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 0 40px 40px 40px;">
                <!-- Content Container -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <!-- Turkish Section -->
                  <tr>
                    <td style="padding: 30px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        TÜRKÇE
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>Sayın ${pickupData.userName},</strong>
                      </p>
                      <p style="margin: 10px 0 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        Paket alım talebiniz onaylanmıştır. Paketlerinizi belirtilen tarih ve adreste teslim almak için ekibimiz hazır olacaktır.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Paket Alım No:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">#${pickupData.id}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Tarih:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Paket Sayısı:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.shipmentCount}</td>
                          </tr>
                          ${pickupData.pickupAddress ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Adres:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupAddress}</td>
                          </tr>` : ''}
                          ${pickupData.pickupCity ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Şehir:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupCity}</td>
                          </tr>` : ''}
                        </table>

                        ${pickupData.pickupNotes ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff; border-radius: 5px; border: 1px solid #ddd;">
                          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Notlar:</p>
                          <p style="margin: 0; font-size: 14px;">${pickupData.pickupNotes}</p>
                        </div>` : ''}
                      </div>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 0 0 0;">
                      <p style="margin: 0; font-size: 14px; color: #505050; line-height: 1.5;">
                        Lütfen paketlerinizi belirtilen tarihte alıma hazır şekilde bulundurunuz. Sorularınız için bizimle iletişime geçebilirsiniz.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Section divider -->
                  <tr>
                    <td style="padding: 20px 0;">
                      <hr style="border: 0; border-top: 1px dashed #cccccc; margin: 0;">
                    </td>
                  </tr>
                  
                  <!-- English Section -->
                  <tr>
                    <td style="padding: 10px 0 10px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #1170c9; font-weight: bold; border-bottom: 2px solid #1170c9; display: inline-block; padding-bottom: 3px;">
                        ENGLISH
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 15px 0 10px 0;">
                      <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        <strong>Dear ${pickupData.userName},</strong>
                      </p>
                      <p style="margin: 10px 0 0; font-size: 16px; line-height: 1.5; color: #505050;">
                        Your pickup request has been approved. Our team will be ready to collect your packages at the specified date and address.
                      </p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #f9f9f9; border-radius: 8px; border-left: 4px solid #2E6FC1;">
                      <div style="padding: 15px;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 10px;">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Pickup ID:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">#${pickupData.id}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Date:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${formattedDate}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Number of Packages:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.shipmentCount}</td>
                          </tr>
                          ${pickupData.pickupAddress ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">Address:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupAddress}</td>
                          </tr>` : ''}
                          ${pickupData.pickupCity ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0;">City:</td>
                            <td style="font-weight: bold; font-size: 14px; padding: 5px 0;">${pickupData.pickupCity}</td>
                          </tr>` : ''}
                        </table>

                        ${pickupData.pickupNotes ? `
                        <div style="margin-top: 15px; padding: 10px; background-color: #fff; border-radius: 5px; border: 1px solid #ddd;">
                          <p style="margin: 0 0 5px 0; color: #666; font-size: 14px;">Notes:</p>
                          <p style="margin: 0; font-size: 14px;">${pickupData.pickupNotes}</p>
                        </div>` : ''}
                      </div>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 20px 0 0 0;">
                      <p style="margin: 0; font-size: 14px; color: #505050; line-height: 1.5;">
                        Please ensure your packages are ready for collection on the specified date. Feel free to contact us if you have any questions.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 0 0 0;">
                      <p style="margin: 0; font-size: 14px; color: #777; text-align: center;">
                        Bu e-posta MoogShip sistemi tarafından otomatik olarak gönderilmiştir.<br>
                        This email was automatically sent by the MoogShip system.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
  
  // Create plain text version
  const emailText = `
  MOOGSHIP - PAKET ALIM ONAYI / PICKUP APPROVAL

  --- TÜRKÇE ---
  
  Sayın ${pickupData.userName},
  
  Paket alım talebiniz onaylanmıştır. Paketlerinizi belirtilen tarih ve adreste teslim almak için ekibimiz hazır olacaktır.
  
  Paket Alım No: #${pickupData.id}
  Tarih: ${formattedDate}
  Paket Sayısı: ${pickupData.shipmentCount}
  ${pickupData.pickupAddress ? `Adres: ${pickupData.pickupAddress}` : ''}
  ${pickupData.pickupCity ? `Şehir: ${pickupData.pickupCity}` : ''}
  ${pickupData.pickupNotes ? `Notlar: ${pickupData.pickupNotes}` : ''}
  
  Lütfen paketlerinizi belirtilen tarihte alıma hazır şekilde bulundurunuz. Sorularınız için bizimle iletişime geçebilirsiniz.
  
  --- ENGLISH ---
  
  Dear ${pickupData.userName},
  
  Your pickup request has been approved. Our team will be ready to collect your packages at the specified date and address.
  
  Pickup ID: #${pickupData.id}
  Date: ${formattedDate}
  Number of Packages: ${pickupData.shipmentCount}
  ${pickupData.pickupAddress ? `Address: ${pickupData.pickupAddress}` : ''}
  ${pickupData.pickupCity ? `City: ${pickupData.pickupCity}` : ''}
  ${pickupData.pickupNotes ? `Notes: ${pickupData.pickupNotes}` : ''}
  
  Please ensure your packages are ready for collection on the specified date. Feel free to contact us if you have any questions.
  
  Bu e-posta MoogShip sistemi tarafından otomatik olarak gönderilmiştir.
  This email was automatically sent by the MoogShip system.
  `;
  
  try {
    const result = await sendEmail({
      to: userEmail,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
    
    if (result.success) {
      console.log(`Pickup approval email sent successfully to ${userEmail} for pickup ID: ${pickupData.id}`);
    } else {
      console.warn(`Failed to send pickup approval email to ${userEmail} for pickup ID: ${pickupData.id}:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`Error sending pickup approval email to ${userEmail} for pickup ID: ${pickupData.id}:`, error);
    return { success: false, error };
  }
}

/**
 * Send a customs charges notification email to info@moogship.com when UPS tracking shows import/duty charges are due
 * @param shipmentData Shipment information
 * @param trackingData UPS tracking information that detected the customs charges
 * @param userData User who owns the shipment
 */
export async function sendCustomsChargesNotification(
  shipmentData: {
    id: number;
    carrierTrackingNumber?: string;
    recipientName?: string;
    recipientAddress?: string;
    recipientCity?: string;
    recipientCountry?: string;
  },
  trackingData: {
    status: string;
    statusDescription: string;
    statusTime: string;
  },
  userData: {
    id: number;
    name?: string;
    email: string;
  }
): Promise<{success: boolean, error?: any}> {
  
  // Use custom sender email if specified in environment, defaulting to cs@moogship.com
  const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || 'cs@moogship.com';
  const adminEmail = 'info@moogship.com';
  const customerEmail = userData.email;
  
  // Format the status time nicely
  let formattedStatusTime;
  try {
    formattedStatusTime = new Date(trackingData.statusTime).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    formattedStatusTime = trackingData.statusTime;
  }
  
  const emailSubject = `🚨 ACİL: Gümrük Ücretleri - UPS Gönderi #${shipmentData.id} (${shipmentData.carrierTrackingNumber})`;
  
  // Create UPS tracking link
  const upsTrackingUrl = `https://www.ups.com/track?track=yes&trackNums=${shipmentData.carrierTrackingNumber}`;
  
  // Create email HTML content
  const emailHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoogShip Customs Charges Alert</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
      <tr>
        <td align="center" style="padding: 40px 0;">
          <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
            
            <!-- Header with Alert -->
            <tr>
              <td align="center" style="padding: 30px 20px; background-color: #dc3545; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                <table border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <h1 style="font-size: 24px; color: #ffffff; margin: 0; font-weight: 600;">🚨 GÜMRÜK ÜCRETLERİ UYARISI</h1>
                      <p style="margin: 5px 0 0; color: #fff; font-size: 16px;">İthalat/Gümrük Ücretleri Ödenmesi Gerekli</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            
            <!-- Main Content -->
            <tr>
              <td style="padding: 30px 40px 40px 40px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  
                  <tr>
                    <td style="padding: 0 0 20px 0;">
                      <p style="margin: 0; font-size: 18px; line-height: 1.5; color: #333; font-weight: bold;">
                        Acil İşlem Gerekli
                      </p>
                      <p style="margin: 10px 0 0; font-size: 16px; line-height: 1.5; color: #555;">
                        UPS gönderinizde teslimatın devam etmesi için ödenmesi gereken gümrük ücretleri bulunmaktadır.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Shipment Details -->
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107; border: 1px solid #ffeaa7;">
                      <div style="padding: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">Gönderi Bilgileri</h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="150" style="color: #856404; font-size: 14px; padding: 5px 0; font-weight: bold;">Gönderi No:</td>
                            <td style="font-size: 14px; padding: 5px 0;">#${shipmentData.id}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #856404; font-size: 14px; padding: 5px 0; font-weight: bold;">UPS Takip:</td>
                            <td style="font-size: 14px; padding: 5px 0; font-family: monospace; font-weight: bold;">
                              <a href="${upsTrackingUrl}" style="color: #1170c9; text-decoration: none; font-weight: bold;" target="_blank">${shipmentData.carrierTrackingNumber}</a>
                            </td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #856404; font-size: 14px; padding: 5px 0; font-weight: bold;">MoogShip Müşteri:</td>
                            <td style="font-size: 14px; padding: 5px 0; font-weight: bold;">${userData.name || userData.email}</td>
                          </tr>
                          ${shipmentData.recipientName ? `
                          <tr>
                            <td width="150" style="color: #856404; font-size: 14px; padding: 5px 0; font-weight: bold;">Alıcı Adı:</td>
                            <td style="font-size: 14px; padding: 5px 0; font-weight: bold;">${shipmentData.recipientName}</td>
                          </tr>` : ''}
                          ${shipmentData.recipientAddress ? `
                          <tr>
                            <td width="150" style="color: #856404; font-size: 14px; padding: 5px 0; font-weight: bold;">Teslimat Adresi:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${shipmentData.recipientAddress}${shipmentData.recipientCity ? ', ' + shipmentData.recipientCity : ''}${shipmentData.recipientCountry ? ', ' + shipmentData.recipientCountry : ''}</td>
                          </tr>` : ''}
                        </table>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- UPS Status Details -->
                  <tr>
                    <td style="padding: 0 0 20px 0; background-color: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545; border: 1px solid #f5c6cb;">
                      <div style="padding: 20px;">
                        <h3 style="margin: 0 0 15px 0; color: #721c24; font-size: 18px;">UPS Takip Durumu</h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="150" style="color: #721c24; font-size: 14px; padding: 5px 0; font-weight: bold;">Durum:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${trackingData.status}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #721c24; font-size: 14px; padding: 5px 0; font-weight: bold;">Açıklama:</td>
                            <td style="font-size: 14px; padding: 5px 0; font-weight: bold;">${trackingData.statusDescription}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #721c24; font-size: 14px; padding: 5px 0; font-weight: bold;">Tespit Tarihi:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${formattedStatusTime}</td>
                          </tr>
                        </table>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Important Information -->
                  <tr>
                    <td style="padding: 20px 0;">
                      <h3 style="margin: 0 0 15px 0; color: #dc3545; font-size: 18px;">Önemli Bilgi:</h3>
                      <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                          <strong>📋 Bu Ne Anlama Geliyor:</strong><br>
                          Gönderiniz hedef ülkeye ulaşmıştır ve teslimatın tamamlanması için ithalat/gümrük ücretlerinin ödenmesi gerekmektedir.
                        </p>
                      </div>
                      
                      <div style="background-color: #d1ecf1; border: 1px solid #b6d7ff; border-radius: 5px; padding: 15px; margin: 15px 0;">
                        <p style="margin: 0; color: #0c5460; font-size: 14px; line-height: 1.6;">
                          <strong>💳 Sonraki Adımlar:</strong><br>
                          • Ücretleri online ödemek için aşağıdaki UPS takip sayfasını ziyaret edin (mevcut ise)<br>
                          • Ücretler teslimat sırasında da ödenebilir<br>
                          • Ödeme yardımı için UPS müşteri hizmetleri ile iletişime geçin
                        </p>
                      </div>
                      
                      <div style="text-align: center; margin: 20px 0;">
                        <a href="${upsTrackingUrl}" style="background-color: #8B4513; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;" target="_blank">
                          📦 UPS Takip Detaylarını Görüntüle
                        </a>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 20px 0 0 0; border-top: 1px solid #eeeeee;">
                      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777;">
                        <strong>Bu MoogShip takip sisteminden otomatik bir uyarıdır.</strong><br>
                        Tespit zamanı: ${formattedStatusTime}
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
  
  // Create plain text version
  const emailText = `
🚨 GÜMRÜK ÜCRETLERİ UYARISI - ACİL İŞLEM GEREKLİ 🚨

UPS gönderisinde ithalat/gümrük ücretleri ödenmeyi bekliyor ve acil müdahale gerektiriyor.

GÖNDERİ BİLGİLERİ:
- Gönderi No: #${shipmentData.id}
- UPS Takip: ${shipmentData.carrierTrackingNumber}
- Online Takip: ${upsTrackingUrl}
- MoogShip Müşteri: ${userData.name || userData.email}
${shipmentData.recipientName ? `- Alıcı Adı: ${shipmentData.recipientName}` : ''}
${shipmentData.recipientAddress ? `- Teslimat Adresi: ${shipmentData.recipientAddress}${shipmentData.recipientCity ? ', ' + shipmentData.recipientCity : ''}${shipmentData.recipientCountry ? ', ' + shipmentData.recipientCountry : ''}` : ''}

UPS TAKIP DURUMU:
- Durum: ${trackingData.status}
- Açıklama: ${trackingData.statusDescription}
- Tespit Tarihi: ${formattedStatusTime}

ÖNEMLİ BİLGİ:
Gönderiniz hedef ülkeye ulaşmıştır ve teslimatın tamamlanması için ithalat/gümrük ücretlerinin ödenmesi gerekmektedir.

SONRAKİ ADIMLAR:
• Ücretleri online ödemek için aşağıdaki UPS takip bağlantısını ziyaret edin (mevcut ise)
• Ücretler teslimat sırasında da ödenebilir
• Ödeme yardımı için UPS müşteri hizmetleri ile iletişime geçin

UPS TAKİP BAĞLANTISI: ${upsTrackingUrl}

Bu MoogShip takip sisteminden otomatik bir uyarıdır.
Tespit zamanı: ${formattedStatusTime}

© 2025 MoogShip Global Shipping Solutions. Tüm hakları saklıdır.
  `;
  
  console.log(`Sending customs charges notification for shipment ${shipmentData.id} to admin (${adminEmail}) and customer (${customerEmail})`);
  
  try {
    // Send to both admin and customer
    const adminResult = await sendEmail({
      to: adminEmail,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
    
    const customerResult = await sendEmail({
      to: customerEmail,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
    
    // Check results
    const adminSuccess = adminResult.success;
    const customerSuccess = customerResult.success;
    
    if (adminSuccess && customerSuccess) {
      console.log(`Customs charges notification sent successfully to both admin and customer for shipment ${shipmentData.id}`);
      return { success: true };
    } else if (adminSuccess || customerSuccess) {
      console.warn(`Customs charges notification partially sent for shipment ${shipmentData.id}: Admin=${adminSuccess}, Customer=${customerSuccess}`);
      const errors = [];
      if (!adminSuccess) errors.push(`Admin: ${adminResult.error}`);
      if (!customerSuccess) errors.push(`Customer: ${customerResult.error}`);
      return { success: true, partialFailure: true, errors };
    } else {
      console.error(`Failed to send customs charges notification for shipment ${shipmentData.id} to both recipients`);
      return { 
        success: false, 
        error: `Admin: ${adminResult.error}, Customer: ${customerResult.error}` 
      };
    }
  } catch (error) {
    console.error(`Error sending customs charges notification for shipment ${shipmentData.id}:`, error);
    return { success: false, error };
  }
}