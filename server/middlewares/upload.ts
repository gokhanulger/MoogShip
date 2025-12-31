// Import dependencies using ES modules
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for different types
const ticketAttachmentDir = path.join(uploadDir, 'ticket-attachments');
if (!fs.existsSync(ticketAttachmentDir)) {
  fs.mkdirSync(ticketAttachmentDir, { recursive: true });
}

// Configure multer with types
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  }),
  fileFilter: function (req, file, cb) {
    // Allow CSV and Excel files
    const ext = path.extname(file.originalname).toLowerCase();
    if (
      file.mimetype === 'text/csv' || 
      ext === '.csv' || 
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      ext === '.xlsx' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      ext === '.xls'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  }
});

// Separate upload configuration for ticket attachments with broader file type support
const ticketUpload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, ticketAttachmentDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `ticket-${uniqueSuffix}${ext}`);
    }
  }),
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      // PDFs
      'application/pdf',
      // Excel files
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      // CSV files
      'text/csv',
      // Text files for additional context
      'text/plain'
    ];
    
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.pdf',
      '.xlsx', '.xls',
      '.csv',
      '.txt'
    ];

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported types: images (JPG, PNG, GIF, WebP), PDF, Excel (XLSX, XLS), CSV, and text files.'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit for ticket attachments
    files: 5 // Maximum 5 files per upload
  }
});

export default upload;
export { ticketUpload };