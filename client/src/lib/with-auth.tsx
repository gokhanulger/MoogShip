import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Layout from '@/components/layout';
import { Loader2 } from 'lucide-react';
import { PageTransitionLoader } from '@/components/video-loader';
import { getApiUrl, getAuthHeaders } from '@/lib/queryClient';

/**
 * A Higher Order Component (HOC) that handles authentication and authorization.
 * It will check if a user is authenticated and redirect to login if not.
 * For admin-only routes, it will check if the user has admin privileges.
 * 
 * @param Component The component to wrap with authentication
 * @param adminOnly Whether the route requires admin privileges
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  adminOnly: boolean = false
) {
  return function WithAuthWrapper(props: P) {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [, setLocation] = useLocation();
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      // Get stored admin user data if available
      const getStoredAdminData = () => {
        try {
          const storedData = localStorage.getItem('moogship_admin_user');
          return storedData ? JSON.parse(storedData) : null;
        } catch (e) {
          console.error('Error parsing stored admin data:', e);
          return null;
        }
      };

      // Get any stored user data for mobile Safari
      const getStoredUserData = () => {
        try {
          // Check multiple storage locations for mobile Safari
          const locations = [
            'moogship_auth_user',
            'moogship_temp_user',
            'moogship_session_user'
          ];
          
          for (const location of locations) {
            const data = localStorage.getItem(location);
            if (data) {
              return JSON.parse(data);
            }
          }
          
          // Also check sessionStorage
          const sessionData = sessionStorage.getItem('moogship_session_user');
          if (sessionData) {
            return JSON.parse(sessionData);
          }
          
          return null;
        } catch (e) {
          console.error('Error parsing stored user data:', e);
          return null;
        }
      };

      async function checkAuth() {
        try {
          // Check if we have stored admin data and this is an admin route
          const storedAdminData = adminOnly ? getStoredAdminData() : null;
          
          // For mobile Safari or Capacitor, check stored user data first
          const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
          const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
          const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();

          if (isMobile && isSafari || isCapacitorApp) {
            const storedUserData = getStoredUserData();
            if (storedUserData && storedUserData.id) {
              console.log('[AUTH] Mobile Safari - found stored user data:', storedUserData.username);
              
              // If admin-only, check user role
              if (adminOnly && storedUserData.role !== 'admin') {
                console.log('User is not an admin, redirecting to home');
                setLocation('/');
                return;
              }
              
              // Use stored data and try to verify in background
              setUser(storedUserData);
              setIsLoading(false);
              
              // Try to verify session in background without blocking UI
              fetch(getApiUrl('/api/user'), {
                credentials: 'include',
                headers: {
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  ...getAuthHeaders()
                },
              }).then(response => {
                if (!response.ok) {
                  console.warn('[AUTH] Background session verification failed, but continuing with stored data');
                }
              }).catch(err => {
                console.warn('[AUTH] Background session verification error:', err);
              });
              
              return;
            }
          }
          
          // First try server authentication
          const response = await fetch(getApiUrl('/api/user'), {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              ...getAuthHeaders()
            },
          });
          
          if (response.ok) {
            // Server authentication succeeded
            const userData = await response.json();
            
            // If admin-only, check user role
            if (adminOnly && userData.role !== 'admin') {
              console.log('User is not an admin, redirecting to home');
              setLocation('/');
              return;
            }
            
            // Valid admin user, store for future reference
            if (adminOnly && userData.role === 'admin') {
              localStorage.setItem('moogship_admin_user', JSON.stringify(userData));
              
              // Also refresh admin session to keep it active
              try {
                await fetch(getApiUrl('/api/refresh-admin-session'), {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    ...getAuthHeaders()
                  }
                });
                console.log('Admin session refreshed successfully');
              } catch (refreshError) {
                console.warn('Failed to refresh admin session:', refreshError);
              }
            }
            
            setUser(userData);
          } 
          else if (response.status === 401) {
            // Server authentication failed - check if we have stored admin data
            if (adminOnly && storedAdminData && storedAdminData.role === 'admin') {
              console.log('Using stored admin data to prevent logout during page refresh');
              
              // Try to refresh the admin session in the background
              try {
                const refreshResponse = await fetch(getApiUrl('/api/refresh-admin-session'), {
                  method: 'POST',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    ...getAuthHeaders()
                  },
                  body: JSON.stringify({ adminId: storedAdminData.id })
                });
                
                if (refreshResponse.ok) {
                  console.log('Admin session restored successfully');
                  // Get the fresh user data
                  const freshUserData = await refreshResponse.json();
                  setUser(freshUserData.user || storedAdminData);
                  return;
                }
              } catch (refreshError) {
                console.warn('Failed to restore admin session:', refreshError);
              }
              
              // If refresh failed but we have valid stored data, use it anyway
              setUser(storedAdminData);
              return;
            }
            
            // No stored admin data or not an admin route - redirect to login
            console.log('Unauthorized, redirecting to login');
            const isCapacitorApp = !!(window as any).Capacitor?.isNativePlatform?.();
            setLocation(isCapacitorApp ? '/mobile-auth' : '/auth');
            return;
          } 
          else {
            throw new Error('Failed to check authentication');
          }
        } catch (err) {
          console.error('Auth check error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setIsLoading(false);
        }
      }
      
      checkAuth();
    }, [adminOnly, setLocation]);

    // Show loading state
    if (isLoading) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h1 className="text-2xl font-bold">Verifying access...</h1>
            <p className="text-gray-500 mt-2">Please wait while we check your permissions.</p>
          </div>
        </Layout>
      );
    }

    // Show error state if there was a problem
    if (error) {
      return (
        <Layout>
          <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
            <div className="text-red-500 text-6xl mb-6">⚠️</div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-500 mb-6">{error.message}</p>
            <button 
              className="bg-primary text-white px-4 py-2 rounded-lg"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        </Layout>
      );
    }

    // If we got here, user is authenticated and authorized
    // Render the protected component with the user data and other props
    return <Component {...props} user={user} />;
  };
}