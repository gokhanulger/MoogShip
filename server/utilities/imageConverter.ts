/**
 * Image conversion utilities for shipping labels
 */

import PDFDocument from 'pdfkit';
import sharp from 'sharp';

/**
 * Convert image (GIF, PNG, JPEG) to PDF format
 * @param imageBuffer Buffer containing the image data
 * @returns Promise<Buffer> PDF buffer
 */
export async function convertImageToPdf(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Get original image metadata to preserve exact dimensions
    const metadata = await sharp(imageBuffer).metadata();
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Unable to determine image dimensions');
    }

    console.log(`📏 🚨 ACTUAL CARRIER LABEL DIMENSIONS FROM API: ${metadata.width}x${metadata.height}px (Format: ${metadata.format}) 🚨`);

    // Convert any image format to PNG using Sharp with NO modifications
    // Preserve original quality and dimensions exactly
    const pngBuffer = await sharp(imageBuffer)
      .png({
        quality: 100, // Maximum quality
        compressionLevel: 0, // No compression
        force: true
      })
      .toBuffer();

    console.log(`✅ Converted ${metadata.format?.toUpperCase()} to PNG preserving original ${metadata.width}x${metadata.height} dimensions`);

    // Create PDF document with EXACT original dimensions
    const doc = new PDFDocument({
      size: [metadata.width, metadata.height],
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      layout: 'portrait'
    });

    // Add the image to PDF with EXACT original dimensions - NO resizing
    doc.image(pngBuffer, 0, 0, {
      width: metadata.width,
      height: metadata.height,
      fit: [metadata.width, metadata.height]
    });

    console.log(`📄 Created PDF with exact carrier label dimensions: ${metadata.width}x${metadata.height}px`);

    // Finalize the PDF
    doc.end();

    // Collect PDF buffer
    const pdfBuffers: Buffer[] = [];
    return new Promise((resolve, reject) => {
      doc.on('data', (chunk) => pdfBuffers.push(chunk));
      doc.on('end', () => {
        console.log(`✅ PDF generation complete - preserved original carrier label integrity`);
        resolve(Buffer.concat(pdfBuffers));
      });
      doc.on('error', reject);
    });

  } catch (error) {
    console.error('Error converting image to PDF:', error);
    throw new Error('Failed to convert image to PDF');
  }
}

/**
 * Download image from URL and convert to PDF
 * @param imageUrl URL of the image to download and convert
 * @returns Promise<string> Base64 encoded PDF data
 */
export async function downloadAndConvertToPdf(imageUrl: string): Promise<string> {
  try {
    console.log(`📥 Downloading image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Downloaded image (${imageBuffer.length} bytes)`);

    // Convert to PDF
    const pdfBuffer = await convertImageToPdf(imageBuffer);
    console.log(`🔄 Converted to PDF (${pdfBuffer.length} bytes)`);

    // Return as base64
    const base64Pdf = pdfBuffer.toString('base64');
    console.log(`📄 Generated base64 PDF (${base64Pdf.length} characters)`);

    return base64Pdf;

  } catch (error) {
    console.error('Error downloading and converting image:', error);
    throw error;
  }
}