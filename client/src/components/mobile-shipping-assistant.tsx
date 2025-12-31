import React, { useEffect, useRef } from 'react';
import { X, MessageCircle, Package, List, Map, Calculator, ArrowRight, Info } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

type MobileAssistantProps = {
  onClose: () => void;
};

const MobileShippingAssistant: React.FC<MobileAssistantProps> = ({ onClose }) => {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const containerRef = useRef<Element | null>(null);
  
  // Find the container element
  useEffect(() => {
    containerRef.current = document.getElementById('mobileAssistantContainer');
    
    // Make container visible when assistant is mounted
    if (containerRef.current) {
      containerRef.current.classList.remove('hidden');
    }
    
    // Clean up when component unmounts
    return () => {
      if (containerRef.current) {
        containerRef.current.classList.add('hidden');
      }
    };
  }, []);
  
  const handleNavigation = (path: string) => {
    setLocation(path);
    onClose();
  };
  
  // If no container yet, don't render
  if (!containerRef.current) return null;
  
  // Use portal to render inside the container in layout.tsx
  return createPortal(
    <div 
      className="absolute inset-0 mobile-shipping-assistant" 
      onClick={(e) => e.stopPropagation()}
      style={{
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {/* Semi-transparent overlay */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        style={{ touchAction: 'auto', pointerEvents: 'auto' }}
      ></div>
      
      {/* Assistant panel */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-xl border-t border-x border-gray-200 overflow-hidden"
        style={{ touchAction: 'auto', pointerEvents: 'auto' }}
      >
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
    </div>
  );
};

export default MobileShippingAssistant;