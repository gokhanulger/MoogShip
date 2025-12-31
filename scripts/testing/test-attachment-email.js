/**
 * Test email campaign with attachment functionality
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

async function testAttachmentEmail() {
  // Connect to database
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  const db = drizzle(client);

  try {
    // Get campaign 3 which has an attachment
    const campaign = await client.query(
      'SELECT * FROM email_campaigns WHERE id = $1',
      [3]
    );
    
    if (campaign.rows.length === 0) {
      console.log('Campaign 3 not found');
      return;
    }
    
    const campaignData = campaign.rows[0];
    console.log('Campaign data:', {
      id: campaignData.id,
      name: campaignData.name,
      subject: campaignData.subject,
      attachment_urls: campaignData.attachment_urls
    });
    
    // Get recipients for this campaign
    const recipients = await client.query(
      'SELECT ecr.*, u.email, u.name FROM email_campaign_recipients ecr JOIN users u ON ecr.user_id = u.id WHERE ecr.campaign_id = $1 LIMIT 1',
      [3]
    );
    
    if (recipients.rows.length === 0) {
      console.log('No recipients found for campaign 3');
      return;
    }
    
    console.log('Found recipient:', recipients.rows[0].email);
    
    // Test the attachment processing logic
    
    if (campaignData.attachment_urls && campaignData.attachment_urls.length > 0) {
      console.log('Processing attachments...');
      
      for (const attachmentUrl of campaignData.attachment_urls) {
        console.log('Processing attachment URL:', attachmentUrl);
        
        // Convert URL to file path
        const filePath = attachmentUrl.replace('/api/', '');
        console.log('Looking for file at:', filePath);
        
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          console.log(`✅ Attachment file found: ${filePath} (${stats.size} bytes)`);
          
          // Test base64 conversion
          const fileContent = fs.readFileSync(filePath);
          const base64Content = fileContent.toString('base64');
          const fileName = path.basename(filePath);
          
          console.log(`📎 Attachment prepared: ${fileName} (${base64Content.length} base64 chars)`);
          
          const attachment = {
            content: base64Content,
            filename: fileName,
            type: 'application/octet-stream',
            disposition: 'attachment'
          };
          
          console.log('Attachment object created successfully');
        } else {
          console.log(`❌ Attachment file not found: ${filePath}`);
        }
      }
    } else {
      console.log('No attachments to process');
    }
    
  } catch (error) {
    console.error('Error testing attachment email:', error);
  } finally {
    await client.end();
  }
}

testAttachmentEmail();