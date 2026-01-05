import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Helper function to detect Capacitor at runtime
function isCapacitor(): boolean {
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

// Check if we're already on the server (loaded via server.url in Capacitor)
function isOnServerOrigin(): boolean {
  return window.location.origin === 'https://moogship.onrender.com' ||
         window.location.origin === 'https://www.moogship.com';
}

// API base URL - check at runtime for Capacitor
export function getApiBaseUrl(): string {
  // If we're already on the server origin, use relative URLs
  if (isOnServerOrigin()) {
    return '';
  }
  // Otherwise, for local Capacitor builds, use full URL
  return isCapacitor() ? 'https://moogship.onrender.com' : '';
}

// For backward compatibility
export const API_BASE_URL = '';

// Helper function to get full API URL - checks Capacitor at runtime
export function getApiUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${path}`;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to get auth headers for mobile app - exported for use in other files
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const storedUser = localStorage.getItem('moogship_auth_user');

  if (storedUser) {
    try {
      const userData = JSON.parse(storedUser);
      if (userData.id) {
        headers['X-User-Id'] = String(userData.id);
      }
      if (userData.sessionId) {
        headers['X-Session-Id'] = userData.sessionId;
      }
    } catch (e) {
      // ignore
    }
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Create an AbortController for timeout handling
  const controller = new AbortController();

  // Set timeout with proper error message
  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(new Error('Request timeout'));
    }
  }, 30000); // 30 second timeout

  // Use full API URL for Capacitor
  const fullUrl = getApiUrl(url);

  try {
    const res = await fetch(fullUrl, {
      method,
      headers: {
        ...(data ? { "Content-Type": "application/json" } : {}),
        ...getAuthHeaders(),
      },
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
      cache: 'no-store',
      keepalive: true,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection and try again');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Create an AbortController for timeout handling
    const controller = new AbortController();
    const url = getApiUrl(queryKey[0] as string);

    // Set timeout with proper error message
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted) {
        console.warn('Request timeout for:', url);
        controller.abort(new Error('Request timeout'));
      }
    }, 30000); // 30 second timeout

    try {
      // Identify critical endpoints that need fresh data
      const criticalEndpoints = [
        '/api/admin/fast-tracking-notifications',
        '/api/balance',
        '/api/user',
        '/api/shipments',
        '/api/admin/shipments',
        '/api/notifications',
        '/api/billing-reminders'
      ];
      
      const isCriticalEndpoint = criticalEndpoints.some(endpoint => url.includes(endpoint));
      
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
        cache: isCriticalEndpoint ? 'no-store' : 'default',
        keepalive: true,
        headers: getAuthHeaders(),
      });

      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
  };

// Detect mobile device for optimal settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 10 * 60 * 1000, // 10 minutes - aggressive caching for better performance
      gcTime: 30 * 60 * 1000, // 30 minutes - keep cache longer
      retry: 1, // Single retry to avoid delays
      retryDelay: 500, // Quick retry
      networkMode: 'online',
      refetchOnReconnect: true,
      refetchOnMount: false, // Use cache when available
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
    },
  },
});

// CRITICAL FIX: All user-specific endpoints MUST have zero cache to prevent stale data after logout
// This fixes the bug where logging out and logging in as a different user shows previous user's data

// User-specific endpoints that must NEVER cache across user sessions
const userSpecificEndpoints = [
  '/api/user',
  '/api/shipments',
  '/api/shipments/my',
  '/api/admin/shipments',
  '/api/balance',
  '/api/transactions',
  '/api/notifications',
  '/api/admin/fast-tracking-notifications',
  '/api/announcements/login-popups',
  '/api/billing-reminders',
  '/api/users',
  '/api/packages',
  '/api/addresses',
  '/api/announcements',
  '/api/statistics'
];

// Apply zero-cache policy to ALL user-specific endpoints
userSpecificEndpoints.forEach(endpoint => {
  queryClient.setQueryDefaults([endpoint], {
    staleTime: 0, // ALWAYS stale - forces refetch every time
    refetchOnMount: true, // CRITICAL: Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when switching tabs/windows
    refetchOnReconnect: true, // Refetch on network reconnect
    gcTime: 10 * 1000, // Only keep in garbage collection for 10 seconds
  });
});

// Extra critical: User endpoint needs even shorter cache
queryClient.setQueryDefaults(['/api/user'], {
  staleTime: 0, // Always stale - forces refetch
  refetchOnMount: true, // CRITICAL: Always refetch to prevent cached user data
  refetchOnWindowFocus: true, // Refetch on focus to catch session changes
  refetchOnReconnect: true,
  gcTime: 1 * 1000, // Extremely short - 1 second only
});

// Static/semi-static endpoints get very long caching
const staticQueryKeys = [
  '/api/marketing-banners',
  '/api/products',
  '/api/package-templates'
];

staticQueryKeys.forEach(key => {
  queryClient.setQueryDefaults([key], {
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    gcTime: 60 * 60 * 1000, // 1 hour cache
  });
});
