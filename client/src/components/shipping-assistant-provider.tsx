import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import DesktopShippingAssistant from './desktop-shipping-assistant';

// Define the type for our context
type AssistantContextType = 
  | 'welcome' 
  | 'idle' 
  | 'createShipment' 
  | 'addedPackage' 
  | 'completedForm' 
  | 'labelReady';

type ShippingAssistantContextType = {
  context: AssistantContextType;
  setContext: (context: AssistantContextType) => void;
  isMinimized: boolean;
  setIsMinimized: (isMinimized: boolean) => void;
  triggerEvent: (event: string) => void;
};

// Create the context
const ShippingAssistantContext = createContext<ShippingAssistantContextType | null>(null);

// Custom hook to use the context
export const useShippingAssistant = () => {
  const context = useContext(ShippingAssistantContext);
  
  // Return a default context if not available - this makes the hook more resilient
  if (!context) {
    // Instead of throwing an error, return a default implementation that works without context
    return {
      context: 'welcome' as AssistantContextType,
      setContext: () => console.log("Shipping assistant context not available"),
      isMinimized: false,
      setIsMinimized: () => console.log("Shipping assistant context not available"),
      triggerEvent: () => console.log("Shipping assistant context not available")
    };
  }
  
  return context;
};

type ShippingAssistantProviderProps = {
  children: ReactNode;
};

export const ShippingAssistantProvider: React.FC<ShippingAssistantProviderProps> = ({ children }) => {
  const [context, setContext] = useState<AssistantContextType>('welcome');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [location, navigate] = useLocation();
  
  // Handle quick actions from the assistant
  const handleAssistantAction = (action: string) => {
    switch (action) {
      case 'new-shipment':
        navigate('/shipments/create');
        break;
      case 'my-shipments':
        navigate('/shipments/my');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };
  
  // Update context based on URL
  useEffect(() => {
    if (location.includes('/shipments/create')) {
      setContext('createShipment');
    } else if (location.includes('/shipments/edit')) {
      setContext('addedPackage');
    } else if (location === '/') {
      setContext('welcome');
    } else {
      setContext('idle');
    }
  }, [location]);
  
  // Function to trigger events in the assistant
  const triggerEvent = (event: string) => {
    switch (event) {
      case 'packageAdded':
        setContext('addedPackage');
        break;
      case 'formCompleted':
        setContext('completedForm');
        break;
      case 'labelReady':
        setContext('labelReady');
        break;
      default:
        // Ignore unknown events
        break;
    }
  };
  
  
  return (
    <ShippingAssistantContext.Provider 
      value={{ 
        context, 
        setContext, 
        isMinimized, 
        setIsMinimized,
        triggerEvent
      }}
    >
      {children}
    </ShippingAssistantContext.Provider>
  );
};

export default ShippingAssistantProvider;