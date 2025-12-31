import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

// Check if the application is running on a mobile device through Capacitor
export function useMobileDevice() {
  const [isMobile, setIsMobile] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'web'>('web');

  useEffect(() => {
    // Check if the app is running through Capacitor
    const isNative = Capacitor.isNativePlatform();
    setIsMobile(isNative);
    
    // Get the current platform
    if (isNative) {
      const nativePlatform = Capacitor.getPlatform();
      if (nativePlatform === 'ios' || nativePlatform === 'android') {
        setPlatform(nativePlatform);
      }
    }
  }, []);

  return {
    isMobile,
    platform,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isNative: isMobile,
    isWeb: !isMobile
  };
}