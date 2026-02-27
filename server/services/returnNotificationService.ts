import { MailService } from '@sendgrid/mail';
import type { Return, User } from '@shared/schema';
import { shouldSendNotification, isGlobalEmailEnabled } from '../notification-emails';

if (!process.env.SENDGRID_API_KEY) {
  console.error("SENDGRID_API_KEY environment variable is required");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SendGrid API key not configured, skipping email notification');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

const FROM_EMAIL = 'noreply@yourdomain.com'; // Replace with your verified sender

export class ReturnNotificationService {
  
  async sendNewReturnNotification(returnData: Return): Promise<void> {
    const subject = `Yeni İade Kaydı - Sipariş #${returnData.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Yeni İade Kaydı Oluşturuldu</h2>
        <p>Merhaba,</p>
        <p>Sipariş numarası <strong>#${returnData.orderNumber}</strong> için yeni bir iade kaydı oluşturulmuştur.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">İade Detayları:</h3>
          <p><strong>Ürün:</strong> ${returnData.productName}</p>
          <p><strong>Müşteri:</strong> ${returnData.customerName}</p>
          <p><strong>İade Sebebi:</strong> ${returnData.returnReason}</p>
          <p><strong>Durum:</strong> ${this.getStatusText(returnData.status)}</p>
          <p><strong>Tarih:</strong> ${new Date(returnData.returnDate || '').toLocaleDateString('tr-TR')}</p>
        </div>
        
        <p>İade süreci hakkında güncellemeler e-posta ile bildirilecektir.</p>
        <p>Saygılarımızla,<br>Depo Ekibi</p>
      </div>
    `;

    const text = `
    Yeni İade Kaydı Oluşturuldu
    
    Sipariş numarası #${returnData.orderNumber} için yeni bir iade kaydı oluşturulmuştur.
    
    İade Detayları:
    - Ürün: ${returnData.productName}
    - Müşteri: ${returnData.customerName}
    - İade Sebebi: ${returnData.returnReason}
    - Durum: ${this.getStatusText(returnData.status)}
    - Tarih: ${new Date(returnData.returnDate || '').toLocaleDateString('tr-TR')}
    
    İade süreci hakkında güncellemeler e-posta ile bildirilecektir.
    
    Saygılarımızla,
    Depo Ekibi
    `;

    if (returnData.customerEmail) {
      // Global toggle + seller notification preferences
      if (!await isGlobalEmailEnabled("return_status")) {
        console.log(`[GLOBAL TOGGLE] return_status disabled - skipping`);
        return;
      }
      const shouldSend = await shouldSendNotification(returnData.sellerId, 'refund_return', false);
      if (!shouldSend) {
        console.log(`Return notification skipped for seller ${returnData.sellerId} - preference disabled`);
        return;
      }
      await sendEmail({
        to: returnData.customerEmail,
        from: FROM_EMAIL,
        subject,
        html,
        text
      });
    }
  }

  async sendStatusUpdateNotification(returnData: Return, previousStatus: string): Promise<void> {
    const subject = `İade Durumu Güncellendi - Sipariş #${returnData.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">İade Durumu Güncellendi</h2>
        <p>Merhaba ${returnData.customerName},</p>
        <p>Sipariş numarası <strong>#${returnData.orderNumber}</strong> için iade durumunuz güncellenmiştir.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Durum Değişikliği:</h3>
          <p><strong>Önceki Durum:</strong> ${this.getStatusText(previousStatus)}</p>
          <p><strong>Yeni Durum:</strong> ${this.getStatusText(returnData.status)}</p>
          <p><strong>Güncelleme Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
          ${returnData.notes ? `<p><strong>Notlar:</strong> ${returnData.notes}</p>` : ''}
        </div>
        
        ${this.getStatusMessage(returnData.status)}
        
        <p>Herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.</p>
        <p>Saygılarımızla,<br>Depo Ekibi</p>
      </div>
    `;

    const text = `
    İade Durumu Güncellendi
    
    Merhaba ${returnData.customerName},
    
    Sipariş numarası #${returnData.orderNumber} için iade durumunuz güncellenmiştir.
    
    Durum Değişikliği:
    - Önceki Durum: ${this.getStatusText(previousStatus)}
    - Yeni Durum: ${this.getStatusText(returnData.status)}
    - Güncelleme Tarihi: ${new Date().toLocaleDateString('tr-TR')}
    ${returnData.notes ? `- Notlar: ${returnData.notes}` : ''}
    
    ${this.getStatusMessage(returnData.status, false)}
    
    Herhangi bir sorunuz varsa lütfen bizimle iletişime geçin.
    
    Saygılarımızla,
    Depo Ekibi
    `;

    if (returnData.customerEmail) {
      // Global toggle + seller notification preferences
      if (!await isGlobalEmailEnabled("return_status")) {
        console.log(`[GLOBAL TOGGLE] return_status disabled - skipping`);
        return;
      }
      const shouldSend = await shouldSendNotification(returnData.sellerId, 'refund_return', false);
      if (!shouldSend) {
        console.log(`Return status update notification skipped for seller ${returnData.sellerId} - preference disabled`);
        return;
      }
      await sendEmail({
        to: returnData.customerEmail,
        from: FROM_EMAIL,
        subject,
        html,
        text
      });
    }
  }

  async sendAssignmentNotification(returnData: Return, assignedUser: User, assignedBy: User): Promise<void> {
    const subject = `İade Ataması - Sipariş #${returnData.orderNumber}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Yeni İade Ataması</h2>
        <p>Merhaba ${assignedUser.name},</p>
        <p>Size yeni bir iade kaydı atanmıştır.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">İade Detayları:</h3>
          <p><strong>Sipariş No:</strong> ${returnData.orderNumber}</p>
          <p><strong>Ürün:</strong> ${returnData.productName}</p>
          <p><strong>Müşteri:</strong> ${returnData.customerName}</p>
          <p><strong>İade Sebebi:</strong> ${returnData.returnReason}</p>
          <p><strong>Durum:</strong> ${this.getStatusText(returnData.status)}</p>
          <p><strong>Atayan:</strong> ${assignedBy.name}</p>
          <p><strong>Atama Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
        </div>
        
        <p>Lütfen bu iade kaydını inceleyip gerekli işlemleri başlatın.</p>
        <p>Saygılarımızla,<br>Yönetim Ekibi</p>
      </div>
    `;

    const text = `
    Yeni İade Ataması
    
    Merhaba ${assignedUser.name},
    
    Size yeni bir iade kaydı atanmıştır.
    
    İade Detayları:
    - Sipariş No: ${returnData.orderNumber}
    - Ürün: ${returnData.productName}
    - Müşteri: ${returnData.customerName}
    - İade Sebebi: ${returnData.returnReason}
    - Durum: ${this.getStatusText(returnData.status)}
    - Atayan: ${assignedBy.name}
    - Atama Tarihi: ${new Date().toLocaleDateString('tr-TR')}
    
    Lütfen bu iade kaydını inceleyip gerekli işlemleri başlatın.
    
    Saygılarımızla,
    Yönetim Ekibi
    `;

    if (assignedUser.email) {
      await sendEmail({
        to: assignedUser.email,
        from: FROM_EMAIL,
        subject,
        html,
        text
      });
    }
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'received': 'Alındı',
      'inspected': 'İncelendi',
      'refund_initiated': 'İade Başlatıldı',
      'completed': 'Tamamlandı'
    };
    return statusMap[status] || status;
  }

  private getStatusMessage(status: string, isHtml: boolean = true): string {
    const messages: Record<string, string> = {
      'received': 'İadeniz depomuza ulaştı ve kayıt altına alındı. En kısa sürede inceleme sürecine başlanacaktır.',
      'inspected': 'İadeniz incelendi. Ürün durumu değerlendirildi ve iade süreci devam ediyor.',
      'refund_initiated': 'İade işleminiz onaylandı ve geri ödeme süreci başlatıldı. Geri ödeme 3-5 iş günü içinde hesabınıza yansıyacaktır.',
      'completed': 'İade işleminiz başarıyla tamamlandı. Geri ödeme hesabınıza yansımıştır.'
    };

    const message = messages[status] || '';
    return isHtml ? `<p style="background-color: #e8f5e8; padding: 10px; border-radius: 5px; color: #2d5a2d;">${message}</p>` : message;
  }
}

export const returnNotificationService = new ReturnNotificationService();