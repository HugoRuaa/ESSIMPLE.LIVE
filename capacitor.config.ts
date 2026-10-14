import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'live.essimple',
  appName: 'essimple.live',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
};

export default config;
