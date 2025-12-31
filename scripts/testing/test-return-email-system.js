/**
 * Test the complete return email system functionality
 */
import { MailService } from '@sendgrid/mail';
import { config } from 'dotenv';
config();

async function testReturnEmailSystem() {
  console.log('Testing return email system...');
  
  if (!process.env.SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY not found in environment');
    return;
  }
  
  const mailService = new MailService();
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
  
  // Mock return data with proper structure
  const mockReturn = {
    id: 1,
    trackingNumber: 'TEST123456',
    senderName: 'Test Sender',
    trackingCarrier: 'UPS',
    orderNumber: 'ORDER-001',
    productName: 'Test Product',
    status: 'received',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const testEmail = 'test@example.com';
  const fromEmail = 'cs@moogship.com';
  
  // Test status update email
  try {
    console.log('Testing status update email...');
    
    const subject = `İade Durumu Güncellendi - ${mockReturn.trackingNumber}`;
    const html = `
      <h2>İade durumunuz güncellendi</h2>
      <p>Takip Numarası: ${mockReturn.trackingNumber}</p>
      <p>Gönderen: ${mockReturn.senderName}</p>
      <p>Taşıyıcı: ${mockReturn.trackingCarrier}</p>
      <p>Yeni Durum: Alındı</p>
    `;
    
    await mailService.send({
      to: testEmail,
      from: fromEmail,
      subject: subject,
      html: html,
      text: 'İade durumunuz güncellendi.'
    });
    
    console.log('Status update email sent successfully!');
  } catch (error) {
    console.error('Status update email failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', error.response.body);
    }
  }
  
  // Test photo upload email
  try {
    console.log('Testing photo upload email...');
    
    const subject = `Yeni Fotoğraf Eklendi - ${mockReturn.trackingNumber}`;
    const html = `
      <h2>İadenize yeni fotoğraf eklendi</h2>
      <p>Takip Numarası: ${mockReturn.trackingNumber}</p>
      <p>Gönderen: ${mockReturn.senderName}</p>
      <p>3 adet yeni fotoğraf eklenmiştir.</p>
    `;
    
    await mailService.send({
      to: testEmail,
      from: fromEmail,
      subject: subject,
      html: html,
      text: 'İadenize yeni fotoğraf eklendi.'
    });
    
    console.log('Photo upload email sent successfully!');
  } catch (error) {
    console.error('Photo upload email failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response body:', error.response.body);
    }
  }
}

testReturnEmailSystem();