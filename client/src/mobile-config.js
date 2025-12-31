// Configuration options for the mobile app

export const mobileConfig = {
  // API endpoint for when running on a mobile device
  apiBaseUrl: window.location.origin,
  
  // Enable offline capabilities
  offlineMode: {
    enabled: true,
    syncInterval: 60 * 1000, // 1 minute
  },
  
  // Push notification settings (for future implementation)
  pushNotifications: {
    enabled: false,
  },
  
  // App settings
  app: {
    version: "1.0.0",
    name: "MoogShip",
    theme: "system", // "light", "dark", or "system"
  },
};