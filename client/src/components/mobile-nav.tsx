import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl, getAuthHeaders } from "@/lib/queryClient";
import {
  Home,
  Package,
  Plus,
  User,
  Clipboard,
  Users,
  LogOut,
  BellRing,
  MessageSquare,
  TicketCheck,
  Upload,
  Wallet,
  FileText,
  Truck,
  Calculator,
  UserCheck,
  BarChart3,
  Mail,
  Shield,
  Receipt,
  Bell,
  RefreshCw,
  ArrowLeftRight,
  Warehouse,
  ChartBar,
  Tag
} from "lucide-react";

interface MobileNavProps {
  isBottomNav?: boolean;
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
}

export default function MobileNav({ isBottomNav = false, open, isOpen, onClose, isAdmin = false }: MobileNavProps) {
  // Unified props handling - support both naming conventions
  const isMenuOpen = open || isOpen || false;
  
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  
  // Use a direct query for admin status instead of relying on props
  const [adminStatus, setAdminStatus] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Function to check admin status
    async function checkAdmin() {
      try {
        // Fetch user data directly from API
        const response = await fetch(getApiUrl('/api/user'), {
          credentials: 'include',
          headers: getAuthHeaders()
        });

        if (response.ok) {
          const userData = await response.json();
          // Check if user has admin role
          const isUserAdmin = userData && userData.role === "admin";
          setAdminStatus(isUserAdmin);

        } else {
          setAdminStatus(false);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setAdminStatus(false);
      }
    }

    // Only run the check once when the component mounts
    checkAdmin();
  }, []);
  
  // Always use the fetched status for security reasons
  const effectiveIsAdmin = adminStatus === true;
  

  
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // If bottom navigation, show different layout
  if (isBottomNav) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t z-[10]">
        <div className="flex justify-around items-center">
          <Link href="/dashboard">
            <div className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
              location === "/dashboard" ? "text-blue-600" : "text-gray-500"
            }`}>
              <Home className="h-6 w-6" />
              <span className="text-xs mt-1">Ana Sayfa</span>
            </div>
          </Link>
          
          {/* Show different shipment link for admin users */}
          {effectiveIsAdmin ? (
            <Link href="/admin-shipments">
              <div className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                location === "/admin-shipments" ? "text-blue-600" : "text-gray-500"
              }`}>
                <Package className="h-6 w-6" />
                <span className="text-xs mt-1">Tüm Gönderiler</span>
              </div>
            </Link>
          ) : (
            <Link href="/shipment-list">
              <div className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                location === "/shipment-list" ? "text-blue-600" : "text-gray-500"
              }`}>
                <Package className="h-6 w-6" />
                <span className="text-xs mt-1">Gönderiler</span>
              </div>
            </Link>
          )}
          
          {!effectiveIsAdmin ? (
            <>
              <Link href="/shipment-create">
                <div className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                  location === "/shipment-create" ? "text-blue-600" : "text-gray-500"
                }`}>
                  <Plus className="h-6 w-6" />
                  <span className="text-xs mt-1">Oluştur</span>
                </div>
              </Link>
              
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setLocation("/draft-shipments");
                }}
                className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                  location === "/draft-shipments" || location === "/draft-shipments-mobile" ? "text-blue-600" : "text-gray-500"
                }`} 
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              >
                <FileText className="h-6 w-6" />
                <span className="text-xs mt-1">Taslaklar</span>
              </div>
            </>
          ) : (
            <>
              <Link href="/manage-users">
                <div className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                  location === "/manage-users" ? "text-blue-600" : "text-gray-500"
                }`}>
                  <Users className="h-6 w-6" />
                  <span className="text-xs mt-1">{t('common.manageUsers')}</span>
                </div>
              </Link>
            </>
          )}
          
          {/* Show different ticket links for admin users */}
          {effectiveIsAdmin ? (
            <div className="flex space-x-1">
              <Link href="/admin-tickets">
                <div className={`flex flex-col items-center py-2 px-1 cursor-pointer ${
                  location === "/admin-tickets" ? "text-blue-600" : "text-gray-500"
                }`}>
                  <TicketCheck className="h-5 w-5" />
                  <span className="text-xs mt-1">Talepler</span>
                </div>
              </Link>
              <Link href="/admin-tasks">
                <div className={`flex flex-col items-center py-2 px-1 cursor-pointer ${
                  location === "/admin-tasks" ? "text-blue-600" : "text-gray-500"
                }`} data-testid="mobile-nav-admin-tasks">
                  <Tag className="h-5 w-5" />
                  <span className="text-xs mt-1">Görevler</span>
                </div>
              </Link>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                window.location.href = "/my-tickets";
              }}
              className={`flex flex-col items-center py-2 px-3 cursor-pointer ${
                location === "/my-tickets" ? "text-blue-600" : "text-gray-500"
              }`}
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
            >
              <TicketCheck className="h-6 w-6" />
              <span className="text-xs mt-1">Talepler</span>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center py-2 px-3 text-gray-500"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs mt-1">{t('common.logout')}</span>
          </button>
        </div>
      </div>
    );
  }
  
  // For slide out menu, don't render anything if not open
  if (!isMenuOpen) {
    return null;
  }
  
  // Render the slide-out menu
  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      {/* Side menu panel */}
      <div className="relative w-80 max-w-[85%] bg-gray-800 flex flex-col h-full overflow-y-auto shadow-xl">
        <div className="p-4">
          {/* Header with close button */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-xl font-bold text-white">Menü</div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Navigation links */}
          <div className="space-y-1">
            <Link href="/dashboard">
              <div className={`${
                location === "/dashboard" ? "bg-gray-900" : ""
              } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                <div className="flex items-center">
                  <Home className="mr-3 h-5 w-5 text-blue-400" />
                  Kontrol Paneli
                </div>
              </div>
            </Link>
            
            {/* Only show user navigation for non-admins */}
            {!effectiveIsAdmin ? (
              <>
                <Link href="/shipment-list">
                  <div className={`${
                    location === "/shipment-list" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Package className="mr-3 h-5 w-5 text-blue-400" />
                      Gönderilerim
                    </div>
                  </div>
                </Link>
                
                <Link href="/shipment-create">
                  <div className={`${
                    location === "/shipment-create" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Plus className="mr-3 h-5 w-5 text-blue-400" />
                      Yeni Gönderi
                    </div>
                  </div>
                </Link>
                
                <div 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLocation("/draft-shipments");
                    if (onClose) onClose();
                  }}
                  className={`${
                    location === "/draft-shipments" || location === "/draft-shipments-mobile" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}>
                    <div className="flex items-center">
                      <FileText className="mr-3 h-5 w-5 text-blue-400" />
                      Taslak Gönderiler
                    </div>
                  </div>
                
                <Link href="/bulk-upload">
                  <div className={`${
                    location === "/bulk-upload" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Upload className="mr-3 h-5 w-5 text-blue-400" />
                      Toplu Yükleme
                    </div>
                  </div>
                </Link>
                
                <Link href="/my-balance">
                  <div className={`${
                    location === "/my-balance" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Wallet className="mr-3 h-5 w-5 text-blue-400" />
                      Bakiyem
                    </div>
                  </div>
                </Link>
              </>
            ) : (
              // Admin-specific links for the slide-out menu
              <>
                <Link href="/admin-shipments">
                  <div className={`${
                    location === "/admin-shipments" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Package className="mr-3 h-5 w-5 text-blue-400" />
                      Tüm Gönderiler
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-users">
                  <div className={`${
                    location === "/manage-users" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Users className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.manageUsers')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/pending-approvals">
                  <div className={`${
                    location === "/pending-approvals" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <UserCheck className="mr-3 h-5 w-5 text-blue-400" />
                      Onay Bekleyen Gönderiler
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-pickups">
                  <div className={`${
                    location === "/manage-pickups" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Truck className="mr-3 h-5 w-5 text-blue-400" />
                      {t('shipping.managePickups')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-tickets">
                  <div className={`${
                    location === "/admin-tickets" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <TicketCheck className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.adminTickets')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-tasks">
                  <div className={`${
                    location === "/admin-tasks" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`} data-testid="mobile-menu-admin-tasks">
                    <div className="flex items-center">
                      <Tag className="mr-3 h-5 w-5 text-blue-400" />
                      Manage Tasks
                    </div>
                  </div>
                </Link>
                
                <Link href="/announcements">
                  <div className={`${
                    location === "/announcements" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <MessageSquare className="mr-3 h-5 w-5 text-blue-400" />
                      Duyurular
                    </div>
                  </div>
                </Link>
                
                <Link href="/reports">
                  <div className={`${
                    location === "/reports" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <BarChart3 className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.reports')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-cms">
                  <div className={`${
                    location === "/admin-cms" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <FileText className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.cms')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/email-campaigns">
                  <div className={`${
                    location === "/email-campaigns" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Mail className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.emailCampaigns')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-price-fetcher">
                  <div className={`${
                    location === "/admin-price-fetcher" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Calculator className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.priceFetcher')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-email-verification">
                  <div className={`${
                    location === "/manage-email-verification" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Shield className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.emailVerification')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-invoice-management">
                  <div className={`${
                    location === "/admin-invoice-management" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Receipt className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.invoiceManagement')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-billing-reminders">
                  <div className={`${
                    location === "/admin-billing-reminders" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Bell className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.billingReminders')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-refund-requests">
                  <div className={`${
                    location === "/admin-refund-requests" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <RefreshCw className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.refundRequests')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-returns">
                  <div className={`${
                    location === "/admin-returns" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <ArrowLeftRight className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.adminReturns')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/warehouse-returns">
                  <div className={`${
                    location === "/warehouse-returns" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Warehouse className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.warehouseReturns')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/returns-reports">
                  <div className={`${
                    location === "/returns-reports" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <ChartBar className="mr-3 h-5 w-5 text-blue-400" />
                      {t('common.returnsReports')}
                    </div>
                  </div>
                </Link>
              </>
            )}
          </div>
          
          {/* Support Section */}
          <div className="pt-4 mt-4 border-t border-gray-600">
            <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {t('common.support')}
            </h3>
            
            <div className="space-y-1">
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  window.location.href = "/my-tickets";
                  if (onClose) onClose();
                }}
                className={`${
                  location === "/my-tickets" ? "bg-gray-900" : ""
                } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
              >
                <div className="flex items-center">
                  <TicketCheck className="mr-3 h-5 w-5 text-gray-400" />
                  Taleplerim
                </div>
              </div>
              
              <Link href="/support-ticket">
                <div className={`${
                  location === "/support-ticket" ? "bg-gray-900" : ""
                } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                  <div className="flex items-center">
                    <MessageSquare className="mr-3 h-5 w-5 text-gray-400" />
                    Talep Oluştur
                  </div>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Admin Section */}
          {effectiveIsAdmin && (
            <div className="pt-4 mt-4 border-t border-gray-600">
              <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {t('common.admin')}
              </h3>
              
              <div className="space-y-1">
                {/* Admin Shipments */}
                <Link href="/admin-shipments">
                  <div className={`${
                    location === "/admin-shipments" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Package className="mr-3 h-5 w-5 text-green-400" />
                      Tüm Gönderiler
                    </div>
                  </div>
                </Link>
                
                <Link href="/pending-approvals">
                  <div className={`${
                    location === "/pending-approvals" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Clipboard className="mr-3 h-5 w-5 text-green-400" />
                      Onay Bekleyen Gönderiler
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-users">
                  <div className={`${
                    location === "/manage-users" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Users className="mr-3 h-5 w-5 text-green-400" />
                      {t('common.manageUsers')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-pickups">
                  <div className={`${
                    location === "/manage-pickups" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Truck className="mr-3 h-5 w-5 text-green-400" />
                      {t('shipping.managePickups')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/announcements">
                  <div className={`${
                    location === "/announcements" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <BellRing className="mr-3 h-5 w-5 text-green-400" />
                      {t('common.announcements')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-tickets">
                  <div className={`${
                    location === "/admin-tickets" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <TicketCheck className="mr-3 h-5 w-5 text-gray-400" />
                      {t('common.adminTickets')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/manage-pickups">
                  <div className={`${
                    location === "/manage-pickups" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Package className="mr-3 h-5 w-5 text-green-400" />
                      {t('shipping.managePickups')}
                    </div>
                  </div>
                </Link>
                
                <Link href="/admin-price-fetcher">
                  <div className={`${
                    location === "/admin-price-fetcher" ? "bg-gray-900" : ""
                  } text-white hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium cursor-pointer`}>
                    <div className="flex items-center">
                      <Calculator className="mr-3 h-5 w-5 text-green-400" />
                      Price Fetcher
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <div className="pt-4 mt-4 border-t border-gray-600">
            <button 
              onClick={handleLogout}
              className="w-full text-left text-white hover:bg-gray-700 flex items-center px-3 py-2 rounded-md text-base font-medium"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-300" />
              Çıkış Yap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
