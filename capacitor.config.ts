import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snakeline.game',
  appName: 'Snake Line',
  webDir: 'dist',
  android: {
    backgroundColor: '#06120c',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SystemBars: {
      // Don't reserve inset space — app draws edge-to-edge.
      insetsHandling: 'disable',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#06120c',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#06120c',
    },
  },
};

export default config;
