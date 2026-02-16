import { MailService } from '@sendgrid/mail';
import { User, Shipment, RefundRequest } from '@shared/schema';
import { shouldSendNotification } from './notification-emails';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

const ADMIN_EMAILS = [
  'info@moogship.com',
  'sercan@moogship.com',
  'gokhan@moogco.com',
  'oguzhan@moogco.com'
];

export async function sendRefundStatusUpdateNotification(
  user: User,
  refundRequest: RefundRequest,
  shipments: Shipment[],
  newStatus: 'approved' | 'rejected',
  adminNotes?: string
): Promise<boolean> {
  try {
    // Check user notification preferences
    const shouldSend = await shouldSendNotification(user.id, 'refund_return', false);
    if (!shouldSend) {
      console.log(`Refund status notification skipped for user ${user.id} (${user.email}) - preference disabled`);
      return true;
    }

    const isApproved = newStatus === 'approved';
    const totalAmount = shipments.reduce((sum, s) => sum + (s.totalPrice || 0), 0);
    

    // Create a single bilingual email with both English and Turkish content
    const bilingualSubject = isApproved 
      ? `Refund Request #${refundRequest.id} Approved / İade Talebi #${refundRequest.id} Onaylandı - Moogship`
      : `Refund Request #${refundRequest.id} Rejected / İade Talebi #${refundRequest.id} Reddedildi - Moogship`;
    
    const bilingualHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 8px;">
          <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0; letter-spacing: 1px;">MOOGSHIP</h1>
          <p style="color: #e0f2fe; margin: 5px 0 0 0; font-size: 14px;">Global Shipping Solutions</p>
        </div>
        
        <!-- Turkish Content -->
        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; margin-top: 0;">
            🇹🇷 İade Talebi ${isApproved ? 'Onaylandı' : 'Reddedildi'}
          </h2>
          
          <p>Sayın ${user.name},</p>
          
          <p>#${refundRequest.id} numaralı iade talebiniz <strong>${isApproved ? 'onaylanmıştır' : 'reddedilmiştir'}</strong>.</p>
          
          <div style="background-color: ${isApproved ? '#ecfdf5' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'};">
            <h3 style="margin-top: 0; color: #374151;">Talep Detayları</h3>
            <p><strong>Talep ID:</strong> #${refundRequest.id}</p>
            <p><strong>Sebep:</strong> ${refundRequest.reason}</p>
            <p><strong>Toplam Tutar:</strong> $${(totalAmount / 100).toFixed(2)}</p>
            <p><strong>Gönderi Sayısı:</strong> ${shipments.length}</p>
            ${adminNotes ? `<p><strong>Yönetici Notları:</strong> ${adminNotes}</p>` : ''}
          </div>
          
          ${isApproved ? `
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Sırada Ne Var?</h3>
              <p><strong>$${((refundRequest.processedAmount || totalAmount) / 100).toFixed(2)}</strong> tutarındaki iadeniz hesap bakiyenize anında eklenmiştir.</p>
              <p>Bu bakiyeyi gelecekteki gönderileriniz için kullanabilir veya orijinal ödeme yönteminize çekim talep edebilirsiniz.</p>
              <p>Güncellenmiş bakiyenizi Moogship kontrol panelinizden görüntüleyebilirsiniz.</p>
            </div>
          ` : `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Talebim neden reddedildi?</h3>
              ${adminNotes ? `<p>${adminNotes}</p>` : '<p>Bu karar hakkında daha fazla bilgi için lütfen destek ekibimizle iletişime geçin.</p>'}
              <p>Sorularınız için <a href="mailto:cs@moogship.com">cs@moogship.com</a> adresinden bize ulaşabilirsiniz.</p>
            </div>
          `}
        </div>
        
        <!-- English Content -->
        <div style="border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h2 style="color: ${isApproved ? '#059669' : '#dc2626'}; margin-top: 0;">
            🇺🇸 Refund Request ${isApproved ? 'Approved' : 'Rejected'}
          </h2>
          
          <p>Dear ${user.name},</p>
          
          <p>Your refund request #${refundRequest.id} has been <strong>${isApproved ? 'approved' : 'rejected'}</strong>.</p>
          
          <div style="background-color: ${isApproved ? '#ecfdf5' : '#fef2f2'}; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isApproved ? '#059669' : '#dc2626'};">
            <h3 style="margin-top: 0; color: #374151;">Request Details</h3>
            <p><strong>Request ID:</strong> #${refundRequest.id}</p>
            <p><strong>Reason:</strong> ${refundRequest.reason}</p>
            <p><strong>Total Amount:</strong> $${(totalAmount / 100).toFixed(2)}</p>
            <p><strong>Number of Shipments:</strong> ${shipments.length}</p>
            ${adminNotes ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : ''}
          </div>
          
          ${isApproved ? `
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">What Happens Next?</h3>
              <p>Your refund of <strong>$${((refundRequest.processedAmount || totalAmount) / 100).toFixed(2)}</strong> has been added to your account balance immediately.</p>
              <p>You can now use this balance for future shipments or request a withdrawal to your original payment method.</p>
              <p>You can view your updated balance in your Moogship dashboard.</p>
            </div>
          ` : `
            <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #374151;">Why was my request rejected?</h3>
              ${adminNotes ? `<p>${adminNotes}</p>` : '<p>Please contact our support team for more details about this decision.</p>'}
              <p>If you have questions, please contact us at <a href="mailto:cs@moogship.com">cs@moogship.com</a></p>
            </div>
          `}
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Best regards / Saygılarımızla,<br>Moogship Team / Moogship Ekibi</p>
          <p>Need help? Contact us at <a href="mailto:cs@moogship.com">cs@moogship.com</a><br>
          Yardıma mı ihtiyacınız var? <a href="mailto:cs@moogship.com">cs@moogship.com</a> adresinden bize ulaşın</p>
        </div>
      </div>
    `;
    
    // Send single bilingual email
    await mailService.send({
      to: user.email,
      from: 'cs@moogship.com',
      subject: bilingualSubject,
      html: bilingualHtml
    });
    console.log(`Refund status update emails sent to ${user.email} for request #${refundRequest.id} (${newStatus})`);
    return true;
    
  } catch (error) {
    console.error('Error sending refund status update emails:', error);
    return false;
  }
}

export async function sendRefundRequestNotification(
  user: User,
  refundRequest: RefundRequest,
  shipments: Shipment[]
): Promise<boolean> {
  try {
    const shipmentList = shipments.map(s => 
      `- Gönderi #${s.trackingNumber || s.id} (Kargo Takip No: ${s.carrierTrackingNumber || 'Henüz atanmadı'}) - ${s.receiverName} → ${s.receiverCity}, ${s.receiverCountry} - $${((s.totalPrice || 0) / 100).toFixed(2)}`
    ).join('\n');

    const totalAmount = shipments.reduce((sum, s) => sum + (s.totalPrice || 0), 0);

    const subject = `Yeni İade Talebi #${refundRequest.id} - ${user.name}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Yeni İade Talebi</h2>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Talep Detayları</h3>
          <p><strong>Talep ID:</strong> #${refundRequest.id}</p>
          <p><strong>Kullanıcı:</strong> ${user.name} (${user.email})</p>
          <p><strong>Şirket:</strong> ${user.companyName || 'Bireysel'}</p>
          <p><strong>Sebep:</strong> ${refundRequest.reason}</p>
          <p><strong>Gönderi Değeri:</strong> $${(totalAmount / 100).toFixed(2)}</p>
          <p><strong>Tarih:</strong> ${refundRequest.createdAt ? new Date(refundRequest.createdAt).toLocaleString('tr-TR') : 'Bilgi yok'}</p>
        </div>

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Dahil Edilen Gönderiler</h3>
          <p><strong>Toplam Gönderi Sayısı:</strong> ${shipments.length}</p>
          <p><strong>Toplam Değer:</strong> $${(totalAmount / 100).toFixed(2)}</p>
          <div style="margin-top: 15px;">
            <strong>Gönderi Detayları:</strong>
            <pre style="background-color: white; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-size: 12px;">${shipmentList}</pre>
          </div>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Eylem Gerekli:</strong> Lütfen bu iade talebini admin panelinde inceleyin ve uygun şekilde işlem yapın.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Bu MoogShip İade Sistemi'nden otomatik bir bildirimdir.
        </p>
      </div>
    `;

    const text = `
Yeni İade Talebi #${refundRequest.id}

Kullanıcı: ${user.name} (${user.email})
Şirket: ${user.companyName || 'Bireysel'}
Sebep: ${refundRequest.reason}
Gönderi Değeri: $${(totalAmount / 100).toFixed(2)}
Tarih: ${refundRequest.createdAt ? new Date(refundRequest.createdAt).toLocaleString('tr-TR') : 'Bilgi yok'}

Gönderiler (${shipments.length} toplam, $${(totalAmount / 100).toFixed(2)} değer):
${shipmentList}

Lütfen bu iade talebini admin panelinde inceleyin.
    `;

    // Send to all admin emails
    for (const email of ADMIN_EMAILS) {
      await mailService.send({
        to: email,
        from: 'cs@moogship.com',
        subject,
        text,
        html
      });
    }

    console.log(`Refund request notification sent for request #${refundRequest.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send refund request notification:', error);
    return false;
  }
}

export async function sendRefundStatusUpdate(
  user: User,
  refundRequest: RefundRequest,
  shipments: Shipment[],
  adminNotes?: string
): Promise<boolean> {
  try {
    const statusColors = {
      approved: '#10b981',
      rejected: '#ef4444',
      pending: '#f59e0b'
    };

    const subject = `Refund Request #${refundRequest.id} ${refundRequest.status.toUpperCase()}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Refund Request Update</h2>
        
        <div style="background-color: ${statusColors[refundRequest.status as keyof typeof statusColors]}20; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColors[refundRequest.status as keyof typeof statusColors]};">
          <h3 style="margin-top: 0; color: ${statusColors[refundRequest.status as keyof typeof statusColors]};">
            Request ${refundRequest.status.toUpperCase()}
          </h3>
          <p><strong>Request ID:</strong> #${refundRequest.id}</p>
          <p><strong>Status:</strong> ${refundRequest.status.charAt(0).toUpperCase() + refundRequest.status.slice(1)}</p>
          ${refundRequest.processedAmount ? `<p><strong>Processed Amount:</strong> $${(refundRequest.processedAmount / 100).toFixed(2)}</p>` : ''}
          ${refundRequest.processedAt ? `<p><strong>Processed Date:</strong> ${new Date(refundRequest.processedAt).toLocaleString()}</p>` : ''}
        </div>

        ${adminNotes ? `
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Admin Notes</h3>
          <p style="white-space: pre-wrap;">${adminNotes}</p>
        </div>
        ` : ''}

        <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Original Request Details</h3>
          <p><strong>Reason:</strong> ${refundRequest.reason}</p>
          <p><strong>Requested Amount:</strong> $${((refundRequest.requestedAmount || 0) / 100).toFixed(2)}</p>
          <p><strong>Shipments:</strong> ${shipments.length} shipments</p>
        </div>

        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated notification from MoogShip Refund System.
        </p>
      </div>
    `;

    const text = `
Refund Request #${refundRequest.id} ${refundRequest.status.toUpperCase()}

Status: ${refundRequest.status.charAt(0).toUpperCase() + refundRequest.status.slice(1)}
${refundRequest.processedAmount ? `Processed Amount: $${(refundRequest.processedAmount / 100).toFixed(2)}` : ''}
${refundRequest.processedAt ? `Processed Date: ${new Date(refundRequest.processedAt).toLocaleString()}` : ''}

${adminNotes ? `Admin Notes: ${adminNotes}` : ''}

Original Request:
- Reason: ${refundRequest.reason}
- Requested Amount: $${((refundRequest.requestedAmount || 0) / 100).toFixed(2)}
- Shipments: ${shipments.length} shipments
    `;

    await mailService.send({
      to: user.email,
      from: 'cs@moogship.com',
      subject,
      text,
      html
    });

    console.log(`Refund status update sent to ${user.email} for request #${refundRequest.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send refund status update:', error);
    return false;
  }
}