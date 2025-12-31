import { Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { ComponentType, LazyExoticComponent } from "react";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

type ProtectedRouteProps = {
  path: string;
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  adminOnly?: boolean;
};

// Simplified protected route component
// Auth checking handled at the component level
export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: ProtectedRouteProps) {
  // Wrap the component to handle lazy loading properly
  const WrappedComponent = (props: any) => (
    <GlobalErrorBoundary pageName={path}>
      <Component {...props} />
    </GlobalErrorBoundary>
  );
  
  return <Route path={path} component={WrappedComponent} />;
}
