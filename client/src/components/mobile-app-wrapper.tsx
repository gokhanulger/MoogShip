import React, { useEffect, useState } from 'react';
import { useMobileDevice } from '../hooks/use-mobile-device';
import { mobileConfig } from '../mobile-config';
import { Separator } from "@/components/ui/separator";

interface MobileAppWrapperProps {
  children: React.ReactNode;
}

export function MobileAppWrapper({ children }: MobileAppWrapperProps) {
  const { isMobile, isIOS, platform } = useMobileDevice();
  const [statusBarHeight, setStatusBarHeight] = useState(44); // Default iOS status bar height
  
  // Add iOS-specific styling
  useEffect(() => {
    // When running in a mobile context, we need to adjust the padding
    // to account for the status bar and bottom safe area
    if (isIOS) {
      // This would typically be done using Capacitor plugins for status bar height
      // For now we'll use default iOS values
      document.documentElement.style.setProperty('--safe-area-top', `${statusBarHeight}px`);
      document.documentElement.style.setProperty('--safe-area-bottom', '34px');
    }
    
    // Add mobile-specific meta tags
    if (isMobile) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no';
      document.head.appendChild(meta);
    }
    
    return () => {
      // Cleanup if needed
      if (isIOS) {
        document.documentElement.style.removeProperty('--safe-area-top');
        document.documentElement.style.removeProperty('--safe-area-bottom');
      }
    };
  }, [isMobile, isIOS]);
  
  // For mobile, just render children without extra header/footer
  // The Layout component already has its own header
  return <>{children}</>;
}