import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface User {
  id: number;
  name: string;
  email: string;
  username: string;
}

interface AdminUser {
  id: number;
  name: string;
  username: string;
}

export async function sendReturnAccessGrantedEmail(
  user: User,
  grantedBy: AdminUser
): Promise<boolean> {
  try {
    const emailContent = {
      to: user.email,
      from: {
        email: 'cs@moogship.com',
        name: 'MoogShip Customer Service'
      },
      subject: '🎉 Return Management Access Granted / İade Yönetimi Erişimi Verildi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { margin-bottom: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .divider { height: 2px; background: linear-gradient(to right, #667eea, #764ba2); margin: 30px 0; border-radius: 2px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .flag { font-size: 24px; margin-right: 10px; }
            h1 { margin: 0; font-size: 28px; }
            h2 { color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
            .success-icon { font-size: 48px; color: #28a745; text-align: center; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Access Granted / Erişim Verildi</h1>
            </div>
            
            <div class="content">
              <!-- English Section -->
              <div class="section">
                <h2><span class="flag">🇺🇸</span>Return Management Access Granted</h2>
                <p>Dear <strong>${user.name}</strong>,</p>
                <p>Great news! You have been granted access to the <strong>Return Management System</strong> on MoogShip.</p>
                
                <p><strong>Access Details:</strong></p>
                <ul>
                  <li><strong>User:</strong> ${user.name} (${user.username})</li>
                  <li><strong>Granted by:</strong> ${grantedBy.name} (${grantedBy.username})</li>
                  <li><strong>Access Type:</strong> Return Management System</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</li>
                </ul>

                <p><strong>What you can now do:</strong></p>
                <ul>
                  <li>Access the Returns page in your dashboard</li>
                  <li>Create and manage return requests</li>
                  <li>Track return shipment statuses</li>
                  <li>Update return notes and information</li>
                  <li>Generate return reports</li>
                </ul>

                <p>
                  <a href="https://app.moogship.com/returns" class="button">Access Returns System</a>
                </p>
              </div>

              <div class="divider"></div>

              <!-- Turkish Section -->
              <div class="section">
                <h2><span class="flag">🇹🇷</span>İade Yönetimi Erişimi Verildi</h2>
                <p>Sayın <strong>${user.name}</strong>,</p>
                <p>Harika haber! MoogShip <strong>İade Yönetim Sistemi</strong>'ne erişim hakkınız verilmiştir.</p>
                
                <p><strong>Erişim Detayları:</strong></p>
                <ul>
                  <li><strong>Kullanıcı:</strong> ${user.name} (${user.username})</li>
                  <li><strong>Erişimi Veren:</strong> ${grantedBy.name} (${grantedBy.username})</li>
                  <li><strong>Erişim Türü:</strong> İade Yönetim Sistemi</li>
                  <li><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</li>
                </ul>

                <p><strong>Artık yapabilecekleriniz:</strong></p>
                <ul>
                  <li>Panelinizde İadeler sayfasına erişim</li>
                  <li>İade talepleri oluşturma ve yönetme</li>
                  <li>İade gönderi durumlarını takip etme</li>
                  <li>İade notları ve bilgilerini güncelleme</li>
                  <li>İade raporları oluşturma</li>
                </ul>

                <p>
                  <a href="https://app.moogship.com/returns" class="button">İade Sistemine Erişim</a>
                </p>
              </div>

              <div class="footer">
                <p>
                  <strong>MoogShip Customer Service</strong><br>
                  Email: cs@moogship.com<br>
                  Website: <a href="https://moogship.com">moogship.com</a>
                </p>
                <p style="font-size: 12px; color: #999;">
                  This email was sent automatically. Please do not reply to this email.<br>
                  Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-postayı yanıtlamayın.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await mailService.send(emailContent);
    console.log(`[EMAIL] Return access granted notification sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send return access granted notification:', error);
    return false;
  }
}

export async function sendReturnAccessRevokedEmail(
  user: User,
  revokedBy: AdminUser
): Promise<boolean> {
  try {
    const emailContent = {
      to: user.email,
      from: {
        email: 'cs@moogship.com',
        name: 'MoogShip Customer Service'
      },
      subject: '🔒 Return Management Access Revoked / İade Yönetimi Erişimi İptal Edildi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .section { margin-bottom: 30px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
            .divider { height: 2px; background: linear-gradient(to right, #dc3545, #c82333); margin: 30px 0; border-radius: 2px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            .flag { font-size: 24px; margin-right: 10px; }
            h1 { margin: 0; font-size: 28px; }
            h2 { color: #dc3545; border-bottom: 2px solid #dc3545; padding-bottom: 10px; }
            .warning-icon { font-size: 48px; color: #dc3545; text-align: center; margin-bottom: 20px; }
            .contact-box { background: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="warning-icon">🔒</div>
              <h1>Access Revoked / Erişim İptal Edildi</h1>
            </div>
            
            <div class="content">
              <!-- English Section -->
              <div class="section">
                <h2><span class="flag">🇺🇸</span>Return Management Access Revoked</h2>
                <p>Dear <strong>${user.name}</strong>,</p>
                <p>We are writing to inform you that your access to the <strong>Return Management System</strong> on MoogShip has been revoked.</p>
                
                <p><strong>Revocation Details:</strong></p>
                <ul>
                  <li><strong>User:</strong> ${user.name} (${user.username})</li>
                  <li><strong>Revoked by:</strong> ${revokedBy.name} (${revokedBy.username})</li>
                  <li><strong>Access Type:</strong> Return Management System</li>
                  <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</li>
                </ul>

                <p><strong>What this means:</strong></p>
                <ul>
                  <li>You can no longer access the Returns page</li>
                  <li>You cannot create new return requests</li>
                  <li>You cannot view or manage existing returns</li>
                  <li>You cannot generate return reports</li>
                </ul>

                <div class="contact-box">
                  <p><strong>Need access restored?</strong></p>
                  <p>If you believe this was done in error or if you need access restored, please contact our customer service team.</p>
                </div>

                <p>
                  <a href="mailto:cs@moogship.com" class="button">Contact Support</a>
                </p>
              </div>

              <div class="divider"></div>

              <!-- Turkish Section -->
              <div class="section">
                <h2><span class="flag">🇹🇷</span>İade Yönetimi Erişimi İptal Edildi</h2>
                <p>Sayın <strong>${user.name}</strong>,</p>
                <p>MoogShip <strong>İade Yönetim Sistemi</strong>'ne erişiminizin iptal edildiğini bildirmek için size yazıyoruz.</p>
                
                <p><strong>İptal Detayları:</strong></p>
                <ul>
                  <li><strong>Kullanıcı:</strong> ${user.name} (${user.username})</li>
                  <li><strong>İptal Eden:</strong> ${revokedBy.name} (${revokedBy.username})</li>
                  <li><strong>Erişim Türü:</strong> İade Yönetim Sistemi</li>
                  <li><strong>Tarih:</strong> ${new Date().toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}</li>
                </ul>

                <p><strong>Bu ne anlama geliyor:</strong></p>
                <ul>
                  <li>Artık İadeler sayfasına erişemezsiniz</li>
                  <li>Yeni iade talepleri oluşturamazsınız</li>
                  <li>Mevcut iadeleri görüntüleyemez ve yönetemezsiniz</li>
                  <li>İade raporları oluşturamazsınız</li>
                </ul>

                <div class="contact-box">
                  <p><strong>Erişim iade edilsin mi?</strong></p>
                  <p>Bu işlemin hatalı yapıldığını düşünüyorsanız veya erişiminizin geri verilmesini istiyorsanız, lütfen müşteri hizmetleri ekibimizle iletişime geçin.</p>
                </div>

                <p>
                  <a href="mailto:cs@moogship.com" class="button">Destek İletişim</a>
                </p>
              </div>

              <div class="footer">
                <p>
                  <strong>MoogShip Customer Service</strong><br>
                  Email: cs@moogship.com<br>
                  Website: <a href="https://moogship.com">moogship.com</a>
                </p>
                <p style="font-size: 12px; color: #999;">
                  This email was sent automatically. Please do not reply to this email.<br>
                  Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu e-postayı yanıtlamayın.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await mailService.send(emailContent);
    console.log(`[EMAIL] Return access revoked notification sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send return access revoked notification:', error);
    return false;
  }
}