import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const logoPath = path.join(process.cwd(), 'public', 'images', 'moogship_logo.jpeg');
  console.log('Logo path:', logoPath);
  
  // Check if the file exists
  if (fs.existsSync(logoPath)) {
    console.log('Logo file exists');
    
    // Read the logo file
    const logoData = fs.readFileSync(logoPath);
    console.log('Logo size (bytes):', logoData.length);
    
    // Convert to base64
    const base64Logo = `data:image/jpeg;base64,${logoData.toString('base64')}`;
    console.log('Base64 logo starts with:', base64Logo.substring(0, 100) + '...');
    console.log('Base64 logo length:', base64Logo.length);
  } else {
    console.error('Logo file does not exist at path:', logoPath);
  }
} catch (error) {
  console.error('Error reading logo file:', error);
}