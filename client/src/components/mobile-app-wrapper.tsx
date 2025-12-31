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
  
  // Apply special styling for mobile
  if (isMobile) {
    return (
      <div className="mobile-app-container bg-background min-h-screen pt-[var(--safe-area-top)] pb-[var(--safe-area-bottom)]">
        {/* Mobile App Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
          <div className="flex h-14 items-center px-4">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold tracking-tight">MoogShip</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {mobileConfig.app.version}
                </span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main className="flex-1 p-4 overflow-auto">
          {children}
        </main>
        
        {/* Navigation Footer */}
        <footer className="sticky bottom-0 z-40 w-full border-t bg-background/80 backdrop-blur-sm">
          <Separator />
          <div className="flex h-16 items-center justify-around">
            <button className="flex flex-col items-center justify-center w-1/4">
              <span className="text-xs font-medium">Home</span>
            </button>
            <button className="flex flex-col items-center justify-center w-1/4">
              <span className="text-xs font-medium">Shipments</span>
            </button>
            <button className="flex flex-col items-center justify-center w-1/4">
              <span className="text-xs font-medium">Track</span>
            </button>
            <button className="flex flex-col items-center justify-center w-1/4">
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </footer>
      </div>
    );
  }
  
  // Default rendering for web
  return <>{children}</>;
}