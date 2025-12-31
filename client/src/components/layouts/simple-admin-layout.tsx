import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeftRight,
  BarChart3,
  Building,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  LogOut,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

/**
 * SimpleAdminLayout - A simplified version of AdminLayout
 * 
 * This layout doesn't depend on useAuth or useAdmin hooks, 
 * making it suitable for pages that are loaded outside the context of AuthProvider.
 */
export default function SimpleAdminLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [location, navigate] = useLocation();

  // Administrative navigation links
  const adminNavLinks = [
    {
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
      label: t("Dashboard"),
      path: "/dashboard",
      actualPath: "/dashboard",
    },
    {
      icon: <Truck className="mr-2 h-4 w-4" />,
      label: t("Shipments"),
      path: "/admin-shipments",
      actualPath: "/admin-shipments",
    },
    {
      icon: <Plus className="mr-2 h-4 w-4" />,
      label: "Create Shipment",
      path: "/admin-shipment-create",
      actualPath: "/admin-shipment-create",
    },
    {
      icon: <Users className="mr-2 h-4 w-4" />,
      label: t("Users"),
      path: "/manage-users",
      actualPath: "/manage-users",
    },
    {
      icon: <Package className="mr-2 h-4 w-4" />,
      label: t("Products"),
      path: "/products",
      actualPath: "/products",
    },
    {
      icon: <Building className="mr-2 h-4 w-4" />,
      label: t("Carriers"),
      path: "/carriers",
      actualPath: "/dashboard", // Redirecting to dashboard since carriers page doesn't exist yet
    },
    {
      icon: <BarChart3 className="mr-2 h-4 w-4" />,
      label: t("Reports"),
      path: "/reports",
      actualPath: "/reports",
    },
    {
      icon: <ShoppingCart className="mr-2 h-4 w-4" />,
      label: t("Orders"),
      path: "/orders",
      actualPath: "/dashboard", // Redirecting to dashboard since orders page doesn't exist yet
    },
    {
      icon: <FileText className="mr-2 h-4 w-4" />,
      label: t("CMS"),
      path: "/admin-cms",
      actualPath: "/admin-cms",
    },
    {
      icon: <Settings className="mr-2 h-4 w-4" />,
      label: t("Settings"),
      path: "/settings",
      actualPath: "/dashboard", // Redirecting to dashboard since settings page doesn't exist yet
    },
    {
      icon: <ArrowLeftRight className="mr-2 h-4 w-4" />,
      label: t("Transactions"),
      path: "/transactions",
      actualPath: "/transactions",
    },
  ];

  // Handle logout - use proper auth context for cache clearing
  const { logoutMutation } = useAuth();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navigation */}
      <header className="bg-background border-b">
        <div className="container flex justify-between items-center h-16">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden mr-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    />
                  </svg>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader className="mb-4">
                  <SheetTitle>MoogShip Admin</SheetTitle>
                  <SheetDescription>
                    {t("Administrative Interface")}
                  </SheetDescription>
                </SheetHeader>
                <nav className="space-y-2">
                  {adminNavLinks.map((link) => (
                    <Button
                      key={link.path}
                      variant={location === link.path ? "default" : "ghost"}
                      className={`w-full justify-start ${
                        location === link.path ? "bg-primary text-primary-foreground" : ""
                      }`}
                      onClick={() => window.location.href = link.actualPath}
                    >
                      {link.icon}
                      {link.label}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {t("Logout")}
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
            <h1
              className="text-lg font-semibold cursor-pointer"
              onClick={() => window.location.href = "/dashboard"}
            >
              MoogShip <span className="text-primary">Admin</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">{t("Logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content with sidebar */}
      <div className="flex flex-1">
        {/* Sidebar - hidden on mobile */}
        <aside className="hidden md:block w-64 bg-background border-r">
          <nav className="p-4 space-y-2">
            {adminNavLinks.map((link) => (
              <Button
                key={link.path}
                variant={location === link.path ? "default" : "ghost"}
                className={`w-full justify-start ${
                  location === link.path ? "bg-primary text-primary-foreground" : ""
                }`}
                onClick={() => window.location.href = link.actualPath}
              >
                {link.icon}
                {link.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}