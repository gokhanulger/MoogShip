const { ImapFlow } = require('imapflow');
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs').promises;
const path = require('path');

async function fetchEtsyEmailRaw() {
  // Connection 4: mooogco@gmail.com  
  const config = {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER || 'mooogco@gmail.com',
      pass: process.env.GMAIL_PASS
    },
    logger: false
  };

  const client = new ImapFlow(config);

  try {
    console.log('[EMAIL] Connecting to Gmail...');
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
        console.log('[EMAIL] Processing email from:', envelope.from?.[0]?.address);
        console.log('[EMAIL] Subject:', envelope.subject);
        
        // Parse the email
        const parsed = await simpleParser(msg.source);
        
        // Extract order number from subject
        const orderNumMatch = envelope.subject?.match(/Order\s*#(\d+)/i);
        const orderNum = orderNumMatch ? orderNumMatch[1] : 'unknown';
        
        // Save raw HTML
        if (parsed.html) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const fileName = `etsy_raw_order_${orderNum}_${timestamp}.html`;
          const filePath = path.join('logs', fileName);
          
          await fs.writeFile(filePath, parsed.html);
          console.log(`[EMAIL] Saved raw HTML to ${filePath}`);
          console.log('[EMAIL] File size:', Buffer.byteLength(parsed.html), 'bytes');
          
          // Also save text version for reference
          if (parsed.text) {
            const textFileName = `etsy_raw_order_${orderNum}_${timestamp}.txt`;
            const textFilePath = path.join('logs', textFileName);
            await fs.writeFile(textFilePath, parsed.text);
            console.log(`[EMAIL] Saved text version to ${textFilePath}`);
          }
          
          // Display first 1000 characters of HTML for preview
          console.log('\n[EMAIL] HTML Preview (first 1000 chars):');
          console.log('='.repeat(50));
          console.log(parsed.html.substring(0, 1000));
          console.log('='.repeat(50));
          console.log('\n[EMAIL] Full HTML saved to file. Please check the file for complete content.');
          
        } else {
          console.log('[EMAIL] No HTML content found in email');
        }
      }
    } else {
      console.log('[EMAIL] No Etsy emails found in the last 30 days');
    }

    await client.logout();
    console.log('[EMAIL] Disconnected from Gmail');

  } catch (error) {
    console.error('[EMAIL] Error:', error.message);
    try {
      await client.logout();
    } catch (e) {}
  }
}

// Check if we have Gmail credentials
const hasCredentials = process.env.GMAIL_USER && process.env.GMAIL_PASS;

if (!hasCredentials) {
  console.log('[EMAIL] Gmail credentials not found in environment variables');
  console.log('[EMAIL] Please set GMAIL_USER and GMAIL_PASS environment variables');
  console.log('[EMAIL] For Gmail, you need to use an App Password, not your regular password');
  console.log('[EMAIL] Generate one at: https://myaccount.google.com/apppasswords');
} else {
  fetchEtsyEmailRaw().catch(console.error);
}