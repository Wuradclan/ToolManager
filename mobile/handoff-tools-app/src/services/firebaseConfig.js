// src/services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBnYFbiH-3z4vf6UtGebadkwYN-nR7AvXI",
  authDomain: "handoff-tools.firebaseapp.com",
  projectId: "handoff-tools",
  storageBucket: "handoff-tools.firebasestorage.app",
  messagingSenderId: "299439184881",
  appId: "1:299439184881:web:3363dd741fb0dc70d04250"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
