import MyTickets from "./my-tickets";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useState, useEffect } from "react";
import { AuthMiddleware } from "@/components/auth-middleware";

// My tickets wrapper with regular user auth checking
export default function MyTicketsWrapper() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  
  return (
    <AuthMiddleware adminOnly={false}>
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
          <h1 className="text-xl font-bold">My Tickets</h1>
          <div className="w-6"></div> {/* Empty space for balance */}
        </div>
        <MobileNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        
        <div className="flex flex-1">
          <Sidebar />
          
          <div className="flex-1 md:ml-64 mt-14 md:mt-0">
            <div className="px-4 py-6 md:px-6 md:py-8">
              <MyTickets />
            </div>
          </div>
        </div>
      </div>
    </AuthMiddleware>
  );
}