import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heartconnect.app',
  appName: 'Heart Connect',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false // We handle it manually in App.tsx
    }
  }
};

export default config;
