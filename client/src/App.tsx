import { Switch, Route, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./lib/protected-route";
import Layout from "@/components/layout";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

// Critical pages - eager load for instant navigation
import AuthPage from "@/pages/auth-page-temp";
import Dashboard from "@/pages/dashboard";
import StaticMarketing from "@/pages/static-marketing";
import TakipPage from "@/pages/tracking";

// Performance: Lazy load non-critical pages for code splitting with retry logic
const NotFound = lazy(() => import("@/pages/not-found"));
const MobileAuthPage = lazy(() => import("@/pages/mobile-auth"));
const EmailVerification = lazy(() => import("@/pages/email-verification"));
const VerificationSuccess = lazy(() => import("@/pages/verification-success"));
const VerificationResult = lazy(() => import("@/pages/verification-result"));
const ResetPasswordPage = lazy(() => import("@/pages/reset-password"));
const ForgotPasswordPage = lazy(() => import("@/pages/forgot-password"));
const ShipmentList = lazyWithRetry(() => import("@/pages/shipment-list"));
const ShipmentCreate = lazyWithRetry(() => import("@/pages/shipment-create"));
const DraftShipments = lazyWithRetry(() => import("@/pages/draft-shipments"));
const DraftShipmentsMobile = lazyWithRetry(() => import("@/pages/draft-shipments-mobile"));
const BulkUpload = lazyWithRetry(() => import("@/pages/bulk-upload"));
const BulkUploadNew = lazyWithRetry(() => import("@/pages/bulk-upload-new"));
const PendingApprovalsTemp = lazyWithRetry(() => import("@/pages/pending-approvals-temp"));
const ManageUsers = lazyWithRetry(() => import("@/pages/manage-users"));
const MyBalancePage = lazyWithRetry(() => import("@/pages/my-balance"));
const AdminShipmentList = lazyWithRetry(() => import("@/pages/admin-shipment-list"));
const AdminShipmentCreate = lazyWithRetry(() => import("@/pages/admin-shipment-create"));
const AdminShipmentCreateSimple = lazyWithRetry(() => import("@/pages/admin-shipment-create-simple"));
const AdminShipmentCreateMinimal = lazyWithRetry(() => import("@/pages/admin-shipment-create-minimal"));
const DebugAdminPage = lazyWithRetry(() => import("@/pages/debug-admin-page"));
const ShipmentEdit = lazyWithRetry(() => import("@/pages/shipment-edit-improved"));
const ApprovedShipments = lazyWithRetry(() => import("@/pages/approved-shipments"));
const InTransit = lazyWithRetry(() => import("@/pages/in-transit"));
const TransactionList = lazyWithRetry(() => import("@/pages/transaction-list"));
const Announcements = lazy(() => import("@/pages/announcements"));
const PriceCalculator = lazy(() => import("@/pages/price-calculator"));
const ManagePickups = lazy(() => import("@/pages/manage-pickups"));
const VideoLoadingDemo = lazy(() => import("@/pages/video-loading-demo"));
const MyPickups = lazy(() => import("@/pages/my-pickups"));
const SupportTicket = lazy(() => import("@/pages/support-ticket"));
const MyTickets = lazy(() => import("@/pages/my-tickets"));
const MyTicketsWrapper = lazy(() => import("@/pages/my-tickets-wrapper"));
const TicketDetail = lazy(() => import("@/pages/ticket-detail"));
const AdminTicketsWrapper = lazy(() => import("@/pages/admin-tickets-wrapper"));
const AdminTicketDetailWrapper = lazy(() => import("@/pages/admin-ticket-detail-wrapper"));
const AdminCreateTicketWrapper = lazy(() => import("@/pages/admin-create-ticket-wrapper"));
const AdminTasks = lazy(() => import("@/pages/admin-tasks"));
const Products = lazy(() => import("@/pages/products"));
const PackageTemplates = lazy(() => import("@/pages/package-templates"));
const Recipients = lazy(() => import("@/pages/recipients"));
const AdminCmsPage = lazy(() => import("@/pages/admin-cms-new"));
const RecipientImport = lazy(() => import("@/pages/recipient-import"));
const GettingStarted = lazy(() => import("@/pages/getting-started"));
const Marketing = lazy(() => import("@/pages/marketing"));
const MarketingPriceCalculator = lazy(() => import("@/pages/marketing-price-calculator"));
const ManageEmailVerification = lazy(() => import("@/pages/manage-email-verification"));
const NotificationPreferences = lazy(() => import("@/pages/notification-preferences"));
const AdminUserNotificationPreferences = lazy(() => import("@/pages/admin-user-notification-preferences"));
const HakkimizdaPage = lazy(() => import("@/pages/about"));
const EkibimizPage = lazy(() => import("@/pages/team"));
const KariyerPage = lazy(() => import("@/pages/career"));
const KureselKargoPage = lazy(() => import("@/pages/services"));
const USCustomsCalculator = lazy(() => import("@/pages/us-customs-calculator"));

// Performance: Fast loading component with instant feedback
const PageLoader = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-blue-600 border-r-orange-500 absolute top-0 left-0"></div>
        </div>
        <div className="text-center">
          <p className="text-gray-700 font-semibold">Loading...</p>
          <p className="text-gray-500 text-sm mt-1">MoogShip Global Shipping</p>
        </div>
      </div>
    </div>
  );
};

// Performance: Lazy load remaining pages
const TrackRedirectPage = lazy(() => import("@/pages/track-redirect"));
const DestekPage = lazy(() => import("@/pages/support"));
const Reports = lazy(() => import("@/pages/reports"));
const AdminPriceFetcher = lazy(() => import("@/pages/admin-price-fetcher"));
const ReturnsDashboard = lazy(() => import("@/pages/returns-dashboard"));
const WarehouseReturns = lazy(() => import("@/pages/warehouse-returns"));
const ReturnsReports = lazy(() => import("@/pages/returns-reports"));
const SellerReturns = lazy(() => import("@/pages/seller-returns"));
const AdminReturns = lazy(() => import("@/pages/admin-returns"));
const ReturnsRouter = lazy(() => import("@/pages/returns-router"));
const RefundRequestsPage = lazy(() => import("@/pages/refund-requests-fixed"));
const AdminRefundRequestsPage = lazy(() => import("@/pages/admin-refund-requests"));
const EmailCampaigns = lazy(() => import("@/pages/email-campaigns"));
const AdminInvoiceManagement = lazy(() => import("@/pages/admin-invoice-management"));
const AdminBillingReminders = lazy(() => import("@/pages/admin-billing-reminders"));
const AdminTracking = lazy(() => import("@/pages/admin-tracking"));
const AdminPricingLogs = lazy(() => import("@/pages/admin-pricing-logs"));
const AdminFiyatYonetimi = lazy(() => import("@/pages/admin-fiyat-yonetimi"));
// UndeliveredPackages functionality integrated into admin-tracking page
const TranslationDemo = lazy(() => import("@/pages/translation-demo"));
const PackingDemo = lazy(() => import("@/pages/packing-demo"));
const HSCodeAIDemo = lazy(() => import("@/pages/hs-code-ai-demo"));
const Advisor = lazy(() => import("@/pages/advisor"));
const EtsyIntegration = lazy(() => import("@/pages/etsy-integration"));
const EmailIntegration = lazy(() => import("@/pages/email-integration"));
const DownloadExtension = lazy(() => import("@/pages/download-extension"));


// Company pages
const PressPage = lazy(() => import("@/pages/company/press"));
const NewsPage = lazy(() => import("@/pages/company/news"));
const ContactPage = lazy(() => import("@/pages/company/contact"));

// Service pages
const GlobalShippingPage = lazy(() => import("@/pages/services/global-shipping"));
const CustomsClearancePage = lazy(() => import("@/pages/services/customs-clearance"));
const FreightForwardingPage = lazy(() => import("@/pages/services/freight-forwarding"));
const WarehousingPage = lazy(() => import("@/pages/services/warehousing"));
const SupplyChainPage = lazy(() => import("@/pages/services/supply-chain"));

// Legal pages
const TermsPage = lazy(() => import("@/pages/legal/terms"));
const PrivacyPage = lazy(() => import("@/pages/legal/privacy"));
const CookiesPage = lazy(() => import("@/pages/legal/cookies"));
const GDPRPage = lazy(() => import("@/pages/legal/gdpr"));
const ShippingRegulationsPage = lazy(() => import("@/pages/legal/shipping-regulations"));

// Performance: Non-lazy components that need to load immediately
import OnboardingTour from "@/components/onboarding-tour";
import { LoginAnnouncementPopup } from "@/components/LoginAnnouncementPopup";

// Critical pages are now eagerly loaded above, no need to preload



import { useAuth, AuthProvider } from "@/hooks/use-auth";
import { useTranslation } from "react-i18next";
import { SidebarProvider } from "@/contexts/SidebarContext";


function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Password reset routes - must come before root route */}
        <Route path="/forgot-password">
          <ForgotPasswordPage />
        </Route>
        <Route path="/reset-password">
          <ResetPasswordPage />
        </Route>
        
        {/* Email verification routes - not protected */}
        <Route path="/verify-email/:token">
          <EmailVerification />
        </Route>
        <Route path="/verification-success">
          <VerificationSuccess />
        </Route>
        <Route path="/verification-result">
          <VerificationResult />
        </Route>
        
        <Route path="/auth">
          <AuthPage />
        </Route>
        <Route path="/mobile-auth">
          <MobileAuthPage />
        </Route>
        <Route path="/marketing">
          <StaticMarketing />
        </Route>
      
      {/* Turkish Pages - must come before root route */}
      <Route path="/hakkimizda">
        <HakkimizdaPage />
      </Route>
      <Route path="/ekibimiz">
        <EkibimizPage />
      </Route>
      <Route path="/kariyer">
        <KariyerPage />
      </Route>
      <Route path="/kuresel-kargo">
        <KureselKargoPage />
      </Route>
      <Route path="/takip">
        <TakipPage />
      </Route>
      <Route path="/track/:trackingNumber">
        <TrackRedirectPage />
      </Route>
      <Route path="/destek">
        <DestekPage />
      </Route>
      
      {/* Root route - must come after specific routes */}
      {/* Server handles app.moogship.com redirect to /auth */}
      <Route path="/">
        <StaticMarketing />
      </Route>
      
      {/* English aliases */}
      <Route path="/about">
        <HakkimizdaPage />
      </Route>
      <Route path="/team">
        <EkibimizPage />
      </Route>
      <Route path="/career">
        <KariyerPage />
      </Route>
      <Route path="/services">
        <KureselKargoPage />
      </Route>
      <Route path="/tracking">
        <TakipPage />
      </Route>
      <Route path="/support">
        <DestekPage />
      </Route>
      
      {/* Legacy routes */}
      <Route path="/terms">
        <TermsPage />
      </Route>
      <Route path="/privacy">
        <PrivacyPage />
      </Route>
      <Route path="/contact">
        <ContactPage />
      </Route>
      
      {/* Video Loading Demo */}
      <Route path="/video-demo">
        <VideoLoadingDemo />
      </Route>
      
      {/* Company Pages */}
      <Route path="/company/about">
        <HakkimizdaPage />
      </Route>
      <Route path="/company/careers">
        <KariyerPage />
      </Route>
      <Route path="/company/press">
        <PressPage />
      </Route>
      <Route path="/company/news">
        <NewsPage />
      </Route>
      <Route path="/company/contact">
        <ContactPage />
      </Route>
      
      {/* Service Pages */}
      <Route path="/services/global-shipping">
        <GlobalShippingPage />
      </Route>
      <Route path="/services/customs-clearance">
        <CustomsClearancePage />
      </Route>
      <Route path="/services/freight-forwarding">
        <FreightForwardingPage />
      </Route>
      <Route path="/services/warehousing">
        <WarehousingPage />
      </Route>
      <Route path="/services/supply-chain">
        <SupplyChainPage />
      </Route>
      
      {/* Legal Pages */}
      <Route path="/legal/terms">
        <TermsPage />
      </Route>
      <Route path="/legal/privacy">
        <PrivacyPage />
      </Route>
      <Route path="/legal/cookies">
        <CookiesPage />
      </Route>
      <Route path="/legal/gdpr">
        <GDPRPage />
      </Route>
      <Route path="/legal/shipping-regulations">
        <ShippingRegulationsPage />
      </Route>
      
      {/* Protected App Routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/shipment-list" component={ShipmentList} />
      <ProtectedRoute path="/my-shipments" component={ShipmentList} />
      <ProtectedRoute path="/shipment-create" component={ShipmentCreate} />
      <ProtectedRoute path="/advisor" component={Advisor} />
      <ProtectedRoute path="/etsy-integration" component={EtsyIntegration} />
      <ProtectedRoute path="/email-integration" component={EmailIntegration} />
      <Route path="/download-extension" component={DownloadExtension} />
      <ProtectedRoute path="/draft-shipments" component={DraftShipments} />
      <ProtectedRoute path="/draft-shipments-mobile" component={DraftShipmentsMobile} />
      <ProtectedRoute path="/bulk-upload" component={BulkUpload} />
      <ProtectedRoute path="/bulk-upload-new" component={BulkUploadNew} />
      <ProtectedRoute path="/my-balance" component={MyBalancePage} />
      <ProtectedRoute path="/transactions" component={TransactionList} />
      <ProtectedRoute path="/notification-preferences" component={NotificationPreferences} />
      <ProtectedRoute path="/approved-shipments" component={ApprovedShipments} />
      <ProtectedRoute path="/in-transit" component={InTransit} />
      <ProtectedRoute path="/my-pickups" component={MyPickups} />
      <ProtectedRoute path="/support-ticket" component={SupportTicket} />
      <Route path="/my-tickets">
        <MyTickets />
      </Route>
      <ProtectedRoute path="/ticket-detail/:id" component={TicketDetail} />
      <ProtectedRoute path="/support-tickets/:id" component={TicketDetail} />
      <ProtectedRoute path="/products" component={Products} />
      <ProtectedRoute path="/package-templates" component={PackageTemplates} />
      <ProtectedRoute path="/recipients" component={Recipients} />
      <ProtectedRoute path="/recipients/import" component={RecipientImport} />
      <ProtectedRoute path="/getting-started" component={GettingStarted} />
      <Route path="/pending-approvals" component={PendingApprovalsTemp} />
      <ProtectedRoute path="/manage-users" component={ManageUsers} adminOnly />
      <ProtectedRoute path="/admin-shipments" component={AdminShipmentList} adminOnly />
      <ProtectedRoute path="/admin/shipment-list" component={AdminShipmentList} adminOnly />
      <Route path="/admin/login">
        <AuthPage />
      </Route>
      <ProtectedRoute path="/admin-shipment-create" component={AdminShipmentCreate} adminOnly />
      <ProtectedRoute path="/admin-shipment-create-simple" component={AdminShipmentCreateSimple} adminOnly />
      <ProtectedRoute path="/debug-admin" component={DebugAdminPage} adminOnly />
      <ProtectedRoute path="/shipment-edit/:id" component={ShipmentEdit} />
      <ProtectedRoute path="/admin/shipments/:id" component={ShipmentEdit} adminOnly />
      <ProtectedRoute path="/announcements" component={Announcements} adminOnly />
      <ProtectedRoute path="/manage-pickups" component={ManagePickups} adminOnly />
      <ProtectedRoute path="/admin-tickets" component={AdminTicketsWrapper} adminOnly />
      <ProtectedRoute path="/admin/tickets" component={AdminTicketsWrapper} adminOnly />
      <ProtectedRoute path="/admin/tickets/create" component={AdminCreateTicketWrapper} adminOnly />
      <ProtectedRoute path="/admin/ticket/:id" component={AdminTicketDetailWrapper} adminOnly />
      <ProtectedRoute path="/admin-tasks" component={AdminTasks} adminOnly />
      <ProtectedRoute path="/admin/tasks" component={AdminTasks} adminOnly />
      <ProtectedRoute path="/admin-cms" component={AdminCmsPage} adminOnly />
      <ProtectedRoute path="/manage-email-verification" component={ManageEmailVerification} adminOnly />
      <ProtectedRoute path="/admin-user-notification-preferences" component={AdminUserNotificationPreferences} adminOnly />
      <ProtectedRoute path="/reports" component={Reports} adminOnly />
      <ProtectedRoute path="/admin-price-fetcher" component={AdminPriceFetcher} adminOnly />
      <ProtectedRoute path="/price-calculator" component={PriceCalculator} />
      <ProtectedRoute path="/us-customs-calculator" component={USCustomsCalculator} />
      <ProtectedRoute path="/returns" component={ReturnsRouter} />
      <ProtectedRoute path="/admin-returns" component={AdminReturns} adminOnly />
      <ProtectedRoute path="/warehouse-returns" component={WarehouseReturns} adminOnly />
      <ProtectedRoute path="/returns-reports" component={ReturnsReports} adminOnly />
      <ProtectedRoute path="/refund-requests" component={RefundRequestsPage} />
      <ProtectedRoute path="/admin-refund-requests" component={AdminRefundRequestsPage} adminOnly />
      <ProtectedRoute path="/email-campaigns" component={EmailCampaigns} adminOnly />
      <ProtectedRoute path="/admin-invoice-management" component={AdminInvoiceManagement} adminOnly />
      <ProtectedRoute path="/admin-billing-reminders" component={AdminBillingReminders} adminOnly />
      <ProtectedRoute path="/admin-tracking" component={AdminTracking} adminOnly />
      <ProtectedRoute path="/admin-pricing-logs" component={AdminPricingLogs} adminOnly />
      <ProtectedRoute path="/admin-fiyat-yonetimi" component={AdminFiyatYonetimi} adminOnly />
      {/* Undelivered packages functionality moved to admin-tracking page */}
      <Route path="/marketing-price-calculator">
        <MarketingPriceCalculator />
      </Route>
      <Route path="/translation-demo">
        <TranslationDemo />
      </Route>
      <ProtectedRoute path="/packing-demo" component={PackingDemo} />
      <Route path="/hs-code-ai-demo">
        <HSCodeAIDemo />
      </Route>
      

      
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// Import mobile wrapper
import { MobileAppWrapper } from "./components/mobile-app-wrapper";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef } from "react";

// CRITICAL: Detect user changes and force hard reload to prevent stale data
function UserChangeDetector() {
  const { user } = useAuth();
  const lastUserIdRef = useRef<number | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount - we only want to detect CHANGES
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Store initial user ID
      if (user?.id) {
        lastUserIdRef.current = user.id;
        localStorage.setItem('moogship_last_user_id', user.id.toString());
      }
      return;
    }

    // If user exists and is different from last known user
    if (user?.id) {
      const storedUserId = localStorage.getItem('moogship_last_user_id');
      const lastUserId = storedUserId ? parseInt(storedUserId) : lastUserIdRef.current;

      if (lastUserId && lastUserId !== user.id) {
        console.log(`[USER CHANGE] Detected user change from ${lastUserId} to ${user.id} - forcing reload`);

        // Update stored user ID
        localStorage.setItem('moogship_last_user_id', user.id.toString());

        // Force hard reload to clear all cached state
        const cacheBust = Date.now();
        const currentPath = window.location.pathname;
        window.location.href = `${currentPath}?_userchange=${cacheBust}`;
        return;
      }

      // Update last known user
      lastUserIdRef.current = user.id;
      localStorage.setItem('moogship_last_user_id', user.id.toString());
    }
  }, [user?.id]);

  return null; // This component doesn't render anything
}

function App() {
  // Use wouter's useLocation hook to reactively track route changes
  const [currentPath] = useLocation();
  
  // Check if we're on a public page that doesn't need auth UI components
  const isPublicPage = 
    currentPath === '/' || 
    currentPath === '/marketing' || 
    currentPath === '/marketing-price-calculator' || 
    currentPath === '/hs-code-ai-demo' ||
    currentPath === '/auth' ||
    currentPath === '/mobile-auth' ||
    currentPath === '/verification-success' ||
    currentPath === '/verification-result' ||
    currentPath === '/forgot-password' ||
    currentPath === '/reset-password' ||
    currentPath === '/hakkimizda' ||
    currentPath === '/ekibimiz' ||
    currentPath === '/kariyer' ||
    currentPath === '/kuresel-kargo' ||
    currentPath === '/takip' ||
    currentPath === '/destek' ||
    currentPath === '/about' ||
    currentPath.startsWith('/track/') ||
    currentPath === '/team' ||
    currentPath === '/career' ||
    currentPath === '/services' ||
    currentPath === '/tracking' ||
    currentPath === '/support' ||
    currentPath.startsWith('/verify-email/') ||
    currentPath.startsWith('/company/') ||
    currentPath.startsWith('/services/') ||
    currentPath.startsWith('/legal/');
    


  return (
    <MobileAppWrapper>
      <SidebarProvider>
        <AuthProvider>
          {/* Detect user changes and force reload if needed */}
          <UserChangeDetector />

          {/* We always render the Router, even for email verification
              This works because the EmailVerification component doesn't use auth */}
          <Router />

          {/* Only render ConditionalUI for authenticated pages */}
          {!isPublicPage && <ConditionalUI />}


          {/* Always render the Toaster for notifications */}
          <Toaster />
        </AuthProvider>
      </SidebarProvider>
    </MobileAppWrapper>
  );
}

// This component handles conditional UI elements that need authentication
function ConditionalUI() {
  // Use wouter's useLocation hook to reactively track route changes
  const [currentPath] = useLocation();
  
  // Check if we're on a public page first, before using auth
  const isPublicPage = 
    currentPath === '/' || 
    currentPath === '/marketing' || 
    currentPath === '/marketing-price-calculator' || 
    currentPath === '/hs-code-ai-demo' ||
    currentPath === '/auth' ||
    currentPath === '/mobile-auth' ||
    currentPath === '/verification-success' ||
    currentPath === '/verification-result' ||
    currentPath === '/forgot-password' ||
    currentPath === '/reset-password' ||
    currentPath.startsWith('/verify-email/') ||
    currentPath.startsWith('/track/') ||
    currentPath.startsWith('/company/') ||
    currentPath.startsWith('/services/') ||
    currentPath.startsWith('/legal/');
    

  // Handle auth hooks safely with try-catch
  let user;
  try {
    const auth = useAuth();
    user = auth.user;
    console.log('[CONDITIONAL UI] Rendering with user:', user?.id, 'isPublicPage:', isPublicPage);

    // Initialize global notification service for admin users
    if (user && user.role === 'admin') {
      // Import notification service singleton to avoid multiple instances
      import('@/services/notificationService').then(({ notificationService }) => {
        // Only initialize once to preserve audio context
        if (!(window as any).notificationService) {
          console.log('🔔 Initializing global notification service for admin user');
          notificationService.initialize(true);
          
          // Make notification service globally available for bell component
          (window as any).notificationService = notificationService;
        } else {
          console.log('🔔 Global notification service already initialized');
        }
      });
    }

  } catch (error) {
    // If we're not in AuthProvider context, return null
    console.warn('Auth hook not available, skipping conditional UI');
    return null;
  }

  // Don't render any UI helpers on public pages - and don't use auth hooks
  if (isPublicPage) {
    return null;
  }
  
  // Only render these components if the user is logged in
  if (!user) {
    return null;
  }
  
  return (
    <>
      <LoginAnnouncementPopup isAuthenticated={!!user} />
      <OnboardingTour autoStart={false} />
    </>
  );
}

export default App;
