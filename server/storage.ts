import {
  users,
  shipments,
  transactions,
  announcements,
  userAnnouncementViews,
  pickupRequests,
  pickupShipments,
  supportTickets,
  ticketResponses,
  ticketAttachments,
  userProducts,
  packageTemplates,
  packages,
  systemSettings,
  recipients,
  draftShipments,
  marketingBanners,
  returns,
  returnPhotos,
  refundRequests,
  emailCampaigns,
  emailCampaignRecipients,
  countryPriceMultipliers,
  weightRangePriceMultipliers,
  countryPricingRules,
  weightPricingRules,
  advisorConversations,
  etsyConnections,
  etsyOrders,
  type User,
  type InsertUser,
  type Shipment,
  type InsertShipment,
  type Transaction,
  type InsertTransaction,
  type Announcement,
  type InsertAnnouncement,
  type PickupRequest,
  type PickupShipment,
  type SupportTicket,
  type InsertTicket,
  type TicketResponse,
  type InsertTicketResponse,
  type TicketAttachment,
  type InsertTicketAttachment,
  type UserProduct,
  type InsertUserProduct,
  type PackageTemplate,
  type InsertPackageTemplate,
  type Package,
  type InsertPackage,
  type SystemSetting,
  type InsertSystemSetting,
  type DraftShipment,
  type InsertDraftShipment,
  type MarketingBanner,
  type InsertMarketingBanner,
  type Return,
  type InsertReturn,
  type ReturnPhoto,
  type InsertReturnPhoto,
  type RefundRequest,
  type EmailCampaign,
  type InsertEmailCampaign,
  type EmailCampaignRecipient,
  type InsertRefundRequest,
  type CountryPriceMultiplier,
  type InsertCountryPriceMultiplier,
  type WeightRangePriceMultiplier,
  type InsertWeightRangePriceMultiplier,
  type CountryPricingRule,
  type InsertCountryPricingRule,
  type WeightPricingRule,
  type InsertWeightPricingRule,
  pricingCalculationLogs,
  type PricingCalculationLog,
  type InsertPricingCalculationLog,
  type AdvisorConversation,
  type InsertAdvisorConversation,
  type EtsyConnection,
  type InsertEtsyConnection,
  type EtsyOrder,
  type InsertEtsyOrder,
  fastTrackingNotifications,
  type FastTrackingNotification,
  type InsertFastTrackingNotification,
  notificationLogs,
  type NotificationLog,
  type InsertNotificationLog,
  trackingUpdateBatches,
  type TrackingUpdateBatch,
  type InsertTrackingUpdateBatch,
  adminTasks,
  type AdminTask,
  type InsertTask,
  ShipmentStatus,
  PickupStatus,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  ReturnStatus,
  RefundRequestStatus,
  TaskStatus,
  TaskPriority,
  TaskType,
} from "@shared/schema";

import {
  contentPages,
  contentTranslations,
  type ContentPage,
  type InsertContentPage,
  type ContentTranslation,
  type InsertContentTranslation,
} from "@shared/cms-schema";
import * as schema from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { pool } from "./db";
import {
  eq,
  and,
  or,
  ne,
  gt,
  gte,
  lt,
  lte,
  asc,
  desc,
  isNull,
  isNotNull,
  sql,
  inArray,
  not,
} from "drizzle-orm";

// Create session store
const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserCount(): Promise<number>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(
    searchTerm?: string,
    page?: number,
    limit?: number,
  ): Promise<User[]>;
  updateUserBalance(userId: number, amount: number): Promise<User | undefined>;
  updateShipmentTrackingInfo(
    shipmentId: number,
    trackingNumber: string,
    labelUrl: string,
  ): Promise<Shipment | undefined>;
  setUserBalance(userId: number, balance: number): Promise<User | undefined>;
  setUserMinimumBalance(
    userId: number,
    minimumBalance: number | null,
  ): Promise<User | undefined>;
  updateUser(
    userId: number,
    userData: Partial<User>,
  ): Promise<User | undefined>;
  updateNotificationPreferences(
    userId: number,
    preferences: {
      emailMarketingCampaigns?: boolean;
      shipmentStatusUpdates?: string;
      accountNotifications?: boolean;
      adminNotifications?: boolean;
      trackingDeliveryNotifications?: boolean;
      refundReturnNotifications?: boolean;
      supportTicketNotifications?: boolean;
      customsNotifications?: boolean;
    },
  ): Promise<User | undefined>;
  updateCarrierLabelAccess(
    userId: number,
    canAccess: boolean,
  ): Promise<User | undefined>;
  approveUser(userId: number, adminId: number): Promise<User | undefined>;
  rejectUser(
    userId: number,
    adminId: number,
    reason: string,
  ): Promise<User | undefined>;
  deleteUser(userId: number): Promise<User | undefined>;
  getPendingUsers(): Promise<User[]>;

  // Email verification operations
  setVerificationToken(
    userId: number,
    token: string,
    expires: Date,
  ): Promise<User | undefined>;
  verifyEmail(token: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;

  // Password reset operations
  setPasswordResetToken(
    userId: number,
    token: string,
    expires: Date,
  ): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(
    userId: number,
    hashedPassword: string,
  ): Promise<User | undefined>;
  clearPasswordResetToken(userId: number): Promise<User | undefined>;

  // User change request operations
  createUserChangeRequest(
    userId: number,
    requestedChanges: any,
    notes?: string,
  ): Promise<schema.UserChangeRequest>;
  getUserChangeRequests(userId: number): Promise<schema.UserChangeRequest[]>;
  getAllUserChangeRequests(): Promise<schema.UserChangeRequest[]>;
  getUserChangeRequest(
    id: number,
  ): Promise<schema.UserChangeRequest | undefined>;
  getPendingUserChangeRequests(): Promise<schema.UserChangeRequest[]>;
  approveUserChangeRequest(
    id: number,
    adminId: number,
  ): Promise<schema.UserChangeRequest | undefined>;
  rejectUserChangeRequest(
    id: number,
    adminId: number,
    reason: string,
  ): Promise<schema.UserChangeRequest | undefined>;

  // Insurance operations
  createInsuranceRange(
    rangeData: schema.InsertInsuranceRange,
  ): Promise<schema.InsuranceRange>;
  getAllInsuranceRanges(): Promise<schema.InsuranceRange[]>;
  getInsuranceRangeById(id: number): Promise<schema.InsuranceRange | undefined>;
  updateInsuranceRange(
    id: number,
    data: Partial<schema.InsuranceRange>,
  ): Promise<schema.InsuranceRange | undefined>;
  deleteInsuranceRange(id: number): Promise<boolean>;
  findOverlappingInsuranceRanges(
    minValue: number,
    maxValue: number,
    excludeRangeId?: number,
  ): Promise<schema.InsuranceRange[]>;
  getInsuranceCostForValue(declaredValue: number): Promise<number | null>;

  // Shipment operations
  createShipment(
    shipment: InsertShipment,
    userId: number,
    packageItems?: any[],
  ): Promise<Shipment>;
  createBulkShipments(
    shipments: InsertShipment[],
    userId: number,
  ): Promise<Shipment[]>;
  getUserShipments(userId: number): Promise<Shipment[]>;
  getAllShipments(): Promise<Shipment[]>;
  getPendingShipments(): Promise<Shipment[]>;
  getShipment(id: number): Promise<Shipment | undefined>;
  getShipmentByTrackingNumber(
    trackingNumber: string,
  ): Promise<Shipment | undefined>;
  findShipmentByTrackingNumber(
    trackingNumber: string,
  ): Promise<Shipment | undefined>;
  getShipmentsByIds(ids: number[]): Promise<Shipment[]>;
  updateShipment(
    id: number,
    shipmentData: Partial<Shipment>,
  ): Promise<Shipment | undefined>;
  updateShipmentStatus(
    id: number,
    status: ShipmentStatus,
    labelUrl?: string,
    trackingNumber?: string,
    rejectionReason?: string,
  ): Promise<Shipment | undefined>;
  getShipmentPackageItems(shipmentId: number): Promise<schema.PackageItem[]>;
  addPackageItemToShipment(
    shipmentId: number,
    packageItem: schema.InsertPackageItem,
  ): Promise<schema.PackageItem>;
  updatePackageItem(
    id: number,
    itemData: Partial<schema.PackageItem>,
  ): Promise<schema.PackageItem | undefined>;
  getShipmentsWithMissingCarrierPdfs(): Promise<Shipment[]>;

  // Package operations
  createPhysicalPackagesForShipment(
    shipmentId: number,
    count: number,
    dimensions: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    name?: string | null,
    description?: string | null,
  ): Promise<Package[]>;
  createManyPackages(packagesData: InsertPackage[]): Promise<Package[]>;
  getPackagesByShipmentId(shipmentId: number): Promise<Package[]>;
  getPackageById(id: number): Promise<Package | undefined>;
  updatePackage(
    id: number,
    packageData: Partial<Package>,
  ): Promise<Package | undefined>;
  deletePackage(id: number): Promise<void>;

  // Transaction operations
  createTransaction(
    userId: number,
    amount: number,
    description: string,
    relatedShipmentId?: number,
  ): Promise<Transaction>;
  hasPaymentTransaction(shipmentId: number): Promise<boolean>;
  getUserTransactions(userId: number): Promise<Transaction[]>;

  // Financial activity and user actions
  getUserFinancialActivity(userId: number, limit?: number, offset?: number): Promise<any[]>;
  getUserActions(userId: number): Promise<any[]>;

  // Announcement operations
  createAnnouncement(
    announcement: InsertAnnouncement,
    createdBy: number,
  ): Promise<Announcement>;
  getAnnouncement(id: number): Promise<Announcement | undefined>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  updateAnnouncement(
    id: number,
    data: Partial<Announcement>,
  ): Promise<Announcement | undefined>;
  deleteAnnouncement(id: number): Promise<Announcement | undefined>;
  
  // Login popup announcement operations
  getLoginPopupAnnouncements(userId: number): Promise<Announcement[]>;
  markAnnouncementAsViewed(userId: number, announcementId: number): Promise<void>;

  // Marketing Banner operations
  createMarketingBanner(
    banner: InsertMarketingBanner,
    createdBy: number,
  ): Promise<MarketingBanner>;
  getMarketingBanner(id: number): Promise<MarketingBanner | undefined>;
  getActiveMarketingBanners(): Promise<MarketingBanner[]>;
  getAllMarketingBanners(): Promise<MarketingBanner[]>;
  updateMarketingBanner(
    id: number,
    data: Partial<MarketingBanner>,
  ): Promise<MarketingBanner | undefined>;
  deleteMarketingBanner(id: number): Promise<MarketingBanner | undefined>;

  // Pickup request operations
  createPickupRequest(
    userId: number,
    pickupDate: Date,
    pickupNotes?: string,
    pickupAddress?: string,
    pickupCity?: string,
    pickupPostalCode?: string,
  ): Promise<{ pickupRequest: any; pickupShipments: any[] }>;
  addShipmentsToPickupRequest(
    pickupRequestId: number,
    shipmentIds: number[],
  ): Promise<any[]>;
  getPickupRequestById(id: number): Promise<any>;
  getUserPickupRequests(userId: number): Promise<any[]>;
  getAllPickupRequests(): Promise<any[]>;
  getPickupRequestWithShipments(
    id: number,
  ): Promise<{ pickupRequest: any; shipments: Shipment[]; user: User }>;
  updatePickupRequestStatus(
    id: number,
    status: PickupStatus,
    notes?: string,
  ): Promise<any>;

  // Support ticket operations
  createSupportTicket(ticket: any): Promise<SupportTicket>;
  getSupportTicket(id: number): Promise<SupportTicket | undefined>;
  getUserSupportTickets(userId: number): Promise<SupportTicket[]>;
  getAllSupportTickets(): Promise<SupportTicket[]>;
  getOpenSupportTickets(): Promise<SupportTicket[]>;
  updateSupportTicket(
    id: number,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined>;
  assignSupportTicket(
    id: number,
    adminId: number,
  ): Promise<SupportTicket | undefined>;
  closeSupportTicket(
    id: number,
    adminId: number,
    reason: string,
  ): Promise<SupportTicket | undefined>;
  addTicketResponse(response: InsertTicketResponse): Promise<TicketResponse>;
  getTicketResponses(ticketId: number): Promise<TicketResponse[]>;
  
  // Ticket attachment operations
  addTicketAttachment(attachment: InsertTicketAttachment): Promise<TicketAttachment>;
  getTicketAttachments(ticketId: number): Promise<TicketAttachment[]>;
  getResponseAttachments(responseId: number): Promise<TicketAttachment[]>;
  deleteTicketAttachment(id: number): Promise<TicketAttachment | undefined>;
  deleteSupportTicket(ticketId: number): Promise<boolean>;
  deleteSupportTickets(ticketIds: number[]): Promise<number>;
  updateTicketsStatus(
    ticketIds: number[],
    status: TicketStatus,
    adminId: number,
    closureReason?: string,
  ): Promise<number>;

  // Admin task operations
  createTask(task: InsertTask, reporterId: number): Promise<AdminTask>;
  getTask(id: number): Promise<AdminTask | undefined>;
  getTasks(filters?: {
    q?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assigneeId?: number;
    reporterId?: number;
    page?: number;
    limit?: number;
  }): Promise<AdminTask[]>;
  updateTask(id: number, data: Partial<AdminTask>): Promise<AdminTask | undefined>;
  deleteTask(id: number): Promise<boolean>;
  deleteTasks(taskIds: number[]): Promise<number>;
  updateTasksStatus(
    taskIds: number[],
    status: TaskStatus,
    adminId: number,
  ): Promise<number>;

  // Price history operations
  recordPriceHistory(
    data: schema.InsertPriceHistory,
  ): Promise<schema.PriceHistory>;
  getPriceHistory(shipmentId: number): Promise<schema.PriceHistory[]>;

  // User products operations
  createUserProduct(
    userId: number,
    product: InsertUserProduct,
  ): Promise<UserProduct>;
  getUserProducts(userId: number): Promise<UserProduct[]>;
  getUserProductById(id: number): Promise<UserProduct | undefined>;
  searchUserProducts(userId: number, query: string): Promise<UserProduct[]>;
  updateUserProduct(
    id: number,
    productData: Partial<UserProduct>,
  ): Promise<UserProduct | undefined>;
  deleteUserProduct(id: number): Promise<UserProduct | undefined>;

  // Package template operations
  createPackageTemplate(
    userId: number,
    template: InsertPackageTemplate,
  ): Promise<PackageTemplate>;
  getUserPackageTemplates(userId: number): Promise<PackageTemplate[]>;
  getPackageTemplate(id: number): Promise<PackageTemplate | undefined>;
  updatePackageTemplate(
    id: number,
    templateData: Partial<PackageTemplate>,
  ): Promise<PackageTemplate | undefined>;
  deletePackageTemplate(id: number): Promise<PackageTemplate | undefined>;
  setDefaultPackageTemplate(
    userId: number,
    templateId: number,
  ): Promise<PackageTemplate | undefined>;
  getDefaultPackageTemplate(
    userId: number,
  ): Promise<PackageTemplate | undefined>;

  // Physical package operations
  createPackage(packageData: InsertPackage): Promise<Package>;
  createManyPackages(packagesData: InsertPackage[]): Promise<Package[]>;
  getShipmentPackages(shipmentId: number): Promise<Package[]>;
  getPackage(id: number): Promise<Package | undefined>;
  updatePackage(
    id: number,
    packageData: Partial<Package>,
  ): Promise<Package | undefined>;
  deletePackage(id: number): Promise<Package | undefined>;

  // System settings operations
  createSystemSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSetting>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  getSystemSettingValue(key: string, defaultValue?: string): Promise<string>;
  getDefaultPriceMultiplier(): Promise<number>;
  updateSystemSetting(
    key: string,
    value: string,
  ): Promise<SystemSetting | undefined>;
  deleteSystemSetting(key: string): Promise<SystemSetting | undefined>;

  // Country Price Multiplier operations
  getAllCountryPriceMultipliers(): Promise<CountryPriceMultiplier[]>;
  getCountryPriceMultiplier(countryCode: string): Promise<CountryPriceMultiplier | undefined>;
  createCountryPriceMultiplier(data: InsertCountryPriceMultiplier): Promise<CountryPriceMultiplier>;
  updateCountryPriceMultiplier(id: number, data: Partial<CountryPriceMultiplier>): Promise<CountryPriceMultiplier | undefined>;
  deleteCountryPriceMultiplier(id: number): Promise<CountryPriceMultiplier | undefined>;

  // Weight Range Price Multiplier operations
  getAllWeightRangePriceMultipliers(): Promise<WeightRangePriceMultiplier[]>;
  getWeightRangePriceMultiplier(weight: number): Promise<WeightRangePriceMultiplier | undefined>;
  createWeightRangePriceMultiplier(data: InsertWeightRangePriceMultiplier): Promise<WeightRangePriceMultiplier>;
  updateWeightRangePriceMultiplier(id: number, data: Partial<WeightRangePriceMultiplier>): Promise<WeightRangePriceMultiplier | undefined>;
  deleteWeightRangePriceMultiplier(id: number): Promise<WeightRangePriceMultiplier | undefined>;

  // User-specific Country Pricing Rules (overrides global rules)
  getUserCountryPricingRules(userId: number): Promise<schema.CountryPricingRule[]>;
  getUserCountryPricingRule(userId: number, countryCode: string): Promise<schema.CountryPricingRule | undefined>;
  createCountryPricingRule(data: schema.InsertCountryPricingRule): Promise<schema.CountryPricingRule>;
  updateCountryPricingRule(id: number, data: Partial<schema.CountryPricingRule>): Promise<schema.CountryPricingRule | undefined>;
  deleteCountryPricingRule(id: number): Promise<schema.CountryPricingRule | undefined>;

  // User-specific Weight Pricing Rules (overrides global rules)
  getUserWeightPricingRules(userId: number): Promise<schema.WeightPricingRule[]>;
  getUserWeightPricingRule(userId: number, weight: number): Promise<schema.WeightPricingRule | undefined>;
  createWeightPricingRule(data: schema.InsertWeightPricingRule): Promise<schema.WeightPricingRule>;
  updateWeightPricingRule(id: number, data: Partial<schema.WeightPricingRule>): Promise<schema.WeightPricingRule | undefined>;
  deleteWeightPricingRule(id: number): Promise<schema.WeightPricingRule | undefined>;

  // Pricing Calculation Logs (admin-only visibility)
  createPricingCalculationLog(data: schema.InsertPricingCalculationLog): Promise<schema.PricingCalculationLog>;
  getPricingCalculationLogs(options: {
    userId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<schema.PricingCalculationLog[]>;
  getPricingCalculationLogCount(options: {
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;

  // Recipient operations
  getRecipients(userId: number): Promise<schema.Recipient[]>;
  getRecipientsByUserId(userId: number): Promise<schema.Recipient[]>;
  getRecipient(id: number): Promise<schema.Recipient | undefined>;
  createRecipient(data: schema.InsertRecipient): Promise<schema.Recipient>;
  updateRecipient(
    id: number,
    data: Partial<schema.Recipient>,
  ): Promise<schema.Recipient | undefined>;
  deleteRecipient(id: number): Promise<boolean>;
  setDefaultRecipient(
    id: number,
    userId: number,
  ): Promise<schema.Recipient | undefined>;

  // Draft Shipment operations
  createDraftShipment(
    userId: number,
    draftData: InsertDraftShipment,
  ): Promise<DraftShipment>;
  getUserDraftShipments(userId: number): Promise<DraftShipment[]>;
  getDraftShipment(id: number): Promise<DraftShipment | undefined>;
  updateDraftShipment(
    id: number,
    data: Partial<DraftShipment>,
  ): Promise<DraftShipment | undefined>;
  deleteDraftShipment(id: number): Promise<boolean>;
  convertDraftToShipment(draftId: number, userId: number): Promise<Shipment>;

  // Session store
  sessionStore: any; // session store type

  // CMS operations
  getContentPages(): Promise<ContentPage[]>;
  getContentPagesByType(type: string): Promise<ContentPage[]>;
  getContentPageBySlug(slug: string): Promise<ContentPage | undefined>;
  createContentPage(page: InsertContentPage): Promise<ContentPage>;
  updateContentPage(
    id: number,
    data: Partial<ContentPage>,
  ): Promise<ContentPage | undefined>;
  deleteContentPage(id: number): Promise<boolean>;

  // Content translations
  getContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<ContentTranslation | undefined>;
  getAllContentTranslations(pageId: number): Promise<ContentTranslation[]>;
  createOrUpdateContentTranslation(
    translation: InsertContentTranslation,
  ): Promise<ContentTranslation>;
  deleteContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<boolean>;

  // Return management operations
  createReturn(returnData: InsertReturn): Promise<Return>;
  getReturns(sellerId?: number): Promise<Return[]>;
  getAllReturns(): Promise<Return[]>;
  getReturn(id: number): Promise<Return | undefined>;
  updateReturn(id: number, data: Partial<Return>): Promise<Return | undefined>;
  deleteReturn(id: number): Promise<boolean>;

  // Return photos operations
  createReturnPhoto(photoData: InsertReturnPhoto): Promise<ReturnPhoto>;
  getReturnPhotos(returnId: number): Promise<ReturnPhoto[]>;
  deleteReturnPhoto(id: number): Promise<boolean>;

  // Return filtering and reporting
  getReturnsByDateRange(
    sellerId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Return[]>;
  getReturnsByStatus(sellerId: number, status: string): Promise<Return[]>;
  getReturnsByOrderNumber(
    sellerId: number,
    orderNumber: string,
  ): Promise<Return[]>;
  getReturnsReport(sellerId: number, year: number, month: number): Promise<any>;

  // Return assignment functionality
  assignReturnToUser(
    returnId: number,
    userId: number,
    assignedBy: number,
  ): Promise<Return | undefined>;
  unassignReturn(returnId: number): Promise<Return | undefined>;
  getAssignedReturns(userId: number): Promise<Return[]>;

  // Refund request operations
  createRefundRequest(refundData: InsertRefundRequest): Promise<RefundRequest>;

  // Email campaign operations
  createEmailCampaign(
    campaignData: InsertEmailCampaign,
  ): Promise<EmailCampaign>;
  getEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaign(id: number): Promise<EmailCampaign | undefined>;
  updateEmailCampaign(
    id: number,
    data: Partial<EmailCampaign>,
  ): Promise<EmailCampaign | undefined>;
  deleteEmailCampaign(id: number): Promise<boolean>;
  sendEmailCampaign(campaignId: number, userIds: number[]): Promise<boolean>;
  getEmailCampaignRecipients(
    campaignId: number,
  ): Promise<EmailCampaignRecipient[]>;
  updateEmailCampaignRecipientStatus(
    recipientId: number,
    status: string,
    errorMessage?: string,
  ): Promise<void>;
  getEmailCampaignsByUser(userId: number): Promise<EmailCampaign[]>;
  getRefundRequests(userId?: number): Promise<RefundRequest[]>;
  getAllRefundRequests(): Promise<RefundRequest[]>;
  getRefundRequest(id: number): Promise<RefundRequest | undefined>;
  updateRefundRequest(
    id: number,
    data: Partial<RefundRequest>,
  ): Promise<RefundRequest | undefined>;
  processRefundRequest(
    id: number,
    status: RefundRequestStatus,
    processedAmount?: number,
    adminNotes?: string,
    processedBy?: number,
  ): Promise<RefundRequest | undefined>;

  // Billing reminder operations
  createBillingReminder(
    data: schema.InsertBillingReminder,
  ): Promise<schema.BillingReminder>;
  getAllBillingReminders(): Promise<schema.BillingReminder[]>;
  getBillingReminder(id: number): Promise<schema.BillingReminder | undefined>;
  updateBillingReminder(
    id: number,
    data: Partial<schema.BillingReminder>,
  ): Promise<schema.BillingReminder | undefined>;
  getBillingRemindersByUser(userId: number): Promise<schema.BillingReminder[]>;
  deleteBillingReminder(id: number): Promise<boolean>;

  // Fast tracking notification operations
  createFastTrackingNotification(
    data: InsertFastTrackingNotification,
  ): Promise<FastTrackingNotification>;
  getFastTrackingNotifications(
    limit?: number,
  ): Promise<FastTrackingNotification[]>;
  getFastTrackingNotification(
    id: number,
  ): Promise<FastTrackingNotification | undefined>;
  markFastTrackingNotificationAsRead(
    id: number,
    readBy: number,
  ): Promise<FastTrackingNotification | undefined>;
  markAllFastTrackingNotificationsAsRead(readBy: number): Promise<number>; // Returns count of updated notifications

  // Notification logs
  logNotification(logData: InsertNotificationLog): Promise<NotificationLog>;
  getNotificationLogs(limit?: number): Promise<NotificationLog[]>;
  getUserNotificationLogs(userId: number, limit?: number): Promise<NotificationLog[]>;

  // Tracking update batches
  createTrackingUpdateBatch(batchData: InsertTrackingUpdateBatch): Promise<TrackingUpdateBatch>;
  getUnprocessedTrackingUpdates(): Promise<TrackingUpdateBatch[]>;
  getUnprocessedTrackingUpdatesByUser(userId: number): Promise<TrackingUpdateBatch[]>;
  markTrackingUpdatesAsProcessed(updateIds: number[]): Promise<boolean>;
  getTrackingUpdateBatchesByShipment(shipmentId: number): Promise<TrackingUpdateBatch[]>;

  // GPT Advisor operations
  createAdvisorConversation(data: InsertAdvisorConversation): Promise<AdvisorConversation>;
  getAdvisorConversations(userId: number): Promise<AdvisorConversation[]>;
  getAdvisorConversation(id: number, userId: number): Promise<AdvisorConversation | undefined>;
  updateAdvisorConversation(id: number, userId: number, data: Partial<AdvisorConversation>): Promise<AdvisorConversation | undefined>;
  deleteAdvisorConversation(id: number, userId: number): Promise<boolean>;

  // Etsy connection operations
  createEtsyConnection(data: schema.InsertEtsyConnection): Promise<schema.EtsyConnection>;
  getEtsyConnection(userId: number): Promise<schema.EtsyConnection | undefined>;
  getEtsyConnectionByShopId(shopId: string): Promise<schema.EtsyConnection | undefined>;
  updateEtsyConnection(id: number, data: Partial<schema.EtsyConnection>): Promise<schema.EtsyConnection | undefined>;
  deleteEtsyConnection(id: number): Promise<boolean>;

  // Etsy order operations
  createEtsyOrders(orders: schema.InsertEtsyOrder[]): Promise<schema.EtsyOrder[]>;
  getEtsyOrders(userId: number): Promise<schema.EtsyOrder[]>;
  getEtsyOrder(id: number): Promise<schema.EtsyOrder | undefined>;
  getEtsyOrderByReceiptId(receiptId: string): Promise<schema.EtsyOrder | undefined>;
  updateEtsyOrder(id: number, data: Partial<schema.EtsyOrder>): Promise<schema.EtsyOrder | undefined>;
  getUnshippedEtsyOrders(userId: number): Promise<schema.EtsyOrder[]>;
}

// Database storage implementation class
export class DatabaseStorage {
  sessionStore: any;

  constructor() {
    // Setup session store with PostgreSQL - more reliable configuration
    try {
      this.sessionStore = new PostgresSessionStore({
        pool,
        createTableIfMissing: true,
        tableName: "session",
        ttl: 30 * 24 * 60 * 60, // 30 days in seconds
        disableTouch: false, // Allow session expiration extension
        pruneSessionInterval: false, // Disable auto-pruning to prevent session loss
      });
      console.log("Using PostgreSQL session store with stable configuration");
    } catch (err) {
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours
        stale: false, // Don't delete stale sessions
        max: 10000, // Increase max sessions
      });
    }

    // Delay admin user creation to avoid circular dependencies during startup
    setTimeout(() => {
      this.initializeAdminUser().catch((err) => {});
    }, 2000);
  }

  // Separate method to initialize admin user to avoid circular dependency
  private async initializeAdminUser() {
    try {
      const user = await this.getUserByUsername("admin");
      if (!user) {
        console.log("Admin user not found, creating default admin account");
        await this.createUser({
          username: "admin",
          password:
            "$2b$10$wwq7C4WWSN.dix8Lo7u4c.UCbdaBoCfrxZN3WMzAFBC9tqvtqkEem", // "admin123"
          name: "Admin User",
          email: "admin@moogship.com",
          role: "admin",
        });
        console.log("Default admin user created successfully");
      }
    } catch (error) {
      console.error("Failed to initialize default admin user:", error);
    }
  }

  // Draft shipment operations
  async createDraftShipment(
    userId: number,
    draftData: InsertDraftShipment,
  ): Promise<DraftShipment> {
    try {
      const now = new Date();

      const [createdDraft] = await db
        .insert(draftShipments)
        .values({
          ...draftData,
          userId,
          createdAt: now,
          lastUpdated: now,
        })
        .returning();

      return createdDraft;
    } catch (error) {
      throw error;
    }
  }

  async getUserDraftShipments(userId: number): Promise<DraftShipment[]> {
    try {
      return await db
        .select()
        .from(draftShipments)
        .where(eq(draftShipments.userId, userId))
        .orderBy(desc(draftShipments.lastUpdated));
    } catch (error) {
      return [];
    }
  }

  async getDraftShipment(id: number): Promise<DraftShipment | undefined> {
    try {
      const [draft] = await db
        .select()
        .from(draftShipments)
        .where(eq(draftShipments.id, id));

      return draft;
    } catch (error) {
      return undefined;
    }
  }

  async updateDraftShipment(
    id: number,
    draftData: Partial<DraftShipment>,
  ): Promise<DraftShipment | undefined> {
    try {
      const now = new Date();

      // First get the existing draft to preserve the userId
      const existingDraft = await this.getDraftShipment(id);
      if (!existingDraft) {
        return undefined;
      }

      // Make sure we preserve the original userId and don't overwrite it
      const updatedData = {
        ...draftData,
        userId: existingDraft.userId, // Ensure userId remains the same
        lastUpdated: now,
      };

      const [updatedDraft] = await db
        .update(draftShipments)
        .set(updatedData)
        .where(eq(draftShipments.id, id))
        .returning();

      return updatedDraft;
    } catch (error) {
      return undefined;
    }
  }

  async deleteDraftShipment(id: number): Promise<boolean> {
    try {
      await db.delete(draftShipments).where(eq(draftShipments.id, id));

      return true;
    } catch (error) {
      return false;
    }
  }

  async convertDraftToShipment(
    draftId: number,
    userId: number,
  ): Promise<Shipment> {
    try {
      // Get the draft
      const draft = await this.getDraftShipment(draftId);

      if (!draft) {
        throw new Error("Draft not found");
      }

      // Create a new shipment from the draft data
      const shipmentData: InsertShipment = {
        senderName: draft.senderName || "",
        senderAddress: draft.senderAddress1 || "", // Using address1 for the backward compatible field
        senderAddress1: draft.senderAddress1 || "",
        senderAddress2: draft.senderAddress2 || null,
        senderCity: draft.senderCity || "",
        senderPostalCode: draft.senderPostalCode || "",
        senderPhone: draft.senderPhone || "",
        senderEmail: draft.senderEmail || "",

        receiverName: draft.receiverName || "",
        receiverAddress: draft.receiverAddress || "",
        receiverCity: draft.receiverCity || "",
        receiverState: draft.receiverState || null,
        receiverCountry: draft.receiverCountry || "",
        receiverPostalCode: draft.receiverPostalCode || "",
        receiverPhone: draft.receiverPhone || "",
        receiverEmail: draft.receiverEmail || null,

        packageLength: draft.packageLength || 0,
        packageWidth: draft.packageWidth || 0,
        packageHeight: draft.packageHeight || 0,
        packageWeight: draft.packageWeight || 0,
        packageContents: draft.packageContents || "",
        pieceCount: draft.pieceCount || 1,

        isInsured: false,
        insuranceValue: 0,
        currency: "USD",
        serviceLevel: "standard",
        customerAccepted: false,
      };

      // Create the shipment (passing userId directly instead of shipmentData)
      const shipment = await this.createShipment(shipmentData, userId);

      // Delete the draft after successful conversion
      await this.deleteDraftShipment(draftId);

      return shipment;
    } catch (error) {
      throw error;
    }
  }

  // User products operations
  async createUserProduct(
    userId: number,
    product: InsertUserProduct,
  ): Promise<UserProduct> {
    try {
      const now = new Date();

      const [createdProduct] = await db
        .insert(userProducts)
        .values({
          ...product,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdProduct;
    } catch (error) {
      throw error;
    }
  }

  async getUserProducts(userId: number): Promise<UserProduct[]> {
    try {
      return await db
        .select()
        .from(userProducts)
        .where(eq(userProducts.userId, userId))
        .orderBy(asc(userProducts.name));
    } catch (error) {
      return [];
    }
  }

  async getUserProductById(id: number): Promise<UserProduct | undefined> {
    try {
      const [product] = await db
        .select()
        .from(userProducts)
        .where(eq(userProducts.id, id));

      return product;
    } catch (error) {
      return undefined;
    }
  }

  async searchUserProducts(
    userId: number,
    query: string,
  ): Promise<UserProduct[]> {
    try {
      if (!query || query.trim() === "") {
        return this.getUserProducts(userId);
      }

      // Convert query to lowercase for case-insensitive search
      const searchQuery = `%${query.toLowerCase()}%`;

      // Use SQL ILIKE for case-insensitive partial matching
      return await db
        .select()
        .from(userProducts)
        .where(
          and(
            eq(userProducts.userId, userId),
            or(
              sql`LOWER(${userProducts.name}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.description}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.manufacturer}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.sku}) LIKE ${searchQuery}`,
            ),
          ),
        )
        .orderBy(asc(userProducts.name));
    } catch (error) {
      return [];
    }
  }

  async updateUserProduct(
    id: number,
    productData: Partial<UserProduct>,
  ): Promise<UserProduct | undefined> {
    try {
      const product = await this.getUserProductById(id);

      if (!product) {
        return undefined;
      }

      const [updatedProduct] = await db
        .update(userProducts)
        .set({
          ...productData,
          updatedAt: new Date(),
        })
        .where(eq(userProducts.id, id))
        .returning();

      return updatedProduct;
    } catch (error) {
      return undefined;
    }
  }

  async deleteUserProduct(id: number): Promise<UserProduct | undefined> {
    try {
      const product = await this.getUserProductById(id);

      if (!product) {
        return undefined;
      }

      await db.delete(userProducts).where(eq(userProducts.id, id));

      return product;
    } catch (error) {
      return undefined;
    }
  }

  // Support ticket operations
  async createSupportTicket(ticket: any): Promise<SupportTicket> {
    const now = new Date();

    const [createdTicket] = await db
      .insert(supportTickets)
      .values({
        ...ticket,
        status: TicketStatus.OPEN,
        createdAt: now,
        updatedAt: now,
        assignedTo: null,
        closedBy: null,
        closedAt: null,
        closureReason: null,
      })
      .returning();

    return createdTicket;
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, id));

    return ticket;
  }

  async getUserSupportTickets(userId: number): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .orderBy(desc(supportTickets.createdAt));
  }

  async getOpenSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select()
      .from(supportTickets)
      .where(
        or(
          eq(supportTickets.status, TicketStatus.OPEN),
          eq(supportTickets.status, TicketStatus.IN_PROGRESS),
          eq(supportTickets.status, TicketStatus.WAITING_ON_CUSTOMER),
        ),
      )
      .orderBy(desc(supportTickets.createdAt));
  }

  async updateSupportTicket(
    id: number,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async assignSupportTicket(
    id: number,
    adminId: number,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    // Update the ticket status and assignee
    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        status: TicketStatus.IN_PROGRESS,
        assignedTo: adminId,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async closeSupportTicket(
    id: number,
    adminId: number,
    reason: string,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    const now = new Date();

    // Update the ticket status and set closure information
    const [updatedTicket] = await db
      .update(supportTickets)
      .set({
        status: TicketStatus.CLOSED,
        closedBy: adminId,
        closedAt: now,
        closureReason: reason,
        updatedAt: now,
      })
      .where(eq(supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async addTicketResponse(
    response: InsertTicketResponse,
  ): Promise<TicketResponse> {
    const [createdResponse] = await db
      .insert(ticketResponses)
      .values({
        ...response,
        createdAt: new Date(),
      })
      .returning();

    return createdResponse;
  }

  async getTicketResponses(ticketId: number): Promise<TicketResponse[]> {
    return await db
      .select()
      .from(ticketResponses)
      .where(eq(ticketResponses.ticketId, ticketId))
      .orderBy(asc(ticketResponses.createdAt));
  }

  // Ticket attachment operations
  async addTicketAttachment(
    attachment: InsertTicketAttachment,
  ): Promise<TicketAttachment> {
    const [createdAttachment] = await db
      .insert(ticketAttachments)
      .values({
        ...attachment,
        uploadedAt: new Date(),
      })
      .returning();

    return createdAttachment;
  }

  async getTicketAttachments(ticketId: number): Promise<TicketAttachment[]> {
    return await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId))
      .orderBy(asc(ticketAttachments.uploadedAt));
  }

  async getResponseAttachments(responseId: number): Promise<TicketAttachment[]> {
    return await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.responseId, responseId))
      .orderBy(asc(ticketAttachments.uploadedAt));
  }

  async deleteTicketAttachment(id: number): Promise<TicketAttachment | undefined> {
    const [deletedAttachment] = await db
      .delete(ticketAttachments)
      .where(eq(ticketAttachments.id, id))
      .returning();

    return deletedAttachment;
  }

  // Announcement operations
  async createAnnouncement(
    announcement: InsertAnnouncement,
    createdBy: number,
  ): Promise<Announcement> {
    const now = new Date();

    const [createdAnnouncement] = await db
      .insert(announcements)
      .values({
        ...announcement,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createdAnnouncement;
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));

    return announcement;
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();

    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          // Only include non-expired announcements or those without expiration
          sql`(${announcements.expiresAt} IS NULL OR ${announcements.expiresAt} > ${now})`,
        ),
      )
      .orderBy(desc(announcements.createdAt));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async updateAnnouncement(
    id: number,
    data: Partial<Announcement>,
  ): Promise<Announcement | undefined> {
    const announcement = await this.getAnnouncement(id);

    if (!announcement) {
      return undefined;
    }

    const [updatedAnnouncement] = await db
      .update(announcements)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();

    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: number): Promise<Announcement | undefined> {
    const announcement = await this.getAnnouncement(id);

    if (!announcement) {
      return undefined;
    }

    await db.delete(announcements).where(eq(announcements.id, id));

    return announcement;
  }

  async getLoginPopupAnnouncements(userId: number): Promise<Announcement[]> {
    const viewedAnnouncementIds = await db
      .select({ announcementId: userAnnouncementViews.announcementId })
      .from(userAnnouncementViews)
      .where(eq(userAnnouncementViews.userId, userId));

    const viewedIds = viewedAnnouncementIds.map(v => v.announcementId);

    const loginPopups = await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.isActive, true),
          eq(announcements.showOnLogin, true),
          or(
            isNull(announcements.expiresAt),
            gt(announcements.expiresAt, new Date())
          ),
          viewedIds.length > 0 ? not(inArray(announcements.id, viewedIds)) : sql`true`
        )
      )
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));

    return loginPopups;
  }

  async markAnnouncementAsViewed(userId: number, announcementId: number): Promise<void> {
    await db.insert(userAnnouncementViews).values({
      userId,
      announcementId
    }).onConflictDoNothing();
  }

  // Marketing Banner operations
  async createMarketingBanner(
    banner: InsertMarketingBanner,
    createdBy: number,
  ): Promise<MarketingBanner> {
    const result = await db
      .insert(marketingBanners)
      .values({
        ...banner,
        createdBy,
      })
      .returning();
    return result[0];
  }

  async getMarketingBanner(id: number): Promise<MarketingBanner | undefined> {
    const result = await db
      .select()
      .from(marketingBanners)
      .where(eq(marketingBanners.id, id));
    return result[0];
  }

  async getActiveMarketingBanners(): Promise<MarketingBanner[]> {
    const now = new Date();
    return db
      .select()
      .from(marketingBanners)
      .where(
        and(
          eq(marketingBanners.isActive, true),
          or(
            isNull(marketingBanners.startDate),
            lte(marketingBanners.startDate, now),
          ),
          or(
            isNull(marketingBanners.endDate),
            gte(marketingBanners.endDate, now),
          ),
        ),
      )
      .orderBy(
        asc(marketingBanners.sortOrder),
        desc(marketingBanners.createdAt),
      );
  }

  async getAllMarketingBanners(): Promise<MarketingBanner[]> {
    return db
      .select()
      .from(marketingBanners)
      .orderBy(
        asc(marketingBanners.sortOrder),
        desc(marketingBanners.createdAt),
      );
  }

  async updateMarketingBanner(
    id: number,
    data: Partial<MarketingBanner>,
  ): Promise<MarketingBanner | undefined> {
    const banner = await this.getMarketingBanner(id);

    if (!banner) {
      return undefined;
    }

    const updatedBanner = {
      ...banner,
      ...data,
      updatedAt: new Date(),
    };

    await db
      .update(marketingBanners)
      .set(updatedBanner)
      .where(eq(marketingBanners.id, id));

    return updatedBanner;
  }

  async deleteMarketingBanner(
    id: number,
  ): Promise<MarketingBanner | undefined> {
    const banner = await this.getMarketingBanner(id);

    if (!banner) {
      return undefined;
    }

    await db.delete(marketingBanners).where(eq(marketingBanners.id, id));

    return banner;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async deleteUser(userId: number): Promise<User | undefined> {
    // First get the user to return later
    const user = await this.getUser(userId);

    if (!user) {
      return undefined;
    }

    // Delete the user
    await db.delete(users).where(eq(users.id, userId));

    return user;
  }

  async getAllUsers(
    searchTerm?: string,
    page?: number,
    limit?: number,
  ): Promise<User[]> {
    try {
      console.log("[STORAGE] getAllUsers called with params:", {
        searchTerm,
        page,
        limit,
      });

      // First, test if the users table exists and has data
      try {
        const tableCheck = await db.execute(
          sql`SELECT COUNT(*) as count FROM users LIMIT 1`,
        );
        console.log("[STORAGE] Users table check result:", tableCheck);
      } catch (tableError) {}

      let query = db.select().from(users);

      // Apply search filter if provided
      if (searchTerm && searchTerm.trim() !== "") {
        const searchPattern = `%${searchTerm.toLowerCase()}%`;
        const searchId = parseInt(searchTerm);
        
        const conditions = [
          sql`LOWER(${users.name}) LIKE ${searchPattern}`,
          sql`LOWER(${users.username}) LIKE ${searchPattern}`,
          sql`LOWER(${users.email}) LIKE ${searchPattern}`,
          sql`LOWER(${users.role}) LIKE ${searchPattern}`,
          sql`LOWER(${users.companyName}) LIKE ${searchPattern}`,
        ];
        
        if (!isNaN(searchId)) {
          conditions.push(eq(users.id, searchId));
        }
        
        query = query.where(or(...conditions));
      }

      // Apply pagination if provided
      if (page && limit) {
        const offset = (page - 1) * limit;
        query = query.limit(limit).offset(offset);
      }

      // Order by name for consistent results
      query = query.orderBy(users.name);

      const result = await query;
      console.log(
        "[STORAGE] getAllUsers query executed successfully, returned:",
        result.length,
        "users",
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  async updateUserBalance(
    userId: number,
    amount: number,
  ): Promise<User | undefined> {
    console.log(
      `[DB] ATOMIC UPDATE: Processing balance change for user ${userId} by ${amount} cents`,
    );

    // Get current user data for validation
    const user = await this.getUser(userId);

    if (!user) {
      console.log(`[DB] User ${userId} not found, cannot update balance`);
      return undefined;
    }

    console.log(
      `[DB] Current balance for user ${userId}: ${user.balance} cents (${(user.balance / 100).toFixed(2)} USD)`,
    );

    // Get minimum balance settings for validation
    let minBalance = user.minimumBalance;
    console.log(
      `[DB] User minimum balance: ${minBalance !== null ? minBalance + " cents" : "not set (using system default)"}`,
    );

    // If user has no individual limit, get system minimum balance setting
    if (minBalance === null) {
      try {
        const [minBalanceSetting] = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, "MIN_BALANCE"));

        const minBalanceStr = minBalanceSetting?.value || "";
        minBalance = minBalanceStr ? parseInt(minBalanceStr, 10) : null;
        console.log(
          `[DB] System minimum balance: ${minBalance !== null ? minBalance + " cents" : "not set"}`,
        );
      } catch (error) {
        console.error("[DB] Failed to fetch minimum balance setting:", error);
      }
    }

    // Calculate expected new balance for validation
    const expectedNewBalance = user.balance + amount;
    console.log(
      `[DB] Expected new balance: ${expectedNewBalance} cents (${(expectedNewBalance / 100).toFixed(2)} USD)`,
    );

    // Check if new balance would be below minimum (only for negative adjustments)
    if (amount < 0 && minBalance !== null && expectedNewBalance < minBalance) {
      const errorMsg = `Cannot reduce balance below minimum limit of $${(minBalance / 100).toFixed(2)}`;

      throw new Error(errorMsg);
    }

    // CRITICAL FIX: Use atomic SQL arithmetic to prevent race conditions
    // Instead of read-calculate-write, do arithmetic directly in SQL
    console.log(
      `[DB] ATOMIC UPDATE: Performing direct SQL arithmetic: balance = balance + ${amount}`,
    );

    const [updatedUser] = await db
      .update(users)
      .set({
        balance: sql`${users.balance} + ${amount}`, // Atomic operation
      })
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser) {
      console.log(
        `[DB] ✅ ATOMIC UPDATE SUCCESS: User ${userId} balance updated from ${user.balance} to ${updatedUser.balance} cents`,
      );
      console.log(
        `[DB] Change applied: ${amount} cents = $${(amount / 100).toFixed(2)}`,
      );
      console.log(
        `[DB] Final balance: ${updatedUser.balance} cents = $${(updatedUser.balance / 100).toFixed(2)}`,
      );
    } else {
    }

    return updatedUser;
  }

  async setUserBalance(
    userId: number,
    balance: number,
  ): Promise<User | undefined> {
    // Get user with direct DB query to avoid mapping issues
    const [userFromDb] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!userFromDb) {
      return undefined;
    }

    // First check the user's individual minimum balance setting
    let minBalance = userFromDb.minimumBalance;
    console.log(
      `[DB] User minimum balance from DB: ${minBalance !== null ? minBalance + " cents" : "not set (using system default)"}`,
    );

    // If user has no individual limit, get system minimum balance setting
    if (minBalance === null) {
      try {
        // Get the system setting directly with a direct DB query
        const [minBalanceSetting] = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, "MIN_BALANCE"));

        const minBalanceStr = minBalanceSetting?.value || "";
        minBalance = minBalanceStr ? parseInt(minBalanceStr, 10) : null;
        console.log(
          `[DB] System minimum balance: ${minBalance !== null ? minBalance + " cents" : "not set"}`,
        );
      } catch (error) {
        console.error("[DB] Failed to fetch system minimum balance for setBalance:", error);
      }
    }

    // Check if new balance would be below minimum
    if (minBalance !== null && balance < minBalance) {
      throw new Error(
        `Cannot set balance below minimum limit of $${(minBalance / 100).toFixed(2)}`,
      );
    }

    // Set the user's balance to the exact amount
    const [updatedUser] = await db
      .update(users)
      .set({
        balance: balance,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }


  async updateUser(
    userId: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const user = await this.getUser(userId);

    if (!user) {
      return undefined;
    }

    // If userData contains a password, use it, otherwise preserve original password
    const password = userData.password || user.password;

    // Update the user, preserving sensitive fields except password if provided
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        // Explicitly set password based on logic above
        password,
        // Preserve other sensitive fields
        balance:
          userData.balance !== undefined ? userData.balance : user.balance,
        isApproved:
          userData.isApproved !== undefined
            ? userData.isApproved
            : user.isApproved,
        approvedBy:
          userData.approvedBy !== undefined
            ? userData.approvedBy
            : user.approvedBy,
        approvedAt:
          userData.approvedAt !== undefined
            ? userData.approvedAt
            : user.approvedAt,
        rejectionReason:
          userData.rejectionReason !== undefined
            ? userData.rejectionReason
            : user.rejectionReason,

        // Handle phone and address fields explicitly to ensure they're properly processed
        phone: userData.phone !== undefined ? userData.phone : user.phone,
        address1:
          userData.address1 !== undefined ? userData.address1 : user.address1,
        address2:
          userData.address2 !== undefined ? userData.address2 : user.address2,
        city: userData.city !== undefined ? userData.city : user.city,
        postalCode:
          userData.postalCode !== undefined
            ? userData.postalCode
            : user.postalCode,
        country:
          userData.country !== undefined ? userData.country : user.country,

        // Update legacy address field for backward compatibility if address1 is provided
        address: userData.address1
          ? `${userData.address1}${userData.address2 ? ", " + userData.address2 : ""}${userData.city ? ", " + userData.city : ""}${userData.postalCode ? " " + userData.postalCode : ""}${userData.country ? ", " + userData.country : ""}`
          : userData.address !== undefined
            ? userData.address
            : user.address,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async updateNotificationPreferences(
    userId: number,
    preferences: {
      emailMarketingCampaigns?: boolean;
      shipmentStatusUpdates?: string;
      accountNotifications?: boolean;
      adminNotifications?: boolean;
      trackingDeliveryNotifications?: boolean;
      refundReturnNotifications?: boolean;
      supportTicketNotifications?: boolean;
      customsNotifications?: boolean;
    },
  ): Promise<User | undefined> {
    return this.updateUser(userId, preferences);
  }

  async hasPaymentTransaction(shipmentId: number): Promise<boolean> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.relatedShipmentId, shipmentId),
          lt(transactions.amount, 0) // Negative amount means payment/charge
        )
      );
    
    return result[0]?.count > 0;
  }

  async createTransaction(
    userId: number,
    amount: number,
    description: string,
    relatedShipmentId?: number,
  ): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values({
        userId,
        amount,
        description,
        relatedShipmentId: relatedShipmentId || null,
      })
      .returning();

    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Financial activity operations
  async getUserFinancialActivity(userId: number, limit?: number, offset?: number): Promise<any[]> {
    try {
      // Get all transactions for this user with optional pagination support
      const baseQuery = db
        .select({
          id: transactions.id,
          type: sql<string>`CASE WHEN ${transactions.amount} > 0 THEN 'credit' ELSE 'debit' END`,
          description: transactions.description,
          amount: transactions.amount,
          createdAt: transactions.createdAt,
          relatedShipmentId: transactions.relatedShipmentId,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));
        
      // Apply limit and offset only if provided
      const userTransactions = limit !== undefined 
        ? await baseQuery.limit(limit).offset(offset || 0)
        : await baseQuery;

      // Calculate running balance for each transaction
      let runningBalance = 0;

      // Get user's current balance to start calculations
      const user = await this.getUser(userId);
      if (user) {
        runningBalance = user.balance;
      }

      // Add running balance to each transaction (working backwards from most recent)
      const transactionsWithBalance = userTransactions.map(
        (transaction, index) => {
          const balanceAfter = runningBalance;
          // Subtract this transaction's amount to get balance before this transaction
          runningBalance -= transaction.amount;

          return {
            ...transaction,
            balanceAfter,
            // Format amount in cents for display
            formattedAmount: `$${(Math.abs(transaction.amount) / 100).toFixed(2)}`,
            formattedBalance: `$${(balanceAfter / 100).toFixed(2)}`,
          };
        },
      );

      return transactionsWithBalance;
    } catch (error) {
      return [];
    }
  }

  async getUserActions(userId: number): Promise<any[]> {
    try {
      // Get comprehensive user actions from multiple sources
      const actions: any[] = [];

      // Get transactions as financial actions
      const financialActions = await db
        .select({
          createdAt: transactions.createdAt,
          actionType: sql<string>`'financial'`,
          description: transactions.description,
          shipmentId: transactions.relatedShipmentId,
          amount: transactions.amount,
          ipAddress: sql<string>`NULL`,
          userAgent: sql<string>`NULL`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));

      actions.push(...financialActions);

      // Get shipment creation actions
      const shipmentActions = await db
        .select({
          createdAt: shipments.createdAt,
          actionType: sql<string>`'shipment_created'`,
          description: sql<string>`CONCAT('Created shipment ', ${shipments.trackingNumber})`,
          shipmentId: shipments.id,
          amount: sql<number>`NULL`,
          ipAddress: sql<string>`NULL`,
          userAgent: sql<string>`NULL`,
        })
        .from(shipments)
        .where(eq(shipments.userId, userId))
        .orderBy(desc(shipments.createdAt));

      actions.push(...shipmentActions);

      // Sort all actions by date descending
      return actions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      return [];
    }
  }

  // Shipment operations
  async createShipment(
    insertShipment: InsertShipment,
    userId: number,
    packageItems?: any[],
  ): Promise<Shipment> {
    const now = new Date();

    // Extract pricing and service properties from insertShipment if they exist
    const {
      serviceLevel,
      basePrice,
      fuelCharge,
      taxes,
      totalPrice,
      carrierName,
      estimatedDeliveryDays,
      // New original price fields
      originalBasePrice,
      originalFuelCharge,
      originalTotalPrice,
      appliedMultiplier,
      // New generic provider system fields
      selectedService,
      shippingProvider,
      providerServiceCode,
      // Insurance fields
      includeInsurance,
      insuranceCost,
      declaredValue,
      // Extract package items to handle separately
      packageItems: itemsData,
      ...validData
    } = insertShipment as any; // Use any to handle extra properties

    // Handle the sender address fields
    const senderAddress = validData.senderAddress || "";

    // If senderAddress1 isn't provided, use the first 35 chars of senderAddress
    if (!validData.senderAddress1) {
      validData.senderAddress1 = senderAddress.substring(0, 35);
    }

    // If senderAddress2 isn't provided, use any content past the first 35 chars
    if (!validData.senderAddress2 && senderAddress.length > 35) {
      validData.senderAddress2 = senderAddress.substring(35);
    }

    const [shipment] = await db
      .insert(shipments)
      .values({
        ...validData,
        userId,
        status: ShipmentStatus.PENDING,
        serviceLevel: serviceLevel || null,
        labelUrl: null,
        trackingNumber: null,
        trackingInfo: null,
        basePrice: basePrice || null,
        fuelCharge: fuelCharge || null,
        taxes: taxes || null,
        totalPrice: totalPrice || null,
        // Store original price information with proper cost calculation
        // Fix double multiplication bug: if originalTotalPrice equals totalPrice with multiplier > 1, calculate true cost
        originalBasePrice:
          originalBasePrice &&
          appliedMultiplier &&
          appliedMultiplier > 1 &&
          originalBasePrice === basePrice
            ? Math.round(basePrice / appliedMultiplier)
            : originalBasePrice ||
              (basePrice && appliedMultiplier && appliedMultiplier > 1
                ? Math.round(basePrice / appliedMultiplier)
                : basePrice) ||
              null,
        originalFuelCharge:
          originalFuelCharge &&
          appliedMultiplier &&
          appliedMultiplier > 1 &&
          originalFuelCharge === fuelCharge
            ? Math.round(fuelCharge / appliedMultiplier)
            : originalFuelCharge ||
              (fuelCharge && appliedMultiplier && appliedMultiplier > 1
                ? Math.round(fuelCharge / appliedMultiplier)
                : fuelCharge) ||
              null,
        originalTotalPrice:
          originalTotalPrice &&
          appliedMultiplier &&
          appliedMultiplier > 1 &&
          originalTotalPrice === totalPrice
            ? Math.round(totalPrice / appliedMultiplier)
            : originalTotalPrice ||
              (totalPrice && appliedMultiplier && appliedMultiplier > 1
                ? Math.round(totalPrice / appliedMultiplier)
                : totalPrice) ||
              null,
        appliedMultiplier: appliedMultiplier || 1,
        // Generic provider system fields
        selectedService: selectedService || null,
        shippingProvider: (() => {
          // If explicitly provided, use it
          if (shippingProvider) {
            return shippingProvider;
          }

          // Otherwise, detect based on service characteristics
          const serviceName = selectedService || providerServiceCode || '';
          const svc = serviceName.toLowerCase();

          // External pricing services (ext-carrier-service format)
          if (svc.includes('ext-ups')) return 'shipentegra';
          if (svc.includes('ext-fedex')) return 'shipentegra';
          if (svc.includes('ext-thy')) return 'shipentegra';
          if (svc.includes('ext-aramex')) return 'aramex';
          if (svc.includes('ext-widect')) return 'shipentegra';

          // Aramex services: check for aramex in service names
          if (svc.includes('aramex')) return 'aramex';

          // AFS services: check for afs- prefix or EcoAFS in names
          if (svc.includes('afs-') || svc.includes('ecoafs')) return 'afs';

          // Default to shipentegra for other services
          return 'shipentegra';
        })(),
        providerServiceCode: providerServiceCode || null,
        // Insurance information
        insuranceValue: declaredValue || validData.customsValue || null,
        insuranceCost: insuranceCost || null,
        isInsured: includeInsurance === true ? true : false,
        carrierName: (() => {
          // If explicitly provided, use it
          if (carrierName) {
            return carrierName;
          }

          // Otherwise, detect based on service characteristics
          const serviceName = selectedService || providerServiceCode || '';
          const svc = serviceName.toLowerCase();

          // External pricing services - use MoogShip branded names
          if (svc.includes('ext-ups')) return 'MoogShip UPS Express';
          if (svc.includes('ext-fedex')) return 'MoogShip FedEx Express';
          if (svc.includes('ext-thy')) return 'MoogShip Widect Eco';
          if (svc.includes('ext-aramex')) return 'MoogShip Aramex Express';
          if (svc.includes('ext-widect')) return 'MoogShip-Widect';

          // Aramex services
          if (svc.includes('aramex')) return 'Aramex';

          // AFS services
          if (svc.includes('afs-') || svc.includes('ecoafs')) return 'AFS Transport';

          // Default to Shipentegra for other services
          return 'Shipentegra';
        })(),
        estimatedDeliveryDays: estimatedDeliveryDays || null,
        customerAccepted: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Handle package items if provided
    const items = packageItems || itemsData;
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(
        `Adding ${items.length} package items to shipment ${shipment.id}`,
      );

      // Insert each package item
      for (const item of items) {
        await this.addPackageItemToShipment(shipment.id, item);
      }
    }

    return shipment;
  }

  // Create physical packages for a shipment
  async createPhysicalPackagesForShipment(
    shipmentId: number,
    count: number,
    dimensions: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    name: string | null = null,
    description: string | null = null,
    notes: string | null = null,
  ): Promise<Package[]> {
    try {
      if (!count || count <= 0) {
        return [];
      }

      console.log(
        `Creating ${count} physical package entries for shipment ${shipmentId}`,
      );

      // Create package entries for each physical package
      const packageEntries: InsertPackage[] = [];

      for (let i = 0; i < count; i++) {
        // First create the package with potential string values
        const packageData = {
          shipmentId,
          name: name || (i === 0 ? "Main Package" : `Package ${i + 1}`),
          description: description || `Package ${i + 1} of ${count}`,
          notes: notes || null,
          weight: dimensions.weight,
          length: dimensions.length,
          width: dimensions.width,
          height: dimensions.height,
        };

        // Convert all dimensions to string values for package schema
        const convertedPackage: InsertPackage = {
          ...packageData,
          weight:
            typeof packageData.weight === "number"
              ? packageData.weight.toString()
              : packageData.weight,
          length:
            typeof packageData.length === "number"
              ? packageData.length.toString()
              : packageData.length,
          width:
            typeof packageData.width === "number"
              ? packageData.width.toString()
              : packageData.width,
          height:
            typeof packageData.height === "number"
              ? packageData.height.toString()
              : packageData.height,
        };

        // Add the properly typed package to our entries
        packageEntries.push(convertedPackage);
      }

      if (packageEntries.length > 0) {
        const packages = await this.createManyPackages(packageEntries);
        console.log(
          `Successfully created ${packages.length} package entries for shipment ${shipmentId}`,
        );
        return packages;
      }

      return [];
    } catch (error) {
      return []; // Return empty array on error
    }
  }

  // Method to create multiple physical packages
  async createManyPackages(packagesData: InsertPackage[]): Promise<Package[]> {
    try {
      if (packagesData.length === 0) {
        return [];
      }

      const now = new Date();
      const packagesWithTimestamps = packagesData.map((pkg) => ({
        ...pkg,
        createdAt: now,
        updatedAt: now,
      }));

      return await db
        .insert(packages)
        .values(packagesWithTimestamps)
        .returning();
    } catch (error) {
      throw error;
    }
  }

  // Add a new method to save package items
  async addPackageItemToShipment(
    shipmentId: number,
    packageItem: any,
  ): Promise<any> {
    const now = new Date();

    // Process price - convert from decimal to cents
    // Handle both period and comma decimal separators (Turkish locale uses comma)
    let priceInCents = 0;

    if (packageItem.price) {
      try {
        // First, standardize the format (replace comma with period for processing)
        const priceStr = String(packageItem.price).replace(",", ".");
        // Parse as float and convert to cents (multiply by 100)
        const priceFloat = parseFloat(priceStr);

        if (!isNaN(priceFloat)) {
          priceInCents = Math.round(priceFloat * 100);
        }

        console.log(
          `Converted price ${packageItem.price} to ${priceInCents} cents`,
        );
      } catch (error) {
        // If conversion fails, default to 0 cents
        priceInCents = 0;
      }
    }

    // Process other numeric fields to ensure they're the right type
    let quantity = 1;
    if (packageItem.quantity) {
      quantity = parseInt(String(packageItem.quantity), 10) || 1;
    }

    // Convert weight to number
    let weight = null;
    if (packageItem.weight) {
      const weightStr = String(packageItem.weight).replace(",", ".");
      weight = parseFloat(weightStr) || null;
    }

    // Convert dimensions to integers
    let length = null;
    if (packageItem.length) {
      length =
        Math.round(parseFloat(String(packageItem.length).replace(",", "."))) ||
        null;
    }

    let width = null;
    if (packageItem.width) {
      width =
        Math.round(parseFloat(String(packageItem.width).replace(",", "."))) ||
        null;
    }

    let height = null;
    if (packageItem.height) {
      height =
        Math.round(parseFloat(String(packageItem.height).replace(",", "."))) ||
        null;
    }

    // Insert the package item with properly converted values
    const [createdItem] = await db
      .insert(schema.packageItems)
      .values({
        shipmentId,
        name: packageItem.name,
        description: packageItem.description || null,
        quantity: quantity,
        price: priceInCents,
        gtin: packageItem.gtin || null,
        hsCode: packageItem.hsCode || null,
        weight: weight,
        length: length,
        width: width,
        height: height,
        countryOfOrigin: packageItem.countryOfOrigin || null,
        manufacturer: packageItem.manufacturer || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createdItem;
  }

  // Add a method to retrieve package items for a shipment
  async getShipmentPackageItems(shipmentId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.packageItems)
      .where(eq(schema.packageItems.shipmentId, shipmentId))
      .orderBy(asc(schema.packageItems.id));
  }

  // Add a method to update a package item
  async updatePackageItem(
    id: number,
    itemData: Partial<schema.PackageItem>,
  ): Promise<schema.PackageItem | undefined> {
    try {
      // First check if the item exists
      const [existingItem] = await db
        .select()
        .from(schema.packageItems)
        .where(eq(schema.packageItems.id, id));

      if (!existingItem) {
        console.log(`Package item with ID ${id} not found`);
        return undefined;
      }

      // Update the item
      const [updatedItem] = await db
        .update(schema.packageItems)
        .set({
          ...itemData,
          updatedAt: new Date(),
        })
        .where(eq(schema.packageItems.id, id))
        .returning();

      console.log(`Updated package item ${id}:`, updatedItem);
      return updatedItem;
    } catch (error) {
      return undefined;
    }
  }

  async createBulkShipments(
    insertShipments: InsertShipment[],
    userId: number,
  ): Promise<Shipment[]> {
    const createdShipments: Shipment[] = [];

    // Get the authenticated user's profile data to ensure consistent sender address usage
    const senderUser = await this.getUser(userId);
    if (!senderUser) {
      throw new Error(`User with ID ${userId} not found`);
    }

    for (const insertShipment of insertShipments) {
      // Enhanced bulk shipment creation: ensure each shipment uses sender user's authentic profile address
      const enhancedShipmentData = {
        ...insertShipment,
        // Override sender information with authenticated user's actual profile data
        senderName:
          senderUser.companyName ||
          senderUser.name ||
          insertShipment.senderName,
        senderEmail: senderUser.email || insertShipment.senderEmail,
        senderPhone: senderUser.phone || insertShipment.senderPhone,
        senderAddress: senderUser.address || insertShipment.senderAddress || "",
        senderAddress1:
          senderUser.address || insertShipment.senderAddress || "",
        senderCity: senderUser.city || insertShipment.senderCity || "",
        senderPostalCode:
          senderUser.postalCode || insertShipment.senderPostalCode || "",
        // Note: There's no senderCountry field in shipments table, this is just for the user's profile
      };

      const shipment = await this.createShipment(enhancedShipmentData, userId);
      createdShipments.push(shipment);
    }

    return createdShipments;
  }

  async getUserShipments(userId: number): Promise<Shipment[]> {
    try {
      // Use comprehensive raw SQL query to get all shipment details based on actual schema
      const result = await db.execute(sql`
        SELECT 
          id, user_id as "userId", 
          sender_name as "senderName", sender_phone as "senderPhone", sender_email as "senderEmail",
          sender_address as "senderAddress", sender_city as "senderCity", sender_postal_code as "senderPostalCode",
          receiver_name as "receiverName", receiver_phone as "receiverPhone", receiver_email as "receiverEmail",
          receiver_address as "receiverAddress", receiver_address2 as "receiverAddress2", 
          receiver_city as "receiverCity", receiver_state as "receiverState", 
          receiver_country as "receiverCountry", receiver_postal_code as "receiverPostalCode",
          package_length as "packageLength", package_width as "packageWidth", 
          package_height as "packageHeight", package_weight as "packageWeight",
          piece_count as "pieceCount", package_contents as "description",
          gtip, customs_value as "customsValue", currency,
          shipping_terms as "shippingTerms", ddp_duties_amount as "ddpDutiesAmount", 
          ddp_base_duties_amount as "ddpBaseDutiesAmount", ddp_trump_tariffs_amount as "ddpTrumpTariffsAmount",
          ddp_tax_amount as "ddpTaxAmount", ddp_processing_fee as "ddpProcessingFee",
          total_price as "totalPrice", original_total_price as "originalTotalPrice",
          base_price as "basePrice", fuel_charge as "fuelCharge", taxes,
          status, tracking_number as "trackingNumber", carrier_tracking_number as "carrierTrackingNumber", manual_tracking_number as "manualTrackingNumber", manual_carrier_name as "manualCarrierName", manual_tracking_link as "manualTrackingLink",
          selected_service as "selectedService", service_level as "serviceLevel",
          provider_service_code as "providerServiceCode", carrier_name as "carrierName",
          estimated_delivery_days as "estimatedDeliveryDays", applied_multiplier as "appliedMultiplier",
          is_insured as "isInsured", insurance_cost as "insuranceCost", insurance_value as "insuranceValue",
          invoice_pdf as "invoicePdf", invoice_filename as "invoiceFilename", invoice_uploaded_at as "invoiceUploadedAt",
          created_at as "createdAt", updated_at as "updatedAt"
        FROM shipments 
        WHERE user_id = ${userId} 
        ORDER BY created_at DESC
      `);

      return result.rows as Shipment[];
    } catch (error) {
      throw new Error(`Failed to retrieve shipments for user ${userId}`);
    }
  }

  async getAllShipments(): Promise<
    (Shipment & { companyName?: string | null })[]
  > {
    try {
      console.time("[DB] getAllShipments raw SQL query");

      // Optimized query - only essential fields for table display
      const result = await db.execute(sql`
        SELECT 
          s.id, s.user_id as "userId", s.sender_name as "senderName", 
          s.receiver_name as "receiverName", s.receiver_country as "receiverCountry",
          s.total_price as "totalPrice", s.original_total_price as "originalTotalPrice", 
          s.status, s.tracking_number as "trackingNumber",
          s.carrier_tracking_number as "carrierTrackingNumber",
          s.manual_tracking_number as "manualTrackingNumber",
          s.manual_carrier_name as "manualCarrierName",
          s.manual_tracking_link as "manualTrackingLink",
          s.tracking_info as "trackingInfo",
          s.tracking_closed as "trackingClosed",
          s.carrier_name as "carrierName",
          s.bizimhesap_invoice_id as "bizimHesapInvoiceId",
          s.selected_service as "selectedService",
          s.shipping_terms as "shippingTerms",
          s.is_insured as "isInsured",
          s.insurance_cost as "insuranceCost",
          s.insurance_value as "insuranceValue",
          s.ddp_duties_amount as "ddpDutiesAmount",
          s.ddp_base_duties_amount as "ddpBaseDutiesAmount",
          s.ddp_trump_tariffs_amount as "ddpTrumpTariffsAmount",
          s.ddp_processing_fee as "ddpProcessingFee",
          s.base_price as "basePrice",
          s.fuel_charge as "fuelCharge",
          s.taxes,
          s.invoice_pdf as "invoicePdf", s.invoice_filename as "invoiceFilename",
          s.invoice_uploaded_at as "invoiceUploadedAt",
          s.created_at as "createdAt", s.updated_at as "updatedAt",
          u.company_name as "companyName"
        FROM shipments s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.status IN ('approved', 'in_transit', 'delivered', 'pending', 'rejected', 'cancelled', 'pre_transit')
        ORDER BY s.id DESC
      `);

      console.timeEnd("[DB] getAllShipments raw SQL query");
      console.log(
        `[DB] Raw SQL retrieved ${result.rows.length} shipments successfully`,
      );

      return result.rows as (Shipment & { companyName?: string | null })[];
    } catch (error) {
      // Fallback to ORM if raw SQL fails
      console.log("[DB] Falling back to ORM query...");
      try {
        const fallbackResult = await db
          .select()
          .from(shipments)
          .leftJoin(users, eq(shipments.userId, users.id))
          .where(
            inArray(shipments.status, [
              "approved",
              "in_transit",
              "delivered",
              "pending",
              "rejected",
              "cancelled",
              "pre_transit",
            ]),
          )
          .orderBy(desc(shipments.id));

        return fallbackResult.map((row) => ({
          ...row.shipments,
          companyName: row.users?.companyName || null,
        })) as (Shipment & { companyName?: string | null })[];
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  async getPendingShipments(): Promise<
    (Shipment & { companyName?: string | null })[]
  > {
    return await db
      .select({
        ...shipments,
        companyName: users.companyName,
      })
      .from(shipments)
      .leftJoin(users, eq(shipments.userId, users.id))
      .where(eq(shipments.status, ShipmentStatus.PENDING));
  }

  async getShipmentsWithMissingCarrierPdfs(): Promise<Shipment[]> {
    try {
      // Find shipments that have a carrier label URL but no carrier label PDF
      return await db
        .select()
        .from(shipments)
        .where(
          and(
            not(isNull(shipments.carrierLabelUrl)), // Has a carrier label URL
            or(
              isNull(shipments.carrierLabelPdf), // But no carrier label PDF
              sql`${shipments.carrierLabelPdf} = ''`, // Or PDF is empty string
            ),
          ),
        )
        .orderBy(desc(shipments.updatedAt));
    } catch (error) {
      return [];
    }
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    const result = await db
      .select()
      .from(shipments)
      .leftJoin(users, eq(shipments.userId, users.id))
      .where(eq(shipments.id, id));

    if (!result || result.length === 0) {
      return undefined;
    }

    const row = result[0];
    const shipment = row.shipments;
    const user = row.users;

    // Add user data to shipment for label generation
    return {
      ...shipment,
      user: user
        ? {
            id: user.id,
            name: user.name,
            companyName: user.companyName,
            email: user.email,
          }
        : undefined,
    };
  }

  async getShipmentByTrackingNumber(
    trackingNumber: string,
  ): Promise<Shipment | undefined> {
    try {
      const [shipment] = await db
        .select()
        .from(shipments)
        .where(
          or(
            eq(shipments.trackingNumber, trackingNumber),
            eq(shipments.carrierTrackingNumber, trackingNumber),
            eq(shipments.manualTrackingNumber, trackingNumber),
          ),
        );

      return shipment;
    } catch (error) {
      return undefined;
    }
  }

  async findShipmentByTrackingNumber(
    trackingNumber: string,
  ): Promise<Shipment | undefined> {
    // This method searches both MoogShip tracking number and carrier tracking number
    return this.getShipmentByTrackingNumber(trackingNumber);
  }

  async getShipmentsByIds(ids: number[]): Promise<Shipment[]> {
    if (!ids || ids.length === 0) {
      return [];
    }

    return await db.select().from(shipments).where(inArray(shipments.id, ids));
  }

  async updateShipmentTrackingInfo(
    shipmentId: number,
    trackingNumber: string,
    labelUrl: string,
  ): Promise<Shipment | undefined> {
    console.log(
      `Updating tracking info for shipment ${shipmentId}: tracking=${trackingNumber}, label=${labelUrl}`,
    );
    return this.updateShipment(shipmentId, {
      trackingNumber,
      labelUrl,
    });
  }

  async updateShipment(
    id: number,
    shipmentData: Partial<Shipment>,
  ): Promise<Shipment | undefined> {
    console.log(`[DATABASE] updateShipment called for shipment ID: ${id}`);
    console.log(
      `[DATABASE] shipmentData received:`,
      JSON.stringify(shipmentData, null, 2),
    );

    const existingShipment = await this.getShipment(id);

    if (!existingShipment) {
      console.log(`[DATABASE] ERROR: Shipment with ID ${id} not found`);
      return undefined;
    }

    console.log(
      `[DATABASE] Existing shipment found:`,
      JSON.stringify(existingShipment, null, 2),
    );

    // Process the sender address if it's being updated
    if (shipmentData.senderAddress && !shipmentData.senderAddress1) {
      // Split the sender address into two fields if needed
      shipmentData.senderAddress1 = shipmentData.senderAddress.substring(0, 35);

      if (shipmentData.senderAddress.length > 35) {
        shipmentData.senderAddress2 = shipmentData.senderAddress.substring(35);
      } else {
        shipmentData.senderAddress2 = null;
      }
    }

    const updateData: Partial<Shipment> = {
      ...shipmentData,
      updatedAt: new Date(),
    };

    console.log(
      `[DATABASE] Final update data to be sent to database:`,
      JSON.stringify(updateData, null, 2),
    );

    try {
      console.log(
        `[DATABASE] Executing update query on shipments table for ID ${id}...`,
      );
      const [updatedShipment] = await db
        .update(shipments)
        .set(updateData)
        .where(eq(shipments.id, id))
        .returning();

      console.log(
        `[DATABASE] Update successful, returned data:`,
        JSON.stringify(updatedShipment, null, 2),
      );
      return updatedShipment;
    } catch (error) {
      throw error;
    }
  }

  async updateShipmentStatus(
    id: number,
    status: ShipmentStatus,
    labelUrl?: string,
    trackingNumber?: string,
    rejectionReason?: string,
  ): Promise<Shipment | undefined> {
    const existingShipment = await this.getShipment(id);

    if (!existingShipment) {
      return undefined;
    }

    const updateData: Partial<Shipment> = {
      status,
      updatedAt: new Date(),
    };

    if (labelUrl) {
      updateData.labelUrl = labelUrl;
    }

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
      // Default tracking info
      updateData.trackingInfo = [
        {
          timestamp: new Date().toISOString(),
          status: "Package accepted by carrier",
          location: "Istanbul, Turkey",
        },
      ];
    }

    if (rejectionReason && status === ShipmentStatus.REJECTED) {
      updateData.rejectionReason = rejectionReason;
    }

    const [updatedShipment] = await db
      .update(shipments)
      .set(updateData)
      .where(eq(shipments.id, id))
      .returning();

    return updatedShipment;
  }

  // Pickup request operations
  async createPickupRequest(
    userId: number,
    pickupDate: Date,
    pickupNotes?: string,
    pickupAddress?: string,
    pickupCity?: string,
    pickupPostalCode?: string,
  ): Promise<{ pickupRequest: any; pickupShipments: any[] }> {
    // Get user information to populate pickup address if not provided
    const user = await this.getUser(userId);

    const [newPickupRequest] = await db
      .insert(schema.pickupRequests)
      .values({
        userId,
        pickupDate,
        pickupNotes: pickupNotes || null,
        pickupAddress: pickupAddress || user?.address || null,
        pickupCity: pickupCity || user?.city || null,
        pickupPostalCode: pickupPostalCode || user?.postalCode || null,
        pickupStatus: schema.PickupStatus.PENDING,
      })
      .returning();

    return {
      pickupRequest: newPickupRequest,
      pickupShipments: [],
    };
  }

  async addShipmentsToPickupRequest(
    pickupRequestId: number,
    shipmentIds: number[],
  ): Promise<any[]> {
    const addedShipments = [];

    // First check which shipments are already in a pickup request
    const existingShipments = await db
      .select()
      .from(schema.shipments)
      .where(inArray(schema.shipments.id, shipmentIds))
      .where(eq(schema.shipments.pickupRequested, true));

    const existingIds = new Set(existingShipments.map((s) => s.id));
    const newShipmentIds = shipmentIds.filter((id) => !existingIds.has(id));

    console.log(
      `Adding ${newShipmentIds.length} new shipments to pickup request, skipping ${existingIds.size} already in a pickup`,
    );

    // For each shipment ID that's not already in a pickup, create an entry in the relationship table
    for (const shipmentId of newShipmentIds) {
      try {
        const [pickupShipment] = await db
          .insert(schema.pickupShipments)
          .values({
            pickupRequestId,
            shipmentId,
          })
          .returning();

        // Also update each shipment to mark it as having a pickup requested
        await this.updateShipment(shipmentId, {
          pickupRequested: true,
          pickupStatus: schema.PickupStatus.PENDING,
        });

        addedShipments.push(pickupShipment);
      } catch (error) {
        // Continue with other shipments even if one fails
      }
    }

    return addedShipments;
  }

  async getPickupRequestById(id: number): Promise<any> {
    const [pickupRequest] = await db
      .select()
      .from(schema.pickupRequests)
      .where(eq(schema.pickupRequests.id, id));

    return pickupRequest;
  }

  async getUserPickupRequests(userId: number): Promise<any[]> {
    return await db
      .select()
      .from(schema.pickupRequests)
      .where(eq(schema.pickupRequests.userId, userId))
      .orderBy(desc(schema.pickupRequests.requestDate));
  }

  async getAllPickupRequests(): Promise<any[]> {
    return await db
      .select()
      .from(schema.pickupRequests)
      .orderBy(desc(schema.pickupRequests.requestDate));
  }

  async getPickupRequestWithShipments(
    id: number,
  ): Promise<{ pickupRequest: any; shipments: Shipment[]; user: User }> {
    // Get the pickup request
    const pickupRequest = await this.getPickupRequestById(id);

    if (!pickupRequest) {
      throw new Error("Pickup request not found");
    }

    // Get the user who created the pickup request
    const user = await this.getUser(pickupRequest.userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Get all shipment IDs associated with this pickup request
    const pickupShipments = await db
      .select()
      .from(schema.pickupShipments)
      .where(eq(schema.pickupShipments.pickupRequestId, id));

    // Get all shipment details
    const shipmentDetails: Shipment[] = [];
    for (const ps of pickupShipments) {
      const shipment = await this.getShipment(ps.shipmentId);
      if (shipment) {
        shipmentDetails.push(shipment);
      }
    }

    return {
      pickupRequest,
      shipments: shipmentDetails,
      user,
    };
  }

  async updatePickupRequestStatus(
    id: number,
    status: schema.PickupStatus,
    notes?: string,
  ): Promise<any> {
    const [updatedPickupRequest] = await db
      .update(schema.pickupRequests)
      .set({
        pickupStatus: status,
        pickupNotes: notes || null,
        lastUpdated: new Date(),
      })
      .where(eq(schema.pickupRequests.id, id))
      .returning();

    // If status is updated, also update all associated shipments
    if (updatedPickupRequest) {
      const pickupShipments = await db
        .select()
        .from(schema.pickupShipments)
        .where(eq(schema.pickupShipments.pickupRequestId, id));

      for (const ps of pickupShipments) {
        await this.updateShipment(ps.shipmentId, {
          pickupStatus: status,
        });
      }
    }

    return updatedPickupRequest;
  }

  // Package template operations

  async createPackageTemplate(
    userId: number,
    template: InsertPackageTemplate,
  ): Promise<PackageTemplate> {
    // Insert the new template with the provided user ID
    const result = await db
      .insert(schema.packageTemplates)
      .values({
        ...template,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  }

  async getUserPackageTemplates(userId: number): Promise<PackageTemplate[]> {
    // Get all templates for the specified user
    return db
      .select()
      .from(schema.packageTemplates)
      .where(eq(schema.packageTemplates.userId, userId))
      .orderBy(
        desc(schema.packageTemplates.isDefault),
        asc(schema.packageTemplates.name),
      );
  }

  async getPackageTemplate(id: number): Promise<PackageTemplate | undefined> {
    // Get a single template by ID
    const result = await db
      .select()
      .from(schema.packageTemplates)
      .where(eq(schema.packageTemplates.id, id));

    return result[0];
  }

  async updatePackageTemplate(
    id: number,
    templateData: Partial<PackageTemplate>,
  ): Promise<PackageTemplate | undefined> {
    // Update an existing template
    const updatedTemplate = await db
      .update(schema.packageTemplates)
      .set({
        ...templateData,
        updatedAt: new Date(),
      })
      .where(eq(schema.packageTemplates.id, id))
      .returning();

    return updatedTemplate[0];
  }

  async deletePackageTemplate(
    id: number,
  ): Promise<PackageTemplate | undefined> {
    // Delete a template
    const deletedTemplate = await db
      .delete(schema.packageTemplates)
      .where(eq(schema.packageTemplates.id, id))
      .returning();

    return deletedTemplate[0];
  }

  async setDefaultPackageTemplate(
    userId: number,
    templateId: number,
  ): Promise<PackageTemplate | undefined> {
    // First, unset any existing default for this user
    await db
      .update(schema.packageTemplates)
      .set({ isDefault: false })
      .where(eq(schema.packageTemplates.userId, userId));

    // Then set the new default
    const updatedTemplate = await db
      .update(schema.packageTemplates)
      .set({
        isDefault: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.packageTemplates.id, templateId),
          eq(schema.packageTemplates.userId, userId),
        ),
      )
      .returning();

    return updatedTemplate[0];
  }

  async getDefaultPackageTemplate(
    userId: number,
  ): Promise<PackageTemplate | undefined> {
    // Get the default template for the user
    const result = await db
      .select()
      .from(schema.packageTemplates)
      .where(
        and(
          eq(schema.packageTemplates.userId, userId),
          eq(schema.packageTemplates.isDefault, true),
        ),
      );

    return result[0];
  }

  /**
   * Set the minimum balance for a user
   * @param userId The ID of the user to update
   * @param minimumBalance The minimum balance in cents, or null to use the system default
   */
  async setUserMinimumBalance(
    userId: number,
    minimumBalance: number | null,
  ): Promise<User | undefined> {
    console.log(
      `Setting minimum balance for user ${userId} to: ${minimumBalance === null ? "NULL (system default)" : `${minimumBalance} cents`}`,
    );

    const user = await this.getUser(userId);
    if (!user) {
      return undefined;
    }

    // Update the user's minimum balance
    const [updatedUser] = await db
      .update(users)
      .set({
        minimumBalance: minimumBalance,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  // Billing reminder operations
  async createBillingReminder(
    data: schema.InsertBillingReminder,
  ): Promise<schema.BillingReminder> {
    const [reminder] = await db
      .insert(schema.billingReminders)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return reminder;
  }

  async getAllBillingReminders(): Promise<schema.BillingReminder[]> {
    return db
      .select()
      .from(schema.billingReminders)
      .orderBy(desc(schema.billingReminders.createdAt));
  }

  async getBillingReminder(
    id: number,
  ): Promise<schema.BillingReminder | undefined> {
    const [reminder] = await db
      .select()
      .from(schema.billingReminders)
      .where(eq(schema.billingReminders.id, id));

    return reminder;
  }

  async updateBillingReminder(
    id: number,
    data: Partial<schema.BillingReminder>,
  ): Promise<schema.BillingReminder | undefined> {
    const [reminder] = await db
      .update(schema.billingReminders)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.billingReminders.id, id))
      .returning();

    return reminder;
  }

  async getBillingRemindersByUser(
    userId: number,
  ): Promise<schema.BillingReminder[]> {
    return db
      .select()
      .from(schema.billingReminders)
      .where(eq(schema.billingReminders.userId, userId))
      .orderBy(desc(schema.billingReminders.createdAt));
  }

  async deleteBillingReminder(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.billingReminders)
      .where(eq(schema.billingReminders.id, id));

    return (result.rowCount || 0) > 0;
  }
}

// Fallback to in-memory storage for development if database connection fails
export class MemStorage {
  private users: Map<number, User>;
  private shipments: Map<number, Shipment>;
  private announcements: Map<number, Announcement>;
  private supportTickets: Map<number, SupportTicket>;
  private ticketResponses: Map<number, TicketResponse>;
  private ticketAttachments: Map<number, TicketAttachment>;
  private packageItems: Map<number, schema.PackageItem>;
  sessionStore: any;
  private userCurrentId: number;
  private shipmentCurrentId: number;
  private announcementCurrentId: number;
  private supportTicketCurrentId: number;
  private ticketResponseCurrentId: number;
  private ticketAttachmentCurrentId: number;
  private packageItemCurrentId: number;

  constructor() {
    this.users = new Map();
    this.shipments = new Map();
    this.announcements = new Map();
    this.supportTickets = new Map();
    this.ticketResponses = new Map();
    this.ticketAttachments = new Map();
    this.packageItems = new Map();
    this.userCurrentId = 1;
    this.shipmentCurrentId = 1;
    this.announcementCurrentId = 1;
    this.supportTicketCurrentId = 1;
    this.ticketResponseCurrentId = 1;
    this.ticketAttachmentCurrentId = 1;
    this.packageItemCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Create admin user by default
    this.createUser({
      username: "admin",
      password: "$2b$10$oQ6Ol0SK0X7fGXNQMURSpe14ywc4G4QRDSk4qzWCXj0n/fLQ44q8u", // "adminpass"
      name: "Admin User",
      email: "admin@moogship.com",
      role: "admin",
    });
  }

  // Support ticket operations
  async createSupportTicket(ticket: any): Promise<SupportTicket> {
    const id = this.supportTicketCurrentId++;
    const now = new Date();

    const supportTicket: SupportTicket = {
      ...ticket,
      id,
      status: TicketStatus.OPEN,
      createdAt: now,
      updatedAt: now,
      assignedTo: null,
      closedBy: null,
      closedAt: null,
      closureReason: null,
    };

    this.supportTickets.set(id, supportTicket);
    return supportTicket;
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    return this.supportTickets.get(id);
  }

  async getUserSupportTickets(userId: number): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .filter((ticket) => ticket.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async getOpenSupportTickets(): Promise<SupportTicket[]> {
    return Array.from(this.supportTickets.values())
      .filter(
        (ticket) =>
          ticket.status === TicketStatus.OPEN ||
          ticket.status === TicketStatus.IN_PROGRESS ||
          ticket.status === TicketStatus.WAITING_ON_CUSTOMER,
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async updateSupportTicket(
    id: number,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined> {
    const ticket = this.supportTickets.get(id);

    if (!ticket) {
      return undefined;
    }

    const updatedTicket: SupportTicket = {
      ...ticket,
      ...data,
      updatedAt: new Date(),
    };

    this.supportTickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async assignSupportTicket(
    id: number,
    adminId: number,
  ): Promise<SupportTicket | undefined> {
    const ticket = this.supportTickets.get(id);

    if (!ticket) {
      return undefined;
    }

    const updatedTicket: SupportTicket = {
      ...ticket,
      status: TicketStatus.IN_PROGRESS,
      assignedTo: adminId,
      updatedAt: new Date(),
    };

    this.supportTickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async closeSupportTicket(
    id: number,
    adminId: number,
    reason: string,
  ): Promise<SupportTicket | undefined> {
    const ticket = this.supportTickets.get(id);

    if (!ticket) {
      return undefined;
    }

    const now = new Date();
    const updatedTicket: SupportTicket = {
      ...ticket,
      status: TicketStatus.CLOSED,
      closedBy: adminId,
      closedAt: now,
      closureReason: reason,
      updatedAt: now,
    };

    this.supportTickets.set(id, updatedTicket);
    return updatedTicket;
  }

  async addTicketResponse(
    response: InsertTicketResponse,
  ): Promise<TicketResponse> {
    const id = this.ticketResponseCurrentId++;

    const ticketResponse: TicketResponse = {
      ...response,
      id,
      createdAt: new Date(),
      attachmentUrl: null, // Set to null for backward compatibility
    };

    this.ticketResponses.set(id, ticketResponse);

    // Update the ticket status based on who responded
    if (response.isAdminResponse) {
      this.updateSupportTicket(response.ticketId, {
        status: TicketStatus.WAITING_ON_CUSTOMER,
      });
    } else {
      // If this is a customer response and status is waiting_on_customer, change back to in_progress
      const ticket = this.supportTickets.get(response.ticketId);
      if (ticket && ticket.status === TicketStatus.WAITING_ON_CUSTOMER) {
        this.updateSupportTicket(response.ticketId, {
          status: TicketStatus.IN_PROGRESS,
        });
      }
    }

    return ticketResponse;
  }

  async getTicketResponses(ticketId: number): Promise<TicketResponse[]> {
    return Array.from(this.ticketResponses.values())
      .filter((response) => response.ticketId === ticketId)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }

  // Ticket attachment operations
  async addTicketAttachment(
    attachment: InsertTicketAttachment,
  ): Promise<TicketAttachment> {
    const id = this.ticketAttachmentCurrentId++;
    const now = new Date();

    const ticketAttachment: TicketAttachment = {
      ...attachment,
      id,
      uploadedAt: now,
      responseId: attachment.responseId ?? null, // Handle undefined as null
    };

    this.ticketAttachments.set(id, ticketAttachment);
    return ticketAttachment;
  }

  async getTicketAttachments(ticketId: number): Promise<TicketAttachment[]> {
    return Array.from(this.ticketAttachments.values())
      .filter((attachment) => attachment.ticketId === ticketId)
      .sort(
        (a, b) =>
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
      );
  }

  async getResponseAttachments(responseId: number): Promise<TicketAttachment[]> {
    return Array.from(this.ticketAttachments.values())
      .filter((attachment) => attachment.responseId === responseId)
      .sort(
        (a, b) =>
          new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
      );
  }

  async deleteTicketAttachment(id: number): Promise<TicketAttachment | undefined> {
    const attachment = this.ticketAttachments.get(id);
    if (attachment) {
      this.ticketAttachments.delete(id);
    }
    return attachment;
  }

  // Announcement operations
  async createAnnouncement(
    announcement: InsertAnnouncement,
    createdBy: number,
  ): Promise<Announcement> {
    const id = this.announcementCurrentId++;
    const now = new Date();

    const createdAnnouncement: Announcement = {
      ...announcement,
      id,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.announcements.set(id, createdAnnouncement);
    return createdAnnouncement;
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return this.announcements.get(id);
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    const now = new Date();

    return Array.from(this.announcements.values())
      .filter(
        (announcement) =>
          announcement.isActive &&
          (!announcement.expiresAt || new Date(announcement.expiresAt) > now),
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async updateAnnouncement(
    id: number,
    data: Partial<Announcement>,
  ): Promise<Announcement | undefined> {
    const announcement = this.announcements.get(id);

    if (!announcement) {
      return undefined;
    }

    const updatedAnnouncement: Announcement = {
      ...announcement,
      ...data,
      updatedAt: new Date(),
    };

    this.announcements.set(id, updatedAnnouncement);
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: number): Promise<Announcement | undefined> {
    const announcement = this.announcements.get(id);

    if (!announcement) {
      return undefined;
    }

    this.announcements.delete(id);
    return announcement;
  }

  async getLoginPopupAnnouncements(userId: number): Promise<Announcement[]> {
    return Array.from(this.announcements.values()).filter(a => 
      a.isActive && 
      a.showOnLogin && 
      (!a.expiresAt || new Date(a.expiresAt) > new Date())
    );
  }

  async markAnnouncementAsViewed(userId: number, announcementId: number): Promise<void> {
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const now = new Date();
    // Ensure role is set
    const userWithRole = {
      ...insertUser,
      role: insertUser.role || "user",
    };
    const user: User = { ...userWithRole, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(
    searchTerm?: string,
    page?: number,
    limit?: number,
  ): Promise<User[]> {
    let users = Array.from(this.users.values());

    // Apply search filter if provided
    if (searchTerm && searchTerm.trim() !== "") {
      const lowerSearchTerm = searchTerm.toLowerCase();
      users = users.filter(
        (user) =>
          user.name.toLowerCase().includes(lowerSearchTerm) ||
          user.username.toLowerCase().includes(lowerSearchTerm) ||
          user.email.toLowerCase().includes(lowerSearchTerm) ||
          user.role.toLowerCase().includes(lowerSearchTerm) ||
          (user.companyName &&
            user.companyName.toLowerCase().includes(lowerSearchTerm)),
      );
    }

    // Sort by name for consistent results
    users.sort((a, b) => a.name.localeCompare(b.name));

    // Apply pagination if provided
    if (page && limit) {
      const offset = (page - 1) * limit;
      users = users.slice(offset, offset + limit);
    }

    return users;
  }

  async updateUserBalance(
    userId: number,
    amount: number,
  ): Promise<User | undefined> {
    const user = this.users.get(userId);

    if (!user) {
      return undefined;
    }

    // Update the user's balance
    const updatedUser: User = {
      ...user,
      balance: (user.balance || 0) + amount,
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async setUserBalance(
    userId: number,
    balance: number,
  ): Promise<User | undefined> {
    const user = this.users.get(userId);

    if (!user) {
      return undefined;
    }

    // Set the user's balance to the exact amount
    const updatedUser: User = {
      ...user,
      balance: balance,
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  /**
   * Set the minimum balance for a user
   * @param userId The ID of the user to update
   * @param minimumBalance The minimum balance in cents, or null to use the system default
   */
  async setUserMinimumBalance(
    userId: number,
    minimumBalance: number | null,
  ): Promise<User | undefined> {
    console.log(
      `Setting minimum balance for user ${userId} to: ${minimumBalance === null ? "NULL (system default)" : `${minimumBalance} cents`}`,
    );

    const user = this.users.get(userId);

    if (!user) {
      return undefined;
    }

    // Update the user's minimum balance
    const updatedUser: User = {
      ...user,
      minimumBalance: minimumBalance,
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateUser(
    userId: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    const user = this.users.get(userId);

    if (!user) {
      return undefined;
    }

    // If userData contains a password, use it, otherwise preserve original password
    const password = userData.password || user.password;

    // Update the user, preserving sensitive fields except password if provided
    const updatedUser: User = {
      ...user,
      ...userData,
      // Explicitly set password based on logic above
      password,
      // Preserve other sensitive fields
      balance: userData.balance !== undefined ? userData.balance : user.balance,
      isApproved:
        userData.isApproved !== undefined
          ? userData.isApproved
          : user.isApproved || false,
      approvedBy:
        userData.approvedBy !== undefined
          ? userData.approvedBy
          : user.approvedBy,
      approvedAt:
        userData.approvedAt !== undefined
          ? userData.approvedAt
          : user.approvedAt,
      rejectionReason:
        userData.rejectionReason !== undefined
          ? userData.rejectionReason
          : user.rejectionReason,
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async updateNotificationPreferences(
    userId: number,
    preferences: {
      emailMarketingCampaigns?: boolean;
      shipmentStatusUpdates?: string;
      accountNotifications?: boolean;
      adminNotifications?: boolean;
      trackingDeliveryNotifications?: boolean;
      refundReturnNotifications?: boolean;
      supportTicketNotifications?: boolean;
      customsNotifications?: boolean;
    },
  ): Promise<User | undefined> {
    return this.updateUser(userId, preferences);
  }

  private transactions: Map<number, Transaction> = new Map();
  private transactionCurrentId: number = 1;

  async hasPaymentTransaction(shipmentId: number): Promise<boolean> {
    for (const transaction of this.transactions.values()) {
      if (transaction.relatedShipmentId === shipmentId && transaction.amount < 0) {
        return true;
      }
    }
    return false;
  }

  async createTransaction(
    userId: number,
    amount: number,
    description: string,
    relatedShipmentId?: number,
  ): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    const now = new Date();

    const transaction: Transaction = {
      id,
      userId,
      amount,
      description,
      relatedShipmentId: relatedShipmentId || null,
      createdAt: now,
    };

    this.transactions.set(id, transaction);
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Shipment operations
  async createShipment(
    insertShipment: InsertShipment,
    userId: number,
    packageItems?: any[],
  ): Promise<Shipment> {
    const id = this.shipmentCurrentId++;
    const now = new Date();

    // Extract pricing and service properties from insertShipment if they exist
    const {
      serviceLevel,
      basePrice,
      fuelCharge,
      taxes,
      totalPrice,
      carrierName,
      estimatedDeliveryDays,
      // New original price fields
      originalBasePrice,
      originalFuelCharge,
      originalTotalPrice,
      appliedMultiplier,
      // Extract package items to handle separately
      packageItems: itemsData,
      ...validData
    } = insertShipment as any; // Use any to handle extra properties

    const shipment: Shipment = {
      ...validData,
      id,
      userId,
      status: ShipmentStatus.PENDING,
      serviceLevel: serviceLevel || null,
      labelUrl: null,
      trackingNumber: null,
      trackingInfo: null,
      basePrice: basePrice || null,
      fuelCharge: fuelCharge || null,
      taxes: taxes || null,
      totalPrice: totalPrice || null,
      // Store original price information with proper cost calculation
      // Fix double multiplication bug: if originalTotalPrice equals totalPrice with multiplier > 1, calculate true cost
      originalBasePrice:
        originalBasePrice &&
        appliedMultiplier &&
        appliedMultiplier > 1 &&
        originalBasePrice === basePrice
          ? Math.round(basePrice / appliedMultiplier)
          : originalBasePrice ||
            (basePrice && appliedMultiplier && appliedMultiplier > 1
              ? Math.round(basePrice / appliedMultiplier)
              : basePrice) ||
            null,
      originalFuelCharge:
        originalFuelCharge &&
        appliedMultiplier &&
        appliedMultiplier > 1 &&
        originalFuelCharge === fuelCharge
          ? Math.round(fuelCharge / appliedMultiplier)
          : originalFuelCharge ||
            (fuelCharge && appliedMultiplier && appliedMultiplier > 1
              ? Math.round(fuelCharge / appliedMultiplier)
              : fuelCharge) ||
            null,
      originalTotalPrice:
        originalTotalPrice &&
        appliedMultiplier &&
        appliedMultiplier > 1 &&
        originalTotalPrice === totalPrice
          ? Math.round(totalPrice / appliedMultiplier)
          : originalTotalPrice ||
            (totalPrice && appliedMultiplier && appliedMultiplier > 1
              ? Math.round(totalPrice / appliedMultiplier)
              : totalPrice) ||
            null,
      appliedMultiplier: appliedMultiplier || 1,
      carrierName: carrierName || null,
      estimatedDeliveryDays: estimatedDeliveryDays || null,
      customerAccepted: false,
      currency: "USD",
      createdAt: now,
      updatedAt: now,
    };

    this.shipments.set(id, shipment);

    // Handle package items if provided
    const items = packageItems || itemsData;
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(
        `Adding ${items.length} package items to shipment ${shipment.id}`,
      );

      // Insert each package item
      for (const item of items) {
        await this.addPackageItemToShipment(shipment.id, item);
      }
    }

    return shipment;
  }

  async createBulkShipments(
    insertShipments: InsertShipment[],
    userId: number,
  ): Promise<Shipment[]> {
    const createdShipments: Shipment[] = [];

    for (const insertShipment of insertShipments) {
      const shipment = await this.createShipment(insertShipment, userId);
      createdShipments.push(shipment);
    }

    return createdShipments;
  }

  async getUserShipments(userId: number): Promise<Shipment[]> {
    return Array.from(this.shipments.values()).filter(
      (shipment) => shipment.userId === userId,
    );
  }

  async getAllShipments(): Promise<Shipment[]> {
    return Array.from(this.shipments.values());
  }

  async getPendingShipments(): Promise<Shipment[]> {
    console.log("Getting pending shipments from in-memory storage");
    const allShipments = Array.from(this.shipments.values());
    console.log("Total shipments in memory:", allShipments.length);

    const pendingShipments = allShipments.filter(
      (shipment) => shipment.status === ShipmentStatus.PENDING,
    );

    console.log("Found pending shipments:", pendingShipments.length);
    console.log(
      "Pending shipment IDs:",
      pendingShipments.map((s) => s.id),
    );

    return pendingShipments;
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    return this.shipments.get(id);
  }

  async updateShipmentTrackingInfo(
    shipmentId: number,
    trackingNumber: string,
    labelUrl: string,
  ): Promise<Shipment | undefined> {
    console.log(
      `MemStorage: Updating tracking info for shipment ${shipmentId}: tracking=${trackingNumber}, label=${labelUrl}`,
    );
    return this.updateShipment(shipmentId, {
      trackingNumber,
      labelUrl,
    });
  }

  async updateCarrierLabelAccess(
    userId: number,
    canAccess: boolean,
  ): Promise<User | undefined> {
    console.log(
      `MemStorage: Updating carrier label access for user ${userId} to ${canAccess}`,
    );
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }

    // Update the user with new carrier label access setting
    const updatedUser = {
      ...user,
      canAccessCarrierLabels: canAccess,
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Package items operations
  async addPackageItemToShipment(
    shipmentId: number,
    packageItem: schema.InsertPackageItem,
  ): Promise<schema.PackageItem> {
    const id = this.packageItemCurrentId++;
    const now = new Date();

    const item: schema.PackageItem = {
      ...packageItem,
      id,
      shipmentId,
      createdAt: now,
      updatedAt: now,
    };

    this.packageItems.set(id, item);
    return item;
  }

  async getShipmentPackageItems(
    shipmentId: number,
  ): Promise<schema.PackageItem[]> {
    return Array.from(this.packageItems.values())
      .filter((item) => item.shipmentId === shipmentId)
      .sort((a, b) => a.id - b.id);
  }

  async updatePackageItem(
    id: number,
    itemData: Partial<schema.PackageItem>,
  ): Promise<schema.PackageItem | undefined> {
    const item = this.packageItems.get(id);

    if (!item) {
      console.log(`Package item with ID ${id} not found`);
      return undefined;
    }

    const updatedItem = {
      ...item,
      ...itemData,
      updatedAt: new Date(),
    };

    this.packageItems.set(id, updatedItem);
    return updatedItem;
  }

  async updateShipment(
    id: number,
    shipmentData: Partial<Shipment>,
  ): Promise<Shipment | undefined> {
    const shipment = this.shipments.get(id);

    if (!shipment) {
      return undefined;
    }

    const updatedShipment: Shipment = {
      ...shipment,
      ...shipmentData,
      updatedAt: new Date(),
    };

    this.shipments.set(id, updatedShipment);
    return updatedShipment;
  }

  async updateShipmentStatus(
    id: number,
    status: ShipmentStatus,
    labelUrl?: string,
    trackingNumber?: string,
    rejectionReason?: string,
  ): Promise<Shipment | undefined> {
    const shipment = this.shipments.get(id);

    if (!shipment) {
      return undefined;
    }

    const updatedShipment: Shipment = {
      ...shipment,
      status,
      updatedAt: new Date(),
    };

    // Handle labelUrl (convert undefined to null if needed)
    updatedShipment.labelUrl =
      labelUrl !== undefined ? labelUrl : shipment.labelUrl;

    // Handle trackingNumber (convert undefined to null if needed)
    if (trackingNumber !== undefined) {
      updatedShipment.trackingNumber = trackingNumber || null;

      // Add tracking info if a tracking number was provided
      if (trackingNumber) {
        updatedShipment.trackingInfo = [
          {
            timestamp: new Date().toISOString(),
            status: "Package accepted by carrier",
            location: "Istanbul, Turkey",
          },
        ];
      }
    }

    // Handle rejection reason
    if (rejectionReason && status === ShipmentStatus.REJECTED) {
      updatedShipment.rejectionReason = rejectionReason;
    }

    this.shipments.set(id, updatedShipment);
    return updatedShipment;
  }

  // Package template operations
  async createPackageTemplate(
    userId: number,
    template: InsertPackageTemplate,
  ): Promise<PackageTemplate> {
    try {
      const now = new Date();

      // If this is set as default, first clear any existing default templates for this user
      if (template.isDefault) {
        await db
          .update(packageTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(packageTemplates.userId, userId),
              eq(packageTemplates.isDefault, true),
            ),
          );
      }

      const [createdTemplate] = await db
        .insert(packageTemplates)
        .values({
          ...template,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdTemplate;
    } catch (error) {
      throw error;
    }
  }

  async getUserPackageTemplates(userId: number): Promise<PackageTemplate[]> {
    try {
      return await db
        .select()
        .from(packageTemplates)
        .where(eq(packageTemplates.userId, userId))
        .orderBy(asc(packageTemplates.name));
    } catch (error) {
      return [];
    }
  }

  async getPackageTemplate(id: number): Promise<PackageTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(packageTemplates)
        .where(eq(packageTemplates.id, id));

      return template;
    } catch (error) {
      return undefined;
    }
  }

  async updatePackageTemplate(
    id: number,
    templateData: Partial<PackageTemplate>,
  ): Promise<PackageTemplate | undefined> {
    try {
      const template = await this.getPackageTemplate(id);

      if (!template) {
        return undefined;
      }

      // If setting this as default, clear other default templates for this user
      if (templateData.isDefault) {
        await db
          .update(packageTemplates)
          .set({ isDefault: false })
          .where(
            and(
              eq(packageTemplates.userId, template.userId),
              eq(packageTemplates.isDefault, true),
              not(eq(packageTemplates.id, id)),
            ),
          );
      }

      const [updatedTemplate] = await db
        .update(packageTemplates)
        .set({
          ...templateData,
          updatedAt: new Date(),
        })
        .where(eq(packageTemplates.id, id))
        .returning();

      return updatedTemplate;
    } catch (error) {
      return undefined;
    }
  }

  async deletePackageTemplate(
    id: number,
  ): Promise<PackageTemplate | undefined> {
    try {
      const template = await this.getPackageTemplate(id);

      if (!template) {
        return undefined;
      }

      const [deletedTemplate] = await db
        .delete(packageTemplates)
        .where(eq(packageTemplates.id, id))
        .returning();

      return deletedTemplate;
    } catch (error) {
      return undefined;
    }
  }

  async setDefaultPackageTemplate(
    userId: number,
    templateId: number,
  ): Promise<PackageTemplate | undefined> {
    try {
      // Clear current default for user
      await db
        .update(packageTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(packageTemplates.userId, userId),
            eq(packageTemplates.isDefault, true),
          ),
        );

      // Set new default
      const [updatedTemplate] = await db
        .update(packageTemplates)
        .set({
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(packageTemplates.id, templateId),
            eq(packageTemplates.userId, userId),
          ),
        )
        .returning();

      return updatedTemplate;
    } catch (error) {
      return undefined;
    }
  }

  async getDefaultPackageTemplate(
    userId: number,
  ): Promise<PackageTemplate | undefined> {
    try {
      const [template] = await db
        .select()
        .from(packageTemplates)
        .where(
          and(
            eq(packageTemplates.userId, userId),
            eq(packageTemplates.isDefault, true),
          ),
        );

      return template;
    } catch (error) {
      return undefined;
    }
  }

  // Fast tracking notification operations
  async createFastTrackingNotification(
    data: InsertFastTrackingNotification,
  ): Promise<FastTrackingNotification> {
    try {
      const [notification] = await db
        .insert(fastTrackingNotifications)
        .values(data)
        .returning();

      return notification;
    } catch (error) {
      console.error("Error creating fast tracking notification:", error);
      throw error;
    }
  }

  async getFastTrackingNotifications(
    limit = 50,
  ): Promise<FastTrackingNotification[]> {
    try {
      return await db
        .select()
        .from(fastTrackingNotifications)
        .orderBy(desc(fastTrackingNotifications.requestedAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching fast tracking notifications:", error);
      return [];
    }
  }

  async getFastTrackingNotification(
    id: number,
  ): Promise<FastTrackingNotification | undefined> {
    try {
      const [notification] = await db
        .select()
        .from(fastTrackingNotifications)
        .where(eq(fastTrackingNotifications.id, id));

      return notification;
    } catch (error) {
      console.error("Error fetching fast tracking notification:", error);
      return undefined;
    }
  }

  async markFastTrackingNotificationAsRead(
    id: number,
    readBy: number,
  ): Promise<FastTrackingNotification | undefined> {
    try {
      const [notification] = await db
        .update(fastTrackingNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          readBy,
        })
        .where(eq(fastTrackingNotifications.id, id))
        .returning();

      return notification;
    } catch (error) {
      console.error("Error marking fast tracking notification as read:", error);
      return undefined;
    }
  }

  async markAllFastTrackingNotificationsAsRead(
    readBy: number,
  ): Promise<number> {
    try {
      const result = await db
        .update(fastTrackingNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          readBy,
        })
        .where(eq(fastTrackingNotifications.isRead, false));

      return result.rowCount || 0;
    } catch (error) {
      console.error(
        "Error marking all fast tracking notifications as read:",
        error,
      );
      return 0;
    }
  }

  // Notification logs
  async logNotification(logData: InsertNotificationLog): Promise<NotificationLog> {
    try {
      const [log] = await db
        .insert(notificationLogs)
        .values(logData)
        .returning();
      return log;
    } catch (error) {
      console.error("Error logging notification:", error);
      throw error;
    }
  }

  async getNotificationLogs(limit = 100): Promise<NotificationLog[]> {
    try {
      return await db
        .select()
        .from(notificationLogs)
        .orderBy(desc(notificationLogs.sentAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      return [];
    }
  }

  async getUserNotificationLogs(userId: number, limit = 50): Promise<NotificationLog[]> {
    try {
      console.log(`🔍 [EMAIL_HISTORY] DatabaseStorage.getUserNotificationLogs called with userId: ${userId}, limit: ${limit}`);
      
      const results = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.userId, userId))
        .orderBy(desc(notificationLogs.sentAt))
        .limit(limit);
      
      console.log(`📧 [EMAIL_HISTORY] DatabaseStorage query executed, found ${results.length} logs for user ${userId}`);
      console.log(`📋 [EMAIL_HISTORY] DatabaseStorage results:`, results.map(r => ({
        id: r.id,
        type: r.type,
        subject: r.subject,
        userId: r.userId,
        sentAt: r.sentAt,
        status: r.status
      })));
      
      return results;
    } catch (error) {
      console.error("❌ [EMAIL_HISTORY] DatabaseStorage error fetching user notification logs:", error);
      console.error("❌ [EMAIL_HISTORY] DatabaseStorage error message:", error instanceof Error ? error.message : String(error));
      console.error("❌ [EMAIL_HISTORY] DatabaseStorage error stack:", error instanceof Error ? error.stack : 'No stack');
      return [];
    }
  }
}

// Create both storage implementations
const dbStorage = new DatabaseStorage();
const memStorage = new MemStorage();

// Database storage that stores everything in the database
export class DatabaseOnlyStorage implements IStorage {
  sessionStore: any;

  // Update shipment tracking information
  async updateShipmentTrackingInfo(
    shipmentId: number,
    trackingNumber: string,
    labelUrl: string,
  ): Promise<Shipment | undefined> {
    return dbStorage.updateShipmentTrackingInfo(
      shipmentId,
      trackingNumber,
      labelUrl,
    );
  }

  // Price history operations
  async recordPriceHistory(
    data: schema.InsertPriceHistory,
  ): Promise<schema.PriceHistory> {
    try {
      const [result] = await db
        .insert(schema.priceHistory)
        .values(data)
        .returning();
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getPriceHistory(shipmentId: number): Promise<schema.PriceHistory[]> {
    try {
      return await db
        .select()
        .from(schema.priceHistory)
        .where(eq(schema.priceHistory.shipmentId, shipmentId))
        .orderBy(desc(schema.priceHistory.createdAt));
    } catch (error) {
      throw error;
    }
  }

  // User products operations
  async createUserProduct(
    userId: number,
    product: InsertUserProduct,
  ): Promise<UserProduct> {
    try {
      const now = new Date();

      const [createdProduct] = await db
        .insert(userProducts)
        .values({
          ...product,
          userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdProduct;
    } catch (error) {
      throw error;
    }
  }

  async getUserProducts(userId: number): Promise<UserProduct[]> {
    try {
      return await db
        .select()
        .from(userProducts)
        .where(eq(userProducts.userId, userId))
        .orderBy(asc(userProducts.name));
    } catch (error) {
      return [];
    }
  }

  async getUserProductById(id: number): Promise<UserProduct | undefined> {
    try {
      const [product] = await db
        .select()
        .from(userProducts)
        .where(eq(userProducts.id, id));

      return product;
    } catch (error) {
      return undefined;
    }
  }

  async searchUserProducts(
    userId: number,
    query: string,
  ): Promise<UserProduct[]> {
    try {
      if (!query || query.trim() === "") {
        return this.getUserProducts(userId);
      }

      // Convert query to lowercase for case-insensitive search
      const searchQuery = `%${query.toLowerCase()}%`;

      // Use SQL ILIKE for case-insensitive partial matching
      return await db
        .select()
        .from(userProducts)
        .where(
          and(
            eq(userProducts.userId, userId),
            or(
              sql`LOWER(${userProducts.name}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.description}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.manufacturer}) LIKE ${searchQuery}`,
              sql`LOWER(${userProducts.sku}) LIKE ${searchQuery}`,
            ),
          ),
        )
        .orderBy(asc(userProducts.name));
    } catch (error) {
      return [];
    }
  }

  async updateUserProduct(
    id: number,
    productData: Partial<UserProduct>,
  ): Promise<UserProduct | undefined> {
    try {
      const product = await this.getUserProductById(id);

      if (!product) {
        return undefined;
      }

      const [updatedProduct] = await db
        .update(userProducts)
        .set({
          ...productData,
          updatedAt: new Date(),
        })
        .where(eq(userProducts.id, id))
        .returning();

      return updatedProduct;
    } catch (error) {
      return undefined;
    }
  }

  async deleteUserProduct(id: number): Promise<UserProduct | undefined> {
    try {
      const product = await this.getUserProductById(id);

      if (!product) {
        return undefined;
      }

      await db.delete(userProducts).where(eq(userProducts.id, id));

      return product;
    } catch (error) {
      return undefined;
    }
  }

  // Support ticket operations
  async createSupportTicket(ticket: any): Promise<SupportTicket> {
    const now = new Date();

    const [createdTicket] = await db
      .insert(schema.supportTickets)
      .values({
        ...ticket,
        status: schema.TicketStatus.OPEN,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createdTicket;
  }

  async getSupportTicket(id: number): Promise<SupportTicket | undefined> {
    const [ticket] = await db
      .select({
        ...schema.supportTickets,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.supportTickets)
      .leftJoin(schema.users, eq(schema.supportTickets.userId, schema.users.id))
      .where(eq(schema.supportTickets.id, id));

    return ticket;
  }

  async getUserSupportTickets(userId: number): Promise<SupportTicket[]> {
    return await db
      .select({
        ...schema.supportTickets,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.supportTickets)
      .leftJoin(schema.users, eq(schema.supportTickets.userId, schema.users.id))
      .where(eq(schema.supportTickets.userId, userId))
      .orderBy(desc(schema.supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    // Join tickets with user data to get user information
    const ticketsWithUserInfo = await db
      .select({
        ...schema.supportTickets,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.supportTickets)
      .leftJoin(schema.users, eq(schema.supportTickets.userId, schema.users.id))
      .orderBy(desc(schema.supportTickets.createdAt));

    return ticketsWithUserInfo;
  }

  async getOpenSupportTickets(): Promise<SupportTicket[]> {
    return await db
      .select({
        ...schema.supportTickets,
        userName: schema.users.name,
        userEmail: schema.users.email,
      })
      .from(schema.supportTickets)
      .leftJoin(schema.users, eq(schema.supportTickets.userId, schema.users.id))
      .where(
        or(
          eq(schema.supportTickets.status, schema.TicketStatus.OPEN),
          eq(schema.supportTickets.status, schema.TicketStatus.IN_PROGRESS),
          eq(
            schema.supportTickets.status,
            schema.TicketStatus.WAITING_ON_CUSTOMER,
          ),
        ),
      )
      .orderBy(desc(schema.supportTickets.createdAt));
  }

  async updateSupportTicket(
    id: number,
    data: Partial<SupportTicket>,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    const [updatedTicket] = await db
      .update(schema.supportTickets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async assignSupportTicket(
    id: number,
    adminId: number,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    // Update the ticket status and assign to admin
    const [updatedTicket] = await db
      .update(schema.supportTickets)
      .set({
        status: schema.TicketStatus.IN_PROGRESS,
        assignedTo: adminId,
        updatedAt: new Date(),
      })
      .where(eq(schema.supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async closeSupportTicket(
    id: number,
    adminId: number,
    reason: string,
  ): Promise<SupportTicket | undefined> {
    const ticket = await this.getSupportTicket(id);

    if (!ticket) {
      return undefined;
    }

    // Close the ticket with a reason
    const now = new Date();
    const [updatedTicket] = await db
      .update(schema.supportTickets)
      .set({
        status: schema.TicketStatus.CLOSED,
        closedBy: adminId,
        closedAt: now,
        closureReason: reason,
        updatedAt: now,
      })
      .where(eq(schema.supportTickets.id, id))
      .returning();

    return updatedTicket;
  }

  async addTicketResponse(
    response: InsertTicketResponse,
  ): Promise<TicketResponse> {
    const [createdResponse] = await db
      .insert(schema.ticketResponses)
      .values(response)
      .returning();

    // If this is an admin response, update the ticket status
    if (response.isAdminResponse) {
      await this.updateSupportTicket(response.ticketId, {
        status: schema.TicketStatus.WAITING_ON_CUSTOMER,
      });
    } else {
      // If this is a customer response, update ticket status back to in_progress
      await this.updateSupportTicket(response.ticketId, {
        status: schema.TicketStatus.IN_PROGRESS,
      });
    }

    return createdResponse;
  }

  async getTicketResponses(ticketId: number): Promise<TicketResponse[]> {
    return await db
      .select({
        ...schema.ticketResponses,
        responderName: schema.users.name,
      })
      .from(schema.ticketResponses)
      .leftJoin(
        schema.users,
        eq(schema.ticketResponses.userId, schema.users.id),
      )
      .where(eq(schema.ticketResponses.ticketId, ticketId))
      .orderBy(asc(schema.ticketResponses.createdAt));
  }

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: "session", // Explicit table name
      ttl: 86400 * 30, // 30 days in seconds
    });
    console.log(
      "Using database storage for all operations with 30-day session persistence",
    );
  }

  // Pickup operations
  async createPickupRequest(
    userId: number,
    pickupDate: Date,
    pickupNotes?: string,
    pickupAddress?: string,
    pickupCity?: string,
    pickupPostalCode?: string,
  ): Promise<{ pickupRequest: any; pickupShipments: any[] }> {
    return dbStorage.createPickupRequest(
      userId,
      pickupDate,
      pickupNotes,
      pickupAddress,
      pickupCity,
      pickupPostalCode,
    );
  }

  async addShipmentsToPickupRequest(
    pickupRequestId: number,
    shipmentIds: number[],
  ): Promise<any[]> {
    return dbStorage.addShipmentsToPickupRequest(pickupRequestId, shipmentIds);
  }

  async getPickupRequestById(id: number): Promise<any> {
    return dbStorage.getPickupRequestById(id);
  }

  async getUserPickupRequests(userId: number): Promise<any[]> {
    return dbStorage.getUserPickupRequests(userId);
  }

  async getAllPickupRequests(): Promise<any[]> {
    return dbStorage.getAllPickupRequests();
  }

  async getPickupRequestWithShipments(
    id: number,
  ): Promise<{ pickupRequest: any; shipments: Shipment[]; user: User }> {
    return dbStorage.getPickupRequestWithShipments(id);
  }

  async updatePickupRequestStatus(
    id: number,
    status: PickupStatus,
    notes?: string,
  ): Promise<any> {
    return dbStorage.updatePickupRequestStatus(id, status, notes);
  }

  // Announcement operations
  async createAnnouncement(
    announcement: InsertAnnouncement,
    createdBy: number,
  ): Promise<Announcement> {
    return dbStorage.createAnnouncement(announcement, createdBy);
  }

  async getAnnouncement(id: number): Promise<Announcement | undefined> {
    return dbStorage.getAnnouncement(id);
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return dbStorage.getActiveAnnouncements();
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return dbStorage.getAllAnnouncements();
  }

  async updateAnnouncement(
    id: number,
    data: Partial<Announcement>,
  ): Promise<Announcement | undefined> {
    return dbStorage.updateAnnouncement(id, data);
  }

  async deleteAnnouncement(id: number): Promise<Announcement | undefined> {
    return dbStorage.deleteAnnouncement(id);
  }

  async getLoginPopupAnnouncements(userId: number): Promise<Announcement[]> {
    return dbStorage.getLoginPopupAnnouncements(userId);
  }

  async markAnnouncementAsViewed(userId: number, announcementId: number): Promise<void> {
    return dbStorage.markAnnouncementAsViewed(userId, announcementId);
  }

  // System settings operations
  async createSystemSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSetting> {
    return dbStorage.createSystemSetting(key, value, description);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return dbStorage.getSystemSetting(key);
  }

  async getSystemSettingValue(
    key: string,
    defaultValue: string = "",
  ): Promise<string> {
    return dbStorage.getSystemSettingValue(key, defaultValue);
  }

  async getDefaultPriceMultiplier(): Promise<number> {
    return dbStorage.getDefaultPriceMultiplier();
  }

  async updateSystemSetting(
    key: string,
    value: string,
  ): Promise<SystemSetting | undefined> {
    return dbStorage.updateSystemSetting(key, value);
  }

  async deleteSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return dbStorage.deleteSystemSetting(key);
  }

  // Country Price Multiplier operations
  async getAllCountryPriceMultipliers(): Promise<CountryPriceMultiplier[]> {
    return dbStorage.getAllCountryPriceMultipliers();
  }

  async getCountryPriceMultiplier(countryCode: string): Promise<CountryPriceMultiplier | undefined> {
    return dbStorage.getCountryPriceMultiplier(countryCode);
  }

  async createCountryPriceMultiplier(data: InsertCountryPriceMultiplier): Promise<CountryPriceMultiplier> {
    return dbStorage.createCountryPriceMultiplier(data);
  }

  async updateCountryPriceMultiplier(id: number, data: Partial<CountryPriceMultiplier>): Promise<CountryPriceMultiplier | undefined> {
    return dbStorage.updateCountryPriceMultiplier(id, data);
  }

  async deleteCountryPriceMultiplier(id: number): Promise<CountryPriceMultiplier | undefined> {
    return dbStorage.deleteCountryPriceMultiplier(id);
  }

  // Weight Range Price Multiplier operations
  async getAllWeightRangePriceMultipliers(): Promise<WeightRangePriceMultiplier[]> {
    return dbStorage.getAllWeightRangePriceMultipliers();
  }

  async getWeightRangePriceMultiplier(weight: number): Promise<WeightRangePriceMultiplier | undefined> {
    return dbStorage.getWeightRangePriceMultiplier(weight);
  }

  async createWeightRangePriceMultiplier(data: InsertWeightRangePriceMultiplier): Promise<WeightRangePriceMultiplier> {
    return dbStorage.createWeightRangePriceMultiplier(data);
  }

  async updateWeightRangePriceMultiplier(id: number, data: Partial<WeightRangePriceMultiplier>): Promise<WeightRangePriceMultiplier | undefined> {
    return dbStorage.updateWeightRangePriceMultiplier(id, data);
  }

  async deleteWeightRangePriceMultiplier(id: number): Promise<WeightRangePriceMultiplier | undefined> {
    return dbStorage.deleteWeightRangePriceMultiplier(id);
  }

  // User-specific Country Pricing Rules
  async getUserCountryPricingRules(userId: number): Promise<CountryPricingRule[]> {
    return dbStorage.getUserCountryPricingRules(userId);
  }

  async getUserCountryPricingRule(userId: number, countryCode: string): Promise<CountryPricingRule | undefined> {
    return dbStorage.getUserCountryPricingRule(userId, countryCode);
  }

  async createCountryPricingRule(data: InsertCountryPricingRule): Promise<CountryPricingRule> {
    return dbStorage.createCountryPricingRule(data);
  }

  async updateCountryPricingRule(id: number, data: Partial<CountryPricingRule>): Promise<CountryPricingRule | undefined> {
    return dbStorage.updateCountryPricingRule(id, data);
  }

  async deleteCountryPricingRule(id: number): Promise<CountryPricingRule | undefined> {
    return dbStorage.deleteCountryPricingRule(id);
  }

  // User-specific Weight Pricing Rules
  async getUserWeightPricingRules(userId: number): Promise<WeightPricingRule[]> {
    return dbStorage.getUserWeightPricingRules(userId);
  }

  async getUserWeightPricingRule(userId: number, weight: number): Promise<WeightPricingRule | undefined> {
    return dbStorage.getUserWeightPricingRule(userId, weight);
  }

  async createWeightPricingRule(data: InsertWeightPricingRule): Promise<WeightPricingRule> {
    return dbStorage.createWeightPricingRule(data);
  }

  async updateWeightPricingRule(id: number, data: Partial<WeightPricingRule>): Promise<WeightPricingRule | undefined> {
    return dbStorage.updateWeightPricingRule(id, data);
  }

  async deleteWeightPricingRule(id: number): Promise<WeightPricingRule | undefined> {
    return dbStorage.deleteWeightPricingRule(id);
  }

  // Pricing Calculation Logs
  async createPricingCalculationLog(data: InsertPricingCalculationLog): Promise<PricingCalculationLog> {
    return dbStorage.createPricingCalculationLog(data);
  }

  async getPricingCalculationLogs(options: {
    userId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PricingCalculationLog[]> {
    return dbStorage.getPricingCalculationLogs(options);
  }

  async getPricingCalculationLogCount(options: {
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    return dbStorage.getPricingCalculationLogCount(options);
  }

  // Forward all operations to the database storage implementation
  async getUser(id: number): Promise<User | undefined> {
    return dbStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return dbStorage.getUserByUsername(username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }

  async getPendingUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(and(eq(users.role, "user"), eq(users.isApproved, false)));
  }

  async approveUser(
    userId: number,
    adminId: number,
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        isApproved: true,
        approvedBy: adminId,
        approvedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  // Email verification methods
  async setVerificationToken(
    userId: number,
    token: string,
    expires: Date,
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          emailVerificationToken: token,
          emailVerificationExpires: expires,
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.emailVerificationToken, token),
            or(
              isNull(users.emailVerificationExpires),
              gt(users.emailVerificationExpires, new Date())
            )
          ),
        );

      return user;
    } catch (error) {
      console.error("[getUserByVerificationToken] Error:", error);
      return undefined;
    }
  }

  async verifyEmail(token: string): Promise<User | undefined> {
    try {
      // Find user with this token that hasn't expired
      const user = await this.getUserByVerificationToken(token);

      if (!user) {
        return undefined;
      }

      // Update user to mark email as verified and clear token
      const [updatedUser] = await db
        .update(users)
        .set({
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        })
        .where(eq(users.id, user.id))
        .returning();

      return updatedUser;
    } catch (error) {
      return undefined;
    }
  }

  // Password reset methods
  async setPasswordResetToken(
    userId: number,
    hashedToken: string,
    expires: Date,
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordResetToken: hashedToken,
          passwordResetExpires: expires,
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      return undefined;
    }
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    try {
      // Get all users with non-expired reset tokens
      const usersWithTokens = await db
        .select()
        .from(users)
        .where(
          and(
            ne(users.passwordResetToken, ""),
            isNotNull(users.passwordResetToken),
            gt(users.passwordResetExpires, new Date()),
          ),
        );

      // Check each token with bcrypt
      const bcrypt = await import("bcrypt");
      for (const user of usersWithTokens) {
        if (user.passwordResetToken) {
          const isValid = await bcrypt.compare(token, user.passwordResetToken);
          if (isValid) {
            return user;
          }
        }
      }

      return undefined;
    } catch (error) {
      console.error("Error getting user by reset token:", error);
      return undefined;
    }
  }

  async updateUserPassword(
    userId: number,
    hashedPassword: string,
  ): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error updating user password:", error);
      return undefined;
    }
  }

  async clearPasswordResetToken(userId: number): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          passwordResetToken: null,
          passwordResetExpires: null,
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error("Error clearing password reset token:", error);
      return undefined;
    }
  }

  async updateCarrierLabelAccess(
    userId: number,
    canAccess: boolean,
  ): Promise<User | undefined> {
    try {
      console.log(
        `Updating carrier label access for user ${userId} to ${canAccess}`,
      );
      const [updatedUser] = await db
        .update(users)
        .set({
          canAccessCarrierLabels: canAccess,
        })
        .where(eq(users.id, userId))
        .returning();

      return updatedUser;
    } catch (error) {
      console.error(
        `Error updating carrier label access for user ${userId}:`,
        error,
      );
      return undefined;
    }
  }

  async rejectUser(
    userId: number,
    adminId: number,
    reason: string,
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        isApproved: false,
        rejectionReason: reason,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return dbStorage.createUser(insertUser);
  }

  async deleteUser(userId: number): Promise<User | undefined> {
    return dbStorage.deleteUser(userId);
  }

  async getAllUsers(
    searchTerm?: string,
    page?: number,
    limit?: number,
  ): Promise<User[]> {
    return dbStorage.getAllUsers(searchTerm, page, limit);
  }

  async updateUserBalance(
    userId: number,
    amount: number,
  ): Promise<User | undefined> {
    return dbStorage.updateUserBalance(userId, amount);
  }

  async setUserBalance(
    userId: number,
    balance: number,
  ): Promise<User | undefined> {
    return dbStorage.setUserBalance(userId, balance);
  }

  async setUserMinimumBalance(
    userId: number,
    minimumBalance: number | null,
  ): Promise<User | undefined> {
    return dbStorage.setUserMinimumBalance(userId, minimumBalance);
  }

  // Package item operations
  async addPackageItemToShipment(
    shipmentId: number,
    packageItem: schema.InsertPackageItem,
  ): Promise<schema.PackageItem> {
    return dbStorage.addPackageItemToShipment(shipmentId, packageItem);
  }

  async updatePackageItem(
    id: number,
    itemData: Partial<schema.PackageItem>,
  ): Promise<schema.PackageItem | undefined> {
    return dbStorage.updatePackageItem(id, itemData);
  }

  async getShipmentPackageItems(
    shipmentId: number,
  ): Promise<schema.PackageItem[]> {
    return dbStorage.getShipmentPackageItems(shipmentId);
  }

  // Package operations
  async createPhysicalPackagesForShipment(
    shipmentId: number,
    count: number,
    dimensions: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    name?: string | null,
    description?: string | null,
  ): Promise<Package[]> {
    return dbStorage.createPhysicalPackagesForShipment(
      shipmentId,
      count,
      dimensions,
      name,
      description,
    );
  }

  async createManyPackages(packagesData: InsertPackage[]): Promise<Package[]> {
    return dbStorage.createManyPackages(packagesData);
  }

  async getPackagesByShipmentId(shipmentId: number): Promise<Package[]> {
    return dbStorage.getShipmentPackages(shipmentId);
  }

  async getPackageById(id: number): Promise<Package | undefined> {
    return dbStorage.getPackage(id);
  }

  async updatePackage(
    id: number,
    packageData: Partial<Package>,
  ): Promise<Package | undefined> {
    return dbStorage.updatePackage(id, packageData);
  }

  async deletePackage(id: number): Promise<void> {
    await dbStorage.deletePackage(id);
  }

  async updateUser(
    userId: number,
    userData: Partial<User>,
  ): Promise<User | undefined> {
    // Get current user to ensure it exists
    const currentUser = await this.getUser(userId);
    if (!currentUser) {
      return undefined;
    }

    // If userData contains a password, use it, otherwise preserve original password
    const password = userData.password || currentUser.password;

    // Update the user record
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        // Explicitly set password based on logic above
        password,
        // Preserve other sensitive fields unless explicitly provided
        balance:
          userData.balance !== undefined
            ? userData.balance
            : currentUser.balance,
        isApproved:
          userData.isApproved !== undefined
            ? userData.isApproved
            : currentUser.isApproved,
        approvedBy:
          userData.approvedBy !== undefined
            ? userData.approvedBy
            : currentUser.approvedBy,
        approvedAt:
          userData.approvedAt !== undefined
            ? userData.approvedAt
            : currentUser.approvedAt,
        rejectionReason:
          userData.rejectionReason !== undefined
            ? userData.rejectionReason
            : currentUser.rejectionReason,
      })
      .where(eq(users.id, userId))
      .returning();

    return updatedUser;
  }

  async updateNotificationPreferences(
    userId: number,
    preferences: {
      emailMarketingCampaigns?: boolean;
      shipmentStatusUpdates?: string;
      accountNotifications?: boolean;
      adminNotifications?: boolean;
      trackingDeliveryNotifications?: boolean;
      refundReturnNotifications?: boolean;
      supportTicketNotifications?: boolean;
      customsNotifications?: boolean;
    },
  ): Promise<User | undefined> {
    return this.updateUser(userId, preferences);
  }

  async hasPaymentTransaction(shipmentId: number): Promise<boolean> {
    return dbStorage.hasPaymentTransaction(shipmentId);
  }

  async createTransaction(
    userId: number,
    amount: number,
    description: string,
    relatedShipmentId?: number,
  ): Promise<Transaction> {
    return dbStorage.createTransaction(
      userId,
      amount,
      description,
      relatedShipmentId,
    );
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return dbStorage.getUserTransactions(userId);
  }

  async createShipment(
    insertShipment: InsertShipment,
    userId: number,
    packageItems?: any[],
  ): Promise<Shipment> {
    return dbStorage.createShipment(insertShipment, userId, packageItems);
  }

  async createBulkShipments(
    insertShipments: InsertShipment[],
    userId: number,
  ): Promise<Shipment[]> {
    return dbStorage.createBulkShipments(insertShipments, userId);
  }

  async getUserShipments(userId: number): Promise<Shipment[]> {
    return dbStorage.getUserShipments(userId);
  }

  async getAllShipments(): Promise<Shipment[]> {
    return dbStorage.getAllShipments();
  }

  async getPendingShipments(): Promise<Shipment[]> {
    return dbStorage.getPendingShipments();
  }

  async getShipment(id: number): Promise<Shipment | undefined> {
    return dbStorage.getShipment(id);
  }

  async getShipmentsByIds(ids: number[]): Promise<Shipment[]> {
    return dbStorage.getShipmentsByIds(ids);
  }

  async getShipmentsWithMissingCarrierPdfs(): Promise<Shipment[]> {
    return dbStorage.getShipmentsWithMissingCarrierPdfs();
  }

  async updateShipment(
    id: number,
    shipmentData: Partial<Shipment>,
  ): Promise<Shipment | undefined> {
    return dbStorage.updateShipment(id, shipmentData);
  }

  async updateShipmentStatus(
    id: number,
    status: ShipmentStatus,
    labelUrl?: string,
    trackingNumber?: string,
    rejectionReason?: string,
  ): Promise<Shipment | undefined> {
    return dbStorage.updateShipmentStatus(
      id,
      status,
      labelUrl,
      trackingNumber,
      rejectionReason,
    );
  }

  // User products operations
  async createUserProduct(
    userId: number,
    product: InsertUserProduct,
  ): Promise<UserProduct> {
    return dbStorage.createUserProduct(userId, product);
  }

  async getUserProducts(userId: number): Promise<UserProduct[]> {
    return dbStorage.getUserProducts(userId);
  }

  async getUserProductById(id: number): Promise<UserProduct | undefined> {
    return dbStorage.getUserProductById(id);
  }

  async searchUserProducts(
    userId: number,
    query: string,
  ): Promise<UserProduct[]> {
    return dbStorage.searchUserProducts(userId, query);
  }

  async updateUserProduct(
    id: number,
    productData: Partial<UserProduct>,
  ): Promise<UserProduct | undefined> {
    return dbStorage.updateUserProduct(id, productData);
  }

  async deleteUserProduct(id: number): Promise<UserProduct | undefined> {
    return dbStorage.deleteUserProduct(id);
  }

  // Package template operations
  async createPackageTemplate(
    userId: number,
    template: InsertPackageTemplate,
  ): Promise<PackageTemplate> {
    return dbStorage.createPackageTemplate(userId, template);
  }

  async getUserPackageTemplates(userId: number): Promise<PackageTemplate[]> {
    return dbStorage.getUserPackageTemplates(userId);
  }

  async getPackageTemplate(id: number): Promise<PackageTemplate | undefined> {
    return dbStorage.getPackageTemplate(id);
  }

  async updatePackageTemplate(
    id: number,
    templateData: Partial<PackageTemplate>,
  ): Promise<PackageTemplate | undefined> {
    return dbStorage.updatePackageTemplate(id, templateData);
  }

  async deletePackageTemplate(
    id: number,
  ): Promise<PackageTemplate | undefined> {
    return dbStorage.deletePackageTemplate(id);
  }

  async setDefaultPackageTemplate(
    userId: number,
    templateId: number,
  ): Promise<PackageTemplate | undefined> {
    return dbStorage.setDefaultPackageTemplate(userId, templateId);
  }

  async getDefaultPackageTemplate(
    userId: number,
  ): Promise<PackageTemplate | undefined> {
    return dbStorage.getDefaultPackageTemplate(userId);
  }

  // Recipient operations
  async getRecipients(userId: number): Promise<schema.Recipient[]> {
    return dbStorage.getRecipients(userId);
  }

  async getRecipient(id: number): Promise<schema.Recipient | undefined> {
    return dbStorage.getRecipient(id);
  }

  async createRecipient(
    data: schema.InsertRecipient,
  ): Promise<schema.Recipient> {
    return dbStorage.createRecipient(data);
  }

  async updateRecipient(
    id: number,
    data: Partial<schema.Recipient>,
  ): Promise<schema.Recipient | undefined> {
    return dbStorage.updateRecipient(id, data);
  }

  async deleteRecipient(id: number): Promise<boolean> {
    return dbStorage.deleteRecipient(id);
  }

  async setDefaultRecipient(
    id: number,
    userId: number,
  ): Promise<schema.Recipient | undefined> {
    return dbStorage.setDefaultRecipient(id, userId);
  }

  // CMS operations
  async getContentPages(): Promise<ContentPage[]> {
    try {
      return await db
        .select()
        .from(contentPages)
        .orderBy(asc(contentPages.title));
    } catch (error) {
      console.error("Error getting content pages:", error);
      return [];
    }
  }

  async getContentPagesByType(type: string): Promise<ContentPage[]> {
    try {
      return await db
        .select()
        .from(contentPages)
        .where(eq(contentPages.type, type))
        .orderBy(asc(contentPages.title));
    } catch (error) {
      console.error(`Error getting content pages by type ${type}:`, error);
      return [];
    }
  }

  async getContentPageBySlug(slug: string): Promise<ContentPage | undefined> {
    try {
      const [page] = await db
        .select()
        .from(contentPages)
        .where(eq(contentPages.slug, slug));

      return page;
    } catch (error) {
      console.error(`Error getting content page by slug ${slug}:`, error);
      return undefined;
    }
  }

  async createContentPage(page: InsertContentPage): Promise<ContentPage> {
    try {
      const now = new Date();

      const [createdPage] = await db
        .insert(contentPages)
        .values({
          ...page,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdPage;
    } catch (error) {
      console.error("Error creating content page:", error);
      throw error;
    }
  }

  async updateContentPage(
    id: number,
    data: Partial<ContentPage>,
  ): Promise<ContentPage | undefined> {
    try {
      const page = await db
        .select()
        .from(contentPages)
        .where(eq(contentPages.id, id))
        .then((rows) => rows[0]);

      if (!page) {
        return undefined;
      }

      const [updatedPage] = await db
        .update(contentPages)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(contentPages.id, id))
        .returning();

      return updatedPage;
    } catch (error) {
      console.error(`Error updating content page ${id}:`, error);
      return undefined;
    }
  }

  async deleteContentPage(id: number): Promise<boolean> {
    try {
      const page = await db
        .select()
        .from(contentPages)
        .where(eq(contentPages.id, id))
        .then((rows) => rows[0]);

      if (!page) {
        return false;
      }

      await db.delete(contentPages).where(eq(contentPages.id, id));

      return true;
    } catch (error) {
      console.error(`Error deleting content page ${id}:`, error);
      return false;
    }
  }

  // Content translations
  async getContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<ContentTranslation | undefined> {
    try {
      const [translation] = await db
        .select()
        .from(contentTranslations)
        .where(
          and(
            eq(contentTranslations.pageId, pageId),
            eq(contentTranslations.languageCode, languageCode),
          ),
        );

      return translation;
    } catch (error) {
      console.error(
        `Error getting content translation for page ${pageId} and language ${languageCode}:`,
        error,
      );
      return undefined;
    }
  }

  async getAllContentTranslations(
    pageId: number,
  ): Promise<ContentTranslation[]> {
    try {
      return await db
        .select()
        .from(contentTranslations)
        .where(eq(contentTranslations.pageId, pageId));
    } catch (error) {
      console.error(
        `Error getting all content translations for page ${pageId}:`,
        error,
      );
      return [];
    }
  }

  async createOrUpdateContentTranslation(
    translation: InsertContentTranslation,
  ): Promise<ContentTranslation> {
    try {
      const existing = await this.getContentTranslation(
        translation.pageId,
        translation.languageCode,
      );

      if (existing) {
        // Update existing translation
        const [updatedTranslation] = await db
          .update(contentTranslations)
          .set({
            content: translation.content,
            updatedAt: new Date(),
            updatedById: translation.updatedById,
          })
          .where(
            and(
              eq(contentTranslations.pageId, translation.pageId),
              eq(contentTranslations.languageCode, translation.languageCode),
            ),
          )
          .returning();

        return updatedTranslation;
      } else {
        // Create new translation
        const [newTranslation] = await db
          .insert(contentTranslations)
          .values({
            ...translation,
            updatedAt: new Date(),
          })
          .returning();

        return newTranslation;
      }
    } catch (error) {
      console.error("Error creating or updating content translation:", error);
      throw error;
    }
  }

  async deleteContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<boolean> {
    try {
      await db
        .delete(contentTranslations)
        .where(
          and(
            eq(contentTranslations.pageId, pageId),
            eq(contentTranslations.languageCode, languageCode),
          ),
        );

      return true;
    } catch (error) {
      console.error(
        `Error deleting content translation for page ${pageId} and language ${languageCode}:`,
        error,
      );
      return false;
    }
  }

  // Physical package operations
  async createPackage(packageData: InsertPackage): Promise<Package> {
    try {
      const now = new Date();

      const [createdPackage] = await db
        .insert(packages)
        .values({
          ...packageData,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdPackage;
    } catch (error) {
      console.error("Error creating package:", error);
      throw error;
    }
  }

  async createManyPackages(packagesData: InsertPackage[]): Promise<Package[]> {
    try {
      if (packagesData.length === 0) {
        return [];
      }

      const now = new Date();
      const packagesWithTimestamps = packagesData.map((pkg) => ({
        ...pkg,
        createdAt: now,
        updatedAt: now,
      }));

      return await db
        .insert(packages)
        .values(packagesWithTimestamps)
        .returning();
    } catch (error) {
      console.error("Error creating multiple packages:", error);
      throw error;
    }
  }

  async getShipmentPackages(shipmentId: number): Promise<Package[]> {
    try {
      return await db
        .select()
        .from(packages)
        .where(eq(packages.shipmentId, shipmentId))
        .orderBy(asc(packages.id));
    } catch (error) {
      console.error("Error getting shipment packages:", error);
      return [];
    }
  }

  async getPackage(id: number): Promise<Package | undefined> {
    try {
      const [pkg] = await db.select().from(packages).where(eq(packages.id, id));

      return pkg;
    } catch (error) {
      console.error("Error getting package by ID:", error);
      return undefined;
    }
  }

  async updatePackage(
    id: number,
    packageData: Partial<Package>,
  ): Promise<Package | undefined> {
    try {
      const pkg = await this.getPackage(id);

      if (!pkg) {
        return undefined;
      }

      const [updatedPackage] = await db
        .update(packages)
        .set({
          ...packageData,
          updatedAt: new Date(),
        })
        .where(eq(packages.id, id))
        .returning();

      return updatedPackage;
    } catch (error) {
      console.error("Error updating package:", error);
      return undefined;
    }
  }

  async deletePackage(id: number): Promise<Package | undefined> {
    try {
      const pkg = await this.getPackage(id);

      if (!pkg) {
        return undefined;
      }

      await db.delete(packages).where(eq(packages.id, id));

      return pkg;
    } catch (error) {
      console.error("Error deleting package:", error);
      return undefined;
    }
  }

  // Recipient operations
  async getRecipients(userId: number): Promise<schema.Recipient[]> {
    try {
      return await db
        .select()
        .from(recipients)
        .where(eq(recipients.userId, userId))
        .orderBy(desc(recipients.isDefault), asc(recipients.name));
    } catch (error) {
      console.error("Error getting recipients:", error);
      return [];
    }
  }

  async getRecipientsByUserId(userId: number): Promise<schema.Recipient[]> {
    try {
      return await db
        .select()
        .from(recipients)
        .where(eq(recipients.userId, userId))
        .orderBy(desc(recipients.isDefault), asc(recipients.name));
    } catch (error) {
      console.error("Error getting recipients by user ID:", error);
      return [];
    }
  }

  async getRecipient(id: number): Promise<schema.Recipient | undefined> {
    try {
      const [recipient] = await db
        .select()
        .from(recipients)
        .where(eq(recipients.id, id));

      return recipient;
    } catch (error) {
      console.error("Error getting recipient by ID:", error);
      return undefined;
    }
  }

  async createRecipient(
    data: schema.InsertRecipient,
  ): Promise<schema.Recipient> {
    try {
      const now = new Date();

      // If this is set as default, unset any existing defaults for this user
      if (data.isDefault) {
        await db
          .update(recipients)
          .set({ isDefault: false })
          .where(
            and(
              eq(recipients.userId, data.userId),
              eq(recipients.isDefault, true),
            ),
          );
      }

      const [createdRecipient] = await db
        .insert(recipients)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdRecipient;
    } catch (error) {
      console.error("Error creating recipient:", error);
      throw error;
    }
  }

  async updateRecipient(
    id: number,
    data: Partial<schema.Recipient>,
  ): Promise<schema.Recipient | undefined> {
    try {
      const recipient = await this.getRecipient(id);

      if (!recipient) {
        return undefined;
      }

      // If this is being set as default, unset any existing defaults for this user
      if (data.isDefault) {
        await db
          .update(recipients)
          .set({ isDefault: false })
          .where(
            and(
              eq(recipients.userId, recipient.userId),
              eq(recipients.isDefault, true),
              not(eq(recipients.id, id)),
            ),
          );
      }

      const [updatedRecipient] = await db
        .update(recipients)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(recipients.id, id))
        .returning();

      return updatedRecipient;
    } catch (error) {
      console.error("Error updating recipient:", error);
      return undefined;
    }
  }

  async deleteRecipient(id: number): Promise<boolean> {
    try {
      const recipient = await this.getRecipient(id);

      if (!recipient) {
        return false;
      }

      await db.delete(recipients).where(eq(recipients.id, id));

      return true;
    } catch (error) {
      console.error("Error deleting recipient:", error);
      return false;
    }
  }

  async setDefaultRecipient(
    id: number,
    userId: number,
  ): Promise<schema.Recipient | undefined> {
    try {
      const recipient = await this.getRecipient(id);

      if (!recipient || recipient.userId !== userId) {
        return undefined;
      }

      // First, unset any existing default recipients for this user
      await db
        .update(recipients)
        .set({
          isDefault: false,
          updatedAt: new Date(),
        })
        .where(
          and(eq(recipients.userId, userId), eq(recipients.isDefault, true)),
        );

      // Then set the new default
      const [updatedRecipient] = await db
        .update(recipients)
        .set({
          isDefault: true,
          updatedAt: new Date(),
        })
        .where(eq(recipients.id, id))
        .returning();

      return updatedRecipient;
    } catch (error) {
      console.error("Error setting default recipient:", error);
      return undefined;
    }
  }

  // System settings operations
  async createSystemSetting(
    key: string,
    value: string,
    description?: string,
  ): Promise<SystemSetting> {
    try {
      const now = new Date();

      const [setting] = await db
        .insert(systemSettings)
        .values({
          key,
          value,
          description,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return setting;
    } catch (error) {
      console.error("Error creating system setting:", error);
      throw error;
    }
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));

      return setting;
    } catch (error) {
      console.error("Error getting system setting:", error);
      return undefined;
    }
  }

  async getSystemSettingValue(
    key: string,
    defaultValue: string = "",
  ): Promise<string> {
    try {
      const setting = await this.getSystemSetting(key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error("Error getting system setting value:", error);
      return defaultValue;
    }
  }

  /**
   * Get the default price multiplier from system settings
   * This is used as fallback when a user's priceMultiplier is null/undefined
   */
  async getDefaultPriceMultiplier(): Promise<number> {
    try {
      const setting = await this.getSystemSetting('DEFAULT_PRICE_MULTIPLIER');
      if (setting) {
        const value = parseFloat(setting.value);
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
      // Return default value of 1.45 if setting doesn't exist or is invalid
      return 1.45;
    } catch (error) {
      console.error("Error getting default price multiplier:", error);
      return 1.45;
    }
  }

  async updateSystemSetting(
    key: string,
    value: string,
  ): Promise<SystemSetting | undefined> {
    try {
      const setting = await this.getSystemSetting(key);

      if (!setting) {
        // If setting doesn't exist, create it
        return this.createSystemSetting(key, value);
      }

      const [updatedSetting] = await db
        .update(systemSettings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key))
        .returning();

      return updatedSetting;
    } catch (error) {
      console.error("Error updating system setting:", error);
      return undefined;
    }
  }

  async deleteSystemSetting(key: string): Promise<SystemSetting | undefined> {
    try {
      const setting = await this.getSystemSetting(key);

      if (!setting) {
        return undefined;
      }

      await db.delete(systemSettings).where(eq(systemSettings.key, key));

      return setting;
    } catch (error) {
      console.error("Error deleting system setting:", error);
      return undefined;
    }
  }

  // Country Price Multiplier operations
  async getAllCountryPriceMultipliers(): Promise<CountryPriceMultiplier[]> {
    try {
      const multipliers = await db
        .select()
        .from(countryPriceMultipliers)
        .where(eq(countryPriceMultipliers.isActive, true))
        .orderBy(asc(countryPriceMultipliers.countryName));
      
      return multipliers;
    } catch (error) {
      console.error("Error getting country price multipliers:", error);
      return [];
    }
  }

  async getCountryPriceMultiplier(countryCode: string): Promise<CountryPriceMultiplier | undefined> {
    try {
      const [multiplier] = await db
        .select()
        .from(countryPriceMultipliers)
        .where(
          and(
            eq(countryPriceMultipliers.countryCode, countryCode),
            eq(countryPriceMultipliers.isActive, true)
          )
        );
      
      return multiplier;
    } catch (error) {
      console.error("Error getting country price multiplier:", error);
      return undefined;
    }
  }

  async createCountryPriceMultiplier(data: InsertCountryPriceMultiplier): Promise<CountryPriceMultiplier> {
    try {
      const now = new Date();
      
      const [multiplier] = await db
        .insert(countryPriceMultipliers)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      return multiplier;
    } catch (error) {
      console.error("Error creating country price multiplier:", error);
      throw error;
    }
  }

  async updateCountryPriceMultiplier(id: number, data: Partial<CountryPriceMultiplier>): Promise<CountryPriceMultiplier | undefined> {
    try {
      const [multiplier] = await db
        .update(countryPriceMultipliers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(countryPriceMultipliers.id, id))
        .returning();
      
      return multiplier;
    } catch (error) {
      console.error("Error updating country price multiplier:", error);
      return undefined;
    }
  }

  async deleteCountryPriceMultiplier(id: number): Promise<CountryPriceMultiplier | undefined> {
    try {
      const [multiplier] = await db
        .delete(countryPriceMultipliers)
        .where(eq(countryPriceMultipliers.id, id))
        .returning();
      
      return multiplier;
    } catch (error) {
      console.error("Error deleting country price multiplier:", error);
      return undefined;
    }
  }

  // Weight Range Price Multiplier operations
  async getAllWeightRangePriceMultipliers(): Promise<WeightRangePriceMultiplier[]> {
    try {
      const multipliers = await db
        .select()
        .from(weightRangePriceMultipliers)
        .where(eq(weightRangePriceMultipliers.isActive, true))
        .orderBy(asc(weightRangePriceMultipliers.minWeight));
      
      return multipliers;
    } catch (error) {
      console.error("Error getting weight range price multipliers:", error);
      return [];
    }
  }

  async getWeightRangePriceMultiplier(weight: number): Promise<WeightRangePriceMultiplier | undefined> {
    try {
      const multipliers = await db
        .select()
        .from(weightRangePriceMultipliers)
        .where(
          and(
            gte(weight, weightRangePriceMultipliers.minWeight),
            or(
              isNull(weightRangePriceMultipliers.maxWeight),
              lte(weight, weightRangePriceMultipliers.maxWeight)
            ),
            eq(weightRangePriceMultipliers.isActive, true)
          )
        )
        .orderBy(asc(weightRangePriceMultipliers.minWeight));
      
      return multipliers[0]; // Return the first matching range
    } catch (error) {
      console.error("Error getting weight range price multiplier:", error);
      return undefined;
    }
  }

  async createWeightRangePriceMultiplier(data: InsertWeightRangePriceMultiplier): Promise<WeightRangePriceMultiplier> {
    try {
      const now = new Date();
      
      const [multiplier] = await db
        .insert(weightRangePriceMultipliers)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      
      return multiplier;
    } catch (error) {
      console.error("Error creating weight range price multiplier:", error);
      throw error;
    }
  }

  async updateWeightRangePriceMultiplier(id: number, data: Partial<WeightRangePriceMultiplier>): Promise<WeightRangePriceMultiplier | undefined> {
    try {
      const [multiplier] = await db
        .update(weightRangePriceMultipliers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(weightRangePriceMultipliers.id, id))
        .returning();
      
      return multiplier;
    } catch (error) {
      console.error("Error updating weight range price multiplier:", error);
      return undefined;
    }
  }

  async deleteWeightRangePriceMultiplier(id: number): Promise<WeightRangePriceMultiplier | undefined> {
    try {
      const [multiplier] = await db
        .delete(weightRangePriceMultipliers)
        .where(eq(weightRangePriceMultipliers.id, id))
        .returning();

      return multiplier;
    } catch (error) {
      console.error("Error deleting weight range price multiplier:", error);
      return undefined;
    }
  }

  // ============================================
  // User-specific Country Pricing Rules
  // ============================================

  async getUserCountryPricingRules(userId: number): Promise<CountryPricingRule[]> {
    try {
      const rules = await db
        .select()
        .from(countryPricingRules)
        .where(and(
          eq(countryPricingRules.userId, userId),
          eq(countryPricingRules.isActive, true)
        ))
        .orderBy(desc(countryPricingRules.priority));

      return rules;
    } catch (error) {
      console.error("Error getting user country pricing rules:", error);
      return [];
    }
  }

  async getUserCountryPricingRule(userId: number, countryCode: string): Promise<CountryPricingRule | undefined> {
    try {
      const [rule] = await db
        .select()
        .from(countryPricingRules)
        .where(and(
          eq(countryPricingRules.userId, userId),
          eq(countryPricingRules.countryCode, countryCode.toUpperCase()),
          eq(countryPricingRules.isActive, true)
        ))
        .orderBy(desc(countryPricingRules.priority))
        .limit(1);

      return rule;
    } catch (error) {
      console.error("Error getting user country pricing rule:", error);
      return undefined;
    }
  }

  async createCountryPricingRule(data: InsertCountryPricingRule): Promise<CountryPricingRule> {
    try {
      const now = new Date();
      const [rule] = await db
        .insert(countryPricingRules)
        .values({
          ...data,
          countryCode: data.countryCode.toUpperCase(),
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return rule;
    } catch (error) {
      console.error("Error creating country pricing rule:", error);
      throw error;
    }
  }

  async updateCountryPricingRule(id: number, data: Partial<CountryPricingRule>): Promise<CountryPricingRule | undefined> {
    try {
      const [rule] = await db
        .update(countryPricingRules)
        .set({
          ...data,
          countryCode: data.countryCode?.toUpperCase(),
          updatedAt: new Date(),
        })
        .where(eq(countryPricingRules.id, id))
        .returning();

      return rule;
    } catch (error) {
      console.error("Error updating country pricing rule:", error);
      return undefined;
    }
  }

  async deleteCountryPricingRule(id: number): Promise<CountryPricingRule | undefined> {
    try {
      const [rule] = await db
        .delete(countryPricingRules)
        .where(eq(countryPricingRules.id, id))
        .returning();

      return rule;
    } catch (error) {
      console.error("Error deleting country pricing rule:", error);
      return undefined;
    }
  }

  // ============================================
  // User-specific Weight Pricing Rules
  // ============================================

  async getUserWeightPricingRules(userId: number): Promise<WeightPricingRule[]> {
    try {
      const rules = await db
        .select()
        .from(weightPricingRules)
        .where(and(
          eq(weightPricingRules.userId, userId),
          eq(weightPricingRules.isActive, true)
        ))
        .orderBy(desc(weightPricingRules.priority));

      return rules;
    } catch (error) {
      console.error("Error getting user weight pricing rules:", error);
      return [];
    }
  }

  async getUserWeightPricingRule(userId: number, weight: number): Promise<WeightPricingRule | undefined> {
    try {
      const [rule] = await db
        .select()
        .from(weightPricingRules)
        .where(and(
          eq(weightPricingRules.userId, userId),
          eq(weightPricingRules.isActive, true),
          lte(weightPricingRules.minWeight, weight),
          or(
            isNull(weightPricingRules.maxWeight),
            gte(weightPricingRules.maxWeight, weight)
          )
        ))
        .orderBy(desc(weightPricingRules.priority))
        .limit(1);

      return rule;
    } catch (error) {
      console.error("Error getting user weight pricing rule:", error);
      return undefined;
    }
  }

  async createWeightPricingRule(data: InsertWeightPricingRule): Promise<WeightPricingRule> {
    try {
      const now = new Date();
      const [rule] = await db
        .insert(weightPricingRules)
        .values({
          ...data,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return rule;
    } catch (error) {
      console.error("Error creating weight pricing rule:", error);
      throw error;
    }
  }

  async updateWeightPricingRule(id: number, data: Partial<WeightPricingRule>): Promise<WeightPricingRule | undefined> {
    try {
      const [rule] = await db
        .update(weightPricingRules)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(weightPricingRules.id, id))
        .returning();

      return rule;
    } catch (error) {
      console.error("Error updating weight pricing rule:", error);
      return undefined;
    }
  }

  async deleteWeightPricingRule(id: number): Promise<WeightPricingRule | undefined> {
    try {
      const [rule] = await db
        .delete(weightPricingRules)
        .where(eq(weightPricingRules.id, id))
        .returning();

      return rule;
    } catch (error) {
      console.error("Error deleting weight pricing rule:", error);
      return undefined;
    }
  }

  // Pricing Calculation Logs (admin-only)
  async createPricingCalculationLog(data: InsertPricingCalculationLog): Promise<PricingCalculationLog> {
    try {
      const [log] = await db
        .insert(pricingCalculationLogs)
        .values(data)
        .returning();

      return log;
    } catch (error) {
      console.error("Error creating pricing calculation log:", error);
      throw error;
    }
  }

  async getPricingCalculationLogs(options: {
    userId?: number;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PricingCalculationLog[]> {
    try {
      const conditions = [];

      if (options.userId) {
        conditions.push(eq(pricingCalculationLogs.userId, options.userId));
      }
      if (options.startDate) {
        conditions.push(gte(pricingCalculationLogs.createdAt, options.startDate));
      }
      if (options.endDate) {
        conditions.push(lte(pricingCalculationLogs.createdAt, options.endDate));
      }

      const query = db
        .select()
        .from(pricingCalculationLogs)
        .orderBy(desc(pricingCalculationLogs.createdAt))
        .limit(options.limit || 100)
        .offset(options.offset || 0);

      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }

      return await query;
    } catch (error) {
      console.error("Error getting pricing calculation logs:", error);
      return [];
    }
  }

  async getPricingCalculationLogCount(options: {
    userId?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    try {
      const conditions = [];

      if (options.userId) {
        conditions.push(eq(pricingCalculationLogs.userId, options.userId));
      }
      if (options.startDate) {
        conditions.push(gte(pricingCalculationLogs.createdAt, options.startDate));
      }
      if (options.endDate) {
        conditions.push(lte(pricingCalculationLogs.createdAt, options.endDate));
      }

      const query = db.select({ count: sql`count(*)` }).from(pricingCalculationLogs);

      if (conditions.length > 0) {
        const result = await query.where(and(...conditions));
        return Number(result[0].count);
      }

      const result = await query;
      return Number(result[0].count);
    } catch (error) {
      console.error("Error getting pricing calculation log count:", error);
      return 0;
    }
  }

  // Insurance range operations
  async createInsuranceRange(
    rangeData: schema.InsertInsuranceRange,
  ): Promise<schema.InsuranceRange> {
    try {
      const now = new Date();

      const [createdRange] = await db
        .insert(schema.insuranceRanges)
        .values({
          ...rangeData,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return createdRange;
    } catch (error) {
      console.error("Error creating insurance range:", error);
      throw error;
    }
  }

  async getAllInsuranceRanges(): Promise<schema.InsuranceRange[]> {
    try {
      return await db
        .select()
        .from(schema.insuranceRanges)
        .orderBy(asc(schema.insuranceRanges.minValue));
    } catch (error) {
      console.error("Error getting all insurance ranges:", error);
      return [];
    }
  }

  async getInsuranceRangeById(
    id: number,
  ): Promise<schema.InsuranceRange | undefined> {
    try {
      const [range] = await db
        .select()
        .from(schema.insuranceRanges)
        .where(eq(schema.insuranceRanges.id, id));

      return range;
    } catch (error) {
      console.error(`Error getting insurance range ${id}:`, error);
      return undefined;
    }
  }

  async updateInsuranceRange(
    id: number,
    data: Partial<schema.InsuranceRange>,
  ): Promise<schema.InsuranceRange | undefined> {
    try {
      const [updatedRange] = await db
        .update(schema.insuranceRanges)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.insuranceRanges.id, id))
        .returning();

      return updatedRange;
    } catch (error) {
      console.error(`Error updating insurance range ${id}:`, error);
      return undefined;
    }
  }

  async deleteInsuranceRange(id: number): Promise<boolean> {
    try {
      await db
        .delete(schema.insuranceRanges)
        .where(eq(schema.insuranceRanges.id, id));

      return true;
    } catch (error) {
      console.error(`Error deleting insurance range ${id}:`, error);
      return false;
    }
  }

  async findOverlappingInsuranceRanges(
    minValue: number,
    maxValue: number,
    excludeRangeId?: number,
  ): Promise<schema.InsuranceRange[]> {
    try {
      const query = db
        .select()
        .from(schema.insuranceRanges)
        .where(
          or(
            // Range overlaps from the left (new min is inside existing range)
            and(
              sql`${schema.insuranceRanges.minValue} <= ${minValue}`,
              sql`${schema.insuranceRanges.maxValue} > ${minValue}`,
            ),
            // Range overlaps from the right (new max is inside existing range)
            and(
              sql`${schema.insuranceRanges.minValue} < ${maxValue}`,
              sql`${schema.insuranceRanges.maxValue} >= ${maxValue}`,
            ),
            // New range completely contains an existing range
            and(
              sql`${schema.insuranceRanges.minValue} >= ${minValue}`,
              sql`${schema.insuranceRanges.maxValue} <= ${maxValue}`,
            ),
          ),
        );

      // Exclude the current range if an ID is provided
      if (excludeRangeId !== undefined) {
        query.where(ne(schema.insuranceRanges.id, excludeRangeId));
      }

      return await query;
    } catch (error) {
      console.error("Error finding overlapping insurance ranges:", error);
      return [];
    }
  }

  async getActiveInsuranceRanges(): Promise<schema.InsuranceRange[]> {
    try {
      // Get all active insurance ranges
      const ranges = await db
        .select()
        .from(schema.insuranceRanges)
        .where(eq(schema.insuranceRanges.isActive, true))
        .orderBy(asc(schema.insuranceRanges.minValue));

      return ranges;
    } catch (error) {
      console.error("Error getting active insurance ranges:", error);
      return [];
    }
  }

  async getInsuranceCostForValue(
    declaredValue: number,
  ): Promise<number | null> {
    try {
      // Get all active insurance ranges
      const ranges = await this.getActiveInsuranceRanges();

      console.log(
        `Finding insurance for value ${declaredValue} in ${ranges.length} ranges`,
      );
      console.log(
        "Available ranges:",
        ranges.map(
          (r) => `${r.minValue}-${r.maxValue}: $${r.insuranceCost / 100}`,
        ),
      );

      // Find the matching range for the declared value
      const matchingRange = ranges.find(
        (range) =>
          declaredValue >= range.minValue && declaredValue <= range.maxValue,
      );

      if (matchingRange) {
        return matchingRange.insuranceCost;
      }

      // If no matching range is found, return null

      return null;
    } catch (error) {
      return null;
    }
  }

  // CMS operations
  async getContentPages(): Promise<ContentPage[]> {
    try {
      // Using raw SQL query to avoid schema issues
      const result = await pool.query(`
        SELECT * FROM content_pages 
        ORDER BY title ASC
      `);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getAllContentPages(): Promise<ContentPage[]> {
    try {
      // Using raw SQL query to avoid schema issues
      const result = await pool.query(`
        SELECT * FROM content_pages 
        ORDER BY title ASC
      `);
      return result.rows;
    } catch (error) {
      console.error("Error getting all content pages:", error);
      return [];
    }
  }

  async getContentPagesByType(type: string): Promise<ContentPage[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_pages 
        WHERE type = $1
        ORDER BY title ASC
      `,
        [type],
      );
      return result.rows;
    } catch (error) {
      console.error(`Error getting content pages by type ${type}:`, error);
      return [];
    }
  }

  async getContentPageById(id: number): Promise<ContentPage | undefined> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_pages 
        WHERE id = $1
      `,
        [id],
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error getting content page by ID ${id}:`, error);
      return undefined;
    }
  }

  async getContentPageBySlug(slug: string): Promise<ContentPage | undefined> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_pages 
        WHERE slug = $1
      `,
        [slug],
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error getting content page by slug ${slug}:`, error);
      return undefined;
    }
  }

  async createContentPage(page: InsertContentPage): Promise<ContentPage> {
    try {
      // Build dynamic SQL for inserting page
      const fields = Object.keys(page).join(", ");
      const placeholders = Object.keys(page)
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = Object.values(page);

      // Add timestamps
      const now = new Date();
      const fieldsWithTime = `${fields}, created_at, updated_at`;
      const placeholdersWithTime = `${placeholders}, $${values.length + 1}, $${values.length + 2}`;
      const valuesWithTime = [...values, now, now];

      const result = await pool.query(
        `
        INSERT INTO content_pages (${fieldsWithTime})
        VALUES (${placeholdersWithTime})
        RETURNING *
      `,
        valuesWithTime,
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error creating content page:", error);
      throw error;
    }
  }

  async updateContentPage(
    id: number,
    data: Partial<ContentPage>,
  ): Promise<ContentPage | undefined> {
    try {
      // Build dynamic SET clause for update
      if (Object.keys(data).length === 0) {
        throw new Error("No data provided for update");
      }

      let setClause = Object.keys(data)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ");
      setClause += `, updated_at = $${Object.keys(data).length + 1}`;

      const values = [...Object.values(data), new Date(), id];

      const result = await pool.query(
        `
        UPDATE content_pages
        SET ${setClause}
        WHERE id = $${values.length}
        RETURNING *
      `,
        values,
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error updating content page ${id}:`, error);
      throw error;
    }
  }

  async deleteContentPage(id: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        DELETE FROM content_pages
        WHERE id = $1
      `,
        [id],
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting content page ${id}:`, error);
      return false;
    }
  }

  // Content translation operations
  async getContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<ContentTranslation | undefined> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_translations 
        WHERE page_id = $1 AND language_code = $2
      `,
        [pageId, languageCode],
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0];
    } catch (error) {
      console.error(
        `Error getting content translation for page ${pageId} in language ${languageCode}:`,
        error,
      );
      return undefined;
    }
  }

  async getContentTranslations(pageId: number): Promise<ContentTranslation[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_translations 
        WHERE page_id = $1
      `,
        [pageId],
      );

      return result.rows;
    } catch (error) {
      console.error(
        `Error getting content translations for page ${pageId}:`,
        error,
      );
      return [];
    }
  }

  async getAllContentTranslations(
    pageId: number,
  ): Promise<ContentTranslation[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM content_translations 
        WHERE page_id = $1
      `,
        [pageId],
      );

      return result.rows;
    } catch (error) {
      console.error(
        `Error getting all content translations for page ${pageId}:`,
        error,
      );
      return [];
    }
  }

  async createContentTranslation(
    translation: InsertContentTranslation,
  ): Promise<ContentTranslation> {
    try {
      // Add updated_at if not already in the translation
      const translationWithTime = {
        ...translation,
        updated_at: new Date(),
      };

      // Build dynamic SQL
      const fields = Object.keys(translationWithTime).join(", ");
      const placeholders = Object.keys(translationWithTime)
        .map((_, i) => `$${i + 1}`)
        .join(", ");
      const values = Object.values(translationWithTime);

      const result = await pool.query(
        `
        INSERT INTO content_translations (${fields})
        VALUES (${placeholders})
        RETURNING *
      `,
        values,
      );

      return result.rows[0];
    } catch (error) {
      console.error("Error creating content translation:", error);
      throw error;
    }
  }

  async updateContentTranslation(
    pageId: number,
    languageCode: string,
    data: Partial<ContentTranslation>,
  ): Promise<ContentTranslation | undefined> {
    try {
      if (Object.keys(data).length === 0) {
        throw new Error("No data provided for update");
      }

      // Add updated_at to the data
      const dataWithTime = {
        ...data,
        updated_at: new Date(),
      };

      // Build the SET clause
      const setClause = Object.keys(dataWithTime)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(", ");
      const values = [...Object.values(dataWithTime), pageId, languageCode];

      const result = await pool.query(
        `
        UPDATE content_translations
        SET ${setClause}
        WHERE page_id = $${values.length - 1} AND language_code = $${values.length}
        RETURNING *
      `,
        values,
      );

      if (result.rows.length === 0) {
        return undefined;
      }

      return result.rows[0];
    } catch (error) {
      console.error(
        `Error updating content translation for page ${pageId} in language ${languageCode}:`,
        error,
      );
      throw error;
    }
  }

  async createOrUpdateContentTranslation(
    translation: InsertContentTranslation,
  ): Promise<ContentTranslation> {
    try {
      const existing = await this.getContentTranslation(
        translation.pageId,
        translation.languageCode,
      );

      if (existing) {
        const updated = await this.updateContentTranslation(
          translation.pageId,
          translation.languageCode,
          {
            content: translation.content,
            updated_by_id: translation.updatedById,
          },
        );
        if (!updated) {
          throw new Error("Failed to update translation");
        }
        return updated;
      } else {
        return await this.createContentTranslation(translation);
      }
    } catch (error) {
      console.error("Error creating or updating content translation:", error);
      throw error;
    }
  }

  async deleteContentTranslation(
    pageId: number,
    languageCode: string,
  ): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        DELETE FROM content_translations
        WHERE page_id = $1 AND language_code = $2
      `,
        [pageId, languageCode],
      );

      return result.rowCount > 0;
    } catch (error) {
      console.error(
        `Error deleting content translation for page ${pageId} in language ${languageCode}:`,
        error,
      );
      return false;
    }
  }

  // Analytics Methods
  async getShipmentAnalytics() {
    try {
      // Get total shipments count
      const shipmentCountResult = await pool.query(`
        SELECT COUNT(*) as total FROM shipments
      `);

      // Get recent shipments (last 30 days)
      const recentShipmentsResult = await pool.query(`
        SELECT COUNT(*) as recent FROM shipments 
        WHERE created_at > NOW() - INTERVAL '30 days'
      `);

      // Get total revenue
      const revenueResult = await pool.query(`
        SELECT SUM(total_price) as total FROM shipments
        WHERE status != 'cancelled'
      `);

      // Get average order value
      const avgOrderResult = await pool.query(`
        SELECT AVG(total_price) as average FROM shipments
        WHERE status != 'cancelled' AND total_price > 0
      `);

      // Get active customer count
      const customersResult = await pool.query(`
        SELECT COUNT(DISTINCT user_id) as total FROM shipments
        WHERE created_at > NOW() - INTERVAL '90 days'
      `);

      return {
        totalShipments: parseInt(shipmentCountResult.rows[0]?.total || "0"),
        recentShipments: parseInt(recentShipmentsResult.rows[0]?.recent || "0"),
        totalRevenue: parseFloat(revenueResult.rows[0]?.total || "0"),
        averageOrderValue: parseFloat(avgOrderResult.rows[0]?.average || "0"),
        activeCustomers: parseInt(customersResult.rows[0]?.total || "0"),
      };
    } catch (error) {
      console.error("Error getting shipment analytics:", error);
      // Return default values if there's an error
      return {
        totalShipments: 0,
        recentShipments: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        activeCustomers: 0,
      };
    }
  }

  async getCustomerShipmentAnalytics() {
    try {
      // Get top customers by shipment count
      const result = await pool.query(`
        SELECT 
          u.id,
          u.name,
          u.username,
          u.email,
          COUNT(s.id) as shipment_count,
          SUM(s.total_price) as revenue,
          CASE WHEN COUNT(s.id) > 0 THEN SUM(s.total_price) / COUNT(s.id) ELSE 0 END as avg_order_value
        FROM 
          shipments s
          JOIN users u ON s.user_id = u.id
        WHERE 
          s.status != 'cancelled'
          AND s.user_id != 2
        GROUP BY 
          u.id, u.name, u.username, u.email
        ORDER BY 
          shipment_count DESC
        LIMIT 10
      `);

      return result.rows
        .filter((row) => row.user_id !== 2) // Exclude gulger
        .map((row) => ({
          id: row.id,
          name: row.name,
          username: row.username,
          email: row.email,
          shipments: parseInt(row.shipment_count),
          revenue: parseFloat(row.revenue || 0),
          avgOrderValue: parseFloat(row.avg_order_value || 0),
        }));
    } catch (error) {
      console.error("Error getting customer shipment analytics:", error);
      return [];
    }
  }

  async getRevenueAnalytics() {
    try {
      // Get monthly revenue data for the past year
      const result = await pool.query(`
        SELECT 
        TO_CHAR(s.created_at, 'Mon') as month,
        EXTRACT(MONTH FROM s.created_at) as month_num,
        COUNT(s.id) as shipments,
        SUM(s.total_price) as revenue
      FROM 
        shipments s
        JOIN users u ON s.user_id = u.id
      WHERE 
        s.created_at > NOW() - INTERVAL '1 year'
        AND s.status != 'cancelled'
         AND s.user_id != 2
      GROUP BY 
        month, month_num
      ORDER BY 
        month_num
      `);

      return result.rows.map((row) => ({
        name: row.month,
        shipments: parseInt(row.shipments),
        revenue: parseFloat(row.revenue || 0) / 100, // Convert from cents to dollars
      }));
    } catch (error) {
      console.error("Error getting revenue analytics:", error);
      return [];
    }
  }

  async getGrossRevenueSummary() {
    try {
      // Get total gross revenue and shipment count
      const result = await pool.query(`
        SELECT 
          COUNT(s.id) as total_shipments,
          COALESCE(SUM(s.total_price), 0) as gross_revenue,
          COALESCE(SUM(CASE WHEN s.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN s.total_price ELSE 0 END), 0) as monthly_revenue
        FROM 
          shipments s
          JOIN users u ON s.user_id = u.id
        WHERE 
          s.status != 'cancelled'
          AND s.user_id != 2
      `);

      const data = result.rows[0];
      // Convert from cents to dollars by dividing by 100
      const grossRevenue = parseFloat(data.gross_revenue || 0) / 100;
      const monthlyRevenue = parseFloat(data.monthly_revenue || 0) / 100;
      
      return {
        grossRevenue,
        formattedGrossRevenue: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(grossRevenue),
        monthlyRevenue,
        formattedMonthlyRevenue: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(monthlyRevenue),
        totalShipments: parseInt(data.total_shipments || 0)
      };
    } catch (error) {
      console.error("Error getting gross revenue summary:", error);
      return {
        grossRevenue: 0,
        formattedGrossRevenue: '$0.00',
        monthlyRevenue: 0,
        formattedMonthlyRevenue: '$0.00',
        totalShipments: 0
      };
    }
  }

  async getDailyGrossRevenue() {
    try {
      // Get today's gross revenue and shipment count
      const result = await pool.query(`
        SELECT 
          COUNT(s.id) as daily_shipments,
          COALESCE(SUM(s.total_price), 0) as daily_revenue
        FROM 
          shipments s
          JOIN users u ON s.user_id = u.id
        WHERE 
          s.status != 'cancelled'
          AND s.user_id != 2
          AND DATE(s.created_at) = CURRENT_DATE
      `);

      const data = result.rows[0];
      // Convert from cents to dollars by dividing by 100
      const dailyRevenue = parseFloat(data.daily_revenue || 0) / 100;
      
      return {
        dailyRevenue,
        formattedDailyRevenue: new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(dailyRevenue),
        dailyShipments: parseInt(data.daily_shipments || 0)
      };
    } catch (error) {
      console.error("Error getting daily gross revenue:", error);
      return {
        dailyRevenue: 0,
        formattedDailyRevenue: '$0.00',
        dailyShipments: 0
      };
    }
  }

  async getShipmentStatusAnalytics() {
    try {
      // Get shipment status distribution
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(id) as count
        FROM 
          shipments
        GROUP BY 
          status
        ORDER BY 
          count DESC
      `);

      return result.rows.map((row) => ({
        name: row.status.charAt(0).toUpperCase() + row.status.slice(1),
        value: parseInt(row.count),
      }));
    } catch (error) {
      console.error("Error getting shipment status analytics:", error);
      return [];
    }
  }

  // Draft shipment operations
  async createDraftShipment(
    userId: number,
    draftData: InsertDraftShipment,
  ): Promise<DraftShipment> {
    return dbStorage.createDraftShipment(userId, draftData);
  }

  async getUserDraftShipments(userId: number): Promise<DraftShipment[]> {
    return dbStorage.getUserDraftShipments(userId);
  }

  async getDraftShipment(id: number): Promise<DraftShipment | undefined> {
    return dbStorage.getDraftShipment(id);
  }

  async updateDraftShipment(
    id: number,
    data: Partial<DraftShipment>,
  ): Promise<DraftShipment | undefined> {
    return dbStorage.updateDraftShipment(id, data);
  }

  async deleteDraftShipment(id: number): Promise<boolean> {
    return dbStorage.deleteDraftShipment(id);
  }

  async convertDraftToShipment(
    draftId: number,
    userId: number,
  ): Promise<Shipment> {
    return dbStorage.convertDraftToShipment(draftId, userId);
  }

  // Marketing Banner operations
  async getActiveMarketingBanners(): Promise<MarketingBanner[]> {
    try {
      const currentDate = new Date();

      // Get active banners that are either:
      // 1. Active with no date restrictions (startDate is null or before now, endDate is null or after now)
      // 2. Active with valid date range (now is between startDate and endDate)
      const result = await db
        .select()
        .from(marketingBanners)
        .where(
          and(
            eq(marketingBanners.isActive, true),
            or(
              isNull(marketingBanners.startDate),
              lte(marketingBanners.startDate, currentDate),
            ),
            or(
              isNull(marketingBanners.endDate),
              gte(marketingBanners.endDate, currentDate),
            ),
          ),
        )
        .orderBy(asc(marketingBanners.sortOrder));

      return result;
    } catch (error) {
      console.error("Error fetching active marketing banners:", error);
      return [];
    }
  }

  async getAllMarketingBanners(): Promise<MarketingBanner[]> {
    try {
      const result = await db
        .select()
        .from(marketingBanners)
        .orderBy(asc(marketingBanners.sortOrder));

      return result;
    } catch (error) {
      console.error("Error fetching all marketing banners:", error);
      return [];
    }
  }

  async getMarketingBanner(id: number): Promise<MarketingBanner | undefined> {
    try {
      const result = await db
        .select()
        .from(marketingBanners)
        .where(eq(marketingBanners.id, id))
        .limit(1);

      return result[0];
    } catch (error) {
      console.error(`Error fetching marketing banner ID ${id}:`, error);
      return undefined;
    }
  }

  async createMarketingBanner(
    bannerData: InsertMarketingBanner,
    createdBy: number,
  ): Promise<MarketingBanner> {
    try {
      // Convert string dates to Date objects if they exist
      const processedData = {
        ...bannerData,
        startDate:
          typeof bannerData.startDate === "string" && bannerData.startDate
            ? new Date(bannerData.startDate)
            : bannerData.startDate,
        endDate:
          typeof bannerData.endDate === "string" && bannerData.endDate
            ? new Date(bannerData.endDate)
            : bannerData.endDate,
      };

      const result = await db
        .insert(marketingBanners)
        .values({
          ...processedData,
          createdBy,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return result[0];
    } catch (error) {
      throw new Error("Failed to create marketing banner");
    }
  }

  async updateMarketingBanner(
    id: number,
    bannerData: Partial<MarketingBanner>,
  ): Promise<MarketingBanner | undefined> {
    try {
      // Remove id and timestamps from update data if present
      const {
        id: _,
        createdAt,
        updatedAt,
        createdBy,
        ...updateData
      } = bannerData as any;

      // Convert string dates to Date objects if they exist
      const processedData = {
        ...updateData,
        startDate:
          typeof updateData.startDate === "string" && updateData.startDate
            ? new Date(updateData.startDate)
            : updateData.startDate,
        endDate:
          typeof updateData.endDate === "string" && updateData.endDate
            ? new Date(updateData.endDate)
            : updateData.endDate,
      };

      const result = await db
        .update(marketingBanners)
        .set({
          ...processedData,
          updatedAt: new Date(),
        })
        .where(eq(marketingBanners.id, id))
        .returning();

      return result[0];
    } catch (error) {
      throw new Error("Failed to update marketing banner");
    }
  }

  async deleteMarketingBanner(id: number): Promise<boolean> {
    try {
      await db.delete(marketingBanners).where(eq(marketingBanners.id, id));

      return true;
    } catch (error) {
      throw new Error("Failed to delete marketing banner");
    }
  }

  // Return management operations
  async createReturn(returnData: InsertReturn): Promise<Return> {
    try {
      const [newReturn] = await db
        .insert(returns)
        .values({
          ...returnData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return newReturn;
    } catch (error) {
      throw error;
    }
  }

  async getReturns(sellerId?: number): Promise<Return[]> {
    try {
      if (sellerId) {
        const result = await db
          .select({
            ...returns,
            sellerName: users.name,
            sellerUsername: users.username,
          })
          .from(returns)
          .leftJoin(users, eq(returns.sellerId, users.id))
          .where(eq(returns.sellerId, sellerId))
          .orderBy(desc(returns.createdAt));

        return result.map((row) => ({
          ...row,
          sellerName: row.sellerName || `User ${row.sellerId}`,
          sellerUsername: row.sellerUsername || `user${row.sellerId}`,
        }));
      } else {
        const result = await db
          .select({
            ...returns,
            sellerName: users.name,
            sellerUsername: users.username,
          })
          .from(returns)
          .leftJoin(users, eq(returns.sellerId, users.id))
          .orderBy(desc(returns.createdAt));

        return result.map((row) => ({
          ...row,
          sellerName: row.sellerName || `User ${row.sellerId}`,
          sellerUsername: row.sellerUsername || `user${row.sellerId}`,
        }));
      }
    } catch (error) {
      return [];
    }
  }

  async getAllReturns(): Promise<Return[]> {
    try {
      const result = await db
        .select({
          ...returns,
          sellerName: users.name,
          sellerUsername: users.username,
          sellerEmail: users.email,
        })
        .from(returns)
        .leftJoin(users, eq(returns.sellerId, users.id))
        .orderBy(desc(returns.createdAt));

      return result.map((row) => ({
        ...row,
        sellerName: row.sellerName || `User ${row.sellerId}`,
        sellerUsername: row.sellerUsername || `user${row.sellerId}`,
        sellerEmail: row.sellerEmail || null,
      }));
    } catch (error) {
      return [];
    }
  }

  async getReturn(id: number): Promise<Return | undefined> {
    try {
      const [returnRecord] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, id));

      return returnRecord;
    } catch (error) {
      return undefined;
    }
  }

  async updateReturn(
    id: number,
    data: Partial<Return>,
  ): Promise<Return | undefined> {
    try {
      const [updatedReturn] = await db
        .update(returns)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, id))
        .returning();

      return updatedReturn;
    } catch (error) {
      return undefined;
    }
  }

  async deleteReturn(id: number): Promise<boolean> {
    try {
      // First delete all photos associated with the return
      await db.delete(returnPhotos).where(eq(returnPhotos.returnId, id));

      // Then delete the return
      await db.delete(returns).where(eq(returns.id, id));

      return true;
    } catch (error) {
      return false;
    }
  }

  // Return photos operations
  async createReturnPhoto(photoData: InsertReturnPhoto): Promise<ReturnPhoto> {
    try {
      const [newPhoto] = await db
        .insert(returnPhotos)
        .values({
          ...photoData,
          createdAt: new Date(),
        })
        .returning();

      return newPhoto;
    } catch (error) {
      throw error;
    }
  }

  async getReturnPhotos(returnId: number): Promise<ReturnPhoto[]> {
    try {
      return await db
        .select()
        .from(returnPhotos)
        .where(eq(returnPhotos.returnId, returnId))
        .orderBy(desc(returnPhotos.createdAt));
    } catch (error) {
      return [];
    }
  }

  async deleteReturnPhoto(id: number): Promise<boolean> {
    try {
      await db.delete(returnPhotos).where(eq(returnPhotos.id, id));
      return true;
    } catch (error) {
      return false;
    }
  }

  async toggleReturnControlled(id: number): Promise<Return | null> {
    try {
      const [existingReturn] = await db
        .select()
        .from(returns)
        .where(eq(returns.id, id));

      if (!existingReturn) {
        return null;
      }

      const [updatedReturn] = await db
        .update(returns)
        .set({
          isControlled: !existingReturn.isControlled,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, id))
        .returning();

      return updatedReturn || null;
    } catch (error) {
      return null;
    }
  }

  // Return filtering and reporting
  async getReturnsByDateRange(
    sellerId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Return[]> {
    try {
      return await db
        .select()
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            gte(returns.returnDate, startDate),
            lte(returns.returnDate, endDate),
          ),
        )
        .orderBy(desc(returns.returnDate));
    } catch (error) {
      return [];
    }
  }

  async getReturnsByStatus(
    sellerId: number,
    status: string,
  ): Promise<Return[]> {
    try {
      return await db
        .select()
        .from(returns)
        .where(and(eq(returns.sellerId, sellerId), eq(returns.status, status)))
        .orderBy(desc(returns.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getReturnsByOrderNumber(
    sellerId: number,
    orderNumber: string,
  ): Promise<Return[]> {
    try {
      return await db
        .select()
        .from(returns)
        .where(
          and(
            eq(returns.sellerId, sellerId),
            eq(returns.orderNumber, orderNumber),
          ),
        )
        .orderBy(desc(returns.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getReturnsReport(
    sellerId: number,
    year: number,
    month: number,
  ): Promise<any> {
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const returnsData = await this.getReturnsByDateRange(
        sellerId,
        startDate,
        endDate,
      );

      const report = {
        totalReturns: returnsData.length,
        byStatus: {
          received: returnsData.filter((r) => r.status === "received").length,
          inspected: returnsData.filter((r) => r.status === "inspected").length,
          refund_initiated: returnsData.filter(
            (r) => r.status === "refund_initiated",
          ).length,
          completed: returnsData.filter((r) => r.status === "completed").length,
        },
        totalValue: returnsData.reduce(
          (sum, r) => sum + (r.returnValue || 0),
          0,
        ),
        totalRefunded: returnsData.reduce(
          (sum, r) => sum + (r.refundAmount || 0),
          0,
        ),
        returns: returnsData,
      };

      return report;
    } catch (error) {
      return {
        totalReturns: 0,
        byStatus: {
          received: 0,
          inspected: 0,
          refund_initiated: 0,
          completed: 0,
        },
        totalValue: 0,
        totalRefunded: 0,
        returns: [],
      };
    }
  }

  // Return assignment functionality
  async assignReturnToUser(
    returnId: number,
    userId: number,
    assignedBy: number,
  ): Promise<Return | undefined> {
    try {
      const [updatedReturn] = await db
        .update(returns)
        .set({
          assignedToUserId: userId,
          assignedBy: assignedBy,
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(returns.id, returnId))
        .returning();

      return updatedReturn;
    } catch (error) {
      return undefined;
    }
  }

  async unassignReturn(returnId: number): Promise<Return | undefined> {
    try {
      const [updatedReturn] = await db
        .update(returns)
        .set({
          assignedToUserId: null,
          assignedBy: null,
          assignedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(returns.id, returnId))
        .returning();

      return updatedReturn;
    } catch (error) {
      return undefined;
    }
  }

  async getAssignedReturns(userId: number): Promise<Return[]> {
    try {
      return await db
        .select()
        .from(returns)
        .where(eq(returns.assignedToUserId, userId))
        .orderBy(desc(returns.createdAt));
    } catch (error) {
      return [];
    }
  }

  // Refund request operations
  async createRefundRequest(
    refundData: InsertRefundRequest,
  ): Promise<RefundRequest> {
    try {
      const [refundRequest] = await db
        .insert(refundRequests)
        .values({
          ...refundData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return refundRequest;
    } catch (error) {
      throw error;
    }
  }

  async getRefundRequests(userId?: number): Promise<RefundRequest[]> {
    try {
      let query = db.select().from(refundRequests);

      if (userId) {
        query = query.where(eq(refundRequests.userId, userId));
      }

      return await query.orderBy(desc(refundRequests.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getAllRefundRequests(): Promise<RefundRequest[]> {
    try {
      return await db
        .select()
        .from(refundRequests)
        .orderBy(desc(refundRequests.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getAllRefundRequestsWithUsers(): Promise<any[]> {
    try {
      return await db
        .select({
          // Refund request fields
          id: refundRequests.id,
          userId: refundRequests.userId,
          shipmentIds: refundRequests.shipmentIds,
          reason: refundRequests.reason,
          requestedAmount: refundRequests.requestedAmount,
          status: refundRequests.status,
          processedAmount: refundRequests.processedAmount,
          processedBy: refundRequests.processedBy,
          processedAt: refundRequests.processedAt,
          adminNotes: refundRequests.adminNotes,
          // Admin tracking fields
          adminTrackingStatus: refundRequests.adminTrackingStatus,
          carrierRefundReference: refundRequests.carrierRefundReference,
          submittedToCarrierAt: refundRequests.submittedToCarrierAt,
          carrierResponseAt: refundRequests.carrierResponseAt,
          expectedRefundDate: refundRequests.expectedRefundDate,
          internalNotes: refundRequests.internalNotes,
          createdAt: refundRequests.createdAt,
          updatedAt: refundRequests.updatedAt,
          // User fields
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
            username: users.username,
            companyName: users.companyName,
            companyType: users.companyType,
            role: users.role,
            balance: users.balance,
            isApproved: users.isApproved,
            isEmailVerified: users.isEmailVerified,
            createdAt: users.createdAt,
          },
        })
        .from(refundRequests)
        .leftJoin(users, eq(refundRequests.userId, users.id))
        .orderBy(desc(refundRequests.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getRefundRequest(id: number): Promise<RefundRequest | undefined> {
    try {
      const [refundRequest] = await db
        .select()
        .from(refundRequests)
        .where(eq(refundRequests.id, id));

      return refundRequest;
    } catch (error) {
      return undefined;
    }
  }

  async updateRefundRequest(
    id: number,
    data: Partial<RefundRequest>,
  ): Promise<RefundRequest | undefined> {
    try {
      const [updatedRequest] = await db
        .update(refundRequests)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(refundRequests.id, id))
        .returning();

      return updatedRequest;
    } catch (error) {
      return undefined;
    }
  }

  async processRefundRequest(
    id: number,
    status: RefundRequestStatus,
    processedAmount?: number,
    adminNotes?: string,
    processedBy?: number,
  ): Promise<RefundRequest | undefined> {
    try {
      const [processedRequest] = await db
        .update(refundRequests)
        .set({
          status,
          processedAmount,
          adminNotes,
          processedBy,
          processedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(refundRequests.id, id))
        .returning();

      return processedRequest;
    } catch (error) {
      return undefined;
    }
  }

  async updateRefundTrackingStatus(
    id: number,
    adminTrackingStatus: string,
    carrierRefundReference?: string,
    submittedToCarrierAt?: Date,
    carrierResponseAt?: Date,
    expectedRefundDate?: Date,
    internalNotes?: string,
  ): Promise<RefundRequest | undefined> {
    try {
      const updateData: any = {
        adminTrackingStatus,
        updatedAt: new Date(),
      };

      if (carrierRefundReference !== undefined)
        updateData.carrierRefundReference = carrierRefundReference;
      if (submittedToCarrierAt !== undefined)
        updateData.submittedToCarrierAt = submittedToCarrierAt;
      if (carrierResponseAt !== undefined)
        updateData.carrierResponseAt = carrierResponseAt;
      if (expectedRefundDate !== undefined)
        updateData.expectedRefundDate = expectedRefundDate;
      if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

      const [updatedRequest] = await db
        .update(refundRequests)
        .set(updateData)
        .where(eq(refundRequests.id, id))
        .returning();

      return updatedRequest;
    } catch (error) {
      return undefined;
    }
  }

  // Email campaign operations
  async createEmailCampaign(
    campaignData: InsertEmailCampaign,
  ): Promise<EmailCampaign> {
    try {
      const [campaign] = await db
        .insert(emailCampaigns)
        .values({
          ...campaignData,
          createdBy: campaignData.createdBy || 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return campaign;
    } catch (error) {
      throw error;
    }
  }

  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    try {
      return await db
        .select()
        .from(emailCampaigns)
        .orderBy(desc(emailCampaigns.createdAt));
    } catch (error) {
      return [];
    }
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    try {
      const [campaign] = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, id));

      return campaign;
    } catch (error) {
      return undefined;
    }
  }

  async updateEmailCampaign(
    id: number,
    data: Partial<EmailCampaign>,
  ): Promise<EmailCampaign | undefined> {
    try {
      const [updatedCampaign] = await db
        .update(emailCampaigns)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(emailCampaigns.id, id))
        .returning();

      return updatedCampaign;
    } catch (error) {
      return undefined;
    }
  }

  async deleteEmailCampaign(id: number): Promise<boolean> {
    try {
      const campaign = await this.getEmailCampaign(id);

      if (!campaign) {
        return false;
      }

      await db.delete(emailCampaigns).where(eq(emailCampaigns.id, id));

      return true;
    } catch (error) {
      return false;
    }
  }

  async sendEmailCampaign(
    campaignId: number,
    userIds: number[],
  ): Promise<boolean> {
    try {
      const campaign = await this.getEmailCampaign(campaignId);
      if (!campaign) {
        return false;
      }

      // Get users by IDs
      const selectedUsers = await db
        .select()
        .from(users)
        .where(inArray(users.id, userIds));

      // Create recipients records
      const recipientData = selectedUsers.map((user) => ({
        campaignId,
        userId: user.id,
        email: user.email,
        status: "pending" as const,
        createdAt: new Date(),
      }));

      await db.insert(emailCampaignRecipients).values(recipientData);

      // Update campaign status and recipient count
      await this.updateEmailCampaign(campaignId, {
        status: "sending",
        totalRecipients: selectedUsers.length,
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async getEmailCampaignRecipients(
    campaignId: number,
  ): Promise<EmailCampaignRecipient[]> {
    try {
      return await db
        .select()
        .from(emailCampaignRecipients)
        .where(eq(emailCampaignRecipients.campaignId, campaignId));
    } catch (error) {
      return [];
    }
  }

  async updateEmailCampaignRecipientStatus(
    recipientId: number,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await db
        .update(emailCampaignRecipients)
        .set({
          status,
          errorMessage,
          sentAt: status === "sent" ? new Date() : undefined,
        })
        .where(eq(emailCampaignRecipients.id, recipientId));
    } catch (error) {
      console.error(`[DB] Failed to update email campaign recipient ${recipientId}:`, error);
    }
  }

  async getEmailCampaignsByUser(userId: number): Promise<EmailCampaign[]> {
    try {
      return await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.createdBy, userId))
        .orderBy(desc(emailCampaigns.createdAt));
    } catch (error) {
      return [];
    }
  }

  // Financial activity and user actions
  async getUserFinancialActivity(userId: number, limit?: number, offset?: number): Promise<any[]> {
    return dbStorage.getUserFinancialActivity(userId, limit, offset);
  }

  async getUserActions(userId: number): Promise<any[]> {
    try {
      // Get comprehensive user actions from multiple sources
      const actions: any[] = [];

      // Get transactions as financial actions
      const financialActions = await db
        .select({
          createdAt: transactions.createdAt,
          actionType: sql<string>`'financial'`,
          description: transactions.description,
          shipmentId: transactions.relatedShipmentId,
          amount: transactions.amount,
          balanceAfter: sql<number>`NULL`,
          ipAddress: sql<string>`NULL`,
          userAgent: sql<string>`NULL`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .orderBy(desc(transactions.createdAt));

      actions.push(...financialActions);

      // Get shipment creation actions
      const shipmentActions = await db
        .select({
          createdAt: shipments.createdAt,
          actionType: sql<string>`'shipment_created'`,
          description: sql<string>`CONCAT('Created shipment ', ${shipments.trackingNumber})`,
          shipmentId: shipments.id,
          amount: sql<number>`NULL`,
          balanceAfter: sql<number>`NULL`,
          ipAddress: sql<string>`NULL`,
          userAgent: sql<string>`NULL`,
        })
        .from(shipments)
        .where(eq(shipments.userId, userId))
        .orderBy(desc(shipments.createdAt));

      actions.push(...shipmentActions);

      // Note: Activity logs table not available in current schema

      // Sort all actions by date descending
      return actions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      return [];
    }
  }

  // Billing reminder operations
  async createBillingReminder(
    data: schema.InsertBillingReminder,
  ): Promise<schema.BillingReminder> {
    return dbStorage.createBillingReminder(data);
  }

  async getAllBillingReminders(): Promise<schema.BillingReminder[]> {
    return dbStorage.getAllBillingReminders();
  }

  async getBillingReminder(
    id: number,
  ): Promise<schema.BillingReminder | undefined> {
    return dbStorage.getBillingReminder(id);
  }

  async updateBillingReminder(
    id: number,
    data: Partial<schema.BillingReminder>,
  ): Promise<schema.BillingReminder | undefined> {
    return dbStorage.updateBillingReminder(id, data);
  }

  async getBillingRemindersByUser(
    userId: number,
  ): Promise<schema.BillingReminder[]> {
    return dbStorage.getBillingRemindersByUser(userId);
  }

  // Fast tracking notification operations
  async createFastTrackingNotification(
    data: InsertFastTrackingNotification,
  ): Promise<FastTrackingNotification> {
    try {
      const [notification] = await db
        .insert(fastTrackingNotifications)
        .values(data)
        .returning();

      return notification;
    } catch (error) {
      console.error("Error creating fast tracking notification:", error);
      throw error;
    }
  }

  async getFastTrackingNotifications(
    limit = 50,
  ): Promise<FastTrackingNotification[]> {
    try {
      return await db
        .select()
        .from(fastTrackingNotifications)
        .orderBy(desc(fastTrackingNotifications.requestedAt))
        .limit(limit);
    } catch (error) {
      console.error("Error fetching fast tracking notifications:", error);
      return [];
    }
  }

  async getFastTrackingNotification(
    id: number,
  ): Promise<FastTrackingNotification | undefined> {
    try {
      const [notification] = await db
        .select()
        .from(fastTrackingNotifications)
        .where(eq(fastTrackingNotifications.id, id));

      return notification;
    } catch (error) {
      console.error("Error fetching fast tracking notification:", error);
      return undefined;
    }
  }

  async markFastTrackingNotificationAsRead(
    id: number,
    readBy: number,
  ): Promise<FastTrackingNotification | undefined> {
    try {
      const [notification] = await db
        .update(fastTrackingNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          readBy,
        })
        .where(eq(fastTrackingNotifications.id, id))
        .returning();

      return notification;
    } catch (error) {
      console.error("Error marking fast tracking notification as read:", error);
      return undefined;
    }
  }

  async markAllFastTrackingNotificationsAsRead(
    readBy: number,
  ): Promise<number> {
    try {
      const result = await db
        .update(fastTrackingNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
          readBy,
        })
        .where(eq(fastTrackingNotifications.isRead, false));

      return result.rowCount || 0;
    } catch (error) {
      console.error(
        "Error marking all fast tracking notifications as read:",
        error,
      );
      return 0;
    }
  }

  // Ticket attachment operations
  async addTicketAttachment(
    attachment: InsertTicketAttachment,
  ): Promise<TicketAttachment> {
    const [createdAttachment] = await db
      .insert(ticketAttachments)
      .values({
        ...attachment,
        uploadedAt: new Date(),
      })
      .returning();

    return createdAttachment;
  }

  async getTicketAttachments(ticketId: number): Promise<TicketAttachment[]> {
    return await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.ticketId, ticketId))
      .orderBy(asc(ticketAttachments.uploadedAt));
  }

  async getResponseAttachments(responseId: number): Promise<TicketAttachment[]> {
    return await db
      .select()
      .from(ticketAttachments)
      .where(eq(ticketAttachments.responseId, responseId))
      .orderBy(asc(ticketAttachments.uploadedAt));
  }

  async deleteTicketAttachment(id: number): Promise<TicketAttachment | undefined> {
    const [deletedAttachment] = await db
      .delete(ticketAttachments)
      .where(eq(ticketAttachments.id, id))
      .returning();

    return deletedAttachment;
  }

  // Notification logs
  async logNotification(logData: InsertNotificationLog): Promise<NotificationLog> {
    try {
      const [result] = await db
        .insert(notificationLogs)
        .values(logData)
        .returning();
      return result;
    } catch (error) {
      console.error("Error logging notification:", error);
      throw new Error("Failed to log notification");
    }
  }

  async getNotificationLogs(limit = 100): Promise<NotificationLog[]> {
    try {
      const results = await db
        .select()
        .from(notificationLogs)
        .orderBy(desc(notificationLogs.sentAt))
        .limit(limit);
      return results;
    } catch (error) {
      console.error("Error fetching notification logs:", error);
      throw new Error("Failed to fetch notification logs");
    }
  }

  async getUserNotificationLogs(userId: number, limit = 50): Promise<NotificationLog[]> {
    try {
      console.log(`🔍 [EMAIL_HISTORY] DatabaseOnlyStorage.getUserNotificationLogs called with userId: ${userId}, limit: ${limit}`);
      
      const results = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.userId, userId))
        .orderBy(desc(notificationLogs.sentAt))
        .limit(limit);
      
      console.log(`📧 [EMAIL_HISTORY] DatabaseOnlyStorage query executed, found ${results.length} logs for user ${userId}`);
      console.log(`📋 [EMAIL_HISTORY] DatabaseOnlyStorage results:`, results.map(r => ({
        id: r.id,
        type: r.type,
        subject: r.subject,
        userId: r.userId,
        sentAt: r.sentAt,
        status: r.status
      })));
      
      return results;
    } catch (error) {
      console.error("❌ [EMAIL_HISTORY] DatabaseOnlyStorage error fetching user notification logs:", error);
      return [];
    }
  }

  // Delete a single support ticket and all related data
  async deleteSupportTicket(ticketId: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting support ticket ${ticketId} and all related data...`);
      
      // Delete in correct order to respect foreign key constraints
      
      // 1. Delete ticket attachments
      const deletedAttachments = await db
        .delete(ticketAttachments)
        .where(eq(ticketAttachments.ticketId, ticketId))
        .returning();
      console.log(`   Deleted ${deletedAttachments.length} attachments`);
      
      // 2. Delete response attachments for this ticket's responses
      const responses = await db
        .select({ id: ticketResponses.id })
        .from(ticketResponses)
        .where(eq(ticketResponses.ticketId, ticketId));
      
      const responseIds = responses.map(r => r.id);
      let deletedResponseAttachments: any[] = [];
      if (responseIds.length > 0) {
        deletedResponseAttachments = await db
          .delete(ticketAttachments)
          .where(inArray(ticketAttachments.responseId, responseIds))
          .returning();
      }
        
      const deletedResponses = await db
        .delete(ticketResponses)
        .where(eq(ticketResponses.ticketId, ticketId))
        .returning();
      console.log(`   Deleted ${deletedResponses.length} responses and ${deletedResponseAttachments.length} response attachments`);
      
      // 3. Finally delete the ticket itself
      const [deletedTicket] = await db
        .delete(supportTickets)
        .where(eq(supportTickets.id, ticketId))
        .returning();
      
      if (deletedTicket) {
        console.log(`✅ Successfully deleted ticket ${ticketId}`);
        return true;
      } else {
        console.log(`❌ Ticket ${ticketId} not found`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deleting ticket ${ticketId}:`, error);
      return false;
    }
  }

  // Delete multiple support tickets in bulk
  async deleteSupportTickets(ticketIds: number[]): Promise<number> {
    try {
      console.log(`🗑️ Bulk deleting ${ticketIds.length} tickets: ${ticketIds.join(', ')}`);
      
      let deletedCount = 0;
      
      // Delete each ticket individually to ensure proper cascade deletion
      for (const ticketId of ticketIds) {
        const success = await this.deleteSupportTicket(ticketId);
        if (success) {
          deletedCount++;
        }
      }
      
      console.log(`✅ Successfully bulk deleted ${deletedCount}/${ticketIds.length} tickets`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ Error in bulk ticket deletion:`, error);
      return 0;
    }
  }

  // Update multiple tickets status in bulk
  async updateTicketsStatus(
    ticketIds: number[],
    status: TicketStatus,
    adminId: number,
    closureReason?: string,
  ): Promise<number> {
    try {
      console.log(`📝 Bulk updating ${ticketIds.length} tickets to status: ${status}`);
      
      const updateData: any = {
        status,
        lastUpdatedAt: new Date(),
        lastUpdatedBy: adminId,
      };

      // If closing tickets, add closure details
      if (status === TicketStatus.CLOSED) {
        updateData.closedAt = new Date();
        updateData.closedBy = adminId;
        if (closureReason) {
          updateData.closureReason = closureReason;
        }
      }

      const updatedTickets = await db
        .update(supportTickets)
        .set(updateData)
        .where(inArray(supportTickets.id, ticketIds))
        .returning();

      console.log(`✅ Successfully bulk updated ${updatedTickets.length}/${ticketIds.length} tickets`);
      return updatedTickets.length;
    } catch (error) {
      console.error(`❌ Error in bulk ticket status update:`, error);
      return 0;
    }
  }

  // Admin task operations
  async createTask(task: InsertTask, reporterId: number): Promise<AdminTask> {
    const now = new Date();

    const [createdTask] = await db
      .insert(adminTasks)
      .values({
        ...task,
        reporterId,
        status: TaskStatus.OPEN,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return createdTask;
  }

  async getTask(id: number): Promise<AdminTask | undefined> {
    const [task] = await db
      .select()
      .from(adminTasks)
      .where(eq(adminTasks.id, id))
      .limit(1);

    return task;
  }

  async getTasks(filters?: {
    q?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    type?: TaskType;
    assigneeId?: number;
    reporterId?: number;
    page?: number;
    limit?: number;
  }): Promise<AdminTask[]> {
    let query = db.select().from(adminTasks);

    const conditions: any[] = [];

    if (filters?.q) {
      const searchTerm = `%${filters.q}%`;
      conditions.push(
        or(
          sql`${adminTasks.title} ILIKE ${searchTerm}`,
          sql`${adminTasks.description} ILIKE ${searchTerm}`
        )
      );
    }

    if (filters?.status) {
      conditions.push(eq(adminTasks.status, filters.status));
    }

    if (filters?.priority) {
      conditions.push(eq(adminTasks.priority, filters.priority));
    }

    if (filters?.type) {
      conditions.push(eq(adminTasks.type, filters.type));
    }

    if (filters?.assigneeId) {
      conditions.push(eq(adminTasks.assigneeId, filters.assigneeId));
    }

    if (filters?.reporterId) {
      conditions.push(eq(adminTasks.reporterId, filters.reporterId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Order by created date, most recent first
    query = query.orderBy(desc(adminTasks.createdAt));

    // Add pagination if provided
    if (filters?.limit) {
      query = query.limit(filters.limit);
      if (filters?.page && filters.page > 1) {
        query = query.offset((filters.page - 1) * filters.limit);
      }
    }

    return await query;
  }

  async updateTask(id: number, data: Partial<AdminTask>): Promise<AdminTask | undefined> {
    const task = await this.getTask(id);
    if (!task) {
      return undefined;
    }

    const now = new Date();
    const updateData = {
      ...data,
      updatedAt: now,
    };

    // If marking as complete, set completed timestamp
    if (data.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
      updateData.completedAt = now;
      if (data.completedBy) {
        updateData.completedBy = data.completedBy;
      }
    }

    const [updatedTask] = await db
      .update(adminTasks)
      .set(updateData)
      .where(eq(adminTasks.id, id))
      .returning();

    return updatedTask;
  }

  async deleteTask(id: number): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting admin task ${id}...`);
      
      const deletedTasks = await db
        .delete(adminTasks)
        .where(eq(adminTasks.id, id))
        .returning();

      if (deletedTasks.length > 0) {
        console.log(`✅ Successfully deleted task ${id}`);
        return true;
      } else {
        console.log(`❌ Task ${id} not found`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error deleting task ${id}:`, error);
      return false;
    }
  }

  async deleteTasks(taskIds: number[]): Promise<number> {
    try {
      console.log(`🗑️ Bulk deleting ${taskIds.length} tasks: ${taskIds.join(', ')}`);
      
      const deletedTasks = await db
        .delete(adminTasks)
        .where(inArray(adminTasks.id, taskIds))
        .returning();

      console.log(`✅ Successfully bulk deleted ${deletedTasks.length}/${taskIds.length} tasks`);
      return deletedTasks.length;
    } catch (error) {
      console.error(`❌ Error in bulk task deletion:`, error);
      return 0;
    }
  }

  async updateTasksStatus(
    taskIds: number[],
    status: TaskStatus,
    adminId: number,
  ): Promise<number> {
    try {
      console.log(`📝 Bulk updating ${taskIds.length} tasks to status: ${status}`);
      
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // If marking as complete, add completion details
      if (status === TaskStatus.DONE) {
        updateData.completedAt = new Date();
        updateData.completedBy = adminId;
      }

      const updatedTasks = await db
        .update(adminTasks)
        .set(updateData)
        .where(inArray(adminTasks.id, taskIds))
        .returning();

      console.log(`✅ Successfully bulk updated ${updatedTasks.length}/${taskIds.length} tasks`);
      return updatedTasks.length;
    } catch (error) {
      console.error(`❌ Error in bulk task status update:`, error);
      return 0;
    }
  }

  // Tracking update batch methods
  async createTrackingUpdateBatch(batchData: InsertTrackingUpdateBatch): Promise<TrackingUpdateBatch> {
    try {
      const [result] = await db
        .insert(trackingUpdateBatches)
        .values(batchData)
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating tracking update batch:", error);
      throw new Error("Failed to create tracking update batch");
    }
  }

  async getUnprocessedTrackingUpdates(): Promise<TrackingUpdateBatch[]> {
    try {
      return await db
        .select()
        .from(trackingUpdateBatches)
        .where(eq(trackingUpdateBatches.isProcessed, false))
        .orderBy(trackingUpdateBatches.createdAt);
    } catch (error) {
      console.error("Error fetching unprocessed tracking updates:", error);
      return [];
    }
  }

  async getUnprocessedTrackingUpdatesByUser(userId: number): Promise<TrackingUpdateBatch[]> {
    try {
      return await db
        .select()
        .from(trackingUpdateBatches)
        .where(
          and(
            eq(trackingUpdateBatches.userId, userId),
            eq(trackingUpdateBatches.isProcessed, false)
          )
        )
        .orderBy(trackingUpdateBatches.createdAt);
    } catch (error) {
      console.error("Error fetching unprocessed tracking updates by user:", error);
      return [];
    }
  }

  async markTrackingUpdatesAsProcessed(updateIds: number[]): Promise<boolean> {
    try {
      if (updateIds.length === 0) return true;
      
      await db
        .update(trackingUpdateBatches)
        .set({
          isProcessed: true,
          processedAt: new Date()
        })
        .where(inArray(trackingUpdateBatches.id, updateIds));
      
      return true;
    } catch (error) {
      console.error("Error marking tracking updates as processed:", error);
      return false;
    }
  }

  async getTrackingUpdateBatchesByShipment(shipmentId: number): Promise<TrackingUpdateBatch[]> {
    try {
      return await db
        .select()
        .from(trackingUpdateBatches)
        .where(eq(trackingUpdateBatches.shipmentId, shipmentId))
        .orderBy(desc(trackingUpdateBatches.createdAt));
    } catch (error) {
      console.error("Error fetching tracking update batches by shipment:", error);
      return [];
    }
  }

  // GPT Advisor methods
  async createAdvisorConversation(data: InsertAdvisorConversation): Promise<AdvisorConversation> {
    try {
      const [conversation] = await db
        .insert(advisorConversations)
        .values(data)
        .returning();
      return conversation;
    } catch (error) {
      console.error("Error creating advisor conversation:", error);
      throw new Error("Failed to create advisor conversation");
    }
  }

  async getAdvisorConversations(userId: number): Promise<AdvisorConversation[]> {
    try {
      return await db
        .select()
        .from(advisorConversations)
        .where(eq(advisorConversations.userId, userId))
        .orderBy(desc(advisorConversations.updatedAt));
    } catch (error) {
      console.error("Error fetching advisor conversations:", error);
      return [];
    }
  }

  async getAdvisorConversation(id: number, userId: number): Promise<AdvisorConversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(advisorConversations)
        .where(
          and(
            eq(advisorConversations.id, id),
            eq(advisorConversations.userId, userId)
          )
        );
      return conversation;
    } catch (error) {
      console.error("Error fetching advisor conversation:", error);
      return undefined;
    }
  }

  async updateAdvisorConversation(id: number, userId: number, data: Partial<AdvisorConversation>): Promise<AdvisorConversation | undefined> {
    try {
      const [updated] = await db
        .update(advisorConversations)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(advisorConversations.id, id),
            eq(advisorConversations.userId, userId)
          )
        )
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating advisor conversation:", error);
      return undefined;
    }
  }

  async deleteAdvisorConversation(id: number, userId: number): Promise<boolean> {
    try {
      await db
        .delete(advisorConversations)
        .where(
          and(
            eq(advisorConversations.id, id),
            eq(advisorConversations.userId, userId)
          )
        );
      return true;
    } catch (error) {
      console.error("Error deleting advisor conversation:", error);
      return false;
    }
  }

  // Etsy connection methods
  async createEtsyConnection(data: InsertEtsyConnection): Promise<EtsyConnection> {
    try {
      const [connection] = await db
        .insert(etsyConnections)
        .values(data)
        .returning();
      return connection;
    } catch (error) {
      console.error("Error creating Etsy connection:", error);
      throw new Error("Failed to create Etsy connection");
    }
  }

  async getEtsyConnection(userId: number): Promise<EtsyConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(etsyConnections)
        .where(eq(etsyConnections.userId, userId));
      return connection;
    } catch (error) {
      console.error("Error fetching Etsy connection:", error);
      return undefined;
    }
  }

  async getEtsyConnectionByShopId(shopId: string): Promise<EtsyConnection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(etsyConnections)
        .where(eq(etsyConnections.shopId, shopId));
      return connection;
    } catch (error) {
      console.error("Error fetching Etsy connection by shop ID:", error);
      return undefined;
    }
  }

  async updateEtsyConnection(id: number, data: Partial<EtsyConnection>): Promise<EtsyConnection | undefined> {
    try {
      const [updated] = await db
        .update(etsyConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(etsyConnections.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating Etsy connection:", error);
      return undefined;
    }
  }

  async deleteEtsyConnection(id: number): Promise<boolean> {
    try {
      await db
        .delete(etsyConnections)
        .where(eq(etsyConnections.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting Etsy connection:", error);
      return false;
    }
  }

  // Etsy order methods
  async createEtsyOrders(orders: InsertEtsyOrder[]): Promise<EtsyOrder[]> {
    try {
      const created = await db
        .insert(etsyOrders)
        .values(orders)
        .returning();
      return created;
    } catch (error) {
      console.error("Error creating Etsy orders:", error);
      throw new Error("Failed to create Etsy orders");
    }
  }

  async getEtsyOrders(userId: number): Promise<EtsyOrder[]> {
    try {
      return await db
        .select()
        .from(etsyOrders)
        .where(eq(etsyOrders.userId, userId))
        .orderBy(desc(etsyOrders.orderDate));
    } catch (error) {
      console.error("Error fetching Etsy orders:", error);
      return [];
    }
  }

  async getEtsyOrder(id: number): Promise<EtsyOrder | undefined> {
    try {
      const [order] = await db
        .select()
        .from(etsyOrders)
        .where(eq(etsyOrders.id, id));
      return order;
    } catch (error) {
      console.error("Error fetching Etsy order:", error);
      return undefined;
    }
  }

  async getEtsyOrderByReceiptId(receiptId: string): Promise<EtsyOrder | undefined> {
    try {
      const [order] = await db
        .select()
        .from(etsyOrders)
        .where(eq(etsyOrders.receiptId, receiptId));
      return order;
    } catch (error) {
      console.error("Error fetching Etsy order by receipt ID:", error);
      return undefined;
    }
  }

  async updateEtsyOrder(id: number, data: Partial<EtsyOrder>): Promise<EtsyOrder | undefined> {
    try {
      const [updated] = await db
        .update(etsyOrders)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(etsyOrders.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating Etsy order:", error);
      return undefined;
    }
  }

  async getUnshippedEtsyOrders(userId: number): Promise<EtsyOrder[]> {
    try {
      return await db
        .select()
        .from(etsyOrders)
        .where(
          and(
            eq(etsyOrders.userId, userId),
            or(
              eq(etsyOrders.shippingStatus, 'not_shipped'),
              isNull(etsyOrders.shippingStatus)
            )
          )
        )
        .orderBy(desc(etsyOrders.orderDate));
    } catch (error) {
      console.error("Error fetching unshipped Etsy orders:", error);
      return [];
    }
  }
}

// Export DatabaseOnlyStorage to use database for all operations
export const storage = new DatabaseOnlyStorage();
