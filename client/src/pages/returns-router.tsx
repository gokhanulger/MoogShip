import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import SellerReturns from "./seller-returns";
import AdminReturns from "./admin-returns";

/**
 * Smart returns router that shows the appropriate interface based on user role
 * - Admin users see the admin return management interface
 * - Regular users see the user return interface
 */
export default function ReturnsRouter() {
  const [, navigate] = useLocation();
  
  // Get user data to determine role
  const { data: userData, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
  });

  const isAdmin = userData?.role === 'admin';
  const hasReturnAccess = isAdmin || userData?.canAccessReturnSystem;

  // Show loading while checking user role
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect admin users to admin interface automatically
  if (isAdmin) {
    return <AdminReturns />;
  }

  // Show user interface for regular users
  return <SellerReturns />;
}