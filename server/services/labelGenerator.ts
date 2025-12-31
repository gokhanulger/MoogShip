import { promises as fs } from "fs";
import path from "path";
import { createWriteStream } from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { ShipmentStatus } from "@shared/schema";

/**
 * Clean address text by removing database artifacts and normalizing Turkish characters
 */
export function cleanAddressText(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove database encoding artifacts while preserving Turkish characters
      .replace(/Â(?![İıŞşĞğÜüÇçÖö])/g, "") // Remove Â not followed by Turkish chars
      .replace(/Ä(?![İıŞşĞğÜüÇçÖö])/g, "") // Remove Ä not followed by Turkish chars
      .replace(/à/g, "a") // Replace à with a
      .replace(/Ô/g, "O") // Replace Ô with O
      .replace(/ä/g, "a") // Replace ä with a
      .replace(/["`$@‚]/g, "") // Remove problematic punctuation
      .replace(/á\d*/g, "") // Remove á followed by digits
      // Preserve ALL Turkish characters and alphanumeric
      .replace(/[^a-zA-Z0-9\sİıŞşĞğÜüÇçÖö\-.,\/\(\)]/g, " ")
      // Standardize Turkish address abbreviations
      .replace(/MAH\./gi, "MAHALLESI")
      .replace(/SK\./gi, "SOKAK")
      .replace(/CAD\./gi, "CADDESI")
      .replace(/NO:/gi, "NO")
      // Clean spacing
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Convert text to PDF-safe encoding for proper Turkish character display
 */
export function makePdfSafe(text: string): string {
  if (!text) return "";

  // Convert Turkish characters to PDF-compatible equivalents that display correctly
  return text
    .replace(/Ş/g, "S") // Ş -> S for PDF compatibility
    .replace(/ş/g, "s") // ş -> s
    .replace(/Ğ/g, "G") // Ğ -> G
    .replace(/ğ/g, "g") // ğ -> g
    .replace(/İ/g, "I") // İ -> I
    .replace(/ı/g, "i") // ı -> i
    .replace(/Ü/g, "U") // Ü -> U
    .replace(/ü/g, "u") // ü -> u
    .replace(/Ç/g, "C") // Ç -> C
    .replace(/ç/g, "c") // ç -> c
    .replace(/Ö/g, "O") // Ö -> O
    .replace(/ö/g, "o"); // ö -> o
}

/**
 * Generate combined shipping labels PDF for multiple shipments
 * @param shipments Array of shipment data to include on labels
 * @returns Object containing the path to the generated combined PDF file and base64 PDF data
 */
export async function generateCombinedShippingLabels(
  shipments: any[],
): Promise<{
  labelPath: string;
  labelBase64: string;
}> {
  if (!shipments || shipments.length === 0) {
    throw new Error("No shipments provided for label generation");
  }

  const timestamp = Date.now();
  const labelPath = path.join(
    process.cwd(),
    "uploads",
    `combined-labels-${timestamp}.pdf`,
  );

  // Create the PDF document for thermal printer
  const doc = new PDFDocument({
    size: [288, 432], // 4x6 inches in points (72 points per inch)
    margin: 10,
    bufferPages: true,
    autoFirstPage: true,
    layout: "portrait",
    compress: true,
    info: {
      Title: `Combined Shipping Labels - ${shipments.length} shipments`,
      Author: "Moogship Global Shipping",
    },
  });

  // Pipe PDF to writestream
  const writeStream = createWriteStream(labelPath);
  doc.pipe(writeStream);

  // Generate labels for each shipment
  for (let i = 0; i < shipments.length; i++) {
    const shipment = shipments[i];

    // Add a new page for each shipment after the first one
    if (i > 0) {
      doc.addPage();
    }

    // Generate barcode and QR codes for this shipment
    const trackingNumber = generateTrackingNumber(shipment.id);
    const barcodeData = await generateBarcodeAsSvg(trackingNumber);
    const qrCodeData = await generateQRCode(generateTrackingNumber(shipment.id));
    const qrCodeLast6Data = await generateQRCode(trackingNumber.slice(-6));
    const instagramQRCode = await generateQRCode("https://www.instagram.com/moogship");

    // Draw the label content for this shipment
    drawShippingLabel(doc, shipment, barcodeData, qrCodeData, qrCodeLast6Data, instagramQRCode);
  }

  // Finalize the PDF
  doc.end();

  // Wait for the file to be fully written and capture PDF data
  return new Promise((resolve, reject) => {
    writeStream.on("finish", async () => {
      try {
        // Read the generated PDF file and convert to base64
        const pdfBuffer = await fs.readFile(labelPath);
        const labelBase64 = pdfBuffer.toString("base64");

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
}

/**
 * Generate shipping label PDF(s) based on shipment information
 * @param shipment The shipment data to include on the label
 * @returns Object containing the path to the generated PDF file and base64 PDF data
 */
export async function generateShippingLabel(shipment: any): Promise<{
  labelPath: string;
  labelBase64: string;
}> {
  try {
    // Create label directory if it doesn't exist
    const labelDir = path.join(process.cwd(), "uploads", "labels");
    await fs.mkdir(labelDir, { recursive: true });

    // Generate a unique label filename
    const timestamp = Date.now();
    const labelPath = path.join(
      labelDir,
      `label-${shipment.id}-${timestamp}.pdf`,
    );

    // Get the number of pieces in the shipment
    // Ensure pieceCount is a number, not a string
    const pieceCount =
      typeof shipment.pieceCount === "string"
        ? parseInt(shipment.pieceCount, 10) || 1
        : shipment.pieceCount || 1;

    console.log(`Generating label for shipment with ${pieceCount} pieces`);

    // Create barcode as SVG
    const trackingNumber = generateTrackingNumber(shipment.id);
    const barcodeData = await generateBarcodeAsSvg(trackingNumber);

    // Create QR codes as data URLs
    const qrCodeData = await generateQRCode(generateTrackingNumber(shipment.id));
    const qrCodeLast6Data = await generateQRCode(trackingNumber.slice(-6));
    const instagramQRCode = await generateQRCode("https://www.instagram.com/moogship");

    // Create the PDF document for thermal printer
    // Standard thermal printer label size: 4x6 inches (102mm x 152mm)
    const doc = new PDFDocument({
      size: [288, 432], // 4x6 inches in points (72 points per inch)
      margin: 10, // Smaller margins for thermal printer to maximize usable space
      bufferPages: true, // Enable buffering to calculate positions
      autoFirstPage: true,
      layout: "portrait",
      compress: true, // Compress the PDF to reduce file size
      info: {
        Title:
          pieceCount > 1
            ? `Shipping Label - ${shipment.id} (Multi-piece Shipment)`
            : `Shipping Label - ${shipment.id}`,
        Author: "Moogship Global Shipping",
      },
    });

    // Pipe PDF to writestream
    const writeStream = createWriteStream(labelPath);
    doc.pipe(writeStream);

    // If we have only one piece, create a normal label
    if (pieceCount === 1) {
      // Draw the label content
      drawShippingLabel(doc, shipment, barcodeData, qrCodeData, qrCodeLast6Data, instagramQRCode);
    } else {
      // For multiple pieces, generate multiple labels with piece numbers
      for (let pieceNumber = 1; pieceNumber <= pieceCount; pieceNumber++) {
        // Add a new page for each piece after the first one
        if (pieceNumber > 1) {
          doc.addPage();
        }

        // Create a copy of the shipment data with piece number information
        const pieceShipment = {
          ...shipment,
          currentPiece: pieceNumber,
          totalPieces: pieceCount,
        };

        // Draw the label content for this piece
        drawShippingLabel(doc, pieceShipment, barcodeData, qrCodeData, qrCodeLast6Data, instagramQRCode);
      }
    }

    // Finalize the PDF
    doc.end();

    // Wait for the file to be fully written and capture PDF data
    return new Promise((resolve, reject) => {
      writeStream.on("finish", async () => {
        try {
          // Read the generated PDF file and convert to base64
          const pdfBuffer = await fs.readFile(labelPath);
          const labelBase64 = pdfBuffer.toString("base64");

          console.log(
            `📄 Generated label PDF: ${labelPath} (${labelBase64.length} characters base64)`,
          );

          resolve({
            labelPath,
            labelBase64,
          });
        } catch (error) {
          console.error("Error reading generated PDF file:", error);
          reject(error);
        }
      });
      writeStream.on("error", reject);
    });
  } catch (error) {
    console.error("Error generating shipping label:", error);
    throw new Error("Failed to generate shipping label");
  }
}

/**
 * Draw the content of the shipping label on the PDF document
 */
function drawShippingLabel(
  doc: PDFKit.PDFDocument,
  shipment: any,
  barcodeData: string,
  qrCodeData: string,
  qrCodeLast6Data: string,
  instagramQRCode: string,
) {
  // Set page constants
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  // Define box for service level text (STANDARD - Estimated Delivery: 5 Days)
  const boxHeight = 30; // Make the box a bit shorter
  const serviceBoxY = 20; // Move the box down a bit
  doc.rect(leftMargin, serviceBoxY, contentWidth, boxHeight).stroke();

  // Determine service type and delivery estimate based on selected service
  let serviceName = "STANDARD";
  let deliveryEstimate = "5-10 Days";

  // Extract service type from multiple possible fields (handle both snake_case and camelCase)
  const selectedService =
    shipment.selected_service ||
    shipment.selectedService ||
    shipment.provider_service_code ||
    shipment.providerServiceCode ||
    shipment.service_level ||
    shipment.serviceLevel ||
    "";

  // Debug logging to see what we're getting
  console.log(`[LABEL] Shipment ${shipment.id} service detection:`, {
    selected_service: shipment.selected_service,
    selectedService: shipment.selectedService,
    provider_service_code: shipment.provider_service_code,
    providerServiceCode: shipment.providerServiceCode,
    service_level: shipment.service_level,
    serviceLevel: shipment.serviceLevel,
    finalSelectedService: selectedService,
  });

  // Normalize the service string for comparison
  const serviceStr = selectedService.toLowerCase();

  // Enhanced service detection logic to handle all variations
  if (serviceStr.includes("eco") || serviceStr.includes("shipentegra-eco")) {
    serviceName = "DHL E-COMMERCE";
    deliveryEstimate = "7-14 Days";
  } else if (serviceStr.includes("gls") || serviceStr.includes("afs-gls")) {
    serviceName = "GLS";
    deliveryEstimate = "3-7 Days";
  } else if (serviceStr.includes("aramex")) {
    serviceName = "MOOGSHIP ARAMEX EXPRESS";
    deliveryEstimate = "2-4 Days";
  } else if (
    serviceStr.includes("ups") ||
    serviceStr.includes("express") ||
    serviceStr.includes("ekspress") ||
    serviceStr.includes("shipentegra-ups")
  ) {
    serviceName = "EXPRESS";
    deliveryEstimate = "1-4 Days";
  } else if (
    serviceStr.includes("standard") ||
    serviceStr.includes("widect") ||
    serviceStr.includes("standart") ||
    serviceStr.includes("shipentegra-widect")
  ) {
    serviceName = "STANDARD";
    deliveryEstimate = "5-10 Days";
  }

  console.log(
    `[LABEL] Final service determination for shipment ${shipment.id}: ${serviceName} - ${deliveryEstimate}`,
  );

  // Service level text inside the box with actual selected service
  let serviceText = `${serviceName} - Estimated\nDelivery: ${deliveryEstimate}`;

  // Add piece count information if this is a multi-piece shipment
  if (shipment.totalPieces && shipment.totalPieces > 1) {
    serviceText += ` - PIECE ${shipment.currentPiece}/${shipment.totalPieces}`;
  }

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(serviceText, leftMargin + 5, serviceBoxY + 8, {
      width: contentWidth - 85,
    });

  // Add Moogship logo - position adjusted 2 points down from the service box (2 more points up)
  try {
    const logoPath = path.join(
      process.cwd(),
      "server",
      "assets",
      "moogship-logo.png",
    );
    const logoSize = 60;
    const logoX = pageWidth - logoSize - 25;
    const logoY = serviceBoxY + 2; // 2 points down from the service box (2 more points up from previous position)
    doc.image(logoPath, logoX, logoY, { width: logoSize });
  } catch (error) {
    console.error("Error loading logo:", error);
    // Fallback to text if logo can't be loaded
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("MOOGSHIP", pageWidth - 90, serviceBoxY + 2);
  }

  // Use a clean row-by-row format exactly like the example image
  const fromSectionY = serviceBoxY + boxHeight + 25;

  // FROM header with clear separation
  doc
    .rect(leftMargin, fromSectionY - 5, pageWidth - leftMargin * 2, 1)
    .stroke(); // Line above FROM

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("FROM:", leftMargin, fromSectionY);

  // TO header to the right
  doc.text("TO:", pageWidth / 2, fromSectionY);

  // Use the exact same approach for company names as for addresses
  // that ensures they're formatted consistently with a strict 25 char limit

  // Start address position
  let addressY = fromSectionY + 22;

  // -------------------------------------------------------------
  // FROM (LEFT SIDE) - Company name processing with strict 15 character limit
  // -------------------------------------------------------------

  // Prioritize user's company name, then user's full name, then shipment sender name
  const defaultSenderName = "MOOGSHIP";
  let rawSenderName =
    shipment.user?.companyName ||
    shipment.user?.name ||
    shipment.senderName ||
    defaultSenderName;

  // Clean the sender name and convert Turkish characters to English equivalents
  const processedSenderName = cleanAddressText(rawSenderName);
  const pdfSafeSenderName = makePdfSafe(
    processedSenderName || defaultSenderName,
  );

  // Strictly limit sender name to exactly 15 characters maximum - no exceptions
  const limitedSenderName = pdfSafeSenderName.substring(0, 15);

  // Log the change if truncation happened
  if (pdfSafeSenderName && pdfSafeSenderName.length > 15) {
    console.log(
      `Label generation: Truncated sender name from "${pdfSafeSenderName}" (${pdfSafeSenderName.length} chars) to "${limitedSenderName}" (15 chars)`,
    );
  }

  // Draw the sender name (left side only) with strict 15 char limit
  doc.fontSize(10).font("Helvetica-Bold");

  doc.text(limitedSenderName, leftMargin, addressY, {
    width: pageWidth / 2 - 30, // Only use left half of page
    align: "left",
  });

  // -------------------------------------------------------------
  // TO (RIGHT SIDE) - Company name processing using splitStringIntoLines
  // -------------------------------------------------------------

  // Use the same approach for receiver name
  const defaultReceiverName = "CUSTOMER";
  const rawReceiverName = shipment.receiverName || defaultReceiverName;
  // Clean receiver name to preserve Turkish characters and remove artifacts
  const cleanedReceiverName = cleanAddressText(rawReceiverName);
  // Process receiver name with the same function used for addresses, limited to 25 chars per line
  const receiverNameLines = splitStringIntoLines(cleanedReceiverName, 25);

  // Draw only the first line of the receiver name (right side only)
  doc.fontSize(10).font("Helvetica-Bold");

  if (receiverNameLines.length > 0) {
    doc.text(receiverNameLines[0], pageWidth / 2, addressY, {
      width: pageWidth / 2 - 30, // Only use right half of page
      align: "left",
    });
  } else {
    doc.text(defaultReceiverName, pageWidth / 2, addressY, {
      width: pageWidth / 2 - 30,
      align: "left",
    });
  }

  // Sender address - clean formatting with proper handling
  addressY += 15;

  // Clean and format sender address properly - handle Turkish characters and formatting
  let senderAddressText = shipment.senderAddress || "";

  // Clean Turkish text and format properly with comprehensive character handling
  senderAddressText = cleanAddressText(senderAddressText);

  // Apply PDF-safe encoding to convert Turkish characters to English equivalents
  senderAddressText = makePdfSafe(senderAddressText);

  // Limit sender address to 35 characters maximum for API compliance
  if (senderAddressText.length > 35) {
    const originalAddress = senderAddressText;
    senderAddressText = senderAddressText.substring(0, 35);
    console.log(
      `Label generation: Truncated sender address from "${originalAddress}" (${originalAddress.length} chars) to "${senderAddressText}" (35 chars)`,
    );
  }

  // Only render address if it exists and is meaningful
  if (senderAddressText && senderAddressText.trim().length > 3) {
    const senderAddressLines = splitStringIntoLines(senderAddressText, 25);
    doc.fontSize(9).font("Helvetica");

    // Display cleaned address lines
    for (const line of senderAddressLines) {
      const cleanLine = line.trim();
      if (cleanLine !== "") {
        doc.text(cleanLine, leftMargin, addressY);
        addressY += 12;
      }
    }
  }

  // Location line: City, Postal Code with Turkish character conversion
  let locationLine = "";
  if (shipment.senderCity) {
    const cleanCity = makePdfSafe(cleanAddressText(shipment.senderCity));
    locationLine += cleanCity;
  }
  if (shipment.senderCity && shipment.senderPostalCode) locationLine += ", ";
  if (shipment.senderPostalCode) locationLine += shipment.senderPostalCode;

  if (locationLine) {
    doc.text(locationLine, leftMargin, addressY);
    addressY += 12;
  }

  // Country
  doc.text("Turkey", leftMargin, addressY);

  // Receiver address on the right side - with max 25 chars per line
  let toAddressY = fromSectionY + 37; // Line up with sender address

  // Clean and format receiver address properly using the same cleaning function
  const cleanReceiverAddress = cleanAddressText(
    shipment.receiverAddress || shipment.receiverAddress1 || "",
  );

  const receiverAddressLines = splitStringIntoLines(cleanReceiverAddress, 25);

  for (const line of receiverAddressLines) {
    if (line.trim() !== "") {
      doc.text(line, pageWidth / 2, toAddressY);
      toAddressY += 12;
    }
  }

  // Add second address line if available with consistent cleaning
  if (shipment.receiverAddress2) {
    const cleanReceiverAddress2 = cleanAddressText(shipment.receiverAddress2);
    if (cleanReceiverAddress2) {
      doc.text(cleanReceiverAddress2, pageWidth / 2, toAddressY);
      toAddressY += 12;
    }
  }

  // Receiver city, state, postal code - now includes state
  let cityStateZip = "";
  if (shipment.receiverCity) cityStateZip += shipment.receiverCity;
  if (shipment.receiverState) {
    if (cityStateZip) cityStateZip += ", ";
    cityStateZip += shipment.receiverState;
  }
  if (shipment.receiverPostalCode) {
    if (cityStateZip) cityStateZip += " ";
    cityStateZip += shipment.receiverPostalCode;
  }

  if (cityStateZip) {
    doc.text(cityStateZip, pageWidth / 2, toAddressY);
    toAddressY += 12;
  }

  // Receiver country
  doc.text(shipment.receiverCountry, pageWidth / 2, toAddressY);
  toAddressY += 12;

  // Phone number (if available)
  if (shipment.receiverPhone && shipment.receiverPhone !== "(Not provided)") {
    doc.text(`Phone: ${shipment.receiverPhone}`, pageWidth / 2, toAddressY);
  }

  // Calculate max Y position based on which address section is longer
  const maxAddressY = Math.max(addressY, toAddressY) + 15;

  // Add a separator line above the package details
  doc.rect(leftMargin, maxAddressY - 5, pageWidth - leftMargin * 2, 1).stroke();

  // PACKAGE DETAILS section - exact match to example image
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("PACKAGE DETAILS:", leftMargin, maxAddressY);

  const weightInKg = shipment.packageWeight;
  const dimensions = `${shipment.packageLength} x ${shipment.packageWidth} x ${shipment.packageHeight} cm`;

  // Include piece count information in package details
  let packageInfoText = `Weight: ${weightInKg} kg | Dimensions: ${dimensions}`;
  if (shipment.totalPieces && shipment.totalPieces > 1) {
    packageInfoText += ` | Piece ${shipment.currentPiece} of ${shipment.totalPieces}`;
  }

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(packageInfoText, leftMargin + 5, maxAddressY + 15);

  // Contents with proper word wrapping
  const contentsText = shipment.packageContents || "";

  // If contents text is short, put it on one line
  if (contentsText.length <= 25) {
    doc.text(`Contents: ${contentsText}`, leftMargin + 5, maxAddressY + 25);
  } else {
    // For longer content, use proper word wrapping with max 25 chars per line
    doc.text(`Contents: `, leftMargin + 5, maxAddressY + 25);

    // Split contents into lines with max 25 characters
    const wrappedContent = splitStringIntoLines(contentsText, 25);
    let contentY = maxAddressY + 25;

    for (let i = 0; i < wrappedContent.length; i++) {
      const line = wrappedContent[i];
      // First line goes on same line as "Contents: "
      if (i === 0) {
        doc.text(line, leftMargin + 50, contentY);
      } else {
        contentY += 10;
        doc.text(line, leftMargin + 50, contentY);
      }
    }
  }

  // Add separator line above tracking section
  const trackingY = maxAddressY + 45;
  doc.rect(leftMargin, trackingY - 5, pageWidth - leftMargin * 2, 1).stroke();

  // TRACKING NUMBER section - exact match to example image
  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("TRACKING NUMBER:", leftMargin, trackingY);

  const trackingNumber = generateTrackingNumber(shipment.id);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(trackingNumber, leftMargin, trackingY + 15);

  // Add piece information if this is a multi-piece shipment
  if (shipment.totalPieces && shipment.totalPieces > 1) {
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#cc0000")
      .text(
        `PIECE ${shipment.currentPiece}/${shipment.totalPieces}`,
        pageWidth - 100,
        trackingY + 15,
      );
  }

  // Add QR code - exactly as in the example image
  const qrSize = 90;
  const qrX = pageWidth - qrSize - 20;
  const qrY = trackingY - 7 + 5; // Moved 2 more points down (total 5 points down)

  try {
    if (qrCodeData.startsWith("data:image")) {
      doc.image(qrCodeData, qrX, qrY, { width: qrSize });
    } else {
      // Fallback if QR code generation fails
      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Scan QR code to track shipment", qrX, qrY, { width: qrSize });
    }
  } catch (error) {
    console.log("Error adding QR code to label:", error);
  }

  // Add tracking number below QR code
  doc
    .fontSize(7)
    .font("Helvetica")
    .text(`Scan QR code for tracking`, qrX, qrY + qrSize + 3, {
      width: qrSize,
      align: "center",
    })
    .text(`${trackingNumber}`, qrX, qrY + qrSize + 11, {
      width: qrSize,
      align: "center",
    });

  // Add last 6 digits QR code under TRACKING NUMBER section
  const qrSize2 = 35;
  const qrX2 = leftMargin + 5; // Position under tracking number text
  const qrY2 = trackingY + 35; // Position below tracking number

  try {
    if (qrCodeLast6Data.startsWith("data:image")) {
      doc.image(qrCodeLast6Data, qrX2, qrY2, { width: qrSize2 });
    } else {
      // Fallback if QR code generation fails
      doc
        .fontSize(7)
        .font("Helvetica")
        .text("", qrX2, qrY2, { width: qrSize2 });
    }
  } catch (error) {
    console.log("Error adding last 6 digits QR code to label:", error);
  }

  // Add label for last 6 digits QR code
  doc
    .fontSize(5)
    .font("Helvetica")
    .text(`${trackingNumber.slice(-6)}`, qrX2, qrY2 + qrSize2 + 1, {
      width: qrSize2,
      align: "center",
    });

  // Add shipment date and ID
  const shipmentDate = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const bottomY = 370; // Fixed position for the bottom text (to keep all on one page)

  doc
    .fontSize(9)
    .font("Helvetica")
    .text(`Shipment Date: ${shipmentDate}`, leftMargin, bottomY)
    .text(`Shipment ID: MOG-${shipment.id}`, leftMargin, bottomY + 12);

  // Add Instagram QR code (moved up slightly)
  const instagramQRSize = 35;
  const instagramX = leftMargin + 120;
  const instagramY = bottomY - 20; // Moved up from -8 to -20

  try {
    if (instagramQRCode.startsWith("data:image")) {
      doc.image(instagramQRCode, instagramX, instagramY, { width: instagramQRSize });
    } else {
      doc
        .fontSize(7)
        .font("Helvetica")
        .text("Scan to follow on Instagram", instagramX+20, instagramY, { width: instagramQRSize });
    }
  } catch (error) {
    console.log("Error adding Instagram QR code to label:", error);
  }

  // Add Instagram label
  doc
    .fontSize(4)
    .font("Helvetica")
    .text("Scan to follow on Instagram", instagramX+20, instagramY + instagramQRSize + 1, {
      width: instagramQRSize + 20,
      align: "center",
    });

  // Add disclaimer at the bottom, completely separate section
  doc
    .rect(leftMargin, 400, contentWidth, 20)
    .fillAndStroke("#f8f8f8", "#cccccc");

  doc
    .fontSize(7)
    .fillColor("#000000")
    .font("Helvetica")
    .text(
      "By tendering this shipment, shipper agrees to the terms and conditions available at moogship.com",
      leftMargin + 5,
      405,
      { width: contentWidth - 10, align: "center" },
    );
}

/**
 * Generate a simple text representation of the tracking number instead of a barcode
 * This is a fallback for the server environment where JsBarcode doesn't work
 */
async function generateBarcodeAsSvg(trackingNumber: string): Promise<string> {
  // Create a simple SVG with the tracking number as text
  const svgWidth = 300;
  const svgHeight = 50;

  // Create a basic SVG by hand with the tracking number
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
      <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" fill="white" stroke="black" stroke-width="1" />
      <text x="${svgWidth / 2}" y="${svgHeight / 2}" font-family="Arial" font-size="20" text-anchor="middle" dominant-baseline="middle" fill="black">
        ${trackingNumber}
      </text>
    </svg>
  `;

  return svg;
}

/**
 * Generate a QR code for tracking data
 */
async function generateQRCode(trackingData: string): Promise<string> {
  return QRCode.toDataURL(trackingData, {
    errorCorrectionLevel: "H",
    margin: 1,
    scale: 4,
  });
}

/**
 * Generate a unique tracking number based on shipment ID and random elements
 * @param shipmentId - The ID of the shipment
 * @param attempt - Optional attempt counter for retries (defaults to 0)
 */
export function generateTrackingNumber(
  shipmentId: number,
  attempt: number = 0,
): string {
  // Format: MOG + 2-digit year + 4-digit random number + 6-digit sequential ID
  const year = new Date().getFullYear().toString().substr(-2);
  const randomPart = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  const paddedId = shipmentId.toString().padStart(6, "0");

  // Base tracking number
  let trackingNumber = `MOG${year}${randomPart}${paddedId}`;

  // Append attempt counter for retries (if attempt > 0)
  if (attempt > 0) {
    trackingNumber += `-${attempt}`;
  }

  return trackingNumber;
}

/**
 * Generate a URL for tracking a shipment
 * @param shipmentId - The ID of the shipment
 * @param attempt - Optional attempt counter for retries (defaults to 0)
 */
export function generateTrackingUrl(
  shipmentId: number,
  attempt: number = 0,
): string {
  const trackingNumber = generateTrackingNumber(shipmentId, attempt);
  return `https://www.moogship.com/track/${trackingNumber}`;
}

/**
 * Get the downloadable URL for a shipping label
 */
export function getLabelUrl(labelPath: string): string {
  // Convert absolute path to relative URL path
  const relativePath = labelPath.replace(process.cwd(), "");
  const urlPath = relativePath.replace(/\\/g, "/");
  console.log("Generated label URL:", urlPath);
  return urlPath;
}

/**
 * Split a string into lines with maximum character length
 */
function splitStringIntoLines(text: string, maxCharsPerLine: number): string[] {
  if (!text) return [];

  // First handle any newlines in the text
  const parts = text.split("\n");
  const result: string[] = [];

  for (const part of parts) {
    // Skip empty lines but preserve them as empty strings
    if (part.trim() === "") {
      result.push("");
      continue;
    }

    // Process each part that doesn't have newlines
    let remaining = part;
    while (remaining.length > 0) {
      if (remaining.length <= maxCharsPerLine) {
        // If remaining text fits in one line, add it and break
        result.push(remaining);
        break;
      } else {
        // Find a good breaking point
        let breakPoint = maxCharsPerLine;

        // Look for space to break at
        while (
          breakPoint > 0 &&
          remaining[breakPoint] !== " " &&
          remaining[breakPoint - 1] !== " "
        ) {
          breakPoint--;
        }

        // If we couldn't find a space, force break at maxCharsPerLine
        if (breakPoint === 0) {
          breakPoint = maxCharsPerLine;
        }

        // Add the line and continue with remaining text
        result.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
      }
    }
  }

  return result;
}
