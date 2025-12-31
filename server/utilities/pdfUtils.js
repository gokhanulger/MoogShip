import fetch from 'node-fetch';

/**
 * Downloads a PDF from a URL and returns it as a base64 string
 * 
 * @param {string} url - The URL of the PDF to download
 * @returns {Promise<string|null>} The PDF as a base64 string, or null if download fails
 */
export async function downloadPdfFromUrl(url) {
  try {
    console.log(`Attempting to download PDF from URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/pdf',
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to download PDF. Status: ${response.status} ${response.statusText}`);
      return null;
    }
    
    // Get the PDF as an array buffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Convert to base64
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log(`Successfully downloaded PDF from URL (${buffer.length} bytes)`);
    return base64;
  } catch (error) {
    console.error('Error downloading PDF from URL:', error);
    return null;
  }
}