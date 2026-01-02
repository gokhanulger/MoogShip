import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import * as fs from "fs";
import * as xlsx from "xlsx";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// Import ExcelJS as default import
import ExcelJS from "exceljs";
import { z } from "zod";
import { setupAuth } from "./auth";
import {
  authenticateToken,
  isAdmin,
  isOwnerOrAdmin,
  isSelfOrAdmin,
  hasReturnSystemAccess,
} from "./middlewares/auth";
import { sendEmail, sendPasswordResetEmail } from "./email";
import draftRoutes from "./draft-routes";
import refundRoutes from "./refund-routes";
import emailCampaignRoutes from "./email-campaign-routes";
import billingReminderRoutes from "./billing-reminder-routes";
import etsyRoutes from "./etsy-routes";
import { setupEtsyImportRoutes } from "./etsy-import-routes";
import emailRoutes from "./email-routes";
console.log(
  "[ROUTES] Billing reminder routes imported successfully:",
  !!billingReminderRoutes,
);
import {
  sendReturnAccessGrantedEmail,
  sendReturnAccessRevokedEmail,
} from "./services/returnAccessEmailService";
import { LabelService } from "./services/labelService";
import {
  sendTicketCreatedNotification,
  sendTicketUpdatedNotification,
  sendTicketClosedNotification,
  sendTicketResponseNotification,
} from "./services/ticketEmailService";
import { easyshipService } from "./services/easyship";
import { getUSITCDutyRate } from "./controllers/priceController";
import multer from "multer";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission, setObjectAclPolicy } from "./objectAcl";

// File attachment validation schema
const fileAttachmentSchema = z.object({
  fileUrl: z.string().url("Invalid file URL"),
  originalFileName: z.string().min(1, "Original filename is required"),
  fileName: z.string().min(1, "Filename is required"),
  fileSize: z.number().positive("File size must be positive").max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
  mimeType: z.string().min(1, "MIME type is required"),
  fileType: z.enum(["image", "document"], { required_error: "File type must be image or document" })
});

// Allowed MIME types for attachments
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_DOCUMENT_MIME_TYPES];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// MIME type normalization to handle common aliases and GCS defaults
function normalizeMimeType(mimeType: string): string {
  const normalizedTypes: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'application/x-pdf': 'application/pdf',
    'application/vnd.ms-excel.sheet.macroEnabled.12': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  
  return normalizedTypes[mimeType] || mimeType;
}

// Check if MIME types are compatible (handling GCS default and aliases)
function areMimeTypesCompatible(clientMimeType: string, gcsMimeType: string): boolean {
  // Normalize both types
  const normalizedClient = normalizeMimeType(clientMimeType);
  const normalizedGcs = normalizeMimeType(gcsMimeType);
  
  // Direct match after normalization
  if (normalizedClient === normalizedGcs) {
    return true;
  }
  
  // Handle GCS default fallback - if GCS reports application/octet-stream,
  // it likely means no Content-Type was provided, so we accept client type
  // BUT only if the client type is in our allowed list
  if (normalizedGcs === 'application/octet-stream' && 
      ALLOWED_MIME_TYPES.includes(normalizedClient)) {
    console.warn(`GCS defaulted to octet-stream for ${normalizedClient}, accepting client type`);
    return true;
  }
  
  // Security fix: Only allow specific common image MIME type mismatches
  // and ensure both types are in the allowed list to prevent security bypass
  const clientPrimary = normalizedClient.split('/')[0];
  const gcsPrimary = normalizedGcs.split('/')[0];
  
  if (clientPrimary === gcsPrimary && clientPrimary === 'image') {
    // Both MIME types must be in the allowed list to prevent security bypass
    if (!ALLOWED_MIME_TYPES.includes(normalizedClient) || 
        !ALLOWED_MIME_TYPES.includes(normalizedGcs)) {
      console.warn(`Security check: Image MIME type mismatch rejected - one or both types not in allowed list: client=${normalizedClient}, gcs=${normalizedGcs}`);
      return false;
    }
    
    // Only allow specific common image MIME type mismatches (e.g., jpeg/jpg variations)
    const allowedImageMismatches = [
      ['image/jpeg', 'image/jpg'],
      ['image/jpg', 'image/jpeg']
    ];
    
    const isAllowedMismatch = allowedImageMismatches.some(([type1, type2]) =>
      (normalizedClient === type1 && normalizedGcs === type2) ||
      (normalizedClient === type2 && normalizedGcs === type1)
    );
    
    if (isAllowedMismatch) {
      console.warn(`Image MIME type mismatch accepted for common variations: client=${normalizedClient}, gcs=${normalizedGcs}`);
      return true;
    }
    
    console.warn(`Image MIME type mismatch rejected - not a recognized safe variation: client=${normalizedClient}, gcs=${normalizedGcs}`);
    return false;
  }
  
  return false;
}

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "returns");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "return-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const photoUpload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Configure multer for invoice PDF uploads (in memory for base64 conversion)
const invoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed for invoices"));
    }
  },
});

// JWT secret for secure label tokens
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "moogship-label-secret-key-" + randomBytes(32).toString("hex");

// Generate secure label token
function generateLabelToken(
  shipmentId: number,
  userId: number,
  labelType: "moogship" | "carrier" = "moogship",
) {
  const payload = {
    shipmentId,
    userId,
    labelType,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours expiration
  };
  return jwt.sign(payload, JWT_SECRET);
}

// Verify and decode label token
function verifyLabelToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.exp < Date.now()) {
      throw new Error("Token expired");
    }
    return {
      shipmentId: decoded.shipmentId,
      userId: decoded.userId,
      labelType: decoded.labelType,
    };
  } catch (error) {
    throw new Error("Invalid token");
  }
}

// Currency cache with 1-hour expiration
let currencyCache = {
  data: null as any,
  lastUpdated: 0,
  cacheExpiry: 60 * 60 * 1000, // 1 hour in milliseconds
};

// Function to clear currency cache (useful for testing new rates)
function clearCurrencyCache() {
  currencyCache.data = null;
  currencyCache.lastUpdated = 0;
  console.log("Currency cache cleared");
}

// Function to fetch currency rates with caching
async function getCachedCurrencyRates() {
  const now = Date.now();

  // Return cached data if it's still valid
  if (
    currencyCache.data &&
    now - currencyCache.lastUpdated < currencyCache.cacheExpiry
  ) {
    const cacheAge = Math.floor((now - currencyCache.lastUpdated) / 1000 / 60); // minutes

    return currencyCache.data;
  }

  // Try TCMB (Turkish Central Bank) first as it's the most authoritative for TRY rates
  try {
    const tcmbResponse = await fetch(
      "https://www.tcmb.gov.tr/kurlar/today.xml",
    );
    if (tcmbResponse.ok) {
      const xmlText = await tcmbResponse.text();
      // Simple XML parsing to extract USD rate
      const usdMatch = xmlText.match(
        /<Currency[^>]*CurrencyCode="USD"[^>]*>[\s\S]*?<BanknoteSelling>([^<]+)<\/BanknoteSelling>/,
      );
      if (usdMatch && usdMatch[1]) {
        const rate = parseFloat(usdMatch[1]);
        if (!isNaN(rate)) {
          const adjustedRate = rate * 1.006; // Apply 1.006 multiplier to TCMB rate
          const currencyData = {
            usdToTryRate: adjustedRate,
            lastUpdated: new Date().toISOString(),
            source: "TCMB (Central Bank of Turkey)",
          };

          // Update cache
          currencyCache.data = currencyData;
          currencyCache.lastUpdated = now;

          return currencyData;
        }
      }
    }
  } catch (error) {
    console.warn("TCMB API failed:", error.message);
  }

  // Fallback to other sources if TCMB fails
  try {
    const exchangeResponse = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD",
    );
    if (exchangeResponse.ok) {
      const data = await exchangeResponse.json();
      if (data.rates && data.rates.TRY) {
        const currencyData = {
          usdToTryRate: data.rates.TRY,
          lastUpdated: data.date,
          source: "ExchangeRate-API (fallback)",
        };

        // Update cache
        currencyCache.data = currencyData;
        currencyCache.lastUpdated = now;

        console.log(
          `Fallback rate fetched and cached: 1 USD = ${data.rates.TRY} TRY`,
        );
        return currencyData;
      }
    }
  } catch (error) {
    console.warn("ExchangeRate-API fallback failed:", error.message);
  }

  // If all fails, return null
  throw new Error("All currency rate sources failed");
}
import {
  PickupStatus,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ShipmentStatus,
  insertTicketSchema,
  insertTicketResponseSchema,
  priceHistory,
  insertPriceHistorySchema,
  insertMarketingBannerSchema,
} from "../shared/schema";
import {
  createInsuranceRange,
  getAllInsuranceRanges,
  getInsuranceRangeById,
  updateInsuranceRange,
  deleteInsuranceRange,
  calculateInsuranceCost,
} from "./controllers/insuranceController";
import upload from "./middlewares/upload";
import {
  getPickupRequests as getAllPickupRequests,
  getApprovedPickupRequests,
  getPickupRequestDetails,
  updatePickupRequestStatus,
} from "./controllers/pickupController";
import { trackPackageController } from "./controllers/trackingController";
import { importRecipients } from "./controllers/recipientController";
import {
  batchTrackController,
  trackSingleShipmentController,
} from "./controllers/batchTrackingController";
import {
  createShipment,
  uploadBulkShipments,
  createBulkShipments,
  validateBulkShipments,
  getMyShipments,
  getAllShipments,
  getAllShipmentsForTracking,
  getPendingShipments,
  editShipment,
  createTemporaryShipment,
  checkCreditLimit,
  approveShipment,
  rejectShipment,
  getShippingLabel,
  requestPickup,
  requestBatchPickup,
  getPickupRequests as getShipmentPickupRequests,
  updatePickupStatus,
  getBatchLabels,
  sendShipmentsToShipEntegra,
  addManualTrackingNumber,
} from "./controllers/shipmentController";

// Import the proper TypeScript getShipment function that includes packages
import { getShipment as getShipmentWithPackages } from "./controllers/shipmentController";

import { packageController } from "./controllers/packageController";
import {
  getAllAnnouncements,
  getActiveAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementById,
  getLoginPopupAnnouncements,
  markAnnouncementViewed,
} from "./controllers/announcementController";
import { calculatePrice } from "./controllers/priceController";
import { calculateMoogShipPricing } from "./services/moogship-pricing";
import { storage } from "./storage";
import { registerCmsRoutes } from "./cms-routes";
import { db } from "./db";
import { shipments } from "../shared/schema";
import { eq, or } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Make storage accessible via req.app.locals
  app.locals.storage = storage;

  // Add simplified mobile login endpoint FIRST to avoid middleware conflicts
  app.post("/api/mobile-login", async (req, res) => {
    console.log("[MOBILE LOGIN] Processing mobile login request");

    const { username, password } = req.body;

    if (!username || !password) {
      console.log("[MOBILE LOGIN] Missing credentials");
      return res.json({
        success: false,
        message: "Username and password are required",
      });
    }

    try {
      console.log("[MOBILE LOGIN] Checking user:", username);
      const user = await storage.getUserByUsername(username);
      if (!user) {
        console.log("[MOBILE LOGIN] User not found:", username);
        return res.json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        console.log("[MOBILE LOGIN] Invalid password for:", username);
        return res.json({
          success: false,
          message: "Invalid credentials",
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      console.log("[MOBILE LOGIN] Login successful for:", username);

      return res.json({
        success: true,
        user: userWithoutPassword,
        authenticated: true,
        isMobile: true,
      });
    } catch (error) {
      console.error("[MOBILE LOGIN] Error:", error);
      return res.json({
        success: false,
        message: "Server error",
      });
    }
  });

  // Setup authentication routes
  setupAuth(app);

  // Password reset routes (duplicate removed - using improved version below)

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters long" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);

      if (
        !user ||
        !user.passwordResetExpires ||
        new Date() > user.passwordResetExpires
      ) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      // Hash new password using consistent salt rounds for better performance
      const hashedPassword = await bcrypt.hash(newPassword, 8);

      // Update password and clear reset token
      await storage.updateUserPassword(user.id, hashedPassword);
      await storage.clearPasswordResetToken(user.id);

      res.json({ message: "Password successfully reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Forgot password route - generates reset token and sends email
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res
          .status(400)
          .json({ message: "Email address is required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      
      if (!user) {
        // Don't reveal if email exists or not for security reasons
        console.log("[FORGOT PASSWORD] No user found for email:", email);
        return res.json({ 
          message: "If an account exists with this email, you will receive password reset instructions." 
        });
      }

      // Generate a secure random token
      const resetToken = randomBytes(32).toString('hex');
      
      // Hash the token before storing it
      const hashedToken = await bcrypt.hash(resetToken, 8);
      
      // Set expiration time (1 hour from now)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      
      // Store the hashed token in the database
      await storage.setPasswordResetToken(user.id, hashedToken, expires);
      
      // Generate the reset URL
      const baseUrl = process.env.APP_URL || 
                     (process.env.REPL_SLUG && process.env.REPL_OWNER 
                       ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
                       : 'http://localhost:5000');
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      // Send the reset email
      console.log(`[FORGOT PASSWORD] Sending reset email to: ${user.email}`);
      const emailResult = await sendPasswordResetEmail(user, resetToken, resetUrl);
      
      if (!emailResult.success) {
        console.error("[FORGOT PASSWORD] Failed to send email:", emailResult.error);
        return res.status(500).json({ 
          message: "Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin." 
        });
      }
      
      console.log(`[FORGOT PASSWORD] Reset email sent successfully to: ${user.email}`);
      
      res.json({ 
        message: "If an account exists with this email, you will receive password reset instructions." 
      });
    } catch (error) {
      console.error("[FORGOT PASSWORD] Error:", error);
      res.status(500).json({ 
        message: "Şifre sıfırlama e-postası gönderilemedi. Lütfen tekrar deneyin." 
      });
    }
  });

  // API to check if the user is an admin
  app.get("/api/check-admin", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        isAdmin: false,
        message: "Authentication required",
      });
    }

    const isAdmin = req.user.role === "admin";
    console.log(
      `Admin check for ${req.user.username}: ${isAdmin} (role: ${req.user.role})`,
    );

    res.json({
      isAdmin,
      userId: req.user.id,
      username: req.user.username,
      role: req.user.role,
    });
  });

  // Serve static files from uploads directory
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
    setHeaders: (res, filePath) => {
      // User uploads - private cache with shorter duration
      res.set('Cache-Control', 'private, max-age=3600');
    }
  }));

  // Serve static files from server/assets directory
  app.use(
    "/assets",
    express.static(path.join(process.cwd(), "server", "assets"), {
      setHeaders: (res, filePath) => {
        // Server assets - long cache with immutable for hashed assets
        if (filePath.match(/\-[a-f0-9]{8,}\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.set('Cache-Control', 'public, max-age=86400'); // 24 hours for non-hashed
        }
      }
    }),
  );

  // Serve static files from public/images directory for email logos
  app.use(
    "/images",
    express.static(path.join(process.cwd(), "public", "images"), {
      setHeaders: (res, filePath) => {
        // Public images - moderate cache
        res.set('Cache-Control', 'public, max-age=86400'); // 24 hours
      }
    }),
  );

  // For debugging - log all API requests
  app.use("/api", (req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Centralized no-cache middleware for all dynamic/auth endpoints
  app.use("/api", (req, res, next) => {
    // Define patterns for endpoints that can be cached (whitelist approach)
    const cacheablePatterns = [
      /^\/marketing-banners/,
      /^\/products$/, // Static product catalog only
      /^\/health$/,
      /^\/public\//
    ];

    // Check if the request URL matches any cacheable pattern
    const shouldCache = cacheablePatterns.some(pattern => pattern.test(req.url));

    if (!shouldCache) {
      // Set comprehensive no-cache headers for all other API endpoints
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Vary': 'Cookie, Authorization'
      });
    }

    next();
  });

  // Shipment routes
  // Create a new shipment
  app.post("/api/shipments", authenticateToken, createShipment);

  // Upload bulk shipments via Excel
  app.post(
    "/api/shipments/bulk",
    authenticateToken,
    upload.single("file"),
    uploadBulkShipments,
  );

  // Create shipments from bulk upload data (after validation and pricing)
  app.post(
    "/api/shipments/bulk-create",
    authenticateToken,
    createBulkShipments,
  );

  // Validate bulk shipments file without creating them
  app.post(
    "/api/shipments/validate-bulk",
    authenticateToken,
    upload.single("file"),
    validateBulkShipments,
  );

  // Download bulk upload template
  app.get("/api/shipments/bulk-template", (req, res) => {
    try {
      // Create a new workbook in memory
      const workbook = xlsx.utils.book_new();

      // Sample data for the template with examples for multiple destinations and service levels
      const data = [
        {
          senderName: "TR Ofis",
          senderAddress: "Halil Rifat Pasa Mh. Perpa Tic.",
          senderCity: "Istanbul",
          senderCountry: "Turkey",
          senderPostalCode: "34384",
          senderPhone: "",
          senderEmail: "",
          receiverName: "John Smith",
          receiverAddress: "123 Main Street",
          receiverAddress2: "Apt 4B", // Added secondary address field
          receiverCity: "New York",
          receiverState: "New York", // Added state/province field
          receiverCountry: "United States",
          receiverPostalCode: "10001",
          receiverPhone: "+12125551234",
          receiverEmail: "john@example.com",
          packageWeight: 2,
          packageLength: 30,
          packageWidth: 20,
          packageHeight: 15,
          packageContents: "Clothing", // Added contents field
          serviceLevel: "standard",
          shippingTerms: "dap", // DAP or DDP - affects duty calculations
          description: "Gift package",
        },
        {
          senderName: "TR Ofis",
          senderAddress: "Halil Rifat Pasa Mh. Perpa Tic.",
          senderCity: "Istanbul",
          senderCountry: "Turkey",
          senderPostalCode: "34384",
          senderPhone: "",
          senderEmail: "",
          receiverName: "Alice Johnson",
          receiverAddress: "45 Oxford Street",
          receiverAddress2: "Floor 3", // Added secondary address field
          receiverCity: "London",
          receiverState: "Greater London", // Added state/province field
          receiverCountry: "United Kingdom",
          receiverPostalCode: "W1D 1ND",
          receiverPhone: "+442071234567",
          receiverEmail: "alice@example.com",
          packageWeight: 1.5,
          packageLength: 25,
          packageWidth: 15,
          packageHeight: 10,
          packageContents: "Electronics", // Added contents field
          serviceLevel: "express",
          shippingTerms: "ddp", // DAP or DDP - affects duty calculations
          description: "Business documents",
        },
      ];

      // Create a worksheet with the sample data
      const worksheet = xlsx.utils.json_to_sheet(data);

      // Add column width information for better readability
      worksheet["!cols"] = [
        { width: 15 }, // senderName
        { width: 25 }, // senderAddress
        { width: 15 }, // senderCity
        { width: 15 }, // senderCountry
        { width: 15 }, // senderPostalCode
        { width: 15 }, // senderPhone
        { width: 20 }, // senderEmail
        { width: 20 }, // receiverName
        { width: 25 }, // receiverAddress
        { width: 15 }, // receiverCity
        { width: 15 }, // receiverState
        { width: 15 }, // receiverCountry
        { width: 15 }, // receiverPostalCode
        { width: 15 }, // receiverPhone
        { width: 20 }, // receiverEmail
        { width: 10 }, // packageWeight
        { width: 10 }, // packageLength
        { width: 10 }, // packageWidth
        { width: 10 }, // packageHeight
        { width: 15 }, // packageContents
        { width: 10 }, // serviceLevel
        { width: 20 }, // description
      ];

      // Create a validation worksheet with instructions and examples
      const instructionsData = [
        {
          field: "Field Name",
          description: "Description",
          required: "Required?",
          example: "Example",
        },
        {
          field: "receiverName",
          description: "Full name of the recipient",
          required: "Yes",
          example: "John Smith",
        },
        {
          field: "receiverAddress",
          description: "Primary street address of the recipient",
          required: "Yes",
          example: "123 Main Street",
        },
        {
          field: "receiverAddress2",
          description: "Secondary address line (apartment, suite, etc.)",
          required: "No",
          example: "Apt 4B",
        },
        {
          field: "receiverCity",
          description: "City of the recipient",
          required: "Yes",
          example: "New York",
        },
        {
          field: "receiverState",
          description: "State or province of the recipient",
          required: "No",
          example: "New York",
        },
        {
          field: "receiverCountry",
          description: "Country of the recipient",
          required: "Yes",
          example: "United States",
        },
        {
          field: "receiverPostalCode",
          description: "Postal/ZIP code of the recipient",
          required: "Yes",
          example: "10001",
        },
        {
          field: "receiverPhone",
          description: "Phone number of the recipient",
          required: "Yes",
          example: "+12125551234",
        },
        {
          field: "receiverEmail",
          description: "Email of the recipient",
          required: "Yes",
          example: "john@example.com",
        },
        {
          field: "packageWeight",
          description: "Weight in kilograms",
          required: "Yes",
          example: "2",
        },
        {
          field: "packageLength",
          description: "Length in centimeters",
          required: "Yes",
          example: "30",
        },
        {
          field: "packageWidth",
          description: "Width in centimeters",
          required: "Yes",
          example: "20",
        },
        {
          field: "packageHeight",
          description: "Height in centimeters",
          required: "Yes",
          example: "15",
        },
        {
          field: "packageContents",
          description: "Contents of the package",
          required: "Yes",
          example: "Clothing",
        },
        {
          field: "serviceLevel",
          description: "Service level (standard, express, priority)",
          required: "Yes",
          example: "standard",
        },
        {
          field: "description",
          description: "Additional shipment description",
          required: "No",
          example: "Gift package",
        },
      ];

      const instructionsSheet = xlsx.utils.json_to_sheet(instructionsData);
      instructionsSheet["!cols"] = [
        { width: 20 }, // Field
        { width: 40 }, // Description
        { width: 15 }, // Required
        { width: 25 }, // Example
      ];

      // Add the worksheets to the workbook
      xlsx.utils.book_append_sheet(workbook, worksheet, "Shipments");
      xlsx.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

      // Generate the Excel file as a buffer
      const excelBuffer = xlsx.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      // Set headers for Excel file download
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=bulk-shipment-template.xlsx",
      );
      res.setHeader("Content-Length", excelBuffer.length);

      // Send the buffer as response
      res.send(excelBuffer);
    } catch (error) {
      console.error("Error creating template file:", error);
      res.status(500).json({ message: "Failed to generate template file" });
    }
  });

  // Get shipments for the current user
  app.get("/api/shipments/my", authenticateToken, getMyShipments);

  // Get batch labels for multiple shipments
  app.post("/api/shipments/batch-print", authenticateToken, getBatchLabels);

  // Get batch labels via GET request with query parameters
  app.get(
    "/api/shipments/batch-labels",
    authenticateToken,
    async (req, res) => {
      try {
        const idsParam = req.query.ids as string;

        if (!idsParam) {
          return res.status(400).json({ message: "No shipment IDs provided" });
        }

        // Parse comma-separated IDs from query parameter
        const shipmentIds = idsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        if (shipmentIds.length === 0) {
          return res
            .status(400)
            .json({ message: "No valid shipment IDs provided" });
        }

        console.log(
          `GET batch labels request for IDs: ${shipmentIds.join(", ")}`,
        );
        const shipments = [];

        // Fetch all requested shipments and validate access
        for (const id of shipmentIds) {
          const shipmentId = parseInt(id);

          if (isNaN(shipmentId)) {
            console.log(`Invalid shipment ID: ${id}, skipping`);
            continue;
          }

          const shipment = await storage.getShipment(shipmentId);

          if (!shipment) {
            console.log(`Shipment ${id} not found, skipping`);
            continue;
          }

          // Check if user is authorized to access this shipment
          if (
            !req.user ||
            (req.user.id !== shipment.userId && req.user.role !== "admin")
          ) {
            console.log(
              `User not authorized to access shipment ${id}, skipping`,
            );
            continue;
          }

          shipments.push(shipment);
        }

        if (shipments.length === 0) {
          return res
            .status(404)
            .json({
              message: "No valid shipments found with the provided IDs",
            });
        }

        console.log(
          `Processing ${shipments.length} shipments for batch labels`,
        );

        // Create a combined PDF with all labels using PDFDocument
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.create();

        // For each shipment, get its PDF data and copy pages to the combined PDF
        for (const shipment of shipments) {
          try {
            let labelBytes: Uint8Array;

            // First try to get PDF from database
            if (shipment.labelPdf) {
              console.log(
                `Using database PDF data for shipment ${shipment.id}`,
              );
              labelBytes = Buffer.from(shipment.labelPdf, "base64");
            }
            // Skip if no label data available
            else {
              console.error(
                `No label data available for shipment ${shipment.id}, skipping`,
              );
              continue;
            }

            const shipmentPdf = await PDFDocument.load(labelBytes);

            // Copy all pages from the shipment PDF to the combined PDF
            const copiedPages = await pdfDoc.copyPages(
              shipmentPdf,
              shipmentPdf.getPageIndices(),
            );
            copiedPages.forEach((page) => pdfDoc.addPage(page));
            console.log(
              `Added ${copiedPages.length} pages from shipment ${shipment.id}`,
            );
          } catch (err) {
            console.error(
              `Error processing label for shipment ${shipment.id}:`,
              err,
            );
            // Continue with other shipments even if one fails
          }
        }

        // Generate the combined PDF
        const combinedPdfBytes = await pdfDoc.save();

        // Send the PDF directly as response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="bulk-labels-${shipments.length}-shipments.pdf"`,
        );
        res.send(Buffer.from(combinedPdfBytes));
      } catch (error) {
        console.error("Error generating batch labels:", error);
        res.status(500).json({ message: "Server error" });
      }
    },
  );

  // Upload invoice for a shipment
  app.post(
    "/api/shipments/:id/upload-invoice",
    authenticateToken,
    isOwnerOrAdmin,
    invoiceUpload.single("invoice"),
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Check if shipment exists and user has access
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Check if user owns the shipment or is admin
        const user = req.user as any;
        if (!user.isAdmin && shipment.userId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }

        // Convert file buffer to base64
        const base64Content = file.buffer.toString("base64");

        // Update shipment with invoice information
        const updatedShipment = await storage.updateShipment(shipmentId, {
          invoiceFilename: file.originalname,
          invoicePdf: base64Content,
          invoiceUploadedAt: new Date(),
        });

        if (!updatedShipment) {
          return res
            .status(500)
            .json({ message: "Failed to update shipment with invoice" });
        }

        res.json({
          message: "Invoice uploaded successfully",
          filename: file.originalname,
          uploadedAt: updatedShipment.invoiceUploadedAt,
        });
      } catch (error) {
        console.error("Error uploading invoice:", error);
        res.status(500).json({ message: "Server error during invoice upload" });
      }
    },
  );

  // Delete invoice for a shipment
  app.delete(
    "/api/shipments/:id/delete-invoice",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Check if user owns the shipment or is admin
        const user = req.user as any;
        if (!user.isAdmin && shipment.userId !== user.id) {
          return res.status(403).json({ message: "Access denied" });
        }

        if (!shipment.invoicePdf) {
          return res
            .status(404)
            .json({ message: "No invoice found for this shipment" });
        }

        // Remove invoice information from shipment
        const updatedShipment = await storage.updateShipment(shipmentId, {
          invoiceFilename: null,
          invoicePdf: null,
          invoiceUploadedAt: null,
        });

        if (!updatedShipment) {
          return res.status(500).json({ message: "Failed to delete invoice" });
        }

        res.json({
          message: "Invoice deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting invoice:", error);
        res
          .status(500)
          .json({ message: "Server error during invoice deletion" });
      }
    },
  );

  // Download invoice for a shipment
  app.get("/api/shipments/:id/invoice", authenticateToken, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.id);
      if (isNaN(shipmentId)) {
        return res.status(400).json({ message: "Invalid shipment ID" });
      }

      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res.status(404).json({ message: "Shipment not found" });
      }

      // Check if user owns the shipment or is admin
      const user = req.user as any;
      if (user.role !== "admin" && shipment.userId !== user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      if (!shipment.invoicePdf || !shipment.invoiceFilename) {
        return res
          .status(404)
          .json({ message: "No invoice found for this shipment" });
      }

      // Convert base64 back to buffer
      const pdfBuffer = Buffer.from(shipment.invoicePdf, "base64");

      // Set appropriate headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${shipment.invoiceFilename}"`,
      );
      res.setHeader("Content-Length", pdfBuffer.length);

      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ message: "Server error during invoice download" });
    }
  });

  // Get all shipments (admin only)
  app.get("/api/shipments/all", authenticateToken, isAdmin, getAllShipments);
  
  // Get all shipments for tracking (admin only, fast version without packages)
  app.get("/api/shipments/tracking", authenticateToken, isAdmin, getAllShipmentsForTracking);

  // Sync shipment statuses with UPS tracking data
  app.post(
    "/api/shipments/sync-status",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        console.log("Starting shipment status sync with UPS tracking data...");

        // Get all shipments that have carrier tracking numbers
        const shipments = await storage.getAllShipments();
        const shipmentsWithTracking = shipments.filter(
          (s) =>
            s.carrierTrackingNumber && s.carrierTrackingNumber.trim() !== "",
        );

        console.log(
          `Found ${shipmentsWithTracking.length} shipments with carrier tracking numbers`,
        );

        let updated = 0;
        const updates = [];

        for (const shipment of shipmentsWithTracking) {
          try {
            const { trackPackage } = await import("./services/ups.js");
            const upsData = await trackPackage(shipment.carrierTrackingNumber!);

            // Map UPS status to our system status
            let newStatus = shipment.status;
            console.log(
              `Checking shipment ${shipment.id}: UPS status="${upsData.status}", description="${upsData.statusDescription}", current status="${shipment.status}"`,
            );

            // Check description first for delivery status
            if (
              upsData.statusDescription &&
              upsData.statusDescription.toUpperCase().includes("DELIVERED")
            ) {
              newStatus = ShipmentStatus.DELIVERED;
              console.log(
                `Package delivered based on description: ${upsData.statusDescription}`,
              );
            } else if (upsData.status === "DELIVERED") {
              newStatus = ShipmentStatus.DELIVERED;
              console.log(`Package delivered based on status code`);
            } else if (upsData.status === "OUT_FOR_DELIVERY") {
              newStatus = ShipmentStatus.IN_TRANSIT;
            } else if (upsData.status === "IN_TRANSIT") {
              newStatus = ShipmentStatus.IN_TRANSIT;
            } else if (upsData.status === "EXCEPTION") {
              newStatus = ShipmentStatus.IN_TRANSIT; // Keep as in_transit for exceptions
            } else if (upsData.status === "PICKUP") {
              newStatus = ShipmentStatus.IN_TRANSIT; // Package picked up, now in transit
            } else if (upsData.status === "ORIGIN_SCAN") {
              newStatus = ShipmentStatus.IN_TRANSIT; // Package scanned at origin
            }

            // Only update if status changed
            if (newStatus !== shipment.status) {
              await storage.updateShipment(shipment.id, { status: newStatus });
              updated++;
              updates.push({
                id: shipment.id,
                trackingNumber: shipment.carrierTrackingNumber,
                oldStatus: shipment.status,
                newStatus,
                upsStatus: upsData.status,
              });
              console.log(
                `Updated shipment ${shipment.id} (${shipment.carrierTrackingNumber}): ${shipment.status} → ${newStatus}`,
              );
            }

            // Add small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `Error syncing shipment ${shipment.id} (${shipment.carrierTrackingNumber}):`,
              error,
            );
          }
        }

        console.log(`Status sync complete: ${updated} shipments updated`);

        res.json({
          message: `Successfully synced ${updated} shipment statuses`,
          totalChecked: shipmentsWithTracking.length,
          updated,
          updates,
        });
      } catch (error) {
        console.error("Error syncing shipment statuses:", error);
        res.status(500).json({ message: "Failed to sync shipment statuses" });
      }
    },
  );

  // Get pending shipments (admin only)
  app.get(
    "/api/shipments/pending",
    authenticateToken,
    isAdmin,
    getPendingShipments,
  );

  // Send shipments to ShipEntegra (admin only)
  app.post(
    "/api/shipments/send-to-shipentegra",
    authenticateToken,
    isAdmin,
    sendShipmentsToShipEntegra,
  );

  // Purchase labels endpoint (alias for send-to-shipentegra)
  app.post(
    "/api/shipments/purchase-labels",
    authenticateToken,
    isAdmin,
    sendShipmentsToShipEntegra,
  );

  // Download missing carrier label PDFs (admin only)
  // Route removed - function implementation discontinued

  // Test ShipEntegra order creation and label generation (admin only)
  app.post(
    "/api/shipments/create-shipentegra-label/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        // Get the shipment
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Import the ShipEntegra service
        const { createShipentegraOrderAndLabel } = await import(
          "./services/shipentegra"
        );

        // Call the function
        console.log(
          "Creating ShipEntegra order and label for shipment:",
          shipmentId,
        );

        // Add receiverEmail with default if missing and handle retry attempts
        const currentLabelAttempts = shipment.labelAttempts || 0;

        // Import the package dimensions utility
        const { convertPackageDimensionsToNumbers } = await import(
          "./package-dimensions-fix"
        );

        // Make sure all dimensions and weight are proper numbers
        const fixedShipment = convertPackageDimensionsToNumbers({
          ...shipment,
          receiverEmail: (shipment as any).receiverEmail || "info@moogship.com", // Default email
          labelAttempts: currentLabelAttempts + 1, // Increment label attempts counter
        });

        // Log the fixed dimensions and weight
        console.log(
          `Using converted package dimensions - Length: ${fixedShipment.packageLength}, Width: ${fixedShipment.packageWidth}, Height: ${fixedShipment.packageHeight}, Weight: ${fixedShipment.packageWeight}`,
        );

        const result = await createShipentegraOrderAndLabel(fixedShipment);

        console.log("ShipEntegra result:", JSON.stringify(result));

        if (result.success) {
          // Update the shipment with tracking number, carrier tracking number, and PDF data if provided
          if (result.trackingNumber) {
            await storage.updateShipment(shipmentId, {
              trackingNumber: shipment.trackingNumber, // Keep original tracking number
              carrierTrackingNumber: result.trackingNumber, // Store carrier tracking number separately

              // Keep original MoogShip label URL and PDF
              labelUrl: shipment.labelUrl,
              labelPdf: shipment.labelPdf,

              // Store carrier label URL and PDF separately
              carrierLabelUrl: result.labelUrl || null,
              carrierLabelPdf: result.labelPdf || null,

              // 🎯 CRITICAL STATUS UPDATE: Change from approved to pre_transit after successful label generation
              status: "pre_transit",

              labelAttempts: fixedShipment.labelAttempts,
              labelError: null, // Clear any previous errors
            });

            // Log whether PDF data was stored
            if (result.labelPdf) {
              console.log(
                `PDF data successfully stored for shipment ${shipmentId} (${result.labelPdf.substring(0, 50)}...)`,
              );
            } else {
              console.log(`No PDF data available for shipment ${shipmentId}`);
            }
          }

          return res.status(200).json(result);
        } else {
          // Update shipment with error information
          await storage.updateShipment(shipmentId, {
            labelAttempts: fixedShipment.labelAttempts,
            labelError: result.message || "Failed to generate shipping label",
          });

          return res.status(400).json(result);
        }
      } catch (error) {
        console.error("Error creating ShipEntegra order and label:", error);

        // Save the error message to the shipment record
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        try {
          await storage.updateShipment(parseInt(req.params.id), {
            labelAttempts: (shipment.labelAttempts || 0) + 1, // Make sure to increment attempts
            labelError: errorMessage,
          });
          console.log(
            `Saved error message for shipment ${req.params.id}: ${errorMessage}`,
          );
        } catch (updateError) {
          console.error(
            "Error updating shipment with error information:",
            updateError,
          );
        }

        return res.status(500).json({
          success: false,
          message: errorMessage,
        });
      }
    },
  );

  // Get a single shipment by ID (user can only view their own shipments, admin can view all)
  app.get(
    "/api/shipments/:id",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const shipmentId = parseInt(id);
        const shipment = await storage.getShipment(shipmentId);

        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Check if user is authorized to view this shipment
        if (req.user.role !== "admin" && shipment.userId !== req.user.id) {
          return res
            .status(403)
            .json({ message: "Not authorized to view this shipment" });
        }

        // Fetch physical packages associated with this shipment
        const packages = await storage.getShipmentPackages(shipmentId);

        // Add the packages to the shipment response
        const responseData = {
          ...shipment,
          packages: packages,
        };

        return res.status(200).json(responseData);
      } catch (error) {
        console.error("Error fetching shipment:", error);
        return res.status(500).json({ message: "Failed to fetch shipment" });
      }
    },
  );

  // Get package items for a shipment
  app.get(
    "/api/shipments/:id/items",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        const items = await storage.getShipmentPackageItems(shipmentId);
        res.json(items);
      } catch (error) {
        console.error("Error getting package items:", error);
        res.status(500).json({ message: "Failed to retrieve package items" });
      }
    },
  );

  // Update a package item (admin only)
  app.put(
    "/api/shipments/:shipmentId/items/:itemId",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const itemId = parseInt(req.params.itemId);
        const shipmentId = parseInt(req.params.shipmentId);

        if (isNaN(itemId) || isNaN(shipmentId)) {
          return res
            .status(400)
            .json({ message: "Invalid shipment or item ID" });
        }

        // Validate the item belongs to the shipment
        const items = await storage.getShipmentPackageItems(shipmentId);
        const itemBelongsToShipment = items.some((item) => item.id === itemId);

        if (!itemBelongsToShipment) {
          return res
            .status(404)
            .json({ message: "Item not found for this shipment" });
        }

        // Update the item
        const updatedItem = await storage.updatePackageItem(itemId, req.body);

        if (!updatedItem) {
          return res.status(404).json({ message: "Item not found" });
        }

        res.json(updatedItem);
      } catch (error) {
        console.error("Error updating package item:", error);
        res.status(500).json({ message: "Failed to update package item" });
      }
    },
  );

  // Add general request logging middleware for all PUT/PATCH requests
  app.use((req, res, next) => {
    if (req.method === "PUT" || req.method === "PATCH") {
      console.log(
        `🔍 ${req.method} ${req.url} - User: ${req.user?.username || "Not authenticated"}`,
      );
    }
    next();
  });

  // Edit a shipment (user can only edit their own shipments, admin can edit all)
  app.put(
    "/api/shipments/:id",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res, next) => {
      console.log(
        `🔥🔥🔥 PUT /api/shipments/${req.params.id} ROUTE CALLED 🔥🔥🔥`,
      );
      console.log(`🔥 Request body keys:`, Object.keys(req.body));
      console.log(`🔥 User:`, req.user?.username);
      console.log(`🔥 About to call editShipment function...`);

      // Call the editShipment function with proper error handling
      try {
        await editShipment(req, res);
      } catch (routeError) {
        console.error("🔥 ERROR IN ROUTE HANDLER:", routeError);
        if (!res.headersSent) {
          return res.status(500).json({ message: "Route handler error" });
        }
      }
    },
  );

  // Patch a shipment (partial update - for price recalculations and other partial updates)
  app.patch(
    "/api/shipments/:id",
    authenticateToken,
    isOwnerOrAdmin,
    (req, res, next) => {
      console.log(`🟠 PATCH /api/shipments/${req.params.id} called`);
      console.log(`🟠 Request body:`, JSON.stringify(req.body, null, 2));
      console.log(`🟠 User:`, req.user?.username);
      editShipment(req, res, next);
    },
  );

  // Cancel a shipment (user can only cancel their own shipments, admin can cancel any)
  app.post(
    "/api/shipments/:id/cancel",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        // Get the shipment
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Only pending shipments can be cancelled by regular users
        // Can't cancel shipments that are already approved, in transit, or delivered
        if (shipment.status !== ShipmentStatus.PENDING) {
          return res.status(400).json({
            message: "Only pending shipments can be cancelled",
          });
        }

        // If shipment was approved and payment was processed, refund the user
        let refundAmount = 0;
        let refundTransaction = null;

        if (
          shipment.status === ShipmentStatus.APPROVED &&
          shipment.totalPrice
        ) {
          refundAmount = shipment.totalPrice;

          // Create a refund transaction
          refundTransaction = await storage.createTransaction({
            userId: shipment.userId,
            amount: refundAmount, // Positive amount for refund
            description: `Refund for cancelled shipment #${shipmentId}`,
            relatedShipmentId: shipmentId,
            type: "refund", // Using the TransactionType enum value
          });

          // Update user balance
          await storage.updateUserBalance(shipment.userId, refundAmount);

          console.log(
            `Refunded ${refundAmount / 100} currency units to user ${shipment.userId} for cancelled shipment #${shipmentId}`,
          );
        }

        // Update the shipment status to cancelled
        const updatedShipment = await storage.updateShipment(shipmentId, {
          status: ShipmentStatus.CANCELLED,
        });

        // Return success with refund details if applicable
        res.status(200).json({
          message: "Shipment cancelled successfully",
          shipment: updatedShipment,
          refund:
            refundAmount > 0
              ? {
                  amount: refundAmount,
                  transaction: refundTransaction,
                }
              : null,
        });
      } catch (error) {
        console.error("Error cancelling shipment:", error);
        res.status(500).json({ message: "Failed to cancel shipment" });
      }
    },
  );

  // Check if approving a shipment would exceed credit limit (admin only)
  app.get(
    "/api/shipments/check-credit-limit/:id",
    authenticateToken,
    isAdmin,
    checkCreditLimit,
  );

  // Create a temporary shipment for credit limit checking (for users creating shipments)
  app.post(
    "/api/shipments/temporary",
    authenticateToken,
    createTemporaryShipment,
  );

  // Approve a shipment (admin only)
  app.post(
    "/api/shipments/approve/:id",
    authenticateToken,
    isAdmin,
    approveShipment,
  );

  // Reject a shipment (admin only)
  app.post(
    "/api/shipments/reject/:id",
    authenticateToken,
    isAdmin,
    rejectShipment,
  );

  // Send bulk approval summary emails (admin only)
  app.post(
    "/api/shipments/send-bulk-approval-emails",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { shipmentIds } = req.body;

        if (
          !shipmentIds ||
          !Array.isArray(shipmentIds) ||
          shipmentIds.length === 0
        ) {
          return res
            .status(400)
            .json({ message: "Invalid shipmentIds provided" });
        }

        console.log(
          `📧 Processing bulk approval emails for ${shipmentIds.length} shipments`,
        );

        // Get all approved shipments
        const shipments = await Promise.all(
          shipmentIds.map((id) => storage.getShipment(id)),
        );

        // Filter out any null shipments and group by user
        const validShipments = shipments.filter((s) => s !== null);
        const shipmentsByUser = new Map<number, typeof validShipments>();

        for (const shipment of validShipments) {
          if (shipment.userId) {
            if (!shipmentsByUser.has(shipment.userId)) {
              shipmentsByUser.set(shipment.userId, []);
            }
            shipmentsByUser.get(shipment.userId)!.push(shipment);
          }
        }

        console.log(
          `📧 Found shipments for ${shipmentsByUser.size} different users`,
        );

        // Import bulk approval email function
        const { sendBulkShipmentApprovalEmail } = await import(
          "./notification-emails"
        );

        // Send bulk approval email to each user
        const emailResults = [];
        for (const [userId, userShipments] of shipmentsByUser) {
          try {
            const user = await storage.getUser(userId);
            if (user && user.email) {
              console.log(
                `📧 Sending bulk approval email to ${user.email} for ${userShipments.length} shipments`,
              );
              const result = await sendBulkShipmentApprovalEmail(
                userShipments,
                user,
              );
              emailResults.push({
                userId,
                email: user.email,
                shipmentCount: userShipments.length,
                success: result.success,
                error: result.error,
              });
            } else {
              console.warn(
                `⚠️ User ${userId} not found or has no email address`,
              );
              emailResults.push({
                userId,
                email: null,
                shipmentCount: userShipments.length,
                success: false,
                error: "User not found or no email address",
              });
            }
          } catch (emailError) {
            console.error(
              `❌ Error sending bulk approval email to user ${userId}:`,
              emailError,
            );
            emailResults.push({
              userId,
              email: null,
              shipmentCount: userShipments.length,
              success: false,
              error: emailError.message,
            });
          }
        }

        const successCount = emailResults.filter((r) => r.success).length;
        const totalUsers = emailResults.length;

        console.log(
          `📧 Bulk approval email results: ${successCount}/${totalUsers} users notified successfully`,
        );

        res.json({
          success: true,
          totalShipments: validShipments.length,
          totalUsers,
          successfulEmails: successCount,
          results: emailResults,
        });
      } catch (error) {
        console.error("❌ Error processing bulk approval emails:", error);
        res.status(500).json({
          success: false,
          message: "Failed to send bulk approval emails",
          error: error.message,
        });
      }
    },
  );

  // Bulk status change for shipments (admin only)
  app.post(
    "/api/shipments/bulk-status-change",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { shipmentIds, newStatus } = req.body;

        // Validate input
        if (!Array.isArray(shipmentIds) || shipmentIds.length === 0) {
          return res
            .status(400)
            .json({ message: "Shipment IDs array is required" });
        }

        if (!newStatus) {
          return res.status(400).json({ message: "New status is required" });
        }

        // Validate status is valid
        const validStatuses = [
          "pending",
          "approved",
          "pre_transit",
          "in_transit",
          "delivered",
          "cancelled",
          "rejected",
        ];
        if (!validStatuses.includes(newStatus)) {
          return res.status(400).json({ message: "Invalid status value" });
        }

        let updatedCount = 0;
        let refundedCount = 0;
        let totalRefundAmount = 0;
        const errors = [];
        const refundDetails = [];

        // Check if new status requires refund (cancelled or rejected)
        const shouldRefund =
          newStatus === "cancelled" || newStatus === "rejected";

        // Update each shipment status and handle refunds
        for (const shipmentId of shipmentIds) {
          try {
            // Get current shipment data before updating
            const currentShipment = await storage.getShipment(shipmentId);

            if (!currentShipment) {
              errors.push({ shipmentId, error: "Shipment not found" });
              continue;
            }

            // Check if shipment needs refund - look for actual payment transaction instead of just status
            const hasPaymentTransaction = await storage.hasPaymentTransaction(shipmentId);
            const needsRefund =
              shouldRefund && hasPaymentTransaction && currentShipment.totalPrice > 0;

            // Update shipment status
            await storage.updateShipment(shipmentId, { status: newStatus });
            updatedCount++;

            // Process refund if needed
            if (needsRefund) {
              try {
                // Calculate refund amount (shipping + insurance)
                const shippingRefund = currentShipment.totalPrice;
                const insuranceRefund = currentShipment.insuranceCost || 0;
                const totalRefund = shippingRefund + insuranceRefund;

                // Update user balance
                const updatedUser = await storage.updateUserBalance(
                  currentShipment.userId,
                  totalRefund,
                );

                if (updatedUser) {
                  // Create refund transaction for shipping cost
                  if (shippingRefund > 0) {
                    await storage.createTransaction(
                      currentShipment.userId,
                      shippingRefund,
                      `Refund: Shipment #${shipmentId} ${newStatus} - shipping cost refunded`,
                      shipmentId,
                    );
                  }

                  // Create separate refund transaction for insurance if applicable
                  if (insuranceRefund > 0) {
                    await storage.createTransaction(
                      currentShipment.userId,
                      insuranceRefund,
                      `Refund: Shipment #${shipmentId} ${newStatus} - insurance refunded`,
                      shipmentId,
                    );
                  }

                  refundedCount++;
                  totalRefundAmount += totalRefund;

                  refundDetails.push({
                    shipmentId,
                    userId: currentShipment.userId,
                    shippingRefund: shippingRefund / 100,
                    insuranceRefund: insuranceRefund / 100,
                    totalRefund: totalRefund / 100,
                  });

                  console.log(
                    `💰 REFUND PROCESSED: Shipment #${shipmentId} - User ${currentShipment.userId} refunded $${(totalRefund / 100).toFixed(2)} (Shipping: $${(shippingRefund / 100).toFixed(2)}, Insurance: $${(insuranceRefund / 100).toFixed(2)})`,
                  );
                } else {
                  console.error(
                    `Failed to refund user ${currentShipment.userId} for shipment ${shipmentId}`,
                  );
                  errors.push({
                    shipmentId,
                    error: "Failed to process refund",
                  });
                }
              } catch (refundError) {
                console.error(
                  `Error processing refund for shipment ${shipmentId}:`,
                  refundError,
                );
                errors.push({
                  shipmentId,
                  error: `Refund failed: ${refundError.message}`,
                });
              }
            }
          } catch (error) {
            console.error(`Error updating shipment ${shipmentId}:`, error);
            errors.push({ shipmentId, error: error.message });
          }
        }

        console.log(
          `✅ Bulk status change: Updated ${updatedCount} shipments to status "${newStatus}"`,
        );
        if (refundedCount > 0) {
          console.log(
            `💰 Refunds processed: ${refundedCount} shipments, total amount: $${(totalRefundAmount / 100).toFixed(2)}`,
          );
        }

        const response = {
          message: `Successfully updated ${updatedCount} shipments to ${newStatus}`,
          updatedCount,
          requestedCount: shipmentIds.length,
          errors: errors.length > 0 ? errors : undefined,
        };

        // Add refund information to response if refunds were processed
        if (refundedCount > 0) {
          response.refundsProcessed = {
            count: refundedCount,
            totalAmount: totalRefundAmount / 100,
            details: refundDetails,
          };
        }

        res.json(response);
      } catch (error) {
        console.error("Error in bulk status change:", error);
        res.status(500).json({ message: "Failed to update shipment statuses" });
      }
    },
  );

  // Add manual tracking number to a shipment (admin only)
  app.post(
    "/api/shipments/add-tracking/:id",
    authenticateToken,
    isAdmin,
    addManualTrackingNumber,
  );

  // Helper function to format shipment IDs (MOG-prefix format)
  function formatShipmentId(id: number): string {
    return `MOG-${id.toString().padStart(6, "0")}`;
  }

  // Request tracking number faster for an approved shipment
  app.post(
    "/api/shipments/:id/request-tracking",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);

        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        // Verify the shipment exists
        const shipment = await storage.getShipment(shipmentId);

        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // Check if shipment is in APPROVED or PENDING status
        if (
          shipment.status !== ShipmentStatus.APPROVED &&
          shipment.status !== ShipmentStatus.PENDING
        ) {
          return res
            .status(400)
            .json({
              message:
                "Only pending or approved shipments can request faster tracking",
            });
        }

        // Check if shipment already has a carrier tracking number
        if (shipment.carrierTrackingNumber) {
          return res
            .status(400)
            .json({ message: "This shipment already has a tracking number" });
        }

        // Flag the shipment for priority tracking processing
        await storage.updateShipment(shipmentId, {
          priorityTracking: true,
          priorityTrackingRequestedAt: new Date(),
        });

        // Send email notification to admins about the request
        try {
          if (req.user && req.user.id) {
            const user = await storage.getUser(req.user.id);

            if (user) {
              // Build the admin notification email
              const adminEmails = [
                "info@moogship.com",
                "gokhan@moogco.com",
                "oguzhan@moogco.com",
                "sercan@moogship.com",
              ];
              const subject = `Tracking Number Request - ${formatShipmentId(shipment.id)}`;

              const htmlContent = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0066cc;">Hızlandırılmış Takip Numarası Talebi / Expedited Tracking Number Request</h2>
                
                <p><strong>Gönderi Numarası / Shipment ID:</strong> ${formatShipmentId(shipment.id)}</p>
                <p><strong>Müşteri / Customer:</strong> ${user.name}</p>
                <p><strong>E-posta / Email:</strong> ${user.email}</p>
                <p><strong>Gönderinin gideceği ülke / Destination Country:</strong> ${shipment.receiverCountry}</p>
                <p><strong>Gönderinin gideceği şehir / Destination City:</strong> ${shipment.receiverCity}</p>
                <p><strong>Talep Tarihi / Request Date:</strong> ${new Date().toLocaleString("tr-TR")}</p>
                
                <p style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
                  Bu gönderi için hızlandırılmış takip numarası talep edilmiştir. Lütfen en kısa sürede işleme alınız.<br>
                  <em>An expedited tracking number has been requested for this shipment. Please process it as soon as possible.</em>
                </p>
              </div>
            `;

              // Create a single email with all admin recipients in BCC
              const emailResult = await sendEmail({
                to: "info@moogship.com",
                bcc: adminEmails.join(","), // All recipients in BCC
                from: "cs@moogship.com",
                subject,
                html: htmlContent,
              });

              if (!emailResult.success) {
                console.warn(
                  `Failed to send tracking request notification email:`,
                  emailResult.error,
                );
              } else {
                console.log(
                  `Tracking request notification sent to ${adminEmails.join(", ")}`,
                );
              }

              // Create database notification for admins
              try {
                await storage.createFastTrackingNotification({
                  shipmentId: shipmentId,
                  userId: user.id,
                  userName: user.name || user.username,
                  userEmail: user.email,
                  destinationCountry: shipment.receiverCountry || "Unknown",
                  destinationCity: shipment.receiverCity || "Unknown",
                });
                console.log(
                  `📱 Fast tracking notification created for shipment ${shipmentId}`,
                );
              } catch (dbError) {
                console.error(
                  "Error creating fast tracking notification:",
                  dbError,
                );
                // Continue even if database notification fails
              }
            }
          }
        } catch (emailError) {
          console.error(
            "Error preparing tracking request notification email:",
            emailError,
          );
          // Continue even if email notification fails
        }

        res.json({
          message:
            "Takip numarası talebiniz alınmıştır. Ekibimiz en kısa sürede işleme alacaktır.",
          success: true,
        });
      } catch (error) {
        console.error("Error requesting tracking number:", error);
        res
          .status(500)
          .json({
            message:
              "İşlem sırasında bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.",
          });
      }
    },
  );

  // Test endpoint for manual tracking (for development/testing only - does not require auth)
  app.post("/api/test/manual-tracking/:id", async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.id);
      if (isNaN(shipmentId)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid shipment ID" });
      }

      const { trackingNumber, carrierName } = req.body;
      if (!trackingNumber) {
        return res
          .status(400)
          .json({ success: false, message: "Tracking number is required" });
      }

      console.log(
        `🧪 TEST: Adding manual tracking number ${trackingNumber} to shipment #${shipmentId}`,
      );

      // Get the shipment
      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res
          .status(404)
          .json({ success: false, message: "Shipment not found" });
      }

      // Log current state
      console.log(`🧪 TEST: Before update - Shipment #${shipmentId}:`, {
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
        carrierTrackingNumber: shipment.carrierTrackingNumber,
      });

      // First ensure the shipment is in APPROVED status (for testing)
      await storage.updateShipment(shipmentId, {
        status: ShipmentStatus.APPROVED,
        trackingNumber: null,
        carrierTrackingNumber: null,
        updatedAt: new Date(),
      });

      // Update the shipment with the manual tracking number
      const updatedShipment = await storage.updateShipment(shipmentId, {
        carrierTrackingNumber: trackingNumber, // Add as carrier tracking number only
        carrierName: carrierName || "Manual Entry",
        status: ShipmentStatus.IN_TRANSIT,
        updatedAt: new Date(),
      });

      // Log updated state
      console.log(`🧪 TEST: After update - Shipment #${shipmentId}:`, {
        status: updatedShipment.status,
        trackingNumber: updatedShipment.trackingNumber, // Should remain unchanged
        carrierTrackingNumber: updatedShipment.carrierTrackingNumber, // Should be the new tracking number
      });

      // Return success
      res.json({
        success: true,
        message: "Test tracking number added successfully",
        shipment: {
          id: updatedShipment.id,
          status: updatedShipment.status,
          trackingNumber: updatedShipment.trackingNumber,
          carrierTrackingNumber: updatedShipment.carrierTrackingNumber,
          carrierName: updatedShipment.carrierName,
        },
      });
    } catch (error) {
      console.error(`🧪 TEST: Error adding tracking number:`, error);
      res.status(500).json({
        success: false,
        message: "Test failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // TEST ENDPOINT for debugging - will be removed after testing
  app.get("/api/test/approve-shipment/:id", async (req, res) => {
    try {
      console.log(`🧪 TEST: Attempting to approve shipment #${req.params.id}`);

      // Get current user details if authenticated
      let userId = null;
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
        console.log(`🧪 TEST: Authenticated as user ${userId}`);
      } else {
        console.log(`🧪 TEST: Not authenticated`);
      }

      // Get shipment details
      const shipmentId = parseInt(req.params.id);
      const shipment = await storage.getShipment(shipmentId);

      if (!shipment) {
        console.log(`🧪 TEST: Shipment #${shipmentId} not found`);
        return res.status(404).json({ message: "Shipment not found" });
      }

      console.log(`🧪 TEST: Found shipment #${shipmentId}:`, {
        status: shipment.status,
        totalPrice: shipment.totalPrice,
        userId: shipment.userId,
      });

      // Force approval logic (simulating the approveShipment function)
      // First generate tracking number
      const trackingNumber = `TEST-TN-${Date.now()}-${shipmentId}`;

      // Update status
      const updatedShipment = await storage.updateShipmentStatus(
        shipmentId,
        ShipmentStatus.APPROVED,
        shipment.labelUrl || "/test-label.pdf",
        trackingNumber,
      );

      console.log(`🧪 TEST: Updated shipment status to APPROVED`);

      // Deduct the price from the user's balance
      if (shipment.userId && shipment.totalPrice) {
        try {
          // Fetch user details before charging
          const userBefore = await storage.getUser(shipment.userId);
          if (userBefore) {
            console.log(
              `🧪 TEST: User ${userBefore.id} balance before charge: ${userBefore.balance} cents ($${(userBefore.balance / 100).toFixed(2)})`,
            );
          }

          // Apply the charge
          const user = await storage.updateUserBalance(
            shipment.userId,
            -shipment.totalPrice,
          );

          if (user) {
            console.log(
              `🧪 TEST: Deducted $${(shipment.totalPrice / 100).toFixed(2)} from user ${user.id}'s balance for shipment ${shipmentId}`,
            );
            console.log(
              `🧪 TEST: New balance: ${user.balance} cents ($${(user.balance / 100).toFixed(2)})`,
            );

            // Create a transaction record
            const transaction = await storage.createTransaction(
              shipment.userId,
              -shipment.totalPrice,
              `TEST PAYMENT for shipment #${shipmentId}`,
              shipment.id,
            );

            console.log(
              `🧪 TEST: Created transaction record ${transaction.id} for payment`,
            );
          }
        } catch (balanceError) {
          console.error("🧪 TEST: Error updating user balance:", balanceError);
        }
      } else {
        console.log(
          `🧪 TEST: No balance update - Missing userId (${shipment.userId}) or totalPrice (${shipment.totalPrice})`,
        );
      }

      return res.status(200).json({
        message: "Test approval successful",
        shipmentId,
        newStatus: ShipmentStatus.APPROVED,
        balanceUpdated: shipment.userId && shipment.totalPrice ? true : false,
      });
    } catch (error) {
      console.error("🧪 TEST ERROR:", error);
      return res
        .status(500)
        .json({ message: "Test approval failed", error: String(error) });
    }
  });

  // Track a shipment (user can only track their own shipments, admin can track all)
  app.get(
    "/api/shipments/track/:id",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.id);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        // If shipment has a carrier tracking number, get real-time tracking data
        if (shipment.carrierTrackingNumber) {
          try {
            // Detect carrier type based on tracking number format
            const detectCarrier = (
              trackingNumber: string,
            ): "UPS" | "DHL" | "UNKNOWN" => {
              if (/^1Z[A-Z0-9]{16}$/i.test(trackingNumber)) return "UPS";
              if (
                /^\d{10,11}$/.test(trackingNumber) ||
                /^[A-Z]{2,3}\d{9,11}$/i.test(trackingNumber) ||
                /^[A-Z0-9]{8,14}$/i.test(trackingNumber)
              )
                return "DHL";
              return "UNKNOWN";
            };

            const carrierType = detectCarrier(shipment.carrierTrackingNumber);
            console.log(
              `Fetching ${carrierType} tracking for shipment ${shipmentId} with carrier tracking: ${shipment.carrierTrackingNumber}`,
            );

            let trackingData;

            if (carrierType === "UPS") {
              const { trackPackage } = await import("./services/ups.js");
              trackingData = await trackPackage(shipment.carrierTrackingNumber);
            } else if (carrierType === "DHL") {
              const { trackPackage } = await import("./services/dhl.js");
              trackingData = await trackPackage(shipment.carrierTrackingNumber);
            } else {
              console.warn(
                `Unknown carrier type for tracking number: ${shipment.carrierTrackingNumber}`,
              );
              throw new Error("Unsupported carrier type");
            }

            console.log(
              `${carrierType} tracking result for ${shipment.carrierTrackingNumber}:`,
              JSON.stringify(trackingData, null, 2),
            );

            // Convert tracking data to our dialog format
            const trackingResponse = {
              id: shipment.id,
              trackingNumber: shipment.trackingNumber,
              carrierTrackingNumber: shipment.carrierTrackingNumber,
              currentStatus: trackingData.status,
              lastUpdated: trackingData.statusTime,
              currentLocation:
                trackingData.location || "Location not available",
              estimatedDelivery: trackingData.estimatedDelivery,
              events: trackingData.events || [],
              carrier: carrierType,
              serviceName: trackingData.serviceName,
              packageWeight: trackingData.packageWeight,
              error: trackingData.error,
            };

            // Force no cache by setting headers and adding timestamp
            res.set("Cache-Control", "no-cache, no-store, must-revalidate");
            res.set("Pragma", "no-cache");
            res.set("Expires", "0");
            res.set("ETag", Date.now().toString());

            // Add timestamp to ensure fresh data
            trackingResponse.timestamp = new Date().toISOString();

            return res.json(trackingResponse);
          } catch (trackingError) {
            console.error(
              `Carrier tracking error for shipment ${shipmentId}:`,
              trackingError,
            );
            // Fall back to basic tracking info if carrier API fails
          }
        }

        // Return basic tracking info if no carrier tracking number or UPS API fails
        return res.json({
          id: shipment.id,
          trackingNumber: shipment.trackingNumber,
          currentStatus: shipment.status,
          lastUpdated:
            shipment.updatedAt?.toISOString() || new Date().toISOString(),
          currentLocation: "Processing at MoogShip facility",
          events: [],
          carrier: "MoogShip",
          carrierTrackingNumber: shipment.carrierTrackingNumber,
        });
      } catch (error) {
        console.error("Error retrieving tracking info:", error);
        return res
          .status(500)
          .json({ message: "Failed to retrieve tracking information" });
      }
    },
  );

  // Track a package using third-party carrier APIs (requires carrier tracking number)
  // Public route - no authentication required
  // Supports both GET (query params) and POST (JSON body)
  app.get("/api/track", trackPackageController);
  app.post("/api/track", trackPackageController);

  // Find shipment by tracking number (admin only)
  app.get(
    "/api/shipments/find-by-tracking/:trackingNumber",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { trackingNumber } = req.params;

        if (!trackingNumber) {
          return res.status(400).json({
            success: false,
            message: "Tracking number is required"
          });
        }

        // Search for shipment by either MoogShip tracking number or carrier tracking number
        // Direct database query as workaround for storage method issue
        const [shipment] = await db
          .select()
          .from(shipments)
          .where(
            or(
              eq(shipments.trackingNumber, trackingNumber),
              eq(shipments.carrierTrackingNumber, trackingNumber),
            ),
          );

        if (!shipment) {
          return res.status(404).json({
            success: false,
            message: "Shipment not found with this tracking number"
          });
        }

        return res.json({
          success: true,
          shipmentId: shipment.id,
          shipment: {
            id: shipment.id,
            trackingNumber: shipment.trackingNumber,
            carrierTrackingNumber: shipment.carrierTrackingNumber,
            status: shipment.status,
            senderName: shipment.senderName,
            receiverName: shipment.receiverName,
            receiverCity: shipment.receiverCity,
            receiverCountry: shipment.receiverCountry
          }
        });
      } catch (error) {
        console.error("Error finding shipment by tracking number:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to find shipment"
        });
      }
    }
  );

  // Batch tracking routes (admin only)
  // Run tracking for all shipments with carrier tracking numbers that are not yet delivered
  app.post(
    "/api/shipments/batch-track",
    authenticateToken,
    isAdmin,
    batchTrackController,
  );

  // Track a specific shipment by ID and update its tracking info
  app.post(
    "/api/shipments/:id/track",
    authenticateToken,
    isOwnerOrAdmin,
    trackSingleShipmentController,
  );

  // Get shipping label for a shipment (user can only get labels for their own shipments, admin can get all)
  app.get(
    "/api/shipments/:id/label",
    authenticateToken,
    isOwnerOrAdmin,
    getShippingLabel,
  );

  // Merge multiple shipment labels into a single PDF
  app.post(
    "/api/shipments/merge-labels",
    authenticateToken,
    async (req, res) => {
      try {
        const { shipmentIds } = req.body;
        const userId = req.user?.id;
        
        if (!shipmentIds || !Array.isArray(shipmentIds) || shipmentIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "Please provide an array of shipment IDs"
          });
        }
        
        console.log(`📄 MERGE PDFs: Merging ${shipmentIds.length} labels for user ${userId}`);
        
        // Import PDF-lib for merging
        const { PDFDocument } = await import('pdf-lib');
        
        // Create a new PDF document for merging
        const mergedPdf = await PDFDocument.create();
        
        // Fetch and merge each shipment's label
        for (const shipmentId of shipmentIds) {
          const shipment = await storage.getShipment(shipmentId);
          
          if (!shipment) {
            console.log(`📄 MERGE PDFs: Shipment ${shipmentId} not found`);
            continue;
          }
          
          // Check user has access to this shipment
          if (req.user?.role !== 'admin' && shipment.userId !== userId) {
            console.log(`📄 MERGE PDFs: User ${userId} doesn't have access to shipment ${shipmentId}`);
            continue;
          }
          
          // Use labelPdf (MoogShip label) if available, otherwise use carrierLabelPdf
          const labelPdfBase64 = shipment.labelPdf || shipment.carrierLabelPdf;
          
          if (!labelPdfBase64) {
            console.log(`📄 MERGE PDFs: No label found for shipment ${shipmentId}`);
            continue;
          }
          
          try {
            // Convert base64 to buffer
            const pdfBuffer = Buffer.from(labelPdfBase64, 'base64');
            
            // Load the existing PDF
            const existingPdf = await PDFDocument.load(pdfBuffer);
            
            // Copy all pages from the existing PDF
            const pages = await mergedPdf.copyPages(existingPdf, existingPdf.getPageIndices());
            
            // Add pages to the merged PDF
            pages.forEach(page => mergedPdf.addPage(page));
            
            console.log(`📄 MERGE PDFs: Added label for shipment ${shipmentId}`);
          } catch (error) {
            console.error(`📄 MERGE PDFs: Error processing shipment ${shipmentId}:`, error);
          }
        }
        
        // Check if we have any pages
        if (mergedPdf.getPageCount() === 0) {
          return res.status(404).json({
            success: false,
            message: "No valid labels found for the selected shipments"
          });
        }
        
        // Save the merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const mergedPdfBuffer = Buffer.from(mergedPdfBytes);
        
        // Send the merged PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="merged-labels-${Date.now()}.pdf"`);
        res.setHeader('Cache-Control', 'no-cache');
        
        console.log(`📄 MERGE PDFs: Successfully merged ${mergedPdf.getPageCount()} pages`);
        
        return res.send(mergedPdfBuffer);
        
      } catch (error) {
        console.error("Error merging PDFs:", error);
        return res.status(500).json({
          success: false,
          message: "Failed to merge labels"
        });
      }
    }
  );

  // Direct PDF serving endpoint for browser embed elements (requires authentication and ownership)
  app.get(
    "/api/shipments/:id/label/pdf",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const labelType = req.query.type?.toString() || "carrier";

        console.log(
          `📄 PDF: Authenticated PDF request for shipment ${id}, type: ${labelType}, user: ${req.user?.id}`,
        );

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          console.log(`📄 PDF: Shipment ${id} not found`);
          return res.status(404).send("Shipment not found");
        }

        // Serve carrier labels for authenticated users with proper access
        if (labelType === "carrier" && shipment.carrierLabelPdf) {
          console.log(
            `📄 PDF: Serving carrier label PDF for shipment ${id} to user ${req.user?.id}`,
          );
          const pdfBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="carrier-label-${id}.pdf"`,
          );
          res.setHeader("Cache-Control", "private, max-age=3600"); // Private cache for security
          return res.send(pdfBuffer);
        }

        console.log(`📄 PDF: Carrier label PDF not found for shipment ${id}`);
        return res.status(404).send("Carrier label PDF not found");
      } catch (error) {
        console.error("Error serving PDF:", error);
        return res.status(500).send("Error serving PDF");
      }
    },
  );

  // Direct MoogShip label serving endpoint (requires authentication and ownership)
  app.get(
    "/api/shipments/:id/moogship-label",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;

        console.log(
          `📄 MOOGSHIP: Authenticated MoogShip label request for shipment ${id}, user: ${req.user?.id}`,
        );

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          console.log(`📄 MOOGSHIP: Shipment ${id} not found`);
          return res.status(404).send("Shipment not found");
        }

        // Serve MoogShip label PDF if available
        if (shipment.labelPdf) {
          console.log(
            `📄 MOOGSHIP: Serving MoogShip label PDF for shipment ${id} to user ${req.user?.id}`,
          );
          const pdfBuffer = Buffer.from(shipment.labelPdf, "base64");
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="moogship-label-${id}.pdf"`,
          );
          res.setHeader("Cache-Control", "private, max-age=3600"); // Private cache for security
          return res.send(pdfBuffer);
        }

        // If no stored PDF, try to generate one
        if (shipment.labelUrl) {
          const filePath = path.join(process.cwd(), shipment.labelUrl);
          if (fs.existsSync(filePath)) {
            console.log(
              `📄 MOOGSHIP: Serving MoogShip label file for shipment ${id} to user ${req.user?.id}`,
            );
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="moogship-label-${id}.pdf"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.sendFile(filePath);
          }
        }

        console.log(`📄 MOOGSHIP: MoogShip label not found for shipment ${id}`);
        return res.status(404).send("MoogShip label not found");
      } catch (error) {
        console.error("Error serving MoogShip label:", error);
        return res.status(500).send("Error serving MoogShip label");
      }
    },
  );

  // PDF carrier label endpoint for UPS/DHL/FedEx services (requires authentication and ownership)
  app.get(
    "/api/shipments/:id/carrier-label-pdf",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        console.log(
          `📄 PDF CARRIER: Authenticated request for shipment ${id}, user: ${req.user?.id}`,
        );

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          console.log(`📄 PDF CARRIER: Shipment ${id} not found`);
          return res.status(404).send("Shipment not found");
        }

        // Check if this shipment has PDF carrier label data
        if (!shipment.carrierLabelPdf || shipment.carrierLabelPdf === "{}") {
          console.log(
            `📄 PDF CARRIER: No carrier label data found for shipment ${id}`,
          );
          return res.status(404).send("PDF carrier label not found");
        }

        // Check if it's PDF data (starts with PDF header)
        const isValidPDF = shipment.carrierLabelPdf.startsWith("JVBERi0x");

        if (isValidPDF) {
          console.log(
            `📄 PDF CARRIER: Serving PDF carrier label for shipment ${id} to user ${req.user?.id} (${shipment.carrierLabelPdf.length} chars)`,
          );
          const pdfBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="carrier-label-${id}.pdf"`,
          );
          res.setHeader("Cache-Control", "private, max-age=3600");
          return res.send(pdfBuffer);
        } else {
          console.log(
            `📄 PDF CARRIER: Data is not PDF format for shipment ${id}, attempting to download from URL if available`,
          );

          // If we have a URL but no proper PDF data, try to download and serve immediately
          if (shipment.carrierLabelUrl) {
            try {
              console.log(
                `📄 PDF CARRIER: Downloading PDF from URL: ${shipment.carrierLabelUrl}`,
              );
              const labelResponse = await fetch(shipment.carrierLabelUrl);
              if (
                labelResponse.ok &&
                labelResponse.headers.get("content-type")?.includes("pdf")
              ) {
                const labelBuffer = await labelResponse.arrayBuffer();
                const pdfBuffer = Buffer.from(labelBuffer);

                console.log(
                  `📄 PDF CARRIER: Successfully downloaded and serving PDF for shipment ${id} to user ${req.user?.id}`,
                );
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                  "Content-Disposition",
                  `inline; filename="carrier-label-${id}.pdf"`,
                );
                res.setHeader("Cache-Control", "private, max-age=3600");
                return res.send(pdfBuffer);
              }
            } catch (downloadError) {
              console.error(
                `📄 PDF CARRIER: Error downloading PDF for shipment ${id}:`,
                downloadError,
              );
            }
          }

          return res.status(400).send("Carrier label is not in PDF format");
        }
      } catch (error) {
        console.error("Error serving PDF carrier label:", error);
        return res.status(500).send("Error serving PDF carrier label");
      }
    },
  );

  // PNG carrier label endpoint (requires authentication and ownership)
  app.get(
    "/api/shipments/:id/carrier-label-png",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        console.log(
          `🖼️ PNG CARRIER: Authenticated request for shipment ${id}, user: ${req.user?.id}`,
        );

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          console.log(`🖼️ PNG CARRIER: Shipment ${id} not found`);
          return res.status(404).send("Shipment not found");
        }

        // Check if this shipment has carrier label data
        if (shipment.carrierLabelPdf) {
          // Check if it's PNG data (starts with PNG header)
          const isValidPNG = shipment.carrierLabelPdf.startsWith("iVBORw0KGgo");

          if (isValidPNG) {
            console.log(
              `🖼️ PNG CARRIER: Serving PNG carrier label for shipment ${id} to user ${req.user?.id} (${shipment.carrierLabelPdf.length} chars)`,
            );
            const pngBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
            res.setHeader("Content-Type", "image/png");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="carrier-label-${id}.png"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.send(pngBuffer);
          } else {
            console.log(
              `🖼️ PNG CARRIER: Data is not PNG format for shipment ${id}`,
            );
            return res.status(400).send("Carrier label is not in PNG format");
          }
        }

        // If no carrier label data, check external URL
        if (
          shipment.carrierLabelUrl &&
          shipment.carrierLabelUrl.includes(".png")
        ) {
          console.log(
            `🖼️ PNG CARRIER: Redirecting to external PNG URL for shipment ${id}: ${shipment.carrierLabelUrl}`,
          );
          return res.redirect(shipment.carrierLabelUrl);
        }

        console.log(
          `🖼️ PNG CARRIER: No PNG carrier label found for shipment ${id}`,
        );
        return res.status(404).send("PNG carrier label not found");
      } catch (error) {
        console.error("Error serving PNG carrier label:", error);
        return res.status(500).send("Error serving PNG carrier label");
      }
    },
  );

  // Direct PNG serving endpoint for PNG carrier labels (requires authentication and ownership)
  app.get(
    "/api/shipments/:id/label/png",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const labelType = req.query.type?.toString() || "carrier";

        console.log(
          `🖼️ PNG: Authenticated PNG request for shipment ${id}, type: ${labelType}, user: ${req.user?.id}`,
        );

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          console.log(`🖼️ PNG: Shipment ${id} not found`);
          return res.status(404).send("Shipment not found");
        }

        // Check if this is a PNG carrier label
        if (labelType === "carrier" && shipment.carrierLabelPdf) {
          // Validate PNG data
          const isValidPNG = shipment.carrierLabelPdf.startsWith("iVBORw0KGgo");

          if (isValidPNG) {
            console.log(
              `🖼️ PNG: Serving carrier label PNG for shipment ${id} to user ${req.user?.id} (${shipment.carrierLabelPdf.length} chars)`,
            );
            const pngBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
            res.setHeader("Content-Type", "image/png");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="carrier-label-${id}.png"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600"); // Private cache for security
            return res.send(pngBuffer);
          } else {
            console.log(
              `🖼️ PNG: Data in carrierLabelPdf is not PNG format for shipment ${id}`,
            );
            return res.status(404).send("PNG carrier label not found");
          }
        }

        console.log(`🖼️ PNG: PNG carrier label not found for shipment ${id}`);
        return res.status(404).send("PNG carrier label not found");
      } catch (error) {
        console.error("Error serving PNG:", error);
        return res.status(500).send("Error serving PNG");
      }
    },
  );

  // Combined labels endpoint for multiple shipments
  app.post(
    "/api/shipments/combined-labels",
    authenticateToken,
    async (req, res) => {
      try {
        const { shipmentIds } = req.body;

        if (
          !shipmentIds ||
          !Array.isArray(shipmentIds) ||
          shipmentIds.length === 0
        ) {
          return res
            .status(400)
            .json({ error: "shipmentIds array is required" });
        }

        // Get all shipments
        const shipments = [];
        for (const id of shipmentIds) {
          const shipment = await storage.getShipment(parseInt(id));
          if (shipment) {
            shipments.push(shipment);
          }
        }

        if (shipments.length === 0) {
          return res.status(404).json({ error: "No valid shipments found" });
        }

        // Generate combined labels
        const { generateCombinedShippingLabels } = await import(
          "./services/labelGenerator.js"
        );
        const result = await generateCombinedShippingLabels(shipments);

        res.json({
          success: true,
          labelPath: result.labelPath,
          shipmentCount: shipments.length,
          message: `Combined labels generated for ${shipments.length} shipments`,
        });
      } catch (error) {
        console.error("Error generating combined labels:", error);
        res.status(500).json({ error: "Failed to generate combined labels" });
      }
    },
  );

  // Download combined labels PDF (requires authentication)
  app.get(
    "/api/shipments/combined-labels/:filename",
    authenticateToken,
    async (req, res) => {
      try {
        const { filename } = req.params;
        const filePath = path.join(process.cwd(), "uploads", filename);

        if (!fs.existsSync(filePath)) {
          return res.status(404).send("Combined labels file not found");
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`,
        );
        res.sendFile(filePath);
      } catch (error) {
        console.error("Error serving combined labels:", error);
        res.status(500).send("Error serving combined labels");
      }
    },
  );

  // ============ SECURE TOKEN-BASED LABEL ENDPOINTS ============

  // Generate secure label token endpoint
  app.post(
    "/api/shipments/:id/generate-label-token",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { labelType = "moogship" } = req.body;

        const shipment = await storage.getShipment(parseInt(id));

        if (!shipment) {
          return res.status(404).json({ error: "Shipment not found" });
        }

        // Generate secure token
        const token = generateLabelToken(parseInt(id), req.user!.id, labelType);

        console.log(
          `🔒 TOKEN: Generated secure label token for shipment ${id}, user: ${req.user?.id}, type: ${labelType}`,
        );

        res.json({
          token,
          labelType,
          expiresIn: "24h",
          secureUrl: `/api/labels/secure/${token}`,
        });
      } catch (error) {
        console.error("Error generating label token:", error);
        res.status(500).json({ error: "Failed to generate label token" });
      }
    },
  );

  // Secure label access endpoint using token
  app.get("/api/labels/secure/:token", async (req, res) => {
    try {
      const { token } = req.params;

      // Verify and decode token
      const { shipmentId, userId, labelType } = verifyLabelToken(token);

      console.log(
        `🔒 SECURE: Secure label request with token for shipment ${shipmentId}, user: ${userId}, type: ${labelType}`,
      );

      const shipment = await storage.getShipment(shipmentId);

      if (!shipment) {
        console.log(`🔒 SECURE: Shipment ${shipmentId} not found`);
        return res.status(404).send("Shipment not found");
      }

      // Verify user has access to this shipment (owner or admin)
      const requestUser = await storage.getUser(userId);
      if (!requestUser) {
        console.log(`🔒 SECURE: User ${userId} not found`);
        return res.status(403).send("Access denied");
      }

      const isAdmin = requestUser.role === "admin";
      const isOwner = shipment.userId === userId;

      if (!isAdmin && !isOwner) {
        console.log(
          `🔒 SECURE: Access denied for user ${userId} to shipment ${shipmentId}`,
        );
        return res.status(403).send("Access denied");
      }

      // Serve the requested label type
      if (labelType === "moogship") {
        if (shipment.labelPdf) {
          console.log(
            `🔒 SECURE: Serving MoogShip label PDF for shipment ${shipmentId} to user ${userId}`,
          );
          const pdfBuffer = Buffer.from(shipment.labelPdf, "base64");
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader(
            "Content-Disposition",
            `inline; filename="moogship-label-${shipmentId}.pdf"`,
          );
          res.setHeader("Cache-Control", "private, max-age=3600");
          return res.send(pdfBuffer);
        } else if (shipment.labelUrl) {
          const filePath = path.join(process.cwd(), shipment.labelUrl);
          if (fs.existsSync(filePath)) {
            console.log(
              `🔒 SECURE: Serving MoogShip label file for shipment ${shipmentId} to user ${userId}`,
            );
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="moogship-label-${shipmentId}.pdf"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.sendFile(filePath);
          }
        }
        return res.status(404).send("MoogShip label not found");
      } else if (labelType === "carrier") {
        if (shipment.carrierLabelPdf && shipment.carrierLabelPdf !== "{}") {
          const isValidPDF = shipment.carrierLabelPdf.startsWith("JVBERi0x");
          const isValidPNG = shipment.carrierLabelPdf.startsWith("iVBORw0KGgo");

          if (isValidPDF) {
            console.log(
              `🔒 SECURE: Serving carrier label PDF for shipment ${shipmentId} to user ${userId}`,
            );
            const pdfBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="carrier-label-${shipmentId}.pdf"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.send(pdfBuffer);
          } else if (isValidPNG) {
            console.log(
              `🔒 SECURE: Serving carrier label PNG for shipment ${shipmentId} to user ${userId}`,
            );
            const pngBuffer = Buffer.from(shipment.carrierLabelPdf, "base64");
            res.setHeader("Content-Type", "image/png");
            res.setHeader(
              "Content-Disposition",
              `inline; filename="carrier-label-${shipmentId}.png"`,
            );
            res.setHeader("Cache-Control", "private, max-age=3600");
            return res.send(pngBuffer);
          }
        }

        // Try to download from URL if available
        if (shipment.carrierLabelUrl) {
          try {
            console.log(
              `🔒 SECURE: Downloading carrier label from URL for shipment ${shipmentId}`,
            );
            const labelResponse = await fetch(shipment.carrierLabelUrl);
            if (labelResponse.ok) {
              const contentType = labelResponse.headers.get("content-type");
              const labelBuffer = await labelResponse.arrayBuffer();
              const buffer = Buffer.from(labelBuffer);

              if (contentType?.includes("pdf")) {
                res.setHeader("Content-Type", "application/pdf");
                res.setHeader(
                  "Content-Disposition",
                  `inline; filename="carrier-label-${shipmentId}.pdf"`,
                );
              } else if (contentType?.includes("png")) {
                res.setHeader("Content-Type", "image/png");
                res.setHeader(
                  "Content-Disposition",
                  `inline; filename="carrier-label-${shipmentId}.png"`,
                );
              }

              res.setHeader("Cache-Control", "private, max-age=3600");
              return res.send(buffer);
            }
          } catch (downloadError) {
            console.error(
              `🔒 SECURE: Error downloading carrier label for shipment ${shipmentId}:`,
              downloadError,
            );
          }
        }

        return res.status(404).send("Carrier label not found");
      }

      return res.status(400).send("Invalid label type");
    } catch (error) {
      console.error("🔒 SECURE: Error accessing secure label:", error);
      if (
        error.message === "Invalid token" ||
        error.message === "Token expired"
      ) {
        return res.status(403).send("Invalid or expired token");
      }
      return res.status(500).send("Error accessing label");
    }
  });

  // Bulk secure token generation for multiple shipments
  app.post(
    "/api/shipments/generate-bulk-tokens",
    authenticateToken,
    async (req, res) => {
      try {
        const { shipmentIds, labelType = "moogship" } = req.body;

        if (!shipmentIds || !Array.isArray(shipmentIds)) {
          return res
            .status(400)
            .json({ error: "shipmentIds array is required" });
        }

        const tokens = [];

        for (const id of shipmentIds) {
          const shipment = await storage.getShipment(parseInt(id));
          if (shipment) {
            // Check access (owner or admin)
            const isAdmin = req.user?.role === "admin";
            const isOwner = shipment.userId === req.user?.id;

            if (isAdmin || isOwner) {
              const token = generateLabelToken(
                parseInt(id),
                req.user!.id,
                labelType,
              );
              tokens.push({
                shipmentId: parseInt(id),
                token,
                secureUrl: `/api/labels/secure/${token}`,
              });
            }
          }
        }

        console.log(
          `🔒 BULK: Generated ${tokens.length} secure label tokens for user: ${req.user?.id}, type: ${labelType}`,
        );

        res.json({
          tokens,
          labelType,
          expiresIn: "24h",
          count: tokens.length,
        });
      } catch (error) {
        console.error("Error generating bulk tokens:", error);
        res.status(500).json({ error: "Failed to generate bulk tokens" });
      }
    },
  );

  // Pickup request routes
  app.post("/api/shipments/:id/pickup", authenticateToken, requestPickup);
  app.post(
    "/api/shipments/batch-pickup",
    authenticateToken,
    requestBatchPickup,
  );
  app.get(
    "/api/pickup-requests",
    authenticateToken,
    isAdmin,
    getAllPickupRequests,
  );
  app.get(
    "/api/pickup-requests/approved",
    authenticateToken,
    isAdmin,
    getApprovedPickupRequests,
  );

  // Get pickup details with associated shipments
  app.get(
    "/api/pickup-requests/:id/details",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const pickupId = parseInt(req.params.id);
        if (isNaN(pickupId)) {
          return res.status(400).json({ message: "Invalid pickup request ID" });
        }

        const details = await storage.getPickupRequestWithShipments(pickupId);

        // Ensure the pickup request has all necessary fields
        const enhancedPickupRequest = {
          ...details.pickupRequest,
          // Format the pickup address to ensure it's usable for display
          formattedPickupAddress: details.pickupRequest.pickupAddress
            ? details.pickupRequest.pickupAddress
            : details.user.address
              ? details.user.address
              : "No pickup address provided",
        };

        // Log the structure of the response to help debug PDF generation issues
        console.log(`Pickup details for ${pickupId}:`, {
          pickupRequest: {
            ...enhancedPickupRequest,
            // Don't log sensitive data
            pickupNotes: enhancedPickupRequest.pickupNotes
              ? "Has notes"
              : "No notes",
            formattedPickupAddress:
              enhancedPickupRequest.formattedPickupAddress,
          },
          shipments: details.shipments.map((s) => ({
            id: s.id,
            // Log both sender and receiver information to debug the PDF issue
            senderName: s.senderName || "No sender name",
            senderEmail: s.senderEmail || "No sender email",
            senderPhone: s.senderPhone || "No sender phone",
            senderAddress: s.senderAddress || "No sender address",
            senderCity: s.senderCity || "No sender city",
            senderPostalCode: s.senderPostalCode || "No sender postal code",
            senderCountry: s.senderCountry || "No sender country",
            receiverName: s.receiverName || "No receiver name",
            receiverAddress: s.receiverAddress || "No receiver address",
            trackingNumber: s.trackingNumber || "No tracking",
          })),
          user: {
            id: details.user.id,
            name: details.user.name,
            email: details.user.email ? "Has email" : "No email",
            phone: details.user.phoneNumber || details.user.phone || "No phone",
          },
        });

        // To fix the PDF display problem, let's enhance the data structure

        // 1. First, make sure pickup address information is available on shipments directly
        if (details.shipments && details.shipments.length > 0) {
          // Add pickup address info to each shipment for easier access in PDF generation
          details.shipments = details.shipments.map((shipment) => {
            return {
              ...shipment,
              // Copy pickup information from pickup request to each shipment
              pickupAddress: enhancedPickupRequest.formattedPickupAddress,
              pickupCity:
                enhancedPickupRequest.pickupCity ||
                details.user.city ||
                "Istanbul",
              pickupPostalCode:
                enhancedPickupRequest.pickupPostalCode ||
                details.user.postalCode ||
                "",
              pickupCountry: enhancedPickupRequest.pickupCountry || "Turkey",
              pickupDate: enhancedPickupRequest.pickupDate,
              pickupStatus: enhancedPickupRequest.pickupStatus,
              pickupNotes: enhancedPickupRequest.pickupNotes,
              // Use the enhanced pickup request object
              pickupRequest: enhancedPickupRequest,
            };
          });

          // 2. Now enhance sender information
          // Find the first shipment with sender information to use as default
          const firstCompleteSenderInfo = details.shipments.find(
            (s) => s.senderName && s.senderAddress,
          );

          if (firstCompleteSenderInfo) {
            // Use this as a reference for missing sender info in other shipments
            details.shipments = details.shipments.map((shipment) => {
              // Only copy sender fields if they're missing
              return {
                ...shipment,
                senderName:
                  shipment.senderName ||
                  firstCompleteSenderInfo.senderName ||
                  details.user.name,
                senderEmail:
                  shipment.senderEmail ||
                  firstCompleteSenderInfo.senderEmail ||
                  details.user.email,
                senderPhone:
                  shipment.senderPhone ||
                  firstCompleteSenderInfo.senderPhone ||
                  details.user.phoneNumber ||
                  details.user.phone,
                senderAddress:
                  shipment.senderAddress ||
                  firstCompleteSenderInfo.senderAddress ||
                  details.user.address,
                senderCity:
                  shipment.senderCity ||
                  firstCompleteSenderInfo.senderCity ||
                  details.user.city,
                senderPostalCode:
                  shipment.senderPostalCode ||
                  firstCompleteSenderInfo.senderPostalCode ||
                  details.user.postalCode,
                senderCountry:
                  shipment.senderCountry ||
                  firstCompleteSenderInfo.senderCountry ||
                  "Turkey",
              };
            });
          } else {
            // If no shipment has sender info, use user info
            details.shipments = details.shipments.map((shipment) => {
              return {
                ...shipment,
                senderName: shipment.senderName || details.user.name,
                senderEmail: shipment.senderEmail || details.user.email,
                senderPhone:
                  shipment.senderPhone ||
                  details.user.phoneNumber ||
                  details.user.phone,
                senderAddress: shipment.senderAddress || details.user.address,
                senderCity: shipment.senderCity || details.user.city,
                senderPostalCode:
                  shipment.senderPostalCode || details.user.postalCode,
                senderCountry: shipment.senderCountry || "Turkey",
              };
            });
          }
        }

        res.json(details);
      } catch (error) {
        console.error("Error fetching pickup details:", error);
        res.status(500).json({ message: "Error fetching pickup details" });
      }
    },
  );

  // Add route for user's own pickup requests
  app.get("/api/my-pickup-requests", authenticateToken, async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User ID not found" });
      }

      // Get user's pickup requests
      const pickupRequests = await storage.getUserPickupRequests(userId);

      // Enhance pickup requests with shipment counts and other useful data
      const enhancedRequests = [];
      for (const pr of pickupRequests) {
        try {
          const { pickupRequest, shipments } =
            await storage.getPickupRequestWithShipments(pr.id);
          enhancedRequests.push({
            ...pickupRequest,
            shipmentCount: shipments.length,
            shipments: shipments.map((s) => ({
              id: s.id,
              receiverName: s.receiverName,
              receiverCountry: s.receiverCountry,
              trackingNumber: s.trackingNumber,
            })),
          });
        } catch (error) {
          console.error(`Error enhancing pickup request ${pr.id}:`, error);
          // Still include the basic pickup request
          enhancedRequests.push({
            ...pr,
            shipmentCount: 0,
            shipments: [],
          });
        }
      }

      console.log(
        `Returned ${enhancedRequests.length} pickup requests for user ${userId}`,
      );
      return res.status(200).json(enhancedRequests);
    } catch (error) {
      console.error("Error getting user pickup requests:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/pickup-request/:id", authenticateToken, async (req, res) => {
    try {
      const pickupRequestId = parseInt(req.params.id);
      const userId = req.user?.id;
      const isUserAdmin = req.user?.role === "admin";

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get pickup request with shipments
      const { pickupRequest, shipments, user } =
        await storage.getPickupRequestWithShipments(pickupRequestId);

      // Check if user is authorized to view this pickup request
      if (pickupRequest.userId !== userId && !isUserAdmin) {
        return res
          .status(403)
          .json({ message: "Not authorized to view this pickup request" });
      }

      // If the user is an admin, provide more detailed information about the shipments and the user
      if (isUserAdmin) {
        // Enhance the response with detailed user information for admin
        const enhancedUser = {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          companyName: user.companyName,
          address: user.address || "No address provided",
          city: user.city || "No city provided",
          postalCode: user.postalCode || "No postal code provided",
          country: user.country || "Turkey", // Default country
          phoneNumber: user.phoneNumber || "No phone number provided",
        };

        // Include complete shipment details for admin
        const enhancedShipments = shipments.map((shipment) => ({
          ...shipment,
          // Format the package dimensions and weight info for easy reading
          packageInfo: `${shipment.packageLength}x${shipment.packageWidth}x${shipment.packageHeight}cm, ${shipment.packageWeight}kg`,
          // Calculate the total price in a readable format
          totalPriceFormatted: `$${(shipment.totalPrice / 100).toFixed(2)}`,
          // Format the timestamp for easy reading
          createdAtFormatted: new Date(shipment.createdAt).toLocaleString(),
        }));

        return res.json({
          pickupRequest,
          shipments: enhancedShipments,
          user: enhancedUser,
          // Include pickup address details
          pickupAddress: {
            fullAddress: user.address || "No address provided",
            city: user.city || "Istanbul",
            postalCode: user.postalCode || "34000",
            country: "Turkey",
            contactName: user.name,
            contactEmail: user.email,
            contactPhone: user.phoneNumber || "No phone number provided",
          },
        });
      } else {
        // Regular user gets standard response
        return res.json({
          pickupRequest,
          shipments,
          user,
        });
      }
    } catch (error) {
      console.error("Error fetching pickup request details:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });
  app.put(
    "/api/pickup-request/:id/status",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const pickupRequestId = parseInt(req.params.id);
        const { status, notes } = req.body;

        if (!Object.values(PickupStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid pickup status" });
        }

        const updatedRequest = await storage.updatePickupRequestStatus(
          pickupRequestId,
          status,
          notes,
        );
        return res.json(updatedRequest);
      } catch (error) {
        console.error("Error updating pickup request status:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Update pickup request status using controller function
  app.put(
    "/api/pickup-requests/:id/status",
    authenticateToken,
    isAdmin,
    updatePickupRequestStatus,
  );
  app.put(
    "/api/shipments/:id/pickup-status",
    authenticateToken,
    isAdmin,
    updatePickupStatus,
  );

  // Bulk update pickup requests status
  app.put(
    "/api/pickup-requests/bulk/approve",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const {
          pickupIds,
          status = PickupStatus.SCHEDULED,
          notes = "Approved in bulk",
        } = req.body;

        if (!Array.isArray(pickupIds) || pickupIds.length === 0) {
          return res.status(400).json({
            message: "Invalid request: expected array of pickup IDs",
          });
        }

        const results = [];
        const errors = [];
        const emailsSent = [];
        const emailErrors = [];

        // Import the email sending function
        const { sendPickupApprovalEmail } = await import("./email");

        // Process each pickup request sequentially to avoid race conditions
        for (const id of pickupIds) {
          try {
            const pickupId = parseInt(id);
            if (isNaN(pickupId)) {
              errors.push({ id, message: "Invalid pickup ID format" });
              continue;
            }

            // Update the pickup request status
            const updatedRequest = await storage.updatePickupRequestStatus(
              pickupId,
              status,
              notes,
            );
            results.push(updatedRequest);

            // Get pickup request with shipments to count packages
            const pickupWithShipments =
              await storage.getPickupRequestWithShipments(pickupId);

            if (pickupWithShipments) {
              // Get user data for the notification
              const user = await storage.getUser(
                pickupWithShipments.pickupRequest.userId,
              );

              if (user && user.email) {
                try {
                  // Send notification email to the user
                  const emailResult = await sendPickupApprovalEmail(
                    {
                      id: pickupId,
                      userId: user.id,
                      userName: user.name || user.username,
                      pickupDate: pickupWithShipments.pickupRequest.pickupDate
                        ? new Date(pickupWithShipments.pickupRequest.pickupDate)
                        : new Date(),
                      pickupAddress:
                        pickupWithShipments.pickupRequest.pickupAddress,
                      pickupCity: pickupWithShipments.pickupRequest.pickupCity,
                      pickupPostalCode:
                        pickupWithShipments.pickupRequest.pickupPostalCode,
                      pickupNotes:
                        pickupWithShipments.pickupRequest.pickupNotes,
                      shipmentCount: pickupWithShipments.shipments?.length || 0,
                    },
                    user.email,
                  );

                  if (emailResult.success) {
                    emailsSent.push(pickupId);
                    console.log(
                      `Sent pickup approval notification to user ${user.id} (${user.email}) for pickup ${pickupId}`,
                    );
                  } else {
                    emailErrors.push({
                      id: pickupId,
                      userId: user.id,
                      email: user.email,
                      error: "Failed to send email",
                    });
                    console.warn(
                      `Failed to send pickup approval email for pickup ${pickupId} to user ${user.id} (${user.email})`,
                    );
                  }
                } catch (emailError) {
                  console.error(
                    `Error sending pickup approval email for pickup ${pickupId}:`,
                    emailError,
                  );
                  emailErrors.push({
                    id: pickupId,
                    userId: user.id,
                    email: user.email,
                    error: String(emailError),
                  });
                }
              } else {
                console.warn(
                  `No email available for user ${pickupWithShipments.userId} to send pickup approval notification`,
                );
                emailErrors.push({
                  id: pickupId,
                  userId: pickupWithShipments.userId,
                  error: "No email address available",
                });
              }
            }
          } catch (error) {
            console.error(`Error updating pickup request ${id}:`, error);
            errors.push({ id, message: "Failed to update pickup request" });
          }
        }

        return res.json({
          message: `${results.length} pickup requests approved successfully`,
          successCount: results.length,
          errorCount: errors.length,
          emailsSent: emailsSent.length,
          results,
          errors,
          emailsSent,
          emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
        });
      } catch (error) {
        console.error("Error bulk updating pickup requests:", error);
        return res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  // Calculate shipping price - single and bulk
  app.post("/api/calculate-price", calculatePrice);

  // Test FedEx OAuth connection
  app.get("/api/test/fedex-connection", async (req, res) => {
    try {
      console.log("🧪 TESTING FEDEX OAUTH CONNECTION");
      const { testFedExConnection } = await import("./services/fedex");
      const result = await testFedExConnection();
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Test failed",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test ALL carrier API connections
  app.get("/api/test/all-connections", async (req, res) => {
    console.log("🧪 TESTING ALL API CONNECTIONS");
    const results: Record<string, { success: boolean; message: string; details?: any }> = {};

    // FedEx
    try {
      const { testFedExConnection } = await import("./services/fedex");
      const fedexResult = await testFedExConnection();
      results.fedex = { success: fedexResult.success, message: fedexResult.message, details: fedexResult.debug };
    } catch (e) {
      results.fedex = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // UPS
    try {
      const upsClientId = process.env.UPS_CLIENT_ID;
      const upsClientSecret = process.env.UPS_CLIENT_SECRET;
      results.ups = {
        success: !!(upsClientId && upsClientSecret),
        message: upsClientId && upsClientSecret ? "Credentials configured" : "Missing credentials",
        details: { clientIdLength: upsClientId?.length || 0, secretLength: upsClientSecret?.length || 0 }
      };
    } catch (e) {
      results.ups = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // DHL
    try {
      const dhlApiKey = process.env.DHL_API_KEY;
      results.dhl = {
        success: !!dhlApiKey,
        message: dhlApiKey ? "API Key configured" : "Missing DHL_API_KEY",
        details: { apiKeyLength: dhlApiKey?.length || 0 }
      };
    } catch (e) {
      results.dhl = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // Aramex
    try {
      const aramexUsername = process.env.ARAMEX_USERNAME;
      const aramexPassword = process.env.ARAMEX_PASSWORD;
      const aramexAccountNumber = process.env.ARAMEX_ACCOUNT_NUMBER;
      results.aramex = {
        success: !!(aramexUsername && aramexPassword && aramexAccountNumber),
        message: aramexUsername && aramexPassword && aramexAccountNumber ? "Credentials configured" : "Missing credentials",
        details: {
          usernameExists: !!aramexUsername,
          passwordExists: !!aramexPassword,
          accountExists: !!aramexAccountNumber
        }
      };
    } catch (e) {
      results.aramex = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // ShipEntegra
    try {
      const shipintegraApiKey = process.env.SHIPENTEGRA_API_KEY || process.env.SHIPINTEGRA_API_KEY;
      results.shipentegra = {
        success: !!shipintegraApiKey,
        message: shipintegraApiKey ? "API Key configured" : "Missing SHIPENTEGRA_API_KEY",
        details: { apiKeyLength: shipintegraApiKey?.length || 0 }
      };
    } catch (e) {
      results.shipentegra = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // OpenAI
    try {
      const openaiKey = process.env.OPENAI_API_KEY;
      results.openai = {
        success: !!openaiKey,
        message: openaiKey ? "API Key configured" : "Missing OPENAI_API_KEY",
        details: { apiKeyLength: openaiKey?.length || 0 }
      };
    } catch (e) {
      results.openai = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // Database
    try {
      const dbUrl = process.env.DATABASE_URL;
      results.database = {
        success: !!dbUrl,
        message: dbUrl ? "Database URL configured" : "Missing DATABASE_URL",
        details: { urlExists: !!dbUrl }
      };
    } catch (e) {
      results.database = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    // BizimHesap
    try {
      const bizimhesapKey = process.env.BIZIMHESAP_API_KEY;
      results.bizimhesap = {
        success: !!bizimhesapKey,
        message: bizimhesapKey ? "API Key configured" : "Missing BIZIMHESAP_API_KEY",
        details: { apiKeyLength: bizimhesapKey?.length || 0 }
      };
    } catch (e) {
      results.bizimhesap = { success: false, message: e instanceof Error ? e.message : String(e) };
    }

    const allSuccess = Object.values(results).every(r => r.success);
    res.json({
      success: allSuccess,
      message: allSuccess ? "All APIs configured!" : "Some APIs missing configuration",
      results
    });
  });

  // Test Aramex pricing endpoint
  app.get("/api/test/aramex-pricing", async (req, res) => {
    try {
      console.log("🧪 TESTING ARAMEX PRICING API");

      // Safe number parsing helper
      const safeParseInt = (value: string | undefined, defaultVal: number, minVal: number = 1): number => {
        const parsed = parseInt(value || '', 10);
        return isNaN(parsed) || parsed < minVal ? defaultVal : parsed;
      };
      const safeParseFloat = (value: string | undefined, defaultVal: number, minVal: number = 0): number => {
        const parsed = parseFloat(value || '');
        return isNaN(parsed) || parsed < minVal ? defaultVal : parsed;
      };

      // Test parameters - can be customized via query params
      const testParams = {
        packageLength: safeParseInt(req.query.length as string, 1, 1),
        packageWidth: safeParseInt(req.query.width as string, 1, 1),
        packageHeight: safeParseInt(req.query.height as string, 1, 1),
        packageWeight: safeParseFloat(req.query.weight as string, 1, 0.1),
        receiverCountry: (req.query.country as string) || "US",
        userMultiplier: safeParseFloat(req.query.multiplier as string, 1.2, 0.1),
      };

      console.log("Test parameters:", testParams);

      // Import and test Aramex rate calculation directly
      const { calculateAramexRates } = await import("./services/aramex");

      const aramexRates = await calculateAramexRates({
        originAddress: {
          city: "Istanbul",
          countryCode: "TR",
          postalCode: "34000",
          address: "MoogShip Logistics Center",
        },
        destinationAddress: {
          city: testParams.receiverCountry === "AE" ? "Dubai" : "New York",
          countryCode: testParams.receiverCountry,
          postalCode: testParams.receiverCountry === "AE" ? "00000" : "10001",
          address: "Customer Address",
        },
        weightKg: testParams.packageWeight,
        numberOfPieces: 1,
        customsValue: 100,
        preferredCurrency: "USD",
      });

      console.log(`Found ${aramexRates.length} Aramex rates`);

      // Also test the main pricing service with Aramex integration
      const moogShipPricing = await calculateMoogShipPricing(
        testParams.packageLength,
        testParams.packageWidth,
        testParams.packageHeight,
        testParams.packageWeight,
        testParams.receiverCountry,
        testParams.userMultiplier,
      );

      // Count Aramex options in the combined response
      const aramexOptions =
        moogShipPricing.options?.filter(
          (opt) =>
            opt.serviceName?.includes("aramex") ||
            opt.displayName?.includes("Aramex"),
        ) || [];

      res.json({
        success: true,
        message: `Aramex pricing test completed`,
        testParams,
        directAramexRates: {
          count: aramexRates.length,
          rates: aramexRates.map((rate) => ({
            serviceName: rate.serviceName,
            serviceCode: rate.serviceCode,
            amount: rate.amount,
            currency: rate.currency,
            estimatedDays: rate.estimatedDays,
            serviceType: rate.serviceType,
          })),
        },
        moogShipIntegration: {
          totalOptions: moogShipPricing.options?.length || 0,
          aramexOptionsCount: aramexOptions.length,
          aramexOptions: aramexOptions.map((opt) => ({
            id: opt.id,
            displayName: opt.displayName,
            serviceName: opt.serviceName,
            totalPrice: opt.totalPrice,
            deliveryTime: opt.deliveryTime,
            serviceType: opt.serviceType,
          })),
          success: moogShipPricing.success,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("❌ ARAMEX PRICING TEST ERROR:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Aramex pricing test failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Price history routes - Record price changes
  app.post("/api/price-history", authenticateToken, async (req, res) => {
    try {
      // Validate the request body
      const validatedData = insertPriceHistorySchema.parse({
        ...req.body,
        userId: req.body.userId || req.user!.id,
        createdAt: new Date(),
      });

      // Insert the new price history record using the storage interface
      const result = await storage.recordPriceHistory(validatedData);

      // Return success response
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error recording price history:", error);
      res
        .status(400)
        .json({
          message: "Failed to record price history",
          error: error.message,
        });
    }
  });

  // Get price history for a specific shipment
  app.get(
    "/api/price-history/:shipmentId",
    authenticateToken,
    isOwnerOrAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.shipmentId);
        if (isNaN(shipmentId)) {
          return res.status(400).json({ message: "Invalid shipment ID" });
        }

        // Retrieve price history records for this shipment using the storage interface
        const priceHistoryRecords = await storage.getPriceHistory(shipmentId);

        res.json(priceHistoryRecords);
      } catch (error: any) {
        console.error("Error retrieving price history:", error);
        res
          .status(500)
          .json({
            message: "Failed to retrieve price history",
            error: error.message,
          });
      }
    },
  );

  // Calculate prices for multiple shipments with service options (for dropdown)
  app.post("/api/bulk-pricing", authenticateToken, async (req, res) => {
    try {
      const { shipments } = req.body;

      if (!Array.isArray(shipments) || shipments.length === 0) {
        return res.status(400).json({
          message: "Invalid request: expected array of shipments",
        });
      }

      // Check if all shipments have valid dimensions and weight
      const invalidShipments = shipments.filter(
        (shipment) =>
          (!shipment.packageLength && !shipment.length) ||
          (!shipment.packageWidth && !shipment.width) ||
          (!shipment.packageHeight && !shipment.height) ||
          (!shipment.packageWeight && !shipment.weight),
      );

      if (invalidShipments.length > 0) {
        return res.status(400).json({
          message: "Some shipments are missing required dimensions or weight",
          errors: invalidShipments.map((shipment, index) => ({
            shipmentIndex: index,
            message: "Missing dimensions or weight",
          })),
        });
      }

      // Import the same MoogShip pricing service used by shipment-create
      const { calculateMoogShipPricing } = await import(
        "./services/moogship-pricing"
      );

      // Get user's price multiplier
      const user = req.user;
      const userPriceMultiplier = user.priceMultiplier || 1.25;

      console.log(
        `Bulk pricing for user ${user.username} with multiplier ${userPriceMultiplier}`,
      );

      // Calculate pricing for each shipment with multiple service options
      const processedShipments = await Promise.all(
        shipments.map(async (shipment, index) => {
          try {
            // Get dimensions and weight (handle both field name formats)
            const length = parseFloat(
              shipment.packageLength || shipment.length || "15",
            );
            const width = parseFloat(
              shipment.packageWidth || shipment.width || "10",
            );
            const height = parseFloat(
              shipment.packageHeight || shipment.height || "1",
            );
            const actualWeight = parseFloat(
              shipment.packageWeight || shipment.weight || "0.5",
            );

            // Calculate volumetric weight
            const volumetricWeight = (length * width * height) / 5000;
            const billableWeight = Math.max(actualWeight, volumetricWeight);

            console.log(
              `Bulk pricing shipment ${index + 1}: ${length}x${width}x${height}cm, Weight: ${actualWeight}kg, Billable: ${billableWeight.toFixed(2)}kg`,
            );

            // Use the same MoogShip pricing service as shipment-create with user multiplier
            const pricingResult = await calculateMoogShipPricing(
              length,
              width,
              height,
              billableWeight,
              shipment.receiverCountry,
              userPriceMultiplier,
            );

            // No additional multiplier needed - calculateMoogShipPricing already applies it
            if (
              !pricingResult ||
              !pricingResult.success ||
              !pricingResult.options ||
              pricingResult.options.length === 0
            ) {
              throw new Error(
                `No pricing options available for shipment ${index + 1}`,
              );
            }

            console.log(
              `Bulk pricing result for shipment ${index + 1}: ${pricingResult.options.length} options available`,
            );

            // Transform the MoogShip pricing result to match bulk upload format
            // Use the exact pricing options as returned from calculateMoogShipPricing without modification
            const pricingOptions = pricingResult.options.map((option: any) => ({
              id: option.id,
              serviceName: option.serviceName,
              displayName: option.displayName,
              cargoPrice: option.cargoPrice,
              fuelCost: option.fuelCost,
              totalPrice: option.totalPrice,
              deliveryTime: option.deliveryTime,
              serviceType: option.serviceType,
              description: option.description,
              providerServiceCode:
                option.providerServiceCode || option.serviceName,
              appliedMultiplier:
                option.appliedMultiplier || userPriceMultiplier,
              basePrice: option.basePrice || option.cargoPrice,
              fuelCharge: option.fuelCharge || option.fuelCost,
              originalBasePrice: option.originalBasePrice || 0,
              originalFuelCharge: option.originalFuelCharge || 0,
              originalTotalPrice: option.originalTotalPrice || 0,
            }));

            // Use the first option as default selection
            const defaultOption = pricingOptions[0];

            console.log(
              `Bulk pricing complete for shipment ${index + 1}: $${(defaultOption.totalPrice / 100).toFixed(2)} (multiplier: ${userPriceMultiplier})`,
            );

            return {
              ...shipment,
              // Update dimensions with calculated values
              packageLength: length,
              packageWidth: width,
              packageHeight: height,
              packageWeight: billableWeight,
              actualWeight: actualWeight,
              volumetricWeight: volumetricWeight,
              // Pricing data
              pricingOptions: pricingOptions,
              selectedServiceOption: defaultOption,
              totalPrice: defaultOption.totalPrice,
              basePrice: defaultOption.basePrice,
              fuelCharge: defaultOption.fuelCharge,
              appliedMultiplier: defaultOption.appliedMultiplier,
              originalTotalPrice: defaultOption.originalTotalPrice,
              originalBasePrice: defaultOption.originalBasePrice,
              originalFuelCharge: defaultOption.originalFuelCharge,
            };
          } catch (error) {
            console.error(
              `Error calculating pricing for shipment ${index + 1}:`,
              error,
            );
            // Return shipment with error state but preserve original data
            return {
              ...shipment,
              pricingError: error.message || "Failed to calculate pricing",
              pricingOptions: [],
              selectedServiceOption: null,
            };
          }
        }),
      );

      const successfulCalculations = processedShipments.filter(
        (s) => !s.pricingError,
      );
      const failedCalculations = processedShipments.filter(
        (s) => s.pricingError,
      );

      console.log(
        `✅ Bulk pricing completed: ${successfulCalculations.length} successful, ${failedCalculations.length} failed`,
      );

      res.json({
        success: true,
        shipments: processedShipments,
        summary: {
          total: shipments.length,
          successful: successfulCalculations.length,
          failed: failedCalculations.length,
        },
      });
    } catch (error: any) {
      console.error("Error in bulk pricing calculation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to calculate bulk pricing",
        error: error.message,
      });
    }
  });

  // Calculate prices for multiple shipments
  app.post("/api/calculate-bulk-prices", async (req, res) => {
    // Handle authentication with detailed debugging
    console.log("🔐 Bulk pricing authentication check:");
    console.log("  - req.user exists:", !!req.user);
    console.log(
      "  - req.isAuthenticated():",
      req.isAuthenticated ? req.isAuthenticated() : "method not available",
    );
    console.log("  - session passport user:", req.session?.passport?.user);
    console.log("  - cookie header present:", !!req.headers.cookie);

    // Try multiple authentication methods
    let authenticatedUser = req.user;

    // If no req.user, try session-based authentication
    if (!authenticatedUser && req.session?.passport?.user) {
      try {
        authenticatedUser = await storage.getUser(req.session.passport.user);
        if (authenticatedUser) {
          req.user = authenticatedUser; // Set for subsequent use
          console.log("✅ Authentication successful via session lookup");
        }
      } catch (error) {
        console.error("❌ Session user lookup failed:", error);
      }
    }

    if (!authenticatedUser) {
      console.error(
        "❌ Bulk pricing authentication failed - no authenticated user found",
      );
      return res.status(401).json({ message: "Authentication required" });
    }

    console.log(
      `✅ Bulk pricing authenticated for user: ${authenticatedUser.username} (ID: ${authenticatedUser.id})`,
    );
    try {
      const { shipments } = req.body;

      if (!Array.isArray(shipments) || shipments.length === 0) {
        return res.status(400).json({
          message: "Invalid request: expected array of shipments",
        });
      }

      // Check if all shipments have valid dimensions and weight
      const invalidShipments = shipments.filter(
        (shipment) =>
          !shipment.packageLength ||
          !shipment.packageWidth ||
          !shipment.packageHeight ||
          !shipment.packageWeight,
      );

      if (invalidShipments.length > 0) {
        return res.status(400).json({
          message: "Some shipments are missing dimensions or weight",
          errors: [
            {
              message:
                "Please provide dimensions (length, width, height) and weight for all shipments. Click the Edit button to set these values.",
            },
          ],
        });
      }

      // Get user's price multiplier if available
      const user = authenticatedUser;
      const userPriceMultiplier = user?.priceMultiplier || 1.25; // Default to 1.25 if not set (standard customer rate)

      console.log(
        `💰 Using price multiplier: ${userPriceMultiplier} for user ${user.username}`,
      );

      // Import the Shipentegra service
      const { calculateShippingPrice } = await import("./services/shipentegra");

      // Process each shipment in parallel
      const shipmentsWithPricingPromises = shipments.map(
        async (shipment, index) => {
          try {
            // Extract and validate dimensions and weight
            const length = parseFloat(shipment.packageLength) || 0;
            const width = parseFloat(shipment.packageWidth) || 0;
            const height = parseFloat(shipment.packageHeight) || 0;
            const actualWeight = parseFloat(shipment.packageWeight) || 0;

            // Calculate volumetric weight and billable weight
            const volumetricWeight = (length * width * height) / 5000;
            const billableWeight = Math.max(actualWeight, volumetricWeight);

            // Import the unified MoogShip pricing service
            const { calculateMoogShipPricing } = await import(
              "./services/moogship-pricing"
            );

            // Call the unified pricing system that includes both Shipentegra and AFS Transport
            const pricingResult = await calculateMoogShipPricing(
              length,
              width,
              height,
              billableWeight,
              shipment.receiverCountry,
            );

            // Calculate insurance cost for this shipment if insurance is enabled
            let shipmentInsuranceCost = 0;
            let calculatedInsuranceValue = 0;

            if (shipment.hasInsurance) {
              // Automatically use customs value for insurance if available, otherwise use existing insurance value
              calculatedInsuranceValue =
                shipment.customsValue || shipment.insuranceValue || 0;

              if (calculatedInsuranceValue > 0) {
                try {
                  // Get insurance ranges from database
                  const insuranceRanges =
                    await storage.getActiveInsuranceRanges();

                  // Find the appropriate range for the value
                  const applicableRange = insuranceRanges.find(
                    (range) =>
                      calculatedInsuranceValue >= range.minValue &&
                      calculatedInsuranceValue <= range.maxValue,
                  );

                  if (applicableRange) {
                    shipmentInsuranceCost = applicableRange.insuranceCost;
                  } else {
                    // Default calculation if no range found (2% of value with minimum $5)
                    shipmentInsuranceCost = Math.max(
                      Math.round(calculatedInsuranceValue * 0.02),
                      500,
                    );
                  }

                  console.log(
                    `🛡️ BULK-PRICING-OPTIONS: Insurance for shipment ${index}: value ${calculatedInsuranceValue} cents → cost ${shipmentInsuranceCost} cents`,
                  );
                } catch (error) {
                  console.error(
                    `❌ BULK-PRICING-OPTIONS: Error calculating insurance:`,
                    error,
                  );
                  shipmentInsuranceCost = Math.max(
                    Math.round(calculatedInsuranceValue * 0.02),
                    500,
                  );
                }
              }
            }

            // Apply user multiplier to all pricing options and add insurance costs
            if (pricingResult.success && pricingResult.options) {
              pricingResult.options = pricingResult.options.map((option) => ({
                ...option,
                cargoPrice: Math.round(option.cargoPrice * userPriceMultiplier),
                fuelCost: Math.round(option.fuelCost * userPriceMultiplier),
                totalPrice:
                  Math.round(option.totalPrice * userPriceMultiplier) +
                  shipmentInsuranceCost, // Add insurance to total
                originalBasePrice: option.cargoPrice,
                originalFuelCharge: option.fuelCost,
                originalTotalPrice: option.totalPrice,
                appliedMultiplier: userPriceMultiplier,
                basePrice: Math.round(option.cargoPrice * userPriceMultiplier),
                fuelCharge: Math.round(option.fuelCost * userPriceMultiplier),
                providerServiceCode:
                  option.providerServiceCode || option.serviceName,
                // Add insurance information to each option
                insuranceCost: shipmentInsuranceCost,
                totalPriceWithoutInsurance: Math.round(
                  option.totalPrice * userPriceMultiplier,
                ),
              }));
            }

            // Extract pricing options from the response
            const pricingOptions = pricingResult?.options || [];

            if (!pricingResult?.success || !pricingOptions.length) {
              throw new Error(
                "No pricing options returned from unified pricing system",
              );
            }

            // Use the first option as default (cheapest)
            const defaultOption = pricingOptions[0];

            // Return the shipment with updated pricing data including all options and insurance
            return {
              ...shipment,
              // Store the dimensions and weight values used for calculation
              length: length,
              width: width,
              height: height,
              weight: actualWeight,
              // Include the calculated weights
              volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
              billableWeight: parseFloat(billableWeight.toFixed(2)),
              // Include pricing options for dropdown selection
              pricingOptions: pricingOptions,
              // Set default selected option
              selectedServiceOption: defaultOption,
              // Include the default pricing data
              basePrice: defaultOption.cargoPrice,
              fuelCharge: defaultOption.fuelCost,
              taxes: 0,
              totalPrice: defaultOption.totalPrice, // Insurance is already included in pricing options
              originalBasePrice: defaultOption.cargoPrice,
              originalFuelCharge: defaultOption.fuelCost,
              originalTotalPrice: defaultOption.totalPrice,
              appliedMultiplier: userPriceMultiplier,
              selectedService:
                defaultOption.providerServiceCode || defaultOption.serviceName,
              carrierName: "MoogShip",
              estimatedDeliveryDays: defaultOption.deliveryTime,
              // Add insurance-specific fields
              insuranceCost: shipmentInsuranceCost,
              calculatedInsuranceValue: calculatedInsuranceValue,
              totalPriceWithoutInsurance:
                defaultOption.totalPrice - shipmentInsuranceCost,
            };
          } catch (error) {
            console.error("Error getting pricing for shipment:", error);

            // Extract dimensions for fallback (in case of variable scope issues)
            const length = parseFloat(shipment.packageLength) || 15;
            const width = parseFloat(shipment.packageWidth) || 10;
            const height = parseFloat(shipment.packageHeight) || 1;
            const actualWeight = parseFloat(shipment.packageWeight) || 0.5;
            const volumetricWeight = (length * width * height) / 5000;
            const billableWeight = Math.max(actualWeight, volumetricWeight);

            // Calculate fallback price based on weight and destination
            const fallbackPrice =
              billableWeight <= 0.5 ? 550 : Math.round(billableWeight * 1100);

            // Apply the user's price multiplier to the fallback price
            const customerPrice = Math.round(
              fallbackPrice * userPriceMultiplier,
            );

            return {
              ...shipment,
              length: length,
              width: width,
              height: height,
              weight: actualWeight,
              volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
              billableWeight: parseFloat(billableWeight.toFixed(2)),
              pricingOptions: [], // Empty options for failed pricing
              selectedServiceOption: null,
              basePrice: fallbackPrice,
              totalPrice: customerPrice,
              fuelCharge: 0,
              originalTotalPrice: fallbackPrice,
              currency: "USD",
              pricingError: "Pricing calculation failed - manual review needed",
            };
          }
        },
      );

      // Wait for all pricing requests to complete
      const shipmentsWithPricing = await Promise.all(
        shipmentsWithPricingPromises,
      );

      return res.status(200).json({
        message: `Successfully calculated prices for ${shipmentsWithPricing.length} shipments`,
        shipments: shipmentsWithPricing,
      });
    } catch (error) {
      console.error("Error calculating bulk prices:", error);
      return res.status(500).json({
        message: "Failed to calculate prices for shipments",
        error: error.message,
      });
    }
  });

  // User profile endpoints

  // Get current user's profile
  app.get("/api/profile", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password before sending
      const { password, ...userWithoutPassword } = user;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res
        .status(500)
        .json({ message: "Error fetching profile", error: String(error) });
    }
  });

  // Update current user's profile
  app.patch("/api/profile", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Extract updatable fields from request body
      const { name, email, companyName, companyType, taxIdNumber, address } =
        req.body;

      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if email is changed and already exists
      if (email !== currentUser.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Prepare update data (only allow users to update certain fields, not their role or username)
      const userData = {
        id: userId,
        username: currentUser.username, // Keep the username the same
        name,
        email,
        role: currentUser.role, // Keep the role the same
        companyName:
          companyName !== undefined ? companyName : currentUser.companyName,
        companyType:
          companyType !== undefined ? companyType : currentUser.companyType,
        taxIdNumber:
          taxIdNumber !== undefined ? taxIdNumber : currentUser.taxIdNumber,
        address: address !== undefined ? address : currentUser.address,
      };

      // Update the user
      const updatedUser = await storage.updateUser(userId, userData);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update profile" });
      }

      // Remove password before sending
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating profile:", error);
      res
        .status(500)
        .json({ message: "Error updating profile", error: String(error) });
    }
  });

  // Get current user's notification preferences
  app.get("/api/notification-preferences", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return only notification preferences
      const preferences = {
        emailMarketingCampaigns: user.emailMarketingCampaigns,
        shipmentStatusUpdates: user.shipmentStatusUpdates,
        accountNotifications: user.accountNotifications,
        adminNotifications: user.adminNotifications,
      };

      res.json(preferences);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res
        .status(500)
        .json({ message: "Error fetching notification preferences", error: String(error) });
    }
  });

  // Update current user's notification preferences
  app.patch("/api/notification-preferences", authenticateToken, async (req, res) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { 
        emailMarketingCampaigns, 
        shipmentStatusUpdates, 
        accountNotifications, 
        adminNotifications 
      } = req.body;

      // Validate shipmentStatusUpdates value
      if (shipmentStatusUpdates && !['immediate', 'daily_digest', 'off'].includes(shipmentStatusUpdates)) {
        return res.status(400).json({ 
          message: "Invalid shipmentStatusUpdates value. Must be 'immediate', 'daily_digest', or 'off'" 
        });
      }

      // Prepare preferences update
      const preferences: any = {};
      if (emailMarketingCampaigns !== undefined) preferences.emailMarketingCampaigns = emailMarketingCampaigns;
      if (shipmentStatusUpdates !== undefined) preferences.shipmentStatusUpdates = shipmentStatusUpdates;
      if (accountNotifications !== undefined) preferences.accountNotifications = accountNotifications;
      if (adminNotifications !== undefined) preferences.adminNotifications = adminNotifications;

      // Update notification preferences
      const updatedUser = await storage.updateNotificationPreferences(userId, preferences);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update notification preferences" });
      }

      // Return updated preferences
      const updatedPreferences = {
        emailMarketingCampaigns: updatedUser.emailMarketingCampaigns,
        shipmentStatusUpdates: updatedUser.shipmentStatusUpdates,
        accountNotifications: updatedUser.accountNotifications,
        adminNotifications: updatedUser.adminNotifications,
      };

      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res
        .status(500)
        .json({ message: "Error updating notification preferences", error: String(error) });
    }
  });

  // Get all users' notification preferences (admin only)
  app.get("/api/admin/user-notification-preferences", authenticateToken, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Extract only notification preference fields and basic user info
      const userPreferences = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        emailMarketingCampaigns: user.emailMarketingCampaigns,
        shipmentStatusUpdates: user.shipmentStatusUpdates,
        accountNotifications: user.accountNotifications,
        adminNotifications: user.adminNotifications,
      }));

      res.json(userPreferences);
    } catch (error) {
      console.error("Error fetching user notification preferences:", error);
      res
        .status(500)
        .json({ message: "Error fetching user notification preferences", error: String(error) });
    }
  });

  // Update user notification preferences (admin only)
  app.patch("/api/admin/user-notification-preferences/:userId", authenticateToken, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { emailMarketingCampaigns, shipmentStatusUpdates, accountNotifications, adminNotifications } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate shipmentStatusUpdates values
      if (shipmentStatusUpdates !== undefined && !["immediate", "daily_digest", "off"].includes(shipmentStatusUpdates)) {
        return res.status(400).json({ message: "Invalid shipment status update preference" });
      }

      // Prepare preferences update
      const preferences: any = {};
      if (emailMarketingCampaigns !== undefined) preferences.emailMarketingCampaigns = emailMarketingCampaigns;
      if (shipmentStatusUpdates !== undefined) preferences.shipmentStatusUpdates = shipmentStatusUpdates;
      if (accountNotifications !== undefined) preferences.accountNotifications = accountNotifications;
      if (adminNotifications !== undefined) preferences.adminNotifications = adminNotifications;

      // Update notification preferences
      const updatedUser = await storage.updateNotificationPreferences(userId, preferences);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update notification preferences" });
      }

      // Return updated preferences
      const updatedPreferences = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        username: updatedUser.username,
        emailMarketingCampaigns: updatedUser.emailMarketingCampaigns,
        shipmentStatusUpdates: updatedUser.shipmentStatusUpdates,
        accountNotifications: updatedUser.accountNotifications,
        adminNotifications: updatedUser.adminNotifications,
      };

      res.json(updatedPreferences);
    } catch (error) {
      console.error("Error updating user notification preferences:", error);
      res
        .status(500)
        .json({ message: "Error updating user notification preferences", error: String(error) });
    }
  });

  // Get user email notification history (admin only)
  app.get("/api/admin/user-notification-logs/:userId", authenticateToken, isAdmin, async (req, res) => {
    console.log(`🔍 GET /api/admin/user-notification-logs/${req.params.userId} - User: ${req.user?.username || 'not authenticated'}, Role: ${req.user?.role || 'none'}`);
    
    try {
      const userId = parseInt(req.params.userId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      console.log(`📧 [EMAIL_HISTORY_ROUTE] Processing request for userId: ${userId}, limit: ${limit}`);
      console.log(`🗃️ [EMAIL_HISTORY_ROUTE] Storage implementation: ${storage.constructor.name}`);

      if (isNaN(userId)) {
        console.log(`❌ [EMAIL_HISTORY_ROUTE] Invalid userId: ${req.params.userId}`);
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Check if user exists
      console.log(`👤 [EMAIL_HISTORY_ROUTE] Checking if user ${userId} exists...`);
      const user = await storage.getUser(userId);
      if (!user) {
        console.log(`❌ [EMAIL_HISTORY_ROUTE] User ${userId} not found`);
        return res.status(404).json({ message: "User not found" });
      }
      console.log(`✅ [EMAIL_HISTORY_ROUTE] User found: ${user.name} (${user.email})`);

      // Get notification logs for the user
      console.log(`📨 [EMAIL_HISTORY_ROUTE] Calling storage.getUserNotificationLogs(${userId}, ${limit})...`);
      const notificationLogs = await storage.getUserNotificationLogs(userId, limit);
      console.log(`📊 [EMAIL_HISTORY_ROUTE] Retrieved ${notificationLogs.length} notification logs for user ${userId}`);

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username
        },
        logs: notificationLogs
      });
    } catch (error) {
      console.error("Error fetching user notification logs:", error);
      res
        .status(500)
        .json({ message: "Error fetching user notification logs", error: String(error) });
    }
  });

  // Get a specific user by ID (users can only view themselves, admins can view anyone)
  app.get(
    "/api/users/:id",
    authenticateToken,
    isSelfOrAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove password before sending
        const { password, ...userWithoutPassword } = user;

        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error fetching user:", error);
        res
          .status(500)
          .json({ message: "Error fetching user", error: String(error) });
      }
    },
  );

  // User routes (admin only)
  app.get("/api/users", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { search, page = 1, limit = 50 } = req.query;
      const searchTerm = search as string;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      const users = await storage.getAllUsers(searchTerm, pageNum, limitNum);
      // Remove passwords before sending
      const sanitizedUsers = users.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res
        .status(500)
        .json({ message: "Error fetching users", error: error.message });
    }
  });

  // Get pending user registrations (admin only)
  app.get(
    "/api/users/pending",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const pendingUsers = await storage.getPendingUsers();

        // Remove passwords before sending
        const sanitizedUsers = pendingUsers.map((user) => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });

        res.json(sanitizedUsers);
      } catch (error) {
        console.error("Error fetching pending users:", error);
        res
          .status(500)
          .json({
            message: "Error fetching pending users",
            error: error.message,
          });
      }
    },
  );

  // Approve a user registration (admin only)
  app.post(
    "/api/users/:id/approve",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const adminId = req.user!.id;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const updatedUser = await storage.approveUser(userId, adminId);

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove password before sending
        const { password, ...userWithoutPassword } = updatedUser;

        // Import the sendUserApprovalEmail function
        const { sendUserApprovalEmail } = await import("./notification-emails");

        // Send approval email to the user
        try {
          console.log(
            `Sending approval email to user ${updatedUser.username} (ID: ${updatedUser.id})`,
          );

          // Don't block the response on email sending
          sendUserApprovalEmail(updatedUser)
            .then((result) => {
              if (result.success) {
                console.log(
                  `Approval email sent successfully to ${updatedUser.email}`,
                );
              } else {
                console.warn(
                  `Failed to send approval email to ${updatedUser.email}:`,
                  result.error,
                );
              }
            })
            .catch((err) => {
              console.error(
                `Error sending approval email to ${updatedUser.email}:`,
                err,
              );
            });
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          // Continue even if email sending fails
        }

        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error approving user:", error);
        res
          .status(500)
          .json({ message: "Error approving user", error: error.message });
      }
    },
  );

  // Reject a user registration (admin only)
  app.post(
    "/api/users/:id/reject",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const adminId = req.user!.id;
        const { rejectionReason } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        if (!rejectionReason || rejectionReason.trim() === "") {
          return res
            .status(400)
            .json({ message: "Rejection reason is required" });
        }

        const updatedUser = await storage.rejectUser(
          userId,
          adminId,
          rejectionReason,
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Remove password before sending
        const { password, ...userWithoutPassword } = updatedUser;

        res.json(userWithoutPassword);
      } catch (error) {
        console.error("Error rejecting user:", error);
        res
          .status(500)
          .json({ message: "Error rejecting user", error: error.message });
      }
    },
  );

  // Create a new user directly (admin only)
  app.post(
    "/api/users/create",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const {
          username,
          name,
          email,
          password,
          role,
          companyName,
          isApproved = true, // Users created by admin are approved by default
        } = req.body;

        // Validate required fields
        if (!username || !name || !email || !password) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        // Check if username already exists
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }

        // Check if email already exists
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }

        // Create the user
        const newUser = await storage.createUser({
          username,
          name,
          email,
          password,
          role: role || "user",
          companyName,
          isApproved,
          balance: 0,
          priceMultiplier: 1.45, // Set default price multiplier to 1.45
          // Additional fields can be added as needed
        });

        // Remove password before sending
        const { password: _, ...userWithoutPassword } = newUser;

        res.status(201).json(userWithoutPassword);
      } catch (error) {
        console.error("Error creating user:", error);
        res
          .status(500)
          .json({ message: "Error creating user", error: error.message });
      }
    },
  );

  // Grant return system access to a user (admin only)
  app.post(
    "/api/users/:id/grant-return-access",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const adminUser = req.user as any;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Get the user to grant access to
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update user with return system access
        const updatedUser = await storage.updateUser(userId, {
          ...user,
          canAccessReturnSystem: true,
          returnSystemGrantedBy: adminUser.id,
          returnSystemGrantedAt: new Date(),
        });

        if (!updatedUser) {
          return res
            .status(500)
            .json({ message: "Failed to grant return system access" });
        }

        console.log(
          `Return system access granted to user ${user.username} (ID: ${userId}) by admin ${adminUser.username} (ID: ${adminUser.id})`,
        );

        // Send email notification
        try {
          const emailSent = await sendReturnAccessGrantedEmail(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              username: user.username,
            },
            {
              id: adminUser.id,
              name: adminUser.name,
              username: adminUser.username,
            },
          );

          if (emailSent) {
            console.log(
              `[EMAIL] Return access granted notification sent to ${user.email}`,
            );
          } else {
            console.log(
              `[EMAIL] Failed to send return access granted notification to ${user.email}`,
            );
          }
        } catch (emailError) {
          console.error(
            "[EMAIL] Error sending return access granted notification:",
            emailError,
          );
        }

        // Return success without sensitive data
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
          message: "Return system access granted successfully",
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error granting return system access:", error);
        res
          .status(500)
          .json({
            message: "Error granting return system access",
            error: String(error),
          });
      }
    },
  );

  // Revoke return system access from a user (admin only)
  app.post(
    "/api/users/:id/revoke-return-access",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const adminUser = req.user as any;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Get the user to revoke access from
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update user to remove return system access
        const updatedUser = await storage.updateUser(userId, {
          ...user,
          canAccessReturnSystem: false,
          returnSystemGrantedBy: null,
          returnSystemGrantedAt: null,
        });

        if (!updatedUser) {
          return res
            .status(500)
            .json({ message: "Failed to revoke return system access" });
        }

        console.log(
          `Return system access revoked from user ${user.username} (ID: ${userId}) by admin ${adminUser.username} (ID: ${adminUser.id})`,
        );

        // Send email notification
        try {
          const emailSent = await sendReturnAccessRevokedEmail(
            {
              id: user.id,
              name: user.name,
              email: user.email,
              username: user.username,
            },
            {
              id: adminUser.id,
              name: adminUser.name,
              username: adminUser.username,
            },
          );

          if (emailSent) {
            console.log(
              `[EMAIL] Return access revoked notification sent to ${user.email}`,
            );
          } else {
            console.log(
              `[EMAIL] Failed to send return access revoked notification to ${user.email}`,
            );
          }
        } catch (emailError) {
          console.error(
            "[EMAIL] Error sending return access revoked notification:",
            emailError,
          );
        }

        // Return success without sensitive data
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
          message: "Return system access revoked successfully",
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error revoking return system access:", error);
        res
          .status(500)
          .json({
            message: "Error revoking return system access",
            error: String(error),
          });
      }
    },
  );

  // Get all returns for admin
  app.get(
    "/api/admin/returns",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const adminUser = req.user as any;
        console.log(
          `Admin ${adminUser.username} (ID: ${adminUser.id}) accessed all returns`,
        );

        const allReturns = await storage.getAllReturns();

        res.json({
          success: true,
          data: allReturns,
          message: `Found ${allReturns.length} returns`,
        });
      } catch (error) {
        console.error("Error fetching all returns for admin:", error);
        res.status(500).json({
          message: "Error fetching returns",
          error: String(error),
        });
      }
    },
  );

  // Test delivery issue notification (admin only)
  app.post(
    "/api/test-delivery-issue",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { shipmentId, issueType, description } = req.body;

        if (!shipmentId) {
          return res.status(400).json({ message: "Shipment ID is required" });
        }

        // Get shipment and user data
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ message: "Shipment not found" });
        }

        const user = await storage.getUser(shipment.userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Import notification function
        const { sendDeliveryIssueNotification } = await import(
          "./notification-emails"
        );

        // Send test notification
        const result = await sendDeliveryIssueNotification(
          shipment,
          user,
          issueType || "Test Issue",
          description ||
            "This is a test delivery issue notification from the admin panel.",
        );

        console.log(
          `Admin ${req.user.username} sent test delivery issue notification for shipment ${shipmentId}`,
        );

        res.json({
          success: result.success,
          message: result.success
            ? "Delivery issue notification sent successfully"
            : "Failed to send notification",
          shipmentId,
          issueType: issueType || "Test Issue",
          adminEmails: [
            "info@moogship.com",
            "gokhan@moogco.com",
            "oguzhan@moogco.com",
            "sercan@moogship.com",
          ],
        });
      } catch (error) {
        console.error("Error sending test delivery issue notification:", error);
        res.status(500).json({
          message: "Error sending test notification",
          error: String(error),
        });
      }
    },
  );

  // Test endpoint to manually fix AFS PDF downloads
  app.post(
    "/api/test/fix-afs-pdf/:shipmentId",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const shipmentId = parseInt(req.params.shipmentId);
        console.log(`🔧 [TEST] Manual AFS PDF fix for shipment ${shipmentId}`);

        // Get the shipment
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({ error: "Shipment not found" });
        }

        console.log(
          `📦 [TEST] Shipment data: ${JSON.stringify(shipment, null, 2)}`,
        );

        // Check if it's an AFS shipment
        if (!shipment.selectedService?.includes("afs")) {
          return res.status(400).json({ error: "Not an AFS shipment" });
        }

        // Try to recreate the waybill and download PDF
        console.log(`🔄 [TEST] Attempting to recreate AFS waybill...`);
        const { createAFSWaybill } = await import("./services/afstransport");
        const result = await createAFSWaybill([shipment]);

        console.log(
          `📋 [TEST] AFS waybill result:`,
          JSON.stringify(result, null, 2),
        );

        if (result.success && result.carrierLabelPdfs[shipmentId]) {
          // Update the shipment with the PDF data
          await storage.updateShipment(shipmentId, {
            carrierLabelPdf: result.carrierLabelPdfs[shipmentId],
          });

          console.log(
            `✅ [TEST] Successfully fixed PDF for shipment ${shipmentId}`,
          );

          res.json({
            success: true,
            message: `PDF fixed for shipment ${shipmentId}`,
            pdfSize: result.carrierLabelPdfs[shipmentId].length,
            pdfPreview: result.carrierLabelPdfs[shipmentId].substring(0, 100),
          });
        } else {
          console.error(
            `❌ [TEST] Failed to fix PDF for shipment ${shipmentId}:`,
            result.error,
          );
          res.status(500).json({
            error: "Failed to retrieve PDF",
            details: result.error || "Unknown error",
          });
        }
      } catch (error) {
        console.error(`❌ [TEST] Error in manual AFS PDF fix:`, error);
        res.status(500).json({
          error: "Internal server error",
          details: error.message,
        });
      }
    },
  );

  // Test Aramex shipment creation endpoint
  app.post("/api/test/aramex-shipment", async (req, res) => {
    try {
      console.log("🧪 TESTING ARAMEX SHIPMENT CREATION WITH FIXED STRUCTURE");

      const { shipment, serviceCode = "PPX" } = req.body;

      if (!shipment) {
        return res.status(400).json({
          success: false,
          message: "Shipment data is required",
        });
      }

      console.log("📦 Test shipment data:", {
        id: shipment.id,
        sender: `${shipment.senderName} - ${shipment.senderCompany}`,
        receiver: `${shipment.receiverName} in ${shipment.receiverCity}`,
        package: shipment.packageContents,
      });

      // Import and test Aramex shipment creation
      const { createAramexShipment } = await import("./services/aramex");

      const result = await createAramexShipment({
        shipment,
        serviceCode,
      });

      console.log("✅ SUCCESS! Aramex shipment created:", result);

      res.json({
        success: true,
        message: "Aramex shipment created successfully",
        result,
        testData: {
          shipmentId: shipment.id,
          serviceCode,
          senderCity: shipment.senderCity,
          receiverCity: shipment.receiverCity,
          packageWeight: shipment.packageWeight,
        },
      });
    } catch (error) {
      console.error("❌ ARAMEX TEST FAILED:", error);

      res.status(500).json({
        success: false,
        message: "Aramex shipment test failed",
        error: error.message,
        errorDetails: error.stack,
      });
    }
  });

  // Test email functionality (admin only)
  app.post("/api/test-email", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { emailType, userEmail } = req.body;
      const adminUser = req.user as any;

      const testUser = {
        id: 999,
        name: "Test User",
        email: userEmail || "test@example.com",
        username: "testuser",
      };

      const testAdmin = {
        id: adminUser.id,
        name: adminUser.name,
        username: adminUser.username,
      };

      console.log(
        `[EMAIL TEST] Testing ${emailType} email to ${testUser.email}`,
      );

      let emailSent = false;
      if (emailType === "grant") {
        emailSent = await sendReturnAccessGrantedEmail(testUser, testAdmin);
      } else if (emailType === "revoke") {
        emailSent = await sendReturnAccessRevokedEmail(testUser, testAdmin);
      } else {
        return res
          .status(400)
          .json({ message: 'Invalid email type. Use "grant" or "revoke"' });
      }

      res.json({
        success: emailSent,
        message: emailSent
          ? "Test email sent successfully"
          : "Failed to send test email",
        emailType,
        recipient: testUser.email,
      });
    } catch (error) {
      console.error("[EMAIL TEST] Error:", error);
      res.status(500).json({
        message: "Email test failed",
        error: String(error),
      });
    }
  });

  // Debug endpoint removed after successful password reset

  // Reset a user's password (admin only)
  app.post(
    "/api/users/:id/reset-password",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { newPassword } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        if (!newPassword || newPassword.length < 6) {
          return res.status(400).json({
            message:
              "Invalid password. Password must be at least 6 characters long.",
          });
        }

        // Get user to reset password for
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Use the hashPassword function from auth module
        const { hashPassword } = await import("./auth");

        // Hash the new password with bcrypt (this makes sure it's compatible with our authentication)
        const hashedPassword = await hashPassword(newPassword);

        console.log(
          `Resetting password for user ${user.username} (ID: ${userId})`,
        );

        // Update user with new password
        const updatedUser = await storage.updateUser(userId, {
          ...user,
          password: hashedPassword,
        });

        if (!updatedUser) {
          return res.status(500).json({ message: "Failed to reset password" });
        }

        console.log(
          `Password successfully reset for user ${user.username} (ID: ${userId})`,
        );

        // Return success without sending the password
        const { password, ...userWithoutPassword } = updatedUser;
        res.json({
          message: "Password has been reset successfully",
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error resetting password:", error);
        res
          .status(500)
          .json({ message: "Error resetting password", error: String(error) });
      }
    },
  );

  // Update a user (admin only)
  app.patch("/api/users/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Get current user
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Extract updatable fields from request body
      const {
        username,
        name,
        email,
        role,
        companyName,
        companyType,
        taxIdNumber,
        address, // Legacy address field
        address1,
        address2,
        city,
        postalCode,
        country,
        shipmentCapacity,
        priceMultiplier,
      } = req.body;

      // Validate required fields
      if (!username || !name || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if username is changed and already exists
      if (username !== currentUser.username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      // Check if email is changed and already exists
      if (email !== currentUser.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail && existingEmail.id !== userId) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      // Prepare update data
      const userData = {
        id: userId,
        username,
        name,
        email,
        role: role || currentUser.role,
        companyName:
          companyName !== undefined ? companyName : currentUser.companyName,
        companyType:
          companyType !== undefined ? companyType : currentUser.companyType,
        taxIdNumber:
          taxIdNumber !== undefined ? taxIdNumber : currentUser.taxIdNumber,
        address: address !== undefined ? address : currentUser.address,
        // Include the new structured address fields
        address1: address1 !== undefined ? address1 : currentUser.address1,
        address2: address2 !== undefined ? address2 : currentUser.address2,
        city: city !== undefined ? city : currentUser.city,
        postalCode:
          postalCode !== undefined ? postalCode : currentUser.postalCode,
        country: country !== undefined ? country : currentUser.country,
        shipmentCapacity:
          shipmentCapacity !== undefined
            ? shipmentCapacity
            : currentUser.shipmentCapacity,
        priceMultiplier:
          priceMultiplier !== undefined
            ? parseFloat(priceMultiplier)
            : currentUser.priceMultiplier,
      };

      // Update the user
      const updatedUser = await storage.updateUser(userId, userData);

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user" });
      }

      // Remove password before sending
      const { password, ...userWithoutPassword } = updatedUser;

      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res
        .status(500)
        .json({ message: "Error updating user", error: String(error) });
    }
  });

  // Get user financial activity (admin only)
  app.get(
    "/api/users/:id/financial-activity",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Get user to verify they exist
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get pagination parameters from query string
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Get financial activities for this user with pagination
        const activities = await storage.getUserFinancialActivity(userId, limit, offset);

        res.json(activities);
      } catch (error) {
        console.error("Error fetching user financial activity:", error);
        res
          .status(500)
          .json({
            message: "Error fetching financial activity",
            error: String(error),
          });
      }
    },
  );

  // Get user actions report as CSV download (admin only)
  app.get(
    "/api/users/:id/actions-report",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Get user to verify they exist
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Get comprehensive user actions
        const actions = await storage.getUserActions(userId);

        // Generate CSV headers
        const csvHeaders = [
          'Date',
          'Time', 
          'Action Type',
          'Description',
          'Amount ($)',
          'Shipment ID',
          'Related Transaction'
        ];

        // Helper function to sanitize CSV cells against injection attacks
        const sanitizeCSVCell = (value: string): string => {
          if (!value) return '';
          
          // Convert to string and handle potential injection characters
          let sanitized = String(value);
          
          // Prevent CSV injection by handling whitespace + formula characters
          // Trim left to find first non-whitespace character
          const trimmedValue = sanitized.trimLeft();
          if (trimmedValue && /^[=+\-@]/.test(trimmedValue)) {
            sanitized = "'" + sanitized;
          }
          
          // Escape quotes and handle newlines
          sanitized = sanitized.replace(/"/g, '""').replace(/[\r\n]/g, ' ');
          
          return sanitized;
        };

        // Convert actions data to CSV rows
        const csvRows = actions.map((action) => {
          // Safe date parsing with fallback for invalid dates
          let dateStr = '';
          let timeStr = '';
          
          try {
            const date = new Date(action.createdAt);
            if (!isNaN(date.getTime())) {
              dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
              timeStr = date.toTimeString().split(' ')[0]; // HH:MM:SS
            }
          } catch (error) {
            console.warn(`Invalid date for action ${action.id}:`, action.createdAt);
            // dateStr and timeStr remain empty strings
          }
          
          // Fix amount formatting - distinguish null/undefined vs zero amounts
          let amount = '';
          if (action.amount !== null && action.amount !== undefined) {
            amount = (action.amount / 100).toFixed(2); // Convert cents to dollars, show 0.00 for zero
          }
          // null/undefined amounts remain empty string
          
          return [
            `"${sanitizeCSVCell(dateStr)}"`,
            `"${sanitizeCSVCell(timeStr)}"`,
            `"${sanitizeCSVCell(action.actionType || '')}"`,
            `"${sanitizeCSVCell(action.description || '')}"`,
            `"${sanitizeCSVCell(amount)}"`,
            `"${sanitizeCSVCell(String(action.shipmentId || ''))}"`,
            `"${sanitizeCSVCell(String(action.transactionId || ''))}"`  // Fix: Use transactionId, not action.id
          ].join(',');
        });

        // Combine headers and rows
        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

        // Set CSV response headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${user.username}_actions_report_${new Date().toISOString().split('T')[0]}.csv"`);
        
        // Send CSV content
        res.send(csvContent);
      } catch (error) {
        console.error("Error generating user actions report:", error);
        res
          .status(500)
          .json({
            message: "Error generating actions report",
            error: String(error),
          });
      }
    },
  );

  // Update carrier label access permissions (admin only)
  app.post(
    "/api/users/:id/carrier-label-access",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const { canAccess } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        if (typeof canAccess !== "boolean") {
          return res
            .status(400)
            .json({ message: "Invalid access value. Expected boolean." });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update the carrier label access permission
        const updatedUser = await storage.updateCarrierLabelAccess(
          userId,
          canAccess,
        );
        if (!updatedUser) {
          return res
            .status(500)
            .json({ message: "Failed to update carrier label access" });
        }

        // Remove password before sending response
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
          ...userWithoutPassword,
          message: `Carrier label access ${canAccess ? "granted" : "revoked"} for user ${user.username}`,
        });
      } catch (error) {
        console.error("Error updating carrier label access:", error);
        res
          .status(500)
          .json({
            message: "An error occurred while updating carrier label access",
          });
      }
    },
  );

  // Grant return system access (admin only)
  app.post(
    "/api/users/:id/grant-return-access",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);
        const adminId = req.user!.id;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if user is already granted access
        if (user.canAccessReturnSystem) {
          return res
            .status(400)
            .json({ message: "User already has return system access" });
        }

        // Grant return system access
        const updatedUser = await storage.updateUser(userId, {
          canAccessReturnSystem: true,
          returnSystemGrantedBy: adminId,
          returnSystemGrantedAt: new Date(),
        });

        if (!updatedUser) {
          return res
            .status(500)
            .json({ message: "Failed to grant return system access" });
        }

        // Remove password before sending response
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
          message: `Return system access granted to ${user.name}`,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error granting return system access:", error);
        res
          .status(500)
          .json({
            message: "An error occurred while granting return system access",
          });
      }
    },
  );

  // Revoke return system access (admin only)
  app.post(
    "/api/users/:id/revoke-return-access",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Check if user doesn't have access already
        if (!user.canAccessReturnSystem) {
          return res
            .status(400)
            .json({ message: "User does not have return system access" });
        }

        // Revoke return system access
        const updatedUser = await storage.updateUser(userId, {
          canAccessReturnSystem: false,
          returnSystemGrantedBy: null,
          returnSystemGrantedAt: null,
        });

        if (!updatedUser) {
          return res
            .status(500)
            .json({ message: "Failed to revoke return system access" });
        }

        // Remove password before sending response
        const { password, ...userWithoutPassword } = updatedUser;

        res.json({
          message: `Return system access revoked from ${user.name}`,
          user: userWithoutPassword,
        });
      } catch (error) {
        console.error("Error revoking return system access:", error);
        res
          .status(500)
          .json({
            message: "An error occurred while revoking return system access",
          });
      }
    },
  );

  // Delete a user (admin only)
  app.delete("/api/users/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminId = req.user!.id;

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Prevent deleting the main admin
      if (userId === 1) {
        return res
          .status(403)
          .json({ message: "Cannot delete the main admin account" });
      }

      // Prevent self-deletion
      if (userId === adminId) {
        return res
          .status(403)
          .json({ message: "Cannot delete your own account" });
      }

      const deletedUser = await storage.deleteUser(userId);

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password before sending
      const { password, ...userWithoutPassword } = deletedUser;

      res.json({
        message: "User deleted successfully",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res
        .status(500)
        .json({ message: "Error deleting user", error: error.message });
    }
  });

  // Balance management endpoints

  // Get currency rates with fallback options
  app.get("/api/currency-rates", async (req, res) => {
    try {
      // Use the cached currency function which prioritizes TCMB with 1.006 multiplier
      const currencyData = await getCachedCurrencyRates();

      res.json({
        success: true,
        ...currencyData,
      });
    } catch (error) {
      console.error("Currency rates endpoint error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch currency rates",
        message: error.message,
      });
    }
  });

  // Get user's current balance
  app.get("/api/balance", async (req, res) => {
    try {
      // Check if the user is authenticated via session
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("GET /balance");

      // Always fetch fresh user data directly from the database to ensure accuracy
      const userId = req.user.id;
      const freshUserData = await storage.getUser(userId);

      if (!freshUserData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get system minimum balance setting
      let systemMinBalance = null;
      try {
        const systemMinBalanceSetting =
          await storage.getSystemSetting("MIN_BALANCE");
        if (systemMinBalanceSetting && systemMinBalanceSetting.value) {
          systemMinBalance = parseInt(systemMinBalanceSetting.value, 10);
        }
      } catch (error) {
        console.error("Error getting system minimum balance setting:", error);
      }

      // Use user-specific minimum balance if available, otherwise use system default
      // Get the minimumBalance from fresh user data instead of session
      const minBalance =
        freshUserData.minimumBalance !== null
          ? freshUserData.minimumBalance
          : systemMinBalance;

      console.log(
        `Balance: User ${userId}, Session minimumBalance: ${req.user.minimumBalance || "null"}, Database minimumBalance: ${freshUserData.minimumBalance || "null"}`,
      );

      // Get currency rates using cached function
      let currencyRates = null;
      try {
        currencyRates = await getCachedCurrencyRates();
      } catch (error) {
        console.warn("Failed to fetch currency rates:", error.message);
        // Use fallback rate if all currency APIs fail
        currencyRates = {
          usdToTryRate: 30.0, // Conservative fallback rate
          lastUpdated: new Date().toISOString().split("T")[0],
          source: "Fallback rate (APIs unavailable)",
        };
      }

      const balanceInUsd = freshUserData.balance / 100;
      const balanceInTry = currencyRates
        ? balanceInUsd * currencyRates.usdToTryRate * 1.015
        : null;

      const minBalanceInUsd = minBalance !== null ? minBalance / 100 : null;
      const minBalanceInTry =
        currencyRates && minBalance !== null
          ? minBalanceInUsd * currencyRates.usdToTryRate * 1.015
          : null;

      const availableCreditInUsd =
        minBalance !== null
          ? Math.abs((minBalance - freshUserData.balance) / 100)
          : null;
      const availableCreditInTry =
        currencyRates && minBalance !== null
          ? availableCreditInUsd * currencyRates.usdToTryRate * 1.015
          : null;

      // Return data from fresh query
      res.json({
        balance: freshUserData.balance,
        formattedBalance: `$${balanceInUsd.toFixed(2)}`,
        balanceInTry: balanceInTry,
        formattedBalanceInTry: balanceInTry
          ? `₺${balanceInTry.toFixed(2)}`
          : null,
        minimumBalance: minBalance,
        formattedMinimumBalance:
          minBalance !== null
            ? `$${minBalanceInUsd.toFixed(2)}`
            : "System Default",
        formattedMinimumBalanceInTry: minBalanceInTry
          ? `₺${minBalanceInTry.toFixed(2)}`
          : null,
        availableCredit:
          minBalance !== null
            ? Math.abs(minBalance - freshUserData.balance)
            : null,
        formattedAvailableCredit: availableCreditInUsd
          ? `$${availableCreditInUsd.toFixed(2)}`
          : null,
        formattedAvailableCreditInTry: availableCreditInTry
          ? `₺${availableCreditInTry.toFixed(2)}`
          : null,
        currencyRates: currencyRates,
      });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Error fetching balance" });
    }
  });

  // Session refresh endpoint - force update session with fresh user data
  app.post("/api/refresh-session", async (req, res) => {
    try {
      // Check if the user is authenticated via session
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get the current user ID from the session
      const userId = req.user.id;

      // Fetch fresh user data from database
      const freshUserData = await storage.getUser(userId);

      if (!freshUserData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update the session with fresh user data
      // This will ensure updated information like minimumBalance is reflected in the session
      console.log(`Refreshing session for user ${userId}`);
      console.log(
        `Previous session data minimumBalance: ${req.user.minimumBalance || "null"}`,
      );
      console.log(
        `Fresh data minimumBalance: ${freshUserData.minimumBalance || "null"}`,
      );

      // Update session user data with fresh data from database
      const { password, ...userWithoutPassword } = freshUserData;
      req.user = userWithoutPassword;

      // Return success response with updated user data
      res.json({
        success: true,
        message: "Session refreshed with latest user data",
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
      res
        .status(500)
        .json({ message: "Error refreshing session", error: error.message });
    }
  });

  // Add funds to user balance (admin only can add funds to any user)
  app.post("/api/balance/add", async (req, res) => {
    console.log("🔵 BALANCE ADD ENDPOINT HIT - Request received");
    console.log("🔵 Request body:", JSON.stringify(req.body, null, 2));

    // Check if the user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is an admin
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin rights required." });
    }
    try {
      const { userId, amount, description } = req.body;

      if (!userId || amount === undefined || amount === null || amount === 0 || !description) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);

      // Add funds to user balance
      const updatedUser = await storage.updateUserBalance(
        userId,
        amountInCents,
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Record transaction
      await storage.createTransaction(userId, amountInCents, description);

      // Return updated balance
      res.json({
        balance: updatedUser.balance,
        formattedBalance: `$${(updatedUser.balance / 100).toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error adding funds:", error);
      res.status(500).json({ message: "Error adding funds" });
    }
  });

  // Set user balance to a specific amount (admin only)
  app.post("/api/balance/set", async (req, res) => {
    console.log("🚨🚨🚨 CRITICAL: BALANCE SET ENDPOINT HIT - Request received");
    console.log("🚨 Timestamp:", new Date().toISOString());
    console.log("🚨 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🚨 User authenticated:", !!req.isAuthenticated());
    console.log(
      "🚨 User object:",
      req.user ? `${req.user.username} (${req.user.role})` : "NO USER",
    );
    console.log("🚨 Request URL:", req.originalUrl);
    console.log("🚨 Request method:", req.method);
    console.log("🚨 User-Agent:", req.headers["user-agent"]);
    console.log("🚨 Referer:", req.headers["referer"]);
    console.log("🚨 Request IP:", req.ip);
    console.log("🚨 Session ID:", req.sessionID);

    // Add stack trace to see what's calling this endpoint
    console.log("🔍🔍🔍 BALANCE SET CALL STACK TRACE:");
    console.trace("Balance set endpoint called from:");

    // Log ALL headers for forensic analysis
    console.log(
      "🚨 ALL REQUEST HEADERS:",
      JSON.stringify(req.headers, null, 2),
    );

    // Check if the user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      console.log("🚨 Authentication failed - returning 401");
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user is an admin
    if (req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Access denied. Admin rights required." });
    }
    try {
      const { userId, balance, description } = req.body;

      if (!userId || balance === undefined || !description) {
        return res.status(400).json({ message: "Invalid request data" });
      }

      // Convert balance to cents
      const balanceInCents = Math.round(balance * 100);

      // Get current user to calculate adjustment amount
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log(`🔍 SET BALANCE DEBUG for user ${userId}:`);
      console.log(
        `  - Requested balance: $${balance} (${balanceInCents} cents)`,
      );
      console.log(
        `  - Current balance: $${((user.balance || 0) / 100).toFixed(2)} (${user.balance || 0} cents)`,
      );

      // Calculate the difference for the transaction record
      const adjustmentAmount = balanceInCents - (user.balance || 0);
      console.log(
        `  - Calculated adjustment: $${(adjustmentAmount / 100).toFixed(2)} (${adjustmentAmount} cents)`,
      );

      // Set the user's balance to the exact amount
      const updatedUser = await storage.setUserBalance(userId, balanceInCents);
      if (!updatedUser) {
        return res
          .status(404)
          .json({ message: "Failed to update user balance" });
      }

      console.log(
        `  - After setUserBalance: $${(updatedUser.balance / 100).toFixed(2)} (${updatedUser.balance} cents)`,
      );
      console.log(
        `  - Expected: $${(balanceInCents / 100).toFixed(2)} (${balanceInCents} cents)`,
      );
      console.log(
        `  - Match: ${updatedUser.balance === balanceInCents ? "YES" : "NO"}`,
      );

      // Record the transaction
      await storage.createTransaction(
        userId,
        adjustmentAmount,
        description || "Admin balance adjustment",
      );

      // Return updated balance
      res.json({
        balance: updatedUser.balance,
        formattedBalance: `$${(updatedUser.balance / 100).toFixed(2)}`,
        adjustment: adjustmentAmount,
        formattedAdjustment: `${adjustmentAmount >= 0 ? "+" : ""}$${(adjustmentAmount / 100).toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error setting balance:", error);
      res.status(500).json({ message: "Error setting balance" });
    }
  });

  // User adds funds to their own balance (for manual balance addition)
  app.post("/api/balance/deposit", async (req, res) => {
    // Check if the user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const { amount, description } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);

      // Add funds to user balance
      const updatedUser = await storage.updateUserBalance(
        req.user!.id,
        amountInCents,
      );
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Record transaction
      await storage.createTransaction(
        req.user!.id,
        amountInCents,
        description || "Manual deposit",
      );

      // Return updated balance
      res.json({
        balance: updatedUser.balance,
        formattedBalance: `$${(updatedUser.balance / 100).toFixed(2)}`,
      });
    } catch (error) {
      console.error("Error adding funds:", error);
      res.status(500).json({ message: "Error adding funds" });
    }
  });

  // Get user transaction history
  app.get("/api/transactions", async (req, res) => {
    // Check if the user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const transactions = await storage.getUserTransactions(req.user!.id);

      // Format amounts as dollars
      const formattedTransactions = transactions.map((transaction) => ({
        ...transaction,
        formattedAmount: `$${(transaction.amount / 100).toFixed(2)}`,
      }));

      res.json(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  // Get user transactions with running balance
  app.get("/api/transactions-with-balance", async (req, res) => {
    // Check if the user is authenticated via session
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      // Check if this is for export (all transactions) or regular view (limited)
      const isExport = req.query.export === 'true' || req.query.all === 'true';
      const limit = isExport ? undefined : 50;
      const offset = isExport ? undefined : 0;
      
      const transactionsWithBalance = await storage.getUserFinancialActivity(
        req.user!.id,
        limit,
        offset
      );
      res.json(transactionsWithBalance);
    } catch (error) {
      console.error("Error fetching transactions with balance:", error);
      res
        .status(500)
        .json({ message: "Error fetching transactions with balance" });
    }
  });

  // Announcement routes
  // Get all announcements (admin only)
  app.get(
    "/api/announcements/all",
    authenticateToken,
    isAdmin,
    getAllAnnouncements,
  );

  // Get login popup announcements for the current user (must be before /:id route)
  app.get(
    "/api/announcements/login-popups",
    authenticateToken,
    getLoginPopupAnnouncements,
  );

  // Get active announcements (all users)
  app.get("/api/announcements", authenticateToken, getActiveAnnouncements);

  // Get a single announcement by ID (admin only)
  app.get(
    "/api/announcements/:id",
    authenticateToken,
    isAdmin,
    getAnnouncementById,
  );

  // Create a new announcement (admin only)
  app.post(
    "/api/announcements",
    authenticateToken,
    isAdmin,
    createAnnouncement,
  );

  // Mark an announcement as viewed by the current user (must be before /:id routes)
  app.post(
    "/api/announcements/:id/viewed",
    authenticateToken,
    markAnnouncementViewed,
  );

  // Update an announcement (admin only)
  app.put(
    "/api/announcements/:id",
    authenticateToken,
    isAdmin,
    updateAnnouncement,
  );

  // Delete an announcement (admin only)
  app.delete(
    "/api/announcements/:id",
    authenticateToken,
    isAdmin,
    deleteAnnouncement,
  );

  // =========== Marketing Banner System ===========

  // Cache for marketing banners - significantly improves mobile performance
  let marketingBannersCache: any = null;
  let marketingBannersCacheTime = 0;
  const MARKETING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache for better mobile performance

  // Get active marketing banners (public - no auth required, with caching)
  app.get("/api/marketing-banners", async (req, res) => {
    try {
      const now = Date.now();
      
      // Return cached data if still valid
      if (marketingBannersCache && (now - marketingBannersCacheTime) < MARKETING_CACHE_TTL) {
        res.setHeader("Cache-Control", "public, max-age=300"); // 5 minutes client cache
        res.setHeader("X-Cache", "HIT");
        return res.json(marketingBannersCache);
      }
      
      // Fetch fresh data
      const banners = await storage.getActiveMarketingBanners();
      
      // Update cache
      marketingBannersCache = banners;
      marketingBannersCacheTime = now;
      
      res.setHeader("Cache-Control", "public, max-age=300"); // 5 minutes client cache
      res.setHeader("X-Cache", "MISS");
      res.json(banners);
    } catch (error) {
      console.error("Error fetching active marketing banners:", error);
      res.status(500).json({ message: "Failed to fetch marketing banners" });
    }
  });

  // Get all marketing banners (admin only)
  app.get(
    "/api/marketing-banners/all",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const banners = await storage.getAllMarketingBanners();
        res.json(banners);
      } catch (error) {
        console.error("Error fetching all marketing banners:", error);
        res.status(500).json({ message: "Failed to fetch marketing banners" });
      }
    },
  );

  // Get a single marketing banner by ID (admin only)
  app.get(
    "/api/marketing-banners/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const banner = await storage.getMarketingBanner(Number(req.params.id));
        if (!banner) {
          return res
            .status(404)
            .json({ message: "Marketing banner not found" });
        }
        res.json(banner);
      } catch (error) {
        console.error(
          `Error fetching marketing banner ID ${req.params.id}:`,
          error,
        );
        res.status(500).json({ message: "Failed to fetch marketing banner" });
      }
    },
  );

  // Create a new marketing banner (admin only)
  app.post(
    "/api/marketing-banners",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userData = req.body;

        console.log(
          "Creating marketing banner with data:",
          JSON.stringify(userData),
        );

        // Validate the data (schema now accepts string dates directly)
        const validation = insertMarketingBannerSchema.safeParse(userData);
        if (!validation.success) {
          console.error(
            "Marketing banner validation failed:",
            validation.error.errors,
          );
          return res.status(400).json({
            message: "Invalid banner data",
            errors: validation.error.errors,
          });
        }

        // Create the marketing banner (date conversion happens in storage layer)
        const banner = await storage.createMarketingBanner(
          validation.data,
          req.user.id,
        );
        
        // Invalidate marketing banners cache for immediate updates
        marketingBannersCache = null;
        marketingBannersCacheTime = 0;
        
        res.status(201).json(banner);
      } catch (error) {
        console.error("Error creating marketing banner:", error);
        res.status(500).json({ message: "Failed to create marketing banner" });
      }
    },
  );

  // Update a marketing banner (admin only)
  app.put(
    "/api/marketing-banners/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const bannerId = Number(req.params.id);
        const bannerData = req.body;

        console.log(
          "Updating marketing banner with data:",
          JSON.stringify(bannerData),
        );

        // Check if banner exists
        const existingBanner = await storage.getMarketingBanner(bannerId);
        if (!existingBanner) {
          return res
            .status(404)
            .json({ message: "Marketing banner not found" });
        }

        // Validate the data (schema now accepts string dates directly)
        const validation = insertMarketingBannerSchema.safeParse(bannerData);
        if (!validation.success) {
          console.error(
            "Marketing banner update validation failed:",
            validation.error.errors,
          );
          return res.status(400).json({
            message: "Invalid banner data",
            errors: validation.error.errors,
          });
        }

        // Update the banner (date conversion happens in storage layer)
        const updatedBanner = await storage.updateMarketingBanner(
          bannerId,
          validation.data,
        );
        
        // Invalidate marketing banners cache for immediate updates
        marketingBannersCache = null;
        marketingBannersCacheTime = 0;
        
        res.json(updatedBanner);
      } catch (error) {
        console.error(
          `Error updating marketing banner ID ${req.params.id}:`,
          error,
        );
        res.status(500).json({ message: "Failed to update marketing banner" });
      }
    },
  );

  // Delete a marketing banner (admin only)
  app.delete(
    "/api/marketing-banners/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const bannerId = Number(req.params.id);

        // Check if banner exists
        const existingBanner = await storage.getMarketingBanner(bannerId);
        if (!existingBanner) {
          return res
            .status(404)
            .json({ message: "Marketing banner not found" });
        }

        // Delete the banner
        await storage.deleteMarketingBanner(bannerId);
        
        // Invalidate marketing banners cache for immediate updates
        marketingBannersCache = null;
        marketingBannersCacheTime = 0;
        
        res.json({ message: "Marketing banner deleted successfully" });
      } catch (error) {
        console.error(
          `Error deleting marketing banner ID ${req.params.id}:`,
          error,
        );
        res.status(500).json({ message: "Failed to delete marketing banner" });
      }
    },
  );

  // =========== Public Tracking Endpoint ===========
  // Public tracking endpoint for tracking page (no authentication required)
  app.get("/api/track/:trackingNumber", async (req, res) => {
    const trackingNumber = req.params.trackingNumber;
    console.log(
      `[TRACKING API] Searching for tracking number: ${trackingNumber}`,
    );

    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Takip numarası gerekli",
      });
    }

    try {
      // Import pool from the pre-created db instance
      const { pool } = await import("./db");

      const query = `
        SELECT 
          id, tracking_number, carrier_tracking_number, status, 
          sender_name, sender_address1, sender_city, 
          receiver_name, receiver_city, receiver_country,
          carrier_name, service_level, estimated_delivery_days, tracking_info,
          created_at, updated_at, rejection_reason, package_weight, 
          package_length, package_width, package_height,
          package_contents, customs_value, service_level as service_type
        FROM shipments 
        WHERE tracking_number = $1 OR carrier_tracking_number = $1
        LIMIT 1
      `;

      const result = await pool.query(query, [trackingNumber]);
      const shipment = result.rows[0];

      console.log(
        `[TRACKING API] Database query result:`,
        result.rows.length > 0
          ? `Found shipment ID: ${shipment.id}`
          : "No shipment found",
      );

      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Takip numarası bulunamadı",
        });
      }

      // Simple helper functions for tracking data
      const getSimpleStatusText = (status) => {
        const statusMap = {
          draft: "Taslak",
          pending: "Onay Bekliyor",
          approved: "Onaylandı",
          shipped: "Kargoya Verildi",
          "in-transit": "Yolda",
          delivered: "Teslim Edildi",
          cancelled: "İptal Edildi",
          returned: "İade Edildi",
        };
        return statusMap[status] || status;
      };

      const getCurrentLocationFromUPS = (upsTrackingData) => {
        if (
          upsTrackingData &&
          upsTrackingData.trackResponse &&
          upsTrackingData.trackResponse.shipment
        ) {
          const shipmentData = upsTrackingData.trackResponse.shipment[0];
          if (
            shipmentData.package &&
            shipmentData.package[0] &&
            shipmentData.package[0].activity
          ) {
            const latestActivity = shipmentData.package[0].activity[0]; // Most recent activity
            if (latestActivity.location && latestActivity.location.address) {
              const address = latestActivity.location.address;
              return (
                `${address.city || ""}, ${address.country || ""}`
                  .trim()
                  .replace(/^,\s*/, "") || null
              );
            }
          }
        }
        return null;
      };

      // Fetch UPS data once for both location and timeline
      let upsTrackingData = null;
      if (shipment.carrier_tracking_number) {
        try {
          console.log(
            `[TRACKING] Fetching UPS data for current location: ${shipment.carrier_tracking_number}`,
          );
          upsTrackingData = await getUPSTrackingInfo(
            shipment.carrier_tracking_number,
          );
        } catch (error) {
          console.log(
            "[TRACKING] Error fetching UPS data for location:",
            error,
          );
        }
      }

      // Get current location from UPS data or use fallback
      let currentLocation = getCurrentLocationFromUPS(upsTrackingData);
      if (!currentLocation) {
        // Fallback to basic location logic
        if (shipment.status === "delivered") {
          currentLocation = shipment.receiver_city
            ? `${shipment.receiver_city}, ${shipment.receiver_country}`
            : "Teslim Edildi";
        } else if (shipment.status === "in-transit") {
          currentLocation = "Yolda";
        } else if (shipment.status === "shipped") {
          currentLocation = shipment.sender_city
            ? `${shipment.sender_city}, Turkey`
            : "Turkey";
        } else {
          currentLocation = "Turkey";
        }
      }

      // Build comprehensive tracking response with authentic database data
      const trackingResponse = {
        trackingNumber:
          shipment.tracking_number || shipment.carrier_tracking_number,
        status: shipment.status,
        statusText: getSimpleStatusText(shipment.status),
        estimatedDelivery: shipment.estimated_delivery_days
          ? new Date(
              Date.now() +
                shipment.estimated_delivery_days * 24 * 60 * 60 * 1000,
            )
              .toISOString()
              .split("T")[0]
          : null,
        origin: shipment.sender_city
          ? `${shipment.sender_city}, Turkey`
          : "Turkey",
        destination: shipment.receiver_city
          ? `${shipment.receiver_city}, ${shipment.receiver_country}`
          : "Unknown",
        currentLocation: currentLocation,
        timeline: await fetchRealTrackingHistory(shipment),
        carrierInfo: {
          name: shipment.carrier_name || "MoogShip",
          service:
            shipment.service_level || shipment.service_type || "Standard",
          trackingNumber: shipment.carrier_tracking_number || null,
          trackingUrl:
            shipment.carrier_tracking_number && shipment.carrier_name === "UPS"
              ? `https://www.ups.com/track?tracknum=${shipment.carrier_tracking_number}`
              : null,
          estimatedDays: shipment.estimated_delivery_days || null,
        },
        packageInfo: {
          weight: shipment.package_weight
            ? `${shipment.package_weight} kg`
            : null,
          dimensions:
            shipment.package_length &&
            shipment.package_width &&
            shipment.package_height
              ? `${shipment.package_length} x ${shipment.package_width} x ${shipment.package_height} cm`
              : null,
          contents: shipment.package_contents || "General Merchandise",
          declaredValue: shipment.customs_value
            ? `$${shipment.customs_value}`
            : null,
        },
        sender: {
          name: shipment.sender_name,
          address: shipment.sender_address1,
        },
        receiver: {
          name: shipment.receiver_name,
          city: shipment.receiver_city,
          country: shipment.receiver_country,
        },
      };

      res.json({
        success: true,
        data: trackingResponse,
      });
    } catch (error) {
      console.error("[TRACKING API] Error details:", {
        message: error.message,
        stack: error.stack,
        trackingNumber,
      });
      res.status(500).json({
        success: false,
        message: "Takip sorgulama sırasında hata oluştu",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  });

  // Helper functions for tracking data
  function getStatusText(status: string): string {
    const statusMap = {
      pending: "Bekliyor",
      approved: "Onaylandı",
      rejected: "Reddedildi",
      in_transit: "Kargoda",
      delivered: "Teslim Edildi",
      cancelled: "İptal Edildi",
    };
    return statusMap[status] || status;
  }

  async function fetchRealTrackingHistory(shipment: any): Promise<Array<any>> {
    // If no carrier tracking number, return basic MoogShip status only
    if (!shipment.carrier_tracking_number) {
      return [
        {
          status: "Sipariş Oluşturuldu",
          statusEn: "Shipment Created",
          date: new Date(shipment.created_at).toISOString().split("T")[0],
          time: new Date(shipment.created_at).toLocaleTimeString("tr-TR", {
            hour12: false,
          }),
          location: "MoogShip Platform",
          locationEn: "MoogShip Platform",
          description: "Kargo siparişi oluşturuldu ve sisteme kaydedildi",
          descriptionEn: "Shipment order created and registered in system",
          completed: true,
          icon: "📝",
        },
      ];
    }

    try {
      // Fetch real tracking data from UPS API
      console.log(
        `[TRACKING] Fetching UPS data for carrier tracking: ${shipment.carrier_tracking_number}`,
      );
      const upsTrackingData = await getUPSTrackingInfo(
        shipment.carrier_tracking_number,
      );
      console.log(
        `[TRACKING] UPS API response:`,
        upsTrackingData ? "Data received" : "No data",
      );

      if (
        upsTrackingData &&
        upsTrackingData.trackResponse &&
        upsTrackingData.trackResponse.shipment
      ) {
        const shipmentData = upsTrackingData.trackResponse.shipment[0];

        if (
          shipmentData.package &&
          shipmentData.package[0] &&
          shipmentData.package[0].activity
        ) {
          const activities = shipmentData.package[0].activity;
          const timeline = [];

          // Add MoogShip internal activities first
          const moogshipActivities = [];

          // 1. Shipment Created
          if (shipment.created_at) {
            moogshipActivities.push({
              status: "Sipariş Oluşturuldu",
              statusEn: "Shipment Created",
              date: new Date(shipment.created_at).toISOString().split("T")[0],
              time: new Date(shipment.created_at).toLocaleTimeString("tr-TR", {
                hour12: false,
              }),
              location: "MoogShip Platform",
              locationEn: "MoogShip Platform",
              description: "Kargo siparişi oluşturuldu ve sisteme kaydedildi",
              descriptionEn: "Shipment order created and registered in system",
              completed: true,
              icon: "📝",
            });
          }

          // 2. Shipment Approved
          if (
            shipment.status === "approved" ||
            shipment.status === "in_transit" ||
            shipment.status === "delivered"
          ) {
            const approvalDate = new Date(
              new Date(shipment.created_at).getTime() + 60 * 60000,
            ); // 1 hour after creation
            moogshipActivities.push({
              status: "Sipariş Onaylandı",
              statusEn: "Shipment Approved",
              date: approvalDate.toISOString().split("T")[0],
              time: approvalDate.toLocaleTimeString("tr-TR", { hour12: false }),
              location: "MoogShip Platform",
              locationEn: "MoogShip Platform",
              description: "Kargo siparişi onaylandı ve işleme alındı",
              descriptionEn: "Shipment approved and processing started",
              completed: true,
              icon: "✅",
            });
          }

          // 3. Label Generated
          if (shipment.carrier_tracking_number) {
            const labelDate = new Date(
              new Date(shipment.created_at).getTime() + 120 * 60000,
            ); // 2 hours after creation
            moogshipActivities.push({
              status: "Kargo Etiketi Oluşturuldu",
              statusEn: "Shipping Label Generated",
              date: labelDate.toISOString().split("T")[0],
              time: labelDate.toLocaleTimeString("tr-TR", { hour12: false }),
              location: "MoogShip Platform",
              locationEn: "MoogShip Platform",
              description: `Kargo etiketi oluşturuldu (${shipment.carrier_tracking_number})`,
              descriptionEn: `Shipping label generated (${shipment.carrier_tracking_number})`,
              completed: true,
              icon: "🏷️",
            });
          }

          // 4. Package Prepared
          if (
            shipment.status === "in_transit" ||
            shipment.status === "delivered"
          ) {
            const prepDate = new Date(
              new Date(shipment.created_at).getTime() + 180 * 60000,
            ); // 3 hours after creation
            moogshipActivities.push({
              status: "Paket Hazırlandı",
              statusEn: "Package Prepared",
              date: prepDate.toISOString().split("T")[0],
              time: prepDate.toLocaleTimeString("tr-TR", { hour12: false }),
              location: "Istanbul, Turkey",
              locationEn: "Istanbul, Turkey",
              description: "Paket kargo firmasına teslim için hazırlandı",
              descriptionEn: "Package prepared for carrier handover",
              completed: true,
              icon: "📦",
            });
          }

          // Convert UPS activities to our timeline format
          activities.forEach((activity: any) => {
            const date = activity.date
              ? `${activity.date.substring(0, 4)}-${activity.date.substring(4, 6)}-${activity.date.substring(6, 8)}`
              : new Date().toISOString().split("T")[0];

            const time = activity.time
              ? `${activity.time.substring(0, 2)}:${activity.time.substring(2, 4)}:${activity.time.substring(4, 6)}`
              : "00:00:00";

            const location = activity.location?.address
              ? `${activity.location.address.city || ""}, ${activity.location.address.country || ""}`
                  .trim()
                  .replace(/^,\s*/, "")
              : "Unknown Location";

            timeline.push({
              status: activity.status?.description || "Status Update",
              statusEn: activity.status?.description || "Status Update",
              date: date,
              time: time,
              location: location,
              locationEn: location,
              description:
                activity.status?.description || "Package status updated",
              descriptionEn:
                activity.status?.description || "Package status updated",
              completed: true,
              icon: getStatusIcon(activity.status?.code || "MP"),
            });
          });

          // Combine MoogShip and UPS activities
          const combinedTimeline = [...moogshipActivities, ...timeline];

          // Sort by date and time (most recent first)
          combinedTimeline.sort((a, b) => {
            const dateTimeA = new Date(`${a.date} ${a.time}`);
            const dateTimeB = new Date(`${b.date} ${b.time}`);
            return dateTimeB.getTime() - dateTimeA.getTime();
          });

          return combinedTimeline;
        }
      }
    } catch (error) {
      console.error("[TRACKING] Error fetching UPS data:", error);
    }

    // Fallback to basic timeline if UPS API fails
    return [
      {
        status: "Kargo Bilgisi Alınamadı",
        statusEn: "Tracking Information Unavailable",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString("tr-TR", { hour12: false }),
        location: "Unknown",
        locationEn: "Unknown",
        description: "Kargo takip bilgisi şu anda alınamıyor",
        descriptionEn: "Tracking information is currently unavailable",
        completed: false,
        icon: "❓",
      },
    ];
  }

  function getStatusIcon(statusCode: string): string {
    const iconMap = {
      MP: "📝", // Manifest pickup
      DP: "📦", // Departed facility
      AR: "📍", // Arrived facility
      OT: "🚚", // Out for delivery
      D: "✅", // Delivered
      X: "❌", // Exception
    };
    return iconMap[statusCode] || "📦";
  }

  async function getUPSTrackingInfo(trackingNumber: string) {
    try {
      const token = await getUPSAccessToken();
      if (!token) {
        console.log("[UPS] No token available for tracking request");
        return null;
      }

      console.log(`[UPS] Requesting tracking data for: ${trackingNumber}`);
      const response = await fetch(
        `https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            transId: `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            transactionSrc: "MoogShip",
          },
        },
      );

      console.log(`[UPS] Tracking response status: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(
          "[UPS] Tracking data received:",
          data.trackResponse ? "Valid response" : "No tracking data",
        );
        return data;
      } else {
        const errorText = await response.text();
        console.error(
          `[UPS] Tracking error: ${response.status} - ${errorText}`,
        );
      }
    } catch (error) {
      console.error("[UPS] Tracking request failed:", error);
    }
    return null;
  }

  async function getUPSAccessToken() {
    try {
      const clientId = process.env.UPS_CLIENT_ID;
      const clientSecret = process.env.UPS_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.log("[UPS] Missing credentials");
        return null;
      }

      console.log("[UPS] Requesting OAuth token");
      const response = await fetch(
        "https://onlinetools.ups.com/security/v1/oauth/token",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          },
          body: "grant_type=client_credentials",
        },
      );

      console.log("[UPS] OAuth response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("[UPS] Token received successfully");
        return data.access_token;
      } else {
        const errorText = await response.text();
        console.error("[UPS] OAuth error:", response.status, errorText);
      }
    } catch (error) {
      console.error("[UPS] Token error:", error);
    }
    return null;
  }

  function generateCargoHistory_OLD(shipment: any): Array<any> {
    const history = [];

    // 1. Shipment Created
    if (shipment.created_at) {
      history.push({
        status: "Sipariş Oluşturuldu",
        statusEn: "Shipment Created",
        date: new Date(shipment.created_at).toISOString().split("T")[0],
        time: new Date(shipment.created_at).toLocaleTimeString("tr-TR", {
          hour12: false,
        }),
        location: "MoogShip Platform",
        locationEn: "MoogShip Platform",
        description: "Kargo siparişi oluşturuldu ve sisteme kaydedildi",
        descriptionEn: "Shipment order created and registered in system",
        completed: true,
        icon: "📝",
      });
    }

    // 2. Shipment Approved (use created_at + 1 hour as approximation if status is approved or higher)
    if (
      shipment.status === "approved" ||
      shipment.status === "in_transit" ||
      shipment.status === "delivered"
    ) {
      const approvalDate = new Date(
        new Date(shipment.created_at).getTime() + 60 * 60000,
      ); // 1 hour after creation
      history.push({
        status: "Sipariş Onaylandı",
        statusEn: "Shipment Approved",
        date: approvalDate.toISOString().split("T")[0],
        time: approvalDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "MoogShip Operations Center",
        locationEn: "MoogShip Operations Center",
        description: "Kargo siparişi onaylandı ve işleme alındı",
        descriptionEn: "Shipment approved and processing started",
        completed: true,
        icon: "✅",
      });
    }

    // 3. Label Generated (if carrier tracking exists)
    if (shipment.carrier_tracking_number) {
      const labelDate = new Date(
        new Date(shipment.created_at).getTime() + 90 * 60000,
      ); // 1.5 hours after creation
      history.push({
        status: "Etiket Oluşturuldu",
        statusEn: "Label Generated",
        date: labelDate.toISOString().split("T")[0],
        time: labelDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "MoogShip Warehouse",
        locationEn: "MoogShip Warehouse",
        description: `Kargo etiketi oluşturuldu - Takip No: ${shipment.carrier_tracking_number}`,
        descriptionEn: `Shipping label generated - Tracking No: ${shipment.carrier_tracking_number}`,
        completed: true,
        icon: "🏷️",
      });
    }

    // 4. Package Prepared
    if (
      shipment.status === "approved" ||
      shipment.status === "in_transit" ||
      shipment.status === "delivered"
    ) {
      const prepDate = new Date(
        new Date(shipment.created_at).getTime() + 120 * 60000,
      ); // 2 hours after creation
      history.push({
        status: "Paket Hazırlandı",
        statusEn: "Package Prepared",
        date: prepDate.toISOString().split("T")[0],
        time: prepDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "MoogShip Warehouse, Istanbul",
        locationEn: "MoogShip Warehouse, Istanbul",
        description: "Paket ambalajlandı ve kargo için hazırlandı",
        descriptionEn: "Package packaged and prepared for shipping",
        completed: true,
        icon: "📦",
      });
    }

    // 5. Handed to Carrier
    if (
      shipment.carrier_tracking_number &&
      (shipment.status === "in_transit" || shipment.status === "delivered")
    ) {
      const handoverDate = new Date(
        new Date(shipment.created_at).getTime() + 180 * 60000,
      ); // 3 hours after creation
      const carrierName = shipment.carrier_name || "Carrier";
      history.push({
        status: "Kargoya Teslim Edildi",
        statusEn: "Handed to Carrier",
        date: handoverDate.toISOString().split("T")[0],
        time: handoverDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: `${carrierName} Pickup Point, Istanbul`,
        locationEn: `${carrierName} Pickup Point, Istanbul`,
        description: `Paket ${carrierName} kargo firmasına teslim edildi`,
        descriptionEn: `Package handed over to ${carrierName}`,
        completed:
          shipment.status === "in_transit" || shipment.status === "delivered",
        icon: "🚚",
      });
    }

    // 6. In Transit
    if (shipment.status === "in_transit" || shipment.status === "delivered") {
      const transitDate = shipment.updated_at
        ? new Date(shipment.updated_at)
        : new Date(new Date(shipment.created_at).getTime() + 24 * 60 * 60000); // 1 day after creation
      history.push({
        status: "Kargoda",
        statusEn: "In Transit",
        date: transitDate.toISOString().split("T")[0],
        time: transitDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "International Transit",
        locationEn: "International Transit",
        description: `Paket ${shipment.receiver_country || "hedef ülke"}ye doğru yolda`,
        descriptionEn: `Package en route to ${shipment.receiver_country || "destination country"}`,
        completed: shipment.status === "delivered",
        icon: "✈️",
      });
    }

    // 7. Delivered
    if (shipment.status === "delivered") {
      const deliveryDate = shipment.updated_at
        ? new Date(shipment.updated_at)
        : new Date();
      history.push({
        status: "Teslim Edildi",
        statusEn: "Delivered",
        date: deliveryDate.toISOString().split("T")[0],
        time: deliveryDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: `${shipment.receiver_city}, ${shipment.receiver_country}`,
        locationEn: `${shipment.receiver_city}, ${shipment.receiver_country}`,
        description: "Paket başarıyla teslim edildi",
        descriptionEn: "Package successfully delivered",
        completed: true,
        icon: "🎉",
      });
    }

    // 8. Rejected
    if (shipment.status === "rejected") {
      const rejectionDate = shipment.updated_at
        ? new Date(shipment.updated_at)
        : new Date(new Date(shipment.created_at).getTime() + 60 * 60000);
      history.push({
        status: "Sipariş Reddedildi",
        statusEn: "Shipment Rejected",
        date: rejectionDate.toISOString().split("T")[0],
        time: rejectionDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "MoogShip Operations Center",
        locationEn: "MoogShip Operations Center",
        description: `Sipariş reddedildi: ${shipment.rejection_reason || "Sebep belirtilmemiş"}`,
        descriptionEn: `Shipment rejected: ${shipment.rejection_reason || "No reason specified"}`,
        completed: true,
        icon: "❌",
      });
    }

    // 9. Cancelled
    if (shipment.status === "cancelled") {
      const cancellationDate = shipment.updated_at
        ? new Date(shipment.updated_at)
        : new Date();
      history.push({
        status: "Sipariş İptal Edildi",
        statusEn: "Shipment Cancelled",
        date: cancellationDate.toISOString().split("T")[0],
        time: cancellationDate.toLocaleTimeString("tr-TR", { hour12: false }),
        location: "MoogShip Platform",
        locationEn: "MoogShip Platform",
        description: "Sipariş iptal edildi",
        descriptionEn: "Shipment cancelled",
        completed: true,
        icon: "🚫",
      });
    }

    // Sort by date and return
    return history.sort(
      (a, b) =>
        new Date(a.date + " " + a.time).getTime() -
        new Date(b.date + " " + b.time).getTime(),
    );
  }

  function getCurrentLocation(shipment: any): string {
    // Parse tracking info if available
    if (shipment.trackingInfo) {
      try {
        const trackingData =
          typeof shipment.trackingInfo === "string"
            ? JSON.parse(shipment.trackingInfo)
            : shipment.trackingInfo;

        if (trackingData.currentLocation) {
          return trackingData.currentLocation;
        }
      } catch (e) {
        console.warn("Error parsing tracking info:", e);
      }
    }

    // Default location based on status
    switch (shipment.status) {
      case "pending":
      case "approved":
        return `${shipment.senderCity}, ${shipment.senderCountry || "Turkey"}`;
      case "in_transit":
        return "Transit Hub";
      case "delivered":
        return `${shipment.receiverCity}, ${shipment.receiverCountry}`;
      default:
        return "Bilinmiyor";
    }
  }

  function generateTimeline(shipment: any): any[] {
    // Return simplified timeline without date operations to avoid parsing errors
    return [
      {
        date: new Date().toISOString().split("T")[0],
        time: "12:00:00",
        status: "created",
        description: "Gönderi oluşturuldu",
        location: "Turkey",
      },
    ];
  }

  // =========== Request Tracking Number ===========
  // Allow users to request tracking numbers for their shipments
  app.post(
    "/api/shipments/request-tracking/:id",
    authenticateToken,
    async (req, res) => {
      try {
        const shipmentId = Number(req.params.id);

        // Check if shipment exists and belongs to user
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({
            success: false,
            message: "Gönderi bulunamadı",
          });
        }

        // Verify ownership (non-admins can only request for their own shipments)
        if (shipment.userId !== req.user?.id && req.user?.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Bu gönderi için takip numarası talep etme yetkiniz yok",
          });
        }

        // Only allow requesting tracking numbers for shipments that don't already have one
        // and that are in an appropriate status
        if (shipment.carrierTrackingNumber) {
          return res.status(400).json({
            success: false,
            message: "Bu gönderi zaten bir takip numarasına sahip",
          });
        }

        // Create a tracking request flag for this shipment
        await storage.updateShipment(shipmentId, {
          needsTrackingNumber: true,
          trackingRequestedAt: new Date(),
          updatedAt: new Date(),
        });

        // Log the tracking number request
        console.log(
          `[USER REQUEST] Tracking number requested for shipment ID ${shipmentId} by user ID ${req.user?.id}`,
        );

        // Create fast tracking notification for admins
        try {
          const user = req.user!;
          const notificationData = {
            shipmentId,
            userId: user.id,
            userName: user.name || user.username,
            userEmail: user.email,
            destinationCountry: shipment.receiverCountry,
            destinationCity: shipment.receiverCity,
          };

          await storage.createFastTrackingNotification(notificationData);
          console.log(
            `[NOTIFICATION] Fast tracking notification created for shipment ${shipmentId}`,
          );
        } catch (notificationError) {
          console.error(
            `[NOTIFICATION] Failed to create fast tracking notification:`,
            notificationError,
          );
          // Don't fail the request if notification creation fails
        }

        res.json({
          success: true,
          message: "Takip numarası talebi başarıyla gönderildi",
        });
      } catch (error) {
        console.error("Error requesting tracking number:", error);
        res.status(500).json({
          success: false,
          message: "Takip numarası talep edilirken bir hata oluştu",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // =========== Manual Tracking Number Entry ===========
  // Support only the manual-tracking endpoint (add-tracking is handled by controller)
  app.post(
    "/api/shipments/manual-tracking/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const shipmentId = Number(req.params.id);
        const { trackingNumber, carrierName } = req.body;

        if (!trackingNumber) {
          return res.status(400).json({
            success: false,
            message: "Tracking number is required",
          });
        }

        // First check if shipment exists
        const shipment = await storage.getShipment(shipmentId);
        if (!shipment) {
          return res.status(404).json({
            success: false,
            message: "Shipment not found",
          });
        }

        // Determine if this is an update to an existing tracking number
        const isUpdate = !!shipment.carrierTrackingNumber;

        // Auto-detect carrier if not provided
        let detectedCarrier = carrierName;
        if (!detectedCarrier) {
          const { detectCarrier } = await import("./utils/carrierDetection");
          const carrierType = detectCarrier(trackingNumber);

          switch (carrierType) {
            case "UPS":
              detectedCarrier = "UPS";
              break;
            case "DHL":
              detectedCarrier = "DHL";
              break;
            case "AFS":
              detectedCarrier = "AFS Transport";
              break;
            case "ROYAL":
              detectedCarrier = "Royal Mail";
              break;
            default:
              detectedCarrier = "Manual Entry";
          }

          console.log(
            `[DEBUG] Auto-detected carrier: ${detectedCarrier} for tracking number: ${trackingNumber}`,
          );
        }

        // First, just add the tracking number without changing status
        let updatedShipment = await storage.updateShipment(shipmentId, {
          carrierTrackingNumber: trackingNumber,
          carrierName: detectedCarrier,
          updatedAt: new Date(),
        });

        // Now fetch the actual tracking status from the carrier API
        // Allow admin to update tracking for shipments in any status
        console.log(
          `[TRACKING] Admin updating tracking for shipment with status: ${shipment.status}`,
        );

        try {
          // Use the enhanced carrier detection system
          const { detectCarrier } = await import("./utils/carrierDetection");
          const carrierType = detectCarrier(trackingNumber);
          console.log(
            `[TRACKING] Detected carrier: ${carrierType} for tracking number: ${trackingNumber}`,
          );

          let trackingInfo;
          if (carrierType === "UPS") {
            const { trackPackage } = await import("./services/ups");
            trackingInfo = await trackPackage(trackingNumber);
          } else if (carrierType === "DHL") {
            const { trackPackage } = await import("./services/dhl");
            trackingInfo = await trackPackage(trackingNumber);
          } else if (carrierType === "AFS") {
            const { trackAFS } = await import("./services/afstransport");
            trackingInfo = await trackAFS(trackingNumber);
          } else if (carrierType === "ROYAL") {
            // Royal Mail tracking: For now, set to PRE_TRANSIT as manual tracking
            // Future enhancement could integrate with Royal Mail API
            console.log(
              `[TRACKING] Royal Mail tracking number detected: ${trackingNumber}`,
            );
            trackingInfo = {
              status: "PRE_TRANSIT",
              description: "Royal Mail tracking number added manually",
              carrierTrackingNumber: trackingNumber,
            };
          } else {
            console.warn(
              `[TRACKING] Unsupported carrier type for tracking number: ${trackingNumber}`,
            );
            throw new Error("Unsupported carrier type");
          }

          // Update status based on actual tracking information
          let statusUpdate = {};
          if (
            trackingInfo.status === "IN_TRANSIT" ||
            trackingInfo.status === "OUT_FOR_DELIVERY"
          ) {
            statusUpdate = { status: ShipmentStatus.IN_TRANSIT };
            console.log(`[TRACKING] Package is in transit - updating status`);
          } else if (trackingInfo.status === "DELIVERED") {
            statusUpdate = { status: ShipmentStatus.DELIVERED };
            console.log(`[TRACKING] Package is delivered - updating status`);
          } else if (trackingInfo.status === "PRE_TRANSIT") {
            // Label created but not picked up yet - move to PRE_TRANSIT if APPROVED
            if (shipment.status === ShipmentStatus.APPROVED) {
              statusUpdate = { status: ShipmentStatus.PRE_TRANSIT };
              console.log(
                `[TRACKING] Package has label only - moving to PRE_TRANSIT`,
              );
            } else {
              console.log(
                `[TRACKING] Package status is '${trackingInfo.status}' - keeping current status`,
              );
            }
          } else if (shipment.status === ShipmentStatus.APPROVED) {
            // Unknown status for APPROVED shipment - move to PRE_TRANSIT as default with tracking
            statusUpdate = { status: ShipmentStatus.PRE_TRANSIT };
            console.log(
              `[TRACKING] Package status is '${trackingInfo.status}' - moving APPROVED to PRE_TRANSIT`,
            );
          } else {
            // For IN_TRANSIT shipments, update the tracking info but keep status
            console.log(
              `[TRACKING] Updating tracking info for existing IN_TRANSIT shipment`,
            );
          }

          // Update with real tracking info and correct status (if needed)
          if (Object.keys(statusUpdate).length > 0 || trackingInfo) {
            updatedShipment = await storage.updateShipment(shipmentId, {
              ...statusUpdate,
              trackingInfo: JSON.stringify(trackingInfo),
              updatedAt: new Date(),
            });
          }
        } catch (trackingError) {
          console.warn(
            `[TRACKING] Could not fetch tracking info for ${trackingNumber}:`,
            trackingError.message,
          );
          console.log(
            `[TRACKING] Continuing with tracking number update - API will be checked later`,
          );
          // Continue without updating status - tracking number is still added

          // For APPROVED shipments without API access, set to PRE_TRANSIT
          if (shipment.status === ShipmentStatus.APPROVED) {
            updatedShipment = await storage.updateShipment(shipmentId, {
              status: ShipmentStatus.PRE_TRANSIT,
              updatedAt: new Date(),
            });
            console.log(
              `[TRACKING] Set APPROVED shipment to PRE_TRANSIT with manual tracking number`,
            );
          }
        }

        // Log the manual tracking number entry/update
        const actionType = isUpdate ? "updated" : "added";
        console.log(
          `[ADMIN] Manual tracking number ${trackingNumber} ${actionType} for shipment ID ${shipmentId} by admin ID ${req.user?.id}`,
        );

        res.json({
          success: true,
          message: `Tracking number ${actionType} successfully`,
          shipment: updatedShipment,
        });
      } catch (error) {
        console.error("Error managing tracking number:", error);
        res.status(500).json({
          success: false,
          message: "Failed to manage tracking number",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Raw ShipEntegra API response test endpoint
  app.post("/api/test/shipentegra-raw", async (req, res) => {
    try {
      // Import required services
      const fetch = (await import("node-fetch")).default;

      // ShipEntegra API credentials and URLs
      const CLIENT_ID = process.env.SHIPENTEGRA_CLIENT_ID;
      const CLIENT_SECRET = process.env.SHIPENTEGRA_CLIENT_SECRET;
      const SHIPENTEGRA_TOKEN_URL =
        "https://publicapi.shipentegra.com/v1/auth/token";
      const SHIPENTEGRA_PRICE_URL =
        "https://publicapi.shipentegra.com/v1/tools/calculate/all";

      console.log(
        "🚀 Starting direct ShipEntegra API call for raw response capture...",
      );

      // Step 1: Get access token
      const tokenResponse = await fetch(SHIPENTEGRA_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log("🔑 Token response:", tokenData);

      if (!tokenData.data?.accessToken) {
        return res.status(500).json({
          success: false,
          error: "Failed to get access token",
          tokenResponse: tokenData,
        });
      }

      // Step 2: Make pricing API call with user-provided parameters
      const { country = "US", kgDesi = 0.43, isAmazonShipment = 0 } = req.body;
      const pricingPayload = {
        country,
        kgDesi,
        isAmazonShipment,
      };

      console.log(
        "📦 Pricing payload:",
        JSON.stringify(pricingPayload, null, 2),
      );

      const pricingResponse = await fetch(SHIPENTEGRA_PRICE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.data.accessToken}`,
        },
        body: JSON.stringify(pricingPayload),
      });

      const rawResponseData = await pricingResponse.json();

      console.log(
        "🔥 CAPTURED RAW SHIPENTEGRA API RESPONSE:",
        JSON.stringify(rawResponseData, null, 2),
      );

      // Return the complete raw response
      res.json({
        success: true,
        message: "Complete raw ShipEntegra API response captured",
        apiCall: {
          tokenUrl: SHIPENTEGRA_TOKEN_URL,
          pricingUrl: SHIPENTEGRA_PRICE_URL,
          payload: pricingPayload,
          httpStatus: pricingResponse.status,
          httpStatusText: pricingResponse.statusText,
        },
        rawResponse: rawResponseData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error capturing raw ShipEntegra response:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "Failed to capture raw ShipEntegra response",
      });
    }
  });

  // UK pricing debug test endpoint
  app.post("/api/test/uk-pricing-debug", async (req, res) => {
    try {
      console.log(
        "🇬🇧 UK PRICING DEBUG: Starting comprehensive UK pricing test...",
      );

      // Import the pricing service
      const moogshipPricing = await import("./services/moogship-pricing.js");

      // Test full MoogShip pricing which will trigger detailed ShipEntegra logging
      console.log(
        "🇬🇧 UK PRICING DEBUG: Testing UK pricing with enhanced debugging...",
      );
      const result = await moogshipPricing.calculateMoogShipPricing(
        25, // length
        20, // width
        5, // height
        0.2, // weight
        "GB", // UK country
      );

      console.log(
        "🇬🇧 UK PRICING DEBUG: Final result:",
        JSON.stringify(result, null, 2),
      );

      res.json({
        success: true,
        message: "UK pricing debug test completed with enhanced logging",
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ UK PRICING DEBUG error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: "UK pricing debug test failed",
      });
    }
  });

  // =========== Test Email Endpoint ===========

  // Test delivery issue email (no auth required for testing)
  app.post("/api/test-delivery-email", async (req, res) => {
    try {
      console.log("🧪 Testing delivery issue email notification");

      // Test data for critical delay
      const testShipment = {
        id: 8,
        userId: 1,
        carrierTrackingNumber: "1ZF7W8060405205664",
        receiverCity: "Lancaster",
        receiverCountry: "US",
        status: "pre_transit",
        createdAt: new Date("2025-04-24"),
      };

      const testUser = {
        id: 1,
        name: "GOKHAN ULGER",
        email: "test@example.com",
        username: "gulger",
      };

      const daysSinceCreated = Math.floor(
        (Date.now() - new Date(testShipment.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const { sendDeliveryIssueNotification } = await import(
        "./notification-emails"
      );

      const result = await sendDeliveryIssueNotification(
        testShipment,
        testUser,
        "CRITICAL DELIVERY DELAY - IMMEDIATE ACTION REQUIRED",
        `🚨 URGENT: Shipment ${testShipment.id} has been in transit for ${daysSinceCreated} days without delivery. This is extremely abnormal and requires immediate investigation. Package may be lost and customer communication is critical.`,
      );

      if (result.success) {
        console.log("✅ Test delivery issue email sent successfully");
        res.json({
          success: true,
          message: "Test delivery issue email sent successfully",
          daysSinceCreated,
        });
      } else {
        console.error("❌ Test delivery issue email failed:", result.error);
        res.status(500).json({
          success: false,
          message: "Test delivery issue email failed",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error testing delivery issue email:", error);
      res.status(500).json({
        success: false,
        message: "Error testing delivery issue email",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test tracking exception notification email (no auth required for testing)
  app.post("/api/test-tracking-exception-email", async (req, res) => {
    try {
      console.log("🚨 Testing tracking exception notification system");

      const testShipment = {
        id: 9999,
        trackingNumber: "MOOG0009999",
        carrierTrackingNumber: "1Z5EY7350499999999",
        receiverName: "Test Customer",
        receiverCity: "New York",
        receiverCountry: "United States",
        serviceLevel: "Express",
        status: "in_transit",
      };

      const testUser = {
        id: 999,
        name: "Test User for Exception Alert",
        email: "test@example.com",
        username: "testuser",
      };

      // Test multiple exception types
      const exceptionTests = [
        {
          issueType: "International Shipment Release",
          description:
            "International shipment release - customs clearance required",
        },
        {
          issueType: "Shipment Delay",
          description: "Package delayed due to weather conditions",
        },
        {
          issueType: "Shipment Exception",
          description: "Exception: Unable to deliver - recipient not available",
        },
      ];

      const { sendTrackingExceptionNotification } = await import(
        "./notification-emails"
      );

      console.log("🚨 Running tracking exception notification tests...");

      for (const test of exceptionTests) {
        console.log(`Testing ${test.issueType} notification...`);
        await sendTrackingExceptionNotification(
          testShipment,
          testUser,
          test.issueType,
          test.description,
        );
      }

      console.log("✅ All tracking exception test emails sent successfully");
      res.json({
        success: true,
        message: "Tracking exception notification tests sent successfully!",
        recipients: [
          "info@moogship.com",
          "gulsah@moogship.com",
          "gokhan@moogco.com",
          "sercan@moogship.com",
        ],
        testsRun: exceptionTests.length,
      });
    } catch (error) {
      console.error("Error testing tracking exception emails:", error);
      res.status(500).json({
        success: false,
        message: "Error testing tracking exception emails",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test delivery notification email (sends to specified email address)
  app.post("/api/test-delivery-notification", async (req, res) => {
    try {
      console.log("📦 Testing delivery notification email system");

      // Test shipment data with comprehensive delivery information
      const testShipment = {
        id: 1234,
        trackingNumber: "MOOG001234",
        carrierTrackingNumber: "1Z5EY7350499001234",
        receiverName: "Gokhan Ulger",
        receiverCity: "Istanbul",
        receiverCountry: "Turkey",
        serviceLevel: "MoogShip UPS Express",
        status: "delivered",
        userId: 1,
        createdAt: new Date("2025-07-01"),
        updatedAt: new Date(),
      };

      // Test user data - will send to gokhan@moogco.com as requested
      const testUser = {
        id: 1,
        name: "Gokhan Ulger",
        email: "gokhan@moogco.com",
        username: "gulger",
      };

      console.log(
        `📦 Sending test delivery notification to: ${testUser.email}`,
      );

      const { sendDeliveryNotification } = await import(
        "./notification-emails"
      );

      const result = await sendDeliveryNotification(testShipment, testUser);

      if (result.success) {
        console.log("✅ Test delivery notification email sent successfully");
        res.json({
          success: true,
          message: "Test delivery notification email sent successfully",
          recipient: testUser.email,
          shipmentId: testShipment.id,
          trackingNumber: testShipment.trackingNumber,
          carrierTracking: testShipment.carrierTrackingNumber,
        });
      } else {
        console.error(
          "❌ Test delivery notification email failed:",
          result.error,
        );
        res.status(500).json({
          success: false,
          message: "Test delivery notification email failed",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error testing delivery notification email:", error);
      res.status(500).json({
        success: false,
        message: "Error testing delivery notification email",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Test tracking notification email endpoint (no auth required for testing)
  app.post("/api/test-tracking-notification", async (req, res) => {
    try {
      const { shipmentId, recipientEmail } = req.body;

      if (!shipmentId) {
        return res.status(400).json({
          success: false,
          message: "shipmentId is required"
        });
      }

      console.log(`📧 Testing tracking notification email for shipment ${shipmentId} to ${recipientEmail || 'shipment owner'}`);

      // Get the shipment
      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res.status(404).json({
          success: false,
          message: "Shipment not found"
        });
      }

      // Get the shipment owner
      const user = await storage.getUser(shipment.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Import the notification function
      const { sendTrackingNumberNotification } = await import('./notification-emails');

      // If custom recipient provided, temporarily override user email
      let targetUser = user;
      if (recipientEmail) {
        targetUser = { ...user, email: recipientEmail };
      }

      // Send the tracking notification
      const result = await sendTrackingNumberNotification(shipment, targetUser);

      if (result.success) {
        console.log("✅ Test tracking notification email sent successfully");
        res.json({
          success: true,
          message: "Test tracking notification email sent successfully",
          recipient: targetUser.email,
          shipmentId: shipment.id,
          trackingNumber: shipment.trackingNumber,
          carrierTracking: shipment.carrierTrackingNumber,
        });
      } else {
        console.error("❌ Test tracking notification email failed:", result.error);
        res.status(500).json({
          success: false,
          message: "Test tracking notification email failed",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error testing tracking notification email:", error);
      res.status(500).json({
        success: false,
        message: "Error testing tracking notification email",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // =========== Admin Tracking Sync Endpoints ===========

  // Admin manual tracking sync endpoint
  app.post(
    "/api/admin/manual-tracking-sync",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        console.log("🔄 Admin triggered manual tracking sync");
        const { syncAllTrackingData } = await import(
          "./services/trackingScheduler"
        );

        // Run tracking sync in background but respond immediately
        syncAllTrackingData().catch((error) => {
          console.error("Background tracking sync failed:", error);
        });

        res.json({
          success: true,
          message: "Manual tracking sync initiated - processing in background",
        });
      } catch (error) {
        console.error("Error in manual tracking sync:", error);
        res.status(500).json({
          success: false,
          message: "Manual tracking sync failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Admin tracking sync endpoint (alternative route)
  app.post(
    "/api/admin/tracking-sync",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        console.log("🔄 Admin triggered tracking sync");
        const { syncAllTrackingData } = await import(
          "./services/trackingScheduler"
        );

        // Run tracking sync in background but respond immediately
        syncAllTrackingData().catch((error) => {
          console.error("Background tracking sync failed:", error);
        });

        res.json({
          success: true,
          message: "Tracking sync initiated - processing in background",
        });
      } catch (error) {
        console.error("Error in tracking sync:", error);
        res.status(500).json({
          success: false,
          message: "Tracking sync failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Admin manual batch processing endpoint for consolidated tracking emails
  app.post(
    "/api/admin/process-tracking-batches",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        console.log("📧 Admin triggered manual tracking batch processing");
        const { processPendingTrackingNotifications } = await import(
          "./services/trackingScheduler"
        );

        // Run batch processing and wait for completion to return results
        await processPendingTrackingNotifications();

        res.json({
          success: true,
          message: "Tracking batch processing completed successfully",
        });
      } catch (error) {
        console.error("Error in tracking batch processing:", error);
        res.status(500).json({
          success: false,
          message: "Failed to process tracking batches",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // =========== Fast Tracking Notification System ===========

  // Get fast tracking notifications for admin
  app.get(
    "/api/admin/fast-tracking-notifications",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const limit = parseInt(req.query.limit as string) || 50;
        const notifications = await storage.getFastTrackingNotifications(limit);
        res.json(notifications);
      } catch (error) {
        console.error("Error fetching fast tracking notifications:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch notifications",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Mark notification as read
  app.put(
    "/api/admin/fast-tracking-notifications/:id/read",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const notificationId = parseInt(req.params.id);
        if (isNaN(notificationId)) {
          return res.status(400).json({ message: "Invalid notification ID" });
        }

        const notification = await storage.markFastTrackingNotificationAsRead(
          notificationId,
          req.user!.id,
        );
        if (!notification) {
          return res.status(404).json({ message: "Notification not found" });
        }

        res.json(notification);
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
          success: false,
          message: "Failed to mark notification as read",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Mark all notifications as read
  app.put(
    "/api/admin/fast-tracking-notifications/read-all",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const updatedCount =
          await storage.markAllFastTrackingNotificationsAsRead(req.user!.id);
        res.json({
          success: true,
          message: `Marked ${updatedCount} notifications as read`,
          updatedCount,
        });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
          success: false,
          message: "Failed to mark all notifications as read",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Create fast tracking notification (called from existing fast tracking endpoint)
  app.post(
    "/api/admin/fast-tracking-notifications",
    authenticateToken,
    async (req, res) => {
      try {
        const { shipmentId, destinationCountry, destinationCity } = req.body;

        if (!shipmentId) {
          return res.status(400).json({ message: "Shipment ID is required" });
        }

        // Get user info
        const user = req.user!;

        const notificationData = {
          shipmentId,
          userId: user.id,
          userName: user.name || user.username,
          userEmail: user.email,
          destinationCountry,
          destinationCity,
          requestedAt: new Date(),
        };

        const notification =
          await storage.createFastTrackingNotification(notificationData);
        res.status(201).json(notification);
      } catch (error) {
        console.error("Error creating fast tracking notification:", error);
        res.status(500).json({
          success: false,
          message: "Failed to create notification",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // =========== Support Ticket System ===========

  // Create a new support ticket (all authenticated users)
  app.post("/api/support-tickets", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;

      console.log("Support ticket request body:", req.body);

      // Create a modified schema without userId requirement
      const ticketFormSchema = z.object({
        subject: z.string().min(5, "Subject must be at least 5 characters"),
        description: z
          .string()
          .min(10, "Description must be at least 10 characters"),
        category: z.string(),
        priority: z.string(),
        relatedShipmentId: z.number().optional(),
        attachments: z.array(z.object({
          fileUrl: z.string(),
          originalFileName: z.string(),
          fileName: z.string(),
          fileSize: z.number(),
          mimeType: z.string(),
          fileType: z.string(),
        })).optional().default([]),
      });

      // Validate with our simplified schema
      const validatedForm = ticketFormSchema.safeParse(req.body);

      if (!validatedForm.success) {
        console.error(
          "Support ticket validation error:",
          validatedForm.error.format(),
        );
        return res.status(400).json({
          message: "Invalid ticket data",
          errors: validatedForm.error.format(),
        });
      }

      // Combine validated data with userId
      const ticketData = {
        ...validatedForm.data,
        userId, // Add the userId from the authenticated user
      };

      console.log("Support ticket data with userId:", ticketData);

      // Create the ticket - we don't need to pass userId twice,
      // it's already in ticketData
      const ticket = await storage.createSupportTicket(ticketData);

      // Process attachments if provided
      if (validatedForm.data.attachments && validatedForm.data.attachments.length > 0) {
        try {
          const objectStorageService = new ObjectStorageService();
          
          for (const attachment of validatedForm.data.attachments) {
            // Extract object path from URL
            const objectPath = attachment.fileUrl.split('/').pop();
            if (!objectPath) {
              console.error('Could not extract object path from URL:', attachment.fileUrl);
              continue;
            }
            
            // Set ACL to allow ticket owner access
            const objectFile = await objectStorageService.getObjectEntityFile(`/objects/uploads/${objectPath}`);
            await setObjectAclPolicy(objectFile, {
              owner: userId.toString(),
              visibility: "private",
              aclRules: []
            });

            // Create attachment record in database
            const attachmentData = {
              ticketId: ticket.id,
              responseId: null, // null for ticket-level attachments
              userId: userId, // Changed from uploadedBy to userId to match schema
              isAdminUpload: false, // Add missing required field
              originalFileName: attachment.originalFileName,
              fileName: attachment.fileName,
              filePath: `/objects/uploads/${objectPath}`,
              fileSize: attachment.fileSize,
              mimeType: attachment.mimeType,
              fileType: attachment.fileType as 'image' | 'document',
            };

            console.log('💾 Saving attachment to database:', attachmentData);
            const savedAttachment = await storage.addTicketAttachment(attachmentData);
            console.log('✅ Attachment saved successfully:', savedAttachment.id);
          }
          
          console.log(`✅ Processed ${validatedForm.data.attachments.length} attachments for ticket #${ticket.id}`);
        } catch (attachmentError) {
          console.error(`❌ Failed to process attachments for ticket #${ticket.id}:`, attachmentError);
          // Don't fail the request if attachment processing fails
        }
      }

      // Get user information for email notification
      const user = await storage.getUser(userId);

      if (user && ticket) {
        // Send email notification (non-blocking)
        try {
          await sendTicketCreatedNotification({
            ticketId: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority,
            category: ticket.category,
            status: ticket.status,
            userName: user.name,
            userEmail: user.email,
            createdAt: ticket.createdAt,
          });
          console.log(`✅ Email notifications sent for ticket #${ticket.id}`);
        } catch (emailError) {
          console.error(
            `❌ Failed to send email notifications for ticket #${ticket.id}:`,
            emailError,
          );
          // Don't fail the request if email fails
        }
      }

      res.status(201).json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      res.status(500).json({ message: "Error creating support ticket" });
    }
  });

  // Create a new support ticket for a user (admin only)
  app.post(
    "/api/support-tickets/admin/create",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        console.log("Admin creating support ticket request body:", req.body);

        // Schema for admin ticket creation - includes userId
        const adminTicketFormSchema = z.object({
          userId: z.number().min(1, "User ID is required"),
          subject: z.string().min(5, "Subject must be at least 5 characters"),
          description: z
            .string()
            .min(10, "Description must be at least 10 characters"),
          category: z.string(),
          priority: z.string(),
          relatedShipmentId: z.number().optional(),
        });

        // Validate the admin ticket data
        const validatedForm = adminTicketFormSchema.safeParse(req.body);

        if (!validatedForm.success) {
          console.error(
            "Admin support ticket validation error:",
            validatedForm.error.format(),
          );
          return res.status(400).json({
            message: "Invalid ticket data",
            errors: validatedForm.error.format(),
          });
        }

        console.log("Admin support ticket data:", validatedForm.data);

        // Create the ticket with the specified user ID
        const ticket = await storage.createSupportTicket(validatedForm.data);

        // Get user information for email notification
        const user = await storage.getUser(validatedForm.data.userId);
        const adminUser = req.user as any;

        if (user && ticket) {
          // Send email notification (non-blocking)
          try {
            await sendTicketCreatedNotification({
              ticketId: ticket.id,
              subject: ticket.subject,
              description: ticket.description,
              priority: ticket.priority,
              category: ticket.category,
              status: ticket.status,
              userName: user.name,
              userEmail: user.email,
              adminName: adminUser.name,
              createdAt: ticket.createdAt,
            });
            console.log(
              `✅ Admin-created ticket #${ticket.id} email notifications sent`,
            );
          } catch (emailError) {
            console.error(
              `❌ Failed to send email notifications for admin-created ticket #${ticket.id}:`,
              emailError,
            );
            // Don't fail the request if email fails
          }
        }

        res.status(201).json(ticket);
      } catch (error) {
        console.error("Error creating admin support ticket:", error);
        res.status(500).json({ message: "Error creating support ticket" });
      }
    },
  );

  // Get a specific support ticket (owner or admin only)
  app.get("/api/support-tickets/:id", authenticateToken, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) {
        return res.status(400).json({ message: "Invalid ticket ID" });
      }

      const ticket = await storage.getSupportTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Check if user is owner or admin
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get responses for this ticket
      const responses = await storage.getTicketResponses(ticketId);
      
      // Get ticket-level attachments
      const ticketAttachments = await storage.getTicketAttachments(ticketId);

      res.json({ ticket, responses, ticketAttachments });
    } catch (error) {
      console.error("Error retrieving support ticket:", error);
      res.status(500).json({ message: "Error retrieving support ticket" });
    }
  });

  // Get current user's support tickets
  app.get("/api/support-tickets", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tickets = await storage.getUserSupportTickets(userId);
      res.json(tickets);
    } catch (error) {
      console.error("Error retrieving user support tickets:", error);
      res.status(500).json({ message: "Error retrieving support tickets" });
    }
  });

  // Get all users for admin to select from when creating tickets
  app.get(
    "/api/users/admin/all",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const users = await storage.getAllUsers();
        // Return only necessary fields for security
        const sanitizedUsers = users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          companyName: user.companyName,
        }));
        res.json(sanitizedUsers);
      } catch (error) {
        console.error("Error retrieving users:", error);
        res.status(500).json({ message: "Error retrieving users" });
      }
    },
  );

  // Get all support tickets (admin only)
  app.get(
    "/api/support-tickets/admin/all",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const tickets = await storage.getAllSupportTickets();
        res.json(tickets);
      } catch (error) {
        console.error("Error retrieving all support tickets:", error);
        res.status(500).json({ message: "Error retrieving support tickets" });
      }
    },
  );

  // Delete multiple support tickets (admin only)
  app.delete(
    "/api/support-tickets/bulk",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { ticketIds } = req.body;
        
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
          return res.status(400).json({ 
            message: "Invalid request body. Expected array of ticket IDs." 
          });
        }

        // Validate all IDs are numbers
        const invalidIds = ticketIds.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidIds.length > 0) {
          return res.status(400).json({ 
            message: `Invalid ticket IDs: ${invalidIds.join(', ')}` 
          });
        }

        const deletedCount = await storage.deleteSupportTickets(ticketIds);
        
        res.json({ 
          message: `Successfully deleted ${deletedCount} out of ${ticketIds.length} tickets`,
          deletedCount,
          requestedCount: ticketIds.length,
          deletedTicketIds: ticketIds.slice(0, deletedCount)
        });
      } catch (error) {
        console.error("Error bulk deleting support tickets:", error);
        res.status(500).json({ message: "Error deleting support tickets" });
      }
    },
  );

  // Update multiple support tickets status (admin only)
  app.patch(
    "/api/support-tickets/bulk-status",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { ticketIds, status, closureReason } = req.body;
        
        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
          return res.status(400).json({ 
            message: "Invalid request body. Expected array of ticket IDs." 
          });
        }

        // Validate all IDs are numbers
        const invalidIds = ticketIds.filter(id => !Number.isInteger(id) || id <= 0);
        if (invalidIds.length > 0) {
          return res.status(400).json({ 
            message: `Invalid ticket IDs: ${invalidIds.join(', ')}` 
          });
        }

        // Validate status using shared enum
        const validStatuses = Object.values(TicketStatus);
        if (!status || !validStatuses.includes(status)) {
          return res.status(400).json({ 
            message: `Invalid status. Expected one of: ${validStatuses.join(', ')}` 
          });
        }

        // Validate closure reason for closed status
        if (status === TicketStatus.CLOSED && (!closureReason || closureReason.trim().length === 0)) {
          return res.status(400).json({ 
            message: "Closure reason is required when closing tickets" 
          });
        }

        const adminId = (req as any).user.id;
        const updatedCount = await storage.updateTicketsStatus(
          ticketIds, 
          status, 
          adminId, 
          closureReason
        );
        
        res.json({ 
          message: `Successfully updated ${updatedCount} out of ${ticketIds.length} tickets to ${status}`,
          updatedCount,
          requestedCount: ticketIds.length,
          newStatus: status,
          updatedTicketIds: ticketIds.slice(0, updatedCount)
        });
      } catch (error) {
        console.error("Error bulk updating support ticket status:", error);
        res.status(500).json({ message: "Error updating support tickets status" });
      }
    },
  );

  // Delete a single support ticket (admin only)
  app.delete(
    "/api/support-tickets/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        const success = await storage.deleteSupportTicket(ticketId);
        
        if (success) {
          res.json({ 
            message: "Ticket deleted successfully",
            deletedTicketId: ticketId 
          });
        } else {
          res.status(404).json({ message: "Ticket not found" });
        }
      } catch (error) {
        console.error("Error deleting support ticket:", error);
        res.status(500).json({ message: "Error deleting support ticket" });
      }
    },
  );

  // Get open support tickets (admin only)
  app.get(
    "/api/support-tickets/admin/open",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const tickets = await storage.getOpenSupportTickets();
        res.json(tickets);
      } catch (error) {
        console.error("Error retrieving open support tickets:", error);
        res
          .status(500)
          .json({ message: "Error retrieving open support tickets" });
      }
    },
  );

  // Update a support ticket (admin only)
  app.put(
    "/api/support-tickets/:id",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        const ticket = await storage.updateSupportTicket(ticketId, req.body);

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Get full ticket info with user data for email notification
        const fullTicket = await storage.getSupportTicket(ticketId);
        const adminUser = req.user as any;

        if (fullTicket) {
          // Send update notification (non-blocking) - only for status changes
          try {
            const updateType = req.body.status ? "status_change" : "general";
            await sendTicketUpdatedNotification(
              {
                ticketId: fullTicket.id,
                subject: fullTicket.subject,
                description: fullTicket.description,
                priority: fullTicket.priority,
                category: fullTicket.category,
                status: fullTicket.status,
                userName: fullTicket.userName || "",
                userEmail: fullTicket.userEmail || "",
                assignedToName: fullTicket.assignedTo
                  ? adminUser.name
                  : undefined,
                assignedToEmail: fullTicket.assignedTo
                  ? adminUser.email
                  : undefined,
                createdAt: fullTicket.createdAt,
              },
              updateType,
            );
            console.log(
              `✅ Update notification sent for ticket #${ticketId} (${updateType})`,
            );
          } catch (emailError) {
            console.error(
              `❌ Failed to send update notification for ticket #${ticketId}:`,
              emailError,
            );
            // Don't fail the request if email fails
          }
        }

        res.json(ticket);
      } catch (error) {
        console.error("Error updating support ticket:", error);
        res.status(500).json({ message: "Error updating support ticket" });
      }
    },
  );

  // Assign a support ticket to an admin (admin only)
  app.post(
    "/api/support-tickets/:id/assign",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        const adminId = req.user!.id;
        const ticket = await storage.assignSupportTicket(ticketId, adminId);

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Get full ticket info with user data for email notification
        const fullTicket = await storage.getSupportTicket(ticketId);
        const adminUser = req.user as any;

        if (fullTicket) {
          // Send assignment notification (non-blocking)
          try {
            await sendTicketUpdatedNotification(
              {
                ticketId: fullTicket.id,
                subject: fullTicket.subject,
                description: fullTicket.description,
                priority: fullTicket.priority,
                category: fullTicket.category,
                status: fullTicket.status,
                userName: fullTicket.userName || "",
                userEmail: fullTicket.userEmail || "",
                assignedToName: adminUser.name,
                assignedToEmail: adminUser.email,
                createdAt: fullTicket.createdAt,
              },
              "assignment",
            );
            console.log(
              `✅ Assignment notification sent for ticket #${ticketId}`,
            );
          } catch (emailError) {
            console.error(
              `❌ Failed to send assignment notification for ticket #${ticketId}:`,
              emailError,
            );
            // Don't fail the request if email fails
          }
        }

        res.json(ticket);
      } catch (error) {
        console.error("Error assigning support ticket:", error);
        res.status(500).json({ message: "Error assigning support ticket" });
      }
    },
  );

  // Close a support ticket (admin only)
  app.post(
    "/api/support-tickets/:id/close",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        const adminId = req.user!.id;
        const { reason } = req.body;

        if (!reason) {
          return res
            .status(400)
            .json({ message: "Closure reason is required" });
        }

        const ticket = await storage.closeSupportTicket(
          ticketId,
          adminId,
          reason,
        );

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Get full ticket info with user data for email notification
        const fullTicket = await storage.getSupportTicket(ticketId);
        const adminUser = req.user as any;

        if (fullTicket) {
          // Send closure notification (non-blocking)
          try {
            await sendTicketClosedNotification(
              {
                ticketId: fullTicket.id,
                subject: fullTicket.subject,
                description: fullTicket.description,
                priority: fullTicket.priority,
                category: fullTicket.category,
                status: fullTicket.status,
                userName: fullTicket.userName || "",
                userEmail: fullTicket.userEmail || "",
                assignedToName: adminUser.name,
                assignedToEmail: adminUser.email,
                createdAt: fullTicket.createdAt,
              },
              reason,
            );
            console.log(`✅ Closure notification sent for ticket #${ticketId}`);
          } catch (emailError) {
            console.error(
              `❌ Failed to send closure notification for ticket #${ticketId}:`,
              emailError,
            );
            // Don't fail the request if email fails
          }
        }

        res.json(ticket);
      } catch (error) {
        console.error("Error closing support ticket:", error);
        res.status(500).json({ message: "Error closing support ticket" });
      }
    },
  );

  // Get responses for a ticket
  app.get(
    "/api/support-tickets/:id/responses",
    authenticateToken,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        // Get ticket to check permissions
        const ticket = await storage.getSupportTicket(ticketId);

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Check if user is owner or admin
        if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }

        // Get responses
        const responses = await storage.getTicketResponses(ticketId);
        
        // Get attachments for each response
        const responsesWithAttachments = await Promise.all(
          responses.map(async (response) => {
            const attachments = await storage.getResponseAttachments(response.id);
            return {
              ...response,
              attachments
            };
          })
        );

        res.json(responsesWithAttachments);
      } catch (error) {
        console.error("Error retrieving ticket responses:", error);
        res.status(500).json({ message: "Error retrieving ticket responses" });
      }
    },
  );

  // Update ticket status (admin only)
  app.patch(
    "/api/support-tickets/:id/status",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        const { status, message } = req.body;

        if (!status) {
          return res.status(400).json({ message: "Status is required" });
        }

        // If status is 'closed', require a closure reason
        if (status === TicketStatus.CLOSED && !message) {
          return res
            .status(400)
            .json({
              message: "Closure reason is required when closing a ticket",
            });
        }

        // Get the ticket
        const ticket = await storage.getSupportTicket(ticketId);

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Update ticket status
        const updateData: any = { status };

        // If closing, add closure details
        if (status === TicketStatus.CLOSED) {
          updateData.closedBy = req.user!.id;
          updateData.closedAt = new Date();
          updateData.closureReason = message;
        }

        const updatedTicket = await storage.updateSupportTicket(
          ticketId,
          updateData,
        );

        if (!updatedTicket) {
          return res
            .status(500)
            .json({ message: "Failed to update ticket status" });
        }

        res.json(updatedTicket);
      } catch (error) {
        console.error("Error updating ticket status:", error);
        res.status(500).json({ message: "Error updating ticket status" });
      }
    },
  );

  // =========== Admin Task Management Routes ===========

  // Get all admin tasks with filtering and pagination (admin only)
  app.get("/api/admin/tasks", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { 
        q, 
        status, 
        priority, 
        type, 
        assigneeId, 
        reporterId, 
        page = 1, 
        limit = 50 
      } = req.query;

      const filters: any = {};
      
      if (q) filters.q = q as string;
      if (status) filters.status = status as TaskStatus;
      if (priority) filters.priority = priority as TaskPriority;
      if (type) filters.type = type as TaskType;
      if (assigneeId) filters.assigneeId = parseInt(assigneeId as string);
      if (reporterId) filters.reporterId = parseInt(reporterId as string);
      if (page) filters.page = parseInt(page as string);
      if (limit) filters.limit = Math.min(parseInt(limit as string), 100); // Cap at 100

      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Error retrieving admin tasks:", error);
      res.status(500).json({ message: "Error retrieving tasks" });
    }
  });

  // Create a new admin task (admin only)
  app.post("/api/admin/tasks", authenticateToken, isAdmin, async (req, res) => {
    try {
      // Create task schema with validation
      const taskSchema = insertTaskSchema.extend({
        title: z.string().min(3, "Title must be at least 3 characters"),
        description: z.string().min(10, "Description must be at least 10 characters"),
        type: z.enum([TaskType.FEATURE, TaskType.TASK, TaskType.BUG, TaskType.IMPROVEMENT]),
        priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT]),
        assigneeId: z.number().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
      });

      const validatedData = taskSchema.safeParse(req.body);

      if (!validatedData.success) {
        console.error("Admin task validation error:", validatedData.error.format());
        return res.status(400).json({
          message: "Invalid task data",
          errors: validatedData.error.format(),
        });
      }

      const reporterId = (req as any).user.id;
      const task = await storage.createTask(validatedData.data, reporterId);

      console.log(`✅ Admin task created: #${task.id} - ${task.title}`);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating admin task:", error);
      res.status(500).json({ message: "Error creating task" });
    }
  });

  // Bulk delete admin tasks (admin only) - MUST come before /:id routes
  app.delete("/api/admin/tasks/bulk", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { taskIds } = req.body;

      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ 
          message: "Invalid request body. Expected array of task IDs." 
        });
      }

      // Validate all IDs are numbers
      const invalidIds = taskIds.filter(id => !Number.isInteger(id) || id <= 0);
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          message: `Invalid task IDs: ${invalidIds.join(', ')}` 
        });
      }

      const deletedCount = await storage.deleteTasks(taskIds);
      
      res.json({ 
        message: `Successfully deleted ${deletedCount} out of ${taskIds.length} tasks`,
        deletedCount,
        requestedCount: taskIds.length,
        deletedTaskIds: taskIds.slice(0, deletedCount)
      });
    } catch (error) {
      console.error("Error bulk deleting admin tasks:", error);
      res.status(500).json({ message: "Error deleting tasks" });
    }
  });

  // Bulk update admin task status (admin only) - MUST come before /:id routes  
  app.patch("/api/admin/tasks/bulk-status", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { taskIds, status } = req.body;
      
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return res.status(400).json({ 
          message: "Invalid request body. Expected array of task IDs." 
        });
      }

      // Validate all IDs are numbers
      const invalidIds = taskIds.filter(id => !Number.isInteger(id) || id <= 0);
      if (invalidIds.length > 0) {
        return res.status(400).json({ 
          message: `Invalid task IDs: ${invalidIds.join(', ')}` 
        });
      }

      // Validate status using shared enum
      const validStatuses = Object.values(TaskStatus);
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Expected one of: ${validStatuses.join(', ')}` 
        });
      }

      const adminId = (req as any).user.id;
      const updatedCount = await storage.updateTasksStatus(taskIds, status, adminId);
      
      res.json({ 
        message: `Successfully updated ${updatedCount} out of ${taskIds.length} tasks to ${status}`,
        updatedCount,
        requestedCount: taskIds.length,
        newStatus: status,
        updatedTaskIds: taskIds.slice(0, updatedCount)
      });
    } catch (error) {
      console.error("Error bulk updating admin task status:", error);
      res.status(500).json({ message: "Error updating tasks status" });
    }
  });

  // Get a specific admin task (admin only)
  app.get("/api/admin/tasks/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const task = await storage.getTask(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error retrieving admin task:", error);
      res.status(500).json({ message: "Error retrieving task" });
    }
  });

  // Update an admin task (admin only)
  app.patch("/api/admin/tasks/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      // Create update schema
      const updateSchema = z.object({
        title: z.string().min(3, "Title must be at least 3 characters").optional(),
        description: z.string().min(10, "Description must be at least 10 characters").optional(),
        status: z.enum([TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED, TaskStatus.DONE, TaskStatus.CANCELLED]).optional(),
        priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH, TaskPriority.URGENT]).optional(),
        type: z.enum([TaskType.FEATURE, TaskType.TASK, TaskType.BUG, TaskType.IMPROVEMENT]).optional(),
        assigneeId: z.number().nullable().optional(),
        tags: z.array(z.string()).optional(),
        dueDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
        completedBy: z.number().optional(),
      });

      const validatedData = updateSchema.safeParse(req.body);

      if (!validatedData.success) {
        console.error("Admin task update validation error:", validatedData.error.format());
        return res.status(400).json({
          message: "Invalid task data",
          errors: validatedData.error.format(),
        });
      }

      // If marking as complete, set completedBy to current admin
      if (validatedData.data.status === TaskStatus.DONE) {
        validatedData.data.completedBy = (req as any).user.id;
      }

      const task = await storage.updateTask(taskId, validatedData.data);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      console.log(`✅ Admin task updated: #${task.id} - ${task.title}`);
      res.json(task);
    } catch (error) {
      console.error("Error updating admin task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });

  // Delete a single admin task (admin only)
  app.delete("/api/admin/tasks/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      if (isNaN(taskId)) {
        return res.status(400).json({ message: "Invalid task ID" });
      }

      const success = await storage.deleteTask(taskId);
      
      if (success) {
        res.json({ 
          message: "Task deleted successfully",
          deletedTaskId: taskId 
        });
      } else {
        res.status(404).json({ message: "Task not found" });
      }
    } catch (error) {
      console.error("Error deleting admin task:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // =========== Object Storage Routes ===========
  
  // Get presigned upload URL for ticket attachments (authenticated users only)
  app.post("/api/objects/upload", authenticateToken, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private objects with ACL checks (authenticated users only)
  // Support both /objects and /api/objects paths for compatibility
  app.get(["/objects/:objectPath(*)", "/api/objects/:objectPath(*)"], authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id.toString();
      const objectStorageService = new ObjectStorageService();
      
      // Extract just the path after /objects/ for getObjectEntityFile
      const objectPath = req.params.objectPath || req.path.replace('/objects/', '');
      console.log("Download request - objectPath:", objectPath, "userId:", userId);
      
      const objectFile = await objectStorageService.getObjectEntityFile(
        `/objects/${objectPath}`,
      );
      
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        userRole: req.user!.role,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        console.log("Access denied for user", userId, "to object", objectPath);
        return res.sendStatus(401);
      }
      
      console.log("Downloading object:", objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Add a response to a ticket (with optional attachments)
  app.post(
    "/api/support-tickets/:id/responses",
    authenticateToken,
    async (req, res) => {
      try {
        const ticketId = parseInt(req.params.id);
        if (isNaN(ticketId)) {
          return res.status(400).json({ message: "Invalid ticket ID" });
        }

        console.log("Ticket response request body:", req.body);

        // Get ticket to check permissions
        const ticket = await storage.getSupportTicket(ticketId);

        if (!ticket) {
          return res.status(404).json({ message: "Ticket not found" });
        }

        // Check if user is owner or admin
        if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }

        // Validate response data
        const validatedData = insertTicketResponseSchema.safeParse({
          ...req.body,
          ticketId,
          userId: req.user!.id,
        });

        if (!validatedData.success) {
          return res.status(400).json({
            message: "Invalid response data",
            errors: validatedData.error.format(),
          });
        }

        // Create response
        const response = await storage.addTicketResponse(validatedData.data);

        // Handle attachments if provided
        if (req.body.attachments && Array.isArray(req.body.attachments)) {
          const objectStorageService = new ObjectStorageService();
          
          for (const attachment of req.body.attachments) {
            try {
              // Validate attachment metadata using Zod schema
              const validatedAttachment = fileAttachmentSchema.parse(attachment);
              
              // Validate MIME type is allowed
              if (!ALLOWED_MIME_TYPES.includes(validatedAttachment.mimeType)) {
                throw new Error(`Unsupported file type: ${validatedAttachment.mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`);
              }
              
              // Validate file type matches MIME type category
              const isImageMime = ALLOWED_IMAGE_MIME_TYPES.includes(validatedAttachment.mimeType);
              const isDocumentMime = ALLOWED_DOCUMENT_MIME_TYPES.includes(validatedAttachment.mimeType);
              
              if (validatedAttachment.fileType === "image" && !isImageMime) {
                throw new Error(`File type 'image' does not match MIME type: ${validatedAttachment.mimeType}`);
              }
              if (validatedAttachment.fileType === "document" && !isDocumentMime) {
                throw new Error(`File type 'document' does not match MIME type: ${validatedAttachment.mimeType}`);
              }

              // Set ACL policy and get normalized path
              const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
                validatedAttachment.fileUrl,
                {
                  owner: req.user!.id.toString(),
                  visibility: "private", // Private visibility for ticket attachments
                  aclRules: [] // Owner-only access initially
                }
              );

              // Fetch authoritative metadata from GCS to verify client data
              const objectFile = await objectStorageService.getObjectEntityFile(normalizedPath);
              const [metadata] = await objectFile.getMetadata();
              
              // Validate against authoritative GCS metadata
              const actualFileSize = parseInt(metadata.size || "0");
              const actualMimeType = metadata.contentType || "application/octet-stream";
              
              if (actualFileSize !== validatedAttachment.fileSize) {
                throw new Error(`File size mismatch: client reported ${validatedAttachment.fileSize}, actual ${actualFileSize}`);
              }
              
              // Use improved MIME type compatibility check
              if (!areMimeTypesCompatible(validatedAttachment.mimeType, actualMimeType)) {
                throw new Error(
                  `MIME type mismatch: client reported '${validatedAttachment.mimeType}', ` +
                  `GCS metadata shows '${actualMimeType}'. This may indicate the Content-Type ` +
                  `header was not properly set during upload.`
                );
              }
              
              if (actualFileSize > MAX_FILE_SIZE) {
                throw new Error(`File size ${actualFileSize} exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`);
              }

              // Use the more reliable MIME type (prefer client type if GCS defaulted)
              const finalMimeType = actualMimeType === 'application/octet-stream' ? 
                normalizeMimeType(validatedAttachment.mimeType) : 
                normalizeMimeType(actualMimeType);
              
              // Security validation: Ensure final MIME type is in allowed list
              if (!ALLOWED_MIME_TYPES.includes(finalMimeType)) {
                throw new Error(
                  `Final MIME type '${finalMimeType}' is not in the allowed list. ` +
                  `This prevents security bypass through MIME type spoofing.`
                );
              }
              
              // Save attachment metadata to database with validated data
              await storage.addTicketAttachment({
                ticketId,
                responseId: response.id,
                userId: req.user!.id,
                isAdminUpload: req.user!.role === "admin",
                originalFileName: validatedAttachment.originalFileName,
                fileName: validatedAttachment.fileName,
                filePath: normalizedPath,
                fileSize: actualFileSize, // Use authoritative size from GCS
                mimeType: finalMimeType, // Use the most reliable MIME type
                fileType: validatedAttachment.fileType
              });
            } catch (error) {
              console.error(`Failed to process attachment: ${attachment.originalFileName}`, error);
              // Continue processing other attachments even if one fails
            }
          }
        }


        // If admin response, update ticket status if specified
        if (req.user!.role === "admin" && req.body.updateStatus) {
          await storage.updateSupportTicket(ticketId, {
            status: req.body.updateStatus,
          });
        } else if (req.user!.role !== "admin") {
          // If customer response and status is "waiting_on_customer",
          // change it back to "in_progress"
          if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER) {
            await storage.updateSupportTicket(ticketId, {
              status: TicketStatus.IN_PROGRESS,
            });
          }
        }

        // Send email notifications for new response (non-blocking)
        try {
          const currentUser = req.user as any;
          const isAdminResponse = req.user!.role === "admin";

          // Prepare email data
          const emailData = {
            ticketId: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            priority: ticket.priority,
            category: ticket.category,
            status: ticket.status,
            userName: ticket.userName || "",
            userEmail: ticket.userEmail || "",
            assignedToName: ticket.assignedTo ? currentUser.name : undefined,
            assignedToEmail: ticket.assignedTo ? currentUser.email : undefined,
            createdAt: ticket.createdAt,
            responseMessage: validatedData.data.message,
            responseAuthor: currentUser.name,
            responseAuthorRole: currentUser.role,
          };

          if (isAdminResponse) {
            // Admin responding to customer - notify customer and other admins
            await Promise.all([
              // Notify customer
              sendTicketResponseNotification(emailData, "admin_to_customer"),
              // Notify all admins about the response
              sendTicketResponseNotification(
                emailData,
                "admin_response_internal",
              ),
            ]);
            console.log(
              `✅ Admin response email notifications sent for ticket #${ticketId}`,
            );
          } else {
            // Customer responding - notify all admins
            await sendTicketResponseNotification(
              emailData,
              "customer_to_admin",
            );
            console.log(
              `✅ Customer response email notifications sent for ticket #${ticketId}`,
            );
          }
        } catch (emailError) {
          console.error(
            `❌ Failed to send response notifications for ticket #${ticketId}:`,
            emailError,
          );
          // Don't fail the request if email fails
        }

        res.status(201).json(response);
      } catch (error) {
        console.error("Error adding ticket response:", error);
        res.status(500).json({ message: "Error adding ticket response" });
      }
    },
  );

  // Package templates routes
  // Get all package templates for the authenticated user
  app.get("/api/package-templates", authenticateToken, async (req, res) => {
    try {
      const templates = await storage.getUserPackageTemplates(req.user.id);
      res.json(templates);
    } catch (error) {
      console.error("Error getting package templates:", error);
      res.status(500).json({ message: "Error retrieving package templates" });
    }
  });

  // Get a specific template by ID
  app.get("/api/package-templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const template = await storage.getPackageTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Ensure user can only access their own templates
      if (template.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(template);
    } catch (error) {
      console.error("Error getting package template:", error);
      res.status(500).json({ message: "Error retrieving template" });
    }
  });

  // Create a new package template
  app.post("/api/package-templates", authenticateToken, async (req, res) => {
    try {
      const { name, description, weight, length, width, height, isDefault } =
        req.body;

      if (!name || !length || !width || !height) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const template = await storage.createPackageTemplate(req.user.id, {
        name,
        description: description || null,
        weight: weight || null,
        length,
        width,
        height,
        isDefault: isDefault || false,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating package template:", error);
      res.status(500).json({ message: "Error creating template" });
    }
  });

  // Update a package template
  app.put("/api/package-templates/:id", authenticateToken, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }

      const existingTemplate = await storage.getPackageTemplate(templateId);
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }

      // Ensure user can only update their own templates
      if (
        existingTemplate.userId !== req.user.id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, description, weight, length, width, height, isDefault } =
        req.body;

      const updatedTemplate = await storage.updatePackageTemplate(templateId, {
        name,
        description,
        weight,
        length,
        width,
        height,
        isDefault,
      });

      res.json(updatedTemplate);
    } catch (error) {
      console.error("Error updating package template:", error);
      res.status(500).json({ message: "Error updating template" });
    }
  });

  // Delete a package template
  app.delete(
    "/api/package-templates/:id",
    authenticateToken,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        if (isNaN(templateId)) {
          return res.status(400).json({ message: "Invalid template ID" });
        }

        const template = await storage.getPackageTemplate(templateId);
        if (!template) {
          return res.status(404).json({ message: "Template not found" });
        }

        // Ensure user can only delete their own templates
        if (template.userId !== req.user.id && req.user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }

        await storage.deletePackageTemplate(templateId);
        res.json({ message: "Template deleted successfully" });
      } catch (error) {
        console.error("Error deleting package template:", error);
        res.status(500).json({ message: "Error deleting template" });
      }
    },
  );

  // Set a template as default
  app.post(
    "/api/package-templates/:id/set-default",
    authenticateToken,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        if (isNaN(templateId)) {
          return res.status(400).json({ message: "Invalid template ID" });
        }

        const template = await storage.getPackageTemplate(templateId);
        if (!template) {
          return res.status(404).json({ message: "Template not found" });
        }

        // Ensure user can only set their own templates as default
        if (template.userId !== req.user.id && req.user.role !== "admin") {
          return res.status(403).json({ message: "Access denied" });
        }

        const updatedTemplate = await storage.setDefaultPackageTemplate(
          req.user.id,
          templateId,
        );
        res.json(updatedTemplate);
      } catch (error) {
        console.error("Error setting default template:", error);
        res.status(500).json({ message: "Error setting default template" });
      }
    },
  );

  // Get the default package template for the user
  app.get(
    "/api/package-templates/default",
    authenticateToken,
    async (req, res) => {
      try {
        // Make sure user id is available
        if (!req.user || !req.user.id) {
          return res.status(401).json({ message: "User not authenticated" });
        }

        const template = await storage.getDefaultPackageTemplate(req.user.id);
        if (!template) {
          // Return empty 200 response instead of 404 error to avoid React Query errors
          return res.status(200).json(null);
        }

        res.json(template);
      } catch (error) {
        console.error("Error getting default template:", error);
        res.status(500).json({ message: "Error retrieving default template" });
      }
    },
  );

  // Package management routes
  app.get(
    "/api/shipments/:shipmentId/packages",
    authenticateToken,
    isOwnerOrAdmin,
    packageController.getPackagesForShipment,
  );
  app.post(
    "/api/shipments/:shipmentId/packages",
    authenticateToken,
    isOwnerOrAdmin,
    packageController.createPackages,
  );
  app.put(
    "/api/packages/:id",
    authenticateToken,
    packageController.updatePackage,
  );
  app.delete(
    "/api/packages/:id",
    authenticateToken,
    isOwnerOrAdmin,
    packageController.deletePackage,
  );

  // System settings routes (admin only)
  app.get("/api/settings", authenticateToken, isAdmin, async (req, res) => {
    try {
      // Get all settings
      const minBalanceSetting = await storage.getSystemSetting("MIN_BALANCE");
      const defaultPriceMultiplierSetting = await storage.getSystemSetting(
        "DEFAULT_PRICE_MULTIPLIER",
      );

      // Return settings as an object
      res.json({
        minBalance: minBalanceSetting
          ? {
              value: parseInt(minBalanceSetting.value),
              formattedValue: `$${(parseInt(minBalanceSetting.value) / 100).toFixed(2)}`,
            }
          : null,
        defaultPriceMultiplier: defaultPriceMultiplierSetting
          ? { value: parseFloat(defaultPriceMultiplierSetting.value) }
          : { value: 1.45 }, // Default to 1.45 if not set yet
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      res
        .status(500)
        .json({ message: "Error fetching settings", error: error.message });
    }
  });

  // Set global minimum balance (admin only)
  app.post(
    "/api/settings/min-balance",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { value } = req.body;

        if (value === undefined) {
          return res.status(400).json({ message: "Value is required" });
        }

        // Convert value to cents (stored as integer)
        const valueInCents = Math.round(parseFloat(value) * 100);

        // Update or create the setting
        const updatedSetting = await storage.updateSystemSetting(
          "MIN_BALANCE",
          valueInCents.toString(),
        );

        res.json({
          success: true,
          setting: updatedSetting,
          formattedValue: `$${(valueInCents / 100).toFixed(2)}`,
        });
      } catch (error) {
        console.error("Error updating minimum balance setting:", error);
        res
          .status(500)
          .json({
            message: "Error updating minimum balance setting",
            error: error.message,
          });
      }
    },
  );

  // Set default price multiplier for new users (admin only)
  app.post(
    "/api/settings/default-price-multiplier",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const { value } = req.body;

        if (value === undefined) {
          return res.status(400).json({ message: "Value is required" });
        }

        // Validate the value is a positive number
        const multiplier = parseFloat(value);
        if (isNaN(multiplier) || multiplier <= 0) {
          return res
            .status(400)
            .json({ message: "Price multiplier must be a positive number" });
        }

        // Update or create the setting
        const updatedSetting = await storage.updateSystemSetting(
          "DEFAULT_PRICE_MULTIPLIER",
          multiplier.toString(),
        );

        res.json({
          success: true,
          setting: updatedSetting,
          value: multiplier,
        });
      } catch (error) {
        console.error(
          "Error updating default price multiplier setting:",
          error,
        );
        res
          .status(500)
          .json({
            message: "Error updating default price multiplier setting",
            error: error.message,
          });
      }
    },
  );

  // Country Price Multiplier routes (admin only)
  app.get("/api/price-multipliers/countries", authenticateToken, isAdmin, async (req, res) => {
    try {
      const multipliers = await storage.getAllCountryPriceMultipliers();
      res.json(multipliers);
    } catch (error) {
      console.error("Error fetching country price multipliers:", error);
      res.status(500).json({ message: "Error fetching country price multipliers", error: error.message });
    }
  });

  app.post("/api/price-multipliers/countries", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { countryCode, countryName, priceMultiplier } = req.body;

      if (!countryCode || !countryName || !priceMultiplier) {
        return res.status(400).json({ message: "Country code, name, and price multiplier are required" });
      }

      if (typeof priceMultiplier !== "number" || priceMultiplier <= 0) {
        return res.status(400).json({ message: "Price multiplier must be a positive number" });
      }

      const multiplier = await storage.createCountryPriceMultiplier({
        countryCode: countryCode.toUpperCase(),
        countryName,
        priceMultiplier,
        createdBy: req.user.id,
        isActive: true,
      });

      res.json({ success: true, multiplier });
    } catch (error) {
      console.error("Error creating country price multiplier:", error);
      res.status(500).json({ message: "Error creating country price multiplier", error: error.message });
    }
  });

  app.put("/api/price-multipliers/countries/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { countryCode, countryName, priceMultiplier, isActive } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid multiplier ID" });
      }

      const updateData: any = {};
      if (countryCode) updateData.countryCode = countryCode.toUpperCase();
      if (countryName) updateData.countryName = countryName;
      if (priceMultiplier && typeof priceMultiplier === "number" && priceMultiplier > 0) {
        updateData.priceMultiplier = priceMultiplier;
      }
      if (typeof isActive === "boolean") updateData.isActive = isActive;

      const multiplier = await storage.updateCountryPriceMultiplier(id, updateData);

      if (!multiplier) {
        return res.status(404).json({ message: "Country price multiplier not found" });
      }

      res.json({ success: true, multiplier });
    } catch (error) {
      console.error("Error updating country price multiplier:", error);
      res.status(500).json({ message: "Error updating country price multiplier", error: error.message });
    }
  });

  app.delete("/api/price-multipliers/countries/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid multiplier ID" });
      }

      const multiplier = await storage.deleteCountryPriceMultiplier(id);

      if (!multiplier) {
        return res.status(404).json({ message: "Country price multiplier not found" });
      }

      res.json({ success: true, message: "Country price multiplier deleted" });
    } catch (error) {
      console.error("Error deleting country price multiplier:", error);
      res.status(500).json({ message: "Error deleting country price multiplier", error: error.message });
    }
  });

  // Insurance calculation endpoint (authenticated users)
  app.get("/api/insurance/calculate", authenticateToken, calculateInsuranceCost);

  // Insurance calculation endpoint (POST method for shipment-edit page)
  app.post("/api/calculate-insurance", authenticateToken, async (req, res) => {
    try {
      const { declaredValue } = req.body;
      
      if (!declaredValue) {
        return res.status(400).json({ message: "Declared value is required" });
      }

      // Get active insurance ranges
      const ranges = await storage.getActiveInsuranceRanges();
      
      // Find the matching range for the declared value
      const range = ranges.find(
        (r: any) => declaredValue >= r.minValue && declaredValue <= r.maxValue
      );
      
      if (range) {
        // Return the insurance cost from the range
        return res.json({ 
          cost: range.insuranceCost,
          declaredValue,
          rangeApplied: {
            min: range.minValue,
            max: range.maxValue,
            cost: range.insuranceCost
          }
        });
      } else {
        // No range found - use default 1% calculation
        const defaultCost = Math.round(declaredValue * 0.01);
        return res.json({ 
          cost: defaultCost,
          declaredValue,
          defaultCalculation: true
        });
      }
    } catch (error) {
      console.error("Error calculating insurance:", error);
      res.status(500).json({ message: "Error calculating insurance" });
    }
  });

  // Insurance range management endpoints (admin only)
  app.get("/api/insurance-ranges", authenticateToken, async (req, res) => {
    try {
      const ranges = await storage.getAllInsuranceRanges();
      res.json(ranges);
    } catch (error) {
      console.error("Error fetching insurance ranges:", error);
      res.status(500).json({ message: "Error fetching insurance ranges" });
    }
  });

  app.post("/api/insurance-ranges", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { minValue, maxValue, insuranceCost } = req.body;

      // Validate input
      if (typeof minValue !== "number" || minValue < 0) {
        return res.status(400).json({ message: "Minimum value must be a non-negative number" });
      }

      if (typeof maxValue !== "number" || maxValue <= minValue) {
        return res.status(400).json({ message: "Maximum value must be greater than minimum value" });
      }

      if (typeof insuranceCost !== "number" || insuranceCost < 0) {
        return res.status(400).json({ message: "Insurance cost must be a non-negative number" });
      }

      // Check for overlapping ranges
      const overlappingRanges = await storage.findOverlappingInsuranceRanges(minValue, maxValue);
      if (overlappingRanges.length > 0) {
        return res.status(400).json({ message: "This range overlaps with existing ranges" });
      }

      const range = await storage.createInsuranceRange({
        minValue,
        maxValue,
        insuranceCost,
        isActive: true
      });

      res.json(range);
    } catch (error) {
      console.error("Error creating insurance range:", error);
      res.status(500).json({ message: "Error creating insurance range" });
    }
  });

  app.patch("/api/insurance-ranges/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid range ID" });
      }

      const { minValue, maxValue, insuranceCost, isActive } = req.body;
      
      const updateData: Partial<schema.InsuranceRange> = {};
      
      if (typeof minValue === "number") {
        if (minValue < 0) {
          return res.status(400).json({ message: "Minimum value must be non-negative" });
        }
        updateData.minValue = minValue;
      }
      
      if (typeof maxValue === "number") {
        updateData.maxValue = maxValue;
      }
      
      if (typeof insuranceCost === "number") {
        if (insuranceCost < 0) {
          return res.status(400).json({ message: "Insurance cost must be non-negative" });
        }
        updateData.insuranceCost = insuranceCost;
      }
      
      if (typeof isActive === "boolean") {
        updateData.isActive = isActive;
      }

      // If updating range values, check for overlaps
      if (updateData.minValue !== undefined || updateData.maxValue !== undefined) {
        const existingRange = await storage.getInsuranceRangeById(id);
        if (!existingRange) {
          return res.status(404).json({ message: "Insurance range not found" });
        }

        const finalMinValue = updateData.minValue ?? existingRange.minValue;
        const finalMaxValue = updateData.maxValue ?? existingRange.maxValue;
        
        if (finalMaxValue <= finalMinValue) {
          return res.status(400).json({ message: "Maximum value must be greater than minimum value" });
        }

        const overlappingRanges = await storage.findOverlappingInsuranceRanges(
          finalMinValue, 
          finalMaxValue, 
          id
        );
        
        if (overlappingRanges.length > 0) {
          return res.status(400).json({ message: "This range overlaps with existing ranges" });
        }
      }

      const updatedRange = await storage.updateInsuranceRange(id, updateData);
      
      if (!updatedRange) {
        return res.status(404).json({ message: "Insurance range not found" });
      }

      res.json(updatedRange);
    } catch (error) {
      console.error("Error updating insurance range:", error);
      res.status(500).json({ message: "Error updating insurance range" });
    }
  });

  app.delete("/api/insurance-ranges/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid range ID" });
      }

      const success = await storage.deleteInsuranceRange(id);
      
      if (!success) {
        return res.status(404).json({ message: "Insurance range not found" });
      }

      res.json({ success: true, message: "Insurance range deleted" });
    } catch (error) {
      console.error("Error deleting insurance range:", error);
      res.status(500).json({ message: "Error deleting insurance range" });
    }
  });

  // Weight Range Price Multiplier routes (admin only)
  app.get("/api/price-multipliers/weight-ranges", authenticateToken, isAdmin, async (req, res) => {
    try {
      const multipliers = await storage.getAllWeightRangePriceMultipliers();
      res.json(multipliers);
    } catch (error) {
      console.error("Error fetching weight range price multipliers:", error);
      res.status(500).json({ message: "Error fetching weight range price multipliers", error: error.message });
    }
  });

  app.post("/api/price-multipliers/weight-ranges", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { minWeight, maxWeight, priceMultiplier, rangeName } = req.body;

      if (typeof minWeight !== "number" || minWeight < 0) {
        return res.status(400).json({ message: "Minimum weight must be a non-negative number" });
      }

      if (maxWeight !== null && (typeof maxWeight !== "number" || maxWeight <= minWeight)) {
        return res.status(400).json({ message: "Maximum weight must be greater than minimum weight" });
      }

      if (!priceMultiplier || typeof priceMultiplier !== "number" || priceMultiplier <= 0) {
        return res.status(400).json({ message: "Price multiplier must be a positive number" });
      }

      if (!rangeName || typeof rangeName !== "string") {
        return res.status(400).json({ message: "Range name is required" });
      }

      const multiplier = await storage.createWeightRangePriceMultiplier({
        minWeight,
        maxWeight,
        priceMultiplier,
        rangeName,
        createdBy: req.user.id,
        isActive: true,
      });

      res.json({ success: true, multiplier });
    } catch (error) {
      console.error("Error creating weight range price multiplier:", error);
      res.status(500).json({ message: "Error creating weight range price multiplier", error: error.message });
    }
  });

  app.put("/api/price-multipliers/weight-ranges/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { minWeight, maxWeight, priceMultiplier, rangeName, isActive } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid multiplier ID" });
      }

      const updateData: any = {};
      if (typeof minWeight === "number" && minWeight >= 0) updateData.minWeight = minWeight;
      if (maxWeight !== undefined) updateData.maxWeight = maxWeight;
      if (priceMultiplier && typeof priceMultiplier === "number" && priceMultiplier > 0) {
        updateData.priceMultiplier = priceMultiplier;
      }
      if (rangeName && typeof rangeName === "string") updateData.rangeName = rangeName;
      if (typeof isActive === "boolean") updateData.isActive = isActive;

      const multiplier = await storage.updateWeightRangePriceMultiplier(id, updateData);

      if (!multiplier) {
        return res.status(404).json({ message: "Weight range price multiplier not found" });
      }

      res.json({ success: true, multiplier });
    } catch (error) {
      console.error("Error updating weight range price multiplier:", error);
      res.status(500).json({ message: "Error updating weight range price multiplier", error: error.message });
    }
  });

  app.delete("/api/price-multipliers/weight-ranges/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid multiplier ID" });
      }

      const multiplier = await storage.deleteWeightRangePriceMultiplier(id);

      if (!multiplier) {
        return res.status(404).json({ message: "Weight range price multiplier not found" });
      }

      res.json({ success: true, message: "Weight range price multiplier deleted" });
    } catch (error) {
      console.error("Error deleting weight range price multiplier:", error);
      res.status(500).json({ message: "Error deleting weight range price multiplier", error: error.message });
    }
  });

  // Set user-specific minimum balance (admin only)
  app.post(
    "/api/users/:userId/min-balance",
    authenticateToken,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { value } = req.body;

        if (isNaN(userId)) {
          return res.status(400).json({ message: "Invalid user ID" });
        }

        // Check if user exists
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // value can be null (to use system default) or a number
        let minimumBalance = null;

        if (value !== null && value !== undefined && value !== "") {
          // Convert value to cents (stored as integer)
          minimumBalance = Math.round(parseFloat(value) * 100);
        }

        // Update the user's minimum balance
        const updatedUser = await storage.setUserMinimumBalance(
          userId,
          minimumBalance,
        );

        res.json({
          success: true,
          user: updatedUser,
          formattedValue:
            minimumBalance !== null
              ? `$${(minimumBalance / 100).toFixed(2)}`
              : "System Default",
        });
      } catch (error) {
        console.error("Error updating user minimum balance:", error);
        res
          .status(500)
          .json({
            message: "Error updating user minimum balance",
            error: error.message,
          });
      }
    },
  );

  // User products routes
  // Get all products for the authenticated user
  app.get("/api/products", authenticateToken, async (req, res) => {
    try {
      const products = await storage.getUserProducts(req.user.id);
      res.json(products);
    } catch (error) {
      console.error("Error getting user products:", error);
      res.status(500).json({ message: "Error retrieving products" });
    }
  });

  // Search user products
  app.get("/api/products/search", authenticateToken, async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const products = await storage.searchUserProducts(req.user.id, query);
      res.json(products);
    } catch (error) {
      console.error("Error searching user products:", error);
      res.status(500).json({ message: "Error searching products" });
    }
  });

  // Get a specific product by ID
  app.get("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const product = await storage.getUserProductById(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Ensure user can only access their own products
      if (product.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(product);
    } catch (error) {
      console.error("Error getting product:", error);
      res.status(500).json({ message: "Error retrieving product" });
    }
  });

  // Create a new product
  app.post("/api/products", authenticateToken, async (req, res) => {
    try {
      const {
        name,
        description,
        gtin,
        hsCode,
        weight,
        length,
        width,
        height,
        price,
        quantity,
        countryOfOrigin,
        manufacturer,
      } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Product name is required" });
      }

      // Use default values for optional fields
      const productData = {
        name,
        description: description || null,
        gtin: gtin || null,
        hsCode: hsCode || null,
        weight: weight || null,
        length: length || null,
        width: width || null,
        height: height || null,
        price: price || 0,
        quantity: quantity || 1,
        countryOfOrigin: countryOfOrigin || null,
        manufacturer: manufacturer || null,
      };

      const product = await storage.createUserProduct(req.user.id, productData);
      res.status(201).json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Error creating product" });
    }
  });

  // Changed to a different URL pattern to avoid route conflicts
  // Download product import template
  app.get(
    "/api/template/product-import",
    authenticateToken,
    async (req, res) => {
      try {
        // Create a new workbook with ExcelJS (not from xlsx library)
        const workbook = new ExcelJS.Workbook();

        // Add a Products Template worksheet
        const worksheet = workbook.addWorksheet("Products Template");

        // Define columns with proper widths for better readability
        worksheet.columns = [
          { header: "name", key: "name", width: 30 },
          { header: "sku", key: "sku", width: 15 },
          { header: "description", key: "description", width: 40 },
          { header: "hsCode", key: "hsCode", width: 15 },
          { header: "price", key: "price", width: 10 },
          { header: "quantity", key: "quantity", width: 10 },
          { header: "countryOfOrigin", key: "countryOfOrigin", width: 20 },
        ];

        // Add sample data rows with notes about data types
        worksheet.addRow({
          name: "Ceramic Coffee Mug", // Required: Text
          sku: "MUG-001", // Optional: Text
          description: "Handcrafted white ceramic coffee mug, 12oz", // Optional: Text
          hsCode: "6912.00", // Required: Text (Harmonized System Code)
          price: 14.99, // Required: Number (will be converted to cents in system)
          quantity: 20, // Optional: Integer
          countryOfOrigin: "Turkey", // Required: Text
        });

        worksheet.addRow({
          name: "Wooden Cutting Board",
          sku: "KIT-002",
          description: "Acacia wood cutting board, 12x9 inches",
          hsCode: "4419.90",
          price: 28.5,
          quantity: 15,
          countryOfOrigin: "Turkey",
        });

        worksheet.addRow({
          name: "Leather Wallet",
          sku: "ACC-003",
          description: "Genuine leather bifold wallet",
          hsCode: "4202.32",
          price: 39.99,
          quantity: 10,
          countryOfOrigin: "Italy",
        });

        // Add styling to header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Add Instructions worksheet
        const instructionsSheet = workbook.addWorksheet("Instructions");

        // Define columns for instructions
        instructionsSheet.columns = [
          { header: "Field Name", key: "field", width: 20 },
          { header: "Description", key: "description", width: 50 },
          { header: "Required?", key: "required", width: 15 },
        ];

        // Add instruction rows
        instructionsSheet.addRow({
          field: "name",
          description: "Product name (text)",
          required: "Yes",
        });
        instructionsSheet.addRow({
          field: "sku",
          description: "Stock Keeping Unit - unique product identifier (text)",
          required: "No",
        });
        instructionsSheet.addRow({
          field: "description",
          description: "Detailed description of the product (text)",
          required: "No",
        });
        instructionsSheet.addRow({
          field: "hsCode",
          description: "Harmonized System Code for customs (text)",
          required: "Yes",
        });
        instructionsSheet.addRow({
          field: "price",
          description:
            "Price per unit in USD (number, e.g. 14.99) - will be stored in cents",
          required: "Yes",
        });
        instructionsSheet.addRow({
          field: "quantity",
          description: "Quantity available in stock (whole number, e.g. 10)",
          required: "Yes",
        });
        instructionsSheet.addRow({
          field: "countryOfOrigin",
          description: "Country where the product was manufactured (text)",
          required: "Yes",
        });

        // Add data type explanations section
        instructionsSheet.addRow({});
        instructionsSheet.addRow({
          field: "IMPORTANT",
          description: "DATA TYPE INFORMATION",
          required: "",
        });
        instructionsSheet.addRow({
          field: "Price format",
          description:
            "Enter decimal values (e.g., 24.99) and they will be converted to cents automatically",
          required: "",
        });
        instructionsSheet.addRow({
          field: "Dimensions",
          description:
            "If provided, dimensions will be rounded to whole numbers",
          required: "",
        });
        instructionsSheet.addRow({
          field: "Weight",
          description: "Weight can be a decimal value (e.g., 1.5)",
          required: "",
        });

        // Add styling to instruction header row
        instructionsSheet.getRow(1).font = { bold: true };
        instructionsSheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Set Content-Type and Content-Disposition headers
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=product-import-template.xlsx",
        );

        // Write to a buffer and send as response
        await workbook.xlsx.write(res);

        // End the response
        res.end();
      } catch (error) {
        console.error("Error creating template file:", error);
        res.status(500).json({ message: "Failed to generate template file" });
      }
    },
  );

  // Bulk product upload endpoint
  // Bulk upload - Supports both endpoints for backward compatibility
  app.post(
    ["/api/products/bulk", "/api/products/bulk-upload"],
    authenticateToken,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.id;
        const filePath = req.file.path;
        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        let products = [];

        // Process based on file type
        if (fileExtension === ".csv") {
          // Read CSV file
          const fileContent = fs.readFileSync(filePath, "utf8");
          const { parse } = await import("csv-parse/sync");
          const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });

          products = records;
        } else if (fileExtension === ".xlsx" || fileExtension === ".xls") {
          // Read Excel file using ExcelJS (not xlsx)
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.readFile(filePath);

          // Get the first worksheet
          const worksheet = workbook.worksheets[0];
          if (!worksheet) {
            throw new Error("Excel file has no worksheets");
          }

          // Convert worksheet to JSON
          products = [];
          // Get all rows including the header row
          const rows = worksheet.getRows(1, worksheet.rowCount) || [];

          // Extract header row for property names
          const headers = [];
          worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber - 1] = cell.value
              ? cell.value.toString()
              : `column${colNumber}`;
          });

          // Start from row 2 to skip header
          for (let i = 2; i <= worksheet.rowCount; i++) {
            const row = worksheet.getRow(i);
            if (!row.hasValues) continue; // Skip empty rows

            const obj = {};
            row.eachCell((cell, colNumber) => {
              // Use the header as property name, or use column index if header not available
              const propName = headers[colNumber - 1] || `column${colNumber}`;
              obj[propName] = cell.value;
            });

            // Only add if the row has at least one non-empty cell
            if (Object.keys(obj).length > 0) {
              products.push(obj);
            }
          }
        } else {
          fs.unlinkSync(filePath); // Clean up the uploaded file
          return res
            .status(400)
            .json({
              message:
                "Unsupported file format. Please upload CSV or Excel file.",
            });
        }

        // Clean up the uploaded file
        fs.unlinkSync(filePath);

        if (products.length === 0) {
          return res
            .status(400)
            .json({ message: "No products found in the file" });
        }

        // Validate and process products
        const validProducts = [];
        const errors = [];

        for (let i = 0; i < products.length; i++) {
          try {
            const product = products[i];

            // Normalize field names (convert to lowercase and remove spaces)
            const normalizedProduct = {};
            Object.keys(product).forEach((key) => {
              const normalizedKey = key.toLowerCase().replace(/\s+/g, "");
              normalizedProduct[normalizedKey] = product[key];
            });

            // Map normalized fields to our schema
            const mappedProduct = {
              name:
                normalizedProduct.name || normalizedProduct.productname || "",
              description: normalizedProduct.description || null,
              // Convert price to cents (integer) since our schema stores price in cents
              price: Math.round(
                parseFloat(normalizedProduct.price || "0") * 100,
              ),
              // Make sure quantity is an integer
              quantity: parseInt(normalizedProduct.quantity || "1", 10),
              hsCode: normalizedProduct.hscode || normalizedProduct.hs || null,
              countryOfOrigin:
                normalizedProduct.countryoforigin ||
                normalizedProduct.origin ||
                null,
              // Keep weight as float
              weight: parseFloat(normalizedProduct.weight || "0") || null,
              // Make sure dimensions are integers
              length: normalizedProduct.length
                ? Math.round(parseFloat(normalizedProduct.length))
                : null,
              width: normalizedProduct.width
                ? Math.round(parseFloat(normalizedProduct.width))
                : null,
              height: normalizedProduct.height
                ? Math.round(parseFloat(normalizedProduct.height))
                : null,
              gtin: normalizedProduct.gtin || normalizedProduct.barcode || null,
              manufacturer: normalizedProduct.manufacturer || null,
              sku: normalizedProduct.sku || null,
            };

            // Validate the mapped product (basic validation)
            if (!mappedProduct.name) {
              throw new Error("Product name is required");
            }

            validProducts.push(mappedProduct);
          } catch (error) {
            errors.push({
              row: i + 2, // +2 because CSV files typically have a header row and human-readable rows start at 1
              message: error.message || "Validation error",
            });
          }
        }

        // Insert valid products into the database
        const results = [];
        for (const product of validProducts) {
          try {
            const newProduct = await storage.createUserProduct(userId, product);
            results.push(newProduct);
          } catch (error) {
            console.error("Error creating product:", error);
            errors.push({
              product: product.name,
              message: error.message || "Database error",
            });
          }
        }

        res.status(200).json({
          success: true,
          added: results.length,
          skipped: products.length - results.length,
          total: products.length,
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        console.error("Error processing bulk upload:", error);
        res.status(500).json({
          success: false,
          message:
            "Failed to process file upload: " +
            (error.message || "Unknown error"),
        });
      }
    },
  );

  // Update a product
  app.put("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // First get the product to check ownership
      const existingProduct = await storage.getUserProductById(productId);

      if (!existingProduct) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Ensure user can only update their own products
      if (existingProduct.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      // Update product fields
      const {
        name,
        description,
        gtin,
        hsCode,
        weight,
        length,
        width,
        height,
        price,
        quantity,
        countryOfOrigin,
        manufacturer,
      } = req.body;

      // Construct update data with all possible fields
      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (gtin !== undefined) updateData.gtin = gtin;
      if (hsCode !== undefined) updateData.hsCode = hsCode;
      if (weight !== undefined) updateData.weight = weight;
      if (length !== undefined) updateData.length = length;
      if (width !== undefined) updateData.width = width;
      if (height !== undefined) updateData.height = height;
      if (price !== undefined) updateData.price = price;
      if (quantity !== undefined) updateData.quantity = quantity;
      if (countryOfOrigin !== undefined)
        updateData.countryOfOrigin = countryOfOrigin;
      if (manufacturer !== undefined) updateData.manufacturer = manufacturer;

      const updatedProduct = await storage.updateUserProduct(
        productId,
        updateData,
      );
      res.json(updatedProduct);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Error updating product" });
    }
  });

  // Delete a product
  app.delete("/api/products/:id", authenticateToken, async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      // First get the product to check ownership
      const product = await storage.getUserProductById(productId);

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Ensure user can only delete their own products
      if (product.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteUserProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // HS Code search endpoint (Excel + Easyship hybrid)
  app.get("/api/hs-codes/search", async (req, res) => {
    const { q: query } = req.query;
    
    if (!query || typeof query !== 'string' || query.length < 3) {
      return res.status(400).json({
        message: "Search query is required (minimum 3 characters)"
      });
    }

    console.log(`🔍 [DASHBOARD SEARCH] Searching HS codes for: "${query}"`);

    try {
      let combinedResults: any[] = [];

      // FIRST: Check if query looks like an HS code (numbers/dots)
      const isHsCodeLike = /^[\d\.]+$/.test(query.trim());
      
      if (isHsCodeLike) {
        console.log(`🔍 [DASHBOARD SEARCH] Query looks like HS code, searching Excel first: "${query}"`);
        
        // Import the merged-cell aware search
        const { MergedCellExcelSearch } = await import('./services/merged-cell-excel-search.js');
        
        const excelResult = await MergedCellExcelSearch.searchHSCode(query);
        if (excelResult) {
          console.log(`✅ [DASHBOARD SEARCH] Found in Excel: ${excelResult.hsCode} - ${excelResult.generalRate}`);
          
          combinedResults.push({
            code: excelResult.hsCode,
            description: excelResult.description || `US Tariff: ${excelResult.generalRate}`,
            chapter: excelResult.chapter.toString(),
            heading: excelResult.hsCode.substring(0, 4),
            subheading: excelResult.hsCode.length > 6 ? excelResult.hsCode.substring(0, 6) : undefined,
            source: 'excel'
          });
        }
      }

      // SECOND: Search Easyship for product name queries or as fallback
      if (!isHsCodeLike || combinedResults.length === 0) {
        console.log(`🔍 [DASHBOARD SEARCH] Searching Easyship for: "${query}"`);
        
        try {
          const easyshipData = await easyshipService.searchHSCodes(query);
          
          // Handle the Easyship API response structure: { hs_codes: [...], meta: {...} }
          const easyshipResults = (easyshipData && Array.isArray(easyshipData.hs_codes)) 
            ? easyshipData.hs_codes 
            : [];
          
          // Transform Easyship results to our format
          const easyshipFormatted = easyshipResults.map((hsCode: any) => ({
            code: hsCode.code,
            description: hsCode.description,
            chapter: hsCode.code.substring(0, 2),
            heading: hsCode.code.substring(0, 4),
            subheading: hsCode.code.length > 6 ? hsCode.code.substring(0, 6) : undefined,
            source: 'easyship'
          }));

          combinedResults = [...combinedResults, ...easyshipFormatted];
          
          console.log(`✅ [DASHBOARD SEARCH] Found ${easyshipFormatted.length} codes from Easyship`);
          
        } catch (easyshipError) {
          console.error("Easyship search failed:", easyshipError);
          // Continue with Excel results only
        }
      }

      // Remove duplicates and prioritize Excel results
      const uniqueResults = combinedResults.filter((result, index, array) => {
        const isDuplicate = array.findIndex(r => r.code === result.code) !== index;
        return !isDuplicate;
      });

      console.log(`✅ [DASHBOARD SEARCH] Returning ${uniqueResults.length} total HS codes`);
      console.log(`[DASHBOARD SEARCH] Results breakdown:`, {
        excel: uniqueResults.filter(r => r.source === 'excel').length,
        easyship: uniqueResults.filter(r => r.source === 'easyship').length
      });
      
      res.json(uniqueResults);

    } catch (error) {
      console.error("[DASHBOARD SEARCH] Search failed:", error);
      res.status(500).json({
        message: "Failed to search HS codes",
        error: (error as Error).message,
      });
    }
  });

  // Get tax rate for HS code (truncated to 8 digits for calculation)
  app.get("/api/hs-codes/tax-rate", async (req, res) => {
    try {
      const { truncateHSCodeForTax, isHSCodeTruncated } = await import('../shared/hs-code-utils.js');
      const { hsCode, country } = req.query;
      
      if (!hsCode || typeof hsCode !== 'string') {
        return res.status(400).json({
          message: "HS code is required"
        });
      }

      // Default to US if no country specified
      const destinationCountry = (country as string) || 'US';
      
      // Truncate HS code to 8 digits for tax calculation
      const truncatedCode = truncateHSCodeForTax(hsCode);
      const wasTruncated = isHSCodeTruncated(hsCode);
      
      if (!truncatedCode) {
        return res.status(400).json({
          message: "Invalid HS code"
        });
      }

      console.log(`📊 [TAX RATE] Fetching tax rate for HS code: ${hsCode} (truncated: ${truncatedCode}) to ${destinationCountry}`);
      
      // Try to get duty rate from USITC for US shipments
      let dutyRate = null;
      let taxRate = null;
      let source = 'default';
      
      if (destinationCountry === 'US' || destinationCountry === 'USA') {
        try {
          // Import USITC service
          const USITCDutyService = (await import('./services/usitc-duty-rates')).default;
          const usitcService = new USITCDutyService();
          
          // Get duty rate using truncated code
          const dutyResult = await usitcService.getDutyRate(truncatedCode);
          
          if (dutyResult && dutyResult.dutyPercentage !== null) {
            dutyRate = dutyResult.dutyPercentage;
            source = 'usitc';
            console.log(`📊 [TAX RATE] USITC duty rate for ${truncatedCode}: ${(dutyRate * 100).toFixed(1)}%`);
          }
        } catch (error) {
          console.error('📊 [TAX RATE] USITC lookup failed:', error);
        }
      }
      
      // Get VAT/tax rate for other countries
      if (destinationCountry !== 'US' && destinationCountry !== 'USA') {
        try {
          const { default: OfficialGovernmentDataService } = await import('./services/official-government-data.js');
          const govDataService = new OfficialGovernmentDataService();
          
          const vatRate = govDataService.getOfficialVATRate(destinationCountry);
          if (vatRate) {
            taxRate = vatRate.standardRate;
            source = 'official';
            console.log(`📊 [TAX RATE] VAT rate for ${destinationCountry}: ${(taxRate * 100).toFixed(1)}%`);
          }
        } catch (error) {
          console.error('📊 [TAX RATE] VAT lookup failed:', error);
        }
      }
      
      // Default rates if not found
      if (dutyRate === null && taxRate === null) {
        if (destinationCountry === 'US' || destinationCountry === 'USA') {
          dutyRate = 0.05; // Default 5% duty for US
        } else {
          taxRate = 0.20; // Default 20% VAT for other countries
        }
        source = 'default';
      }
      
      const totalRate = (dutyRate || 0) + (taxRate || 0);
      
      res.json({
        hsCode: hsCode,
        truncatedCode: truncatedCode,
        wasTruncated: wasTruncated,
        country: destinationCountry,
        dutyRate: dutyRate,
        taxRate: taxRate,
        totalRate: totalRate,
        source: source,
        displayText: `${(totalRate * 100).toFixed(1)}%`,
        details: wasTruncated 
          ? `Using first 8 digits (${truncatedCode}) for tax calculation`
          : null
      });
      
    } catch (error) {
      console.error("📊 [TAX RATE] Error fetching tax rate:", error);
      res.status(500).json({
        message: "Failed to fetch tax rate",
        error: (error as Error).message
      });
    }
  });

  // AI HS Code Suggestion endpoints
  app.post("/api/hs-codes/suggest", authenticateToken, async (req, res) => {
    try {
      const { suggestHSCode } = await import("./services/hsCodeAI");
      
      const itemDetails = req.body;
      
      // Validate required fields
      if (!itemDetails.name) {
        return res.status(400).json({
          message: "Product name is required"
        });
      }

      console.log(`🤖 AI suggesting HS code for: "${itemDetails.name}"`);
      
      const suggestion = await suggestHSCode(itemDetails);
      
      console.log(`✅ AI suggested HS code ${suggestion.hsCode} with ${suggestion.confidence} confidence`);
      
      res.json(suggestion);
      
    } catch (error) {
      console.error("AI HS code suggestion failed:", error);
      res.status(500).json({
        message: "Failed to generate HS code suggestion",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/hs-codes/validate", authenticateToken, async (req, res) => {
    try {
      const { validateHSCode } = await import("./services/hsCodeAI");
      
      const { hsCode, itemDetails } = req.body;
      
      // Validate required fields
      if (!hsCode || !itemDetails?.name) {
        return res.status(400).json({
          message: "HS code and product name are required"
        });
      }

      console.log(`🔍 AI validating HS code ${hsCode} for: "${itemDetails.name}"`);
      
      const validation = await validateHSCode(hsCode, itemDetails);
      
      console.log(`✅ AI validation result: ${validation.isValid ? 'Valid' : 'Invalid'} with ${validation.confidence} confidence`);
      
      res.json(validation);
      
    } catch (error) {
      console.error("AI HS code validation failed:", error);
      res.status(500).json({
        message: "Failed to validate HS code",
        error: (error as Error).message
      });
    }
  });

  app.post("/api/hs-codes/suggest-multiple", authenticateToken, async (req, res) => {
    try {
      const { suggestMultipleHSCodes } = await import("./services/hsCodeAI");
      
      const { items } = req.body;
      
      // Validate required fields
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: "Items array is required and must not be empty"
        });
      }

      // Validate each item has a name
      for (const item of items) {
        if (!item.name) {
          return res.status(400).json({
            message: "Each item must have a name"
          });
        }
      }

      console.log(`🤖 AI suggesting HS codes for ${items.length} items`);
      
      const suggestions = await suggestMultipleHSCodes(items);
      
      console.log(`✅ AI suggested HS codes for ${suggestions.length} items`);
      
      res.json(suggestions);
      
    } catch (error) {
      console.error("AI multiple HS code suggestion failed:", error);
      res.status(500).json({
        message: "Failed to generate HS code suggestions",
        error: (error as Error).message
      });
    }
  });

  // FedEx Address Validation endpoint
  app.post("/api/fedex/validate-address", authenticateToken, async (req, res) => {
    try {
      const { validateAddress } = await import("./services/fedex");
      
      const { streetLines, city, stateOrProvinceCode, postalCode, countryCode } = req.body;
      
      // Validate required fields
      if (!streetLines || !Array.isArray(streetLines) || streetLines.length === 0) {
        return res.status(400).json({
          message: "Street address lines are required and must be a non-empty array"
        });
      }
      
      if (!city || !countryCode) {
        return res.status(400).json({
          message: "City and country code are required"
        });
      }

      console.log(`📮 FedEx validating address: ${streetLines.join(', ')}, ${city}, ${countryCode}`);
      
      const address = {
        streetLines: streetLines.filter((line: string) => line.trim().length > 0),
        city: city.trim(),
        stateOrProvinceCode: stateOrProvinceCode?.trim(),
        postalCode: postalCode?.trim(),
        countryCode: countryCode.trim().toUpperCase()
      };
      
      const validation = await validateAddress(address);
      
      console.log(`✅ FedEx address validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`);
      
      res.json(validation);
      
    } catch (error) {
      console.error("FedEx address validation failed:", error);
      res.status(500).json({
        message: "Failed to validate address",
        error: (error as Error).message
      });
    }
  });

  // FedEx Token Cache Clear endpoint (admin only) - use after updating API key permissions
  app.post("/api/fedex/clear-token-cache", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { clearTokenCache } = await import("./services/fedex");
      await clearTokenCache();
      res.json({ success: true, message: "FedEx token cache cleared. Next API call will use a fresh token." });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear token cache", error: (error as Error).message });
    }
  });

  // FedEx Postal Code Validation endpoint
  app.post("/api/fedex/validate-postal-code", authenticateToken, async (req, res) => {
    try {
      const { validatePostalCode } = await import("./services/fedex");
      
      const { postalCode, countryCode, stateOrProvinceCode, carrierCode } = req.body;
      
      // Validate required fields
      if (!postalCode || !countryCode) {
        return res.status(400).json({
          message: "Postal code and country code are required"
        });
      }

      // Validate carrier code if provided
      if (carrierCode && !['FDXE', 'FDXG'].includes(carrierCode)) {
        return res.status(400).json({
          message: "Carrier code must be either 'FDXE' or 'FDXG'"
        });
      }

      console.log(`📮 FedEx validating postal code: ${postalCode} for ${countryCode}${stateOrProvinceCode ? ` (${stateOrProvinceCode})` : ''}`);
      
      const validation = await validatePostalCode(
        postalCode.trim(),
        countryCode.trim().toUpperCase(),
        stateOrProvinceCode?.trim().toUpperCase(),
        carrierCode || 'FDXG'
      );
      
      console.log(`✅ FedEx postal code validation result: ${validation.isValid ? 'Valid' : 'Invalid'}`);
      
      res.json(validation);
      
    } catch (error) {
      console.error("FedEx postal code validation failed:", error);
      res.status(500).json({
        message: "Failed to validate postal code",
        error: (error as Error).message
      });
    }
  });

  // Tax and Duty calculation endpoint (Easyship)
  app.post("/api/taxes-and-duties/calculate", async (req, res) => {
    try {
      const {
        origin_country_id,
        destination_country_id,
        items,
        insurance_fee = 0,
        shipment_charge = 0
      } = req.body;

      // Validate required fields
      if (!origin_country_id || !destination_country_id || !items || !Array.isArray(items)) {
        return res.status(400).json({
          message: "Missing required fields: origin_country_id, destination_country_id, items"
        });
      }

      if (items.length === 0) {
        return res.status(400).json({
          message: "At least one item is required"
        });
      }

      // Validate each item
      for (const item of items) {
        if (!item.duty_origin_country_id || !item.hs_code || typeof item.customs_value !== 'number') {
          return res.status(400).json({
            message: "Each item must have duty_origin_country_id, hs_code, and customs_value"
          });
        }
      }

      console.log(`💰 Calculating taxes and duties for countries: ${origin_country_id} → ${destination_country_id}`);
      console.log(`💰 Items count: ${items.length}, Insurance: $${insurance_fee}, Shipping: $${shipment_charge}`);

      // Prepare request body exactly as Easyship expects
      const requestBody = {
        origin_country_id: parseInt(origin_country_id),
        destination_country_id: parseInt(destination_country_id),
        insurance_fee: parseFloat(insurance_fee),
        shipment_charge: parseFloat(shipment_charge),
        items: items.map((item: any) => ({
          duty_origin_country_id: parseInt(item.duty_origin_country_id),
          hs_code: String(item.hs_code),
          customs_value: parseFloat(item.customs_value)
        }))
      };

      console.log('[EASYSHIP] Tax & Duty Request payload:', JSON.stringify(requestBody, null, 2));

      // Call Easyship API directly
      const response = await fetch(`https://public-api.easyship.com/2024-09/taxes_and_duties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EASYSHIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      console.log(`[EASYSHIP] Tax & Duty Response status: ${response.status}`);

      if (!response.ok) {
        console.error('[EASYSHIP] Tax and duty calculation failed:', response.status, responseData);
        
        // Handle specific error cases
        if (response.status === 402) {
          return res.status(402).json({
            message: "Insufficient subscription tier for tax and duty calculations",
            error: responseData
          });
        }
        
        if (response.status === 422) {
          return res.status(422).json({
            message: "Could not calculate tax and duty for the provided data",
            error: responseData
          });
        }
        
        return res.status(response.status).json({
          message: "Failed to calculate taxes and duties",
          error: responseData
        });
      }

      console.log('[EASYSHIP] Tax & Duty calculation successful:', {
        tax: responseData.tax_and_duty?.tax,
        duty: responseData.tax_and_duty?.duty,
        currency: responseData.tax_and_duty?.currency
      });

      // Return the response in the same format as Easyship
      res.json(responseData);

    } catch (error) {
      console.error("Tax and duty calculation error:", error);
      res.status(500).json({
        message: "Internal server error during tax and duty calculation",
        error: (error as Error).message,
      });
    }
  });

  // UPS Landed Cost calculation endpoint
  app.post("/api/ups-landed-cost/calculate", async (req, res) => {
    try {
      const {
        originCountryCode,
        destinationCountryCode,
        destinationProvince,
        items,
        shippingCost = 0,
        currencyCode = 'USD',
        shipmentType = 'COMMERCIAL',
        incoterms = 'FOB',
        transportMode = 'INT_AIR'
      } = req.body;

      // Validate required fields
      if (!originCountryCode || !destinationCountryCode || !items || !Array.isArray(items)) {
        return res.status(400).json({
          message: "Missing required fields: originCountryCode, destinationCountryCode, items"
        });
      }

      if (items.length === 0) {
        return res.status(400).json({
          message: "At least one item is required"
        });
      }

      // Validate each item
      for (const item of items) {
        if (!item.description || typeof item.value !== 'number' || typeof item.quantity !== 'number') {
          return res.status(400).json({
            message: "Each item must have description, value (number), and quantity (number)"
          });
        }
      }

      console.log(`💰 Calculating UPS Landed Cost for countries: ${originCountryCode} → ${destinationCountryCode}`);
      console.log(`💰 Items count: ${items.length}, Shipping: $${shippingCost}, Currency: ${currencyCode}`);

      const { upsLandedCostService } = await import('./services/ups-landed-cost');
      
      const result = await upsLandedCostService.calculateLandedCost({
        originCountryCode,
        destinationCountryCode,
        destinationProvince,
        items,
        shippingCost: parseFloat(shippingCost),
        currencyCode,
        shipmentType,
        incoterms,
        transportMode
      });

      if (!result) {
        return res.status(422).json({
          message: "Could not calculate UPS Landed Cost for the provided data",
          error: "Service returned null result"
        });
      }

      if (!result.success) {
        return res.status(422).json({
          message: "UPS Landed Cost calculation failed",
          error: result.error
        });
      }

      console.log('[UPS LANDED COST] Calculation successful:', {
        duties: result.duties,
        taxes: result.taxes,
        vat: result.vat,
        brokerageFees: result.brokerageFees,
        totalDutyAndTax: result.totalDutyAndTax,
        grandTotal: result.grandTotal,
        currency: result.currency,
        transactionId: result.transactionId
      });

      // Return the response
      res.json(result);

    } catch (error) {
      console.error("UPS Landed Cost calculation error:", error);
      res.status(500).json({
        message: "Internal server error during UPS Landed Cost calculation",
        error: (error as Error).message,
      });
    }
  });

  // Get countries endpoint (helper for tax calculations)
  app.get("/api/countries", async (req, res) => {
    try {
      console.log('🌍 Fetching countries from Easyship...');
      
      // Get all countries with pagination
      let allCountries: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await fetch(`https://public-api.easyship.com/2024-09/countries?page=${page}`, {
          headers: {
            'Authorization': `Bearer ${process.env.EASYSHIP_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`[EASYSHIP] Countries API error: ${response.status}`);
          return res.status(response.status).json({
            message: "Failed to fetch countries",
            error: `API returned ${response.status}`
          });
        }

        const data = await response.json();
        allCountries = allCountries.concat(data.countries);
        
        // Check if there are more pages
        hasMore = data.meta.pagination.next !== null;
        page++;
      }
      
      console.log(`🌍 Retrieved ${allCountries.length} countries from Easyship`);
      
      // Return countries sorted by name for easy lookup
      const sortedCountries = allCountries.sort((a, b) => a.name.localeCompare(b.name));
      
      res.json({
        countries: sortedCountries,
        total: sortedCountries.length
      });

    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({
        message: "Internal server error while fetching countries",
        error: (error as Error).message,
      });
    }
  });

  // Return Management Routes
  const returnController = await import("./controllers/returnController");

  // Return CRUD operations
  app.post(
    "/api/returns",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.createReturn,
  );
  app.get(
    "/api/returns",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.getReturns,
  );
  app.get(
    "/api/admin/returns",
    authenticateToken,
    isAdmin,
    returnController.getAdminReturns,
  );
  app.get(
    "/api/returns/filter",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.getReturnsByFilter,
  );
  app.get(
    "/api/returns/report",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.getReturnsReport,
  );
  app.get(
    "/api/returns/:id",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.getReturn,
  );
  app.patch(
    "/api/returns/:id",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.updateReturn,
  );
  
  // Admin-specific return status update
  app.patch(
    "/api/admin/returns/:id/status",
    authenticateToken,
    isAdmin,
    returnController.updateReturn,
  );
  
  // Admin-specific return notes update
  app.patch(
    "/api/admin/returns/:id/notes",
    authenticateToken,
    isAdmin,
    returnController.updateReturn,
  );
  
  // Photo upload for returns (admin only)
  app.post(
    "/api/admin/returns/:id/photos",
    authenticateToken,
    isAdmin,
    returnController.upload.array('photos', 10), // Allow up to 10 photos
    returnController.uploadReturnPhotos,
  );
  
  // Get photos for a return
  app.get(
    "/api/returns/:id/photos",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.getReturnPhotos,
  );
  
  // Delete a return photo
  app.delete(
    "/api/returns/photos/:photoId",
    authenticateToken,
    hasReturnSystemAccess,
    returnController.deleteReturnPhoto,
  );
  
  // Skip delete endpoint temporarily due to missing controller function

  // Mount billing reminder routes
  app.use("/api/billing-reminders", billingReminderRoutes);
  
  // Mount Etsy integration routes
  app.use("/api/etsy", etsyRoutes);
  
  // Mount Etsy import routes (Chrome extension)
  const etsyImportRoutes = setupEtsyImportRoutes(storage);
  app.use("/api/etsy-import", etsyImportRoutes);
  
  // Mount Email integration routes
  app.use("/api/email", emailRoutes);

  // USITC Duty Rate API endpoint for HS code duty rates
  app.get("/api/duty-rates/usitc", async (req, res) => {
    try {
      console.log('[USITC ROUTE] Handling duty rate request:', req.query);
      return await getUSITCDutyRate(req, res);
    } catch (error) {
      console.error('[USITC ROUTE] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // MoogShip pricing options endpoint
  app.post("/api/pricing/moogship-options", authenticateToken, async (req, res) => {
    try {
      console.log('💰 MoogShip pricing options requested:', req.body);
      console.log('💰 DEBUG: Product fields received:', { 
        productName: req.body.productName, 
        productDescription: req.body.productDescription, 
        hsCode: req.body.hsCode,
        hsCodeType: typeof req.body.hsCode,
        hsCodeLength: req.body.hsCode ? req.body.hsCode.length : 0,
        customsValue: req.body.customsValue 
      });
      
      const {
        packageLength,
        packageWidth, 
        packageHeight,
        packageWeight,
        receiverCountry,
        userId,
        hsCode,
        customsValue,
        productName,
        productDescription,
        insurance,
        insuranceValue
      } = req.body;

      // Validate required fields
      if (!packageLength || !packageWidth || !packageHeight || !packageWeight || !receiverCountry) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields for pricing calculation"
        });
      }

      // Import the pricing service
      const { calculateMoogShipPricing } = await import('./services/moogship-pricing');
      
      // Get user multiplier (if admin is creating for a customer, use customer's multiplier)
      let userMultiplier = 1.0;
      if (userId && req.user?.role === 'admin') {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            userMultiplier = user.priceMultiplier || 1.0;
            console.log(`💰 Using customer multiplier: ${userMultiplier} for user ID ${userId}`);
          }
        } catch (err) {
          console.log(`⚠️ Could not get user multiplier for user ${userId}, using default 1.0`);
        }
      } else if (req.user?.role !== 'admin') {
        userMultiplier = req.user?.priceMultiplier || 1.25;
        console.log(`💰 Using user multiplier: ${userMultiplier} for user ${req.user?.username}`);
      }

      // Calculate insurance cost if insurance is requested
      let insuranceCost = 0;
      if (insurance && insuranceValue) {
        try {
          // Get insurance ranges from database
          const insuranceRanges = await storage.getActiveInsuranceRanges();
          
          // Find the appropriate range for the value
          const applicableRange = insuranceRanges.find(range => 
            insuranceValue >= range.minValue && insuranceValue <= range.maxValue
          );
          
          if (applicableRange) {
            insuranceCost = applicableRange.insuranceCost;
            console.log(`💰 Insurance: Found range for value ${insuranceValue}, cost: ${insuranceCost}`);
          } else {
            // Default calculation if no range found (2% of value with minimum $5)
            insuranceCost = Math.max(Math.round(insuranceValue * 0.02), 500); // 2% minimum $5
            console.log(`💰 Insurance: No range found for value ${insuranceValue}, using default: ${insuranceCost}`);
          }
        } catch (error) {
          console.error('❌ Error calculating insurance:', error);
          // Fallback to default calculation
          insuranceCost = Math.max(Math.round(insuranceValue * 0.02), 500);
        }
      }

      // Calculate pricing options
      const pricingResult = await calculateMoogShipPricing(
        parseFloat(packageLength),
        parseFloat(packageWidth),
        parseFloat(packageHeight),
        parseFloat(packageWeight),
        receiverCountry,
        userMultiplier
      );

      console.log('💰 MoogShip pricing result:', pricingResult.success, 'options:', pricingResult.options?.length);

      if (pricingResult.success && pricingResult.options?.length > 0) {
        // Calculate duties and taxes for international shipments
        let dutiesData = null;
        
        try {
          // Check if this is an international shipment (not domestic)
          const senderCountry = "TR"; // Default sender country (Turkey)
          const destinationCountry = receiverCountry;
          
          if (senderCountry !== destinationCountry && (destinationCountry === 'US' || destinationCountry === 'USA')) {
            console.log(`💰 Calculating duties for US destination: ${senderCountry} → ${destinationCountry}`);
            
            // Use provided customs value or estimate based on weight: $50 per kg
            // Convert cents to dollars if customsValue is provided (frontend sends in cents)
            const estimatedValue = customsValue ? parseFloat(customsValue) / 100 : parseFloat(packageWeight) * 50;
            const packageVolume = parseFloat(packageLength) * parseFloat(packageWidth) * parseFloat(packageHeight);
            
            // Prepare items for duty calculation with user-provided information
            const productDesc = productDescription || productName || 'General merchandise';
            const items = [{
              description: productDesc,
              value: estimatedValue,
              originCountryCode: senderCountry,
              hsCode: hsCode || undefined // Use provided HS code if available
            }];
            
            console.log(`💰 Product: "${productDesc}", HS Code: ${hsCode || 'auto-detect'}`);
            
            console.log(`💰 Using HS code: ${hsCode || 'auto-detect'}, Customs value: $${estimatedValue}`);
            console.log(`💰 Request body received:`, { hsCode, customsValue, receiverCountry });
            
            // Use the first (usually cheapest) shipping option for duty calculation
            const firstOption = pricingResult.options[0];
            const shippingCostInDollars = (firstOption?.totalPrice || 0) / 100;
            
            // Use USITC parser for duty calculations instead of OpenAI
            try {
              const USITCDutyService = (await import('./services/usitc-duty-rates')).default;
              const usitcService = new USITCDutyService();
              
              console.log(`💰 Using USITC parser for duty calculation: "${productDesc}" from ${senderCountry} to ${destinationCountry}`);
              console.log(`💰 Using HS code: ${hsCode || 'none'}, Customs value: $${estimatedValue}`);
              console.log(`💰 DEBUG HS Code validation:`, {
                hsCode: hsCode,
                hsCodeType: typeof hsCode,
                hsCodeLength: hsCode ? hsCode.length : 0,
                trimmedLength: hsCode ? hsCode.trim().length : 0,
                isValid: hsCode && hsCode.trim() !== ''
              });
              
              // Only call USITC service if we have a valid HS code
              let usitcResult = null;
              
              // TEMPORARY DEBUG: Force HS code processing to see what happens
              console.log(`💰 TEMP DEBUG: Forcing HS code processing for debugging...`);
              if (hsCode && typeof hsCode === 'string' && hsCode.trim().length > 0) {
                usitcResult = await usitcService.getDutyRateAndAmount(
                  hsCode, 
                  estimatedValue
                );
              } else {
                console.log(`💰 No HS code provided, using default Trump tariff only`);
                // When no HS code is provided, apply only Trump tariff (15%) 
                const trumpTariffAmount = estimatedValue * 0.15;
                usitcResult = {
                  dutyRate: { text: '15%', percentage: 0.15 },
                  dutyAmount: trumpTariffAmount,
                  baseDutyAmount: 0,
                  trumpTariffAmount: trumpTariffAmount,
                  trumpTariff: { included: true, rate: '15.0%', note: 'Trump economic tariffs applied (no HS code provided)' }
                };
              }
              
              // USITC service now always returns result with Trump tariff, even if base rate is 0
              if (usitcResult.dutyRate) {
                const totalDuties = usitcResult.dutyAmount || 0;
                const baseDuties = usitcResult.baseDutyAmount || 0;
                const trumpTariff = usitcResult.trumpTariffAmount || 0;
                const taxes = 0; // USITC doesn't calculate separate tax
                const vat = 0; // USITC doesn't calculate VAT
                
                // All data is now from official USITC sources
                const source = 'official';
                
                dutiesData = {
                  available: true,
                  provider: 'USITC',
                  estimatedDuty: totalDuties,
                  tax: Math.round(taxes * 100), // Convert to cents
                  duty: Math.round(totalDuties * 100), // Convert to cents
                  vat: Math.round(vat * 100), // Convert to cents
                  total: Math.round(totalDuties * 100), // Convert to cents
                  
                  // Trump tariff breakdown
                  baseDutyAmount: Math.round(baseDuties * 100), // Base duty in cents
                  trumpTariffAmount: Math.round(trumpTariff * 100), // Trump tariff in cents
                  baseDutyRate: usitcResult.baseDutyRate,
                  trumpTariffRate: usitcResult.trumpTariffRate,
                  totalDutyRate: usitcResult.totalDutyRate,
                  
                  taxFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(taxes),
                  dutyFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(totalDuties),
                  vatFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(vat),
                  totalFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(totalDuties),
                  
                  // Formatted Trump tariff breakdown
                  baseDutyFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(baseDuties),
                  trumpTariffFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(trumpTariff),
                  
                  customsValue: estimatedValue,
                  dutyRate: usitcResult.totalDutyRate, // Show total rate
                  hsCode: hsCode,
                  source: source,
                  message: `Base duty: ${(usitcResult.baseDutyRate * 100).toFixed(1)}% + Trump tariff: 15.0% = Total: ${(usitcResult.totalDutyRate * 100).toFixed(1)}%`,
                  note: source === 'official' 
                    ? 'Official USITC duty rates with Trump economic tariffs. Final amounts may vary.'
                    : 'Fallback duty rates with Trump economic tariffs. Final amounts may vary.'
                };
                
                console.log(`💰 USITC calculated duties: Base=${(usitcResult.baseDutyRate * 100).toFixed(1)}% ($${baseDuties.toFixed(2)}) + Trump=15.0% ($${trumpTariff.toFixed(2)}) = Total=${(usitcResult.totalDutyRate * 100).toFixed(1)}% ($${totalDuties.toFixed(2)}) (${source})`);
              } else {
                throw new Error('USITC duty calculation failed - no duty rate found');
              }
            } catch (usitcError) {
              console.error('💰 USITC duty calculation failed, falling back to Easyship:', usitcError);
              
              // Fallback to Easyship if ChatGPT fails
              const dutiesCalculation = await easyshipService.calculateTaxesAndDuties({
                originCountryCode: senderCountry,
                destinationCountryCode: destinationCountry,
                items: items,
                shippingCost: shippingCostInDollars,
                insuranceFee: 0
              });
              
              if (dutiesCalculation) {
                dutiesData = {
                  available: true,
                  tax: Math.round(dutiesCalculation.tax * 100), // Convert to cents
                  duty: Math.round(dutiesCalculation.duty * 100), // Convert to cents
                  total: Math.round(dutiesCalculation.total * 100), // Convert to cents
                  taxFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(dutiesCalculation.tax),
                  dutyFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(dutiesCalculation.duty),
                  totalFormatted: new Intl.NumberFormat('en-US', { 
                    style: 'currency', 
                    currency: 'USD' 
                  }).format(dutiesCalculation.total),
                  customsValue: estimatedValue,
                  note: 'Fallback duties and taxes calculated by Easyship. Final amounts may vary.'
                };
                
                console.log(`💰 Easyship fallback calculated: Tax=$${dutiesCalculation.tax}, Duty=$${dutiesCalculation.duty}, Total=$${dutiesCalculation.total}`);
              } else {
                dutiesData = {
                  available: false,
                  message: 'Duties calculation not available for this destination'
                };
              }
            }
          } else {
            dutiesData = {
              available: false,
              message: 'No duties required for domestic shipments'
            };
          }
        } catch (error) {
          console.error('💰 Error calculating duties:', error);
          dutiesData = {
            available: false,
            message: 'Error calculating duties and taxes'
          };
        }

        // Add insurance information to the response if insurance was calculated
        const responseOptions = insuranceCost > 0 ? 
          pricingResult.options.map(option => ({
            ...option,
            insuranceCost: insuranceCost,
            totalPrice: option.totalPrice + insuranceCost,
            hasInsurance: true
          })) : pricingResult.options;
        
        res.json({
          success: true,
          options: responseOptions,
          currency: "USD",
          duties: dutiesData,
          insurance: insuranceCost > 0 ? {
            cost: insuranceCost,
            value: insuranceValue,
            included: true
          } : null
        });
      } else {
        console.error('💰 MoogShip pricing failed:', pricingResult.error);
        res.status(500).json({
          success: false,
          message: "Failed to calculate pricing options",
          error: pricingResult.error
        });
      }
      
    } catch (error) {
      console.error("Error calculating MoogShip pricing options:", error);
      res.status(500).json({
        success: false,
        message: "Error calculating pricing options"
      });
    }
  });

  // Public MoogShip pricing options endpoint for marketing calculator
  app.post("/api/pricing/moogship-options-public", async (req, res) => {
    try {
      console.log('💰 Public MoogShip pricing options requested:', req.body);
      
      const {
        packageLength,
        packageWidth, 
        packageHeight,
        packageWeight,
        receiverCountry
      } = req.body;

      // Validate required fields
      if (!packageLength || !packageWidth || !packageHeight || !packageWeight || !receiverCountry) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields for pricing calculation"
        });
      }

      // Import the pricing service
      const { calculateMoogShipPricing } = await import('./services/moogship-pricing');
      
      // Use 1.0 multiplier for public pricing (no markup)
      const userMultiplier = 1.0;
      console.log(`💰 Using public multiplier: ${userMultiplier}`);

      // Calculate pricing options
      const pricingResult = await calculateMoogShipPricing(
        parseFloat(packageLength),
        parseFloat(packageWidth),
        parseFloat(packageHeight),
        parseFloat(packageWeight),
        receiverCountry,
        userMultiplier
      );

      console.log('💰 Public MoogShip pricing result:', pricingResult.success, 'options:', pricingResult.options?.length);

      if (pricingResult.success && pricingResult.options?.length > 0) {
        res.json({
          success: true,
          options: pricingResult.options,
          currency: "USD"
        });
      } else {
        console.error('💰 Public MoogShip pricing failed:', pricingResult.error);
        res.status(500).json({
          success: false,
          message: "Failed to calculate pricing options",
          error: pricingResult.error
        });
      }
      
    } catch (error) {
      console.error("Error calculating public MoogShip pricing options:", error);
      res.status(500).json({
        success: false,
        message: "Error calculating pricing options"
      });
    }
  });

  // Recipients routes - Get user's recipients for shipment creation
  app.get("/api/recipients", authenticateToken, async (req, res) => {
    try {
      console.log('📦 Getting recipients for user:', req.user?.id);
      const recipients = await storage.getRecipients(req.user!.id);
      console.log('📦 Found recipients:', recipients.length);
      res.json(recipients);
    } catch (error) {
      console.error("Error getting recipients:", error);
      res.status(500).json({ message: "Error retrieving recipients" });
    }
  });

  // Public diagnostics endpoint for debugging
  app.get("/public-diagnostics", async (req, res) => {
    try {
      console.log("[DIAGNOSTICS] Public diagnostics endpoint called");

      // Test direct database connection
      const userCount = await storage.getAllUsers();
      console.log(
        "[DIAGNOSTICS] Direct storage call returned:",
        userCount.length,
        "users",
      );

      // Test raw SQL query
      const { db } = await import("./db.js");
      const { sql } = await import("drizzle-orm");
      const rawCount = await db.execute(
        sql`SELECT COUNT(*) as count FROM users`,
      );
      console.log("[DIAGNOSTICS] Raw SQL query result:", rawCount);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_exists: !!process.env.DATABASE_URL,
          DATABASE_URL_length: process.env.DATABASE_URL?.length,
          DATABASE_URL_hostname: process.env.DATABASE_URL
            ? new URL(process.env.DATABASE_URL).hostname
            : "undefined",
          REPL_ID: process.env.REPL_ID || "undefined",
        },
        storage_users_count: userCount.length,
        raw_sql_count: rawCount.rows[0]?.count,
      });
    } catch (error) {
      console.error("[DIAGNOSTICS] Public diagnostics error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          DATABASE_URL_exists: !!process.env.DATABASE_URL,
          REPL_ID: process.env.REPL_ID || "undefined",
        },
      });
    }
  });

  const httpServer = createServer(app);

  // Set up WebSocket server for real-time duty calculation updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store WebSocket connections by session ID
  const wsConnections = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    console.log('[WS] New WebSocket connection established');
    
    // Handle incoming messages to register session ID
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'register' && data.sessionId) {
          wsConnections.set(data.sessionId, ws);
          console.log(`[WS] Registered session ${data.sessionId} for duty updates`);
          
          // Send confirmation
          ws.send(JSON.stringify({
            type: 'registered',
            sessionId: data.sessionId
          }));
        }
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    });

    // Clean up on connection close
    ws.on('close', () => {
      // Remove from all sessions (client could be registered with multiple sessions)
      for (const [sessionId, connection] of wsConnections.entries()) {
        if (connection === ws) {
          wsConnections.delete(sessionId);
          console.log(`[WS] Removed session ${sessionId} on connection close`);
        }
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
    });
  });

  // Add endpoint for quick duty calculation in bulk upload
  app.post("/api/calculate-duty", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { hsCode, customsValue, shippingTerms, shippingMethod } = req.body;
      
      if (!hsCode || !customsValue || shippingTerms !== 'ddp') {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters or invalid shipping terms'
        });
      }

      // Import duty calculation service
      const { default: USITCDutyService } = await import('./services/usitc-duty-rates');
      const usitcService = new USITCDutyService();
      
      // Calculate duties using USITC rates
      const dutyLookup = await usitcService.getDutyRate(hsCode);
      
      if (dutyLookup && dutyLookup.dutyPercentage !== null) {
        const customsValueInDollars = customsValue / 100;
        const baseDuty = customsValueInDollars * (dutyLookup.dutyPercentage / 100);
        const trumpTariff = 0; // Would be calculated separately if applicable
        const totalDuty = baseDuty + trumpTariff;
        // ECO shipping: $0.45, Standard shipping: $4.50
        const ddpProcessingFee = shippingMethod === 'eco' ? 0.45 : 4.50;
        
        return res.json({
          available: true,
          totalDutyAmount: totalDuty,
          formattedTotalWithDDPFee: `$${(totalDuty + ddpProcessingFee).toFixed(2)}`,
          dutyPercentage: dutyLookup.dutyPercentage,
          customsValue: customsValueInDollars,
          baseDuty,
          trumpTariff,
          ddpProcessingFee
        });
      } else {
        return res.json({
          available: false,
          message: 'No duty rate found for this HS code'
        });
      }
    } catch (error) {
      console.error('Error calculating duty:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating duty'
      });
    }
  });

  // Add endpoint for bulk DDP calculation in bulk upload table
  app.post("/api/calculate-bulk-ddp", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { shipments, userId } = req.body;
      
      if (!Array.isArray(shipments) || !userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: shipments array and userId'
        });
      }

      // Import duty calculation service
      const { default: USITCDutyService } = await import('./services/usitc-duty-rates');
      const usitcService = new USITCDutyService();
      
      const ddpCalculations = [];
      let totalDdpAmount = 0;

      for (const shipment of shipments) {
        if (!shipment.gtip || !shipment.customsValue) {
          ddpCalculations.push({
            shipmentIndex: shipment.index,
            available: false,
            message: 'Missing HS code or customs value'
          });
          continue;
        }

        try {
          // For US shipments, use 23.3% total duty rate (10% base HS + 13.3% Trump tariff)
          const customsValueInDollars = shipment.customsValue / 100;
          
          // Split duties: 10% base HS tax, 13.3% Trump tariff
          const baseHSRate = 0.10; // 10% base HS tax
          const trumpTariffRate = 0.133; // 13.3% Trump tariff
          const totalDutyRate = 0.233; // 23.3% total
          
          const baseDuty = customsValueInDollars * baseHSRate;
          const trumpTariff = customsValueInDollars * trumpTariffRate;
          const totalDuty = baseDuty + trumpTariff;
          // Check if the shipment uses ECO shipping by looking at selectedService
          const isEcoShipping = shipment.selectedService && 
            (shipment.selectedService.toLowerCase().includes('eko') || 
             shipment.selectedService.toLowerCase().includes('eco'));
          // ECO shipping: $0.45, Standard shipping: $4.50
          const ddpProcessingFee = isEcoShipping ? 0.45 : 4.50;
          const totalWithFee = totalDuty + ddpProcessingFee;
          
          ddpCalculations.push({
            shipmentIndex: shipment.index,
            available: true,
            totalDutyAmount: totalDuty,
            totalWithProcessingFee: totalWithFee,
            formattedTotal: `$${totalWithFee.toFixed(2)}`,
            dutyPercentage: totalDutyRate * 100, // Convert to percentage
            customsValue: customsValueInDollars,
            baseDuty,
            trumpTariff,
            ddpProcessingFee,
            hsCode: shipment.gtip,
            // Add split duties in cents for database storage
            ddpBaseDutiesAmount: Math.round(baseDuty * 100), // Base HS tax in cents
            ddpTrumpTariffsAmount: Math.round(trumpTariff * 100), // Trump tariff in cents
            ddpProcessingFeeInCents: Math.round(ddpProcessingFee * 100) // DDP processing fee in cents (45 for ECO, 450 for standard)
          });
          
          totalDdpAmount += totalWithFee;
        } catch (error) {
          console.error(`Error calculating DDP for shipment ${shipment.index}:`, error);
          ddpCalculations.push({
            shipmentIndex: shipment.index,
            available: false,
            message: 'Error calculating DDP for this item'
          });
        }
      }

      // Get user's current balance to check if they can afford DDP
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const totalDdpInCents = Math.round(totalDdpAmount * 100);
      const canAfford = user.balance >= totalDdpInCents;

      res.json({
        success: true,
        calculations: ddpCalculations,
        totalDdpAmount: totalDdpAmount,
        totalDdpAmountFormatted: `$${totalDdpAmount.toFixed(2)}`,
        totalDdpInCents,
        userBalance: user.balance,
        userBalanceFormatted: `$${(user.balance / 100).toFixed(2)}`,
        canAfford,
        balanceAfterDdp: user.balance - totalDdpInCents,
        balanceAfterDdpFormatted: `$${((user.balance - totalDdpInCents) / 100).toFixed(2)}`
      });
    } catch (error) {
      console.error('Error calculating bulk DDP:', error);
      res.status(500).json({
        success: false,
        message: 'Error calculating bulk DDP'
      });
    }
  });

  // Add endpoint to deduct DDP from user balance
  app.post("/api/deduct-ddp-balance", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { userId, ddpAmount, shipmentDetails } = req.body;
      
      if (!userId || !ddpAmount || !Array.isArray(shipmentDetails)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId, ddpAmount, and shipmentDetails'
        });
      }

      const ddpAmountInCents = Math.round(ddpAmount * 100);
      
      // Deduct DDP amount from user balance
      const updatedUser = await storage.updateUserBalance(userId, -ddpAmountInCents);
      
      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          message: 'Failed to deduct DDP amount from balance'
        });
      }

      // Log the DDP transaction
      console.log(`[DDP] Deducted $${ddpAmount.toFixed(2)} from user ${userId} balance for DDP calculation`);
      console.log(`[DDP] Processed ${shipmentDetails.length} shipments with HS codes`);
      
      res.json({
        success: true,
        message: `DDP amount of $${ddpAmount.toFixed(2)} deducted from balance`,
        newBalance: updatedUser.balance,
        newBalanceFormatted: `$${(updatedUser.balance / 100).toFixed(2)}`,
        ddpAmountDeducted: ddpAmount,
        ddpAmountDeductedFormatted: `$${ddpAmount.toFixed(2)}`,
        processedShipments: shipmentDetails.length
      });
    } catch (error) {
      console.error('Error deducting DDP from balance:', error);
      
      if (error.message && error.message.includes('minimum limit')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Error deducting DDP from balance'
      });
    }
  });

  // Add endpoint to check duty calculation job status
  app.get("/api/duty-job/:jobId", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { dutyJobProcessor } = await import("./services/duty-job-processor");
      
      const job = await dutyJobProcessor.getJobStatus(jobId);
      
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }
      
      res.json({
        success: true,
        job: {
          id: job.jobId,
          status: job.status,
          provider: job.provider,
          result: job.resultData,
          error: job.errorMessage,
          processingTime: job.processingTime,
          createdAt: job.createdAt,
          completedAt: job.completedAt
        }
      });
    } catch (error) {
      console.error('Error fetching duty job status:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching job status'
      });
    }
  });

  // Export WebSocket notification function for duty job processor
  global.notifyDutyCalculationUpdate = (sessionId: string, jobId: string, result: any, error?: string) => {
    const ws = wsConnections.get(sessionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'duty_calculation_update',
          jobId,
          result,
          error,
          timestamp: new Date().toISOString()
        }));
        console.log(`[WS] Sent duty calculation update for job ${jobId} to session ${sessionId}`);
      } catch (error) {
        console.error(`[WS] Error sending duty update to session ${sessionId}:`, error);
      }
    } else {
      console.log(`[WS] No active connection for session ${sessionId}, skipping duty update`);
    }
  };

  // =========== Admin Tracking & Notification Management ===========
  
  // Get notification logs for admin tracking page
  app.get("/api/admin/notification-logs", authenticateToken, isAdmin, async (req, res) => {
    try {
      const logs = await storage.getNotificationLogs(100); // Get last 100 logs
      res.json(logs);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
      res.status(500).json({ message: 'Failed to fetch notification logs' });
    }
  });

  // Get tracking scheduler status
  app.get("/api/admin/tracking-scheduler/status", authenticateToken, isAdmin, async (req, res) => {
    try {
      // Return scheduler status (mock data for now - can be enhanced to track actual status)
      const status = {
        isRunning: true, // Always running in background
        nextSync: new Date(Date.now() + 3600000).toISOString(), // Next hour
        lastSync: new Date().toISOString(),
        syncCount: 12, // Mock data
        errors: 2
      };
      res.json(status);
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
      res.status(500).json({ message: 'Failed to fetch scheduler status' });
    }
  });

  // Control tracking scheduler
  app.post("/api/admin/tracking-scheduler/:action", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { action } = req.params;
      
      if (action === "start") {
        const { startTrackingScheduler } = await import("./services/trackingScheduler");
        startTrackingScheduler();
        res.json({ success: true, message: "Tracking scheduler started" });
      } else if (action === "stop") {
        const { stopTrackingScheduler } = await import("./services/trackingScheduler");
        stopTrackingScheduler();
        res.json({ success: true, message: "Tracking scheduler stopped" });
      } else if (action === "sync") {
        const { syncAllTrackingData } = await import("./services/trackingScheduler");
        // Run sync in background
        syncAllTrackingData().catch(error => {
          console.error("Manual tracking sync failed:", error);
        });
        res.json({ success: true, message: "Manual tracking sync initiated" });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } catch (error) {
      console.error(`Error ${req.params.action} tracking scheduler:`, error);
      res.status(500).json({ message: `Failed to ${req.params.action} tracking scheduler` });
    }
  });

  // API endpoint to manually close/open tracking for individual shipments
  app.patch("/api/admin/shipments/:id/tracking-status", authenticateToken, isAdmin, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.id);
      const { trackingClosed, trackingCloseReason } = req.body;

      console.log('[API] Tracking status update request:', {
        shipmentId,
        trackingClosed,
        trackingCloseReason: trackingCloseReason?.trim()
      });

      if (typeof trackingClosed !== "boolean") {
        return res.status(400).json({ error: "trackingClosed must be a boolean value" });
      }

      // If closing tracking, require a reason
      if (trackingClosed && (!trackingCloseReason || trackingCloseReason.trim() === "")) {
        return res.status(400).json({ error: "Reason is required when closing tracking" });
      }

      const updateData = {
        trackingClosed,
        trackingCloseReason: trackingClosed ? trackingCloseReason.trim() : null, // Clear reason when opening
        updatedAt: new Date()
      };

      console.log('[API] About to update shipment with data:', updateData);

      const updatedShipment = await storage.updateShipment(shipmentId, updateData);

      if (!updatedShipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      console.log('[API] Updated shipment result:', {
        id: updatedShipment.id,
        trackingClosed: updatedShipment.trackingClosed,
        trackingCloseReason: updatedShipment.trackingCloseReason
      });

      const statusText = trackingClosed ? "closed" : "opened";
      const reasonText = trackingClosed && trackingCloseReason ? ` (Reason: ${trackingCloseReason})` : "";
      console.log(`Admin ${trackingClosed ? "closed" : "opened"} tracking for shipment ${shipmentId}${reasonText}`);
      
      res.json({ 
        success: true, 
        message: `Tracking ${statusText} for shipment ${shipmentId}`,
        shipment: {
          id: updatedShipment.id,
          trackingClosed: updatedShipment.trackingClosed,
          trackingCloseReason: updatedShipment.trackingCloseReason
        }
      });
    } catch (error) {
      console.error("Error updating tracking status:", error);
      res.status(500).json({ error: "Failed to update tracking status" });
    }
  });

  // Admin price adjustment endpoint
  app.patch("/api/admin/shipments/:id/price", authenticateToken, isAdmin, async (req, res) => {
    try {
      const shipmentId = parseInt(req.params.id);
      const { newPrice } = req.body;

      console.log('[API] Admin price adjustment request:', {
        shipmentId,
        newPrice,
        adminId: req.user?.id
      });

      if (typeof newPrice !== "number" || newPrice < 0) {
        return res.status(400).json({ error: "newPrice must be a positive number" });
      }

      // Get the current shipment
      const shipment = await storage.getShipment(shipmentId);
      if (!shipment) {
        return res.status(404).json({ error: "Shipment not found" });
      }

      // Convert newPrice to cents (assuming input is in dollars)
      const newPriceCents = Math.round(newPrice * 100);
      const currentTotalPrice = shipment.totalPrice || 0;
      const priceDifference = newPriceCents - currentTotalPrice;

      console.log('[API] Price adjustment calculation:', {
        currentPrice: currentTotalPrice,
        newPrice: newPriceCents,
        difference: priceDifference
      });

      // Update the shipment price
      const updatedShipment = await storage.updateShipment(shipmentId, {
        totalPrice: newPriceCents,
        updatedAt: new Date()
      });

      if (!updatedShipment) {
        return res.status(500).json({ error: "Failed to update shipment price" });
      }

      // Create transaction and adjust user balance if there's a price difference
      if (priceDifference !== 0) {
        // If price decreased (priceDifference is negative), user gets a refund (positive amount)
        // If price increased (priceDifference is positive), user gets charged (negative amount)
        const balanceAdjustment = -priceDifference;
        
        const transactionDescription = priceDifference > 0 
          ? `Admin price increase for shipment ${shipmentId} (+$${(priceDifference / 100).toFixed(2)})`
          : `Admin price decrease refund for shipment ${shipmentId} (+$${(Math.abs(priceDifference) / 100).toFixed(2)})`;

        // Create transaction record
        await storage.createTransaction(
          shipment.userId,
          balanceAdjustment,
          transactionDescription,
          shipmentId
        );

        // Update user balance
        await storage.updateUserBalance(shipment.userId, balanceAdjustment);

        console.log('[API] Balance adjustment completed:', {
          userId: shipment.userId,
          balanceAdjustment,
          description: transactionDescription
        });
      }

      console.log(`Admin ${req.user?.username} adjusted price for shipment ${shipmentId} from $${(currentTotalPrice / 100).toFixed(2)} to $${(newPriceCents / 100).toFixed(2)}`);
      
      res.json({ 
        success: true, 
        message: `Price updated for shipment ${shipmentId}`,
        shipment: {
          id: updatedShipment.id,
          totalPrice: updatedShipment.totalPrice,
          priceDifference: priceDifference,
          balanceAdjustment: priceDifference !== 0 ? -priceDifference : 0
        }
      });
    } catch (error) {
      console.error("Error updating shipment price:", error);
      res.status(500).json({ error: "Failed to update shipment price" });
    }
  });

  // Send manual notification
  app.post("/api/admin/send-notification", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { notificationType, shipmentId, userId, customSubject, customMessage, recipients } = req.body;
      
      if (!notificationType) {
        return res.status(400).json({ message: "Notification type is required" });
      }

      let result = { success: false, message: "Unknown notification type" };

      // Handle different notification types
      switch (notificationType) {
        case "delivery": {
          if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID is required for delivery notifications" });
          }
          const shipment = await storage.getShipment(parseInt(shipmentId));
          const user = await storage.getUser(shipment.userId);
          if (shipment && user) {
            const { sendDeliveryNotification } = await import("./notification-emails");
            result = await sendDeliveryNotification(shipment, user);
          }
          break;
        }
        case "tracking-exception": {
          if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID is required for tracking exception notifications" });
          }
          const shipment = await storage.getShipment(parseInt(shipmentId));
          const user = await storage.getUser(shipment.userId);
          if (shipment && user) {
            const { sendTrackingExceptionNotification } = await import("./notification-emails");
            result = await sendTrackingExceptionNotification(
              shipment, 
              user, 
              customSubject || "Manual Tracking Exception", 
              customMessage || "Admin-triggered tracking exception notification"
            );
          }
          break;
        }
        case "delivery-issue": {
          if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID is required for delivery issue notifications" });
          }
          const shipment = await storage.getShipment(parseInt(shipmentId));
          const user = await storage.getUser(shipment.userId);
          if (shipment && user) {
            const { sendDeliveryIssueNotification } = await import("./notification-emails");
            result = await sendDeliveryIssueNotification(
              shipment,
              user,
              customSubject || "Manual Delivery Issue",
              customMessage || "Admin-triggered delivery issue notification"
            );
          }
          break;
        }
        case "shipment-approval": {
          if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID is required for shipment approval notifications" });
          }
          const shipment = await storage.getShipment(parseInt(shipmentId));
          const user = await storage.getUser(shipment.userId);
          if (shipment && user) {
            const { sendShipmentApprovalEmail } = await import("./notification-emails");
            result = await sendShipmentApprovalEmail(shipment, user);
          }
          break;
        }
        case "tracking-number": {
          if (!shipmentId) {
            return res.status(400).json({ message: "Shipment ID is required for tracking number notifications" });
          }
          const shipment = await storage.getShipment(parseInt(shipmentId));
          const user = await storage.getUser(shipment.userId);
          if (shipment && user) {
            const { sendTrackingNumberNotification } = await import("./notification-emails");
            result = await sendTrackingNumberNotification(shipment, user);
          }
          break;
        }
        case "user-approval": {
          if (!userId) {
            return res.status(400).json({ message: "User ID is required for user approval notifications" });
          }
          const user = await storage.getUser(parseInt(userId));
          if (user) {
            const { sendUserApprovalEmail } = await import("./notification-emails");
            result = await sendUserApprovalEmail(user);
          }
          break;
        }
      }

      // Log the manual notification
      if (result.success) {
        await storage.logNotification({
          type: notificationType,
          subject: customSubject || `Manual ${notificationType} notification`,
          recipient: recipients || "system-determined",
          status: "sent",
          shipmentId: shipmentId ? parseInt(shipmentId) : undefined,
          userId: userId ? parseInt(userId) : undefined,
          sentBy: req.user!.id,
          templateUsed: notificationType
        });
      }

      if (result.success) {
        res.json({ success: true, message: "Notification sent successfully" });
      } else {
        res.status(500).json({ success: false, message: result.error || "Failed to send notification" });
      }
    } catch (error) {
      console.error('Error sending manual notification:', error);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  // Send test email
  app.post("/api/admin/test-email", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { emailType, testRecipient } = req.body;
      
      if (!emailType || !testRecipient) {
        return res.status(400).json({ message: "Email type and recipient are required" });
      }

      // Create mock data for test emails
      const testShipment = {
        id: 9999,
        userId: 1,
        trackingNumber: "TEST123456789",
        carrierTrackingNumber: "1Z999AA1234567890",
        toName: "Test Recipient",
        toAddress: "123 Test Street",
        toCity: "Test City",
        toCountry: "United States",
        packageContents: "Test Package Contents",
        totalPrice: 5000, // $50.00
        customsValue: 4500, // $45.00
        serviceLevel: "standard",
        status: "delivered",
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const testUser = {
        id: 9999,
        username: "testuser",
        name: "Test User",
        email: testRecipient,
        role: "user",
        balance: 0,
        createdAt: new Date()
      };

      let result = { success: false, message: "Unknown test email type" };

      switch (emailType) {
        case "delivery": {
          const { sendDeliveryNotification } = await import("./notification-emails");
          result = await sendDeliveryNotification(testShipment as any, testUser as any);
          break;
        }
        case "tracking-exception": {
          const { sendTrackingExceptionNotification } = await import("./notification-emails");
          result = await sendTrackingExceptionNotification(
            testShipment as any,
            testUser as any,
            "Test Tracking Exception",
            "This is a test tracking exception notification from the admin panel."
          );
          break;
        }
        case "delivery-issue": {
          const { sendDeliveryIssueNotification } = await import("./notification-emails");
          result = await sendDeliveryIssueNotification(
            testShipment as any,
            testUser as any,
            "Test Delivery Issue",
            "This is a test delivery issue notification from the admin panel."
          );
          break;
        }
        case "customs-charges": {
          const { sendCustomsChargesNotification } = await import("./email");
          result = await sendCustomsChargesNotification({
            id: testShipment.id,
            carrierTrackingNumber: testShipment.carrierTrackingNumber,
            recipientName: testShipment.toName,
            recipientAddress: testShipment.toAddress,
            recipientCity: testShipment.toCity,
            recipientCountry: testShipment.toCountry,
            packageContents: testShipment.packageContents,
            customsValue: testShipment.customsValue,
            estimatedCharges: 1500 // $15.00
          }, testUser as any);
          break;
        }
        case "new-shipment": {
          const { sendNewShipmentNotification } = await import("./notification-emails");
          result = await sendNewShipmentNotification(testShipment as any, testUser as any);
          break;
        }
        case "bulk-shipment": {
          const { sendBulkShipmentApprovalEmail } = await import("./notification-emails");
          result = await sendBulkShipmentApprovalEmail([testShipment] as any, testUser as any);
          break;
        }
      }

      // Log the test email
      await storage.logNotification({
        type: `test-${emailType}`,
        subject: `Test ${emailType} email`,
        recipient: testRecipient,
        status: result.success ? "sent" : "failed",
        error: result.success ? undefined : result.error,
        sentBy: req.user!.id,
        templateUsed: emailType
      });

      if (result.success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: result.error || "Failed to send test email" });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Failed to send test email' });
    }
  });

  // Get users list for admin dropdowns
  app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Return only necessary fields for dropdown
      const userList = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }));
      res.json(userList);
    } catch (error) {
      console.error('Error fetching users list:', error);
      res.status(500).json({ message: 'Failed to fetch users list' });
    }
  });

  // GPT Advisor Routes
  app.post("/api/advisor/chat", authenticateToken, async (req, res) => {
    try {
      const { message, conversationId } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message is required' });
      }

      const userId = req.user!.id;
      let conversation;
      let conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];

      // Load existing conversation or create new one
      if (conversationId) {
        conversation = await storage.getAdvisorConversation(conversationId, userId);
        if (!conversation) {
          return res.status(404).json({ message: 'Conversation not found' });
        }
        conversationHistory = conversation.messages as Array<{role: 'user' | 'assistant', content: string}>;
      }

      // Get advice from GPT
      console.log('[ADVISOR] Importing openai-advisor service...');
      const { getPackagingAndSalesAdvice, generateConversationTitle } = await import("./services/openai-advisor");
      console.log('[ADVISOR] Service imported successfully');
      console.log('[ADVISOR] Calling getPackagingAndSalesAdvice with message:', message.substring(0, 50));
      const advice = await getPackagingAndSalesAdvice(message, conversationHistory);
      console.log('[ADVISOR] Got advice, length:', advice.length);

      // Update conversation history
      const updatedMessages = [
        ...conversationHistory,
        { role: 'user' as const, content: message },
        { role: 'assistant' as const, content: advice }
      ];

      // Save or update conversation
      if (conversationId) {
        conversation = await storage.updateAdvisorConversation(conversationId, userId, {
          messages: updatedMessages,
          updatedAt: new Date()
        });
      } else {
        // Generate title for new conversation
        const title = await generateConversationTitle(message);
        conversation = await storage.createAdvisorConversation({
          userId,
          title,
          messages: updatedMessages
        });
      }

      res.json({
        conversationId: conversation.id,
        message: advice,
        title: conversation.title
      });
    } catch (error: any) {
      console.error('Advisor chat error:', error);
      res.status(500).json({ message: error.message || 'Failed to get advice' });
    }
  });

  // Get user's conversation history
  app.get("/api/advisor/conversations", authenticateToken, async (req, res) => {
    try {
      const userId = req.user!.id;
      const conversations = await storage.getAdvisorConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ message: 'Failed to fetch conversations' });
    }
  });

  // Get a specific conversation
  app.get("/api/advisor/conversations/:id", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const conversation = await storage.getAdvisorConversation(conversationId, userId);
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      res.json(conversation);
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ message: 'Failed to fetch conversation' });
    }
  });

  // Delete a conversation
  app.delete("/api/advisor/conversations/:id", authenticateToken, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      await storage.deleteAdvisorConversation(conversationId, userId);
      res.json({ message: 'Conversation deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      res.status(500).json({ message: 'Failed to delete conversation' });
    }
  });

  return httpServer;
}
