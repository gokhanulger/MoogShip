import express from "express";
import { z } from "zod";
import { storage } from "./storage";
import { insertEmailCampaignSchema } from "@shared/schema";
import { MailService } from '@sendgrid/mail';

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
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
}

async function sendEmail(params: EmailParams): Promise<{ success: boolean; error?: any }> {
  try {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error("SENDGRID_API_KEY environment variable must be set");
    }
    
    // Validate email parameters
    if (!params.to || !params.from || !params.subject) {
      throw new Error("Missing required email parameters: to, from, and subject are required");
    }
    
    // Ensure proper email format
    const emailData: any = {
      to: params.to.trim(),
      from: params.from.trim(),
      subject: params.subject.trim(),
      text: params.text || "",
      html: params.html || "",
    };

    // Add attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      emailData.attachments = params.attachments;
    }

    console.log(`Sending email to ${emailData.to} from ${emailData.from} with subject "${emailData.subject}"`);
    
    const response = await mailService.send(emailData);
    console.log(`Email sent successfully with status ${response[0].statusCode}`);
    return { success: true };
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    // Extract more detailed error information
    let errorMessage = 'Unknown email error';
    if (error.response && error.response.body) {
      errorMessage = JSON.stringify(error.response.body);
      console.error('SendGrid response body:', error.response.body);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: { message: errorMessage, originalError: error } };
  }
}
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/email-attachments/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Only images and documents are allowed"));
    }
  }
});

// Middleware to check admin access
const requireAdmin = async (req: any, res: any, next: any) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(403).json({ error: "Authentication required" });
    }

    // Get fresh user data from database to verify admin status
    const user = await storage.getUser(req.user.id);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user; // Update with fresh user data
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    return res.status(403).json({ error: "Admin verification failed" });
  }
};

// Create email campaign
router.post("/", requireAdmin, upload.array("attachments", 5), async (req, res) => {
  try {
    const validation = insertEmailCampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid campaign data", 
        details: validation.error.errors 
      });
    }

    const attachmentUrls: string[] = [];
    
    // Process uploaded files
    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `uploads/email-attachments/${fileName}`;
        
        // Move file to permanent location
        fs.renameSync(file.path, filePath);
        attachmentUrls.push(`/api/uploads/email-attachments/${fileName}`);
      }
    }

    const campaignData = {
      ...validation.data,
      attachmentUrls,
      createdBy: req.user!.id
    };

    const campaign = await storage.createEmailCampaign(campaignData);
    res.json(campaign);
  } catch (error) {
    console.error("Error creating email campaign:", error);
    res.status(500).json({ error: "Failed to create email campaign" });
  }
});

// Get all email campaigns
router.get("/", requireAdmin, async (req, res) => {
  try {
    const campaigns = await storage.getEmailCampaigns();
    res.json(campaigns);
  } catch (error) {
    console.error("Error getting email campaigns:", error);
    res.status(500).json({ error: "Failed to get email campaigns" });
  }
});

// Get single email campaign
router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await storage.getEmailCampaign(id);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error getting email campaign:", error);
    res.status(500).json({ error: "Failed to get email campaign" });
  }
});

// Update email campaign
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const campaign = await storage.updateEmailCampaign(id, req.body);
    
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json(campaign);
  } catch (error) {
    console.error("Error updating email campaign:", error);
    res.status(500).json({ error: "Failed to update email campaign" });
  }
});

// Delete email campaign
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteEmailCampaign(id);
    
    if (!success) {
      return res.status(404).json({ error: "Campaign not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting email campaign:", error);
    res.status(500).json({ error: "Failed to delete email campaign" });
  }
});

// Send email campaign to selected users
router.post("/:id/send", requireAdmin, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: "No users selected" });
    }

    const campaign = await storage.getEmailCampaign(campaignId);
    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Create recipient records
    await storage.sendEmailCampaign(campaignId, userIds);

    // Get recipients to send emails
    const recipients = await storage.getEmailCampaignRecipients(campaignId);
    
    // Send emails asynchronously
    processEmailCampaign(campaignId, campaign, recipients);
    
    res.json({ 
      success: true, 
      message: `Campaign scheduled for ${recipients.length} recipients` 
    });
  } catch (error) {
    console.error("Error sending email campaign:", error);
    res.status(500).json({ error: "Failed to send email campaign" });
  }
});

// Get campaign recipients and their status
router.get("/:id/recipients", requireAdmin, async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const recipients = await storage.getEmailCampaignRecipients(campaignId);
    res.json(recipients);
  } catch (error) {
    console.error("Error getting campaign recipients:", error);
    res.status(500).json({ error: "Failed to get campaign recipients" });
  }
});

// Get all users for recipient selection
router.get("/users/list", requireAdmin, async (req, res) => {
  try {
    const { search, role } = req.query;
    const users = await storage.getAllUsers(search as string);
    
    // Filter by role if specified
    const filteredUsers = role ? 
      users.filter(user => user.role === role) : 
      users;
      
    // Return user list with essential info only
    const userList = filteredUsers.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyName: user.companyName,
      isApproved: user.isApproved
    }));
    
    res.json(userList);
  } catch (error) {
    console.error("Error getting users list:", error);
    res.status(500).json({ error: "Failed to get users list" });
  }
});

// Process email campaign asynchronously
async function processEmailCampaign(campaignId: number, campaign: any, recipients: any[]) {
  let successCount = 0;
  let failureCount = 0;
  
  // Use verified sender address
  const fromAddress = process.env.VERIFIED_SENDER_EMAIL || "cs@moogship.com";
  
  console.log(`Starting email campaign ${campaignId} for ${recipients.length} recipients`);
  console.log(`Using sender address: ${fromAddress}`);
  
  // Process attachments if they exist
  let attachments: any[] = [];
  if (campaign.attachmentUrls && campaign.attachmentUrls.length > 0) {
    const fs = require('fs');
    const path = require('path');
    
    for (const attachmentUrl of campaign.attachmentUrls) {
      try {
        // Convert URL to file path (remove /api prefix)
        const filePath = attachmentUrl.replace('/api/', '');
        
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath);
          const base64Content = fileContent.toString('base64');
          const fileName = path.basename(filePath);
          
          attachments.push({
            content: base64Content,
            filename: fileName,
            type: 'application/octet-stream',
            disposition: 'attachment'
          });
          
          console.log(`📎 Prepared attachment: ${fileName} (${(fileContent.length / 1024).toFixed(1)}KB)`);
        } else {
          console.log(`⚠️ Attachment file not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error processing attachment ${attachmentUrl}:`, error);
      }
    }
  }

  // Process emails in smaller batches to avoid rate limiting
  const batchSize = 1; // Send 1 email per batch to avoid rate limits
  const batchDelay = 2000; // 2 second delay between batches
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recipients.length/batchSize)}: ${batch.length} emails`);
    
    // Process batch in parallel but with controlled concurrency
    const batchPromises = batch.map(async (recipient) => {
      try {
        const emailResult = await sendEmail({
          to: recipient.email,
          from: fromAddress,
          subject: campaign.subject,
          html: campaign.content,
          text: campaign.textContent || "",
          attachments: attachments.length > 0 ? attachments : undefined
        });

        if (emailResult.success) {
          await storage.updateEmailCampaignRecipientStatus(recipient.id, "sent");
          successCount++;
          console.log(`✅ Email sent successfully to ${recipient.email}`);
        } else {
          const errorMessage = emailResult.error?.message || "Unknown error";
          await storage.updateEmailCampaignRecipientStatus(
            recipient.id, 
            "failed", 
            errorMessage
          );
          failureCount++;
          
          // Check if it's a sender verification issue
          if (errorMessage.includes("verified Sender Identity")) {
            console.log(`❌ Sender verification required for ${recipient.email}: ${errorMessage}`);
          } else {
            console.log(`❌ Email failed to ${recipient.email}: ${errorMessage}`);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error sending email to ${recipient.email}:`, errorMessage);
        
        await storage.updateEmailCampaignRecipientStatus(
          recipient.id, 
          "failed", 
          errorMessage
        );
        failureCount++;
      }
    });
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Delay between batches (except for the last batch)
    if (i + batchSize < recipients.length) {
      console.log(`Waiting ${batchDelay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, batchDelay));
    }
  }

  // Update campaign with final statistics
  await storage.updateEmailCampaign(campaignId, {
    status: failureCount === recipients.length ? "failed" : "sent",
    successfulSends: successCount,
    failedSends: failureCount,
    sentAt: new Date()
  });

  console.log(`Campaign ${campaignId} completed: ${successCount} sent, ${failureCount} failed`);
  
  // Log sender verification guidance if all emails failed due to verification
  if (failureCount > 0 && successCount === 0) {
    console.log('\n📧 Email Campaign Setup Required:');
    console.log('1. Log into your SendGrid account');
    console.log('2. Go to Settings > Sender Authentication');
    console.log('3. Verify a sender identity (recommended: your domain)');
    console.log('4. Set VERIFIED_SENDER_EMAIL environment variable');
  }
}

// Serve uploaded attachments
router.get("/uploads/email-attachments/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "../uploads/email-attachments", filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

export default router;