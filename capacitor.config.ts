import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moogship.app',
  appName: 'MoogShip',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    hostname: 'localhost',
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