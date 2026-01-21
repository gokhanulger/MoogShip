// API configuration for mobile and web environments
import { mobileConfig } from '../mobile-config';

// Detect if we're running in a mobile environment
export const isMobileEnvironment = () => {
  // Check if we're running in Capacitor
  return window.location.protocol === 'capacitor:' || 
         window.location.protocol === 'ionic:' ||
         // Also check for iOS webkit
         (window as any).webkit?.messageHandlers ||
         // Check for Android
         (window as any).Android ||
         // Check user agent for mobile (but exclude simulators)
         (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) && !window.location.hostname.includes('localhost'));
};

// Get the correct API base URL
export const getApiBaseUrl = () => {
  // Check if we're in iOS simulator (more comprehensive detection)
  const isSimulator = navigator.userAgent.includes('iPhone') || 
                     navigator.userAgent.includes('iPad') ||
                     window.location.hostname === 'localhost' ||
                     window.location.protocol === 'http:';
  
  if (isSimulator) {
    // For iOS simulator, always use the full production URL
    return 'https://app.moogship.com';
  }
  
  if (isMobileEnvironment()) {
    // For real mobile devices, use the current deployment URL
    return 'https://app.moogship.com';
  }
  
  // For web, use relative URLs (which work with the current server)
  return '';
};

// Enhanced fetch function that uses the correct base URL
export const apiFetch = async (url: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
 
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include',
    });
    
  
    return response;
  } catch (error) {
    console.error('❌ API Request Failed:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};