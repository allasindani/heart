import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.heartconnect.app',
  appName: 'HEART CONNECT',
  webDir: 'dist',
  server: {
    url: 'https://chat.opramixes.com',
    cleartext: true
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false // We handle it manually in App.tsx
    }
  }
};

export default config;
