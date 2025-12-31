import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import {
  Home,
  Package,
  Plus,
  Upload,
  Wallet,
  CheckCheck,
  Truck,
  Database,
  Box,
  Users,
  LifeBuoy,
  TicketCheck,
  MessageSquare,
  LogOut,
  FileText,
  BarChart3,
  Mail,
  Calculator,
  Shield,
  RefreshCw,
  ArrowLeftRight,
  Warehouse,
  ChartBar,
  Receipt,
  Bell,
  UserCheck,
  Tag
} from 'lucide-react';

interface MobileSideMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

const MobileSideMenu = ({ isOpen, onClose, onLogout, isAdmin = false }: MobileSideMenuProps) => {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  const [userData, setUserData] = useState<any>(null);
  
  // Directly check admin status using same logic as desktop sidebar
  useEffect(() => {
    async function checkUserData() {
      try {
        // First try the regular endpoint
        let response = await fetch('/api/user', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Mobile menu: Initial user data:', userData);
          
          // If we got user role but expected admin, try the admin endpoint
          if (userData.role === 'user' && window.location.pathname.includes('admin')) {
            try {
              const adminResponse = await fetch('/api/admin/user', {
                credentials: 'include'
              });
              
              if (adminResponse.ok) {
                const adminUserData = await adminResponse.json();
                console.log('Mobile menu: Admin user data:', adminUserData);
                const isUserAdmin = adminUserData && adminUserData.role === "admin";
                setAdminStatus(isUserAdmin);
                setUserData(adminUserData);
                return;
              }
            } catch (adminError) {
              console.log("Mobile menu: Admin endpoint failed, using regular user data");
            }
          }
          
          const isUserAdmin = userData && userData.role === "admin";
          console.log('Mobile menu: Final admin status:', isUserAdmin);
          setAdminStatus(isUserAdmin);
          setUserData(userData);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
    
    // Call immediately on mount and whenever the menu is opened
    if (isOpen) {
      checkUserData();
    }
  }, [isOpen]);
  
  // Always use the fetched status and ignore props for security reasons
  const effectiveIsAdmin = adminStatus === true;


  if (!isOpen) return null;

  const MenuLink = ({ href, icon, text, isActive }: { href: string; icon: React.ReactNode; text: string; isActive: boolean }) => (
    <Link href={href}>
      <div className={`flex items-center px-3 py-2 rounded-md text-base font-medium cursor-pointer ${
        isActive ? "bg-gray-900" : "hover:bg-gray-700"
      } text-white`}>
        <div className="mr-3 text-blue-400">{icon}</div>
        {text}
      </div>
    </Link>
  );

  return (
    <div className="fixed inset-0 z-[20] md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      {/* Menu panel */}
      <div className="fixed inset-y-0 left-0 z-[10000] w-4/5 max-w-sm bg-gray-800 shadow-lg overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <h2 className="text-lg font-medium text-white">{t('common.menu')}</h2>
          <button 
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-white"
            onClick={onClose}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        
        {/* Menu content */}
        <div className="px-4 py-3 space-y-3">          
          {!effectiveIsAdmin && (
            <>
              <MenuLink 
                href="/dashboard"
                icon={<Home className="h-5 w-5" />}
                text={t('common.dashboard')}
                isActive={location === "/dashboard"}
              />
            </>
          )}
          
          {!effectiveIsAdmin && (
            <>
              <MenuLink 
                href="/shipment-list"
                icon={<Package className="h-5 w-5" />}
                text={t('common.myShipments')}
                isActive={location === "/shipment-list"}
              />
              
              <MenuLink 
                href="/shipment-create"
                icon={<Plus className="h-5 w-5" />}
                text={t('common.newShipment')}
                isActive={location === "/shipment-create"}
              />
              
              <MenuLink 
                href="/bulk-upload"
                icon={<Upload className="h-5 w-5" />}
                text={t('common.bulkUpload')}
                isActive={location === "/bulk-upload"}
              />
              
              <MenuLink 
                href="/my-balance"
                icon={<Wallet className="h-5 w-5" />}
                text={t('common.myBalance')}
                isActive={location === "/my-balance"}
              />
              
              <MenuLink 
                href="/approved-shipments"
                icon={<CheckCheck className="h-5 w-5" />}
                text={t('common.trackShipments')}
                isActive={location === "/approved-shipments"}
              />
              
              <MenuLink 
                href="/my-pickups"
                icon={<Truck className="h-5 w-5" />}
                text={t('common.myPickups')}
                isActive={location === "/my-pickups"}
              />
              
              <MenuLink 
                href="/draft-shipments"
                icon={<FileText className="h-5 w-5" />}
                text={t('common.draftShipments')}
                isActive={location === "/draft-shipments"}
              />
              
              {/* Only show returns link for users with return system access */}
              {userData?.canAccessReturnSystem === true && (
                <MenuLink 
                  href="/returns"
                  icon={<Package className="h-5 w-5" />}
                  text={t('common.myReturns')}
                  isActive={location === "/returns"}
                />
              )}
              
              <div className="pt-3 mt-3 border-t border-gray-700">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('common.buildTemplates')}
                </div>
                
                <div className="ml-3 space-y-2">
                  <MenuLink 
                    href="/products"
                    icon={<Database className="h-5 w-5" />}
                    text={t('common.products')}
                    isActive={location === "/products"}
                  />
                  
                  <MenuLink 
                    href="/package-templates"
                    icon={<Box className="h-5 w-5" />}
                    text={t('common.packageTemplates')}
                    isActive={location === "/package-templates"}
                  />
                  
                  <MenuLink 
                    href="/recipients"
                    icon={<Users className="h-5 w-5" />}
                    text={t('common.recipients')}
                    isActive={location === "/recipients"}
                  />
                </div>
              </div>
              
              <div className="pt-3 mt-3 border-t border-gray-700">
                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('common.support')}
                </div>
                
                <div className="space-y-2">
                  <MenuLink 
                    href="/getting-started"
                    icon={<LifeBuoy className="h-5 w-5" />}
                    text={t('common.gettingStarted')}
                    isActive={location === "/getting-started"}
                  />
                  
                  <MenuLink 
                    href="/my-tickets"
                    icon={<TicketCheck className="h-5 w-5" />}
                    text={t('common.myTickets')}
                    isActive={location === "/my-tickets"}
                  />
                  
                  <MenuLink 
                    href="/support-ticket"
                    icon={<MessageSquare className="h-5 w-5" />}
                    text={t('common.createTicket')}
                    isActive={location === "/support-ticket"}
                  />
                </div>
              </div>
            </>
          )}
          
          {effectiveIsAdmin && (
            <div className="pt-3 mt-3 border-t border-gray-700">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('common.adminPanel')}
              </div>
              
              <div className="space-y-2">
                <MenuLink 
                  href="/dashboard"
                  icon={<Home className="h-5 w-5" />}
                  text={t('common.dashboard')}
                  isActive={location === "/dashboard"}
                />
                
                <MenuLink 
                  href="/admin-shipments"
                  icon={<Package className="h-5 w-5" />}
                  text={t('shipping.allShipments')}
                  isActive={location === "/admin-shipments"}
                />
                
                <MenuLink 
                  href="/admin-shipment-create"
                  icon={<Plus className="h-5 w-5" />}
                  text="Create Shipment"
                  isActive={location === "/admin-shipment-create"}
                />
                
                <MenuLink 
                  href="/manage-users"
                  icon={<Users className="h-5 w-5" />}
                  text={t('common.manageUsers')}
                  isActive={location === "/manage-users"}
                />
                
                <MenuLink 
                  href="/pending-approvals"
                  icon={<UserCheck className="h-5 w-5" />}
                  text={t('shipping.pendingApprovals')}
                  isActive={location === "/pending-approvals"}
                />
                
                <MenuLink 
                  href="/manage-pickups"
                  icon={<Truck className="h-5 w-5" />}
                  text={t('common.managePickups')}
                  isActive={location === "/manage-pickups"}
                />
                
                <MenuLink 
                  href="/admin-tickets"
                  icon={<TicketCheck className="h-5 w-5" />}
                  text={t('common.adminTickets', 'Manage Tickets')}
                  isActive={location === "/admin-tickets"}
                />
                
                <MenuLink 
                  href="/admin-tasks"
                  icon={<Tag className="h-5 w-5" />}
                  text="Manage Tasks"
                  isActive={location === "/admin-tasks"}
                />
                
                <MenuLink 
                  href="/announcements"
                  icon={<MessageSquare className="h-5 w-5" />}
                  text={t('common.announcements')}
                  isActive={location === "/announcements"}
                />
                
                <MenuLink 
                  href="/reports"
                  icon={<BarChart3 className="h-5 w-5" />}
                  text={t('common.reports')}
                  isActive={location === "/reports"}
                />
                
                <MenuLink 
                  href="/admin-cms"
                  icon={<FileText className="h-5 w-5" />}
                  text={t('common.cms')}
                  isActive={location === "/admin-cms"}
                />
                
                <MenuLink 
                  href="/email-campaigns"
                  icon={<Mail className="h-5 w-5" />}
                  text={t('common.emailCampaigns')}
                  isActive={location === "/email-campaigns"}
                />
                
                <MenuLink 
                  href="/admin-price-fetcher"
                  icon={<Calculator className="h-5 w-5" />}
                  text={t('common.priceFetcher')}
                  isActive={location === "/admin-price-fetcher"}
                />
                
                <MenuLink 
                  href="/manage-email-verification"
                  icon={<Shield className="h-5 w-5" />}
                  text={t('common.emailVerification')}
                  isActive={location === "/manage-email-verification"}
                />
                
                <MenuLink 
                  href="/admin-invoice-management"
                  icon={<Receipt className="h-5 w-5" />}
                  text={t('common.invoiceManagement')}
                  isActive={location === "/admin-invoice-management"}
                />
                
                <MenuLink 
                  href="/admin-billing-reminders"
                  icon={<Bell className="h-5 w-5" />}
                  text={t('common.billingReminders')}
                  isActive={location === "/admin-billing-reminders"}
                />
                
                <MenuLink 
                  href="/admin-refund-requests"
                  icon={<RefreshCw className="h-5 w-5" />}
                  text={t('common.refundRequests')}
                  isActive={location === "/admin-refund-requests"}
                />
                
                <MenuLink 
                  href="/returns"
                  icon={<Package className="h-5 w-5" />}
                  text={t('common.returnManagement', 'Return Management')}
                  isActive={location === "/returns"}
                />
                
                <MenuLink 
                  href="/admin-returns"
                  icon={<ArrowLeftRight className="h-5 w-5" />}
                  text={t('common.adminReturns')}
                  isActive={location === "/admin-returns"}
                />
                
                <MenuLink 
                  href="/warehouse-returns"
                  icon={<Warehouse className="h-5 w-5" />}
                  text={t('common.warehouseReturns')}
                  isActive={location === "/warehouse-returns"}
                />
                
                <MenuLink 
                  href="/returns-reports"
                  icon={<ChartBar className="h-5 w-5" />}
                  text={t('common.returnsReports')}
                  isActive={location === "/returns-reports"}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Logout button */}
        <div className="px-4 py-4 mt-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-white hover:bg-gray-700"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400" />
            {t('common.logout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileSideMenu;