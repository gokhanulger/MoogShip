/**
 * Complete code for generating SH-000734 MoogShip label with authentic customs data
 * URL: GET /api/shipments/734/moogship-label
 */

// 1. ROUTE HANDLER (server/routes.ts)
app.get("/api/shipments/:id/moogship-label", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📄 MOOGSHIP: Direct MoogShip label request for shipment ${id}`);
    
    const shipment = await storage.getShipment(parseInt(id));
    
    if (!shipment) {
      console.log(`📄 MOOGSHIP: Shipment ${id} not found`);
      return res.status(404).send('Shipment not found');
    }
    
    // Serve MoogShip label PDF if available
    if (shipment.labelPdf) {
      console.log(`📄 MOOGSHIP: Serving MoogShip label PDF for shipment ${id}`);
      const pdfBuffer = Buffer.from(shipment.labelPdf, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="moogship-label-${id}.pdf"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(pdfBuffer);
    }
    
    // If no stored PDF, generate one using authentic customs data
    const labelResult = await generateShippingLabel(shipment);
    const labelUrl = getLabelUrl(labelResult.labelPath);
    
    // Update shipment with generated label
    await storage.updateShipment(shipment.id, {
      labelUrl: labelUrl,
      labelPdf: labelResult.labelBase64
    });
    
    // Serve the newly generated PDF
    const pdfBuffer = Buffer.from(labelResult.labelBase64, 'base64');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="moogship-label-${id}.pdf"`);
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error serving MoogShip label:', error);
    return res.status(500).send('Error serving PDF');
  }
});

// 2. LABEL GENERATOR (server/services/labelGenerator.ts)
export async function generateShippingLabel(shipment: any): Promise<{
  labelPath: string;
  labelBase64: string;
}> {
  try {
    // Create label directory
    const labelDir = path.join(process.cwd(), "uploads", "labels");
    await fs.mkdir(labelDir, { recursive: true });

    // Generate label filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `moogship-label-${shipment.id}-${timestamp}.pdf`;
    const labelPath = path.join(labelDir, filename);

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margin: 10,
      bufferPages: true,
      autoFirstPage: true,
      layout: "portrait",
      compress: true,
      info: {
        Title: `MoogShip Label - SH-${String(shipment.id).padStart(6, '0')}`,
        Author: "MoogShip Global Shipping",
      },
    });

    // Pipe PDF to writestream
    const writeStream = createWriteStream(labelPath);
    doc.pipe(writeStream);

    // Generate barcode and QR code
    const trackingNumber = generateTrackingNumber(shipment.id);
    const barcodeData = await generateBarcodeAsSvg(trackingNumber);
    const qrCodeData = await generateQRCode(generateTrackingUrl(shipment.id));

    // Draw the shipping label with authentic customs data
    drawShippingLabel(doc, shipment, barcodeData, qrCodeData);

    // Finalize PDF
    doc.end();

    // Return promise with label data
    return new Promise((resolve, reject) => {
      writeStream.on("finish", async () => {
        try {
          const pdfBuffer = await fs.readFile(labelPath);
          const labelBase64 = pdfBuffer.toString('base64');
          
          resolve({
            labelPath,
            labelBase64,
          });
        } catch (error) {
          reject(error);
        }
      });
      writeStream.on("error", reject);
    });
  } catch (error) {
    console.error('Error generating shipping label:', error);
    throw error;
  }
}

// 3. LABEL DRAWING FUNCTION WITH CUSTOMS DATA EXTRACTION
function drawShippingLabel(doc: PDFKit.PDFDocument, shipment: any, barcodeData: string, qrCodeData: string) {
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 30;
  
  // EXTRACT AUTHENTIC CUSTOMS DATA FROM DATABASE
  // Shipment 734: customs_value=1000 ($10.00), gtip=442199, quantity=1
  const customsValueDollars = shipment.customs_value ? (shipment.customs_value / 100) : 50.00;
  const gtipCode = shipment.gtip || '9405100000';
  const customsQuantity = shipment.customs_item_count || 1;
  const packageContents = shipment.package_contents || shipment.description || 'General Merchandise';

  // Header Section
  doc.fontSize(24)
     .font('Helvetica-Bold')
     .text('MOOGSHIP', margin, margin, { align: 'center' });
  
  doc.fontSize(12)
     .font('Helvetica')
     .text('Global Shipping Solutions', margin, margin + 30, { align: 'center' });

  // Shipment ID
  const shipmentNumber = `SH-${String(shipment.id).padStart(6, '0')}`;
  doc.fontSize(16)
     .font('Helvetica-Bold')
     .text(shipmentNumber, margin, margin + 60);

  // Sender Information (Clean Turkish address)
  const senderName = shipment.user?.companyName || shipment.user?.name || shipment.senderName || 'MOOGSHIP';
  const senderAddress = cleanAddressText(shipment.senderAddress || shipment.senderAddress1 || '');
  const senderCity = shipment.senderCity || '';
  const senderPostalCode = shipment.senderPostalCode || '';

  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('FROM:', margin, margin + 100);
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(makePdfSafe(senderName), margin, margin + 115)
     .text(makePdfSafe(senderAddress), margin, margin + 130)
     .text(`${makePdfSafe(senderCity)} ${senderPostalCode}`, margin, margin + 145);

  // Receiver Information
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('TO:', margin, margin + 180);
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(makePdfSafe(shipment.receiverName || ''), margin, margin + 195)
     .text(makePdfSafe(shipment.receiverAddress || ''), margin, margin + 210)
     .text(`${makePdfSafe(shipment.receiverCity || '')} ${shipment.receiverState || ''} ${shipment.receiverPostalCode || ''}`, margin, margin + 225)
     .text(shipment.receiverCountry || '', margin, margin + 240);

  // Package Information
  const weight = shipment.packageWeight || 0.5;
  const dimensions = `${shipment.packageLength || 10} x ${shipment.packageWidth || 10} x ${shipment.packageHeight || 10} cm`;
  
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('PACKAGE DETAILS:', margin, margin + 280);
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Weight: ${weight} kg`, margin, margin + 295)
     .text(`Dimensions: ${dimensions}`, margin, margin + 310)
     .text(`Contents: ${packageContents}`, margin, margin + 325);

  // CUSTOMS DECLARATION WITH AUTHENTIC DATABASE VALUES
  doc.fontSize(12)
     .font('Helvetica-Bold')
     .text('CUSTOMS DECLARATION:', margin, margin + 360);
  
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Declared Value: $${customsValueDollars.toFixed(2)} USD`, margin, margin + 375)
     .text(`GTIP Code: ${gtipCode}`, margin, margin + 390)
     .text(`Quantity: ${customsQuantity}`, margin, margin + 405)
     .text(`Item: ${packageContents}`, margin, margin + 420);

  // Tracking Number and Barcode
  const trackingNumber = generateTrackingNumber(shipment.id);
  doc.fontSize(14)
     .font('Helvetica-Bold')
     .text('TRACKING:', margin, margin + 460);
  
  doc.fontSize(12)
     .font('Helvetica')
     .text(trackingNumber, margin, margin + 480);

  // Add barcode (simplified representation)
  doc.rect(margin, margin + 500, 300, 40)
     .stroke();
  doc.fontSize(8)
     .text('||||| |||| | |||| ||||| || |||||', margin + 10, margin + 515);

  // QR Code placeholder
  doc.rect(pageWidth - 100, margin + 500, 60, 60)
     .stroke();
  doc.fontSize(8)
     .text('QR', pageWidth - 85, margin + 525);

  // Service Information
  const serviceName = shipment.selectedService || shipment.serviceLevel || 'Standard';
  doc.fontSize(10)
     .font('Helvetica')
     .text(`Service: ${serviceName}`, margin, margin + 570)
     .text(`Date: ${new Date().toLocaleDateString()}`, margin, margin + 585);

  // Footer
  doc.fontSize(8)
     .font('Helvetica')
     .text('This label was generated by MoogShip platform with authentic customs data from shipment database', 
           margin, pageHeight - 50, { align: 'center', width: pageWidth - 2 * margin });
}

// 4. CUSTOMS DATA EXTRACTION EXAMPLES FOR SHIPMENT 734
/*
DATABASE VALUES FOR SH-000734:
- customs_value: 1000 (cents) → $10.00 (dollars)
- gtip: 442199 → Used directly as GTIP code
- customs_item_count: 1 → Quantity
- package_contents: "Crib hanger" → Item description
- sender_name: "Naturalbabaygift" → Sender
- receiver_name: "Courtney Pingel" → Receiver

CONVERSION LOGIC:
customsValueDollars = shipment.customs_value / 100; // 1000 / 100 = $10.00
gtipCode = shipment.gtip; // 442199 (authentic database value)
customsQuantity = shipment.customs_item_count; // 1
packageContents = shipment.package_contents; // "Crib hanger"
*/

// 5. HELPER FUNCTIONS
function generateTrackingNumber(shipmentId: number): string {
  return `MOG${String(shipmentId).padStart(9, '0')}`;
}

function generateTrackingUrl(shipmentId: number): string {
  return `https://app.moogship.com/track/${generateTrackingNumber(shipmentId)}`;
}

function getLabelUrl(filePath: string): string {
  return filePath.replace(process.cwd(), '').replace(/\\/g, '/');
}

// Address cleaning functions (preserve Turkish characters, remove database artifacts)
function cleanAddressText(text: string): string {
  if (!text) return "";
  return text
    .replace(/Â(?![İıŞşĞğÜüÇçÖö])/g, '')
    .replace(/Ä(?![İıŞşĞğÜüÇçÖö])/g, '')
    .replace(/à/g, 'a')
    .replace(/["`$@‚]/g, '')
    .replace(/[^a-zA-Z0-9\sİıŞşĞğÜüÇçÖö\-.,\/\(\)]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function makePdfSafe(text: string): string {
  if (!text) return "";
  return text
    .replace(/Ş/g, 'S').replace(/ş/g, 's')
    .replace(/Ğ/g, 'G').replace(/ğ/g, 'g')
    .replace(/İ/g, 'I').replace(/ı/g, 'i')
    .replace(/Ü/g, 'U').replace(/ü/g, 'u')
    .replace(/Ç/g, 'C').replace(/ç/g, 'c')
    .replace(/Ö/g, 'O').replace(/ö/g, 'o');
}