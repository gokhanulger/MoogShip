import { User, Shipment, TrackingUpdateBatch } from "@shared/schema";
import { sendEmail } from "./email";
import fs from "fs";
import path from "path";
import { readFileSync } from "fs";
import { downloadPdfFromUrl } from "./utilities/pdfUtils.js";
import { storage } from "./storage";

// Helper function to get base64 encoded logo (returns only base64 string, not data URL)
function getBase64Logo(): string {
  try {
    // Use the clean base64 from official_logo_base64.txt
    const logoPath = path.join(process.cwd(), "official_logo_base64.txt");
    const logoData = readFileSync(logoPath, "utf8");
    // Return clean base64 string (trim whitespace)
    return logoData.trim();
  } catch (error) {
    console.error("Error reading logo file:", error);
    // Return empty string if logo file can't be read
    return "";
  }
}

/**
 * Check if a user should receive a specific type of notification based on their preferences
 * @param userId The user ID to check preferences for
 * @param notificationType The type of notification to check
 * @param context Additional context for notification type (e.g., 'immediate' for shipment events)
 * @returns Promise<boolean> indicating if the user should receive the notification
 */
export async function shouldSendNotification(
  userId: number,
  notificationType: 'marketing' | 'shipment_immediate' | 'shipment_digest' | 'account' | 'admin' | 'tracking_delivery' | 'refund_return' | 'support_ticket' | 'customs',
  isCritical: boolean = false
): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      return false; // Don't send to non-existent users
    }

    switch (notificationType) {
      case 'marketing':
        return user.emailMarketingCampaigns === true;
      case 'shipment_immediate':
        return user.shipmentStatusUpdates === 'immediate';
      case 'shipment_digest':
        return user.shipmentStatusUpdates === 'daily_digest';
      case 'account':
        return user.accountNotifications === true;
      case 'admin':
        return user.adminNotifications === true;
      case 'tracking_delivery':
        return user.trackingDeliveryNotifications === true;
      case 'refund_return':
        return user.refundReturnNotifications === true;
      case 'support_ticket':
        return user.supportTicketNotifications === true;
      case 'customs':
        return user.customsNotifications === true;
      default:
        return false;
    }
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    // For critical emails (security, verification), fail-safe (send anyway)
    // For non-critical emails, fail-closed (don't send) to reduce spam
    return isCritical;
  }
}

/**
 * Sends a notification email to administrators when a new user registers
 *
 * @param user The newly registered user
 * @returns Object indicating success or failure
 */
export async function sendNewUserRegistrationNotification(
  user: User,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Admin emails to notify
    const notificationRecipients = [
      "info@moogship.com",
      "oguzhan@moogco.com",
      "gokhan@moogship.com",
      "gulsah@moogship.com",
      "sercan@moogship.com",
    ];

    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Get base64 encoded logo for embedding directly in email
    const logoBase64 = getBase64Logo();

    const emailSubject = `[MoogShip] New User Registration: ${user.name}`;

    // HTML template for the notification email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New User Registration / Yeni Kullanıcı Kaydı</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <!-- MoogShip Logo as Base64 Embedded Image -->
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #1170c9; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">New User Registration / Yeni Kullanıcı Kaydı</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Content Container -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Introduction - English -->
                    <tr>
                      <td style="padding: 0 0 15px 0;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          A new user has registered on the MoogShip platform and is awaiting approval.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Introduction - Turkish -->
                    <tr>
                      <td style="padding: 0 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          MoogShip platformuna yeni bir kullanıcı kaydoldu ve onay bekliyor.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- User Details -->
                    <tr>
                      <td style="padding: 30px 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 15px 0;">User Details / Kullanıcı Bilgileri:</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Name / İsim:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.name}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Username / Kullanıcı Adı:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.username}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Email / E-posta:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.email}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Company / Şirket:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.companyName || "N/A"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Company Type / Şirket Türü:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.companyType || "N/A"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Phone / Telefon:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.phone || "N/A"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Registered on / Kayıt Tarihi:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${typeof user.createdAt === "object" && user.createdAt !== null ? new Date(user.createdAt).toLocaleString() : "N/A"}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Action - English -->
                    <tr>
                      <td style="padding: 30px 0 15px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Please review and approve or reject this user registration in the admin panel.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Action - Turkish -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Lütfen bu kullanıcı kaydını yönetici panelinde inceleyip onaylayın veya reddedin.
                        </p>
                        
                        <!-- Action Button -->
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td bgcolor="#2E6FC1" style="border-radius: 4px;">
                              <a href="https://app.moogship.com/manage-users" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">Manage Users / Kullanıcıları Yönet</a>
                            </td>
                          </tr>
                        </table>
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
New User Registration / Yeni Kullanıcı Kaydı

ENGLISH:
A new user has registered on the MoogShip platform and is awaiting approval.

TÜRKÇE:
MoogShip platformuna yeni bir kullanıcı kaydoldu ve onay bekliyor.

User Details / Kullanıcı Bilgileri:
- Name / İsim: ${user.name}
- Username / Kullanıcı Adı: ${user.username}
- Email / E-posta: ${user.email}
- Company / Şirket: ${user.companyName || "N/A"}
- Company Type / Şirket Türü: ${user.companyType || "N/A"}
- Phone / Telefon: ${user.phone || "N/A"}
- Registered on / Kayıt Tarihi: ${typeof user.createdAt === "object" && user.createdAt !== null ? new Date(user.createdAt).toLocaleString() : "N/A"}

ENGLISH:
Please review and approve or reject this user registration in the admin panel at:
https://app.moogship.com/manage-users

TÜRKÇE:
Lütfen bu kullanıcı kaydını yönetici panelinde inceleyip onaylayın veya reddedin:
https://app.moogship.com/manage-users

MoogShip Team / MoogShip Ekibi
    `;

    // Send to all administrator email addresses
    const results = await Promise.all(
      notificationRecipients.map((recipient) =>
        sendEmail({
          to: recipient,
          from: senderEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
      ),
    );

    // Check if any email was sent successfully
    const anySuccess = results.some((result) => result.success);

    // Combine errors from all attempts
    const errors = results
      .filter((result) => !result.success && result.error)
      .map((result) => result.error);

    console.log(
      `Admin notification email results:`,
      results
        .map(
          (r, i) =>
            `${notificationRecipients[i]}: ${r.success ? "Success" : "Failed"}`,
        )
        .join(", "),
    );

    return {
      success: anySuccess,
      error: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error sending admin notification email:", error);
    return { success: false, error };
  }
}

/**
 * Sends a notification email to administrators when a new shipment needs approval
 *
 * @param shipment The new shipment that needs approval
 * @param user The user who created the shipment
 * @returns Object indicating success or failure
 */
export async function sendNewShipmentNotification(
  shipment: Shipment,
  user: User,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Admin emails to notify
    const notificationRecipients = [
      "info@moogship.com",
      "oguzhan@moogco.com",
      "gokhan@moogship.com",
      "gulsah@moogship.com",
      "sercan@moogship.com",
    ];

    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Get base64 encoded logo for embedding directly in email
    const logoBase64 = getBase64Logo();

    const emailSubject = `[MoogShip] New Shipment Requires Approval: #${shipment.id}`;

    // Format prices from cents to dollars with 2 decimal places
    const formattedTotalPrice = shipment.totalPrice
      ? `$${(shipment.totalPrice / 100).toFixed(2)}`
      : "N/A";
    const formattedBasePrice = shipment.basePrice
      ? `$${(shipment.basePrice / 100).toFixed(2)}`
      : "N/A";
    const formattedFuelCharge = shipment.fuelCharge
      ? `$${(shipment.fuelCharge / 100).toFixed(2)}`
      : "N/A";

    // HTML template for the notification email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Shipment Requires Approval / Yeni Gönderi Onay Bekliyor</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <!-- MoogShip Logo as Base64 Embedded Image -->
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #f0ad4e; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">New Shipment Requires Approval / Yeni Gönderi Onay Bekliyor</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Content Container -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Introduction - English -->
                    <tr>
                      <td style="padding: 0 0 15px 0;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          A new shipment has been created on the MoogShip platform and is awaiting approval.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Introduction - Turkish -->
                    <tr>
                      <td style="padding: 0 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          MoogShip platformunda yeni bir gönderi oluşturuldu ve onay bekliyor.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- User Details -->
                    <tr>
                      <td style="padding: 30px 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 15px 0;">User Details / Kullanıcı Bilgileri:</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">User ID / Kullanıcı ID:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.id}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Name / İsim:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.name}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Email / E-posta:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.email}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Company / Şirket:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${user.companyName || "N/A"}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Shipment Details -->
                    <tr>
                      <td style="padding: 30px 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 15px 0;">Shipment Details / Gönderi Bilgileri:</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Shipment ID / Gönderi ID:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.id}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Created / Oluşturulma:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.createdAt ? new Date(shipment.createdAt).toLocaleString() : "N/A"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Service Level / Servis Seviyesi:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.serviceLevel || "N/A"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Total Price / Toplam Fiyat:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${formattedTotalPrice} ${shipment.currency || "USD"}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Sender / Gönderici:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.senderName}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Recipient / Alıcı:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.receiverName}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Destination / Hedef:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.receiverCity}, ${shipment.receiverCountry}</td>
                          </tr>
                          <tr>
                            <td width="30%" style="padding: 8px 0; font-weight: bold; color: #505050;">Package Details / Paket Detayları:</td>
                            <td width="70%" style="padding: 8px 0; color: #505050;">${shipment.packageWeight}kg, ${shipment.packageLength}x${shipment.packageWidth}x${shipment.packageHeight}cm</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Action - English -->
                    <tr>
                      <td style="padding: 30px 0 15px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Please review and approve or reject this shipment in the admin panel.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Action - Turkish -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Lütfen bu gönderiyi yönetici panelinde inceleyip onaylayın veya reddedin.
                        </p>
                        
                        <!-- Action Button -->
                        <table border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td bgcolor="#2E6FC1" style="border-radius: 4px;">
                              <a href="https://app.moogship.com/admin-shipments" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">Manage Shipments / Gönderileri Yönet</a>
                            </td>
                          </tr>
                        </table>
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
New Shipment Requires Approval / Yeni Gönderi Onay Bekliyor

ENGLISH:
A new shipment has been created on the MoogShip platform and is awaiting approval.

TÜRKÇE:
MoogShip platformunda yeni bir gönderi oluşturuldu ve onay bekliyor.

User Details / Kullanıcı Bilgileri:
- User ID / Kullanıcı ID: ${user.id}
- Name / İsim: ${user.name}
- Email / E-posta: ${user.email}
- Company / Şirket: ${user.companyName || "N/A"}

Shipment Details / Gönderi Bilgileri:
- Shipment ID / Gönderi ID: ${shipment.id}
- Created / Oluşturulma: ${shipment.createdAt ? new Date(shipment.createdAt).toLocaleString() : "N/A"}
- Service Level / Servis Seviyesi: ${shipment.serviceLevel || "N/A"}
- Total Price / Toplam Fiyat: ${formattedTotalPrice} ${shipment.currency || "USD"}
- Sender / Gönderici: ${shipment.senderName}
- Recipient / Alıcı: ${shipment.receiverName}
- Destination / Hedef: ${shipment.receiverCity}, ${shipment.receiverCountry}
- Package Details / Paket Detayları: ${shipment.packageWeight}kg, ${shipment.packageLength}x${shipment.packageWidth}x${shipment.packageHeight}cm

ENGLISH:
Please review and approve or reject this shipment in the admin panel at:
https://app.moogship.com/admin-shipments

TÜRKÇE:
Lütfen bu gönderiyi yönetici panelinde inceleyip onaylayın veya reddedin:
https://app.moogship.com/admin-shipments

MoogShip Team / MoogShip Ekibi
    `;

    // Send to all administrator email addresses
    const results = await Promise.all(
      notificationRecipients.map((recipient) =>
        sendEmail({
          to: recipient,
          from: senderEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
      ),
    );

    // Check if any email was sent successfully
    const anySuccess = results.some((result) => result.success);

    // Combine errors from all attempts
    const errors = results
      .filter((result) => !result.success && result.error)
      .map((result) => result.error);

    console.log(
      `Admin shipment notification email results:`,
      results
        .map(
          (r, i) =>
            `${notificationRecipients[i]}: ${r.success ? "Success" : "Failed"}`,
        )
        .join(", "),
    );

    return {
      success: anySuccess,
      error: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Error sending new shipment notification email:", error);
    return { success: false, error };
  }
}

/**
 * Sends a bulk shipment approval summary email to the user
 *
 * @param shipments Array of approved shipments
 * @param user The user who owns the shipments
 * @returns Object indicating success or failure
 */
export async function sendBulkShipmentApprovalEmail(
  shipments: Shipment[],
  user: User,
): Promise<{ success: boolean; error?: any; skipped?: boolean }> {
  try {
    // Validate data
    if (!shipments || shipments.length === 0 || !user || !user.email) {
      console.error("Invalid data for bulk shipment approval email:", {
        shipmentCount: shipments?.length || 0,
        userId: user?.id,
        hasEmail: !!user?.email,
      });
      return { success: false, error: "Invalid shipments or user data" };
    }

    // Check if user wants to receive shipment status notifications (immediate)
    const shouldSend = await shouldSendNotification(user.id, 'shipment_immediate', false);
    if (!shouldSend) {
      console.log(`User ${user.email} has disabled shipment notifications - skipping bulk approval email`);
      return { success: true, skipped: true };
    }

    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";
    const logoBase64 = getBase64Logo();

    const shipmentCount = shipments.length;
    const totalValue = shipments.reduce(
      (sum, s) => sum + (s.totalPrice || 0),
      0,
    );
    const shipmentIds = shipments.map((s) => s.id).join(", ");

    const emailSubject = `${shipmentCount} MoogShip Gönderiniz Onaylandı / ${shipmentCount} Shipments Approved`;

    // HTML template for bulk approval email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bulk Shipments Approved / Toplu Gönderiler Onaylandı</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: #ffffff; text-align: center; padding: 30px; border-radius: 10px 10px 0 0; border-bottom: 3px solid #f0f0f0;">
                  ${logoBase64 ? `<div style="background: #ffffff; padding: 15px; border-radius: 8px; display: inline-block; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><img src="data:image/jpeg;base64,${logoBase64}" alt="MoogShip" style="max-width: 180px; height: auto;"></div>` : '<h1 style="color: #1e3a8a; margin: 0; font-size: 32px;">MoogShip</h1>'}
                  <h2 style="color: #1e3a8a; margin: 10px 0 0 0; font-size: 24px; font-weight: bold;">✅ ${shipmentCount} Shipments Approved</h2>
                  <p style="color: #666666; margin: 5px 0 0 0; font-size: 16px;">${shipmentCount} Gönderi Onaylandı</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 30px;">
                  
                  <!-- Turkish Section -->
                  <div style="margin-bottom: 40px; padding-bottom: 30px; border-bottom: 2px solid #e5e7eb;">
                    <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">🇹🇷 TÜRKÇE</h3>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Sayın <strong>${user.name}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Harika haber! <strong>${shipmentCount} gönderinizi</strong> onayladık ve hesap bakiyenizi işledik. Tüm kargo etiketleri oluşturuldu ve paketleriniz kargo alımı için hazır.
                    </p>
                    
                    <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                      <h4 style="color: #d97706; margin: 0 0 15px 0; font-size: 18px;">📋 Onay Özeti</h4>
                      <p style="margin: 5px 0; color: #374151;"><strong>Onaylanan Gönderiler:</strong> ${shipmentCount}</p>
                      <p style="margin: 5px 0; color: #374151;"><strong>Toplam Değer:</strong> $${(totalValue / 100).toFixed(2)}</p>
                      <p style="margin: 5px 0; color: #374151;"><strong>Gönderi Numaraları:</strong> ${shipmentIds}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://app.moogship.com/shipment-list" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">Tüm Gönderileri Görüntüle</a>
                    </div>
                  </div>
                  
                  <!-- English Section -->
                  <div>
                    <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">🇺🇸 ENGLISH</h3>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Dear <strong>${user.name}</strong>,
                    </p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Great news! We've approved <strong>${shipmentCount} shipments</strong> and processed your account balance. All shipping labels have been generated and your packages are ready for carrier pickup.
                    </p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
                      <h4 style="color: #059669; margin: 0 0 15px 0; font-size: 18px;">📋 Approval Summary</h4>
                      <p style="margin: 5px 0; color: #374151;"><strong>Shipments Approved:</strong> ${shipmentCount}</p>
                      <p style="margin: 5px 0; color: #374151;"><strong>Total Value:</strong> $${(totalValue / 100).toFixed(2)}</p>
                      <p style="margin: 5px 0; color: #374151;"><strong>Shipment IDs:</strong> ${shipmentIds}</p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://app.moogship.com/shipment-list" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; font-size: 16px;">View All Shipments</a>
                    </div>
                  </div>
                  
                </td>
              </tr>
              <tr>
                <td style="background: #f9fafb; padding: 30px; text-align: center; border-radius: 0 0 10px 10px;">
                  <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    <strong>MoogShip Global Shipping Solutions</strong><br>
                    📧 cs@moogship.com | 🌐 www.moogship.com
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

    // Text version
    const emailText = `
MoogShip - ${shipmentCount} Gönderi Onaylandı

TÜRKÇE:
Sayın ${user.name},

Harika haber! ${shipmentCount} gönderinizi onayladık ve hesap bakiyenizi işledik. Tüm kargo etiketleri oluşturuldu ve paketleriniz kargo alımı için hazır.

Onay Özeti:
- Onaylanan Gönderiler: ${shipmentCount}
- Toplam Değer: $${(totalValue / 100).toFixed(2)}
- Gönderi Numaraları: ${shipmentIds}

Gönderilerinizi görüntüleyin: https://app.moogship.com/shipment-list

ENGLISH:
Dear ${user.name},

Great news! We've approved ${shipmentCount} shipments and processed your account balance. All shipping labels have been generated and your packages are ready for carrier pickup.

Approval Summary:
- Shipments Approved: ${shipmentCount}
- Total Value: $${(totalValue / 100).toFixed(2)}
- Shipment IDs: ${shipmentIds}

View your shipments: https://app.moogship.com/shipment-list

---
MoogShip Global Shipping Solutions
cs@moogship.com | www.moogship.com
    `;

    console.log(
      `📧 Sending bulk approval email to user: ${user.email} for ${shipmentCount} shipments`,
    );

    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (result.success) {
      console.log(
        `📧 Bulk approval email sent successfully to ${user.email} for ${shipmentCount} shipments`,
      );
      return { success: true };
    } else {
      console.error(
        `❌ Failed to send bulk approval email to ${user.email}:`,
        result.error,
      );
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error("❌ Error sending bulk shipment approval email:", error);
    return { success: false, error };
  }
}

/**
 * Sends a shipment approval notification email to the user
 *
 * @param shipment The approved shipment
 * @param user The user who owns the shipment
 * @returns Object indicating success or failure
 */
export async function sendShipmentApprovalEmail(
  shipment: Shipment,
  user: User,
): Promise<{ success: boolean; error?: any; skipped?: boolean }> {
  try {
    // Validate data
    if (!shipment || !user || !user.email) {
      console.error("Invalid data for shipment approval email:", {
        shipmentId: shipment?.id,
        userId: user?.id,
        hasEmail: !!user?.email,
      });
      return { success: false, error: "Invalid shipment or user data" };
    }

    // Check if user wants to receive shipment status notifications (immediate)
    const shouldSend = await shouldSendNotification(user.id, 'shipment_immediate', false);
    if (!shouldSend) {
      console.log(`User ${user.email} has disabled shipment notifications - skipping approval email`);
      return { success: true, skipped: true };
    }

    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Get base64 encoded logo for embedding directly in email
    const logoBase64 = getBase64Logo();

    const emailSubject = `Your MoogShip Shipment #${shipment.id} Has Been Approved / MoogShip Gönderiniz Onaylandı`;

    // Format prices from cents to dollars with 2 decimal places
    const formattedTotalPrice = shipment.totalPrice
      ? `$${(shipment.totalPrice / 100).toFixed(2)}`
      : "N/A";
    const formattedBasePrice = shipment.basePrice
      ? `$${(shipment.basePrice / 100).toFixed(2)}`
      : "N/A";
    const formattedFuelCharge = shipment.fuelCharge
      ? `$${(shipment.fuelCharge / 100).toFixed(2)}`
      : "N/A";

    // Prepare label PDF attachment if available
    let attachments = [];
    let labelWasAttached = false;

    if (shipment.labelUrl || shipment.labelPdf) {
      try {
        let pdfBase64: string | null = null;

        // If we already have the PDF data as base64, use it directly
        if (shipment.labelPdf) {
          pdfBase64 = shipment.labelPdf;
          console.log(
            `Using existing base64 PDF data for shipment ${shipment.id}`,
          );
          labelWasAttached = true;
        }
        // Otherwise, try to read the PDF file from the server's file system
        else if (shipment.labelUrl && !shipment.labelUrl.startsWith("http")) {
          const labelPath = path.join(process.cwd(), shipment.labelUrl);
          if (fs.existsSync(labelPath)) {
            const labelBuffer = fs.readFileSync(labelPath);
            pdfBase64 = labelBuffer.toString("base64");
            console.log(
              `Read PDF file from disk for shipment ${shipment.id}: ${labelPath}`,
            );
            labelWasAttached = true;
          } else {
            console.warn(
              `Label file not found for shipment ${shipment.id}: ${labelPath}`,
            );
          }
        }
        // If it's a URL, try to download the PDF
        else if (shipment.labelUrl && shipment.labelUrl.startsWith("http")) {
          try {
            // Use the imported utility function to download the PDF
            pdfBase64 = await downloadPdfFromUrl(shipment.labelUrl);
            if (pdfBase64) {
              console.log(
                `Downloaded PDF from URL for shipment ${shipment.id}`,
              );
              labelWasAttached = true;
            }
          } catch (downloadError) {
            console.error(
              `Error downloading PDF from URL for shipment ${shipment.id}:`,
              downloadError,
            );
          }
        }

        // If we have PDF data, create the attachment
        if (pdfBase64) {
          attachments.push({
            filename: `moogship-label-${shipment.id}.pdf`,
            content: pdfBase64,
            contentType: "application/pdf",
            encoding: "base64",
          });
          console.log(
            `Attached shipping label PDF for shipment ${shipment.id}`,
          );
        }
      } catch (attachmentError) {
        console.error(
          `Error preparing label attachment for shipment ${shipment.id}:`,
          attachmentError,
        );
      }
    }

    // HTML template for the approval email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Shipment Approved / Gönderi Onaylandı</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <!-- MoogShip Logo as Base64 Embedded Image -->
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #28a745; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">Shipment Approved! / Gönderi Onaylandı!</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Content Container -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- English Version -->
                    <tr>
                      <td style="padding: 0 0 10px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>Hello ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          We're pleased to inform you that <strong>your shipment #${shipment.id} has been approved!</strong> Your package is now ready for processing.
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Your shipping label is attached to this email. You can track your shipment using the tracking number provided below.
                        </p>
                      </td>
                    </tr>

                    <!-- Turkish Version -->
                    <tr>
                      <td style="padding: 0 0 20px 0; border-bottom: 1px solid #eeeeee;">
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>Merhaba ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>#${shipment.id} numaralı gönderinizin onaylandığını</strong> bildirmekten memnuniyet duyarız! Paketiniz artık işleme alınmaya hazır.
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Kargo etiketiniz bu e-postaya eklenmiştir. Aşağıda verilen takip numarasını kullanarak gönderinizi takip edebilirsiniz.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Shipment Details -->
                    <tr>
                      <td style="padding: 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Shipment Details / Gönderi Detayları</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Shipment ID / Gönderi ID:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.id}</td>
                          </tr>
                          ${
                            shipment.trackingNumber
                              ? `
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Tracking Number / Takip Numarası:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.trackingNumber}</td>
                          </tr>`
                              : ""
                          }
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Service Level / Servis Seviyesi:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.serviceLevel || "Standard"}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Recipient / Alıcı:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.receiverName}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Destination / Hedef:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.receiverCity}, ${shipment.receiverCountry}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Total Price / Toplam Fiyat:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${formattedTotalPrice} ${shipment.currency || "USD"}</td>
                          </tr>
                          ${
                            shipment.estimatedDeliveryDays
                              ? `
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Estimated Delivery / Tahmini Teslimat:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.estimatedDeliveryDays} days / gün</td>
                          </tr>`
                              : ""
                          }
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Action Buttons -->
                    ${
                      !labelWasAttached
                        ? `
                    <tr>
                      <td style="padding: 30px 0 0 0; text-align: center;">
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050; text-align: left;">
                          <strong>ENGLISH:</strong> Use the button below to access your shipment details and track your package.
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050; text-align: left;">
                          <strong>TÜRKÇE:</strong> Gönderi detaylarınıza erişmek ve paketinizi takip etmek için aşağıdaki düğmeyi kullanın.
                        </p>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td>
                              <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td style="text-align: center;">
                                    <a href="https://app.moogship.com/shipments/${shipment.id}" target="_blank" style="background-color: #2E6FC1; font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 20px; display: inline-block; font-weight: bold;">View Shipment Details / Gönderi Detaylarını Görüntüle</a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    
                    <!-- Label Attachment Message -->
                    ${
                      labelWasAttached
                        ? `
                    <tr>
                      <td style="padding: 30px 0; text-align: center; background-color: #f8f9fa; border-radius: 4px; margin: 0 0 30px 0;">
                        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #28a745; text-align: center; font-weight: bold;">
                          ✓ Your shipping label is attached to this email! / Kargo etiketiniz bu e-postaya eklenmiştir!
                        </p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #505050; text-align: center;">
                          ENGLISH: You can print the attached PDF shipping label directly from this email.<br>
                          TÜRKÇE: Bu e-postaya ekli PDF kargo etiketini doğrudan yazdırabilirsiniz.
                        </p>
                      </td>
                    </tr>
                    `
                        : ""
                    }
                    
                    <!-- What's Next Section -->
                    <tr>
                      <td style="padding: 30px 0 0 0;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">What's Next? / Sırada Ne Var?</h2>
                        
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <ol style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050; padding-left: 20px;">
                          <li style="margin-bottom: 8px;">Print your shipping label and attach it securely to your package.</li>
                          <li style="margin-bottom: 8px;">Drop off your package at any authorized shipping location.</li>
                          <li style="margin-bottom: 8px;">Use the tracking number to monitor your shipment's progress.</li>
                        </ol>
                        
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <ol style="margin: 0 0 0 0; font-size: 16px; line-height: 1.5; color: #505050; padding-left: 20px;">
                          <li style="margin-bottom: 8px;">Kargo etiketinizi yazdırın ve paketinize güvenli bir şekilde yapıştırın.</li>
                          <li style="margin-bottom: 8px;">Paketinizi herhangi bir yetkili kargo noktasına bırakın.</li>
                          <li style="margin-bottom: 8px;">Gönderinizin ilerlemesini takip etmek için takip numarasını kullanın.</li>
                        </ol>
                      </td>
                    </tr>
                    
                    <!-- Support Section -->
                    <tr>
                      <td style="padding: 30px 0 0 0;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 15px 0;">Need Help? / Yardıma mı İhtiyacınız Var?</h2>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong> If you have any questions or need assistance, please don't hesitate to contact our support team at info@moogship.com
                        </p>
                        <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong> Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen destek ekibimizle info@moogship.com adresinden iletişime geçmekten çekinmeyin.
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
Shipment Approved! / Gönderi Onaylandı!

ENGLISH:
Hello ${user.name || user.username},

We're pleased to inform you that your shipment #${shipment.id} has been approved! Your package is now ready for processing.

Your shipping label is ${labelWasAttached ? "attached to this email" : "available for download"}. You can track your shipment using the tracking number provided below.

TÜRKÇE:
Merhaba ${user.name || user.username},

#${shipment.id} numaralı gönderinizin onaylandığını bildirmekten memnuniyet duyarız! Paketiniz artık işleme alınmaya hazır.

Kargo etiketiniz ${labelWasAttached ? "bu e-postaya eklenmiştir" : "indirilebilir durumdadır"}. Aşağıda verilen takip numarasını kullanarak gönderinizi takip edebilirsiniz.

Shipment Details / Gönderi Detayları:
- Shipment ID / Gönderi ID: ${shipment.id}
${shipment.trackingNumber ? `- Tracking Number / Takip Numarası: ${shipment.trackingNumber}` : ""}
- Service Level / Servis Seviyesi: ${shipment.serviceLevel || "Standard"}
- Recipient / Alıcı: ${shipment.receiverName}
- Destination / Hedef: ${shipment.receiverCity}, ${shipment.receiverCountry}
- Total Price / Toplam Fiyat: ${formattedTotalPrice} ${shipment.currency || "USD"}
${shipment.estimatedDeliveryDays ? `- Estimated Delivery / Tahmini Teslimat: ${shipment.estimatedDeliveryDays} days / gün` : ""}

View your shipment details at: https://app.moogship.com/shipments/${shipment.id}
${labelWasAttached ? "Your shipping label is attached to this email." : shipment.labelUrl ? `Download your shipping label at: ${shipment.labelUrl}` : ""}

What's Next? / Sırada Ne Var?

ENGLISH:
1. Print your shipping label and attach it securely to your package.
2. Drop off your package at any authorized shipping location.
3. Use the tracking number to monitor your shipment's progress.

TÜRKÇE:
1. Kargo etiketinizi yazdırın ve paketinize güvenli bir şekilde yapıştırın.
2. Paketinizi herhangi bir yetkili kargo noktasına bırakın.
3. Gönderinizin ilerlemesini takip etmek için takip numarasını kullanın.

Need Help? / Yardıma mı İhtiyacınız Var?

ENGLISH: If you have any questions or need assistance, please don't hesitate to contact our support team at info@moogship.com

TÜRKÇE: Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen destek ekibimizle info@moogship.com adresinden iletişime geçmekten çekinmeyin.

Thank you for choosing MoogShip! / MoogShip'i seçtiğiniz için teşekkür ederiz!
    `;

    console.log(`Sending shipment approval email to user: ${user.email}`);

    // Update the email text version to mention the attachment if a label is included
    let updatedEmailText = emailText;
    if (labelWasAttached) {
      updatedEmailText +=
        "\n\nNOTE: Your shipping label is attached to this email as a PDF file.";
    }

    // Add a note in the HTML about the attachment if a label is included
    let updatedEmailHtml = emailHtml;
    if (labelWasAttached) {
      // Insert a note about the attachment before the closing body tag
      const noteHtml = `
      <tr>
        <td style="padding: 20px 0 0 0; border-top: 1px solid #eeeeee;">
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #28a745; text-align: center; font-weight: bold;">
            NOTE: Your shipping label is attached to this email as a PDF file.
          </p>
        </td>
      </tr>`;

      updatedEmailHtml = updatedEmailHtml.replace(
        "</table>\n          </td>\n        </tr>\n      </table>\n    </body>",
        `${noteHtml}\n      </table>\n          </td>\n        </tr>\n      </table>\n    </body>`,
      );
    }

    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: updatedEmailText,
      html: updatedEmailHtml,
      attachments: attachments,
    });

    if (!result.success) {
      console.error(
        `Failed to send shipment approval email to ${user.email}:`,
        result.error,
      );
    } else {
      console.log(
        `Successfully sent shipment approval email to ${user.email}${labelWasAttached ? " with label attachment" : ""}`,
      );
    }

    return result;
  } catch (error) {
    console.error("Error sending shipment approval email:", error);
    return { success: false, error };
  }
}

/**
 * Sends an approval confirmation email to a user who has been approved
 *
 * @param user The approved user
 * @returns Object indicating success or failure
 */
export async function sendUserApprovalEmail(
  user: User,
): Promise<{ success: boolean; error?: any; skipped?: boolean }> {
  try {
    // Validate user data
    if (!user || !user.email) {
      console.error("Invalid user data for approval email:", {
        userId: user?.id,
        hasEmail: !!user?.email,
      });
      return { success: false, error: "Invalid user data" };
    }

    // Check if user wants to receive account notifications
    const shouldSend = await shouldSendNotification(user.id, 'account', true);
    if (!shouldSend) {
      console.log(`User ${user.email} has disabled account notifications - skipping approval email`);
      return { success: true, skipped: true };
    }

    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Get base64 encoded logo for embedding directly in email
    const logoBase64 = getBase64Logo();

    const emailSubject =
      "Your MoogShip Account Has Been Approved / MoogShip Hesabınız Onaylandı";

    // HTML template for the approval email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Account Approved / Hesap Onaylandı</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <!-- MoogShip Logo as Base64 Embedded Image -->
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
              
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #28a745; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">Account Approved! / Hesabınız Onaylandı!</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <!-- Content Container -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- English Version -->
                    <tr>
                      <td style="padding: 0 0 10px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>Hello ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          We're excited to inform you that <strong>your MoogShip account has been approved!</strong> You can now log in to the platform and start using all of our shipping and logistics services.
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Thank you for choosing MoogShip for your international shipping needs. We look forward to helping you manage your global logistics operations with ease.
                        </p>
                      </td>
                    </tr>

                    <!-- Turkish Version -->
                    <tr>
                      <td style="padding: 0 0 20px 0; border-bottom: 1px solid #eeeeee;">
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>Merhaba ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0 0 10px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>MoogShip hesabınızın onaylandığını</strong> bildirmekten memnuniyet duyarız! Artık platforma giriş yapabilir ve tüm nakliye ve lojistik hizmetlerimizi kullanmaya başlayabilirsiniz.
                        </p>
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Uluslararası nakliye ihtiyaçlarınız için MoogShip'i seçtiğiniz için teşekkür ederiz. Küresel lojistik operasyonlarınızı kolaylıkla yönetmenize yardımcı olmaktan mutluluk duyacağız.
                        </p>
                        
                        <!-- Action Button -->
                        <table border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                          <tr>
                            <td bgcolor="#28a745" style="border-radius: 4px;">
                              <a href="https://app.moogship.com/auth" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">Log In Now / Şimdi Giriş Yap</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Help Section - English -->
                    <tr>
                      <td style="padding: 30px 0 15px 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 10px 0;">Need Help?</h2>
                        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          If you have any questions or need assistance, please don't hesitate to contact our support team at <a href="mailto:info@moogship.com" style="color: #1170c9; text-decoration: none;">info@moogship.com</a>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Help Section - Turkish -->
                    <tr>
                      <td style="padding: 0 0 0 0;">
                        <p style="margin: 0 0 5px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 10px 0;">Yardıma mı İhtiyacınız Var?</h2>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen destek ekibimizle <a href="mailto:info@moogship.com" style="color: #1170c9; text-decoration: none;">info@moogship.com</a> adresinden iletişime geçmekten çekinmeyin.
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
Account Approved! / Hesabınız Onaylandı!

ENGLISH:
Hello ${user.name || user.username},

We're excited to inform you that your MoogShip account has been approved! You can now log in to the platform and start using all of our shipping and logistics services.

Thank you for choosing MoogShip for your international shipping needs. We look forward to helping you manage your global logistics operations with ease.

Log in now at: https://app.moogship.com/auth

Need Help?
If you have any questions or need assistance, please don't hesitate to contact our support team at info@moogship.com

TÜRKÇE:
Merhaba ${user.name || user.username},

MoogShip hesabınızın onaylandığını bildirmekten memnuniyet duyarız! Artık platforma giriş yapabilir ve tüm nakliye ve lojistik hizmetlerimizi kullanmaya başlayabilirsiniz.

Uluslararası nakliye ihtiyaçlarınız için MoogShip'i seçtiğiniz için teşekkür ederiz. Küresel lojistik operasyonlarınızı kolaylıkla yönetmenize yardımcı olmaktan mutluluk duyacağız.

Şimdi giriş yapın: https://app.moogship.com/auth

Yardıma mı İhtiyacınız Var?
Herhangi bir sorunuz varsa veya yardıma ihtiyacınız olursa, lütfen destek ekibimizle info@moogship.com adresinden iletişime geçmekten çekinmeyin.

MoogShip Team / MoogShip Ekibi
    `;

    console.log(`Sending approval email to user: ${user.email}`);

    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (!result.success) {
      console.error(
        `Failed to send approval email to ${user.email}:`,
        result.error,
      );
    }

    return result;
  } catch (error) {
    console.error("Error sending user approval email:", error);
    return { success: false, error };
  }
}

/**
 * Sends delivery issue notification email to admin team when there are problems with package delivery
 *
 * @param shipment The shipment with delivery issues
 * @param user The user who owns the shipment
 * @param issueType Type of delivery issue (delay, exception, etc.)
 * @param issueDescription Description of the delivery issue
 * @returns Object indicating success or failure
 */
export async function sendDeliveryIssueNotification(
  shipment: Shipment,
  user: User,
  issueType: string,
  issueDescription: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Admin email addresses for delivery issue notifications
    const adminEmails = [
      "info@moogship.com",
      "gokhan@moogco.com",
      "oguzhan@moogco.com",
      "sercan@moogship.com",
    ];
    
    // Customer email
    const customerEmail = user.email;

    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Format shipment ID with MOG prefix
    const formatShipmentId = (id: number): string =>
      `MOG-${id.toString().padStart(6, "0")}`;

    // Create logo base64
    const logoBase64 = `data:image/png;base64,${getBase64Logo()}`;

    const emailSubject = `🚨 Delivery Issue Alert - ${formatShipmentId(shipment.id)} - ${issueType}`;

    // HTML template for the delivery issue notification email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delivery Issue Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">🚨 Delivery Issue Alert</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Alert Message -->
                    <tr>
                      <td style="padding: 0 0 20px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.5; color: #dc3545; font-weight: bold;">
                          Delivery Issue Detected for Shipment ${formatShipmentId(shipment.id)}
                        </p>
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #666;">
                          Immediate attention may be required for this shipment.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Issue Details Card -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%); border-radius: 8px; border: 1px solid #fecaca;">
                          <tr>
                            <td style="padding: 25px;">
                              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #dc3545; text-align: center;">📋 Issue Details</h3>
                              
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666; width: 40%;">
                                    <strong>Issue Type:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #dc3545; font-weight: bold;">
                                    ${issueType}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Description:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${issueDescription}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Shipment ID:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333; font-weight: bold;">
                                    ${formatShipmentId(shipment.id)}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Customer:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${user.name || user.username} (${user.email})
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Carrier:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${shipment.carrierName || "Unknown"}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Tracking Number:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333; font-family: monospace;">
                                    ${shipment.carrierTrackingNumber || "Not available"}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Destination:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${shipment.receiverCity}, ${shipment.receiverCountry}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Issue Detected:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${new Date().toLocaleString()}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Action Button -->
                    <tr>
                      <td style="padding: 0 0 30px 0; text-align: center;">
                        <a href="https://app.moogship.com/admin-shipment-list" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);">
                          🔧 View in Admin Panel
                        </a>
                      </td>
                    </tr>
                    
                    <!-- Instructions -->
                    <tr>
                      <td style="padding: 0 0 20px 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">📋 Recommended Actions</h3>
                        
                        <ul style="margin: 0 0 0 20px; font-size: 14px; line-height: 1.5; color: #505050;">
                          <li>Contact the customer to inform them of the delivery issue</li>
                          <li>Check with the carrier for more details and resolution options</li>
                          <li>Consider alternative delivery arrangements if needed</li>
                          <li>Update the shipment status in the admin panel</li>
                          <li>Document any actions taken for future reference</li>
                        </ul>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; background-color: #f8f9fa; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #666; line-height: 1.4;">
                    This is an automated delivery issue alert from MoogShip.<br>
                    Please take appropriate action to resolve the delivery issue.
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

    // Create Turkish customer email content
    const customerSubject = `🚨 Gönderi Durumu Hakkında Önemli Bilgi - ${formatShipmentId(shipment.id)}`;
    
    const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gönderi Durumu Bilgi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%); border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">📋 Gönderi Durumu</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Greeting -->
                    <tr>
                      <td style="padding: 0 0 20px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.5; color: #333333;">
                          <strong>Sayın ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #666;">
                          ${formatShipmentId(shipment.id)} numaralı gönderiniz hakkında bilgilendirme
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Status Information -->
                    <tr>
                      <td style="padding: 20px 0;">
                        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 20px;">
                          <p style="margin: 0; color: #856404; font-size: 16px; line-height: 1.6;">
                            <strong>📋 Durum:</strong> ${issueType}<br><br>
                            <strong>📝 Açıklama:</strong> ${issueDescription.includes('days') ? issueDescription.replace('Package has been in transit for', 'Paketiniz').replace('days without delivery', 'gündür transit durumunda ve henüz teslim edilmemiş').replace('Current status:', 'Mevcut durum:') : issueDescription}
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- What This Means -->
                    <tr>
                      <td style="padding: 20px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #dc3545; font-size: 18px;">Önemli Bilgi:</h3>
                        <div style="background-color: #d1ecf1; border: 1px solid #b6d7ff; border-radius: 5px; padding: 15px;">
                          <p style="margin: 0; color: #0c5460; font-size: 14px; line-height: 1.6;">
                            <strong>📋 Bu Ne Anlama Geliyor:</strong><br>
                            Gönderinizde gecikmeler yaşanıyor olabilir. Endişelenmenize gerek yok, bu durum bazen kargo süreçlerinde normal olarak karşılaşılan bir durumdur.
                          </p>
                        </div>
                        
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 15px; margin: 15px 0;">
                          <p style="margin: 0; color: #155724; font-size: 14px; line-height: 1.6;">
                            <strong>💳 Yapılması Gerekenler:</strong><br>
                            • Size kargo takip numarası verilmişse, kargo şirketinin web sitesinden durumu kontrol edin<br>
                            • Herhangi bir sorunuz varsa bizimle iletişime geçin<br>
                            • Paketinizin durumu hakkında size güncellemeler göndereceğiz
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Shipment Details -->
                    <tr>
                      <td style="padding: 20px 0; border-top: 1px solid #eeeeee;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">Gönderi Detayları:</h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">Gönderi No:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${formatShipmentId(shipment.id)}</td>
                          </tr>
                          ${shipment.carrierTrackingNumber ? `
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">Takip No:</td>
                            <td style="font-size: 14px; padding: 5px 0; font-family: monospace;">${shipment.carrierTrackingNumber}</td>
                          </tr>` : ''}
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">Kargo Şirketi:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${shipment.carrierName || "Henüz atanmadı"}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Contact Information -->
                    <tr>
                      <td style="padding: 20px 0; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777;">
                          Herhangi bir sorunuz var ise bize info@moogship.com adresinden ulaşabilirsiniz.
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
                    © 2025 MoogShip Global Shipping Solutions. Tüm hakları saklıdır.
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

    // Send to admin team
    const adminPromises = adminEmails.map((adminEmail) =>
      sendEmail({
        to: adminEmail,
        from: senderEmail,
        subject: emailSubject,
        html: emailHtml,
      }),
    );

    // Send to admin team (always)
    const adminResults = await Promise.all(
      adminEmails.map((adminEmail) =>
        sendEmail({
          to: adminEmail,
          from: senderEmail,
          subject: emailSubject,
          html: emailHtml,
        }),
      ),
    );
    const adminSuccess = adminResults.some(result => result.success);

    // Send to customer (only if preference allows)
    let customerSuccess = true;
    const shouldSendToCustomer = await shouldSendNotification(user.id, 'tracking_delivery', false);
    if (shouldSendToCustomer) {
      const customerResult = await sendEmail({
        to: customerEmail,
        from: senderEmail,
        subject: customerSubject,
        html: customerEmailHtml,
      });
      customerSuccess = customerResult.success;
    } else {
      console.log(`Delivery issue customer email skipped for user ${user.id} (${customerEmail}) - preference disabled`);
    }

    if (adminSuccess && customerSuccess) {
      console.log(
        `Delivery issue notification sent successfully for shipment ${shipment.id}`,
      );
      return { success: true };
    } else if (adminSuccess || customerSuccess) {
      console.warn(`Delivery issue notification partially sent for shipment ${shipment.id}: Admin=${adminSuccess}, Customer=${customerSuccess}`);
      return { success: true, partialFailure: true };
    } else {
      console.error(`Failed to send delivery issue notification for shipment ${shipment.id}`);
      return { success: false, error: "Failed to send to both admin and customer" };
    }
  } catch (error) {
    console.error("Error sending delivery issue notification emails:", error);
    return { success: false, error };
  }
}

/**
 * Sends tracking number notification email to user when tracking number is added
 *
 * @param shipment The shipment that received tracking number
 * @param user The user who owns the shipment
 * @returns Object indicating success or failure
 */
export async function sendTrackingNumberNotification(
  shipment: Shipment,
  user: User,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check user notification preferences
    const shouldSend = await shouldSendNotification(user.id, 'tracking_delivery', false);
    if (!shouldSend) {
      console.log(`Tracking notification skipped for user ${user.id} (${user.email}) - preference disabled`);
      return { success: true };
    }

    // Security validation: Only send emails for legitimate major carriers
    // Prevent emails for internal services but allow MoogShip branded names
    const carrierName = shipment.carrierName?.toLowerCase() || "";
    const allowedCarriers = [
      "ups",
      "usps",
      "dhl",
      "fedex",
      "aramex",
      "gls",
      "afs",
      "afs transport",
      "shipentegra", // Allow shipentegra tracking notifications
      "moogship", // Allow MoogShip branded services
    ];

    // Check if carrier name contains any allowed carrier keywords
    const isAllowedCarrier = allowedCarriers.some(allowed => 
      carrierName.includes(allowed)
    );

    // Check if we have manual tracking or carrier tracking
    const hasManualTracking = shipment.manualTrackingNumber && shipment.manualTrackingNumber.trim().length > 0;
    const hasCarrierTracking = shipment.carrierTrackingNumber && shipment.carrierTrackingNumber.trim().length > 0;

    // If we only have manual tracking, skip carrier validation
    if (hasManualTracking && !hasCarrierTracking) {
      console.log(
        `Using manual tracking for notification email for shipment ${shipment.id}: ${shipment.manualTrackingNumber} (${shipment.manualCarrierName})`,
      );
      // Continue to email generation with manual tracking
    } else if (hasCarrierTracking) {
      // For carrier tracking, validate carrier restrictions
      if (!carrierName || !isAllowedCarrier) {
        console.log(
          `Skipping tracking notification email for shipment ${shipment.id}: Carrier "${shipment.carrierName}" not in allowed list (${allowedCarriers.join(", ")})`,
        );
        return {
          success: false,
          error: "Carrier not allowed for email notifications",
        };
      }
    } else {
      // No tracking at all
      console.log(
        `Skipping tracking notification email for shipment ${shipment.id}: No valid tracking number (neither carrier nor manual)`,
      );
      return { success: false, error: "No valid tracking number provided" };
    }


    // Use custom sender email if specified in environment, defaulting to cs@moogship.com
    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";

    // Get base64 encoded logo for embedding directly in email
    const logoBase64 = getBase64Logo();

    // Format shipment ID with MOG prefix
    const formatShipmentId = (id: number): string =>
      `MOG-${id.toString().padStart(6, "0")}`;

    // Generate tracking URL based on carrier (already validated above)
    const getTrackingUrl = (
      carrierName: string | null,
      trackingNumber: string,
    ): string => {
      if (!carrierName)
        return `https://app.moogship.com/takip?q=${trackingNumber}`;

      const normalizedCarrierName = carrierName.toLowerCase();

      // Direct mapping for validated carriers with smart detection
      const carrierUrls: { [key: string]: string } = {
        ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        dhl: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`,
        fedex: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
        gls: `https://gls-group.eu/GROUP/en/parcel-tracking/`,
        aramex: `https://www.aramex.com/us/en/track/shipments?ShipmentNumber=${trackingNumber}`,
        usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      };

      // Smart detection for MoogShip branded carriers
      for (const [carrier, url] of Object.entries(carrierUrls)) {
        if (normalizedCarrierName.includes(carrier)) {
          return url;
        }
      }

      // Fallback to MoogShip tracking
      return `https://app.moogship.com/takip?q=${trackingNumber}`;
    };

    // Determine tracking information to display
    const trackingNumber = hasManualTracking ? shipment.manualTrackingNumber : shipment.carrierTrackingNumber;
    const displayCarrierName = hasManualTracking ? shipment.manualCarrierName : shipment.carrierName;
    const trackingUrl = hasManualTracking && shipment.manualTrackingLink 
      ? shipment.manualTrackingLink 
      : getTrackingUrl(displayCarrierName, trackingNumber || "");

    const emailSubject = `Tracking Number Added - ${formatShipmentId(shipment.id)} / Takip Numarası Eklendi`;

    // HTML template for the tracking notification email
    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tracking Number Added / Takip Numarası Eklendi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">📦 Tracking Number Added!</h1>
                  <h2 style="color: #ffffff; margin: 10px 0 0 0; font-weight: 400; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">Takip Numarası Eklendi!</h2>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Greeting -->
                    <tr>
                      <td style="padding: 0 0 20px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.5; color: #333333;">
                          <strong>Hello ${user.name || user.username} / Merhaba ${user.name || user.username},</strong>
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Main Message -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong> Great news! A tracking number has been added to your shipment <strong>${formatShipmentId(shipment.id)}</strong>. You can now track your package in real-time!
                        </p>
                        <p style="margin: 0 0 0 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong> Harika haber! <strong>${formatShipmentId(shipment.id)}</strong> numaralı gönderinize takip numarası eklenmiştir. Artık paketinizi gerçek zamanlı takip edebilirsiniz!
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Tracking Details Card -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8f9ff 0%, #e3f2fd 100%); border-radius: 8px; border: 1px solid #e0e7ff;">
                          <tr>
                            <td style="padding: 25px;">
                              <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1565c0; text-align: center;">🚚 Tracking Information / Takip Bilgileri</h3>
                              
                              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Shipment ID / Gönderi ID:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333; font-weight: bold;">
                                    ${formatShipmentId(shipment.id)}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Carrier / Kargo Şirketi:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333; font-weight: bold;">
                                    ${displayCarrierName || "Unknown"}
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Tracking Number / Takip Numarası:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 16px; color: #1565c0; font-weight: bold; font-family: monospace;">
                                    <a href="${trackingUrl}" style="color: #1565c0; text-decoration: none; border-bottom: 1px solid #1565c0;" target="_blank">
                                      ${trackingNumber}
                                    </a>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0; font-size: 14px; color: #666;">
                                    <strong>Destination / Hedef:</strong>
                                  </td>
                                  <td style="padding: 8px 0; font-size: 14px; color: #333;">
                                    ${shipment.receiverCity}, ${shipment.receiverCountry}
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Track Package Button -->
                    <tr>
                      <td style="padding: 0 0 30px 0; text-align: center;">
                        <a href="${trackingUrl}" style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                          🔍 Track Your Package / Paketinizi Takip Edin
                        </a>
                      </td>
                    </tr>
                    
                    <!-- Instructions -->
                    <tr>
                      <td style="padding: 0 0 20px 0; border-top: 1px solid #eeeeee; padding-top: 20px;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">📋 What's Next? / Sırada Ne Var?</h3>
                        
                        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong>
                        </p>
                        <ul style="margin: 0 0 15px 20px; font-size: 14px; line-height: 1.5; color: #505050;">
                          <li>Click the tracking button above or the tracking number directly to monitor your package</li>
                          <li>You'll receive updates as your package moves through transit</li>
                          <li>Save the tracking number for future reference</li>
                        </ul>
                        
                        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong>
                        </p>
                        <ul style="margin: 0 0 0 20px; font-size: 14px; line-height: 1.5; color: #505050;">
                          <li>Paketinizi takip etmek için yukarıdaki takip butonuna veya takip numarasına doğrudan tıklayın</li>
                          <li>Paketiniz transit sürecinde ilerledikçe güncellemeler alacaksınız</li>
                          <li>Gelecekte referans için takip numarasını saklayın</li>
                        </ul>
                      </td>
                    </tr>
                    
                    <!-- Support -->
                    <tr>
                      <td style="padding: 20px 0 0 0; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0 0 5px 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          <strong>ENGLISH:</strong> Need help? Contact our support team at info@moogship.com
                        </p>
                        <p style="margin: 0 0 0 0; font-size: 14px; line-height: 1.5; color: #505050;">
                          <strong>TÜRKÇE:</strong> Yardıma mı ihtiyacınız var? Destek ekibimizle info@moogship.com adresinden iletişime geçin
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

    // Plaintext version
    const emailText = `
Tracking Number Added! / Takip Numarası Eklendi!

Hello ${user.name || user.username} / Merhaba ${user.name || user.username},

ENGLISH: Great news! A tracking number has been added to your shipment ${formatShipmentId(shipment.id)}. You can now track your package in real-time!

TÜRKÇE: Harika haber! ${formatShipmentId(shipment.id)} numaralı gönderinize takip numarası eklenmiştir. Artık paketinizi gerçek zamanlı takip edebilirsiniz!

Tracking Information / Takip Bilgileri:
- Shipment ID / Gönderi ID: ${formatShipmentId(shipment.id)}
- Carrier / Kargo Şirketi: ${shipment.carrierName || "Unknown"}
- Tracking Number / Takip Numarası: ${shipment.carrierTrackingNumber}
- Destination / Hedef: ${shipment.receiverCity}, ${shipment.receiverCountry}

Track your package here / Paketinizi buradan takip edin: ${trackingUrl}

What's Next? / Sırada Ne Var?

ENGLISH:
- Click the tracking link above to monitor your package
- You'll receive updates as your package moves through transit
- Save the tracking number for future reference

TÜRKÇE:
- Paketinizi takip etmek için yukarıdaki takip bağlantısına tıklayın
- Paketiniz transit sürecinde ilerledikçe güncellemeler alacaksınız
- Gelecekte referans için takip numarasını saklayın

Need help? Contact our support team at info@moogship.com
Yardıma mı ihtiyacınız var? Destek ekibimizle info@moogship.com adresinden iletişime geçin

Thank you for choosing MoogShip! / MoogShip'i seçtiğiniz için teşekkür ederiz!
    `;

    console.log(
      `Sending tracking number notification email to user: ${user.email}`,
    );

    // Send the email
    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (!result.success) {
      console.error(
        "Failed to send tracking notification email:",
        result.error,
      );
      return { success: false, error: result.error };
    }

    console.log(
      `Tracking notification email sent successfully to ${user.email}`,
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending tracking number notification:", error);
    return { success: false, error };
  }
}

/**
 * Sends tracking exception notification email to admin team
 * This function sends emails when tracking shows exception conditions like
 * "International shipment release", "Delay", "exception", or "Shipment exception"
 */
export async function sendTrackingExceptionNotification(
  shipment: Shipment,
  user: User,
  issueType: string,
  statusDescription: string,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Admin notification recipients for tracking exceptions
    const adminRecipients = [
      "info@moogship.com",
      "gulsah@moogship.com",
      "gokhan@moogco.com",
      "oguzhan@moogco.com",
      "sercan@moogship.com",
    ];
    
    // Customer email
    const customerEmail = user.email;

    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";
    const logoBase64 = getBase64Logo();

    const emailSubject = `🚨 TRACKING EXCEPTION ALERT: ${issueType} - Shipment #${shipment.id}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tracking Exception Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header with Exception Alert -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #dc3545; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">🚨 TRACKING EXCEPTION ALERT</h1>
                  <h2 style="color: #ffffff; margin: 10px 0 0 0; font-weight: 400; font-size: 18px;">${issueType}</h2>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Alert Introduction -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #505050; font-weight: bold;">
                          ⚠️ IMMEDIATE ACTION REQUIRED
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          A shipment tracking exception has been detected requiring immediate attention from the operations team.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Exception Details -->
                    <tr>
                      <td style="padding: 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Exception Details</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff2cc; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
                          <tr>
                            <td>
                              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #856404; font-weight: bold;">
                                Issue Type: ${issueType}
                              </p>
                              <p style="margin: 10px 0 0 0; font-size: 16px; line-height: 1.5; color: #856404;">
                                Status Description: ${statusDescription}
                              </p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Shipment Information -->
                    <tr>
                      <td style="padding: 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Shipment Information</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Shipment ID:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">#${shipment.id}</td>
                          </tr>
                          ${
                            shipment.trackingNumber
                              ? `
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Tracking Number:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.trackingNumber}</td>
                          </tr>`
                              : ""
                          }
                          ${
                            shipment.carrierTrackingNumber
                              ? `
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Carrier Tracking:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.carrierTrackingNumber}</td>
                          </tr>`
                              : ""
                          }
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Customer:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${user.name} (${user.email})</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Destination:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.receiverCity}, ${shipment.receiverCountry}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Service Level:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.serviceLevel || "Standard"}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 8px 0; font-weight: bold; color: #505050;">Current Status:</td>
                            <td width="60%" style="padding: 8px 0; color: #505050;">${shipment.status}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Action Required -->
                    <tr>
                      <td style="padding: 30px 0 0 0;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">Required Actions</h2>
                        
                        <div style="background-color: #d1ecf1; border-left: 4px solid #17a2b8; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #0c5460; font-weight: bold;">
                            Immediate Steps:
                          </p>
                          <ol style="margin: 0; font-size: 16px; line-height: 1.5; color: #0c5460; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Contact the carrier to investigate the exception</li>
                            <li style="margin-bottom: 8px;">Update the customer about the shipment status</li>
                            <li style="margin-bottom: 8px;">Document any required actions in the admin panel</li>
                            <li style="margin-bottom: 8px;">Monitor tracking for resolution updates</li>
                          </ol>
                        </div>
                        
                        <!-- Admin Panel Link -->
                        <div style="text-align: center; margin-top: 30px;">
                          <a href="https://app.moogship.com/admin-shipments" target="_blank" style="background-color: #dc3545; font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 4px; padding: 12px 25px; display: inline-block; font-weight: bold;">
                            View in Admin Panel
                          </a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f7f7f7; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: center;">
                    This is an automated alert from the MoogShip tracking system.<br>
                    Please do not reply to this email.
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

    // Plaintext version
    const emailText = `
🚨 TRACKING EXCEPTION ALERT: ${issueType}

IMMEDIATE ACTION REQUIRED

A shipment tracking exception has been detected requiring immediate attention from the operations team.

Exception Details:
- Issue Type: ${issueType}
- Status Description: ${statusDescription}

Shipment Information:
- Shipment ID: #${shipment.id}
${shipment.trackingNumber ? `- Tracking Number: ${shipment.trackingNumber}` : ""}
${shipment.carrierTrackingNumber ? `- Carrier Tracking: ${shipment.carrierTrackingNumber}` : ""}
- Customer: ${user.name} (${user.email})
- Destination: ${shipment.receiverCity}, ${shipment.receiverCountry}
- Service Level: ${shipment.serviceLevel || "Standard"}
- Current Status: ${shipment.status}

Required Actions:
1. Contact the carrier to investigate the exception
2. Update the customer about the shipment status
3. Document any required actions in the admin panel
4. Monitor tracking for resolution updates

View in Admin Panel: https://app.moogship.com/admin-shipments

This is an automated alert from the MoogShip tracking system.
Please do not reply to this email.
    `;

    // Create Turkish customer email content  
    const customerSubject = `🚨 Gönderi Durumu Hakkında Bilgi - MOG-${shipment.id.toString().padStart(6, "0")}`;
    
    // Helper function to translate issues to Turkish
    const translateIssueToTurkish = (issueType: string, statusDescription: string): string => {
      const type = issueType.toLowerCase();
      const status = statusDescription.toLowerCase();
      
      if (type.includes('delay') || status.includes('delay')) {
        return 'Gecikmeler yaşanıyor. Bu durum kargo süreçlerinde normal bir durumdur ve paketiniz kısa süre içinde teslim edilecektir.';
      }
      if (type.includes('exception') || status.includes('exception')) {
        return 'Gönderinizde özel durumlar gerektiren işlemler yapılıyor. Kargo şirketi gerekli adımları atıyor.';
      }
      if (type.includes('international') || status.includes('international')) {
        return 'Uluslararası gönderi işlemleri devam ediyor. Gümrük işlemleri tamamlandıktan sonra teslimat başlayacaktır.';
      }
      return 'Gönderinizle ilgili güncel bilgilendirme. Kargo şirketi gerekli işlemleri yapmaktadır.';
    };
    
    const customerEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gönderi Durumu Bilgi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%); border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">📋 Gönderi Durumu Güncellendi</h1>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Greeting -->
                    <tr>
                      <td style="padding: 0 0 20px 0;">
                        <p style="margin: 0 0 10px 0; font-size: 18px; line-height: 1.5; color: #333333;">
                          <strong>Sayın ${user.name || user.username},</strong>
                        </p>
                        <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #666;">
                          MOG-${shipment.id.toString().padStart(6, "0")} numaralı gönderiniz hakkında güncelleme
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Status Information -->
                    <tr>
                      <td style="padding: 20px 0;">
                        <div style="background-color: #e1f7fe; border: 1px solid #4fc3f7; border-radius: 8px; padding: 20px;">
                          <p style="margin: 0; color: #0277bd; font-size: 16px; line-height: 1.6;">
                            <strong>📋 Güncel Durum:</strong><br><br>
                            ${translateIssueToTurkish(issueType, statusDescription)}
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- What This Means -->
                    <tr>
                      <td style="padding: 20px 0;">
                        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px;">
                          <h3 style="margin: 0 0 15px 0; color: #495057; font-size: 18px;">💡 Bu Ne Anlama Geliyor?</h3>
                          <p style="margin: 0; color: #495057; font-size: 14px; line-height: 1.6;">
                            Paketinizin durumu güncellendi. Bu, normal kargo sürecinin bir parçasıdır. Herhangi bir işlem yapmanıza gerek yoktur - size güncellemeler göndermeye devam edeceğiz.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    ${shipment.carrierTrackingNumber ? `
                    <!-- Tracking Information -->
                    <tr>
                      <td style="padding: 20px 0;">
                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; text-align: center;">
                          <h3 style="margin: 0 0 15px 0; color: #155724; font-size: 18px;">🔍 Takip Bilgileri</h3>
                          <p style="margin: 0 0 15px 0; color: #155724; font-size: 14px;">
                            <strong>Takip Numarası:</strong> ${shipment.carrierTrackingNumber}
                          </p>
                          <p style="margin: 0 0 15px 0; color: #155724; font-size: 14px;">
                            <strong>Kargo Şirketi:</strong> ${shipment.carrierName || "Bilinmiyor"}
                          </p>
                          ${shipment.carrierName?.toLowerCase() === 'ups' ? `
                          <a href="https://www.ups.com/track?tracknum=${shipment.carrierTrackingNumber}" 
                             style="display: inline-block; padding: 12px 25px; background-color: #8B4513; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                            UPS'de Takip Et
                          </a>` : ''}
                        </div>
                      </td>
                    </tr>` : ''}
                    
                    <!-- Shipment Details -->
                    <tr>
                      <td style="padding: 20px 0; border-top: 1px solid #eeeeee;">
                        <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333;">📦 Gönderi Detayları:</h3>
                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">MoogShip Müşteri:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${user.name || user.username}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">Alıcı Adı:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${shipment.receiverName}</td>
                          </tr>
                          <tr>
                            <td width="150" style="color: #666; font-size: 14px; padding: 5px 0; font-weight: bold;">Teslimat Adresi:</td>
                            <td style="font-size: 14px; padding: 5px 0;">${shipment.receiverCity}, ${shipment.receiverCountry}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Contact Information -->
                    <tr>
                      <td style="padding: 20px 0; border-top: 1px solid #eeeeee;">
                        <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777;">
                          Herhangi bir sorunuz var ise bize info@moogship.com adresinden ulaşabilirsiniz.
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
                    © 2025 MoogShip Global Shipping Solutions. Tüm hakları saklıdır.
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

    console.log(
      `Sending tracking exception notification to admin team and customer - Issue: ${issueType}, Shipment: #${shipment.id}`,
    );

    // Send to admin team (always)
    const adminResults = await Promise.all(
      adminRecipients.map((recipient) =>
        sendEmail({
          to: recipient,
          from: senderEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
      ),
    );
    const adminSuccess = adminResults.some(result => result.success);

    // Send to customer (only if preference allows)
    let customerSuccess = true;
    const shouldSendToCustomer = await shouldSendNotification(user.id, 'tracking_delivery', false);
    if (shouldSendToCustomer) {
      const customerResult = await sendEmail({
        to: customerEmail,
        from: senderEmail,
        subject: customerSubject,
        html: customerEmailHtml,
      });
      customerSuccess = customerResult.success;
    } else {
      console.log(`Tracking exception customer email skipped for user ${user.id} (${customerEmail}) - preference disabled`);
    }

    if (adminSuccess && customerSuccess) {
      console.log(
        `Tracking exception notification sent successfully for shipment ${shipment.id}`,
      );
      return { success: true };
    } else if (adminSuccess || customerSuccess) {
      console.warn(`Tracking exception notification partially sent for shipment ${shipment.id}: Admin=${adminSuccess}, Customer=${customerSuccess}`);
      return { success: true, partialFailure: true };
    } else {
      console.error(`Failed to send tracking exception notification for shipment ${shipment.id}`);
      return { success: false, error: "Failed to send to both admin and customer" };
    }
  } catch (error) {
    console.error("Error sending tracking exception notification:", error);
    return { success: false, error };
  }
}

/**
 * Sends delivery confirmation email to user when package is delivered
 * This function sends bilingual emails (Turkish first, English second) with delivery summary
 */
export async function sendDeliveryNotification(
  shipment: Shipment,
  user: User,
): Promise<{ success: boolean; error?: any }> {
  try {
    // Check user notification preferences
    const shouldSend = await shouldSendNotification(user.id, 'tracking_delivery', false);
    if (!shouldSend) {
      console.log(`Delivery notification skipped for user ${user.id} (${user.email}) - preference disabled`);
      return { success: true };
    }

    const senderEmail =
      process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";
    const logoBase64 = getBase64Logo();

    // Format shipment ID with leading zeros
    const formatShipmentId = (id: number): string => {
      return id.toString().padStart(4, "0");
    };

    const emailSubject = `📦 Paketiniz Teslim Edildi / Package Delivered - MoogShip #${formatShipmentId(shipment.id)}`;

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Package Delivered / Paket Teslim Edildi</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="600" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header with Success Message -->
              <tr>
                <td align="center" style="padding: 30px 0; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">📦 Paket Teslim Edildi!</h1>
                  <h2 style="color: #ffffff; margin: 10px 0 0 0; font-weight: 400; font-size: 18px;">Package Delivered Successfully!</h2>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <!-- Turkish Content First -->
                    <tr>
                      <td style="padding: 0 0 30px 0;">
                        <h2 style="font-size: 20px; color: #333333; margin: 0 0 20px 0;">🇹🇷 TÜRKÇE</h2>
                        
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Mükemmel haber! <strong>#${formatShipmentId(shipment.id)}</strong> numaralı gönderiniz başarıyla teslim edilmiştir.
                        </p>
                        
                        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #155724; font-weight: bold;">
                            ✅ Teslimat Tamamlandı
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- English Content Second -->
                    <tr>
                      <td style="padding: 0 0 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 20px; color: #333333; margin: 0 0 20px 0;">🇺🇸 ENGLISH</h2>
                        
                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                          Excellent news! Your shipment <strong>#${formatShipmentId(shipment.id)}</strong> has been successfully delivered.
                        </p>
                        
                        <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #155724; font-weight: bold;">
                            ✅ Delivery Completed
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Delivery Summary -->
                    <tr>
                      <td style="padding: 30px 0; border-bottom: 1px solid #eeeeee;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">📋 Teslimat Özeti / Delivery Summary</h2>
                        
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; background-color: #f8f9fa; border-radius: 8px; padding: 20px;">
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Gönderi No / Shipment ID:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057; font-family: monospace; background-color: #e9ecef; padding-left: 10px; border-radius: 4px;">#${formatShipmentId(shipment.id)}</td>
                          </tr>
                          ${
                            shipment.trackingNumber
                              ? `
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Takip No / Tracking Number:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057; font-family: monospace;">${shipment.trackingNumber}</td>
                          </tr>`
                              : ""
                          }
                          ${
                            shipment.carrierTrackingNumber
                              ? `
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Kargo Takip No / Carrier Tracking:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057; font-family: monospace;">${shipment.carrierTrackingNumber}</td>
                          </tr>`
                              : ""
                          }
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Alıcı / Recipient:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057;">${shipment.receiverName}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Teslimat Ülkesi / Delivery Country:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057;">${shipment.receiverCity}, ${shipment.receiverCountry}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Servis Seviyesi / Service Level:</td>
                            <td width="60%" style="padding: 12px 0; color: #495057;">${shipment.serviceLevel || "Standard"}</td>
                          </tr>
                          <tr>
                            <td width="40%" style="padding: 12px 0; font-weight: bold; color: #495057;">Durum / Status:</td>
                            <td width="60%" style="padding: 12px 0; color: #28a745; font-weight: bold;">✅ TESLİM EDİLDİ / DELIVERED</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    
                    <!-- Next Steps -->
                    <tr>
                      <td style="padding: 30px 0 0 0;">
                        <h2 style="font-size: 18px; color: #333333; margin: 0 0 20px 0;">🎯 Sırada Ne Var? / What's Next?</h2>
                        
                        <!-- Turkish -->
                        <div style="background-color: #e1f5fe; border-left: 4px solid #0288d1; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #01579b; font-weight: bold;">
                            🇹🇷 TÜRKÇE:
                          </p>
                          <ul style="margin: 0; font-size: 16px; line-height: 1.5; color: #01579b; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Paketinizi alıcıdan teslim alındığını onaylayın</li>
                            <li style="margin-bottom: 8px;">Herhangi bir sorun varsa derhal bildirin</li>
                            <li style="margin-bottom: 8px;">MoogShip hizmetimizi değerlendirmeyi düşünün</li>
                            <li style="margin-bottom: 8px;">Gelecekteki gönderileriniz için hesabınızı kullanmaya devam edin</li>
                          </ul>
                        </div>
                        
                        <!-- English -->
                        <div style="background-color: #f3e5f5; border-left: 4px solid #7b1fa2; padding: 15px; margin-bottom: 20px;">
                          <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 1.5; color: #4a148c; font-weight: bold;">
                            🇺🇸 ENGLISH:
                          </p>
                          <ul style="margin: 0; font-size: 16px; line-height: 1.5; color: #4a148c; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Confirm receipt of the package with the recipient</li>
                            <li style="margin-bottom: 8px;">Report any issues immediately if they arise</li>
                            <li style="margin-bottom: 8px;">Consider leaving feedback about our MoogShip service</li>
                            <li style="margin-bottom: 8px;">Continue using your account for future shipments</li>
                          </ul>
                        </div>
                        
                        <!-- Dashboard Link -->
                        <div style="text-align: center; margin-top: 30px;">
                          <a href="https://www.moogship.com/shipment-list" target="_blank" style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            📊 Gönderilerim / My Shipments
                          </a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f7f7f7; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: center;">
                    <strong>Teşekkür ederiz! / Thank you for choosing MoogShip!</strong>
                  </p>
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: center;">
                    Yardıma ihtiyacınız var? / Need help? <a href="mailto:info@moogship.com" style="color: #0288d1;">info@moogship.com</a>
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

    // Plaintext version (bilingual)
    const emailText = `
📦 PAKET TESLİM EDİLDİ / PACKAGE DELIVERED - MoogShip #${formatShipmentId(shipment.id)}

🇹🇷 TÜRKÇE:
Mükemmel haber! #${formatShipmentId(shipment.id)} numaralı gönderiniz başarıyla teslim edilmiştir.

✅ Teslimat Tamamlandı

🇺🇸 ENGLISH:
Excellent news! Your shipment #${formatShipmentId(shipment.id)} has been successfully delivered.

✅ Delivery Completed

📋 TESLİMAT ÖZETİ / DELIVERY SUMMARY:
- Gönderi No / Shipment ID: #${formatShipmentId(shipment.id)}
${shipment.trackingNumber ? `- Takip No / Tracking Number: ${shipment.trackingNumber}` : ""}
${shipment.carrierTrackingNumber ? `- Kargo Takip No / Carrier Tracking: ${shipment.carrierTrackingNumber}` : ""}
- Alıcı / Recipient: ${shipment.receiverName}
- Teslimat Ülkesi / Delivery Country: ${shipment.receiverCity}, ${shipment.receiverCountry}
- Servis Seviyesi / Service Level: ${shipment.serviceLevel || "Standard"}
- Durum / Status: ✅ TESLİM EDİLDİ / DELIVERED

🎯 SIRADA NE VAR? / WHAT'S NEXT?

🇹🇷 TÜRKÇE:
- Paketinizi alıcıdan teslim alındığını onaylayın
- Herhangi bir sorun varsa derhal bildirin  
- MoogShip hizmetimizi değerlendirmeyi düşünün
- Gelecekteki gönderileriniz için hesabınızı kullanmaya devam edin

🇺🇸 ENGLISH:
- Confirm receipt of the package with the recipient
- Report any issues immediately if they arise
- Consider leaving feedback about our MoogShip service
- Continue using your account for future shipments

Gönderilerim / My Shipments: https://www.moogship.com/shipment-list

Teşekkür ederiz! / Thank you for choosing MoogShip!
Yardıma ihtiyacınız var? / Need help? info@moogship.com
    `;

    console.log(
      `Sending delivery notification email to user: ${user.email} for shipment #${shipment.id}`,
    );

    // Send the email
    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (!result.success) {
      console.error(
        "Failed to send delivery notification email:",
        result.error,
      );
      return { success: false, error: result.error };
    }

    console.log(
      `Delivery notification email sent successfully to ${user.email} for shipment #${shipment.id}`,
    );
    return { success: true };
  } catch (error) {
    console.error("Error sending delivery notification:", error);
    return { success: false, error };
  }
}

// Helper function to format shipment ID with prefix
function formatShipmentId(id: number): string {
  return `MOOG${id.toString().padStart(7, '0')}`;
}

/**
 * Sends a consolidated tracking email to users with a table of all their tracking updates
 * @param user The user to send the consolidated report to
 * @param trackingUpdates Array of tracking updates for this user
 * @returns Object indicating success or failure
 */
export async function sendConsolidatedUserTrackingReport(
  user: User,
  trackingUpdates: (TrackingUpdateBatch & { shipment: Shipment })[]
): Promise<{ success: boolean; error?: any }> {
  try {
    const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";
    const logoBase64 = getBase64Logo();

    const emailSubject = `📦 Tracking Updates Summary - ${trackingUpdates.length} shipment${trackingUpdates.length > 1 ? 's' : ''}`;

    // Build tracking table rows
    const trackingTableRows = trackingUpdates.map(update => `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          <strong>${formatShipmentId(update.shipmentId)}</strong>
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.carrierTrackingNumber || update.trackingNumber || 'N/A'}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.shipment.receiverName}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.shipment.receiverCity}, ${update.shipment.receiverCountry}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          <span style="background-color: ${update.issueType ? '#fee2e2' : '#f0f9ff'}; color: ${update.issueType ? '#dc2626' : '#0284c7'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${update.status || 'In Transit'}
          </span>
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #666;">
          ${update.statusDescription || '-'}
        </td>
        <td style="padding: 12px 8px; font-size: 12px; color: #888;">
          ${update.createdAt ? new Date(update.createdAt).toLocaleDateString() : '-'}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tracking Updates Summary</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="800" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #1170c9; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">📦 Tracking Updates Summary</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">${trackingUpdates.length} shipment${trackingUpdates.length > 1 ? 's' : ''} with recent updates</p>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                    Hello ${user.name || user.username},
                  </p>
                  <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                    Here's a summary of your recent shipment tracking updates:
                  </p>
                  
                  <!-- Tracking Updates Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #eeeeee; border-radius: 6px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f8f9fa;">
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Shipment ID
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Tracking Number
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Recipient
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Destination
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Status
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Details
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${trackingTableRows}
                    </tbody>
                  </table>
                  
                  <!-- Call to Action -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://www.moogship.com/shipment-list" target="_blank" style="background: linear-gradient(135deg, #1170c9 0%, #0ea5e9 100%); font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      📊 View All Shipments
                    </a>
                  </div>
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

    // Plaintext version
    const emailText = `
Tracking Updates Summary - ${trackingUpdates.length} shipment${trackingUpdates.length > 1 ? 's' : ''}

Hello ${user.name || user.username},

Here's a summary of your recent shipment tracking updates:

${trackingUpdates.map(update => `
Shipment: ${formatShipmentId(update.shipmentId)}
Tracking: ${update.carrierTrackingNumber || update.trackingNumber || 'N/A'}
Recipient: ${update.shipment.receiverName}
Destination: ${update.shipment.receiverCity}, ${update.shipment.receiverCountry}
Status: ${update.status || 'In Transit'}
Details: ${update.statusDescription || '-'}
Updated: ${update.createdAt ? new Date(update.createdAt).toLocaleDateString() : '-'}
---
`).join('')}

View all your shipments: https://www.moogship.com/shipment-list

© 2025 MoogShip Global Shipping Solutions
    `;

    console.log(`Sending consolidated tracking report to user: ${user.email} for ${trackingUpdates.length} updates`);

    const result = await sendEmail({
      to: user.email,
      from: senderEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    });

    if (!result.success) {
      console.error("Failed to send consolidated tracking report:", result.error);
      return { success: false, error: result.error };
    }

    console.log(`Consolidated tracking report sent successfully to ${user.email}`);
    
    // Log the notification for audit trail
    try {
      await storage.logNotification({
        type: "consolidated_tracking_report",
        subject: emailSubject,
        recipient: user.email,
        status: "sent",
        userId: user.id,
        templateUsed: "consolidated_user_tracking_report"
      });
    } catch (logError) {
      console.error("Failed to log consolidated user tracking notification:", logError);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error sending consolidated tracking report:", error);
    return { success: false, error };
  }
}

/**
 * Sends a consolidated tracking email to admin team with a table of all tracking updates
 * @param trackingUpdates Array of all tracking updates to include in admin report
 * @returns Object indicating success or failure
 */
export async function sendConsolidatedAdminTrackingReport(
  trackingUpdates: (TrackingUpdateBatch & { shipment: Shipment; user: User })[]
): Promise<{ success: boolean; error?: any }> {
  try {
    // Admin notification recipients for tracking reports
    const adminRecipients = [
      "info@moogship.com",
      "gulsah@moogship.com",
      "gokhan@moogco.com",
      "oguzhan@moogco.com",
      "sercan@moogship.com",
    ];

    const senderEmail = process.env.SENDGRID_VERIFIED_SENDER || "cs@moogship.com";
    const logoBase64 = getBase64Logo();

    const emailSubject = `🚨 Admin Tracking Report - ${trackingUpdates.length} updates across all shipments`;

    // Build admin tracking table rows with more detailed information
    const trackingTableRows = trackingUpdates.map(update => `
      <tr style="border-bottom: 1px solid #eeeeee;">
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          <strong>${formatShipmentId(update.shipmentId)}</strong>
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.user.name} (${update.user.email})
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.carrierTrackingNumber || update.trackingNumber || 'N/A'}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.shipment.receiverName}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          ${update.shipment.receiverCity}, ${update.shipment.receiverCountry}
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: #333;">
          <span style="background-color: ${update.issueType ? '#fee2e2' : '#f0f9ff'}; color: ${update.issueType ? '#dc2626' : '#0284c7'}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">
            ${update.status || 'In Transit'}
          </span>
        </td>
        <td style="padding: 12px 8px; font-size: 14px; color: ${update.issueType ? '#dc2626' : '#666'};">
          ${update.issueType ? `⚠️ ${update.issueType}: ` : ''}${update.statusDescription || '-'}
        </td>
        <td style="padding: 12px 8px; font-size: 12px; color: #888;">
          ${update.createdAt ? new Date(update.createdAt).toLocaleDateString() : '-'}
        </td>
      </tr>
    `).join('');

    const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Tracking Report</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f9f9f9;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f9f9f9">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table width="900" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.08);">
              <!-- Logo -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
                  <img src="${logoBase64}" style="max-width: 300px; height: auto;" alt="MoogShip Logo">
                </td>
              </tr>
            
              <!-- Header -->
              <tr>
                <td align="center" style="padding: 30px 0; background-color: #dc3545; border-radius: 0;">
                  <h1 style="color: #ffffff; margin: 0; font-weight: 600;">🚨 Admin Tracking Report</h1>
                  <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">${trackingUpdates.length} tracking updates requiring attention</p>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                    <strong>Admin Team,</strong>
                  </p>
                  <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.5; color: #505050;">
                    Here's a consolidated report of all tracking updates that occurred recently across all shipments:
                  </p>
                  
                  <!-- Admin Tracking Updates Table -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #eeeeee; border-radius: 6px; overflow: hidden;">
                    <thead>
                      <tr style="background-color: #f8f9fa;">
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Shipment
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Customer
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Tracking #
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Recipient
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Destination
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Status
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Details
                        </th>
                        <th style="padding: 15px 8px; text-align: left; font-size: 14px; font-weight: 600; color: #374151; border-bottom: 2px solid #eeeeee;">
                          Updated
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      ${trackingTableRows}
                    </tbody>
                  </table>
                  
                  <!-- Admin Actions -->
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="https://app.moogship.com/admin-shipments" target="_blank" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 15px;">
                      🚨 Admin Dashboard
                    </a>
                    <a href="https://app.moogship.com/admin-tracking" target="_blank" style="background: linear-gradient(135deg, #1170c9 0%, #0ea5e9 100%); font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 30px; display: inline-block; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      📊 Tracking Overview
                    </a>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f7f7f7; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #777777; text-align: center;">
                    © 2025 MoogShip Admin System - Internal Use Only
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

    // Plaintext version for admin
    const emailText = `
Admin Tracking Report - ${trackingUpdates.length} updates

Admin Team,

Here's a consolidated report of all tracking updates that occurred recently:

${trackingUpdates.map(update => `
Shipment: ${formatShipmentId(update.shipmentId)}
Customer: ${update.user.name} (${update.user.email})
Tracking: ${update.carrierTrackingNumber || update.trackingNumber || 'N/A'}
Recipient: ${update.shipment.receiverName}
Destination: ${update.shipment.receiverCity}, ${update.shipment.receiverCountry}
Status: ${update.status || 'In Transit'}
Details: ${update.issueType ? `⚠️ ${update.issueType}: ` : ''}${update.statusDescription || '-'}
Updated: ${update.createdAt ? new Date(update.createdAt).toLocaleDateString() : '-'}
---
`).join('')}

Admin Dashboard: https://app.moogship.com/admin-shipments
Tracking Overview: https://app.moogship.com/admin-tracking

© 2025 MoogShip Admin System
    `;

    console.log(`Sending consolidated admin tracking report for ${trackingUpdates.length} updates`);

    // Send to all admin recipients
    const results = await Promise.all(
      adminRecipients.map((recipient) =>
        sendEmail({
          to: recipient,
          from: senderEmail,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        }),
      ),
    );

    // Check if any email was sent successfully
    const anySuccess = results.some((result) => result.success);

    console.log(
      `Admin tracking report results:`,
      results
        .map(
          (r, i) =>
            `${adminRecipients[i]}: ${r.success ? "Success" : "Failed"}`,
        )
        .join(", "),
    );

    // Log notifications for all admin recipients for audit trail
    try {
      for (let i = 0; i < adminRecipients.length; i++) {
        const recipient = adminRecipients[i];
        const result = results[i];
        
        await storage.logNotification({
          type: "consolidated_admin_tracking_report", 
          subject: emailSubject,
          recipient: recipient,
          status: result.success ? "sent" : "failed",
          error: result.success ? undefined : result.error,
          templateUsed: "consolidated_admin_tracking_report"
        });
      }
    } catch (logError) {
      console.error("Failed to log consolidated admin tracking notifications:", logError);
    }

    return { success: anySuccess };
  } catch (error) {
    console.error("Error sending consolidated admin tracking report:", error);
    return { success: false, error };
  }
}
