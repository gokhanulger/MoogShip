import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import MobileNav from "./mobile-nav";
import MobileSideMenu from "./mobile-side-menu";
import moogshipLogo from "@/assets/moogship-logo.png.jpeg";
import { 
  Wallet, 
  Calculator, 
  Plus,
  Upload,
  PackageSearch,
  HelpCircle,
  Home,
  LogOut,
  MessageSquare,
  TicketCheck,
  Package,
  CheckCheck,
  Truck,
  Database,
  Box,
  Users,
  LifeBuoy,
  Globe,
  MessageCircle,
  Plus as PlusIcon, 
  Upload as UploadIcon,
  MapPin,
  DollarSign
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useOnboardingTour } from "@/hooks/use-onboarding-tour";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher, MiniLanguageSwitcher } from "@/components/language-switcher";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/queryClient";

interface LayoutProps {
  children: React.ReactNode;
  hideMobileActions?: boolean;
  user?: any;
}

export default function Layout({ children, hideMobileActions = false, user }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOfficePopoverOpen, setIsOfficePopoverOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { isExpanded } = useSidebar();
  
  // Check if user has system admin access - use role field to match Sidebar component logic
  const isAdmin = user?.role === "admin";
  
  // Handle logout - use proper auth context for cache clearing
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Set up the onboarding tour
  const { startTour } = useOnboardingTour();
  
  // Listen for custom events to start the tour
  useEffect(() => {
    const handleStartTour = () => {
      startTour();
    };
    
    // Add event listener
    document.addEventListener('start-onboarding-tour', handleStartTour);
    
    // Cleanup
    return () => {
      document.removeEventListener('start-onboarding-tour', handleStartTour);
    };
  }, [startTour]);

  // Handle scroll event to make quick actions sticky
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 100); // Make sticky after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);
  
  // Fetch user balance for display (non-admin users)
  const { data: balanceData } = useQuery({
    queryKey: ['/api/balance'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/balance'), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
    enabled: !isAdmin, // Only fetch for non-admin users
  });

  // Fetch daily gross revenue for admin users
  const { data: revenueData } = useQuery({
    queryKey: ['/api/analytics/daily-gross-revenue'],
    queryFn: async () => {
      const response = await fetch(getApiUrl('/api/analytics/daily-gross-revenue'), {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch daily gross revenue');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute for revenue data
    staleTime: 30000,
    enabled: isAdmin, // Only fetch for admin users
  });

  // More reliable admin check using revenue data existence (admin users get revenue data, regular users get balance data)
  const isActuallyAdmin = isAdmin || !!revenueData;


  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50/30 to-gray-50">
      {/* Sidebar for desktop */}
      <Sidebar />
      {/* Mobile header - Hamburger on left, logo on right */}
      <div className="md:hidden bg-blue-50/80 backdrop-blur-sm border-b border-blue-100/50 text-gray-700 fixed top-0 left-0 right-0 z-[1000] h-16">
        {/* Container for mobile shipping assistant at line 114:6 as requested */}
        <div 
          id="mobileAssistantContainer" 
          className="md:hidden fixed top-0 left-0 right-0 hidden">
        </div>
        
        <div className="flex items-center justify-between h-16 px-4 shadow-sm">
          {/* Mobile menu button - On the left side (more prominent) */}
          <button
            type="button"
            className="md:hidden rounded-md p-0.5 inline-flex items-center justify-center text-blue-600 hover:bg-blue-100 focus:outline-none transition-all duration-150 relative z-[10001]"
            onClick={() => {
              setMobileMenuOpen(!mobileMenuOpen);
            }}
          >
            <span className="sr-only">Open menu</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          
          {/* Mobile Daily Revenue / Balance Display */}
          <div className="flex items-center space-x-3">
            {/* Mobile Revenue/Balance */}
            <div className="flex items-center h-8 px-2 bg-white/90 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm">
              {isActuallyAdmin ? (
                <>
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <Link 
                    href="/reports" 
                    className="ml-1 text-sm font-medium hover:underline text-green-600"
                  >
                    {revenueData?.formattedDailyRevenue || '$0.00'}
                  </Link>
                </>
              ) : (
                <>
                  <Wallet className={`h-4 w-4 ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : 'text-primary'}`} />
                  <Link 
                    href="/my-balance" 
                    className={`ml-1 text-sm font-medium hover:underline ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : ''}`}
                  >
                    {balanceData?.formattedBalance || '$0.00'}
                  </Link>
                </>
              )}
            </div>
            
            {/* Logo on the right side */}
            <div className="flex-col items-end hidden md:flex">
              <h1 className="font-bold text-lg text-gray-700">MOOGSHIP</h1>
              <div className="h-1 w-8 bg-blue-400 rounded-full"></div>
            </div>
            <img 
              src={moogshipLogo} 
              alt="Moogship Logo" 
              className="h-12 w-12 object-contain bg-blue-50 rounded-xl" 
            />
          </div>
        </div>
        
        {/* Mobile menu using the new MobileSideMenu component - Positioned outside the header to avoid z-index context stacking */}
        
      </div>
      {/* Desktop Quick Actions - Always visible on desktop */}
      <div className={`${isScrolled ? 'fixed top-4' : 'absolute top-4'} right-8 hidden md:flex items-center space-x-3 z-[100] transition-all duration-300 ease-in-out ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-lg rounded-lg p-2' : ''}`}
           style={{ touchAction: 'auto', pointerEvents: 'auto' }}>
        {/* Language Switcher */}
        <LanguageSwitcher 
          variant="ghost" 
          className="h-9 text-primary bg-white/90 border border-primary/20 rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground cursor-pointer" 
        />
        
        {/* Interactive Tour Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-primary bg-white/90 border border-primary/20 rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground mr-2 cursor-pointer"
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                onClick={() => {
                  const tourEvent = new CustomEvent('start-onboarding-tour');
                  document.dispatchEvent(tourEvent);
                }}
              >
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only">Start Interactive Tour</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('navigation.tooltips.startInteractiveTour')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* WhatsApp Support Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-green-600 bg-white/90 border border-green-200 rounded-md shadow-sm hover:bg-green-600 hover:text-white cursor-pointer"
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                onClick={() => {
                  const phoneNumber = "905407447911";
                  const username = user?.name || "Müşteri";
                  const message = `Merhaba, ben ${username}. Kargo hakkinda yardima ihtiyacim var.`;
                  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                  window.open(whatsappUrl, '_blank');
                }}
              >
                <SiWhatsapp className="h-5 w-5" />
                <span className="sr-only">WhatsApp Support</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('navigation.tooltips.whatsappSupport', 'WhatsApp Support')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Instagram Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-white bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 border border-pink-200 rounded-md shadow-sm hover:shadow-lg hover:scale-105 cursor-pointer"
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                onClick={() => {
                  window.open('https://www.instagram.com/moogship/', '_blank');
                }}
              >
                <SiInstagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Instagram</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Office Location Button */}
        <Popover open={isOfficePopoverOpen} onOpenChange={setIsOfficePopoverOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-blue-500 bg-white/90 border border-blue-200 rounded-md shadow-sm hover:bg-blue-500 hover:text-white cursor-pointer"
              style={{ touchAction: 'auto', pointerEvents: 'auto' }}
            >
              <MapPin className="h-5 w-5" />
              <span className="sr-only">Office Locations</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            side="bottom" 
            align="end" 
            className="w-80 p-4 bg-white shadow-lg border border-gray-200 rounded-lg"
            sideOffset={10}
          >
            <div className="space-y-4">
              <div className="text-sm font-semibold text-gray-800 border-b border-gray-200 pb-2">Our Offices</div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <span className="text-lg mr-2">🇺🇸</span>
                    United States
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 ml-6">
                    <div>6825 176th Ave NE Ste 135</div>
                    <div>Redmond, WA 98052</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <span className="text-lg mr-2">🇹🇷</span>
                    Türkiye
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 ml-6">
                    <div>HALİL RIFAT PAŞA MAH. YÜZER HAVUZ SK.</div>
                    <div>PERPA TİC MER B BLOK NO: 1/1 İÇ KAPI NO: 159</div>
                    <div>İstanbul, Türkiye 34384</div>
                    <div className="text-blue-600 hover:text-blue-800 cursor-pointer">+90 (850) 304 7538</div>
                    <div className="text-blue-600 hover:text-blue-800 cursor-pointer">
                      info@moogship.com
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Quick Actions */}
        <div 
          className="flex items-center h-9 bg-white/90 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm divide-x divide-primary/10"
          style={{ touchAction: 'auto', pointerEvents: 'auto' }}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-none rounded-l-md h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                >
                  <Link href="/shipment-create">
                    <PlusIcon className="h-5 w-5" />
                    <span className="sr-only">New Shipment</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.tooltips.createNewShipment')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-none h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                >
                  <Link href="/us-customs-calculator">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">US Customs Calculator Tool</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.tooltips.customsCalculator')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-none h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                >
                  <Link href="/price-calculator">
                    <Calculator className="h-5 w-5" />
                    <span className="sr-only">Calculate Price</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.tooltips.calculateShippingPrice')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-none h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                >
                  <Link href="/bulk-upload">
                    <UploadIcon className="h-5 w-5" />
                    <span className="sr-only">Bulk Upload</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.tooltips.uploadMultipleShipments')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  asChild 
                  className="rounded-none rounded-r-md h-9 w-9 text-primary hover:text-primary-foreground hover:bg-primary cursor-pointer"
                  style={{ touchAction: 'auto', pointerEvents: 'auto' }}
                >
                  <Link href="/approved-shipments">
                    <PackageSearch className="h-5 w-5" />
                    <span className="sr-only">Track Shipments</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{t('navigation.tooltips.trackExistingShipments')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Account Balance / Gross Revenue */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center h-9 px-2 bg-white/90 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm cursor-pointer"
                style={{ touchAction: 'auto', pointerEvents: 'auto' }}>
                {isActuallyAdmin ? (
                  <>
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <Link 
                      href="/reports" 
                      className="ml-2 font-medium hover:underline text-green-600"
                    >
                      {revenueData?.formattedDailyRevenue || '$0.00'}
                    </Link>
                  </>
                ) : (
                  <>
                    <Wallet className={`h-5 w-5 ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : 'text-primary'}`} />
                    <Link 
                      href="/my-balance" 
                      className={`ml-2 font-medium hover:underline ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : ''}`}
                    >
                      {balanceData?.formattedBalance || '$0.00'}
                    </Link>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isActuallyAdmin ? 'View Daily Revenue Analytics' : t('navigation.tooltips.viewBalanceDetails')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      {/* Main content - ensure it doesn't interfere with clickable elements */}
      <main className={`flex-1 ${isExpanded ? 'md:ml-64' : 'md:ml-20'} overflow-y-auto pb-24 md:pb-0 px-0 md:px-8 pt-20 md:pt-6 relative z-[5] md:z-auto transition-all duration-300 ease-in-out`}>
        
        <div 
          className="max-w-7xl mx-auto pt-0 md:pt-14 mt-0 md:mt-0 relative z-[5]" 
          style={{ pointerEvents: 'auto' }} 
          aria-label={t('layout.mainContentArea')}>
          {/* Mobile Quick Actions and Balance Display - Only show on main dashboard */}
          {!hideMobileActions && location === "/" && (
            <div className="md:hidden flex items-center justify-between mb-4">
              {/* Quick Actions for Mobile */}
              <div className="flex items-center h-8 bg-white/90 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm divide-x divide-primary/10">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild 
                        className="rounded-none rounded-l-md h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Link href="/shipment-create">
                          <PlusIcon className="h-4 w-4" />
                          <span className="sr-only">New Shipment</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('navigation.tooltips.createNewShipment')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild 
                        className="rounded-none h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Link href="/us-customs-calculator">
                          <Globe className="h-4 w-4" />
                          <span className="sr-only">US Customs Calculator Tool</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('navigation.tooltips.customsCalculator')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild 
                        className="rounded-none h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Link href="/price-calculator">
                          <Calculator className="h-4 w-4" />
                          <span className="sr-only">Calculate Price</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('navigation.tooltips.calculateShippingPrice')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild 
                        className="rounded-none h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Link href="/bulk-upload">
                          <UploadIcon className="h-4 w-4" />
                          <span className="sr-only">Bulk Upload</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('navigation.tooltips.uploadMultipleShipments')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild 
                        className="rounded-none rounded-r-md h-8 w-8 text-primary hover:text-primary-foreground hover:bg-primary"
                      >
                        <Link href="/approved-shipments">
                          <PackageSearch className="h-4 w-4" />
                          <span className="sr-only">Track Shipments</span>
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('navigation.tooltips.trackExistingShipments')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              {/* Mobile Language Switcher */}
              <MiniLanguageSwitcher className="h-8 w-8 text-primary bg-white/90 border border-primary/20 rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground" />
              
              {/* Mobile Version of Interactive Tour Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary bg-white/90 border border-primary/20 rounded-md shadow-sm hover:bg-primary hover:text-primary-foreground mr-2"
                      onClick={() => {
                        // Dispatch event to start tour
                        const tourEvent = new CustomEvent('start-onboarding-tour');
                        document.dispatchEvent(tourEvent);
                      }}
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span className="sr-only">Start Interactive Tour</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>{t('navigation.tooltips.startInteractiveTour')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {/* Account Balance / Daily Revenue Display (Mobile) */}
              <div className="flex items-center h-8 px-2 bg-white/90 backdrop-blur-sm border border-primary/20 rounded-md shadow-sm">
                {isActuallyAdmin ? (
                  <>
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <Link 
                      href="/reports" 
                      className="ml-2 text-sm font-medium hover:underline text-green-600"
                    >
                      {revenueData?.formattedDailyRevenue || '$0.00'}
                    </Link>
                  </>
                ) : (
                  <>
                    <Wallet className={`h-4 w-4 ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : 'text-primary'}`} />
                    <Link 
                      href="/my-balance" 
                      className={`ml-2 text-sm font-medium hover:underline ${balanceData && balanceData.balance > 0 ? 'text-green-600' : balanceData && balanceData.balance < 0 ? 'text-red-600' : ''}`}
                    >
                      {balanceData?.formattedBalance || '$0.00'}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Page content */}
          {children}
        </div>
      </main>
      {/* Mobile navigation at the bottom */}
      <MobileNav isBottomNav={true} isAdmin={isAdmin} />
      {/* Mobile menu rendered at the root level to avoid z-index context stacking issues */}
      <MobileSideMenu 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
        isAdmin={isAdmin}
      />
    </div>
  );
}