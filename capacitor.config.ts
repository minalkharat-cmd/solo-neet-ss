import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.soloneet.ss',
  appName: 'Solo NEET SS',
  webDir: 'dist',
  server: {
    // Use HTTPS scheme for secure WebView (required for OAuth redirects)
    androidScheme: 'https',
    // Uncomment the line below for live-reload during development:
    // url: 'http://192.168.x.x:5173',
  },
  plugins: {
    App: {
      // Deep link scheme for OAuth callback from native browser
      // Matches server redirect: com.soloneet.ss://oauth?token=...
      url: 'com.soloneet.ss',
    },
  },
};

export default config;
