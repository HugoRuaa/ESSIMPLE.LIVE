import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.essimple.simple',
  appName: 'essimple',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
