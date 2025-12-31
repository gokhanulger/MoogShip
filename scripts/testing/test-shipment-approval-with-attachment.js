import { sendShipmentApprovalEmail } from './server/notification-emails.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Sample shipment with a label for testing
const testShipment = {
  id: 12345,
  userId: 1,
  senderName: 'Test Sender',
  senderAddress: '123 Main St',
  senderAddress1: '123 Main St',
  senderCity: 'Istanbul',
  senderPostalCode: '34000',
  senderPhone: '+905551234567',
  senderEmail: 'sender@example.com',
  
  receiverName: 'Test Receiver',
  receiverAddress: '456 Second St',
  receiverCity: 'New York',
  receiverPostalCode: '10001',
  receiverCountry: 'United States',
  
  status: 'approved',
  serviceLevel: 'Express',
  
  totalPrice: 3500, // cents
  basePrice: 3000,  // cents
  fuelCharge: 500,  // cents
  currency: 'USD',
  
  estimatedDeliveryDays: 3,
  trackingNumber: 'MOOG12345TR',
  
  // Either use a base64 encoded PDF directly, or a local file path to a PDF
  labelPdf: null, // Will be set in the script
  labelUrl: '/uploads/labels/test-label.pdf', // Needs to be a valid path
  
  createdAt: new Date(),
  updatedAt: new Date()
};

// Sample user for testing
const testUser = {
  id: 1,
  name: 'Test User',
  username: 'testuser',
  email: process.argv[2] || 'test@example.com', // Allow passing email as argument
  role: 'user'
};

// Get current directory using ES module patterns
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create test PDF if it doesn't exist
const testPdfDir = path.join(process.cwd(), '/uploads/labels');
const testPdfPath = path.join(testPdfDir, 'test-label.pdf');

// Create directory if it doesn't exist
if (!fs.existsSync(testPdfDir)) {
  fs.mkdirSync(testPdfDir, { recursive: true });
  console.log(`Created directory: ${testPdfDir}`);
}

// Create a simple PDF with content if it doesn't exist
if (!fs.existsSync(testPdfPath)) {
  // Create a minimal PDF file (this is not a valid PDF, just for testing)
  const simplePdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 68 >>
stream
BT /F1 12 Tf 100 700 Td (MoogShip Test Label - Shipment ID: ${testShipment.id}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000198 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
316
%%EOF`;

  fs.writeFileSync(testPdfPath, simplePdfContent);
  console.log(`Created test PDF: ${testPdfPath}`);
}

// Read the PDF file and set it directly in base64 format
try {
  const pdfBuffer = fs.readFileSync(testPdfPath);
  testShipment.labelPdf = pdfBuffer.toString('base64');
  console.log('Set label PDF from file');
} catch (err) {
  console.error('Failed to read PDF file:', err);
  // Keep proceeding, it will try to use the file path instead
}

const runTest = async () => {
  console.log(`Sending test email to: ${testUser.email}`);
  console.log(`Shipment ID: ${testShipment.id}`);
  console.log(`PDF available: ${Boolean(testShipment.labelPdf)}`);
  
  try {
    const result = await sendShipmentApprovalEmail(testShipment, testUser);
    console.log('Email send result:', result);
    
    if (result.success) {
      console.log('✅ Test succeeded! Email sent successfully with PDF attachment.');
    } else {
      console.error('❌ Test failed! Could not send email:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed with an exception:', error);
  }
};

runTest();