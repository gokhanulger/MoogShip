/**
 * Create simple placeholder label files for approved shipments
 */
import { promises as fs } from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function createSimpleLabel(shipmentId) {
  try {
    // Create label directory if it doesn't exist
    const labelDir = path.join(process.cwd(), "uploads", "labels");
    await fs.mkdir(labelDir, { recursive: true });

    // Generate a unique label filename
    const timestamp = Date.now();
    const labelPath = path.join(labelDir, `label-${shipmentId}-${timestamp}.pdf`);

    // Create a simple PDF document
    const doc = new PDFDocument({
      size: [288, 432], // 4x6 inches in points
      margin: 10,
    });

    // Create write stream
    const writeStream = require('fs').createWriteStream(labelPath);
    doc.pipe(writeStream);

    // Add content to PDF
    doc.fontSize(16).text('MoogShip Label', 50, 50);
    doc.fontSize(12).text(`Shipment ID: ${shipmentId}`, 50, 80);
    doc.fontSize(10).text(`Tracking: MS${shipmentId.toString().padStart(8, '0')}`, 50, 100);
    doc.text('Generated Label', 50, 120);
    doc.text('www.moogship.com', 50, 350);

    // Finalize the PDF
    doc.end();

    // Wait for the write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log(`Created label: ${labelPath}`);
    return labelPath;

  } catch (error) {
    console.error(`Error creating label for shipment ${shipmentId}:`, error);
    throw error;
  }
}

async function createLabelsForShipments() {
  try {
    console.log('Creating labels for approved shipments...');
    
    const shipmentIds = [160, 161, 162, 163, 164];
    
    for (const shipmentId of shipmentIds) {
      try {
        console.log(`Creating label for shipment ${shipmentId}...`);
        
        // Create the PDF file
        const labelPath = await createSimpleLabel(shipmentId);
        
        // Convert to relative URL
        const labelUrl = labelPath.replace(process.cwd(), '');
        const finalUrl = labelUrl.startsWith('/') ? labelUrl : `/${labelUrl}`;
        
        // Update the database
        await sql`
          UPDATE shipments 
          SET label_url = ${finalUrl}
          WHERE id = ${shipmentId}
        `;
        
        console.log(`✓ Label created and updated for shipment ${shipmentId}: ${finalUrl}`);
        
      } catch (error) {
        console.error(`✗ Error processing shipment ${shipmentId}:`, error.message);
      }
    }
    
    console.log('Label creation completed!');
    
  } catch (error) {
    console.error('Error in label creation process:', error);
  } finally {
    await sql.end();
  }
}

createLabelsForShipments();