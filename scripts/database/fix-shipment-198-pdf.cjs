/**
 * Fix shipment 198 PDF data by downloading the proper PDF invoice
 * and storing it as base64 in the database
 */

const https = require('https');
const { Pool } = require('pg');

async function downloadPdfAsBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(base64);
      });
    }).on('error', reject);
  });
}

async function fixShipment198() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Downloading PDF invoice for shipment 198...');
    
    const pdfInvoiceUrl = 'https://files.shipentegra.com/labels/ups/invoice/MOG254984000198-1-26f95820673e.pdf';
    const pdfBase64 = await downloadPdfAsBase64(pdfInvoiceUrl);
    
    console.log(`✅ Downloaded PDF invoice (${pdfBase64.length} characters base64)`);
    
    // Update the database with the proper PDF data
    const updateQuery = `
      UPDATE shipments 
      SET carrier_label_pdf = $1 
      WHERE id = 198
    `;
    
    await pool.query(updateQuery, [pdfBase64]);
    
    console.log('✅ Updated shipment 198 with proper PDF invoice data');
    
    // Verify the update
    const verifyQuery = `
      SELECT id, carrier_label_url, 
             CASE 
               WHEN carrier_label_pdf LIKE 'https://%' THEN 'URL (incorrect)' 
               WHEN carrier_label_pdf IS NOT NULL THEN 'Base64 PDF (correct)'
               ELSE 'NULL'
             END as pdf_status
      FROM shipments 
      WHERE id = 198
    `;
    
    const result = await pool.query(verifyQuery);
    console.log('📊 Verification result:', result.rows[0]);
    
  } catch (error) {
    console.error('❌ Error fixing shipment 198:', error);
  } finally {
    await pool.end();
  }
}

fixShipment198();