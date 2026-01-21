import express, { Request, Response } from "express";
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { google } from 'googleapis';
import { db } from "./db";
import { emailConnections, emailSyncLog, etsyOrders } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { parseEtsyOrderEmail } from './etsy-email-parser';
import { fetchRawEtsyEmail } from './fetch-raw-etsy-email';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();
const OAuth2 = google.auth.OAuth2;

// Gmail OAuth2 configuration
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.APP_URL
  ? `${process.env.APP_URL}/api/email/oauth/callback`
  : 'https://app.moogship.com/api/email/oauth/callback';

// Auth middleware
const authenticateUser = (req: Request, res: Response, next: any) => {
  const passportSession = req.session as any;
  if (!passportSession?.passport?.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Get all email connections for user
router.get("/connections", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    console.log('[EMAIL] Getting connections for user:', userId);
    
    const connections = await db.select()
      .from(emailConnections)
      .where(eq(emailConnections.userId, userId))
      .orderBy(desc(emailConnections.createdAt));
    
    // Mask sensitive data
    const safeConnections = connections.map(conn => ({
      ...conn,
      accessToken: conn.accessToken ? '***' : null,
      refreshToken: conn.refreshToken ? '***' : null,
      imapPassword: conn.imapPassword ? '***' : null
    }));
    
    res.json(safeConnections);
  } catch (error) {
    console.error('[EMAIL] Error getting connections:', error);
    res.status(500).json({ error: "Failed to get email connections" });
  }
});

// Create IMAP connection
router.post("/connect/imap", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    const { email, password, host, port } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    
    console.log('[EMAIL] Testing IMAP connection for:', email);
    
    // Determine provider and settings
    let provider = 'other';
    let imapHost = host;
    let imapPort = port || 993;
    
    if (email.includes('@gmail.com')) {
      provider = 'gmail';
      imapHost = 'imap.gmail.com';
      imapPort = 993;
    } else if (email.includes('@outlook.com') || email.includes('@hotmail.com')) {
      provider = 'outlook';
      imapHost = 'outlook.office365.com';
      imapPort = 993;
    }
    
    // Test connection
    const client = new ImapFlow({
      host: imapHost,
      port: imapPort,
      secure: true,
      auth: {
        user: email,
        pass: password
      },
      logger: false
    });
    
    try {
      await client.connect();
      console.log('[EMAIL] IMAP connection successful');
      
      // Get mailbox info
      await client.mailboxOpen('INBOX');
      const mailboxInfo = client.mailbox;
      
      // Convert BigInt values to numbers/strings for JSON serialization
      const safeMailboxInfo = mailboxInfo ? {
        name: mailboxInfo.name,
        exists: Number(mailboxInfo.exists || 0),
        recent: Number(mailboxInfo.recent || 0),
        unseen: Number(mailboxInfo.unseen || 0),
        uidValidity: mailboxInfo.uidValidity ? mailboxInfo.uidValidity.toString() : null,
        uidNext: mailboxInfo.uidNext ? mailboxInfo.uidNext.toString() : null
      } : null;
      
      await client.logout();
      
      // Save connection to database
      const [connection] = await db.insert(emailConnections).values({
        userId,
        email,
        provider,
        connectionType: 'imap',
        imapHost,
        imapPort,
        imapUsername: email,
        imapPassword: password, // In production, encrypt this!
        connectionStatus: 'connected',
        isActive: true,
        syncEnabled: true,
        syncFrequency: 60
      }).returning();
      
      res.json({ 
        success: true, 
        connection: {
          ...connection,
          imapPassword: '***'
        },
        mailboxInfo: safeMailboxInfo
      });
      
    } catch (error: any) {
      console.error('[EMAIL] IMAP connection failed:', error);
      
      // Always try to close the connection on error
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
      
      let errorMessage = 'Connection failed';
      if (error.authenticationFailed) {
        errorMessage = 'Invalid email or password. For Gmail, use an app-specific password.';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'Connection timeout. Check your network and IMAP settings.';
      }
      
      res.status(400).json({ error: errorMessage });
    }
    
  } catch (error) {
    console.error('[EMAIL] Error creating IMAP connection:', error);
    res.status(500).json({ error: "Failed to create email connection" });
  }
});

// Scan emails for Etsy orders
router.get("/connection/:id/scan", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    const connectionId = parseInt(req.params.id);
    
    console.log('[EMAIL] Scanning emails for connection:', connectionId);
    
    // Get connection details
    const [connection] = await db.select()
      .from(emailConnections)
      .where(and(
        eq(emailConnections.id, connectionId),
        eq(emailConnections.userId, userId)
      ));
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    if (connection.connectionType !== 'imap' || !connection.imapPassword) {
      return res.status(400).json({ error: "Invalid connection type" });
    }
    
    // Connect to IMAP
    const client = new ImapFlow({
      host: connection.imapHost!,
      port: connection.imapPort!,
      secure: true,
      auth: {
        user: connection.imapUsername!,
        pass: connection.imapPassword
      },
      logger: false
    });
    
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
    
    // Calculate date 2 weeks ago  
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    // Search for Etsy order emails from last 2 weeks
    const searchCriteria = {
      from: connection.etsyEmailFilter || 'transaction@etsy.com',
      since: twoWeeksAgo
    };
    
    console.log('[EMAIL] Searching for emails from:', searchCriteria.from, 'since:', twoWeeksAgo.toISOString());
    
    // Use IMAP search to filter emails
    const searchResults = await client.search(searchCriteria);
    
    console.log(`[EMAIL] Found ${searchResults.length} Etsy emails to process`);
    
    let processedCount = 0;
    let importedCount = 0;
    
    // Process each matching email
    for (const seq of searchResults) {
      const msg = await client.fetchOne(seq, { envelope: true, source: true });
      
      if (!msg || !msg.envelope) {
        console.log('[EMAIL] Skipping message - no envelope');
        continue;
      }
      
      const envelope = msg.envelope;
      console.log('[EMAIL] Processing email from:', envelope.from?.[0]?.address, 'subject:', envelope.subject);
      
      // Only process "You made a sale on Etsy" emails from transaction@etsy.com
      const isEtsySaleEmail = envelope.from && 
                              envelope.from[0].address === 'transaction@etsy.com' &&
                              envelope.subject && 
                              envelope.subject.toLowerCase().startsWith('you made a sale on etsy');
      
      if (isEtsySaleEmail) {
        console.log('[EMAIL] Processing Etsy sale notification');
        
        // Parse the email
        const parsed = await simpleParser(msg.source);
        
        // Save raw email HTML to a file for debugging
        if (parsed.html) {
          const fs = require('fs').promises;
          const path = require('path');
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const orderNumMatch = envelope.subject?.match(/Order\s*#(\d+)/i);
          const orderNum = orderNumMatch ? orderNumMatch[1] : 'unknown';
          const fileName = `etsy_email_order_${orderNum}_${timestamp}.html`;
          const filePath = path.join('logs', fileName);
          
          try {
            await fs.writeFile(filePath, parsed.html);
            console.log(`[EMAIL] Saved raw HTML to ${filePath}`);
          } catch (err) {
            console.error('[EMAIL] Failed to save raw HTML:', err);
          }
        }
        
        // Check if already processed
        const [existing] = await db.select()
          .from(emailSyncLog)
          .where(and(
            eq(emailSyncLog.emailConnectionId, connectionId),
            eq(emailSyncLog.messageId, envelope.messageId || '')
          ));
        
        if (existing) {
          console.log('[EMAIL] Already processed message:', envelope.messageId);
          continue;
        }
        
        processedCount++;
        
        // Parse order details from email
        const orderData = parseEtsyOrderEmail(parsed);
        
        if (orderData) {
          // Check if order already exists
          const existingOrder = await db.select()
            .from(etsyOrders)
            .where(eq(etsyOrders.receiptId, orderData.orderNumber))
            .limit(1);
          
          if (existingOrder.length > 0) {
            console.log('[EMAIL] Order already exists, skipping:', orderData.orderNumber);
            // Mark as processed even though it's a duplicate
            await db.insert(emailSyncLog).values({
              emailConnectionId: connectionId,
              userId,
              messageId: envelope.messageId || '',
              emailDate: envelope.date || new Date(),
              subject: envelope.subject || '',
              sender: envelope.from[0].address || '',
              processedSuccessfully: true,
              errorMessage: 'Order already exists in database',
              orderId: orderData.orderNumber,
              etsyOrderCreated: false
            });
            continue; // Skip to next email
          }
          
          // Create Etsy order
          const [order] = await db.insert(etsyOrders).values({
            userId,
            etsyConnectionId: 1, // Manual connection ID
            receiptId: orderData.orderNumber,
            orderNumber: orderData.orderNumber,
            orderDate: envelope.date || new Date(),
            buyerName: orderData.buyerName,
            buyerEmail: orderData.buyerEmail,
            shipToName: orderData.shipToName,
            shipToAddress1: orderData.shipToAddress1,
            shipToAddress2: orderData.shipToAddress2 || '',
            shipToCity: orderData.shipToCity,
            shipToState: orderData.shipToState,
            shipToCountry: orderData.shipToCountry || 'USA',
            shipToZip: orderData.shipToZip,
            grandTotal: Math.round((orderData.orderTotal || 0) * 100), // Convert to cents safely
            subtotal: Math.round((orderData.subtotal || 0) * 100),
            shippingCost: Math.round((orderData.shippingCost || 0) * 100),
            taxTotal: Math.round((orderData.taxTotal || 0) * 100),
            currency: orderData.currency || 'USD',
            items: orderData.items || [],
            orderStatus: 'pending'
          }).returning();
          
          importedCount++;
          console.log('[EMAIL] Imported order:', order.receiptId);
          
          // Log successful processing
          await db.insert(emailSyncLog).values({
            emailConnectionId: connectionId,
            userId,
            messageId: envelope.messageId || '',
            emailDate: envelope.date || new Date(),
            subject: envelope.subject || '',
            sender: envelope.from[0].address || '',
            processedSuccessfully: true,
            orderId: orderData.orderNumber,
            etsyOrderCreated: true
          });
        } else {
          console.log('[EMAIL] Could not parse order from email');
          // Log failed processing
          await db.insert(emailSyncLog).values({
            emailConnectionId: connectionId,
            userId,
            messageId: envelope.messageId || '',
            emailDate: envelope.date || new Date(),
            subject: envelope.subject || '',
            sender: envelope.from[0].address || '',
            processedSuccessfully: false,
            errorMessage: 'Could not parse order details',
            etsyOrderCreated: false
          });
        }
      } else {
        console.log('[EMAIL] Email does not match Etsy order criteria');
      }
    }
    
    // Update connection stats
    await db.update(emailConnections)
      .set({
        lastSyncAt: new Date(),
        totalEmailsProcessed: connection.totalEmailsProcessed + processedCount,
        totalOrdersImported: connection.totalOrdersImported + importedCount,
        updatedAt: new Date()
      })
      .where(eq(emailConnections.id, connectionId));
    
    await client.logout();
    
    res.json({
      success: true,
      processed: processedCount,
      imported: importedCount,
      message: `Scanned emails and imported ${importedCount} new orders`
    });
    
    } catch (scanError) {
      console.error('[EMAIL] Error during email scan:', scanError);
      // Always try to close the connection on error
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
      
      // Update connection with error
      await db.update(emailConnections)
        .set({
          lastSyncAt: new Date(),
          lastSyncError: scanError.message || 'Unknown error',
          connectionStatus: 'error',
          updatedAt: new Date()
        })
        .where(eq(emailConnections.id, connectionId));
      
      throw scanError;
    }
    
  } catch (error) {
    console.error('[EMAIL] Error scanning emails:', error);
    res.status(500).json({ error: "Failed to scan emails" });
  }
});

// OLD PARSER - Replaced with specialized parser in etsy-email-parser.ts
// Keeping this for reference but not used
function OLD_parseEtsyOrderEmail(parsed: any): any {
  try {
    // First, try to extract order info from the subject line
    // Format: "You made a sale on Etsy - Ship by DATE - [$PRICE, Order #NUMBER]"
    const subject = parsed.subject || '';
    let orderNumber = '';
    let orderTotal = 0;
    
    // Extract order number from subject
    const orderNumMatch = subject.match(/Order\s*#(\d+)/i);
    if (orderNumMatch) {
      orderNumber = orderNumMatch[1];
    }
    
    // Extract price from subject
    const priceMatch = subject.match(/\$([0-9,]+(?:\.\d{2})?)/);
    if (priceMatch) {
      orderTotal = parseFloat(priceMatch[1].replace(',', ''));
    }
    
    // Get both text and HTML content
    let text = parsed.text || '';
    let html = parsed.html || '';
    
    // Clean up HTML for better text extraction
    if (html) {
      text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<\/td>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    const order: any = {
      orderNumber: orderNumber, // Use order number from subject if found
      buyerName: '',
      buyerEmail: '',
      shipToName: '',
      shipToAddress1: '',
      shipToAddress2: '',
      shipToCity: '',
      shipToState: '',
      shipToCountry: 'USA',
      shipToZip: '',
      orderTotal: orderTotal, // Use price from subject if found
      subtotal: orderTotal,
      shippingCost: 0,
      taxTotal: 0,
      currency: 'USD',
      items: []
    };
    
    // If we don't have order number from subject, extract from body
    if (!order.orderNumber) {
      // Look for "Your order number is XXXXX" (Etsy format)
      const orderBodyMatch = text.match(/Your\s+order\s+number\s+is\s+(\d+)/i);
      if (orderBodyMatch) {
        order.orderNumber = orderBodyMatch[1];
      } else {
        // Try other patterns
        const orderPatterns = [
          /Order\s*#?\s*(\d{9,})/i,
          /Order\s+ID[:\s]+(\d+)/i,
          /Transaction\s+ID:\s*(\d+)/i
        ];
        
        for (const pattern of orderPatterns) {
          const match = text.match(pattern);
          if (match) {
            order.orderNumber = match[1];
            break;
          }
        }
      }
    }
    
    // Extract Transaction ID as fallback
    const transactionMatch = text.match(/Transaction\s+ID:\s*(\d+)/i);
    if (!order.orderNumber && transactionMatch) {
      order.orderNumber = `TX-${transactionMatch[1]}`;
    }
    
    // Extract buyer/shipping name from address section
    // Look for name in Shipping Address section (Etsy format)
    const shippingAddressSection = text.match(/Shipping\s+Address:[\s\S]*?(?:(?:\n\n)|(?:----)|$)/i);
    if (shippingAddressSection) {
      const addressText = shippingAddressSection[0];
      // Look for the name right after "Shipping Address:" - typically in all caps
      // Name comes before the street address (which starts with numbers)
      const lines = addressText.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        // Skip the "Shipping Address:" line, look at the next non-empty line
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          // If this line doesn't start with a number and looks like a name
          if (!line.match(/^\d/) && line.match(/^[A-Z][A-Z\s]+$/)) {
            // Convert from all caps to proper case
            order.buyerName = order.shipToName = line.split(' ')
              .map(word => word.charAt(0) + word.slice(1).toLowerCase())
              .join(' ');
            break;
          }
        }
      }
    }
    
    // If still no name, try other patterns
    if (!order.buyerName) {
      const namePatterns = [
        /^([A-Z][A-Z\s]+?)$/m, // All caps name on its own line
        /Ship\s+to[:\s]+([A-Za-z]+(?:\s+[A-Za-z]+)+)/i,
        /To[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?=\s+\d)/
      ];
      
      for (const pattern of namePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Filter out non-name words
          if (!name.match(/^(Order|Receipt|Etsy|Transaction|Ship|Total|Item|Shipping)/i)) {
            order.buyerName = order.shipToName = name;
            break;
          }
        }
      }
    }
    
    // Extract email address - look for "Email [address]" pattern first (Etsy format)
    const emailLineMatch = text.match(/(?:\*\s+)?Email\s+([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailLineMatch) {
      order.buyerEmail = emailLineMatch[1];
    } else {
      // Fallback to general email pattern
      const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const emailMatches = text.match(emailPattern) || [];
      for (const email of emailMatches) {
        if (!email.includes('etsy') && !email.includes('etsymail') && !email.includes('mail.etsy')) {
          order.buyerEmail = email;
          break;
        }
      }
    }
    
    // Extract complete address from Shipping Address section
    if (shippingAddressSection) {
      const addressText = shippingAddressSection[0];
      
      // Extract street address (number + street name)
      const streetPattern = /(\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Boulevard|Blvd|Way|Circle|Cir|Trail|Trl|Parkway|Pkwy|ST|AVE|RD)\.?)/i;
      const streetMatch = addressText.match(streetPattern);
      if (streetMatch) {
        order.shipToAddress1 = streetMatch[1].trim();
      }
      
      // Extract city, state, zip - look for pattern like "SAMMAMISH, WA 98075"
      const cityStateZipPattern = /([A-Z][A-Z]+(?:\s+[A-Z]+)*)[,\s]+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/i;
      const cszMatch = addressText.match(cityStateZipPattern);
      if (cszMatch) {
        // Convert city from all caps to proper case
        order.shipToCity = cszMatch[1].trim().split(' ')
          .map(word => word.charAt(0) + word.slice(1).toLowerCase())
          .join(' ');
        order.shipToState = cszMatch[2].trim();
        order.shipToZip = cszMatch[3].trim();
      }
    }
    
    // If we didn't find address in shipping section, try general patterns
    if (!order.shipToAddress1) {
      const addressBlockPattern = /(\d+\s+[^,\n]+)[,\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)[,\s]+([A-Z]{2})[,\s]+(\d{5}(?:-\d{4})?)/;
      const addressMatch = text.match(addressBlockPattern);
      
      if (addressMatch) {
        order.shipToAddress1 = addressMatch[1].trim();
        order.shipToCity = addressMatch[2].trim();
        order.shipToState = addressMatch[3].trim();
        order.shipToZip = addressMatch[4].trim();
      }
    }
    
    // Extract prices - if we don't have total from subject, get from body
    if (!order.orderTotal || order.orderTotal === 0) {
      const totalPatterns = [
        /Order\s+Total:\s*\$?([0-9,]+(?:\.\d{2})?)/i, // Etsy format
        /Total:\s*\$?([0-9,]+(?:\.\d{2})?)/i,
        /Grand\s+total:\s*\$?([0-9,]+(?:\.\d{2})?)/i
      ];
      
      for (const pattern of totalPatterns) {
        const match = text.match(pattern);
        if (match) {
          order.orderTotal = parseFloat(match[1].replace(',', ''));
          order.subtotal = order.orderTotal; // Default subtotal to total
          break;
        }
      }
    }
    
    // Extract item total (subtotal before tax/shipping)
    const itemTotalMatch = text.match(/Item\s+total:\s*\$?([0-9,]+(?:\.\d{2})?)/i);
    if (itemTotalMatch) {
      order.subtotal = parseFloat(itemTotalMatch[1].replace(',', ''));
    }
    
    // Extract shipping cost
    const shippingPattern = /Shipping[:\s]+\$?(\d+(?:\.\d{2})?)/i;
    const shippingMatch = text.match(shippingPattern);
    if (shippingMatch) {
      order.shippingCost = parseFloat(shippingMatch[1]);
      // Adjust subtotal if we have shipping
      if (order.orderTotal > 0 && order.shippingCost > 0) {
        order.subtotal = order.orderTotal - order.shippingCost;
      }
    }
    
    // Extract tax (including Sales Tax)
    const taxPattern = /(?:Sales\s+)?Tax:\s*\$?([0-9,]+(?:\.\d{2})?)/i;
    const taxMatch = text.match(taxPattern);
    if (taxMatch) {
      order.taxTotal = parseFloat(taxMatch[1].replace(',', ''));
      // Adjust subtotal if we have tax
      if (order.orderTotal > 0 && order.taxTotal > 0 && order.subtotal === order.orderTotal) {
        order.subtotal = order.orderTotal - order.taxTotal - order.shippingCost;
      }
    }
    
    // Extract items - Etsy specific format
    // Look for "Item: [name]" followed by "Quantity: [qty]" and "Item price: [price]"
    const etsyItemPattern = /Item:\s*([^\n]+)[\s\S]*?Quantity:\s*(\d+)[\s\S]*?Item\s+price:\s*\$?([0-9,]+(?:\.\d{2})?)/gi;
    let etsyItemMatch;
    while ((etsyItemMatch = etsyItemPattern.exec(text)) !== null) {
      const itemName = etsyItemMatch[1].trim();
      const quantity = parseInt(etsyItemMatch[2]);
      const price = parseFloat(etsyItemMatch[3].replace(',', ''));
      
      if (itemName && quantity && price) {
        order.items.push({
          title: itemName.substring(0, 200), // Limit title length
          quantity: quantity,
          price: price
        });
      }
    }
    
    // If no items found with Etsy pattern, try generic patterns
    const itemPatterns = [
      /([A-Za-z][A-Za-z0-9\s,'\-\.]+?)\s+x\s*(\d+)\s+\$?(\d+(?:\.\d{2})?)/g,
      /(\d+)\s+x\s+([A-Za-z][A-Za-z0-9\s,'\-\.]+?)\s+\$?(\d+(?:\.\d{2})?)/g
    ];
    
    let itemsFound = order.items.length > 0;
    if (!itemsFound) {
      for (const pattern of itemPatterns) {
        const matches = [...text.matchAll(pattern)];
        if (matches.length > 0) {
          for (const match of matches) {
            let title, quantity, price;
            
            // Handle different capture group orders
            if (pattern.source.startsWith('(\\d+)')) {
              quantity = parseInt(match[1]);
              title = match[2].trim();
              price = parseFloat(match[3]);
            } else {
              title = match[1].trim();
              quantity = parseInt(match[2]);
              price = parseFloat(match[3]);
            }
            
            // Filter out non-item lines
            if (!title.match(/^(shipping|tax|total|subtotal|order|receipt)/i) && 
                quantity > 0 && price > 0) {
              order.items.push({
                title: title,
                quantity: quantity,
                price: Math.round(price * 100) // Convert to cents
              });
              itemsFound = true;
            }
          }
          if (itemsFound) break;
        }
      }
    }
    
    // If no items found, create a generic item
    if (order.items.length === 0 && order.orderTotal > 0) {
      order.items.push({
        title: 'Etsy Purchase',
        quantity: 1,
        price: Math.round(order.subtotal * 100)
      });
    }
    
    // Generate order number if not found but have other data
    if (!order.orderNumber && parsed.messageId) {
      // Use message ID to generate unique order number
      const hash = parsed.messageId.replace(/[<>@]/g, '').substring(0, 10).toUpperCase();
      order.orderNumber = `ETY${Date.now()}${hash}`.substring(0, 20);
    }
    
    // Log what we parsed for debugging
    console.log('[EMAIL] Parsed order data:', {
      orderNumber: order.orderNumber,
      name: order.shipToName,
      address: order.shipToAddress1,
      city: order.shipToCity,
      total: order.orderTotal
    });
    
    // If we still don't have a buyer name, use a placeholder
    if (!order.buyerName && !order.shipToName) {
      order.buyerName = order.shipToName = 'Etsy Customer';
    }
    
    // Return if we have at least an order number and total
    // Be more lenient since Etsy emails may not always have complete address info
    if (order.orderNumber && order.orderTotal > 0) {
      console.log('[EMAIL] Successfully parsed order:', order.orderNumber, 'Total:', order.orderTotal);
      return order;
    }
    
    // Also return if we have just an order number (can get price later)
    if (order.orderNumber) {
      console.log('[EMAIL] Parsed order with number only:', order.orderNumber);
      return order;
    }
    
    console.log('[EMAIL] Insufficient order data - need at least order number');
    return null;
    
  } catch (error) {
    console.error('[EMAIL] Error parsing Etsy email:', error);
    return null;
  }
}

// Delete email connection
router.delete("/connections/:id", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    const connectionId = parseInt(req.params.id);
    
    console.log('[EMAIL] Deleting connection:', connectionId);
    
    await db.delete(emailConnections)
      .where(and(
        eq(emailConnections.id, connectionId),
        eq(emailConnections.userId, userId)
      ));
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('[EMAIL] Error deleting connection:', error);
    res.status(500).json({ error: "Failed to delete connection" });
  }
});

// Test email connection
router.post("/test/:connectionId", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    const connectionId = parseInt(req.params.connectionId);
    
    console.log('[EMAIL] Testing connection:', connectionId);
    
    // Get connection details
    const [connection] = await db.select()
      .from(emailConnections)
      .where(and(
        eq(emailConnections.id, connectionId),
        eq(emailConnections.userId, userId)
      ));
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    // Test IMAP connection
    const client = new ImapFlow({
      host: connection.imapHost!,
      port: connection.imapPort!,
      secure: true,
      auth: {
        user: connection.imapUsername!,
        pass: connection.imapPassword!
      },
      logger: false
    });
    
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
      const mailboxInfo = client.mailbox;
      
      // Convert BigInt values to numbers/strings for JSON serialization
      const safeMailboxInfo = mailboxInfo ? {
        name: mailboxInfo.name,
        exists: Number(mailboxInfo.exists || 0),
        recent: Number(mailboxInfo.recent || 0),
        unseen: Number(mailboxInfo.unseen || 0),
        uidValidity: mailboxInfo.uidValidity ? mailboxInfo.uidValidity.toString() : null,
        uidNext: mailboxInfo.uidNext ? mailboxInfo.uidNext.toString() : null
      } : null;
      
      await client.logout();
      
      // Update connection status
      await db.update(emailConnections)
        .set({
          connectionStatus: 'connected',
          lastSyncError: null,
          updatedAt: new Date()
        })
        .where(eq(emailConnections.id, connectionId));
      
      res.json({ 
        success: true,
        mailboxInfo: safeMailboxInfo,
        message: 'Connection test successful'
      });
    } catch (testError: any) {
      console.error('[EMAIL] Connection test failed:', testError);
      
      // Always try to close the connection on error
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
      
      // Update connection status
      await db.update(emailConnections)
        .set({
          connectionStatus: 'error',
          lastSyncError: testError.message || 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(emailConnections.id, connectionId));
      
      throw testError;
    }
    
  } catch (error: any) {
    console.error('[EMAIL] Connection test failed:', error);
    
    // Update connection status
    await db.update(emailConnections)
      .set({
        connectionStatus: 'error',
        lastSyncError: error.message,
        updatedAt: new Date()
      })
      .where(eq(emailConnections.id, parseInt(req.params.connectionId)));
    
    res.status(400).json({ 
      error: 'Connection test failed',
      details: error.message
    });
  }
});

// TEMPORARY FIX - Making POST route work until browser cache is cleared
router.post("/scan/:connectionId", authenticateUser, async (req: Request, res: Response) => {
  try {
    const passportSession = req.session as any;
    const userId = passportSession.passport.user;
    const connectionId = parseInt(req.params.connectionId);
    
    console.log('[EMAIL] POST scan called for connection:', connectionId, '- using new parser');
    
    // Get connection details
    const [connection] = await db.select()
      .from(emailConnections)
      .where(and(
        eq(emailConnections.id, connectionId),
        eq(emailConnections.userId, userId)
      ));
    
    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }
    
    if (connection.connectionType !== 'imap' || !connection.imapPassword) {
      return res.status(400).json({ error: "Invalid connection type" });
    }
    
    // Connect to IMAP
    const client = new ImapFlow({
      host: connection.imapHost!,
      port: connection.imapPort!,
      secure: true,
      auth: {
        user: connection.imapUsername!,
        pass: connection.imapPassword
      },
      logger: false
    });
    
    try {
      await client.connect();
      await client.mailboxOpen('INBOX');
    
      // Calculate date 2 weeks ago  
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      // Search for Etsy order emails from last 2 weeks
      const searchCriteria = {
        from: connection.etsyEmailFilter || 'transaction@etsy.com',
        since: twoWeeksAgo
      };
      
      console.log('[EMAIL] Searching for emails from:', searchCriteria.from, 'since:', twoWeeksAgo.toISOString());
      
      // Use IMAP search to filter emails
      const searchResults = await client.search(searchCriteria);
      
      console.log(`[EMAIL] Found ${searchResults.length} Etsy emails to process`);
      
      let processedCount = 0;
      let importedCount = 0;
      
      // Process each matching email
      for (const seq of searchResults) {
        const msg = await client.fetchOne(seq, { envelope: true, source: true });
        
        if (!msg || !msg.envelope) {
          console.log('[EMAIL] Skipping message - no envelope');
          continue;
        }
        
        const envelope = msg.envelope;
        console.log('[EMAIL] Processing email from:', envelope.from?.[0]?.address, 'subject:', envelope.subject);
        
        // Only process "You made a sale on Etsy" emails from transaction@etsy.com
        const isEtsySaleEmail = envelope.from && 
                                envelope.from[0].address === 'transaction@etsy.com' &&
                                envelope.subject && 
                                envelope.subject.toLowerCase().startsWith('you made a sale on etsy');
        
        if (isEtsySaleEmail) {
          console.log('[EMAIL] Processing Etsy sale notification');
          
          // Parse the email
          const parsed = await simpleParser(msg.source);
          
          // Save raw email HTML to a file for debugging
          if (parsed.html) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const orderNumMatch = envelope.subject?.match(/Order\s*#(\d+)/i);
            const orderNum = orderNumMatch ? orderNumMatch[1] : 'unknown';
            const fileName = `etsy_email_order_${orderNum}_${timestamp}.html`;
            
            try {
              // Ensure logs directory exists
              await fs.mkdir('logs', { recursive: true });
              const filePath = path.join('logs', fileName);
              await fs.writeFile(filePath, parsed.html);
              console.log(`[EMAIL] Saved raw HTML to ${filePath}`);
            } catch (err) {
              console.error('[EMAIL] Failed to save raw HTML:', err);
            }
          }
          
          // Check if already processed
          const [existing] = await db.select()
            .from(emailSyncLog)
            .where(and(
              eq(emailSyncLog.emailConnectionId, connectionId),
              eq(emailSyncLog.messageId, envelope.messageId || '')
            ));
          
          if (existing) {
            console.log('[EMAIL] Already processed message:', envelope.messageId);
            continue;
          }
          
          processedCount++;
          
          // Parse order details from email
          const orderData = parseEtsyOrderEmail(parsed);
          
          if (orderData) {
            // Check if order already exists
            const existingOrder = await db.select()
              .from(etsyOrders)
              .where(eq(etsyOrders.receiptId, orderData.orderNumber))
              .limit(1);
            
            if (existingOrder.length > 0) {
              console.log('[EMAIL] Order already exists, skipping:', orderData.orderNumber);
              // Mark as processed even though it's a duplicate
              await db.insert(emailSyncLog).values({
                emailConnectionId: connectionId,
                userId,
                messageId: envelope.messageId || '',
                emailDate: envelope.date || new Date(),
                subject: envelope.subject || '',
                sender: envelope.from[0].address || '',
                processedSuccessfully: true,
                errorMessage: 'Order already exists in database',
                orderId: orderData.orderNumber,
                etsyOrderCreated: false
              });
              continue; // Skip to next email
            }
            
            // Create Etsy order
            const [order] = await db.insert(etsyOrders).values({
              userId,
              etsyConnectionId: 1, // Manual connection ID
              receiptId: orderData.orderNumber,
              orderNumber: orderData.orderNumber,
              orderDate: envelope.date || new Date(),
              buyerName: orderData.buyerName,
              buyerEmail: orderData.buyerEmail,
              shipToName: orderData.shipToName,
              shipToAddress1: orderData.shipToAddress1,
              shipToAddress2: orderData.shipToAddress2 || '',
              shipToCity: orderData.shipToCity,
              shipToState: orderData.shipToState,
              shipToCountry: orderData.shipToCountry || 'USA',
              shipToZip: orderData.shipToZip,
              grandTotal: Math.round((orderData.orderTotal || 0) * 100), // Convert to cents safely
              subtotal: Math.round((orderData.subtotal || 0) * 100),
              shippingCost: Math.round((orderData.shippingCost || 0) * 100),
              taxTotal: Math.round((orderData.taxTotal || 0) * 100),
              currency: orderData.currency || 'USD',
              items: orderData.items || [],
              orderStatus: 'pending'
            }).returning();
            
            importedCount++;
            console.log('[EMAIL] Imported order:', order.receiptId);
            
            // Log successful processing
            await db.insert(emailSyncLog).values({
              emailConnectionId: connectionId,
              userId,
              messageId: envelope.messageId || '',
              emailDate: envelope.date || new Date(),
              subject: envelope.subject || '',
              sender: envelope.from[0].address || '',
              processedSuccessfully: true,
              orderId: orderData.orderNumber,
              etsyOrderCreated: true
            });
          } else {
            console.log('[EMAIL] Could not parse order from email');
            // Log failed processing
            await db.insert(emailSyncLog).values({
              emailConnectionId: connectionId,
              userId,
              messageId: envelope.messageId || '',
              emailDate: envelope.date || new Date(),
              subject: envelope.subject || '',
              sender: envelope.from[0].address || '',
              processedSuccessfully: false,
              errorMessage: 'Could not parse order details',
              etsyOrderCreated: false
            });
          }
        } else {
          console.log('[EMAIL] Email does not match Etsy order criteria');
        }
      }
      
      // Update connection stats
      await db.update(emailConnections)
        .set({
          lastSyncAt: new Date(),
          totalEmailsProcessed: connection.totalEmailsProcessed + processedCount,
          totalOrdersImported: connection.totalOrdersImported + importedCount,
          updatedAt: new Date()
        })
        .where(eq(emailConnections.id, connectionId));
      
      await client.logout();
      
      res.json({
        success: true,
        processed: processedCount,
        imported: importedCount,
        message: `Scanned emails and imported ${importedCount} new orders`
      });
      
    } catch (scanError) {
      console.error('[EMAIL] Error during email scan:', scanError);
      // Always try to close the connection on error
      try {
        await client.logout();
      } catch (logoutError) {
        // Ignore logout errors
      }
      
      // Update connection with error
      await db.update(emailConnections)
        .set({
          lastSyncAt: new Date(),
          lastSyncError: scanError.message || 'Unknown error',
          connectionStatus: 'error',
          updatedAt: new Date()
        })
        .where(eq(emailConnections.id, connectionId));
      
      throw scanError;
    }
    
  } catch (error) {
    console.error('[EMAIL] Error scanning emails:', error);
    res.status(500).json({ error: "Failed to scan emails" });
  }
});

// Route to fetch raw Etsy email HTML for debugging
router.post('/fetch-raw-etsy', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.body;
    
    if (!connectionId) {
      return res.status(400).json({ error: 'Connection ID required' });
    }
    
    console.log('[EMAIL] Fetching raw Etsy email for connection:', connectionId);
    const result = await fetchRawEtsyEmail(connectionId);
    
    if (result.error) {
      return res.status(500).json({ error: result.error });
    }
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error: any) {
    console.error('[EMAIL] Error fetching raw email:', error);
    res.status(500).json({ 
      error: 'Failed to fetch raw email',
      details: error.message 
    });
  }
});

export default router;