import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moogship.app',
  appName: 'MoogShip',
  webDir: 'dist/public',
  server: {
    // Load app directly from server - cookies work normally
    url: 'https://moogship.onrender.com',
    cleartext: true,
    allowNavigation: ['*']
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false
  },
  android: {
    allowMixedContent: true
  }
};

export default config;