import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
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
  LogOut
} from 'lucide-react';

interface SimpleMobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  isAdmin?: boolean;
}

const SimpleMobileMenu = ({ isOpen, onClose, onLogout, isAdmin = false }: SimpleMobileMenuProps) => {
  const { t } = useTranslation();
  const [location] = useLocation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose}></div>
      
      {/* Menu panel */}
      <div className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm bg-gray-800 shadow-lg overflow-y-auto">
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
          <Link href="/dashboard">
            <div className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/dashboard" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Home className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.dashboard')}
            </div>
          </Link>
          
          <Link href="/shipment-list">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/shipment-list" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Package className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.myShipments')}
            </a>
          </Link>
          
          <Link href="/shipment-create">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/shipment-create" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Plus className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.newShipment')}
            </a>
          </Link>
          
          <Link href="/bulk-upload">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/bulk-upload" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Upload className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.bulkUpload')}
            </a>
          </Link>
          
          <Link href="/my-balance">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/my-balance" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Wallet className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.myBalance')}
            </a>
          </Link>
          
          <Link href="/approved-shipments">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/approved-shipments" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <CheckCheck className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.trackShipments')}
            </a>
          </Link>
          
          <Link href="/my-pickups">
            <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
              location === "/my-pickups" ? "bg-gray-900" : "hover:bg-gray-700"
            } text-white`}>
              <Truck className="mr-3 h-5 w-5 text-blue-400" />
              {t('common.myPickups')}
            </a>
          </Link>
          
          <div className="pt-3 mt-3 border-t border-gray-700">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('common.buildTemplates')}
            </div>
            
            <div className="ml-3 space-y-2">
              <Link href="/products">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/products" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <Database className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.products')}
                </a>
              </Link>
              
              <Link href="/package-templates">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/package-templates" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <Box className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.packageTemplates')}
                </a>
              </Link>
              
              <Link href="/recipients">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/recipients" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <Users className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.recipients')}
                </a>
              </Link>
            </div>
          </div>
          
          <div className="pt-3 mt-3 border-t border-gray-700">
            <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {t('common.support')}
            </div>
            
            <div className="space-y-2">
              <Link href="/getting-started">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/getting-started" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <LifeBuoy className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.gettingStarted')}
                </a>
              </Link>
              
              <Link href="/my-tickets">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/my-tickets" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <TicketCheck className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.myTickets')}
                </a>
              </Link>
              
              <Link href="/support-ticket">
                <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                  location === "/support-ticket" ? "bg-gray-900" : "hover:bg-gray-700"
                } text-white`}>
                  <MessageSquare className="mr-3 h-5 w-5 text-blue-400" />
                  {t('common.createTicket')}
                </a>
              </Link>
            </div>
          </div>
          
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-gray-700">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('common.adminPanel')}
              </div>
              
              <div className="space-y-2">
                <Link href="/admin-shipments">
                  <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    location === "/admin-shipments" ? "bg-gray-900" : "hover:bg-gray-700"
                  } text-white`}>
                    <Package className="mr-3 h-5 w-5 text-blue-400" />
                    {t('shipping.allShipments')}
                  </a>
                </Link>
                
                <Link href="/manage-users">
                  <a className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                    location === "/manage-users" ? "bg-gray-900" : "hover:bg-gray-700"
                  } text-white`}>
                    <Users className="mr-3 h-5 w-5 text-blue-400" />
                    {t('common.manageUsers')}
                  </a>
                </Link>
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

export default SimpleMobileMenu;