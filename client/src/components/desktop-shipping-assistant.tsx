import React from 'react';
import { X, MessageCircle, Package, List, Map, Calculator, ArrowRight, Info } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';

type DesktopAssistantProps = {
  onClose: () => void;
  isOpen: boolean;
};

const DesktopShippingAssistant: React.FC<DesktopAssistantProps> = ({ onClose, isOpen }) => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const handleNavigation = (path: string) => {
    setLocation(path);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed bottom-20 right-4 z-[110] w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
      <div className="bg-primary text-white p-3 flex justify-between items-center">
        <div className="flex items-center">
          <MessageCircle className="h-5 w-5 mr-2" />
          <h3 className="font-medium">{t('assistant.title', 'Shipping Assistant')}</h3>
        </div>
        <button
          onClick={onClose}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-primary-foreground/10"
          aria-label={t('common.close', 'Close')}
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>
      
      <div className="p-4">
        <div className="bg-muted/40 p-3 rounded-lg mb-4">
          <p className="text-sm">
            {user ? t('assistant.greeting', 'Hi {{name}}!', { name: user.name || user.username }) : ''}
            {' '}{t('assistant.welcome', 'Welcome back! Let\'s make shipping simple.')}
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button 
            onClick={() => handleNavigation('/shipment-create')}
            size="sm"
            className="h-12"
          >
            <Package className="mr-2 h-4 w-4" />
            {t('assistant.actions.newShipment', 'New Shipment')}
          </Button>
          
          <Button 
            onClick={() => handleNavigation('/shipment-list')}
            size="sm"
            variant="outline"
            className="h-12"
          >
            <List className="mr-2 h-4 w-4" />
            {t('assistant.actions.myShipments', 'My Shipments')}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button 
            onClick={() => handleNavigation('/track-package')}
            size="sm"
            variant="outline"
            className="h-12"
          >
            <Map className="mr-2 h-4 w-4" />
            {t('assistant.actions.trackPackage', 'Track Package')}
          </Button>
          
          <Button 
            onClick={() => handleNavigation('/price-calculator')}
            size="sm"
            variant="outline"
            className="h-12"
          >
            <Calculator className="mr-2 h-4 w-4" />
            {t('assistant.actions.priceCalculator', 'Price Calculator')}
          </Button>
        </div>
        
        <div className="mb-3 bg-muted/30 rounded-lg p-2 text-xs">
          <div className="font-medium mb-1 flex items-center">
            <Info className="h-3 w-3 mr-1" />
            <span>{t('assistant.quickHelp.title', 'Quick Help')}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex items-center text-muted-foreground">
              <span>{t('assistant.quickHelp.eu', 'EU: IOSS Required')}</span>
            </div>
            <div className="flex items-center text-muted-foreground">
              <span>{t('assistant.quickHelp.uk', 'UK: HMRC Required')}</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => handleNavigation('/recipients')}
          variant="ghost" 
          size="sm"
          className="w-full"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          {t('assistant.actions.seeAllOptions', 'See all options')}
        </Button>
      </div>
    </div>
  );
};

export default DesktopShippingAssistant;