import { MailService } from '@sendgrid/mail';
import type { User } from '@shared/schema';
import { isGlobalEmailEnabled, getAdminRecipients } from '../notification-emails.js';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'cs@moogship.com'; // Verified SendGrid sender email

interface BulkShipmentEmailData {
  user: User;
  shipmentCount: number;
  shipmentIds: number[];
  totalValue: number;
}

const getBulkShipmentNotificationTemplate = (data: BulkShipmentEmailData) => {
  const { user, shipmentCount, shipmentIds, totalValue } = data;
  
  const subject = `Toplu Gönderi Oluşturuldu - Onay Bekliyor | Bulk Shipments Created - Awaiting Approval`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; background: #f9f9f9; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #2563eb; }
        .shipment-summary { background: #eff6ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
        .stat-box { background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
        .stat-label { font-size: 14px; color: #64748b; margin-top: 5px; }
        .action-button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .divider { height: 2px; background: linear-gradient(to right, #2563eb, #1d4ed8); margin: 30px 0; border-radius: 1px; }
        .flag { font-size: 20px; margin-right: 8px; }
        .language-section { margin-bottom: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">📦 MoogShip</div>
          <div>Global Shipping Solutions</div>
        </div>
        
        <div class="content">
          <!-- Turkish Section First -->
          <div class="language-section">
            <div class="section">
              <div class="section-title">
                <span class="flag">🇹🇷</span>Toplu Gönderi Başarıyla Oluşturuldu
              </div>
              
              <p>Sayın ${user.name},</p>
              
              <p>Toplu gönderi yüklemeniz başarıyla işlendi! <strong>${shipmentCount} gönderi</strong> etiketleriyle birlikte oluşturuldu ve şimdi yönetici onayını bekliyor.</p>
              
              <div class="shipment-summary">
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-number">${shipmentCount}</div>
                    <div class="stat-label">Oluşturulan Gönderi</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">$${(totalValue / 100).toFixed(2)}</div>
                    <div class="stat-label">Toplam Değer</div>
                  </div>
                </div>
              </div>
              
              <p><strong>Sıradaki adımlar:</strong></p>
              <ul>
                <li>Ekibimiz gönderilerinizi 24 saat içinde inceleyecek</li>
                <li>Onaylandıktan sonra kargo etiketleri otomatik olarak oluşturulacak</li>
                <li>Onaylandığında başka bir e-posta onayı alacaksınız</li>
                <li>Tüm gönderileri kontrol panelinizden takip edebilirsiniz</li>
              </ul>
              
              <p><strong>Gönderi Numaraları:</strong> ${shipmentIds.join(', ')}</p>
              
              <div style="text-align: center;">
                <a href="https://app.moogship.com/shipments" class="action-button">
                  Gönderilerimi Görüntüle
                </a>
              </div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <!-- English Section -->
          <div class="language-section">
            <div class="section">
              <div class="section-title">
                <span class="flag">🇺🇸</span>Bulk Shipments Created Successfully
              </div>
              
              <p>Dear ${user.name},</p>
              
              <p>Your bulk shipment upload has been processed successfully! We've created <strong>${shipmentCount} shipments</strong> with labels and they are now waiting for admin approval.</p>
              
              <div class="shipment-summary">
                <div class="stats">
                  <div class="stat-box">
                    <div class="stat-number">${shipmentCount}</div>
                    <div class="stat-label">Shipments Created</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-number">$${(totalValue / 100).toFixed(2)}</div>
                    <div class="stat-label">Total Value</div>
                  </div>
                </div>
              </div>
              
              <p><strong>What happens next:</strong></p>
              <ul>
                <li>Our team will review your shipments within 24 hours</li>
                <li>Once approved, shipping labels will be generated automatically</li>
                <li>You'll receive another email confirmation when approved</li>
                <li>You can track all shipments in your dashboard</li>
              </ul>
              
              <p><strong>Shipment IDs:</strong> ${shipmentIds.join(', ')}</p>
              
              <div style="text-align: center;">
                <a href="https://app.moogship.com/shipments" class="action-button">
                  View My Shipments
                </a>
              </div>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>MoogShip - Global Shipping Solutions</p>
          <p>📧 cs@moogship.com | 🌐 www.moogship.com</p>
          <p>Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-postayı yanıtlamayın.</p>
          <p>This email was sent automatically. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MoogShip - Toplu Gönderi Oluşturuldu | Bulk Shipments Created

TÜRKÇE:
Sayın ${user.name},

Toplu gönderi yüklemeniz başarıyla işlendi! ${shipmentCount} gönderi etiketleriyle birlikte oluşturuldu ve şimdi yönetici onayını bekliyor.

Özet:
- Oluşturulan Gönderi: ${shipmentCount}
- Toplam Değer: $${(totalValue / 100).toFixed(2)}
- Gönderi Numaraları: ${shipmentIds.join(', ')}

Sıradaki adımlar:
- Ekibimiz gönderilerinizi 24 saat içinde inceleyecek
- Onaylandıktan sonra kargo etiketleri otomatik olarak oluşturulacak
- Onaylandığında başka bir e-posta onayı alacaksınız
- Tüm gönderileri kontrol panelinizden takip edebilirsiniz

Gönderilerinizi görüntüleyin: https://app.moogship.com/shipments

---

ENGLISH:
Dear ${user.name},

Your bulk shipment upload has been processed successfully! We've created ${shipmentCount} shipments with labels and they are now waiting for admin approval.

Summary:
- Shipments Created: ${shipmentCount}
- Total Value: $${(totalValue / 100).toFixed(2)}
- Shipment IDs: ${shipmentIds.join(', ')}

What happens next:
- Our team will review your shipments within 24 hours
- Once approved, shipping labels will be generated automatically
- You'll receive another email confirmation when approved
- You can track all shipments in your dashboard

View your shipments: https://app.moogship.com/shipments

---
MoogShip - Global Shipping Solutions
cs@moogship.com | www.moogship.com
  `;

  return { subject, html, text };
};

// Admin notification template for bulk shipment approval requests
const getAdminBulkApprovalTemplate = (data: BulkShipmentEmailData) => {
  const { user, shipmentCount, shipmentIds, totalValue } = data;
  
  const subject = `Toplu Gönderi Onay Talebi - ${shipmentCount} Gönderi | Bulk Shipment Approval Request - ${shipmentCount} Shipments`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 30px; background: #f9f9f9; }
        .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
        .section-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #dc2626; }
        .user-info { background: #fef2f2; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin: 15px 0; }
        .stat-box { background: #f8fafc; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0; }
        .stat-number { font-size: 20px; font-weight: bold; color: #dc2626; }
        .stat-label { font-size: 12px; color: #64748b; margin-top: 5px; }
        .action-button { background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; font-weight: bold; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; }
        .urgent { background: #fee2e2; border: 1px solid #fecaca; padding: 10px; border-radius: 6px; margin: 15px 0; }
        .shipment-ids { background: #f1f5f9; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🔔 MoogShip Admin</div>
          <div>Bulk Shipment Approval Required</div>
        </div>
        
        <div class="content">
          <div class="urgent">
            <strong>⚠️ ACTION REQUIRED:</strong> New bulk shipments awaiting admin approval
          </div>
          
          <div class="section">
            <div class="section-title">Customer Information</div>
            
            <div class="user-info">
              <p><strong>Customer:</strong> ${user.name}</p>
              <p><strong>Email:</strong> ${user.email}</p>
              <p><strong>Company:</strong> ${user.companyName || 'Not specified'}</p>
              <p><strong>User ID:</strong> ${user.id}</p>
            </div>
            
            <div class="stats">
              <div class="stat-box">
                <div class="stat-number">${shipmentCount}</div>
                <div class="stat-label">Shipments</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">$${(totalValue / 100).toFixed(2)}</div>
                <div class="stat-label">Total Value</div>
              </div>
              <div class="stat-box">
                <div class="stat-number">$${((totalValue * 0.15) / 100).toFixed(2)}</div>
                <div class="stat-label">Est. Revenue</div>
              </div>
            </div>
            
            <p><strong>Shipment IDs to Review:</strong></p>
            <div class="shipment-ids">${shipmentIds.join(', ')}</div>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://app.moogship.com/admin" class="action-button">
                Review & Approve Shipments
              </a>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Next Steps</div>
            <ul>
              <li>Review each shipment for accuracy and compliance</li>
              <li>Verify customer information and addresses</li>
              <li>Check pricing and service selections</li>
              <li>Approve or reject shipments with appropriate notes</li>
              <li>Customer will be notified automatically after approval</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>MoogShip Admin Panel</p>
          <p>📧 cs@moogship.com | 🌐 www.moogship.com</p>
          <p>This is an automated admin notification.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MoogShip Admin - Bulk Shipment Approval Required

URGENT: ${shipmentCount} new bulk shipments awaiting approval

Customer Details:
- Name: ${user.name}
- Email: ${user.email}
- Company: ${user.companyName || 'Not specified'}
- User ID: ${user.id}

Shipment Summary:
- Count: ${shipmentCount} shipments
- Total Value: $${(totalValue / 100).toFixed(2)}
- Estimated Revenue: $${((totalValue * 0.15) / 100).toFixed(2)}

Shipment IDs: ${shipmentIds.join(', ')}

Action Required:
Please review and approve/reject these shipments in the admin panel.

Admin Panel: https://app.moogship.com/admin

---
MoogShip Admin System
cs@moogship.com | www.moogship.com
  `;

  return { subject, html, text };
};

export const sendBulkShipmentNotification = async (data: BulkShipmentEmailData): Promise<boolean> => {
  try {
    // Global toggle check
    if (!await isGlobalEmailEnabled("bulk_shipment_notification")) {
      console.log(`[GLOBAL TOGGLE] bulk_shipment_notification disabled - skipping`);
      return true;
    }

    const template = getBulkShipmentNotificationTemplate(data);

    await mailService.send({
      to: data.user.email,
      from: FROM_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    
    console.log(`📧 Bulk shipment notification sent to ${data.user.email} for ${data.shipmentCount} shipments`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send bulk shipment notification:', error);
    return false;
  }
};

export const sendAdminBulkApprovalNotification = async (data: BulkShipmentEmailData): Promise<boolean> => {
  try {
    const template = getAdminBulkApprovalTemplate(data);
    
    // Get admin email addresses from database
    const adminEmails = await getAdminRecipients("bulk_shipment_admin");
    
    console.log(`📧 Attempting to send admin notifications to: ${adminEmails.join(', ')}`);
    console.log(`📧 From: ${FROM_EMAIL}`);
    console.log(`📧 Subject: ${template.subject}`);
    
    const emailPromises = adminEmails.map(async (adminEmail) => {
      try {
        const result = await mailService.send({
          to: adminEmail,
          from: FROM_EMAIL,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        console.log(`✅ Successfully sent admin notification to ${adminEmail}`);
        return { email: adminEmail, success: true, result };
      } catch (emailError) {
        console.error(`❌ Failed to send admin notification to ${adminEmail}:`, emailError);
        return { email: adminEmail, success: false, error: emailError };
      }
    });
    
    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    console.log(`📧 Admin notification results: ${successCount}/${adminEmails.length} successful`);
    
    if (successCount > 0) {
      console.log(`📧 Admin bulk approval notification sent to ${successCount} admins for ${data.shipmentCount} shipments from ${data.user.email}`);
      return true;
    } else {
      console.error('❌ Failed to send admin notifications to any recipients');
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to send admin bulk approval notification:', error);
    return false;
  }
};