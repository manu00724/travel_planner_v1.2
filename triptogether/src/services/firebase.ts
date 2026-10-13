import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'qwiklabs-gcp-04-220e06ee3cd9.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'qwiklabs-gcp-04-220e06ee3cd9',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'qwiklabs-gcp-04-220e06ee3cd9.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '372580545096',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:372580545096:web:00ed7576529071cc66de7d',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id' &&
  import.meta.env.MODE !== 'test'
);
