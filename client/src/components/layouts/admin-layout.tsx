import { ReactNode } from "react";
import { useAdmin } from "@/hooks/use-admin";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { AdminSessionKeeper } from "@/components/admin-session-keeper";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { isAdmin } = useAdmin();
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAdmin) {
    // The useAdmin hook will handle redirects, just show a loading state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="bg-background min-h-screen">
      {/* Include the AdminSessionKeeper to keep admin sessions alive */}
      <AdminSessionKeeper />
      
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-normal">
              Admin Panel
            </Badge>
            
            <div className="flex gap-2">
              <div
                onClick={() => window.location.href = '/dashboard'}
                className="text-sm font-medium hover:underline cursor-pointer"
              >
                Dashboard
              </div>
              <span className="text-muted-foreground">/</span>
              <div
                onClick={() => window.location.href = '/admin-shipments'}
                className="text-sm font-medium hover:underline cursor-pointer"
              >
                Shipments
              </div>
              <span className="text-muted-foreground">/</span>
              <div
                onClick={() => window.location.href = '/manage-users'}
                className="text-sm font-medium hover:underline cursor-pointer"
              >
                Users
              </div>
              <span className="text-muted-foreground">/</span>
              <div
                onClick={() => window.location.href = '/admin-cms'}
                className="text-sm font-medium hover:underline font-semibold text-primary cursor-pointer"
              >
                CMS
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {children}
        </div>
      </div>
    </div>
  );
}