import 'dotenv/config';

export default {
  expo: {
    name: "Tool Manager",
    slug: "tool-manager",
    version: "1.0.0",
    sdkVersion: "53.0.0",
    plugins: ["expo-camera"], // deprecated
    ios: {
      bundleIdentifier: "com.wurad.toolmanager",  // <-- Add your unique bundle ID here
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    android: {
      package: 'com.wurad.toolmanager'
    },
    extra: {
      eas: {
        projectId: '2ab5d76e-58e7-4607-8878-6407d1fca49f',
      },
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
    },
  },
};
