import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import SidebarVideoLogo from "@/components/sidebar-video-logo";
import { AdminNotificationBell } from "@/components/admin-notification-bell";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/use-auth";
import {
  Home,
  Package,
  Plus,
  Upload,
  Clipboard,
  Users,
  LogOut,
  Wallet,
  Settings,
  CheckCheck,
  Truck,
  BellRing,
  Bell,
  MessageSquare,
  TicketCheck,
  Database,
  Box,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  LifeBuoy,
  Globe,
  FileText,
  Calculator,
  MapPin,
  BarChart3,
  DollarSign,
  Mail,
  Menu,
  X,
  AlertCircle,
  Tag,
  Sparkles,
  Store
} from "lucide-react";
import { SiInstagram, SiWhatsapp } from "react-icons/si";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getApiUrl, getAuthHeaders } from "@/lib/queryClient";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(
    location === "/products" || location === "/package-templates" || location === "/recipients"
  );
  const [isOfficePopoverOpen, setIsOfficePopoverOpen] = useState(false);
  const { isExpanded, setIsExpanded } = useSidebar();

  // Initialize translation hook
  const { t } = useTranslation();

  // Use auth context for user data - prevents double fetching
  const { user, isLoading, logoutMutation: authLogout } = useAuth();

  // Fetch user balance for display (only for non-admin users)
  const isAdmin = user?.role === "admin";
  const { data: balanceData } = useQuery({
    queryKey: ['/api/balance'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/balance'), {
        credentials: 'include',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      return response.json();
    },
    refetchInterval: 30000,
    staleTime: 10000,
    enabled: !!user && !isAdmin, // Only fetch for non-admin users
  });

  const logoutMutation = {
    mutate: () => {
      authLogout.mutate();
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Show loading state to prevent flash between user/admin sidebar and accidental clicks
  if (isLoading) {
    return (
      <aside 
        className={`app-sidenav flex flex-col fixed bg-white transition-all duration-300 ease-in-out shadow-lg hidden md:block ${
          isExpanded ? 'w-64' : 'w-20'
        }`}
        data-testid="nav-sidebar"
        onWheel={(e) => e.stopPropagation()}
        style={{ 
          top: 0,
          bottom: 0,
          left: 0,
          height: '100vh', 
          overflowY: 'hidden',
          zIndex: 1200,
          position: 'fixed'
        }}
      >
        <div 
          className="flex flex-col flex-grow bg-blue-50/80 pt-6 pb-4 overflow-y-auto shadow-sm border-r border-blue-200"
          style={{ 
            height: '100%',
            overscrollBehavior: 'contain',
            scrollbarWidth: 'thin'
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {/* Toggle Button Placeholder */}
          <div className="flex justify-end px-2 mb-4">
            <div className="h-8 w-8 bg-gray-200/50 rounded-full animate-pulse"></div>
          </div>
          
          {/* Loading Indicator */}
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </aside>
    );
  }
  
  return (
    <aside 
      className={`app-sidenav flex flex-col fixed bg-white transition-all duration-300 ease-in-out shadow-lg hidden md:block ${
        isExpanded ? 'w-64' : 'w-20'
      }`}
      data-testid="nav-sidebar"
      onWheel={(e) => e.stopPropagation()}
      style={{ 
        top: 0,
        bottom: 0,
        left: 0,
        height: '100vh', 
        overflowY: 'hidden',
        zIndex: 1200,
        position: 'fixed'
      }}
    >
      <div 
        className="flex flex-col flex-grow bg-blue-50/80 pt-2 pb-4 overflow-y-auto shadow-sm border-r border-blue-200"
        style={{ 
          height: '100%',
          overscrollBehavior: 'contain',
          scrollbarWidth: 'thin'
        }}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Toggle Button */}
        <div className="flex justify-end px-2 mb-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 text-gray-500 hover:text-blue-500 hover:bg-blue-50/80 rounded-full"
          >
            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Logo Section */}
        <div className={`flex flex-col items-center justify-center flex-shrink-0 py-2 transition-all duration-300 ${
          isExpanded ? 'px-4 mb-1' : 'px-1 mb-1'
        }`}>
          <div className={`p-0.5 bg-white rounded-lg shadow-sm transition-all duration-300 ${
            isExpanded ? '' : ''
          }`}>
            <SidebarVideoLogo isExpanded={isExpanded} />
          </div>
          {isExpanded && <div className="h-0.5 w-28 bg-blue-400 rounded-full mt-2"></div>}
        </div>
        
        <nav className="mt-2 flex-1 px-2 space-y-1">
          <button 
            onClick={() => setLocation("/dashboard")} 
            className={`w-full ${
              location === "/dashboard" 
                ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
            } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
            title={!isExpanded ? t('common.dashboard') : undefined}
          >
            <Home className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/dashboard" ? "text-blue-500" : "text-emerald-500 group-hover:text-emerald-400"}`} />
            {isExpanded && t('common.dashboard')}
          </button>
          
          {/* Admin Only Section */}
          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-blue-100/50">
              {isExpanded && (
                <div className="flex items-center justify-between px-3 mb-1">
                  <div className="flex items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-2"></div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('common.adminPanel')}</h3>
                  </div>
                  <AdminNotificationBell user={user} />
                </div>
              )}
              {!isExpanded && (
                <div className="flex justify-center px-1 mb-1">
                  <AdminNotificationBell user={user} />
                </div>
              )}
              <div className="mt-1 space-y-1">
                <Link 
                  href="/admin-shipment-create" 
                  className={`${
                    location === "/admin-shipment-create" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? "Create Shipment" : undefined}
                >
                  <Plus className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-shipment-create" ? "text-blue-500" : "text-green-500 group-hover:text-green-400"}`} />
                  {isExpanded && "Create Shipment"}
                </Link>
                
                <Link 
                  href="/admin-shipments" 
                  className={`${
                    location === "/admin-shipments" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('shipping.allShipments') : undefined}
                >
                  <Package className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-shipments" ? "text-blue-500" : "text-orange-500 group-hover:text-orange-400"}`} />
                  {isExpanded && t('shipping.allShipments')}
                </Link>

                {/* Pending Approvals link hidden as requested */}
                <Link href="/manage-users" className={`${
                    location === "/manage-users" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('common.manageUsers') : undefined}>
                  <Users className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/manage-users" ? "text-blue-500" : "text-purple-500 group-hover:text-purple-400"}`} />
                  {isExpanded && t('common.manageUsers')}
                </Link>
                <Link href="/announcements" className={`${
                    location === "/announcements" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('common.announcements') : undefined}>
                  <BellRing className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/announcements" ? "text-blue-500" : "text-yellow-500 group-hover:text-yellow-400"}`} />
                  {isExpanded && t('common.announcements')}
                </Link>
                <Link href="/admin-tickets" className={`${
                    location === "/admin-tickets" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('support.manageTickets') : undefined}>
                  <TicketCheck className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-tickets" ? "text-blue-500" : "text-rose-500 group-hover:text-rose-400"}`} />
                  {isExpanded && t('support.manageTickets')}
                </Link>

                <Link href="/admin-tasks" className={`${
                    location === "/admin-tasks" || location === "/admin/tasks"
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? "Manage Tasks" : undefined}
                  data-testid="link-admin-tasks">
                  <Tag className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-tasks" || location === "/admin/tasks" ? "text-blue-500" : "text-teal-500 group-hover:text-teal-400"}`} />
                  {isExpanded && "Manage Tasks"}
                </Link>
                
                <Link href="/manage-pickups" className={`${
                    location === "/manage-pickups" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('shipping.managePickups') : undefined}>
                  <Truck className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/manage-pickups" ? "text-blue-500" : "text-teal-500 group-hover:text-teal-400"}`} />
                  {isExpanded && t('shipping.managePickups')}
                </Link>
                
                <Link href="/admin-price-fetcher" className={`${
                    location === "/admin-price-fetcher" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Price Fetcher' : undefined}>
                  <Calculator className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-price-fetcher" ? "text-blue-500" : "text-indigo-500 group-hover:text-indigo-400"}`} />
                  {isExpanded && 'Price Fetcher'}
                </Link>
                
                <Link href="/admin-refund-requests" className={`${
                    location === "/admin-refund-requests" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('common.refundRequests') : undefined}>
                  <DollarSign className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-refund-requests" ? "text-blue-500" : "text-green-500 group-hover:text-green-400"}`} />
                  {isExpanded && t('common.refundRequests')}
                </Link>
                
                <Link href="/email-campaigns" className={`${
                    location === "/email-campaigns" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Email Campaigns' : undefined}>
                  <Mail className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/email-campaigns" ? "text-blue-500" : "text-red-500 group-hover:text-red-400"}`} />
                  {isExpanded && 'Email Campaigns'}
                </Link>
                
                <Link href="/admin-returns" className={`${
                    location === "/admin-returns" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('common.returnManagement') : undefined}>
                  <Package className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-returns" ? "text-blue-500" : "text-violet-500 group-hover:text-violet-400"}`} />
                  {isExpanded && t('common.returnManagement')}
                </Link>
                
                <Link href="/admin-invoice-management" className={`${
                    location === "/admin-invoice-management" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Invoice Management' : undefined}>
                  <FileText className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-invoice-management" ? "text-blue-500" : "text-cyan-500 group-hover:text-cyan-400"}`} />
                  {isExpanded && 'Invoice Management'}
                </Link>
                
                <Link href="/admin-billing-reminders" className={`${
                    location === "/admin-billing-reminders" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Billing Reminders' : undefined}>
                  <Bell className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-billing-reminders" ? "text-blue-500" : "text-amber-500 group-hover:text-amber-400"}`} />
                  {isExpanded && 'Billing Reminders'}
                </Link>
                
                <Link href="/undelivered-packages" className={`${
                    location === "/undelivered-packages" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Undelivered Packages' : undefined}>
                  <AlertCircle className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/undelivered-packages" ? "text-blue-500" : "text-red-500 group-hover:text-red-400"}`} />
                  {isExpanded && 'Undelivered Packages'}
                </Link>
                
                <Link href="/admin-tracking" className={`${
                    location === "/admin-tracking" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'Tracking Control' : undefined}>
                  <Settings className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-tracking" ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"}`} />
                  {isExpanded && 'Tracking Control'}
                </Link>

                <Link href="/admin-user-notification-preferences" className={`${
                    location === "/admin-user-notification-preferences" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? 'User Notifications' : undefined}
                  data-testid="link-admin-user-notification-preferences">
                  <Bell className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/admin-user-notification-preferences" ? "text-blue-500" : "text-purple-500 group-hover:text-purple-400"}`} />
                  {isExpanded && 'User Notifications'}
                </Link>
                

              </div>
            </div>
          )}
          
          {/* Only show regular user navigation items if not an admin */}
          {!isAdmin && (
            <>
              <Link 
                href="/shipment-list" 
                className={`${
                  location === "/shipment-list" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.myShipments') : undefined}
              >
                <Package className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/shipment-list" ? "text-blue-500" : "text-orange-500 group-hover:text-orange-400"}`} />
                {isExpanded && t('common.myShipments')}
              </Link>
              
              <Link 
                href="/shipment-create" 
                className={`${
                  location === "/shipment-create" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.newShipment') : undefined}
              >
                <Plus className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/shipment-create" ? "text-blue-500" : "text-green-500 group-hover:text-green-400"}`} />
                {isExpanded && t('common.newShipment')}
              </Link>
              
              <Link 
                href="/draft-shipments" 
                className={`${
                  location === "/draft-shipments" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.draftShipments') : undefined}
              >
                <FileText className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/draft-shipments" ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"}`} />
                {isExpanded && t('common.draftShipments')}
              </Link>
              
              <Link 
                href="/bulk-upload" 
                className={`${
                  location === "/bulk-upload" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.bulkUpload') : undefined}
              >
                <Upload className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/bulk-upload" ? "text-blue-500" : "text-purple-500 group-hover:text-purple-400"}`} />
                {isExpanded && t('common.bulkUpload')}
              </Link>
              
              <Link 
                href="/advisor" 
                className={`${
                  location === "/advisor" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? 'AI Danışman' : undefined}
                data-testid="link-advisor"
              >
                <Sparkles className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/advisor" ? "text-blue-500" : "text-indigo-500 group-hover:text-indigo-400"}`} />
                {isExpanded && 'AI Danışman'}
              </Link>
              
              <Link 
                href="/etsy-integration" 
                className={`${
                  location === "/etsy-integration" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? 'Etsy Integration' : undefined}
                data-testid="link-etsy-integration"
              >
                <Store className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/etsy-integration" ? "text-blue-500" : "text-orange-500 group-hover:text-orange-400"}`} />
                {isExpanded && 'Etsy Integration'}
              </Link>
              
              <Link href="/my-balance" className={`${
                  location === "/my-balance" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.myBalance') : undefined}>
                <Wallet className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${
                  location === "/my-balance" 
                    ? "text-blue-500" 
                    : balanceData && balanceData.balance > 0 
                      ? "text-green-600" 
                      : balanceData && balanceData.balance < 0 
                        ? "text-red-600" 
                        : "text-gray-500 group-hover:text-blue-400"
                }`} />
                {isExpanded && (
                  <div className="flex items-center">
                    <span>{t('common.myBalance')}</span>
                    {balanceData && (
                      <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                        balanceData.balance > 0 
                          ? "bg-green-100 text-green-800" 
                          : balanceData.balance < 0 
                            ? "bg-red-100 text-red-800" 
                            : "bg-gray-100 text-gray-800"
                      }`}>
                        {balanceData.formattedBalance}
                      </span>
                    )}
                  </div>
                )}
              </Link>
              
              <Link href="/notification-preferences" className={`${
                  location === "/notification-preferences" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? "Notification Preferences" : undefined}>
                <Bell className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/notification-preferences" ? "text-blue-500" : "text-gray-500 group-hover:text-blue-400"}`} />
                {isExpanded && "Notification Preferences"}
              </Link>

            </>
          )}
          
          {/* Only show approved shipments and pickups for non-admin users */}
          {!isAdmin && (
            <>
              <Link href="/approved-shipments" className={`${
                  location === "/approved-shipments" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.trackShipments') : undefined}>
                <CheckCheck className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/approved-shipments" ? "text-blue-500" : "text-teal-500 group-hover:text-teal-400"}`} />
                {isExpanded && t('common.trackShipments')}
              </Link>
              
              <Link href="/my-pickups" className={`${
                  location === "/my-pickups" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.myPickups') : undefined}>
                <Truck className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/my-pickups" ? "text-blue-500" : "text-amber-500 group-hover:text-amber-400"}`} />
                {isExpanded && t('common.myPickups')}
              </Link>
              
              {/* Only show returns link for users with return system access */}
              {user?.canAccessReturnSystem === true && (
                <Link href="/returns" className={`${
                    location === "/returns" 
                      ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                      : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                  } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                  title={!isExpanded ? t('common.myReturns') : undefined}>
                  <Package className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/returns" ? "text-blue-500" : "text-violet-500 group-hover:text-violet-400"}`} />
                  {isExpanded && t('common.myReturns')}
                </Link>
              )}
              
              {/* Refund Requests link for all users */}
              <Link href="/refund-requests" className={`${
                  location === "/refund-requests" 
                    ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                    : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
                title={!isExpanded ? t('common.refundRequests') : undefined}>
                <DollarSign className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/refund-requests" ? "text-blue-500" : "text-emerald-500 group-hover:text-emerald-400"}`} />
                {isExpanded && t('common.refundRequests')}
              </Link>
            </>
          )}
          
          {/* Product Management Section - Only for non-admin users */}
          {!isAdmin && (
            <div className="pt-4 mt-4 border-t border-blue-100/50">
              <button 
                className={`w-full group flex items-center ${isExpanded ? 'justify-between px-3' : 'justify-center px-1'} py-2 text-sm transition-all duration-150 ease-in-out
                  ${(location === "/products" || location === "/package-templates" || location === "/recipients") 
                    ? "text-blue-600 font-medium" 
                    : "text-gray-600 hover:text-blue-500"
                  }`}
                onClick={() => setIsProductMenuOpen(!isProductMenuOpen)}
                title={!isExpanded ? t('common.buildTemplates') : undefined}
              >
                <div className="flex items-center">
                  <Database className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${
                    (location === "/products" || location === "/package-templates" || location === "/recipients") 
                      ? "text-blue-500" 
                      : "text-indigo-500 group-hover:text-indigo-400"
                  }`} />
                  {isExpanded && <span>{t('common.buildTemplates')}</span>}
                </div>
                {isExpanded && (isProductMenuOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ))}
              </button>
              
              {isProductMenuOpen && isExpanded && (
                <div className="ml-4 mt-2 space-y-1 pl-2 border-l border-blue-100">
                  <Link href="/products" className={`${
                      location === "/products" 
                        ? "bg-blue-50/70 text-blue-600 font-medium border-l-2 border-blue-400 -ml-[2px]" 
                        : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                    } group flex items-center px-3 py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}>
                    <Database className={`mr-3 h-4 w-4 ${location === "/products" ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"}`} />
                    {t('common.products')}
                  </Link>
                  
                  <Link href="/package-templates" className={`${
                      location === "/package-templates" 
                        ? "bg-blue-50/70 text-blue-600 font-medium border-l-2 border-blue-400 -ml-[2px]" 
                        : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                    } group flex items-center px-3 py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}>
                    <Box className={`mr-3 h-4 w-4 ${location === "/package-templates" ? "text-blue-500" : "text-orange-500 group-hover:text-orange-400"}`} />
                    {t('common.packageTemplates')}
                  </Link>
                  
                  <Link href="/recipients" className={`${
                      location === "/recipients" 
                        ? "bg-blue-50/70 text-blue-600 font-medium border-l-2 border-blue-400 -ml-[2px]" 
                        : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
                    } group flex items-center px-3 py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}>
                    <Users className={`mr-3 h-4 w-4 ${location === "/recipients" ? "text-blue-500" : "text-purple-500 group-hover:text-purple-400"}`} />
                    {t('common.recipients')}
                  </Link>
                </div>
              )}
            </div>
          )}
          
          {/* Help section removed as it's now empty - Getting Started moved to Support section */}
          
          {/* Marketing Link - Only shown for admins */}
          {isAdmin && (
            <Link href="/marketing" className={`${
                location === "/marketing" 
                  ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                  : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
              } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
              title={!isExpanded ? t('common.marketingSite') : undefined}>
              <Globe className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/marketing" ? "text-blue-500" : "text-cyan-500 group-hover:text-cyan-400"}`} />
              {isExpanded && t('common.marketingSite')}
            </Link>
          )}
          
          {/* Support Ticket System */}
          <div className="pt-4 mt-4 border-t border-blue-100/50">
            {isExpanded && (
              <div className="flex items-center px-3 mb-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mr-2"></div>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{t('common.support')}</h3>
              </div>
            )}
            
            <Link href="/getting-started" className={`${
                location === "/getting-started" 
                  ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                  : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
              } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
              title={!isExpanded ? t('common.gettingStarted') : undefined}>
              <LifeBuoy className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/getting-started" ? "text-blue-500" : "text-rose-500 group-hover:text-rose-400"}`} />
              {isExpanded && t('common.gettingStarted')}
            </Link>
            
            <Link href="/my-tickets" className={`${
                location === "/my-tickets" 
                  ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                  : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
              } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
              title={!isExpanded ? t('support.tickets') : undefined}>
              <TicketCheck className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/my-tickets" ? "text-blue-500" : "text-yellow-500 group-hover:text-yellow-400"}`} />
              {isExpanded && t('support.tickets')}
            </Link>
            
            <Link href="/support-ticket" className={`${
                location === "/support-ticket" 
                  ? "bg-blue-50/70 text-blue-600 font-medium border-l-4 border-blue-400" 
                  : "text-gray-600 hover:bg-blue-50/40 hover:text-blue-500"
              } group flex items-center ${isExpanded ? 'px-3' : 'px-1 justify-center'} py-2 text-sm rounded-r-lg transition-all duration-150 ease-in-out`}
              title={!isExpanded ? t('support.newTicket') : undefined}>
              <MessageSquare className={`${isExpanded ? 'mr-3' : ''} h-5 w-5 ${location === "/support-ticket" ? "text-blue-500" : "text-teal-500 group-hover:text-teal-400"}`} />
              {isExpanded && t('support.newTicket')}
            </Link>
          </div>
          

        </nav>
        
        {/* Spacer */}
        <div className="mt-auto"></div>
        
        {/* User Menu */}
        <div className="px-3">
          {isLoading ? (
            <div className="flex items-center justify-center px-4 py-5 mt-4 bg-blue-50/60 rounded-lg border border-blue-100/70 shadow-sm">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : user ? (
            <div className={`flex items-center mt-4 bg-blue-50/60 rounded-lg border border-blue-100/70 shadow-sm ${
              isExpanded ? 'px-4 py-3' : 'px-2 py-2 justify-center'
            }`}>
              <div 
                className="flex-shrink-0 cursor-pointer"
                title={isExpanded ? undefined : `${user?.name}\n${user?.email}`}
              >
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center text-blue-500 font-medium border border-blue-300">
                  {user?.name?.slice(0, 2).toUpperCase() || "U"}
                </div>
              </div>
              {isExpanded && (
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`text-gray-500 hover:text-blue-500 hover:bg-blue-50/80 rounded-full h-8 w-8 ${
                  isExpanded ? 'ml-auto' : 'ml-2'
                }`}
                onClick={handleLogout}
                title={!isExpanded ? "Logout" : undefined}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className={`flex items-center justify-center mt-4 bg-blue-50/60 rounded-lg border border-blue-100/70 shadow-sm ${
              isExpanded ? 'px-4 py-4' : 'px-2 py-2'
            }`}>
              <Link href="/auth" className={`text-blue-500 hover:underline ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                {isExpanded ? (typeof t('auth.login', 'Login') === 'object' ? 'Login' : t('auth.login', 'Login')) : '→'}
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
