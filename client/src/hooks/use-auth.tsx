import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { queryClient, apiRequest, getApiUrl, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Enhanced auth persistence for mobile browsers
const AUTH_STORAGE_KEY = 'moogship_auth_user';
const SESSION_TIMESTAMP_KEY = 'moogship_session_timestamp';
const MOBILE_SESSION_KEY = 'moogship_mobile_session';

function saveUserToStorage(user: any) {
  if (user) {
    const timestamp = Date.now();
    const userData = {
      ...user,
      lastSeen: timestamp,
      sessionValid: true
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(SESSION_TIMESTAMP_KEY, timestamp.toString());
    
    // Additional mobile session tracking
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    if (isMobile) {
      localStorage.setItem(MOBILE_SESSION_KEY, JSON.stringify({
        userId: user.id,
        username: user.username,
        timestamp: timestamp,
        sessionId: user.sessionId || null
      }));
    }
  }
}

function clearUserFromStorage() {
  console.log('[STORAGE] AGGRESSIVE CLEAR: Clearing all authentication data from storage');
  
  // CRITICAL: Set a logout marker to invalidate any cached user data
  try {
    localStorage.setItem('moogship_logout_marker', Date.now().toString());
    sessionStorage.setItem('moogship_logout_marker', Date.now().toString());
  } catch (e) {
    console.error('Error setting logout marker:', e);
  }
  
  // Clear all known authentication storage keys
  const keysToRemove = [
    AUTH_STORAGE_KEY,
    SESSION_TIMESTAMP_KEY,
    MOBILE_SESSION_KEY,
    'moogship_auth_user',
    'moogship_session_timestamp',
    'moogship_mobile_session',
    'moogship_temp_user',
    'moogship_session_user',
    'mobile_safari_login_success',
    'mobile_safari_authenticated',
    'mobile_login_success',
    'mobile_login_failed',
    'mobile_login_error',
    'user',
    'auth_user',
    'session',
    'sessionId'
  ];
  
  // Remove all known keys from BOTH localStorage and sessionStorage
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error(`Error removing ${key}:`, e);
    }
  });
  
  // Clear any additional auth-related items that might exist with pattern matching
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('auth') || 
            lowerKey.includes('user') || 
            lowerKey.includes('session') ||
            lowerKey.includes('login') ||
            (lowerKey.includes('moogship') && !lowerKey.includes('logout_marker'))) {
          console.log(`[STORAGE] Removing additional auth key: ${key}`);
          try {
            localStorage.removeItem(key);
          } catch (e) {
            console.error(`Error removing localStorage key ${key}:`, e);
          }
        }
      });
    }
    
    // Also clear from sessionStorage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const allSessionKeys = Object.keys(sessionStorage);
      allSessionKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('auth') || 
            lowerKey.includes('user') || 
            lowerKey.includes('session') ||
            lowerKey.includes('login') ||
            (lowerKey.includes('moogship') && !lowerKey.includes('logout_marker'))) {
          console.log(`[STORAGE] Removing additional session key: ${key}`);
          try {
            sessionStorage.removeItem(key);
          } catch (e) {
            console.error(`Error removing sessionStorage key ${key}:`, e);
          }
        }
      });
    }
  } catch (error) {
    console.error('Error clearing additional storage:', error);
  }
  
  console.log('[STORAGE] All authentication data cleared from storage');
}

// Helper to clear Service Worker API cache
async function clearServiceWorkerCache(): Promise<void> {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('[SW] Requesting Service Worker to clear API cache');
      
      const messageChannel = new MessageChannel();
      
      const promise = new Promise<void>((resolve, reject) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.success) {
            console.log('[SW] Service Worker API cache cleared successfully');
            resolve();
          } else {
            console.error('[SW] Service Worker cache clear failed:', event.data.error);
            reject(new Error(event.data.error));
          }
        };
        
        setTimeout(() => {
          reject(new Error('Service Worker cache clear timeout'));
        }, 5000);
      });
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_API_CACHE' },
        [messageChannel.port2]
      );
      
      await promise;
    } else {
      console.log('[SW] Service Worker not available or not controlling page');
    }
  } catch (error) {
    console.error('[SW] Error clearing Service Worker cache:', error);
  }
}

function getUserFromStorage(): any {
  try {
    // CRITICAL: Check if user has logged out - if so, NEVER return cached user
    const logoutMarker = localStorage.getItem('moogship_logout_marker') || 
                        sessionStorage.getItem('moogship_logout_marker');
    
    if (logoutMarker) {
      const logoutTime = parseInt(logoutMarker);
      const now = Date.now();
      // If logout happened within last 10 minutes, don't use any cached data
      if (now - logoutTime < 10 * 60 * 1000) {
        console.log('[STORAGE] Recent logout detected - ignoring cached user data');
        return null;
      }
    }
    
    const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedUser) return null;
    
    const userData = JSON.parse(storedUser);
    
    // Check if session is still valid (within 7 days for mobile browsers)
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    if (isMobile && userData.lastSeen) {
      const now = Date.now();
      const sessionAge = now - userData.lastSeen;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (sessionAge > maxAge) {

        clearUserFromStorage();
        return null;
      }
      
      // Update last seen timestamp to keep session alive
      userData.lastSeen = now;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData));
    }
    
    return userData;
  } catch (e) {
    console.error('Failed to parse stored user data', e);
    return null;
  }
}

function getRecentMobileSafariUser(): any {
  try {
    // Check multiple storage locations for recent mobile Safari login
    const locations = [
      'moogship_temp_user',
      'moogship_auth_user', 
      'moogship_session_user'
    ];
    
    for (const location of locations) {
      const stored = localStorage.getItem(location);
      if (stored) {
        const userData = JSON.parse(stored);
        // Check if data exists and has required fields
        if (userData && userData.id && userData.username) {
          return userData;
        }
      }
    }
    
    // Also check sessionStorage
    const sessionStored = sessionStorage.getItem('moogship_session_user');
    if (sessionStored) {
      const userData = JSON.parse(sessionStored);
      if (userData && userData.id && userData.username) {
        return userData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing recent mobile Safari user from storage:', error);
    return null;
  }
}

type UserData = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  createdAt: string;
  
  // Address and company information (may be null/undefined)
  address?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  phone?: string;
  companyName?: string;
};

type AuthContextType = {
  user: UserData | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<UserData, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<UserData, Error, RegisterData>;
};

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = {
  username: string;
  password: string;
  name: string;
  email: string;
  companyName?: string;
  companyType?: string;
  taxIdNumber?: string;
  address?: string;
  shipmentCapacity?: string;
  // ...any other registration fields
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Initialize with stored user if available
  const [localUser, setLocalUser] = useState<UserData | null>(() => {
    const storedUser = getUserFromStorage();
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    
    if (isMobile && storedUser) {
      // Mobile user initialized from storage
    }
    
    return storedUser;
  });
  
  // Track consecutive 401s to implement soft-401 handling
  const [last401At, setLast401At] = useState<number | null>(null);
  const [confirmedUnauthorized, setConfirmedUnauthorized] = useState(false);
  
  // CRITICAL FIX: Track logout state to prevent soft-401 from resurrecting old user
  // Initialize from logout marker in storage (survives page refresh)
  const [hasLoggedOut, setHasLoggedOut] = useState(() => {
    try {
      const logoutMarker = localStorage.getItem('moogship_logout_marker') || 
                          sessionStorage.getItem('moogship_logout_marker');
      if (logoutMarker) {
        const logoutTime = parseInt(logoutMarker, 10);
        const timeSinceLogout = Date.now() - logoutTime;
        // Consider user logged out if logout happened within last 30 seconds
        // This prevents old user resurrection after page refresh
        return timeSinceLogout < 30000;
      }
      return false;
    } catch (e) {
      return false;
    }
  });
  
  // CRITICAL FIX: Track last login time to prevent immediate soft-401 resurrection
  const [lastLoginAt, setLastLoginAt] = useState<number | null>(null);
  
  // CRITICAL FIX: Store timeout ID for delayed refetch so it can be cancelled
  const delayedRefetchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup: Clear delayed refetch timeout on unmount
  useEffect(() => {
    return () => {
      if (delayedRefetchTimeoutRef.current) {
        clearTimeout(delayedRefetchTimeoutRef.current);
        delayedRefetchTimeoutRef.current = null;
      }
    };
  }, []);

  // Mobile session refresh mechanism
  useEffect(() => {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    
    if (!isMobile) return;

    const refreshMobileSession = () => {
      const currentUser = getUserFromStorage();
      if (currentUser) {
        // Update session timestamp to keep it alive
        saveUserToStorage(currentUser);

      }
    };

    // Refresh session every 5 minutes for mobile browsers
    const refreshInterval = setInterval(refreshMobileSession, 5 * 60 * 1000);
    
    // Also refresh on page focus (when user returns to the app)
    const handleFocus = () => {
      refreshMobileSession();
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handleFocus);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handleFocus);
    };
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<UserData | null, Error>({
    queryKey: ["/api/user"],
    enabled: true,
    queryFn: async () => {
      try {
        // Define isMobile at the beginning of the function scope
        const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
        
        //           queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        //         }).catch(() => {
        //           // Ignore JSON parsing errors
        //         });
        //       } else if (res.status === 401) {
        //         // Only clear if server explicitly says unauthorized
        //         console.log("[AUTH] Server session invalid, but keeping mobile session");
        //       }
        //     }).catch(() => {
        //       // Ignore network errors for mobile
        //       console.log("[AUTH] Background server validation failed, keeping mobile session");
        //     });
        //     
        //     return storedUser;
        //   }
        // }
        
        // For desktop or when no mobile session exists, try server validation
        // Add timestamp to force cache bypass for return system field updates
        const timestamp = Date.now();
        const res = await fetch(getApiUrl(`/api/user?t=${timestamp}`), {
          credentials: "include",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            ...getAuthHeaders()
          }
        });
        
        if (res.ok) {
          const userData = await res.json();

          saveUserToStorage(userData);
          return userData;
        }
        
        // Final fallback for mobile browsers
        if (isMobile && res.status === 401) {
          const storedUserData = getUserFromStorage();
          if (storedUserData) {

            return storedUserData;
          }
        }
        
        // Admin session restoration - only if server explicitly returned 401 and we have valid admin session
        // This helps prevent admin logout during page refreshes but is more restrictive
        if (res.status === 401 && localUser && localUser.role === 'admin') {
          const currentPath = window.location.pathname;
          
          // Only allow admin session restoration on actual admin pages
          const adminPaths = [
            '/admin-shipments',
            '/manage-users',
            '/announcements',
            '/manage-pickups', 
            '/admin-tickets',
            '/admin-cms',
            '/manage-email-verification',
            '/reports',
            '/admin/',
            '/shipments/all',
            '/all-shipments',
            '/users/all',
            '/carrier-accounts'
          ];
          
          const isAdminPage = adminPaths.some(path => currentPath.startsWith(path));
          
          // Only restore admin session if we're actually on an admin page AND
          // the cached user data is recent (less than 1 hour old)
          if (isAdminPage) {
            try {

              
              const refreshResponse = await fetch(getApiUrl("/api/refresh-admin-session"), {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                  ...getAuthHeaders()
                },
                body: JSON.stringify({ adminId: localUser.id })
              });
              
              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();

                
                if (refreshData.user) {
                  saveUserToStorage(refreshData.user);
                  return refreshData.user;
                }
              } else {

                clearUserFromStorage();
              }
            } catch (refreshError) {
              console.error("Admin session restoration error:", refreshError);
              clearUserFromStorage();
            }
          } else {
            // Not on admin page - fall back to soft-401 logic instead of clearing
            console.log('[AUTH] Admin not on admin page, using soft-401 logic');
            
            const now = Date.now();
            const isConsecutive401 = last401At && (now - last401At) < 10000;
            
            if (!isConsecutive401 && localUser) {
              setLast401At(now);
              setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              }, 2000);
              return localUser;
            } else {
              setConfirmedUnauthorized(true);
              clearUserFromStorage();
            }
          }
        }
        
        // Implement soft-401 handling to prevent transient errors from logging out users
        if (res.status === 401) {
          // CRITICAL FIX: If user has logged out, never resurrect old user data
          if (hasLoggedOut) {
            console.log('[AUTH] 401 after logout - clearing all data, no fallback to storage');
            setConfirmedUnauthorized(true);
            clearUserFromStorage();
            setLocalUser(null);
            return null;
          }
          
          // CRITICAL FIX: If we just logged in, NEVER use soft-401 fallback
          // Cookie might not be established yet - wait for proper fetch
          const now = Date.now();
          const timeSinceLogin = lastLoginAt ? now - lastLoginAt : Infinity;
          if (timeSinceLogin < 5000) { // Within 5 seconds of login
            console.log('[AUTH] 401 right after login - waiting for session establishment, returning null for retry');
            // DON'T set confirmedUnauthorized - just return null to let React Query retry
            return null;
          }
          
          const isConsecutive401 = last401At && (now - last401At) < 10000; // Within 10 seconds
          
          console.log(`[AUTH] 401 received, consecutive: ${isConsecutive401}, localUser exists: ${!!localUser}`);
          
          if (!isConsecutive401 && (localUser || getUserFromStorage())) {
            // First 401 with cached user - return cached data and schedule retry
            console.log('[AUTH] Soft-401: Using cached user data and scheduling retry');
            setLast401At(now);
            
            // Schedule a background retry
            setTimeout(() => {
              console.log('[AUTH] Background retry after soft-401');
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            }, 2000);
            
            return localUser || getUserFromStorage();
          } else {
            // Consecutive 401 or no cached user - confirmed unauthorized
            console.log('[AUTH] Confirmed unauthorized - clearing storage');
            setConfirmedUnauthorized(true);
            clearUserFromStorage();
            return null;
          }
        }
        
        // Clear 401 tracking on successful response
        setLast401At(null);
        setConfirmedUnauthorized(false);
        
        // Some other error
        const text = await res.text();
        console.error("Auth error:", res.status, text);
        return null;
      } catch (err) {
        console.error("Auth fetch error:", err);
        // If network error but we have stored user, return it
        return localUser || null;
      }
    },
    staleTime: 0, // CRITICAL FIX: Always consider data stale to prevent cached user data on login
    refetchOnWindowFocus: true, // Enable to catch user switches
    refetchOnMount: true, // Always refetch on mount to prevent stale user data
    refetchInterval: false, // No automatic polling
    refetchOnReconnect: true, // Refetch on reconnect to get fresh session
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection (reduced from 30)
    retry: 1, // Only retry once
    retryDelay: 2000 // Slower retry delay
  });
  
  // For mobile Safari or Capacitor, prioritize stored authentication data
  const effectiveUser = (() => {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();

    if ((isMobile && isSafari) || isCapacitorApp) {
      // CRITICAL FIX: Always check for stored authentication first for mobile Safari
      const loginSuccess = localStorage.getItem('mobile_safari_login_success');
      const storedUser = localStorage.getItem('moogship_auth_user');
      const sessionAuth = sessionStorage.getItem('mobile_safari_authenticated');
      
      // If we have a recent successful login, use that data
      if (loginSuccess === 'true' && storedUser) {
        try {
          const authUser = JSON.parse(storedUser);
          if (authUser && authUser.id && authUser.username) {

            return authUser;
          }
        } catch (e) {
          console.error("Error parsing stored auth user:", e);
        }
      }
      
      // Check session authenticated user
      if (sessionAuth) {
        try {
          const authUser = JSON.parse(sessionAuth);
          if (authUser && authUser.id && authUser.username) {

            return authUser;
          }
        } catch (e) {
          console.error("Error parsing session auth:", e);
        }
      }
      
      // Fallback to any stored user data
      if (localUser && localUser.id && localUser.username) {

        return localUser;
      }
      
      // Only use server user data if no stored data exists
      if (user && user.id && user.username) {

        return user;
      }
      

      return null;
    }
    
    return user || localUser;
  })();

  // Update local storage whenever user data changes from server
  useEffect(() => {
    if (user) {
      saveUserToStorage(user);
      setLocalUser(user);
    } else if (user === null && confirmedUnauthorized) {
      // Only clear storage when we're confirmed unauthorized, not on initial load or transient errors
      console.log('[AUTH] Clearing storage because confirmed unauthorized');
      clearUserFromStorage();
      setLocalUser(null);
    }
  }, [user, confirmedUnauthorized]);
  
  // Check if we need to redirect to auth page
  useEffect(() => {
    // For mobile Safari or Capacitor, if we have stored user data, never redirect to auth
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();

    if (((isMobile && isSafari) || isCapacitorApp) && effectiveUser) {
      return; // Don't redirect if we have a user in mobile Safari or Capacitor
    }
    
    // Only redirect if we're sure the user is not logged in (not during loading)
    // Don't redirect if user is already on the auth page or the marketing pages
    const currentPath = window.location.pathname;
    const isMarketingOrAuthPage = 
      currentPath === '/' || 
      currentPath === '/auth' || 
      currentPath === '/mobile-auth' || 
      currentPath === '/marketing' || 
      currentPath === '/forgot-password' ||
      currentPath === '/reset-password' ||
      currentPath.startsWith('/verify-email/') ||
      currentPath === '/verification-success' ||
      currentPath === '/verification-result' ||
      currentPath.startsWith('/company/') || 
      currentPath.startsWith('/services/') || 
      currentPath.startsWith('/legal/') ||
      currentPath === '/marketing-price-calculator' ||
      currentPath === '/hakkimizda' ||
      currentPath === '/ekibimiz' ||
      currentPath === '/kariyer' ||
      currentPath === '/kuresel-kargo' ||
      currentPath === '/takip' ||
      currentPath === '/destek';
      
    // Only redirect if confirmed unauthorized (not just effectiveUser === null)
    if (!isLoading && confirmedUnauthorized && effectiveUser === null && !isMarketingOrAuthPage) {
      console.log('[AUTH] Confirmed unauthorized - redirecting to auth');

      // Check if running in Capacitor native app
      const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();

      // For mobile browsers (but NOT Capacitor app), redirect to external mobile auth URL
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);

      if (isCapacitorApp) {
        // Capacitor app - redirect to mobile-auth
        setLocation('/mobile-auth');
      } else if (isMobile) {
        window.location.href = 'https://www.moogship.com/mobile-auth';
      } else {
        // Desktop - redirect to /auth
        setLocation('/auth');
      }
    }
  }, [effectiveUser, isLoading, setLocation]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("[AUTH] Starting login request...", { 
        username: credentials.username,
        userAgent: navigator.userAgent,
        platform: navigator.platform 
      });
      
      // STEP 1: CRITICAL - Clear ALL caches completely FIRST
      console.log("[AUTH] AGGRESSIVE CLEAR: Clearing React Query cache completely...");
      queryClient.clear(); // Most aggressive - clears everything
      
      // STEP 2: Clear ALL localStorage items except UI preferences
      console.log("[AUTH] Clearing all localStorage except preferences...");
      const keysToPreserve = ['moogship_theme', 'moogship_language'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // STEP 3: Clear ALL sessionStorage
      console.log("[AUTH] Clearing all sessionStorage...");
      sessionStorage.clear();
      
      // STEP 4: Clear all state
      console.log("[AUTH] Clearing all local state...");
      setLocalUser(null);
      setLast401At(null);
      setConfirmedUnauthorized(false);
      setLastLoginAt(null);
      clearUserFromStorage();
      
      // STEP 5: Clear service worker caches
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('user') || name.includes('api')) {
              caches.delete(name);
            }
          });
        });
      }
      
      // STEP 6: Force logout any existing server session
      try {
        console.log("[AUTH] Forcing logout of any existing server session...");
        await fetch(getApiUrl("/api/force-logout"), {
          method: "POST",
          credentials: "include",
          cache: "no-store"
        });
      } catch (logoutError) {
        console.warn("[AUTH] Force logout failed (continuing with login):", logoutError);
      }
      
      // STEP 7: Proceed with new login
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        },
        body: JSON.stringify(credentials),
        credentials: "include",
        cache: "no-store"
      };
      
      console.log("[AUTH] Making login request for new user...");
      const res = await fetch(getApiUrl("/api/login"), fetchOptions);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("[AUTH] Login failed with status:", res.status, errorText);
        throw new Error(errorText || "Login failed");
      }

      const userData = await res.json();
      console.log("[AUTH] Login successful for user:", userData.username);
      
      return userData;
    },
    onSuccess: async (user: UserData) => {
      console.log("[AUTH] Processing successful login for:", user.username);
      
      // CRITICAL FIX: Clear any pending delayed refetch from previous login
      if (delayedRefetchTimeoutRef.current) {
        clearTimeout(delayedRefetchTimeoutRef.current);
        delayedRefetchTimeoutRef.current = null;
      }
      
      // CRITICAL FIX: Track login time to prevent immediate soft-401
      const loginTime = Date.now();
      setLastLoginAt(loginTime);
      
      // CRITICAL FIX: Clear logout marker before saving new user
      // This allows getUserFromStorage() to return the new admin user instead of null
      console.log("[AUTH] Clearing logout marker to enable new session");
      localStorage.removeItem('moogship_logout_marker');
      sessionStorage.removeItem('moogship_logout_marker');
      
      // Store new user data FIRST
      saveUserToStorage(user);
      setLocalUser(user);
      
      // CRITICAL FIX: Reset logout flag AFTER saving new user
      // This ensures delayed refetch sees hasLoggedOut=false for the NEW session
      setHasLoggedOut(false);
      
      // CRITICAL FIX: Clear Service Worker API cache FIRST
      console.log("[AUTH] CRITICAL: Clearing Service Worker API cache");
      await clearServiceWorkerCache();
      
      // CRITICAL FIX: Clear ALL queries to prevent ANY old data from showing
      console.log("[AUTH] CRITICAL: Clearing ALL React Query cache to prevent old user data");
      queryClient.clear();
      
      // CRITICAL FIX: Directly set the NEW user data after clearing everything
      // This ensures only the new user's data is in the cache
      queryClient.setQueryData(["/api/user"], user);
      
      // Clear any 401 tracking from previous attempts
      setLast401At(null);
      setConfirmedUnauthorized(false);
      
      // CRITICAL: Immediately refetch ALL user-scoped data with the new session
      // This forces fresh data even with refetchOnMount: false settings
      console.log('[AUTH] LOGIN: Force refetching all user-scoped queries');
      const userScopedPrefixes = [
        '/api/balance',
        '/api/shipments',
        '/api/transactions',
        '/api/notifications',
        '/api/billing-reminders'
      ];
      
      userScopedPrefixes.forEach(prefix => {
        queryClient.refetchQueries({ 
          predicate: (query) => {
            const queryKey = query.queryKey[0] as string;
            return queryKey.startsWith(prefix);
          }
        });
      });
      
      // Schedule a delayed refetch to get complete user data once session is fully established
      // Store the timeout ID so it can be cancelled if user logs out before it fires
      const currentUserId = user.id;
      delayedRefetchTimeoutRef.current = setTimeout(() => {
        // Only refetch if the user is still the same (prevents refetch after logout/user switch)
        const currentLocalUser = getUserFromStorage();
        if (currentLocalUser && currentLocalUser.id === currentUserId) {
          console.log("[AUTH] Delayed refetch to ensure fresh user data");
          queryClient.refetchQueries({ queryKey: ["/api/user"], type: 'active' });
        } else {
          console.log("[AUTH] Skipping delayed refetch - user has changed or logged out");
        }
        delayedRefetchTimeoutRef.current = null;
      }, 500);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.name}!`,
      });
      
      // Redirect to dashboard after successful login
      if (window.location.pathname === '/auth') {
        setLocation('/dashboard');
      }
    },
    onError: (error: Error) => {
      console.error("[AUTH] Login failed:", error);
      
      // Ensure clean state on error
      clearUserFromStorage();
      setLocalUser(null);
      queryClient.setQueryData(["/api/user"], null);
      
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (response: any) => {
      // Check if we got a success message or a user object
      if (response.message) {
        // We received a success message but are awaiting approval
        toast({
          title: "Registration successful",
          description: response.message,
        });
        // If the user is not auto-approved, we don't set them in the query data
        if (response.user?.isApproved) {
          queryClient.setQueryData(["/api/user"], response.user);
        }
      } else {
        // We received a user object directly (old format)
        queryClient.setQueryData(["/api/user"], response);
        toast({
          title: "Registration successful",
          description: `Welcome to Moogship, ${response.name}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // CRITICAL FIX: Set logout flag BEFORE clearing anything
      // This prevents soft-401 from resurrecting old user data
      setHasLoggedOut(true);
      
      // CRITICAL FIX: Cancel any pending delayed refetch
      if (delayedRefetchTimeoutRef.current) {
        console.log('[AUTH] LOGOUT: Cancelling pending delayed refetch');
        clearTimeout(delayedRefetchTimeoutRef.current);
        delayedRefetchTimeoutRef.current = null;
      }
      
      console.log('[AUTH] LOGOUT: Starting aggressive logout process');
      
      // Even if the server logout fails, we'll still clear local state
      try {
        const res = await fetch(getApiUrl("/api/logout"), {
          method: "POST",
          credentials: "include",
          cache: "no-store"
        });
        
        if (!res.ok) {
          const errorText = await res.text();
          console.warn("Server logout issue:", errorText);
          // We don't throw here to ensure local logout still succeeds
        }
      } catch (err) {
        console.warn("Network error during logout:", err);
        // Again, we don't re-throw to ensure local logout still succeeds
      }
    },
    onSuccess: async () => {
      console.log('[AUTH] LOGOUT: Clearing all local state and caches');
      
      // STEP 1: Clear Service Worker API cache FIRST
      console.log('[AUTH] LOGOUT: Clearing Service Worker API cache');
      await clearServiceWorkerCache();
      
      // STEP 2: Clear React Query cache completely (most aggressive method)
      queryClient.clear();
      
      // STEP 3: Clear ALL localStorage items that might contain user data
      const keysToPreserve = ['moogship_theme', 'moogship_language']; // Preserve only UI preferences
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToPreserve.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // STEP 4: Clear ALL sessionStorage
      sessionStorage.clear();
      
      // STEP 5: Clear all state immediately
      setLocalUser(null);
      setLast401At(null);
      setConfirmedUnauthorized(false);
      setLastLoginAt(null);
      
      // STEP 6: Explicitly clear user storage
      clearUserFromStorage();
      
      // Notify user
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
      
      console.log('[AUTH] LOGOUT: Complete - forcing hard reload to clear all cache');
      
      // CRITICAL: Force hard reload with cache busting
      // This bypasses ALL browser caches and forces fresh page load
      setTimeout(() => {
        // Add timestamp to force cache bypass
        const timestamp = Date.now();
        window.location.href = `/?_nocache=${timestamp}`;
      }, 100);
    },
    onError: (error: Error) => {
      console.error("Logout error:", error);
      
      // CRITICAL: Clear everything even on error
      queryClient.clear();
      setLocalUser(null);
      setLast401At(null);
      setConfirmedUnauthorized(false);
      setLastLoginAt(null);
      clearUserFromStorage();
      
      toast({
        title: "Logout completed",
        description: "Your session has been cleared locally.",
      });
      
      // CRITICAL: Force hard reload even on error
      setTimeout(() => {
        const timestamp = Date.now();
        window.location.href = `/?_nocache=${timestamp}`;
      }, 100);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: effectiveUser,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}