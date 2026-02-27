import { sendEmail } from '../email.js';
import { shouldSendNotification, isGlobalEmailEnabled, getAdminRecipients } from '../notification-emails.js';

interface TicketEmailData {
  ticketId: number;
  subject: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  userName: string;
  userEmail: string;
  userId?: number;
  assignedToName?: string;
  assignedToEmail?: string;
  adminName?: string;
  createdAt: Date;
}

interface TicketResponseEmailData extends TicketEmailData {
  responseMessage: string;
  responseAuthor: string;
  responseAuthorRole: string;
}

interface EmailTemplate {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
}

const FROM_EMAIL = 'cs@moogship.com';

async function getTicketAdminEmails(): Promise<string[]> {
  return getAdminRecipients("support_ticket");
}

// Simple function to convert HTML to text
function generateTextContent(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

function formatPriority(priority: string): string {
  const priorityColors = {
    low: '#10B981',
    medium: '#F59E0B', 
    high: '#EF4444',
    urgent: '#DC2626'
  };
  
  const color = priorityColors[priority as keyof typeof priorityColors] || '#6B7280';
  const priorityTranslations = {
    low: 'DÜŞÜK',
    medium: 'ORTA',
    high: 'YÜKSEK',
    urgent: 'ACİL'
  };
  const displayPriority = priorityTranslations[priority as keyof typeof priorityTranslations] || priority.toUpperCase();
  return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${displayPriority}</span>`;
}

function formatCategory(category: string): string {
  const categoryColors = {
    shipping: '#3B82F6',
    pickup: '#8B5CF6',
    billing: '#F59E0B',
    technical: '#10B981',
    other: '#6B7280'
  };
  
  const color = categoryColors[category as keyof typeof categoryColors] || '#6B7280';
  const categoryTranslations = {
    shipping: 'KARGO',
    pickup: 'TOPLAMA',
    billing: 'FATURALAMA',
    technical: 'TEKNİK',
    other: 'DİĞER'
  };
  const displayCategory = categoryTranslations[category as keyof typeof categoryTranslations] || category.toUpperCase();
  return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${displayCategory}</span>`;
}

function formatStatus(status: string): string {
  const statusColors = {
    open: '#F59E0B',
    in_progress: '#3B82F6',
    closed: '#10B981'
  };
  
  const color = statusColors[status as keyof typeof statusColors] || '#6B7280';
  const statusTranslations = {
    open: 'AÇIK',
    in_progress: 'İŞLEMDE',
    closed: 'KAPALI',
    resolved: 'ÇÖZÜLDÜ'
  };
  const displayStatus = statusTranslations[status as keyof typeof statusTranslations] || status.replace('_', ' ').toUpperCase();
  return `<span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${displayStatus}</span>`;
}

function createTicketEmailTextTemplate(data: TicketEmailData, type: 'created' | 'updated' | 'assigned' | 'closed', isAdminEmail: boolean = false): string {
  const actionTitle = {
    created: 'Yeni Destek Talebi Oluşturuldu',
    updated: 'Destek Talebi Güncellendi',
    assigned: 'Destek Talebi Atandı',
    closed: 'Destek Talebi Kapatıldı'
  }[type];

  const statusText = {
    open: 'AÇIK',
    in_progress: 'İŞLEMDE',
    closed: 'KAPALI',
    resolved: 'ÇÖZÜLDÜ'
  }[data.status] || data.status.toUpperCase();

  const priorityText = {
    low: 'DÜŞÜK',
    medium: 'ORTA',
    high: 'YÜKSEK',
    urgent: 'ACİL'
  }[data.priority] || data.priority.toUpperCase();

  const categoryText = {
    shipping: 'KARGO',
    pickup: 'TOPLAMA',
    billing: 'FATURALAMA',
    technical: 'TEKNİK',
    other: 'DİĞER'
  }[data.category] || data.category.toUpperCase();

  const portalUrl = isAdminEmail ? 'https://app.moogship.com/admin-tickets' : 'https://www.moogship.com/my-tickets';
  const buttonText = isAdminEmail ? 'Yönetici Panelinde Görüntüle' : 'Panelde Görüntüle';

  return `
${actionTitle}
MoogShip Support System

Talep #${data.ticketId}: ${data.subject}

Durum: ${statusText}
Öncelik: ${priorityText}
Kategori: ${categoryText}
Müşteri: ${data.userName} (${data.userEmail})
${data.assignedToName ? `Atanan: ${data.assignedToName} (${data.assignedToEmail})` : ''}
Oluşturulma: ${data.createdAt.toLocaleString('tr-TR')}

Açıklama:
${data.description}

${buttonText}: ${portalUrl}

Bu, MoogShip Destek Sisteminden otomatik bir bildirimdir
Bu e-postayı yanıtlamayınız. Taleplere cevap vermek için yönetici panelini kullanın.
  `.trim();
}

function createTicketEmailTemplate(data: TicketEmailData, type: 'created' | 'updated' | 'assigned' | 'closed', isAdminEmail: boolean = false): string {
  const baseStyles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { padding: 30px; }
    .ticket-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
    .label { font-weight: bold; color: #495057; }
    .value { color: #6c757d; }
    .description { background-color: #fff; border: 1px solid #dee2e6; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; color: #6c757d; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 15px 0; }
    .btn:hover { background-color: #0056b3; }
  `;

  const actionTitle = {
    created: 'Yeni Destek Talebi Oluşturuldu',
    updated: 'Destek Talebi Güncellendi',
    assigned: 'Destek Talebi Atandı',
    closed: 'Destek Talebi Kapatıldı'
  }[type];

  const actionIcon = {
    created: '🎫',
    updated: '🔄',
    assigned: '👤',
    closed: '✅'
  }[type];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${actionTitle}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${actionIcon} ${actionTitle}</h1>
          <p>MoogShip Support System</p>
        </div>
        
        <div class="content">
          <h2>Talep #${data.ticketId}: ${data.subject}</h2>
          
          <div class="ticket-info">
            <div class="info-row">
              <span class="label">Durum:</span>
              <span class="value">${formatStatus(data.status)}</span>
            </div>
            <div class="info-row">
              <span class="label">Öncelik:</span>
              <span class="value">${formatPriority(data.priority)}</span>
            </div>
            <div class="info-row">
              <span class="label">Kategori:</span>
              <span class="value">${formatCategory(data.category)}</span>
            </div>
            <div class="info-row">
              <span class="label">Müşteri:</span>
              <span class="value">${data.userName} (${data.userEmail})</span>
            </div>
            ${data.assignedToName ? `
            <div class="info-row">
              <span class="label">Atanan:</span>
              <span class="value">${data.assignedToName} (${data.assignedToEmail})</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Oluşturulma:</span>
              <span class="value">${data.createdAt.toLocaleString('tr-TR')}</span>
            </div>
          </div>

          <div class="description">
            <h4>Açıklama:</h4>
            <p>${data.description.replace(/\n/g, '<br>')}</p>
          </div>

          <div style="text-align: center;">
            <a href="${isAdminEmail ? 'https://app.moogship.com/admin-tickets' : 'https://www.moogship.com/my-tickets'}" class="btn">${isAdminEmail ? 'Yönetici Panelinde Görüntüle' : 'Panelde Görüntüle'}</a>
          </div>
        </div>
        
        <div class="footer">
          <p>Bu, MoogShip Destek Sisteminden otomatik bir bildirimdir</p>
          <p>Bu e-postayı yanıtlamayınız. Taleplere cevap vermek için yönetici panelini kullanın.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendTicketCreatedNotification(ticketData: TicketEmailData): Promise<void> {
  try {
    // Check global toggle and customer notification preferences
    let shouldSendToCustomer = await isGlobalEmailEnabled("support_ticket");
    if (shouldSendToCustomer && ticketData.userId) {
      shouldSendToCustomer = await shouldSendNotification(ticketData.userId, 'support_ticket', false);
    }

    // Send notification to customer (if preference allows)
    let customerResult = { success: true };
    if (shouldSendToCustomer) {
      customerResult = await sendEmail({
        to: ticketData.userEmail,
        from: FROM_EMAIL,
        subject: `Destek Talebi Oluşturuldu - #${ticketData.ticketId}: ${ticketData.subject}`,
        text: createTicketEmailTextTemplate(ticketData, 'created', false),
        html: createTicketEmailTemplate(ticketData, 'created', false)
      });
    } else {
      console.log(`Ticket creation customer email skipped for user ${ticketData.userId} - preference disabled`);
    }

    // Send notification to admins (always)
    const ADMIN_EMAILS = await getTicketAdminEmails();
    const adminEmailsFiltered = ADMIN_EMAILS.filter(adminEmail => adminEmail !== ticketData.userEmail);
    const adminResults = await Promise.all(
      adminEmailsFiltered.map(adminEmail => sendEmail({
        to: adminEmail,
        from: FROM_EMAIL,
        subject: `🎫 Yeni Destek Talebi #${ticketData.ticketId} - ${formatPriority(ticketData.priority).replace(/<[^>]*>/g, '')} Öncelik`,
        text: createTicketEmailTextTemplate(ticketData, 'created', true),
        html: createTicketEmailTemplate(ticketData, 'created', true)
      }))
    );

    // Log results
    if (customerResult.success) {
      console.log(`✅ Customer notification sent for ticket #${ticketData.ticketId}`);
    } else {
      console.error(`❌ Failed to send customer notification for ticket #${ticketData.ticketId}:`, customerResult.error);
    }

    adminResults.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Admin notification sent to ${adminEmails[index].to} for ticket #${ticketData.ticketId}`);
      } else {
        console.error(`❌ Failed to send admin notification to ${adminEmails[index].to} for ticket #${ticketData.ticketId}:`, result.error);
      }
    });
  } catch (error) {
    console.error(`❌ Error sending ticket creation notifications:`, error);
    throw error;
  }
}

export async function sendTicketUpdatedNotification(ticketData: TicketEmailData, updateType: 'status_change' | 'assignment' | 'general'): Promise<void> {
  try {
    const emailType = updateType === 'assignment' ? 'assigned' : 'updated';

    // Check global toggle and customer notification preferences
    let shouldSendToCustomer = await isGlobalEmailEnabled("support_ticket");
    if (shouldSendToCustomer && ticketData.userId) {
      shouldSendToCustomer = await shouldSendNotification(ticketData.userId, 'support_ticket', false);
    }

    const emails: EmailTemplate[] = [];

    // Send notification to customer (if preference allows)
    if (shouldSendToCustomer) {
      emails.push({
        to: ticketData.userEmail,
        from: FROM_EMAIL,
        subject: `Support Ticket Updated - #${ticketData.ticketId}: ${ticketData.subject}`,
        text: createTicketEmailTextTemplate(ticketData, emailType, false),
        html: createTicketEmailTemplate(ticketData, emailType, false)
      });
    } else {
      console.log(`Ticket update customer email skipped for user ${ticketData.userId} - preference disabled`);
    }

    if (ticketData.assignedToEmail && updateType !== 'assignment') {
      emails.push({
        to: ticketData.assignedToEmail,
        from: FROM_EMAIL,
        subject: `📝 Ticket Update #${ticketData.ticketId} - ${ticketData.subject}`,
        text: createTicketEmailTextTemplate(ticketData, emailType, true),
        html: createTicketEmailTemplate(ticketData, emailType, true)
      });
    }

    // For new assignments, notify all admins
    if (updateType === 'assignment') {
      const ADMIN_EMAILS = await getTicketAdminEmails();
      ADMIN_EMAILS.forEach(adminEmail => {
        emails.push({
          to: adminEmail,
          from: FROM_EMAIL,
          subject: `👤 Ticket Assigned #${ticketData.ticketId} - ${ticketData.subject}`,
          text: createTicketEmailTextTemplate(ticketData, 'assigned', true),
          html: createTicketEmailTemplate(ticketData, 'assigned', true)
        });
      });
    }

    // Send all emails using the existing email service
    const results = await Promise.all(emails.map(email => sendEmail({
      to: email.to,
      from: email.from,
      subject: email.subject,
      text: email.text,
      html: email.html
    })));

    // Log results
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Update notification sent to ${emails[index].to} for ticket #${ticketData.ticketId} (${updateType})`);
      } else {
        console.error(`❌ Failed to send update notification to ${emails[index].to} for ticket #${ticketData.ticketId}:`, result.error);
      }
    });
  } catch (error) {
    console.error(`❌ Error sending ticket update notifications:`, error);
    throw error;
  }
}

export async function sendTicketClosedNotification(ticketData: TicketEmailData, closureReason?: string): Promise<void> {
  try {
    // Create templates for both customer and admin
    const customerClosureTemplate = createTicketEmailTemplate(ticketData, 'closed', false) + 
      (closureReason ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">Closure Reason:</h4>
          <p style="color: #155724; margin: 0;">${closureReason.replace(/\n/g, '<br>')}</p>
        </div>
      ` : '');

    const adminClosureTemplate = createTicketEmailTemplate(ticketData, 'closed', true) + 
      (closureReason ? `
        <div style="margin: 20px 0; padding: 15px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
          <h4 style="color: #155724; margin: 0 0 10px 0;">Closure Reason:</h4>
          <p style="color: #155724; margin: 0;">${closureReason.replace(/\n/g, '<br>')}</p>
        </div>
      ` : '');

    // Generate text versions
    const customerClosureTextTemplate = createTicketEmailTextTemplate(ticketData, 'closed', false) + 
      (closureReason ? `\n\nClosure Reason:\n${closureReason}` : '');

    const adminClosureTextTemplate = createTicketEmailTextTemplate(ticketData, 'closed', true) + 
      (closureReason ? `\n\nClosure Reason:\n${closureReason}` : '');

    // Check global toggle and customer notification preferences
    let shouldSendToCustomer = await isGlobalEmailEnabled("support_ticket");
    if (shouldSendToCustomer && ticketData.userId) {
      shouldSendToCustomer = await shouldSendNotification(ticketData.userId, 'support_ticket', false);
    }

    const emails: EmailTemplate[] = [];

    // Send notification to customer (if preference allows)
    if (shouldSendToCustomer) {
      emails.push({
        to: ticketData.userEmail,
        from: FROM_EMAIL,
        subject: `Support Ticket Resolved - #${ticketData.ticketId}: ${ticketData.subject}`,
        text: customerClosureTextTemplate,
        html: customerClosureTemplate
      });
    } else {
      console.log(`Ticket closure customer email skipped for user ${ticketData.userId} - preference disabled`);
    }

    if (ticketData.assignedToEmail) {
      emails.push({
        to: ticketData.assignedToEmail,
        from: FROM_EMAIL,
        subject: `✅ Ticket Closed #${ticketData.ticketId} - ${ticketData.subject}`,
        text: adminClosureTextTemplate,
        html: adminClosureTemplate
      });
    }

    // Send all emails using the existing email service
    const results = await Promise.all(emails.map(email => sendEmail({
      to: email.to,
      from: email.from,
      subject: email.subject,
      text: email.text,
      html: email.html
    })));

    // Log results
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ Closure notification sent to ${emails[index].to} for ticket #${ticketData.ticketId}`);
      } else {
        console.error(`❌ Failed to send closure notification to ${emails[index].to} for ticket #${ticketData.ticketId}:`, result.error);
      }
    });
  } catch (error) {
    console.error(`❌ Error sending ticket closure notifications:`, error);
    throw error;
  }
}

function createTicketResponseEmailTemplate(data: TicketResponseEmailData, type: 'admin_to_customer' | 'customer_to_admin' | 'admin_response_internal'): string {
  const baseStyles = `
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { padding: 30px; }
    .ticket-info { background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
    .label { font-weight: bold; color: #495057; }
    .value { color: #6c757d; }
    .response-box { background-color: #fff; border: 1px solid #dee2e6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #007bff; }
    .response-author { font-weight: bold; color: #007bff; margin-bottom: 10px; }
    .response-message { color: #495057; line-height: 1.5; }
    .footer { text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; color: #6c757d; font-size: 12px; }
    .btn { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin: 15px 0; }
    .btn:hover { background-color: #0056b3; }
  `;

  const actionTitle = {
    admin_to_customer: 'New Response from Support Team',
    customer_to_admin: 'New Response from Customer',
    admin_response_internal: 'Admin Response Activity'
  }[type];

  const actionIcon = {
    admin_to_customer: '💬',
    customer_to_admin: '📝',
    admin_response_internal: '🔄'
  }[type];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${actionTitle}</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${actionIcon} ${actionTitle}</h1>
          <p>MoogShip Support System</p>
        </div>
        
        <div class="content">
          <h2>Ticket #${data.ticketId}: ${data.subject}</h2>
          
          <div class="response-box">
            <div class="response-author">
              💬 Response from ${data.responseAuthor} (${data.responseAuthorRole === 'admin' ? 'Support Team' : 'Customer'})
            </div>
            <div class="response-message">
              ${data.responseMessage.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <div class="ticket-info">
            <div class="info-row">
              <span class="label">Status:</span>
              <span class="value">${formatStatus(data.status)}</span>
            </div>
            <div class="info-row">
              <span class="label">Priority:</span>
              <span class="value">${formatPriority(data.priority)}</span>
            </div>
            <div class="info-row">
              <span class="label">Category:</span>
              <span class="value">${formatCategory(data.category)}</span>
            </div>
            <div class="info-row">
              <span class="label">Customer:</span>
              <span class="value">${data.userName} (${data.userEmail})</span>
            </div>
            ${data.assignedToName ? `
            <div class="info-row">
              <span class="label">Assigned To:</span>
              <span class="value">${data.assignedToName} (${data.assignedToEmail})</span>
            </div>
            ` : ''}
          </div>

          <div style="text-align: center;">
            ${type === 'admin_to_customer' ? 
              '<a href="https://www.moogship.com/my-tickets" class="btn">Panelde Görüntüle</a>' : 
              '<a href="https://app.moogship.com/admin-tickets" class="btn">Yönetici Panelinde Görüntüle</a>'
            }
          </div>
        </div>
        
        <div class="footer">
          <p>Bu, MoogShip Destek Sisteminden otomatik bir bildirimdir</p>
          <p>Bu e-postayı yanıtlamayınız. Taleplere cevap vermek için yönetici panelini kullanın.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendTicketResponseNotification(responseData: TicketResponseEmailData, type: 'admin_to_customer' | 'customer_to_admin' | 'admin_response_internal'): Promise<void> {
  try {
    const emails: EmailTemplate[] = [];
    const ADMIN_EMAILS = await getTicketAdminEmails();

    switch (type) {
      case 'admin_to_customer':
        // Admin responded - notify customer (if global toggle and preference allows)
        let shouldSendToCustomer = await isGlobalEmailEnabled("support_ticket");
        if (shouldSendToCustomer && responseData.userId) {
          shouldSendToCustomer = await shouldSendNotification(responseData.userId, 'support_ticket', false);
        }
        if (shouldSendToCustomer) {
          emails.push({
            to: responseData.userEmail,
            from: FROM_EMAIL,
            subject: `💬 New Response to Your Support Ticket #${responseData.ticketId}`,
            text: generateTextContent(createTicketResponseEmailTemplate(responseData, 'admin_to_customer')),
            html: createTicketResponseEmailTemplate(responseData, 'admin_to_customer')
          });
        } else {
          console.log(`Ticket response customer email skipped for user ${responseData.userId} - preference disabled`);
        }
        break;

      case 'customer_to_admin':
        // Customer responded - notify all admins (exclude customer email to avoid duplicates)
        const adminEmailsFiltered = ADMIN_EMAILS.filter(adminEmail => adminEmail !== responseData.userEmail);
        adminEmailsFiltered.forEach(adminEmail => {
          emails.push({
            to: adminEmail,
            from: FROM_EMAIL,
            subject: `📝 Customer Response on Ticket #${responseData.ticketId} - ${responseData.subject}`,
            text: generateTextContent(createTicketResponseEmailTemplate(responseData, 'customer_to_admin')),
            html: createTicketResponseEmailTemplate(responseData, 'customer_to_admin')
          });
        });
        break;

      case 'admin_response_internal':
        // Admin responded - notify other admins (excluding the one who responded)
        ADMIN_EMAILS.forEach(adminEmail => {
          if (adminEmail !== responseData.assignedToEmail) {
            emails.push({
              to: adminEmail,
              from: FROM_EMAIL,
              subject: `🔄 Admin Response Activity on Ticket #${responseData.ticketId}`,
              text: generateTextContent(createTicketResponseEmailTemplate(responseData, 'admin_response_internal')),
              html: createTicketResponseEmailTemplate(responseData, 'admin_response_internal')
            });
          }
        });
        break;
    }

    if (emails.length > 0) {
      // Send all emails using the existing email service
      const results = await Promise.all(emails.map(email => sendEmail({
        to: email.to,
        from: email.from,
        subject: email.subject,
        text: email.text,
        html: email.html
      })));

      // Log results
      results.forEach((result, index) => {
        if (result.success) {
          console.log(`✅ Response notification sent to ${emails[index].to} for ticket #${responseData.ticketId} (${type})`);
        } else {
          console.error(`❌ Failed to send response notification to ${emails[index].to} for ticket #${responseData.ticketId}:`, result.error);
        }
      });
    }
  } catch (error) {
    console.error(`❌ Error sending response notifications for ticket #${responseData.ticketId}:`, error);
    throw error;
  }
}