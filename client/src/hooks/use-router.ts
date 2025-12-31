import { useLocation } from 'wouter';

export function useRouter() {
  const [location, navigate] = useLocation();
  
  return {
    location,
    navigate,
    goBack: () => window.history.back(),
    goForward: () => window.history.forward()
  };
}