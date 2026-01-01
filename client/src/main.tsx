import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./hooks/use-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// Only load mobile performance optimizer - remove redundant optimizers
import "./lib/mobile-performance-optimizer";
// Import i18n instance
import "./i18n";

// Service worker disabled temporarily for debugging
// TODO: Re-enable after fixing refresh loop issue
/*
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('MoogShip SW: Registered successfully', registration);

        // Check for updates every 10 minutes (reduced frequency)
        setInterval(() => {
          registration.update();
        }, 10 * 60 * 1000);

        // Listen for new service worker ready
        registration.addEventListener('updatefound', () => {
          console.log('MoogShip SW: Update found, new version available');
        });
      })
      .catch((registrationError) => {
        console.warn('MoogShip SW: Registration failed:', registrationError);
      });
  });
}
*/

// Unregister any existing service workers to prevent reload loops
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('MoogShip SW: Unregistered service worker');
    }
  });
}

// Create a wrapper component to ensure correct provider hierarchy
const RootComponent = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);

// Remove initial loader and render app
const removeInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 100);
  }
};

// Render with faster perceived loading
const root = createRoot(document.getElementById("root")!);
root.render(<RootComponent />);

// Remove loader after first render - instant
setTimeout(removeInitialLoader, 0);
