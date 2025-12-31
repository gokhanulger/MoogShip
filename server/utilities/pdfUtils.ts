import fetch from 'node-fetch';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as childProcess from 'child_process';
import { v4 as uuidv4 } from 'uuid';

const execPromise = promisify(childProcess.exec);
const tempDir = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Downloads a file from a URL and converts it to a base64 string
 * Supports both PDF files and images (GIF, PNG, JPEG, etc.)
 * For image formats, attempts to convert them to PDF before returning
 * 
 * @param url The URL of the file to download
 * @returns A promise that resolves to the base64 encoded content if successful, or null if there was an error
 */
export async function downloadPdfFromUrl(url: string): Promise<string | null> {
  try {
    console.log(`Downloading content from ${url}...`);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`Failed to download file: ${response.status} - ${response.statusText}`);
      return null;
    }
    
    // Get the file extension from the URL
    const urlPath = new URL(url).pathname;
    const extension = path.extname(urlPath).toLowerCase();
    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/') || 
                   ['.gif', '.png', '.jpg', '.jpeg', '.bmp', '.tiff'].includes(extension);
    const isPdf = contentType === 'application/pdf' || extension === '.pdf';
    
    // Download the file content
    const buffer = Buffer.from(await response.arrayBuffer());
    const fileSize = Math.round(buffer.length / 1024);
    console.log(`Content downloaded (${fileSize} KB), format: ${isImage ? 'Image' : isPdf ? 'PDF' : 'Unknown'}`);
    
    // If it's already a PDF, convert to base64 and return
    if (isPdf) {
      return buffer.toString('base64');
    }
    
    // If it's an image, convert to PDF
    if (isImage) {
      const tempId = uuidv4();
      const tempImagePath = path.join(tempDir, `${tempId}${extension}`);
      const tempPdfPath = path.join(tempDir, `${tempId}.pdf`);
      
      try {
        // Save the image to disk temporarily
        fs.writeFileSync(tempImagePath, buffer);
        console.log(`Saved temporary image to ${tempImagePath}`);
        
        // Try to use ImageMagick to convert the image to PDF if available
        try {
          await execPromise(`convert "${tempImagePath}" "${tempPdfPath}"`);
          console.log(`Converted image to PDF: ${tempPdfPath}`);
          
          // Read the PDF and convert to base64
          const pdfBuffer = fs.readFileSync(tempPdfPath);
          return pdfBuffer.toString('base64');
        } catch (conversionError) {
          console.warn(`Failed to convert image to PDF: ${conversionError.message}`);
          // Fallback: Just return the image as base64 
          console.log('Falling back to storing the original image data');
          return buffer.toString('base64');
        }
      } finally {
        // Clean up temporary files
        try {
          if (fs.existsSync(tempImagePath)) fs.unlinkSync(tempImagePath);
          if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
        } catch (cleanupError) {
          console.error('Error cleaning up temporary files:', cleanupError);
        }
      }
    }
    
    // For other file types, just return the base64 data
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}