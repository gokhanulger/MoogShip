/**
 * Billing Reminder Email Service
 * Handles sending professional payment reminder emails to users
 */

interface BillingReminderEmailParams {
  to: string;
  userName: string;
  companyName?: string | null;
  currentBalance: number; // in cents
  minimumBalance?: number | null; // in cents
  reminderType: 'balance' | 'overdue' | 'payment_request';
  subject: string;
  customMessage?: string;
  adminName: string;
}

export class BillingReminderEmailService {
  private sendGridApiKey: string;

  constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY!;
    if (!this.sendGridApiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is required');
    }
  }

  /**
   * Send billing reminder email to user
   */
  async sendBillingReminder(params: BillingReminderEmailParams): Promise<boolean> {
    try {
      const emailContent = this.createEmailContent(params);
      
      // Convert attached QR code image to base64
      const fs = await import('fs');
      const path = await import('path');
      
      let qrCodeBase64 = '';
      try {
        const qrImagePath = path.join(process.cwd(), 'attached_assets', 'PHOTO-2025-04-16-12-14-32.jpg');
        const qrImageBuffer = fs.readFileSync(qrImagePath);
        qrCodeBase64 = qrImageBuffer.toString('base64');
      } catch (error) {
        console.log('QR code image not found, continuing without attachment');
      }
      
      const emailData = {
        personalizations: [
          {
            to: [{ email: params.to, name: params.userName }],
            subject: params.subject
          }
        ],
        from: {
          email: 'cs@moogship.com',
          name: 'MoogShip Billing'
        },
        content: [
          {
            type: 'text/html',
            value: emailContent
          }
        ],
        attachments: qrCodeBase64 ? [
          {
            content: qrCodeBase64,
            filename: 'qr_code.jpg',
            type: 'image/jpeg',
            disposition: 'inline',
            content_id: 'qr_code_image'
          }
        ] : []
      };

      console.log(`Sending billing reminder email to ${params.to} (${params.reminderType})`);

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('SendGrid API error:', response.status, errorData);
        throw new Error(`SendGrid API error: ${response.status}`);
      }

      console.log(`Billing reminder email sent successfully to ${params.to}`);
      return true;

    } catch (error) {
      console.error('Error sending billing reminder email:', error);
      throw error;
    }
  }

  /**
   * Create HTML email content for billing reminder
   */
  private createEmailContent(params: BillingReminderEmailParams): string {
    const currentBalanceFormatted = (params.currentBalance / 100).toFixed(2);
    const minimumBalanceFormatted = params.minimumBalance ? (params.minimumBalance / 100).toFixed(2) : null;
    const companyOrName = params.companyName || params.userName;
    
    const balanceColor = params.currentBalance < 0 ? '#dc2626' : '#059669'; // red for negative, green for positive
    const balanceText = params.currentBalance < 0 ? `-$${Math.abs(params.currentBalance / 100).toFixed(2)}` : `$${currentBalanceFormatted}`;

    let reminderTypeText = '';
    let reminderIcon = '';
    let urgencyLevel = '';

    switch (params.reminderType) {
      case 'balance':
        reminderTypeText = 'Bakiye Hatırlatması';
        reminderIcon = '💰';
        urgencyLevel = 'Bilgilendirme';
        break;
      case 'overdue':
        reminderTypeText = 'Gecikmiş Ödeme Bildirimi';
        reminderIcon = '⚠️';
        urgencyLevel = 'Önemli';
        break;
      case 'payment_request':
        reminderTypeText = 'Ödeme Talebi';
        reminderIcon = '💳';
        urgencyLevel = 'İşlem Gerekli';
        break;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${params.subject}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); padding: 30px; text-align: center;">
                <h1 style="color: #1a1a1a; margin: 0; font-size: 28px; font-weight: bold;">
                    ${reminderIcon} MoogShip Faturalama
                </h1>
                <p style="color: #333; margin: 10px 0 0 0; font-size: 16px;">
                    Küresel Kargo Çözümleri
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                
                <!-- Greeting -->
                <div style="margin-bottom: 30px;">
                    <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px;">
                        Merhaba ${companyOrName},
                    </h2>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #FFA500;">
                        <p style="margin: 0; color: #374151; font-size: 16px;">
                            <strong>Hatırlatma Türü:</strong> ${reminderTypeText}<br>
                            <strong>Öncelik:</strong> ${urgencyLevel}
                        </p>
                    </div>
                </div>

                <!-- Account Balance -->
                <div style="background-color: #f9fafb; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e5e7eb;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                        📊 Hesap Bakiye Bilgileri
                    </h3>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <span style="color: #6b7280; font-size: 16px;">Mevcut Bakiye:</span>
                        <span style="color: ${balanceColor}; font-size: 24px; font-weight: bold;">${balanceText}</span>
                    </div>
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #d1d5db;">
                        <p style="margin: 0; color: #6b7280; font-size: 14px;">
                            <strong>Hesap:</strong> ${params.userName} (${params.to})
                        </p>
                    </div>
                </div>

                <!-- Custom Message -->
                <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #FFA500;">
                    <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
                        📝 MoogShip Lojistik'ten Mesaj
                    </h3>
                    <p style="color: #78350f; margin: 0; line-height: 1.6;">
                        ${params.customMessage || 'Değerli müşterimiz, hesabınızda bekleyen bir bakiye olduğunu fark ettik. Lütfen hesabınızı gözden geçirin ve en kısa sürede ödemenizi gerçekleştirin. Devam eden işbirliğiniz için teşekkür ederiz. Saygılarımızla, MoogShip Ekibi'}
                    </p>
                </div>

                <!-- Action Buttons -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://app.moogship.com/dashboard" 
                       style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #1a1a1a; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px; margin-right: 15px;">
                        Paneli Görüntüle
                    </a>
                    <a href="https://app.moogship.com/my-balance" 
                       style="display: inline-block; background-color: #FFA500; color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Bakiye Yönetimi
                    </a>
                </div>

                <!-- Payment Information with QR Code -->
                <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e0f2fe;">
                    <h3 style="color: #0c4a6e; margin: 0 0 20px 0; font-size: 18px; display: flex; align-items: center;">
                        💳 Banka Bilgileri ve Ödeme Seçenekleri
                    </h3>
                    
                    <!-- Bank Information Section -->
                    <div style="display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-start;">
                        <!-- QR Code -->
                        <div style="flex-shrink: 0;">
                            <img src="cid:qr_code_image" 
                                 alt="Banka Bilgileri QR Kodu" 
                                 style="width: 150px; height: 150px; border-radius: 8px; border: 2px solid #e0f2fe;">
                            <p style="text-align: center; margin: 8px 0 0 0; font-size: 12px; color: #6b7280;">
                                Banka bilgileri QR kodu
                            </p>
                        </div>
                        
                        <!-- Bank Details -->
                        <div style="flex-grow: 1;">
                            <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e0f2fe;">
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                                    <strong>Hesap Adı:</strong><br>
                                    MOOGSHIP LOJİSTİK VE TİCARET LİMİTED ŞİRKETİ
                                </p>
                                <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;">
                                    <strong>IBAN:</strong><br>
                                    <span style="font-family: monospace; background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px;">
                                        TR40 0001 0019 6997 9531 5350 01
                                    </span>
                                </p>
                                <p style="margin: 0; font-size: 12px; color: #ef4444; font-weight: 600;">
                                    ⚠️ Açıklama kısmına kullanıcı adınızı yazmayı unutmayın
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Payment Instructions -->
                    <div style="border-top: 1px solid #e0f2fe; padding-top: 15px;">
                        <h4 style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 14px;">
                            Ödeme Talimatları:
                        </h4>
                        <p style="color: #0f172a; margin: 0; font-size: 14px;">
                            • Banka havalesi ile ödeme yapabilirsiniz<br>
                            • Açıklama kısmına kullanıcı adınızı yazmayı unutmayın<br>
                            • Ödeme sonrası lütfen dekontunu bize gönderin
                        </p>
                    </div>
                </div>

                <!-- Contact Information -->
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">
                        📞 Yardıma mı ihtiyacınız var?
                    </h3>
                    <p style="color: #6b7280; margin: 0 0 10px 0;">
                        Faturalama ekibimiz tüm sorularınız için burada.
                    </p>
                    <p style="color: #374151; margin: 0; font-weight: 600;">
                        E-posta: <a href="mailto:cs@moogship.com" style="color: #FFA500;">cs@moogship.com</a><br>
                        Telefon: <a href="tel:+908503047538" style="color: #FFA500;">+90 (850) 304 7538</a>
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                    Bu, MoogShip'ten otomatik bir faturalama hatırlatmasıdır.
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                    © 2025 MoogShip - Küresel Kargo Çözümleri<br>
                    İstanbul, Türkiye | www.moogship.com
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
  }
}

export default BillingReminderEmailService;