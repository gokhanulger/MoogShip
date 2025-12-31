const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');

// Ensure directory exists
const labelDir = path.join(__dirname, 'uploads', 'labels');
fs.mkdirSync(labelDir, { recursive: true });

// Create the PDF document
const createPdf = () => {
  // Create label file path
  const labelPath = path.join(labelDir, 'label-67-1747811829005.pdf');
  
  // Create a new PDF document
  const doc = new PDFDocument({ size: 'A4' });
  
  // Pipe the PDF to the file
  const stream = fs.createWriteStream(labelPath);
  doc.pipe(stream);
  
  // Add content to the PDF
  doc.font('Helvetica-Bold').fontSize(20).text('MoogShip Label', { align: 'center' });
  doc.moveDown();
  doc.fontSize(16).text('Shipment #SH-000067', { align: 'center' });
  doc.moveDown();
  
  // Add shipment details
  doc.fontSize(12);
  doc.text('Label generated on: ' + new Date().toLocaleString(), { align: 'left' });
  doc.moveDown();
  doc.text('This is a test label created for shipment #SH-000067', { align: 'left' });
  doc.moveDown();
  
  // Add sender and receiver info
  doc.fontSize(14).text('Sender Information', { underline: true });
  doc.fontSize(12);
  doc.text('Name: John Doe');
  doc.text('Address: 123 Sender St, Istanbul, Turkey');
  doc.text('Phone: +90 123 456 7890');
  doc.moveDown();
  
  doc.fontSize(14).text('Receiver Information', { underline: true });
  doc.fontSize(12);
  doc.text('Name: Jane Smith');
  doc.text('Address: 456 Receiver Ave, London, UK');
  doc.text('Phone: +44 987 654 3210');
  doc.moveDown();
  
  // Add package details
  doc.fontSize(14).text('Package Information', { underline: true });
  doc.fontSize(12);
  doc.text('Contents: Documents');
  doc.text('Weight: 1.5 kg');
  doc.text('Dimensions: 30cm x 20cm x 10cm');
  
  // Add barcode placeholder (normally would generate an actual barcode)
  doc.moveDown(2);
  doc.fontSize(10).text('Barcode area', { align: 'center' });
  doc.rect(150, doc.y, 300, 50).stroke();
  doc.moveDown(3);
  
  // Add MoogShip branding
  doc.fontSize(10).text('Powered by MoogShip Global Shipping', { align: 'center' });
  
  // Finalize the PDF and end the stream
  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      console.log(`PDF created successfully at: ${labelPath}`);
      resolve(labelPath);
    });
    stream.on('error', reject);
  });
};

// Execute the PDF creation
createPdf()
  .then(filepath => {
    console.log('PDF creation complete');
    
    // Now update the database to ensure the label_pdf field is set
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    client.connect()
      .then(() => {
        const query = 'UPDATE shipments SET label_pdf = $1 WHERE id = 67';
        const values = [fs.readFileSync(filepath)];
        
        return client.query(query, values);
      })
      .then(() => {
        console.log('Database updated successfully');
        client.end();
      })
      .catch(err => {
        console.error('Error updating database:', err);
        client.end();
      });
  })
  .catch(err => {
    console.error('Error creating PDF:', err);
  });