import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.moogship.app',
  appName: 'MoogShip',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    // Remove development-specific settings for production
    iosScheme: 'capacitor'
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scheme: 'capacitor'
  }
};

export default config;