import { AuthProvider, useAuth } from "@/hooks/use-auth";
import AdminTicketDetail from "./admin-ticket-detail";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Inner component that will be wrapped with AuthProvider
function AdminTicketDetailInner() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isLoading: userLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';

  // Close mobile menu when clicking outside or pressing escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const mobileMenu = document.getElementById("mobile-menu");
      if (mobileMenu && !mobileMenu.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!userLoading && !isAdmin) {
      toast({
        title: 'Access denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive'
      });
      navigate('/');
    }
  }, [userLoading, isAdmin, navigate, toast]);

  // Render loading state if user is still loading
  if (userLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Don't render the content if not admin
  if (!isAdmin) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="md:hidden flex items-center justify-between p-4 border-b">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Ticket Details</h1>
        <div className="w-6"></div> {/* Empty space for balance */}
      </div>
      <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      <div className="flex flex-1">
        <Sidebar />
        
        <div className="flex-1 md:ml-64 mt-14 md:mt-0">
          <div className="px-4 py-6 md:px-6 md:py-8">
            <AdminTicketDetail />
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a wrapped version of the component
export default function AdminTicketDetailWrapper() {
  return (
    <AuthProvider>
      <AdminTicketDetailInner />
    </AuthProvider>
  );
}