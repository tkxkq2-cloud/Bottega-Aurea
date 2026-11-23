import type { CapacitorConfig } from '@capacitor/cli';

const LIVE_URL = 'https://tkxkq2-cloud.github.io/Bottega-Aurea/';

const config: CapacitorConfig = {
  appId: 'com.bottegaaurea.pos',
  appName: 'Bottega Aurea',
  webDir: 'dist',
  server: {
    url: LIVE_URL,
    cleartext: false,
    androidScheme: 'https',
    allowNavigation: [
      'tkxkq2-cloud.github.io',
      '*.firebaseapp.com',
      '*.googleapis.com',
    ],
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
