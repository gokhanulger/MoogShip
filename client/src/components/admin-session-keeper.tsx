import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

/**
 * This component helps maintain admin sessions by periodically
 * pinging the server to keep the session alive.
 * It should be used in all admin pages to prevent session timeout.
 */
export function AdminSessionKeeper() {
  const { user } = useAuth();
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Run session refresh in the background
  useEffect(() => {
    // Only run for admin users
    if (!user || user.role !== 'admin') return;
    
    console.log('AdminSessionKeeper activated for admin user:', user.username);
    
    // Function to refresh the admin session
    const refreshAdminSession = async () => {
      try {
        const response = await fetch('/api/refresh-admin-session', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        });
        
        if (response.ok) {
          console.log('Admin session refreshed successfully at', new Date().toISOString());
          setLastRefresh(new Date());
        } else {
          console.warn('Failed to refresh admin session:', await response.text());
        }
      } catch (error) {
        console.error('Error refreshing admin session:', error);
      }
    };
    
    // Initial refresh
    refreshAdminSession();
    
    // Chrome-optimized: Set up periodic refresh - every 10 minutes instead of 2 minutes
    const interval = setInterval(refreshAdminSession, 10 * 60 * 1000);
    
    // Clean up on unmount
    return () => {
      clearInterval(interval);
      console.log('AdminSessionKeeper deactivated');
    };
  }, [user]);
  
  // This component doesn't render anything visible
  return null;
}