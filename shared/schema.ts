import { pgTable, text, serial, integer, boolean, timestamp, json, real, decimal, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"), // user or admin
  balance: integer("balance").notNull().default(0), // Balance in cents
  minimumBalance: integer("minimum_balance"), // Individual minimum balance limit in cents (null means use system default)
  
  // Pricing configuration
  priceMultiplier: real("price_multiplier").notNull().default(1), // Default to 1.0 (100% of base price)
  pricingMethod: text("pricing_method").notNull().default("default"), // 'default' | 'weight_based' | 'country_based'

  // Company information
  companyName: text("company_name"),
  companyType: text("company_type"), // 'company' or 'individual'
  taxIdNumber: text("tax_id_number"), // Company tax ID or TCKN for individuals
  address: text("address"), // Kept for backward compatibility
  address1: text("address1"), // Primary address line (max 35 chars for ShipEntegra)
  address2: text("address2"), // Secondary address line (optional)
  city: text("city"),
  postalCode: text("postal_code"),
  country: text("country"),
  phone: text("phone"),
  
  // Shipment information
  monthlyShipmentCapacity: integer("monthly_shipment_capacity"),
  shipmentDetails: text("shipment_details"), // Additional details about shipments
  
  // Account status
  isApproved: boolean("is_approved").default(false),
  approvedBy: integer("approved_by"), // ID of admin who approved the account
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  
  // Email verification
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpires: timestamp("email_verification_expires"),
  
  // Password reset
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  
  // Label and shipment privileges
  canAccessCarrierLabels: boolean("can_access_carrier_labels").default(false), // Whether user can access third-party carrier labels
  
  // Return management privileges
  canAccessReturnSystem: boolean("can_access_return_system").default(false), // Whether user can access return management system
  returnSystemGrantedBy: integer("return_system_granted_by"), // Admin ID who granted return access
  returnSystemGrantedAt: timestamp("return_system_granted_at"), // When return access was granted
  
  // Email notification preferences
  emailMarketingCampaigns: boolean("email_marketing_campaigns").default(true), // Opt-in/opt-out for marketing emails
  shipmentStatusUpdates: text("shipment_status_updates").default("immediate"), // immediate, daily_digest, off
  accountNotifications: boolean("account_notifications").default(true), // Account-related notifications on/off
  adminNotifications: boolean("admin_notifications").default(true), // Admin notifications on/off
  trackingDeliveryNotifications: boolean("tracking_delivery_notifications").default(true), // Tracking & delivery notifications
  refundReturnNotifications: boolean("refund_return_notifications").default(true), // Refund & return notifications
  supportTicketNotifications: boolean("support_ticket_notifications").default(true), // Support ticket notifications
  customsNotifications: boolean("customs_notifications").default(true), // Customs charges notifications

  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  approvedBy: true,
  approvedAt: true,
  isApproved: true,
  rejectionReason: true,
  isEmailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpires: true
});

// Create a registration schema with additional validations
export const registrationSchema = insertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  phone: z.string().min(1, "Phone number is required"),
  companyType: z.enum(["company", "individual"], {
    required_error: "Please select account type",
  }),
  taxIdNumber: z.string().min(1, "Tax ID or TCKN is required"),
  
  // Address details - ShipEntegra format
  address1: z.string().max(35, "Address line 1 must be maximum 35 characters")
    .min(5, "Address line 1 must be at least 5 characters"),
  address2: z.string().max(35, "Address line 2 must be maximum 35 characters").optional(),
  city: z.string().min(2, "City is required"),
  postalCode: z.string().min(2, "Postal code is required"),
  country: z.string().min(2, "Country is required"),
  
  monthlyShipmentCapacity: z.number().min(1, "Monthly shipment capacity is required")
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const insuranceRanges = pgTable("insurance_ranges", {
  id: serial("id").primaryKey(),
  minValue: integer("min_value").notNull(), // Minimum value for this range in cents
  maxValue: integer("max_value").notNull(), // Maximum value for this range in cents
  insuranceCost: integer("insurance_cost").notNull(), // Cost of insurance in cents
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull(), // Admin who created this range
}, (table) => {
  return {
    valueRangeIdx: uniqueIndex("value_range_idx").on(table.minValue, table.maxValue)
  };
});

export const insertInsuranceRangeSchema = createInsertSchema(insuranceRanges).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertInsuranceRange = z.infer<typeof insertInsuranceRangeSchema>;
export type InsuranceRange = typeof insuranceRanges.$inferSelect;

// Country-based price multipliers for destination countries
export const countryPriceMultipliers = pgTable("country_price_multipliers", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull().unique(), // ISO country code (e.g., "US", "GB", "TR")
  countryName: text("country_name").notNull(), // Display name (e.g., "United States", "United Kingdom", "Turkey")
  priceMultiplier: real("price_multiplier").notNull().default(1), // Multiplier for this destination country
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull(), // Admin who created this multiplier
});

export const insertCountryPriceMultiplierSchema = createInsertSchema(countryPriceMultipliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertCountryPriceMultiplier = z.infer<typeof insertCountryPriceMultiplierSchema>;
export type CountryPriceMultiplier = typeof countryPriceMultipliers.$inferSelect;

// Weight range-based price multipliers for shipment weights
export const weightRangePriceMultipliers = pgTable("weight_range_price_multipliers", {
  id: serial("id").primaryKey(),
  minWeight: real("min_weight").notNull(), // Minimum weight for this range in kg
  maxWeight: real("max_weight"), // Maximum weight for this range in kg (null means unlimited)
  priceMultiplier: real("price_multiplier").notNull().default(1), // Multiplier for this weight range
  rangeName: text("range_name").notNull(), // Display name (e.g., "Light (0-1kg)", "Medium (1-5kg)", "Heavy (5kg+)")
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull(), // Admin who created this range
}, (table) => {
  return {
    weightRangeIdx: uniqueIndex("weight_price_range_idx").on(table.minWeight, table.maxWeight)
  };
});

export const insertWeightRangePriceMultiplierSchema = createInsertSchema(weightRangePriceMultipliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertWeightRangePriceMultiplier = z.infer<typeof insertWeightRangePriceMultiplierSchema>;
export type WeightRangePriceMultiplier = typeof weightRangePriceMultipliers.$inferSelect;

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  
  // Sender information
  senderName: text("sender_name").notNull(),
  senderAddress: text("sender_address").notNull(), // Kept for backward compatibility
  senderAddress1: text("sender_address1").notNull(), // Primary address line (max 35 chars for ShipEntegra)
  senderAddress2: text("sender_address2"), // Secondary address line (optional)
  senderCity: text("sender_city").notNull(),
  senderPostalCode: text("sender_postal_code").notNull(),
  senderPhone: text("sender_phone").notNull(),
  senderEmail: text("sender_email").notNull(),
  
  // Receiver information
  receiverName: text("receiver_name").notNull(),
  receiverAddress: text("receiver_address").notNull(), // Full address including both lines
  // receiverAddress2 field is kept for backward compatibility but no longer used
  receiverAddress2: text("receiver_address2"), // Will be merged into receiverAddress
  receiverCity: text("receiver_city").notNull(),
  receiverState: text("receiver_state"),
  receiverCountry: text("receiver_country").notNull(),
  receiverPostalCode: text("receiver_postal_code").notNull(),
  receiverPhone: text("receiver_phone").notNull(),
  receiverEmail: text("receiver_email"),
  
  // Package information
  packageLength: integer("package_length").notNull(),
  packageWidth: integer("package_width").notNull(),
  packageHeight: integer("package_height").notNull(),
  packageWeight: real("package_weight").notNull(),
  packageContents: text("package_contents").notNull(),
  pieceCount: integer("piece_count").default(1),

  // Price and service information
  basePrice: integer("base_price"), // Price in cents
  fuelCharge: integer("fuel_charge"), // Fuel surcharge in cents
  additionalFee: integer("additional_fee"), // Additional pass-through fees in cents (not multiplied by user margin)
  taxes: integer("taxes"), // Taxes in cents
  totalPrice: integer("total_price"), // Total price in cents
  
  // Insurance information
  insuranceValue: integer("insurance_value"), // Declared value for insurance in cents
  insuranceCost: integer("insurance_cost"), // Cost of insurance in cents
  isInsured: boolean("is_insured").default(false), // Whether the shipment is insured
  
  // Original prices (before multiplier)
  originalBasePrice: integer("original_base_price"), // Original price from Shipentegra in cents
  originalFuelCharge: integer("original_fuel_charge"), // Original fuel surcharge in cents
  originalAdditionalFee: integer("original_additional_fee"), // Original additional fee in cents (always same as additionalFee since not multiplied)
  originalTotalPrice: integer("original_total_price"), // Original total price in cents
  appliedMultiplier: real("applied_multiplier"), // The multiplier that was applied
  
  currency: text("currency").default("USD"),
  serviceLevel: text("service_level"), // Legacy field for backward compatibility
  selectedService: text("selected_service"), // Full service name from pricing API (e.g., "ShipEntegra Amerika Eko Plus")
  shippingProvider: text("shipping_provider"), // Provider name (e.g., "shipentegra", "dhl", "fedex")
  providerServiceCode: text("provider_service_code"), // Provider's internal service code (e.g., "shipentegra-amerika-eko-plus")
  carrierName: text("carrier_name"), // Display name of the carrier service
  estimatedDeliveryDays: integer("estimated_delivery_days"),
  customerAccepted: boolean("customer_accepted").default(false),
  
  // Shipment status
  status: text("status").notNull().default("pending"), // pending, approved, rejected, in_transit, delivered
  rejectionReason: text("rejection_reason"),
  
  // MoogShip label information
  labelUrl: text("label_url"), // MoogShip's internal label URL
  labelPdf: text("label_pdf"), // Store MoogShip PDF data as base64 encoded string
  trackingNumber: text("tracking_number"), // Moogship's internal tracking number
  
  // Carrier label information
  carrierLabelUrl: text("carrier_label_url"), // Third-party carrier label URL
  carrierLabelPdf: text("carrier_label_pdf"), // Store carrier PDF data as base64 encoded string
  carrierTrackingNumber: text("carrier_tracking_number"), // 3rd party carrier tracking number from ShipEntegra or admin-entered GLS tracking
  
  // Manual tracking information (admin-entered)
  manualTrackingNumber: text("manual_tracking_number"), // Admin-entered manual tracking number
  manualCarrierName: text("manual_carrier_name"), // Admin-entered manual carrier name
  manualTrackingLink: text("manual_tracking_link"), // Admin-entered manual tracking link URL
  
  // AFS Transport specific tracking
  afsBarkod: text("afs_barkod"), // AFS Transport internal barkod for API tracking
  
  // Label processing information
  labelError: text("label_error"), // Error message when label purchase fails
  labelAttempts: integer("label_attempts").default(0), // Number of attempts to purchase a label
  trackingInfo: json("tracking_info"),
  trackingClosed: boolean("tracking_closed").default(false), // Whether admin manually closed tracking for this shipment
  trackingCloseReason: text("tracking_close_reason"), // Reason provided when admin closed tracking
  
  // Pickup request details
  pickupRequested: boolean("pickup_requested").default(false),
  pickupDate: timestamp("pickup_date"),
  pickupStatus: text("pickup_status").default("pending"), // pending, scheduled, completed, cancelled
  pickupNotes: text("pickup_notes"),
  
  // Customs information
  customsValue: integer("customs_value"), // Total value of items in cents
  customsItemCount: integer("customs_item_count"), // Total number of items for customs declaration
  gtip: text("gtip"), // GTIP/HS Code for customs declaration
  iossNumber: text("ioss_number"), // IOSS number for EU shipments
  hmrcNumber: text("hmrc_number"), // HMRC number for UK shipments
  
  // Shipping terms for international trade
  shippingTerms: text("shipping_terms").default("dap"), // DAP (receiver pays duties) or DDP (sender pays duties)
  
  // DDP duty calculation
  ddpDutiesAmount: integer("ddp_duties_amount"), // Total duties amount for DDP shipments in cents
  ddpBaseDutiesAmount: integer("ddp_base_duties_amount"), // Base customs duties (regular rate) in cents
  ddpTrumpTariffsAmount: integer("ddp_trump_tariffs_amount"), // Trump tariffs (additional rate) in cents
  ddpTaxAmount: integer("ddp_tax_amount"), // Total tax amount for DDP shipments in cents  
  ddpProcessingFee: integer("ddp_processing_fee").default(450), // DDP processing fee in cents ($4.50)
  
  // DDP duty rates (for accurate transaction descriptions)
  ddpBaseDutyRate: real("ddp_base_duty_rate"), // Base duty rate as decimal (e.g., 0.05 for 5%)
  ddpTrumpTariffRate: real("ddp_trump_tariff_rate"), // Trump tariff rate as decimal (e.g., 0.15 for 15%)
  ddpTotalDutyRate: real("ddp_total_duty_rate"), // Total combined duty rate as decimal
  
  // ShipEntegra integration status
  sentToShipEntegra: boolean("sent_to_shipentegra").default(false),
  sentToShipEntegraAt: timestamp("sent_to_shipentegra_at"),

  // Bizim Hesap invoice integration
  bizimHesapInvoiceId: text("bizimhesap_invoice_id"), // Invoice ID from Bizim Hesap
  bizimHesapInvoiceCreated: timestamp("bizimhesap_invoice_created"), // When invoice was created
  
  // Additional notes field for tracking integrations
  notes: text("notes"), // General notes field for various system updates

  // Invoice information
  invoiceFilename: text("invoice_filename"), // Original filename of uploaded invoice
  invoicePdf: text("invoice_pdf"), // Base64 encoded PDF content
  invoiceUploadedAt: timestamp("invoice_uploaded_at"), // When invoice was uploaded

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertShipmentSchema = createInsertSchema(shipments).omit({
  id: true,
  userId: true,
  basePrice: true,
  fuelCharge: true,
  taxes: true,
  totalPrice: true,
  originalBasePrice: true,
  originalFuelCharge: true,
  originalTotalPrice: true,
  appliedMultiplier: true,
  carrierName: true,
  estimatedDeliveryDays: true,
  status: true,
  
  // Insurance fields (these will be set during price calculation)
  insuranceCost: true,
  
  // MoogShip label fields
  labelUrl: true,
  labelPdf: true,
  trackingNumber: true,
  
  // Carrier label fields
  carrierLabelUrl: true,
  carrierLabelPdf: true,
  carrierTrackingNumber: true,
  
  // Manual tracking fields (admin-only)
  manualTrackingNumber: true,
  manualCarrierName: true,
  manualTrackingLink: true,
  
  // Other auto-generated fields
  labelError: true,
  labelAttempts: true,
  trackingInfo: true,
  trackingClosed: true,
  trackingCloseReason: true,
  pickupRequested: true,
  pickupDate: true,
  pickupStatus: true,
  pickupNotes: true,
  createdAt: true,
  updatedAt: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Registration = z.infer<typeof registrationSchema>;

export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipments.$inferSelect;

// Tracking update batch table for consolidated email notifications
export const trackingUpdateBatches = pgTable("tracking_update_batches", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id),
  userId: integer("user_id").notNull().references(() => users.id),
  trackingNumber: text("tracking_number"),
  carrierTrackingNumber: text("carrier_tracking_number"),
  status: text("status"), // tracking status
  statusDescription: text("status_description"), // detailed status description
  location: text("location"), // current location
  issueType: text("issue_type"), // exception, delay, etc.
  notificationType: text("notification_type").notNull(), // 'user_update', 'exception', 'delivery'
  isProcessed: boolean("is_processed").default(false), // whether this has been included in a batch email
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"), // when it was included in a batch email
});

export const insertTrackingUpdateBatchSchema = createInsertSchema(trackingUpdateBatches).omit({
  id: true,
  createdAt: true,
  processedAt: true
});

export type InsertTrackingUpdateBatch = z.infer<typeof insertTrackingUpdateBatchSchema>;
export type TrackingUpdateBatch = typeof trackingUpdateBatches.$inferSelect;

// Additional Etsy specific fields that we want to store
export interface EtsyOrderData {
  saleDate?: string;
  orderID?: string;
  fullName?: string;
  street1?: string;
  street2?: string;
  shipCity?: string;
  shipState?: string;
  shipZipcode?: string;
  shipCountry?: string;
  currency?: string;
  orderValue?: string;
  sku?: string;
}

export enum ShipmentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  CANCELLED = "cancelled",
  IN_TRANSIT = "in_transit",
  DELIVERED = "delivered",
  TEMPORARY = "temporary" // Used for credit limit checking
}

export enum ServiceLevel {
  STANDARD = "standard",
  EXPRESS = "express", 
  PRIORITY = "priority"
}

// Shipping terms for international trade
export enum ShippingTerms {
  DAP = "dap", // Delivered at Place - duties paid by receiver
  DDP = "ddp"  // Delivered Duty Paid - duties paid by sender
}

export const ServiceLevelDetails = {
  [ServiceLevel.STANDARD]: {
    name: "Standard",
    description: "6-8 business days",
    color: "bg-blue-100 text-blue-800"
  },
  [ServiceLevel.EXPRESS]: {
    name: "Express",
    description: "3-5 business days",
    color: "bg-green-100 text-green-800"
  },
  [ServiceLevel.PRIORITY]: {
    name: "Priority",
    description: "1-2 business days",
    color: "bg-purple-100 text-purple-800"
  }
};

export const ShipmentStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  in_transit: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  temporary: "bg-gray-100 text-gray-800"
};

// Transaction table for tracking balance changes
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // Amount in cents (positive for additions, negative for deductions)
  description: text("description").notNull(),
  relatedShipmentId: integer("related_shipment_id"), // Optional reference to a shipment
  createdAt: timestamp("created_at").defaultNow()
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export enum TransactionType {
  DEPOSIT = "deposit",
  PURCHASE = "purchase",
  REFUND = "refund"
}

// Label metadata table for proper dimension tracking
export const labelMetadata = pgTable("label_metadata", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  labelType: text("label_type").notNull(), // 'moogship' | 'carrier'
  
  // Original source information
  originalFormat: text("original_format"), // 'pdf' | 'gif' | 'png' | 'jpeg'
  sourceUrl: text("source_url"), // Original URL from API
  providerName: text("provider_name"), // 'shipentegra' | 'ups' | 'dhl' | 'fedex'
  
  // Authentic dimensions from original source
  originalWidth: integer("original_width"), // Width in pixels as received from API
  originalHeight: integer("original_height"), // Height in pixels as received from API
  
  // Storage paths and content
  filePath: text("file_path"), // Local file system path
  base64Content: text("base64_content"), // Base64 encoded content for database storage
  
  // Display metadata
  recommendedViewportWidth: integer("recommended_viewport_width"), // Recommended width for display
  recommendedViewportHeight: integer("recommended_viewport_height"), // Recommended height for display
  aspectRatio: real("aspect_ratio"), // Width/Height ratio for responsive display
  
  // Processing metadata
  conversionRequired: boolean("conversion_required").default(false), // Whether format conversion was needed
  conversionMethod: text("conversion_method"), // 'sharp-to-pdf' | 'pdfkit' | 'none'
  processingNotes: text("processing_notes"), // Any special processing notes
  
  // Quality assurance
  dimensionsVerified: boolean("dimensions_verified").default(false), // Whether dimensions match original
  displayTested: boolean("display_tested").default(false), // Whether display has been tested
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertLabelMetadataSchema = createInsertSchema(labelMetadata).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertLabelMetadata = z.infer<typeof insertLabelMetadataSchema>;
export type LabelMetadata = typeof labelMetadata.$inferSelect;

// Announcement table for system-wide notifications
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  videoUrl: text("video_url"), // Optional video URL (YouTube, Vimeo, or direct video link)
  isActive: boolean("is_active").default(true), // Whether the announcement is currently shown
  priority: text("priority").default("normal"), // 'low', 'normal', 'high', 'urgent'
  showOnLogin: boolean("show_on_login").default(false), // Whether to show as popup on user login
  createdBy: integer("created_by").notNull(), // User ID of the admin who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  expiresAt: timestamp("expires_at") // Optional expiration date
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export enum AnnouncementPriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent"
}

export const AnnouncementPriorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-300",
  normal: "bg-gray-100 text-gray-800 border-gray-300",
  high: "bg-yellow-100 text-yellow-800 border-yellow-300",
  urgent: "bg-red-100 text-red-800 border-red-300"
};

// User announcement views table - tracks which announcements users have seen
export const userAnnouncementViews = pgTable("user_announcement_views", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow()
});

export const insertUserAnnouncementViewSchema = createInsertSchema(userAnnouncementViews).omit({
  id: true,
  viewedAt: true
});

export type InsertUserAnnouncementView = z.infer<typeof insertUserAnnouncementViewSchema>;
export type UserAnnouncementView = typeof userAnnouncementViews.$inferSelect;

// User change request status
export enum ChangeRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected"
}

export const ChangeRequestStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export enum PickupStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  CANCELLED = "cancelled"
}

export const PickupStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
};

// Marketing banner sliders
export const marketingBanners = pgTable("marketing_banners", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  buttonText: text("button_text"),
  buttonUrl: text("button_url"),
  backgroundColor: text("background_color").default("#ffffff"),
  textColor: text("text_color").default("#000000"),
  sortOrder: integer("sort_order").default(0), // Controls display order of banners
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"), // Optional scheduling
  endDate: timestamp("end_date"),    // Optional scheduling
  createdBy: integer("created_by").notNull(), // User ID of the admin who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertMarketingBannerSchema = createInsertSchema(marketingBanners)
  .extend({
    // Allow string dates to be passed directly
    startDate: z.string().nullable().optional().or(z.date().nullable().optional()),
    endDate: z.string().nullable().optional().or(z.date().nullable().optional())
  })
  .omit({
    id: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true
  });

export type InsertMarketingBanner = z.infer<typeof insertMarketingBannerSchema>;
export type MarketingBanner = typeof marketingBanners.$inferSelect;

// Table to track user's HS code usage for intelligent suggestions
export const userHsCodeHistory = pgTable("user_hs_code_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  hsCode: text("hs_code").notNull(),
  productName: text("product_name").notNull(), // Store product name for context
  usageCount: integer("usage_count").notNull().default(1), // How many times this user has used this HS code
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertUserHsCodeHistorySchema = createInsertSchema(userHsCodeHistory).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true
});

export type InsertUserHsCodeHistory = z.infer<typeof insertUserHsCodeHistorySchema>;
export type UserHsCodeHistory = typeof userHsCodeHistory.$inferSelect;

// Email campaigns table for admin emailing system
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(), // HTML content
  textContent: text("text_content"), // Plain text fallback
  status: text("status").notNull().default("draft"), // draft, scheduled, sending, sent, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  recipientFilter: json("recipient_filter"), // JSON object with filter criteria
  totalRecipients: integer("total_recipients").default(0),
  successfulSends: integer("successful_sends").default(0),
  failedSends: integer("failed_sends").default(0),
  attachmentUrls: text("attachment_urls").array(), // Array of attachment file URLs
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Email campaign recipients table for tracking individual email sends
export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  userId: integer("user_id").notNull(),
  email: text("email").notNull(),
  status: text("status").notNull().default("pending"), // pending, sent, failed, bounced, opened, clicked
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns)
  .extend({
    scheduledAt: z.string().nullable().optional().or(z.date().nullable().optional()),
  })
  .omit({
    id: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
    sentAt: true,
    totalRecipients: true,
    successfulSends: true,
    failedSends: true
  });

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;

// Batch pickup requests table for grouping shipments into single pickup events
export const pickupRequests = pgTable("pickup_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  requestDate: timestamp("request_date").defaultNow(),
  pickupDate: timestamp("pickup_date").notNull(),
  pickupStatus: text("pickup_status").default(PickupStatus.PENDING),
  pickupNotes: text("pickup_notes"),
  pickupAddress: text("pickup_address"),
  pickupCity: text("pickup_city"),
  pickupPostalCode: text("pickup_postal_code"),
  pickupCountry: text("pickup_country").default("Turkey"),
  lastUpdated: timestamp("last_updated").defaultNow()
});

export const pickupShipments = pgTable("pickup_shipments", {
  id: serial("id").primaryKey(),
  pickupRequestId: integer("pickup_request_id").notNull(),
  shipmentId: integer("shipment_id").notNull()
});

export const insertPickupRequestSchema = createInsertSchema(pickupRequests).omit({
  id: true,
  requestDate: true,
  lastUpdated: true,
  pickupStatus: true
});

export type InsertPickupRequest = z.infer<typeof insertPickupRequestSchema>;
export type PickupRequest = typeof pickupRequests.$inferSelect;
export type PickupShipment = typeof pickupShipments.$inferSelect;

// Refund requests table for tracking shipment refund requests
export const refundRequests = pgTable("refund_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shipmentIds: text("shipment_ids").notNull(), // JSON array of shipment IDs
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  requestedAmount: integer("requested_amount"), // Total refund amount in cents
  processedAmount: integer("processed_amount"), // Actual refund amount processed in cents
  adminNotes: text("admin_notes"),
  processedBy: integer("processed_by"), // Admin ID who processed the request
  processedAt: timestamp("processed_at"),
  
  // Admin tracking fields for third-party refund processing
  adminTrackingStatus: text("admin_tracking_status").default("not_started"), // not_started, submitted_to_carrier, processing, completed, failed
  carrierRefundReference: text("carrier_refund_reference"), // Reference number from carrier/third party
  submittedToCarrierAt: timestamp("submitted_to_carrier_at"), // When refund was submitted to carrier
  carrierResponseAt: timestamp("carrier_response_at"), // When carrier responded
  expectedRefundDate: timestamp("expected_refund_date"), // Expected completion date
  internalNotes: text("internal_notes"), // Internal admin notes for tracking
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRefundRequestSchema = createInsertSchema(refundRequests).omit({
  id: true,
  status: true,
  processedAmount: true,
  adminNotes: true,
  processedBy: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true
});

export type InsertRefundRequest = z.infer<typeof insertRefundRequestSchema>;
export type RefundRequest = typeof refundRequests.$inferSelect;

export enum RefundRequestStatus {
  PENDING = "pending",
  APPROVED = "approved", 
  REJECTED = "rejected"
}

export const RefundRequestStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};

export enum AdminTrackingStatus {
  NOT_STARTED = "not_started",
  SUBMITTED_TO_CARRIER = "submitted_to_carrier",
  PROCESSING = "processing", 
  COMPLETED = "completed",
  FAILED = "failed"
}

export const AdminTrackingStatusColors = {
  not_started: "bg-gray-100 text-gray-800",
  submitted_to_carrier: "bg-blue-100 text-blue-800", 
  processing: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800"
};

// Draft shipments table for saving incomplete shipment forms
export const draftShipments = pgTable("draft_shipments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  
  // Sender information (all fields optional in draft)
  senderName: text("sender_name"),
  senderAddress1: text("sender_address1"),
  senderAddress2: text("sender_address2"),
  senderCity: text("sender_city"),
  senderPostalCode: text("sender_postal_code"),
  senderPhone: text("sender_phone"),
  senderEmail: text("sender_email"),
  
  // Receiver information
  receiverName: text("receiver_name"),
  receiverAddress: text("receiver_address"),
  receiverCity: text("receiver_city"),
  receiverState: text("receiver_state"),
  receiverCountry: text("receiver_country"),
  receiverPostalCode: text("receiver_postal_code"),
  receiverPhone: text("receiver_phone"),
  receiverEmail: text("receiver_email"),
  
  // Package information
  packageLength: integer("package_length"),
  packageWidth: integer("package_width"),
  packageHeight: integer("package_height"),
  packageWeight: real("package_weight"),
  packageContents: text("package_contents"),
  pieceCount: integer("piece_count"),
  
  // Package and item data (stored as JSON)
  packageItemsData: text("package_items_data"), // JSON string of package items
  packagesData: text("packages_data"), // JSON string of package dimensions

  // Insurance information
  insuranceValue: integer("insurance_value"),
  isInsured: boolean("is_insured"),
  
  // Service level
  serviceLevel: text("service_level"),
  
  // Customs information
  customsValue: integer("customs_value"),
  customsItemCount: integer("customs_item_count"),
  gtip: text("gtip"),
  iossNumber: text("ioss_number"),
  
  // Draft management
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  name: text("name").default("Untitled Draft")
});

export const insertDraftShipmentSchema = createInsertSchema(draftShipments).omit({
  id: true,
  createdAt: true,
  lastUpdated: true
});

export type InsertDraftShipment = z.infer<typeof insertDraftShipmentSchema>;
export type DraftShipment = typeof draftShipments.$inferSelect;

export enum TicketStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  WAITING_ON_CUSTOMER = "waiting_on_customer",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

export enum TicketPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

export enum TicketCategory {
  SHIPPING = "shipping",
  PICKUP = "pickup",
  BILLING = "billing",
  TECHNICAL = "technical",
  OTHER = "other"
}

// Support tickets table for customer support system
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default(TicketStatus.OPEN),
  priority: text("priority").notNull().default(TicketPriority.MEDIUM),
  category: text("category").notNull(),
  assignedTo: integer("assigned_to"), // Admin ID if assigned
  relatedShipmentId: integer("related_shipment_id"), // Optional reference to a shipment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by"), // Admin ID who closed the ticket
  closureReason: text("closure_reason")
});

// Support ticket responses/comments
export const ticketResponses = pgTable("ticket_responses", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(),
  userId: integer("user_id").notNull(), // User who posted the response (could be admin or customer)
  isAdminResponse: boolean("is_admin_response").notNull(),
  message: text("message").notNull(),
  attachmentUrl: text("attachment_url"), // Optional file attachment (kept for backward compatibility)
  createdAt: timestamp("created_at").defaultNow()
});

// Ticket attachments table to support multiple file attachments per ticket or response
export const ticketAttachments = pgTable("ticket_attachments", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull(), // Reference to support ticket
  responseId: integer("response_id"), // Optional reference to specific response
  userId: integer("user_id").notNull(), // User who uploaded the file
  isAdminUpload: boolean("is_admin_upload").notNull(), // Whether uploaded by admin
  originalFileName: text("original_file_name").notNull(), // Original file name
  fileName: text("file_name").notNull(), // Stored file name
  filePath: text("file_path").notNull(), // File path in storage
  fileSize: integer("file_size").notNull(), // File size in bytes
  mimeType: text("mime_type").notNull(), // File MIME type
  fileType: text("file_type").notNull(), // Category: 'image', 'pdf', 'excel', 'csv', 'text'
  uploadedAt: timestamp("uploaded_at").defaultNow()
});

export const insertTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  status: true,
  assignedTo: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
  closedBy: true,
  closureReason: true
});

export const insertTicketResponseSchema = createInsertSchema(ticketResponses).omit({
  id: true,
  attachmentUrl: true, // Use new attachments table instead
  createdAt: true
});

export const insertTicketAttachmentSchema = createInsertSchema(ticketAttachments).omit({
  id: true,
  uploadedAt: true
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertTicketResponse = z.infer<typeof insertTicketResponseSchema>;
export type TicketResponse = typeof ticketResponses.$inferSelect;
export type InsertTicketAttachment = z.infer<typeof insertTicketAttachmentSchema>;
export type TicketAttachment = typeof ticketAttachments.$inferSelect;

export const TicketStatusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  waiting_on_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800"
};

export const TicketPriorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

// Recipients table to store saved recipient information for users
export const recipients = pgTable("recipients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who saved this recipient
  name: text("name").notNull(),
  address: text("address").notNull(),
  suite: text("suite"), // Suite, apartment, or unit number
  city: text("city").notNull(),
  state: text("state"),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  phone: text("phone"),
  email: text("email"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertRecipientSchema = createInsertSchema(recipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertRecipient = z.infer<typeof insertRecipientSchema>;
export type Recipient = typeof recipients.$inferSelect;

// Fast tracking notifications table for admin notifications
export const fastTrackingNotifications = pgTable("fast_tracking_notifications", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  userId: integer("user_id").notNull(), // User who requested fast tracking
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
  destinationCountry: text("destination_country"),
  destinationCity: text("destination_city"),
  requestedAt: timestamp("requested_at").defaultNow(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  readBy: integer("read_by") // Admin ID who read the notification
});

export const insertFastTrackingNotificationSchema = createInsertSchema(fastTrackingNotifications).omit({
  id: true,
  requestedAt: true,
  isRead: true,
  readAt: true
});

export type InsertFastTrackingNotification = z.infer<typeof insertFastTrackingNotificationSchema>;
export type FastTrackingNotification = typeof fastTrackingNotifications.$inferSelect;

// Price history table to track shipment price changes
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  userId: integer("user_id").notNull(), // User who made the change
  
  // Previous prices
  previousBasePrice: integer("previous_base_price").notNull(),
  previousFuelCharge: integer("previous_fuel_charge").notNull(),
  previousTotalPrice: integer("previous_total_price").notNull(),
  
  // New prices
  newBasePrice: integer("new_base_price").notNull(),
  newFuelCharge: integer("new_fuel_charge").notNull(),
  newTotalPrice: integer("new_total_price").notNull(),
  
  // Changes that triggered the price update
  dimensionsChanged: boolean("dimensions_changed").default(false),
  weightChanged: boolean("weight_changed").default(false),
  addressChanged: boolean("address_changed").default(false),
  serviceLevelChanged: boolean("service_level_changed").default(false),
  
  // Automatic vs manual change
  isAutoRecalculation: boolean("is_auto_recalculation").default(true),
  changeReason: text("change_reason"),
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  createdAt: true
});

export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;

// Package items table for detailed package contents
export const packageItems = pgTable("package_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  
  // Item details
  name: text("name").notNull(),
  description: text("description"),
  quantity: integer("quantity").notNull().default(1),
  price: integer("price").notNull(), // Price in cents
  gtin: text("gtin"), // Global Trade Item Number (GTIN/UPC/EAN)
  hsCode: text("hs_code"), // Harmonized System Code for customs
  
  // Weight and dimensions (optional individual item details)
  weight: real("weight"),
  length: integer("length"),
  width: integer("width"),
  height: integer("height"),
  
  // Origin and manufacturing
  countryOfOrigin: text("country_of_origin"),
  manufacturer: text("manufacturer"),
  
  // Item creation metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPackageItemSchema = createInsertSchema(packageItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertPackageItem = z.infer<typeof insertPackageItemSchema>;
export type PackageItem = typeof packageItems.$inferSelect;

// User products table for persistent product catalog per user
export const userProducts = pgTable("user_products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  
  // Item details
  name: text("name").notNull(),
  sku: text("sku"), // Product SKU (stock keeping unit)
  description: text("description"),
  price: integer("price").notNull(), // Price in cents
  quantity: integer("quantity").default(1).notNull(), // Default to 1 item
  hsCode: text("hs_code").notNull(), // Harmonized System Code for customs
  
  // Weight and dimensions - keeping for backward compatibility
  weight: real("weight"),
  length: integer("length"),
  width: integer("width"),
  height: integer("height"),
  
  // Origin and manufacturing
  countryOfOrigin: text("country_of_origin").notNull(),
  manufacturer: text("manufacturer"),
  
  // Product creation metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertUserProductSchema = createInsertSchema(userProducts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

export type InsertUserProduct = z.infer<typeof insertUserProductSchema>;
export type UserProduct = typeof userProducts.$inferSelect;

// Returns table for managing return/refund requests
export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  sellerId: integer("seller_id").notNull(), // The seller who created this return
  
  // Required fields (from seller)
  senderName: text("sender_name").notNull(),
  trackingCarrier: text("tracking_carrier").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  
  // Optional fields (from seller)
  orderNumber: text("order_number"),
  productName: text("product_name"),
  returnReason: text("return_reason"),
  sellerNotes: text("seller_notes"), // Seller notes/comments
  
  // Status management (admin only)
  status: text("status").notNull().default("pending"), // pending, received, completed
  adminNotes: text("admin_notes"), // Admin notes/comments
  isControlled: boolean("is_controlled").default(false), // Whether return is marked as controlled
  
  // Dates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  receivedAt: timestamp("received_at"), // When admin marks as received
  completedAt: timestamp("completed_at") // When admin marks as completed
});

// Return photos for storing images of returned items
export const returnPhotos = pgTable("return_photos", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  url: text("url").notNull(), // Path or URL to the photo
  uploadedBy: integer("uploaded_by").notNull(), // ID of user who uploaded
  createdAt: timestamp("created_at").defaultNow()
});

export const insertReturnSchema = createInsertSchema(returns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  receivedAt: true,
  completedAt: true,
  status: true // Admin only
});

export const insertReturnPhotoSchema = createInsertSchema(returnPhotos).omit({
  id: true,
  createdAt: true
});

export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returns.$inferSelect;
export type InsertReturnPhoto = z.infer<typeof insertReturnPhotoSchema>;
export type ReturnPhoto = typeof returnPhotos.$inferSelect;

export enum ReturnStatus {
  PENDING = "pending",
  RECEIVED = "received",
  COMPLETED = "completed"
}

export const ReturnStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  received: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800"
};

// User change requests table
export const userChangeRequests = pgTable("user_change_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  
  // Change request details
  requestedChanges: json("requested_changes").notNull(), // JSON containing the requested changes
  status: text("status").notNull().default(ChangeRequestStatus.PENDING),
  notes: text("notes"), // User notes explaining the change request
  
  // Review information
  reviewedBy: integer("reviewed_by"), // Admin ID who reviewed the request
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertUserChangeRequestSchema = createInsertSchema(userChangeRequests).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true
});

export type InsertUserChangeRequest = z.infer<typeof insertUserChangeRequestSchema>;
export type UserChangeRequest = typeof userChangeRequests.$inferSelect;

// Package Templates - predefined package dimensions
export const packageTemplates = pgTable("package_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  weight: real("weight"),
  length: integer("length").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPackageTemplateSchema = createInsertSchema(packageTemplates).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

export type InsertPackageTemplate = z.infer<typeof insertPackageTemplateSchema>;
export type PackageTemplate = typeof packageTemplates.$inferSelect;

// Physical Packages table to store individual package dimensions and weights
export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull(),
  name: text("name"),
  description: text("description"),
  notes: text("notes"),  // Added notes field for admin annotations
  weight: decimal("weight", { precision: 10, scale: 2 }).notNull(),
  length: decimal("length", { precision: 10, scale: 2 }).notNull(),
  width: decimal("width", { precision: 10, scale: 2 }).notNull(),
  height: decimal("height", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type Package = typeof packages.$inferSelect;

// System Settings table to store global application settings
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // Unique key identifier for the setting
  value: text("value").notNull(), // Value stored as text (can be parsed as needed)
  description: text("description"), // Optional description of what the setting does
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// Billing Reminders table for admin to track and send payment reminders
export const billingReminders = pgTable("billing_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User receiving the reminder
  sentBy: integer("sent_by").notNull(), // Admin who sent the reminder
  
  // Reminder details
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  reminderType: text("reminder_type").notNull().default("balance"), // balance, overdue, payment_request
  
  // User balance information at time of reminder
  currentBalance: integer("current_balance").notNull(), // Balance in cents at time of reminder
  minimumBalance: integer("minimum_balance"), // Minimum balance threshold
  
  // Email delivery status
  emailSent: boolean("email_sent").default(false),
  emailSentAt: timestamp("email_sent_at"),
  emailError: text("email_error"),
  
  // Tracking
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  
  // Admin notes
  adminNotes: text("admin_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertBillingReminderSchema = createInsertSchema(billingReminders).omit({
  id: true,
  emailSent: true,
  emailSentAt: true,
  emailError: true,
  isRead: true,
  readAt: true,
  createdAt: true,
  updatedAt: true
});

export type InsertBillingReminder = z.infer<typeof insertBillingReminderSchema>;
export type BillingReminder = typeof billingReminders.$inferSelect;

export enum BillingReminderType {
  BALANCE = "balance",
  OVERDUE = "overdue",
  PAYMENT_REQUEST = "payment_request"
}

export const BillingReminderTypeColors = {
  balance: "bg-yellow-100 text-yellow-800",
  overdue: "bg-red-100 text-red-800",
  payment_request: "bg-blue-100 text-blue-800"
};

// Async duty calculation jobs table
export const dutyCalculationJobs = pgTable("duty_calculation_jobs", {
  id: serial("id").primaryKey(),
  
  // Job identification
  jobId: text("job_id").notNull().unique(), // Unique identifier for tracking
  sessionId: text("session_id"), // User session ID for WebSocket updates
  
  // Calculation parameters
  originCountry: text("origin_country").notNull(),
  destinationCountry: text("destination_country").notNull(),
  customsValue: integer("customs_value").notNull(), // In cents
  shippingCost: integer("shipping_cost").notNull(), // In cents
  provider: text("provider").notNull().default("ups"), // ups, easyship, both
  
  // Package details
  packageDetails: json("package_details"), // Weight, dimensions, items
  
  // Job status
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  priority: integer("priority").notNull().default(1), // 1 = normal, 2 = high
  
  // Results
  resultData: json("result_data"), // Calculated duties response
  errorMessage: text("error_message"),
  processingTime: integer("processing_time"), // Duration in milliseconds
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at") // Jobs expire after 1 hour
});

export const insertDutyCalculationJobSchema = createInsertSchema(dutyCalculationJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true
});

export type InsertDutyCalculationJob = z.infer<typeof insertDutyCalculationJobSchema>;
export type DutyCalculationJob = typeof dutyCalculationJobs.$inferSelect;

export enum DutyJobStatus {
  PENDING = "pending",
  PROCESSING = "processing", 
  COMPLETED = "completed",
  FAILED = "failed"
}

// HTS (Harmonized Tariff Schedule) Data Table
export const htsData = pgTable("hts_data", {
  id: serial("id").primaryKey(),
  hsCode: text("hs_code").notNull().unique(), // HS code (e.g., 6208.19.90)
  description: text("description").notNull(), // Product description
  generalRate: text("general_rate").notNull(), // General duty rate (e.g., "8.7%" or "Free")
  specialRate: text("special_rate").default(""), // Special rates for certain countries
  unit: text("unit"), // Unit of measure (e.g., "doz. kg", "No.", "kg")
  chapter: integer("chapter").notNull(), // HS chapter (first 2 digits)
  percentage: real("percentage").notNull().default(0), // Decimal percentage (0.087 for 8.7%)
  source: text("source").notNull().default("excel_import_2025"), // Source of the data
  isActive: boolean("is_active").notNull().default(true), // Whether this entry is active
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    hsCodeIdx: uniqueIndex("hs_code_idx").on(table.hsCode),
    chapterIdx: uniqueIndex("chapter_idx").on(table.chapter)
  };
});

export const insertHTSDataSchema = createInsertSchema(htsData).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertHTSData = z.infer<typeof insertHTSDataSchema>;
export type HTSData = typeof htsData.$inferSelect;

// Notification logs table to track all email notifications sent
export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  
  // Notification details
  type: text("type").notNull(), // delivery, tracking-exception, delivery-issue, customs-charges, etc.
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(), // Email address
  
  // Status tracking
  status: text("status").notNull().default("sent"), // sent, failed
  sentAt: timestamp("sent_at").defaultNow(),
  error: text("error"), // Error message if failed
  
  // Related entities
  shipmentId: integer("shipment_id"), // Optional - if related to a specific shipment
  userId: integer("user_id"), // Optional - if related to a specific user
  sentBy: integer("sent_by"), // Admin ID who triggered manual notification (null for automatic)
  
  // Email metadata
  emailProvider: text("email_provider").default("sendgrid"), // sendgrid, smtp
  messageId: text("message_id"), // Provider message ID for tracking
  templateUsed: text("template_used"), // Which email template was used
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({
  id: true,
  createdAt: true,
  sentAt: true
});

export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;

// Admin task management enums
export enum TaskStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress", 
  BLOCKED = "blocked",
  DONE = "done",
  CANCELLED = "cancelled"
}

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent"
}

export enum TaskType {
  FEATURE = "feature",
  TASK = "task",
  BUG = "bug",
  IMPROVEMENT = "improvement"
}

// Admin tasks table for internal task/feature request management
export const adminTasks = pgTable("admin_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull().default(TaskType.TASK),
  status: text("status").notNull().default(TaskStatus.OPEN),
  priority: text("priority").notNull().default(TaskPriority.MEDIUM),
  reporterId: integer("reporter_id").notNull(), // Admin who created the task
  assigneeId: integer("assignee_id"), // Admin assigned to the task
  tags: text("tags").array(), // Optional tags for categorization
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  completedBy: integer("completed_by") // Admin who completed the task
});

export const insertTaskSchema = createInsertSchema(adminTasks).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  completedBy: true
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type AdminTask = typeof adminTasks.$inferSelect;

// Color mappings for task statuses and priorities
export const TaskStatusColors = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800", 
  blocked: "bg-red-100 text-red-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800"
};

export const TaskPriorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800"
};

export const TaskTypeColors = {
  feature: "bg-purple-100 text-purple-800",
  task: "bg-gray-100 text-gray-800",
  bug: "bg-red-100 text-red-800",
  improvement: "bg-green-100 text-green-800"
};

// Country-based pricing rules table for admin to assign discounts per country
export const countryPricingRules = pgTable("country_pricing_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User this rule applies to (null for global rule)
  countryCode: text("country_code").notNull(), // ISO 2-letter country code (e.g., "US", "DE", "FR")
  countryName: text("country_name").notNull(), // Human-readable country name
  
  // Pricing modifiers (only one should be set per rule)
  priceMultiplier: real("price_multiplier"), // Multiply base price by this factor (e.g., 0.9 for 10% discount, 1.1 for 10% markup)
  fixedDiscount: integer("fixed_discount"), // Fixed discount amount in cents
  fixedMarkup: integer("fixed_markup"), // Fixed markup amount in cents
  
  // Rule metadata
  ruleName: text("rule_name").notNull(), // Descriptive name for this rule (e.g., "US Premium Discount", "EU Standard Rate")
  description: text("description"), // Optional description
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1), // Higher number = higher priority when multiple rules match
  
  // Admin tracking
  createdBy: integer("created_by").notNull(), // Admin who created this rule
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Effective dates
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"), // Optional expiration date
}, (table) => {
  return {
    userCountryIdx: uniqueIndex("user_country_pricing_idx").on(table.userId, table.countryCode, table.priority),
    countryCodeIdx: uniqueIndex("country_code_idx").on(table.countryCode),
    activeRulesIdx: uniqueIndex("active_country_rules_idx").on(table.isActive, table.priority)
  };
});

export const insertCountryPricingRuleSchema = createInsertSchema(countryPricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertCountryPricingRule = z.infer<typeof insertCountryPricingRuleSchema>;
export type CountryPricingRule = typeof countryPricingRules.$inferSelect;

// Weight-based pricing rules table for admin to assign discounts per weight range
export const weightPricingRules = pgTable("weight_pricing_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User this rule applies to (null for global rule)
  
  // Weight range (in kg)
  minWeight: real("min_weight").notNull(), // Minimum weight in kg (inclusive)
  maxWeight: real("max_weight"), // Maximum weight in kg (inclusive, null means no upper limit)
  
  // Pricing modifiers (only one should be set per rule)
  priceMultiplier: real("price_multiplier"), // Multiply base price by this factor (e.g., 0.9 for 10% discount, 1.1 for 10% markup)
  fixedDiscount: integer("fixed_discount"), // Fixed discount amount in cents
  fixedMarkup: integer("fixed_markup"), // Fixed markup amount in cents
  perKgDiscount: integer("per_kg_discount"), // Discount per kg in cents
  perKgMarkup: integer("per_kg_markup"), // Markup per kg in cents
  
  // Rule metadata
  ruleName: text("rule_name").notNull(), // Descriptive name for this rule (e.g., "Bulk Discount 10kg+", "Light Package Premium")
  description: text("description"), // Optional description
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1), // Higher number = higher priority when multiple rules match
  
  // Admin tracking
  createdBy: integer("created_by").notNull(), // Admin who created this rule
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Effective dates
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveUntil: timestamp("effective_until"), // Optional expiration date
}, (table) => {
  return {
    userWeightRangeIdx: uniqueIndex("user_weight_range_idx").on(table.userId, table.minWeight, table.maxWeight),
    weightRangeIdx: uniqueIndex("weight_range_idx").on(table.minWeight, table.maxWeight, table.priority),
    activeWeightRulesIdx: uniqueIndex("active_weight_rules_idx").on(table.isActive, table.priority)
  };
});

export const insertWeightPricingRuleSchema = createInsertSchema(weightPricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertWeightPricingRule = z.infer<typeof insertWeightPricingRuleSchema>;
export type WeightPricingRule = typeof weightPricingRules.$inferSelect;

// Enums for pricing rule types
export enum PricingRuleType {
  MULTIPLIER = "multiplier",
  FIXED_DISCOUNT = "fixed_discount",
  FIXED_MARKUP = "fixed_markup",
  PER_KG_DISCOUNT = "per_kg_discount",
  PER_KG_MARKUP = "per_kg_markup"
}

export const PricingRuleTypeColors = {
  multiplier: "bg-blue-100 text-blue-800",
  fixed_discount: "bg-green-100 text-green-800",
  fixed_markup: "bg-red-100 text-red-800",
  per_kg_discount: "bg-green-100 text-green-800",
  per_kg_markup: "bg-red-100 text-red-800"
};

// Pricing calculation logs table for admin visibility
export const pricingCalculationLogs = pgTable("pricing_calculation_logs", {
  id: serial("id").primaryKey(),

  // User and shipment info
  userId: integer("user_id"), // User who requested the pricing (null for public/guest)
  username: text("username"), // Snapshot of username at time of calculation
  shipmentId: integer("shipment_id"), // Associated shipment if available

  // Package details
  packageWeight: real("package_weight").notNull(), // Weight in kg
  packageLength: real("package_length"), // Dimensions in cm
  packageWidth: real("package_width"),
  packageHeight: real("package_height"),
  volumetricWeight: real("volumetric_weight"), // Calculated volumetric weight
  billableWeight: real("billable_weight"), // Final billable weight used

  // Destination
  receiverCountry: text("receiver_country").notNull(), // ISO country code

  // Multiplier breakdown
  userMultiplier: real("user_multiplier").notNull(), // User's base multiplier
  countryMultiplier: real("country_multiplier"), // Country-specific multiplier applied
  weightMultiplier: real("weight_multiplier"), // Weight-range multiplier applied
  combinedMultiplier: real("combined_multiplier").notNull(), // Final combined multiplier

  // Rule sources (tracks whether global or user-specific rules were applied)
  countryRuleSource: text("country_rule_source"), // "global", "user_specific", or null
  weightRuleSource: text("weight_rule_source"), // "global", "user_specific", or null

  // Applied rules details (JSON for flexibility)
  appliedRules: json("applied_rules"), // Array of applied rule descriptions

  // Raw API responses from pricing providers
  apiResponses: json("api_responses"), // Raw responses from Shipentegra, Aramex, etc.

  // Pricing results
  basePrice: integer("base_price"), // Base price before multiplier (in cents)
  finalPrice: integer("final_price"), // Final price after multiplier (in cents)
  selectedService: text("selected_service"), // Service name selected
  pricingOptions: json("pricing_options"), // All pricing options returned

  // Request context
  requestSource: text("request_source"), // "shipment_create", "bulk_upload", "price_calculator", etc.
  ipAddress: text("ip_address"), // For security/audit

  // Timestamps
  createdAt: timestamp("created_at").defaultNow()
});

export const insertPricingCalculationLogSchema = createInsertSchema(pricingCalculationLogs).omit({
  id: true,
  createdAt: true
});

export type InsertPricingCalculationLog = z.infer<typeof insertPricingCalculationLogSchema>;
export type PricingCalculationLog = typeof pricingCalculationLogs.$inferSelect;

// GPT Advisor conversations table
export const advisorConversations = pgTable("advisor_conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  messages: json("messages").notNull().$type<Array<{role: 'user' | 'assistant', content: string}>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertAdvisorConversationSchema = createInsertSchema(advisorConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertAdvisorConversation = z.infer<typeof insertAdvisorConversationSchema>;
export type AdvisorConversation = typeof advisorConversations.$inferSelect;

// Etsy OAuth connections table
export const etsyConnections = pgTable("etsy_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who owns this connection
  
  // Etsy Shop information
  shopId: text("shop_id").notNull().unique(), // Etsy shop ID
  shopName: text("shop_name"), // Shop name for display
  shopUrl: text("shop_url"), // Shop URL on Etsy
  shopOwnerName: text("shop_owner_name"), // Shop owner's name
  
  // OAuth credentials
  accessToken: text("access_token").notNull(), // OAuth 2.0 access token (encrypted in production)
  refreshToken: text("refresh_token").notNull(), // OAuth 2.0 refresh token (encrypted in production)
  tokenExpiresAt: timestamp("token_expires_at").notNull(), // When the access token expires
  
  // Connection metadata
  isActive: boolean("is_active").default(true), // Whether this connection is active
  lastSyncAt: timestamp("last_sync_at"), // Last time orders were synced
  totalOrdersSynced: integer("total_orders_synced").default(0), // Total orders synced
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertEtsyConnectionSchema = createInsertSchema(etsyConnections).omit({
  id: true,
  totalOrdersSynced: true,
  createdAt: true,
  updatedAt: true
});

export type InsertEtsyConnection = z.infer<typeof insertEtsyConnectionSchema>;
export type EtsyConnection = typeof etsyConnections.$inferSelect;

// Etsy Orders table
export const etsyOrders = pgTable("etsy_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who owns this order
  etsyConnectionId: integer("etsy_connection_id").notNull(), // Reference to etsy_connections
  
  // Etsy order identification
  receiptId: text("receipt_id").notNull().unique(), // Etsy receipt ID (unique identifier)
  orderNumber: text("order_number"), // Display order number
  
  // Order details
  orderDate: timestamp("order_date").notNull(), // When the order was placed
  orderStatus: text("order_status"), // Etsy order status
  paymentStatus: text("payment_status"), // paid, pending, etc.
  shippingStatus: text("shipping_status"), // not_shipped, shipped, delivered
  
  // Customer information
  buyerName: text("buyer_name").notNull(),
  buyerEmail: text("buyer_email"),
  
  // Shipping address
  shipToName: text("ship_to_name").notNull(),
  shipToAddress1: text("ship_to_address1").notNull(),
  shipToAddress2: text("ship_to_address2"),
  shipToCity: text("ship_to_city").notNull(),
  shipToState: text("ship_to_state"),
  shipToCountry: text("ship_to_country").notNull(),
  shipToZip: text("ship_to_zip"),
  
  // Order financials
  grandTotal: integer("grand_total").notNull(), // Total in cents
  subtotal: integer("subtotal"), // Subtotal in cents
  shippingCost: integer("shipping_cost"), // Shipping cost in cents
  taxTotal: integer("tax_total"), // Tax in cents
  currency: text("currency").default("USD"),
  
  // Order items (stored as JSON for flexibility)
  items: json("items").$type<Array<{
    transactionId: string;
    title: string;
    quantity: number;
    price: number; // in cents
    sku?: string;
    variationName?: string;
    imageUrl?: string; // Product image URL
  }>>(),
  
  // Calculated shipping information
  estimatedWeight: real("estimated_weight"), // Estimated weight in kg
  packageContents: text("package_contents"), // Description of contents
  
  // Integration status
  moogshipShipmentId: integer("moogship_shipment_id"), // Reference to shipments table if shipping label created
  shippingPriceCalculated: boolean("shipping_price_calculated").default(false),
  calculatedShippingPrice: integer("calculated_shipping_price"), // Calculated shipping price in cents
  
  // Metadata
  rawData: json("raw_data"), // Store raw Etsy API response for reference
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertEtsyOrderSchema = createInsertSchema(etsyOrders).omit({
  id: true,
  moogshipShipmentId: true,
  shippingPriceCalculated: true,
  calculatedShippingPrice: true,
  createdAt: true,
  updatedAt: true
});

export type InsertEtsyOrder = z.infer<typeof insertEtsyOrderSchema>;
export type EtsyOrder = typeof etsyOrders.$inferSelect;

// Email connections for IMAP/OAuth integration
export const emailConnections = pgTable("email_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // User who owns this connection
  
  // Email account information
  email: text("email").notNull(), // Email address
  provider: text("provider").notNull(), // 'gmail', 'outlook', 'other'
  connectionType: text("connection_type").notNull(), // 'oauth2', 'imap'
  
  // OAuth2 credentials (for Gmail/Outlook OAuth)
  accessToken: text("access_token"), // OAuth2 access token (encrypted)
  refreshToken: text("refresh_token"), // OAuth2 refresh token (encrypted)
  tokenExpiresAt: timestamp("token_expires_at"), // When the access token expires
  
  // IMAP credentials (for basic IMAP connections)
  imapHost: text("imap_host"), // IMAP server hostname
  imapPort: integer("imap_port"), // IMAP server port
  imapUsername: text("imap_username"), // IMAP username (encrypted)
  imapPassword: text("imap_password"), // IMAP password/app-specific password (encrypted)
  
  // Sync settings
  syncEnabled: boolean("sync_enabled").default(true), // Whether to auto-sync
  syncFrequency: integer("sync_frequency").default(60), // Minutes between syncs
  lastSyncAt: timestamp("last_sync_at"), // Last successful sync
  lastSyncError: text("last_sync_error"), // Last sync error message if any
  
  // Filtering settings for Etsy orders
  etsyEmailFilter: text("etsy_email_filter").default("transaction@etsy.com"), // Sender to filter for
  etsySubjectFilter: text("etsy_subject_filter").default("You made a sale"), // Subject to filter for
  
  // Stats
  totalEmailsProcessed: integer("total_emails_processed").default(0),
  totalOrdersImported: integer("total_orders_imported").default(0),
  
  // Status
  isActive: boolean("is_active").default(true),
  connectionStatus: text("connection_status").default("pending"), // pending, connected, error
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertEmailConnectionSchema = createInsertSchema(emailConnections).omit({
  id: true,
  totalEmailsProcessed: true,
  totalOrdersImported: true,
  lastSyncAt: true,
  lastSyncError: true,
  createdAt: true,
  updatedAt: true
});

export type InsertEmailConnection = z.infer<typeof insertEmailConnectionSchema>;
export type EmailConnection = typeof emailConnections.$inferSelect;

// Email sync log for tracking processed emails
export const emailSyncLog = pgTable("email_sync_log", {
  id: serial("id").primaryKey(),
  emailConnectionId: integer("email_connection_id").notNull(), // Reference to email_connections
  userId: integer("user_id").notNull(), // User who owns this log entry
  
  // Email identification
  messageId: text("message_id").notNull(), // Email message ID to prevent duplicates
  emailDate: timestamp("email_date").notNull(), // Date of the email
  subject: text("subject").notNull(),
  sender: text("sender").notNull(),
  
  // Processing status
  processedSuccessfully: boolean("processed_successfully").notNull(),
  errorMessage: text("error_message"), // Error if processing failed
  
  // Extracted order info
  orderId: text("order_id"), // Etsy order ID if extracted
  etsyOrderCreated: boolean("etsy_order_created").default(false), // Whether an etsy_order was created
  
  createdAt: timestamp("created_at").defaultNow()
});

export const insertEmailSyncLogSchema = createInsertSchema(emailSyncLog).omit({
  id: true,
  createdAt: true
});

export type InsertEmailSyncLog = z.infer<typeof insertEmailSyncLogSchema>;
export type EmailSyncLog = typeof emailSyncLog.$inferSelect;

// ============================================
// EXTERNAL PRICE INTEGRATION TABLES
// ============================================

// External Prices - Main price table for each country/weight/carrier combination
export const externalPrices = pgTable("external_prices", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code").notNull(), // ISO country code (e.g., "US", "DE", "GB")
  countryName: text("country_name").notNull(), // Display name (e.g., "United States")
  weight: real("weight").notNull(), // Weight in kg (0.5, 1, 1.5... 30)
  carrier: text("carrier").notNull(), // Carrier name (e.g., "UPS", "FedEx", "DHL", "PTT")
  service: text("service").notNull(), // Service type (e.g., "Express", "Economy")
  priceUsd: integer("price_usd").notNull(), // Price in cents (15860 = $158.60)
  transitDays: text("transit_days"), // Transit time (e.g., "2-4 iş günü")

  // Status and visibility
  status: text("status").notNull().default("pending"), // "pending" | "active" | "disabled"
  isVisibleToCustomers: boolean("is_visible_to_customers").notNull().default(false), // Admin controlled visibility

  // Timestamps
  scrapedAt: timestamp("scraped_at"), // When the price was scraped
  approvedAt: timestamp("approved_at"), // When the price was approved
  approvedBy: integer("approved_by"), // Admin user ID who approved
  batchId: integer("batch_id"), // Reference to external_scrape_batches

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertExternalPriceSchema = createInsertSchema(externalPrices).omit({
  id: true,
  approvedAt: true,
  approvedBy: true,
  createdAt: true,
  updatedAt: true
});

export type InsertExternalPrice = z.infer<typeof insertExternalPriceSchema>;
export type ExternalPrice = typeof externalPrices.$inferSelect;

// External Service Settings - Control which carriers/services are visible to customers
export const externalServiceSettings = pgTable("navlungo_service_settings", {
  id: serial("id").primaryKey(),
  carrier: text("carrier").notNull(), // Carrier name (e.g., "UPS")
  service: text("service").notNull(), // Service type (e.g., "Express")
  displayName: text("display_name").notNull(), // Customer-facing name (e.g., "MoogShip Express")
  isActive: boolean("is_active").notNull().default(true), // Whether this service is active
  sortOrder: integer("sort_order").notNull().default(0), // Display order

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const insertExternalServiceSettingSchema = createInsertSchema(externalServiceSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertExternalServiceSetting = z.infer<typeof insertExternalServiceSettingSchema>;
export type ExternalServiceSetting = typeof externalServiceSettings.$inferSelect;

// External Scrape Batches - Track scraping sessions
export const externalScrapeBatches = pgTable("external_scrape_batches", {
  id: serial("id").primaryKey(),
  countryCode: text("country_code"), // Optional: specific country or null for all
  totalPrices: integer("total_prices").notNull().default(0), // Total prices in this batch
  approvedPrices: integer("approved_prices").notNull().default(0), // Prices that were approved
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected"
  source: text("source").notNull().default("chrome-extension"), // "chrome-extension" | "manual"
  notes: text("notes"), // Admin notes

  scrapedAt: timestamp("scraped_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"), // Admin user ID who processed

  createdAt: timestamp("created_at").defaultNow()
});

export const insertExternalScrapeBatchSchema = createInsertSchema(externalScrapeBatches).omit({
  id: true,
  approvedPrices: true,
  processedAt: true,
  processedBy: true,
  createdAt: true
});

export type InsertExternalScrapeBatch = z.infer<typeof insertExternalScrapeBatchSchema>;
export type ExternalScrapeBatch = typeof externalScrapeBatches.$inferSelect;

// External Price Audit Log - Track all price changes for audit trail
export const externalPriceAuditLogs = pgTable("navlungo_price_audit_logs", {
  id: serial("id").primaryKey(),
  priceId: integer("price_id").notNull(), // Reference to external_prices
  action: text("action").notNull(), // "created" | "updated" | "approved" | "disabled"
  previousValue: json("previous_value"), // Previous state (JSON)
  newValue: json("new_value"), // New state (JSON)
  userId: integer("user_id").notNull(), // User who made the change
  reason: text("reason"), // Reason for the change

  createdAt: timestamp("created_at").defaultNow()
});

export const insertExternalPriceAuditLogSchema = createInsertSchema(externalPriceAuditLogs).omit({
  id: true,
  createdAt: true
});

export type InsertExternalPriceAuditLog = z.infer<typeof insertExternalPriceAuditLogSchema>;
export type ExternalPriceAuditLog = typeof externalPriceAuditLogs.$inferSelect;

// External status enums
export enum ExternalPriceStatus {
  PENDING = "pending",
  ACTIVE = "active",
  DISABLED = "disabled"
}

export enum ExternalBatchStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected"
}

export const ExternalPriceStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  active: "bg-green-100 text-green-800",
  disabled: "bg-gray-100 text-gray-800"
};

export const ExternalBatchStatusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800"
};
