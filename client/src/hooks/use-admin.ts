import { useAuth } from "./use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Hook to enforce admin access and redirect non-admins
 * @returns isAdmin - boolean indicating if current user is an admin
 */
export function useAdmin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // After loading completes, check for admin role
    if (!isLoading) {
      if (!user) {
        // Not logged in, redirect to auth page
        setLocation("/auth");
        return;
      }
      
      if (user.role !== "admin") {
        // Not an admin, redirect to dashboard
        setLocation("/dashboard");
        return;
      }
    }
  }, [user, isLoading, setLocation]);

  return {
    isAdmin: !isLoading && user?.role === "admin"
  };
}