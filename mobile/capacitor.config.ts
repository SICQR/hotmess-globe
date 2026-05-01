import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hotmess.app',
  appName: 'HOTMESS',
  webDir: '../dist',
  server: {
    iosScheme: 'hotmess',
    androidScheme: 'https',
    // Uncomment + set to local IP for live-reload dev:
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: false,
    allowsLinkPreview: false,
    // RevenueCat requires handleApplicationNotifications: false
    handleApplicationNotifications: false,
    backgroundColor: '#050507',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#050507',
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#050507',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#050507',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_hotmess',
      iconColor: '#C8962C',
    },
  },
};

export default config;

