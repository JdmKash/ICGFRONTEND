import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.netlify.immigrantcoins',
  appName: 'Immigrant Coins',
  webDir: 'build',
  plugins: {
    AdMob: {
      appIdAndroid: 'ca-app-pub-6315102990730207~1787112000',
      appIdiOS: 'ca-app-pub-6315102990730207~4069660419',
      testingDevices: ['TEST_DEVICE_ID'],
      initializeForTesting: false // Set to false in production
    }
  }
};

export default config;
