import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// This component can be used to wrap components that require authentication
// or admin permissions without using the AuthContext directly
export interface AuthMiddlewareProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function AuthMiddleware({
  children,
  adminOnly = false,
  requireAuth = true,
  redirectTo = '/auth',
}: AuthMiddlewareProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  useEffect(() => {
    // Make a quick check to the server to verify auth status
    async function checkAuth() {
      setIsLoading(true);
      console.log('AuthMiddleware: checking auth with adminOnly=', adminOnly, 'requireAuth=', requireAuth);
      
      try {
        // For admin check, use the dedicated endpoint
        if (adminOnly) {
          console.log('AuthMiddleware: Checking admin status');
          const response = await fetch('/api/check-admin');
          
          if (!response.ok) {
            if (response.status === 401 && requireAuth) {
              console.log('Auth middleware: User not authenticated, redirecting to', redirectTo);
              toast({
                title: 'Authentication required',
                description: 'Please log in to access this page'
              });
              navigate(redirectTo);
              return;
            }
            
            throw new Error('Failed to check admin status');
          }
          
          const data = await response.json();
          console.log('Admin check response:', data);
          
          if (!data.isAdmin) {
            console.log('Auth middleware: User not admin, redirecting to home');
            toast({
              title: 'Access denied',
              description: 'You do not have permission to access this page'
            });
            navigate('/');
            return;
          }
          
          // User is admin, allow access
          console.log('Auth middleware: User is admin, allowing access');
          setIsAuthorized(true);
        } 
        // For regular auth check, use the user endpoint
        else if (requireAuth) {
          console.log('AuthMiddleware: Checking regular auth');
          const response = await fetch('/api/user');
          
          if (!response.ok) {
            // Not authenticated
            console.log('Auth middleware: User not authenticated, redirecting to', redirectTo);
            toast({
              title: 'Authentication required',
              description: 'Please log in to access this page'
            });
            navigate(redirectTo);
            return;
          }
          
          // User is authenticated, allow access
          console.log('Auth middleware: User is authenticated, allowing access');
          setIsAuthorized(true);
        } 
        // No auth required
        else {
          console.log('Auth middleware: No auth required, allowing access');
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        toast({
          title: 'Error',
          description: 'Failed to verify authentication status',
          variant: 'destructive'
        });
        
        // On error, redirect to safe location
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }
    
    checkAuth();
  }, [adminOnly, requireAuth, redirectTo, navigate, toast]);
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }
  
  // Only render children if authorized
  return isAuthorized ? <>{children}</> : null;
}