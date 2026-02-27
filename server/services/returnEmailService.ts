import { MailService } from '@sendgrid/mail';
import type { Return, User } from '@shared/schema';
import { shouldSendNotification, isGlobalEmailEnabled } from '../notification-emails';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = 'cs@moogship.com'; // Verified SendGrid sender email

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email templates in Turkish
const getStatusUpdateTemplate = (returnData: Return, newStatus: string, adminNotes?: string): EmailTemplate => {
  const statusNames = {
    PENDING: 'Beklemede',
    RECEIVED: 'Alındı',
    COMPLETED: 'Tamamlandı'
  };

  const statusName = statusNames[newStatus as keyof typeof statusNames] || newStatus;

  const subject = `İade Durumu Güncellendi - ${returnData.trackingNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 4px; font-weight: bold; margin: 10px 0; }
        .status-received { background: #fbbf24; color: #92400e; }
        .status-completed { background: #10b981; color: #065f46; }
        .status-pending { background: #f59e0b; color: #92400e; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MoogShip - İade Bildirimi</h1>
        </div>
        <div class="content">
          <h2>İade durumunuz güncellendi</h2>
          <p>Merhaba,</p>
          <p>İade talebinizin durumu güncellenmiştir:</p>
          
          <div class="details">
            <p><strong>Takip Numarası:</strong> ${returnData.trackingNumber}</p>
            <p><strong>Gönderen:</strong> ${returnData.senderName}</p>
            <p><strong>Taşıyıcı:</strong> ${returnData.trackingCarrier}</p>
            ${returnData.orderNumber ? `<p><strong>Sipariş Numarası:</strong> ${returnData.orderNumber}</p>` : ''}
            ${returnData.productName ? `<p><strong>Ürün Adı:</strong> ${returnData.productName}</p>` : ''}
          </div>
          
          <p><strong>Yeni Durum:</strong></p>
          <span class="status-badge status-${newStatus.toLowerCase()}">${statusName}</span>
          
          ${adminNotes ? `
            <div class="details">
              <h3>Admin Notları:</h3>
              <p>${adminNotes}</p>
            </div>
          ` : ''}
          
          <p>İade sürecinizle ilgili herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.</p>
        </div>
        <div class="footer">
          <p>Bu e-posta MoogShip İade Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MoogShip - İade Bildirimi

İade durumunuz güncellendi

Takip Numarası: ${returnData.trackingNumber}
Gönderen: ${returnData.senderName}
Taşıyıcı: ${returnData.trackingCarrier}
${returnData.orderNumber ? `Sipariş Numarası: ${returnData.orderNumber}\n` : ''}${returnData.productName ? `Ürün Adı: ${returnData.productName}\n` : ''}

Yeni Durum: ${statusName}

${adminNotes ? `Admin Notları: ${adminNotes}\n` : ''}

İade sürecinizle ilgili herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.

Bu e-posta MoogShip İade Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.
  `;

  return { subject, html, text };
};

const getPhotoUploadTemplate = (returnData: Return, photoCount: number): EmailTemplate => {
  const subject = `Yeni Fotoğraf Eklendi - ${returnData.trackingNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .details { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>MoogShip - İade Bildirimi</h1>
        </div>
        <div class="content">
          <h2>İadenize yeni fotoğraf eklendi</h2>
          <p>Merhaba,</p>
          <p>İade talebinize ${photoCount} adet yeni fotoğraf eklenmiştir:</p>
          
          <div class="details">
            <p><strong>Takip Numarası:</strong> ${returnData.trackingNumber}</p>
            <p><strong>Gönderen:</strong> ${returnData.senderName}</p>
            <p><strong>Taşıyıcı:</strong> ${returnData.trackingCarrier}</p>
            ${returnData.orderNumber ? `<p><strong>Sipariş Numarası:</strong> ${returnData.orderNumber}</p>` : ''}
            ${returnData.productName ? `<p><strong>Ürün Adı:</strong> ${returnData.productName}</p>` : ''}
          </div>
          
          <p>Fotoğrafları görüntülemek için hesabınıza giriş yapabilirsiniz.</p>
        </div>
        <div class="footer">
          <p>Bu e-posta MoogShip İade Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
MoogShip - İade Bildirimi

İadenize yeni fotoğraf eklendi

Takip Numarası: ${returnData.trackingNumber}
Gönderen: ${returnData.senderName}
Taşıyıcı: ${returnData.trackingCarrier}
${returnData.orderNumber ? `Sipariş Numarası: ${returnData.orderNumber}\n` : ''}${returnData.productName ? `Ürün Adı: ${returnData.productName}\n` : ''}

İade talebinize ${photoCount} adet yeni fotoğraf eklenmiştir.

Fotoğrafları görüntülemek için hesabınıza giriş yapabilirsiniz.

Bu e-posta MoogShip İade Yönetim Sistemi tarafından otomatik olarak gönderilmiştir.
  `;

  return { subject, html, text };
};

export const sendStatusUpdateEmail = async (
  returnData: Return,
  sellerEmail: string,
  newStatus: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    // Global toggle check + seller notification preferences
    if (!await isGlobalEmailEnabled("return_status")) {
      console.log(`[GLOBAL TOGGLE] return_status disabled - skipping`);
      return { success: true };
    }
    const shouldSend = await shouldSendNotification(returnData.sellerId, 'refund_return', false);
    if (!shouldSend) {
      console.log(`Return status email skipped for seller ${returnData.sellerId} - preference disabled`);
      return { success: true };
    }

    const template = getStatusUpdateTemplate(returnData, newStatus, adminNotes);

    await mailService.send({
      to: sellerEmail,
      from: FROM_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Status update email sent to ${sellerEmail} for return ${returnData.id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send status update email:', error);
    return { success: false, error };
  }
};

export const sendPhotoUploadEmail = async (
  returnData: Return,
  sellerEmail: string,
  photoCount: number
): Promise<{ success: boolean; error?: any }> => {
  try {
    // Global toggle check + seller notification preferences
    if (!await isGlobalEmailEnabled("return_status")) {
      console.log(`[GLOBAL TOGGLE] return_status disabled - skipping`);
      return { success: true };
    }
    const shouldSend = await shouldSendNotification(returnData.sellerId, 'refund_return', false);
    if (!shouldSend) {
      console.log(`Return photo email skipped for seller ${returnData.sellerId} - preference disabled`);
      return { success: true };
    }

    const template = getPhotoUploadTemplate(returnData, photoCount);

    await mailService.send({
      to: sellerEmail,
      from: FROM_EMAIL,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Photo upload email sent to ${sellerEmail} for return ${returnData.id}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to send photo upload email:', error);
    return { success: false, error };
  }
};