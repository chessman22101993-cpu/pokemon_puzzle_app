// Firebase configuration and initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

// Check if we have at least apiKey and projectId to initialize Firebase
const hasCredentials = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'YOUR_API_KEY' &&
  firebaseConfig.projectId;

let app;
let auth = null;
let firestore = null;
let realtimeDb = null;
let isMock = true;

if (hasCredentials) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
    realtimeDb = getDatabase(app);
    isMock = false;
    console.log('Firebase initialized successfully in production mode.');
  } catch (error) {
    console.error('Failed to initialize Firebase, falling back to Local Sandbox Mode:', error);
    isMock = true;
  }
} else {
  console.log('Firebase credentials not found. Running in Local Sandbox Mode (Local storage + BroadcastChannel sync).');
  isMock = true;
}

export { auth, firestore, realtimeDb, isMock };
export default app;
