import { ImapFlow } from 'imapflow';
import * as simpleParser from 'mailparser';
import * as fs from 'fs/promises';
import * as path from 'path';
import { db } from './db';
import { emailConnections } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function fetchRawEtsyEmail(connectionId: number) {
  try {
    // Get connection details from database
    const [connection] = await db.select()
      .from(emailConnections)
      .where(eq(emailConnections.id, connectionId))
      .limit(1);
    
    if (!connection) {
      throw new Error('Connection not found');
    }
    
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

    console.log('[EMAIL] Connecting to:', connection.imapHost);
    await client.connect();
    await client.mailboxOpen('INBOX');

    // Search for Etsy emails from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const searchCriteria = {
      from: 'transaction@etsy.com',
      since: thirtyDaysAgo
    };

    console.log('[EMAIL] Searching for Etsy emails...');
    const searchResults = await client.search(searchCriteria);
    
    console.log(`[EMAIL] Found ${searchResults.length} Etsy emails`);

    if (searchResults.length > 0) {
      // Get the most recent email
      const seq = searchResults[searchResults.length - 1];
      
      console.log('[EMAIL] Fetching most recent Etsy email...');
      const msg = await client.fetchOne(seq, { envelope: true, source: true });
      
      if (msg && msg.source) {
        const envelope = msg.envelope;
        console.log('[EMAIL] Subject:', envelope.subject);
        
        // Parse the email
        const parsed = await simpleParser.simpleParser(msg.source);
        
        // Extract order number from subject
        const orderNumMatch = envelope.subject?.match(/Order\s*#(\d+)/i);
        const orderNum = orderNumMatch ? orderNumMatch[1] : 'unknown';
        
        const result: any = {
          subject: envelope.subject,
          from: envelope.from?.[0]?.address,
          date: envelope.date,
          orderNumber: orderNum,
          hasHtml: !!parsed.html,
          hasText: !!parsed.text
        };
        
        // Save raw HTML
        if (parsed.html) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `etsy_raw_order_${orderNum}_${timestamp}.html`;
          const filePath = path.join('logs', fileName);
          
          await fs.writeFile(filePath, parsed.html);
          console.log(`[EMAIL] Saved raw HTML to ${filePath}`);
          
          result.htmlFile = filePath;
          result.htmlSize = Buffer.byteLength(parsed.html);
          result.htmlPreview = parsed.html.substring(0, 5000); // First 5000 chars for preview
          
          // Also save text version for reference
          if (parsed.text) {
            const textFileName = `etsy_raw_order_${orderNum}_${timestamp}.txt`;
            const textFilePath = path.join('logs', textFileName);
            await fs.writeFile(textFilePath, parsed.text);
            result.textFile = textFilePath;
            result.textPreview = parsed.text.substring(0, 2000);
          }
        }
        
        await client.logout();
        return result;
      }
    } else {
      await client.logout();
      return { error: 'No Etsy emails found in the last 30 days' };
    }

    await client.logout();
    return { error: 'No valid email found' };

  } catch (error: any) {
    console.error('[EMAIL] Error:', error.message);
    return { error: error.message };
  }
}