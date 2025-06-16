// src/services/firebaseConfig.js

import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Firebase configuration from app.config.js -> extra
const firebaseConfig = {
  apiKey: Constants.expoConfig.extra.firebaseApiKey,
  authDomain: Constants.expoConfig.extra.firebaseAuthDomain,
  projectId: Constants.expoConfig.extra.firebaseProjectId,
  storageBucket: Constants.expoConfig.extra.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig.extra.firebaseMessagingSenderId,
  appId: Constants.expoConfig.extra.firebaseAppId,
};

// ✅ Initialize the Firebase App once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ✅ Initialize Firebase Auth (with AsyncStorage for native, fallback for web)
let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// ✅ Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// ✅ Export for use in your app
export { app, auth, db, storage };
