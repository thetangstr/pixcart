// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDzpCC6CP1EZobWyA7E5NDWPwjy44zwz1A",
  authDomain: "pixcarti.firebaseapp.com",
  projectId: "pixcarti",
  storageBucket: "pixcarti.firebasestorage.app",
  messagingSenderId: "1014273775889",
  appId: "1:1014273775889:web:84ac96d66ca771182894b0",
  measurementId: "G-504FB1TQYE"
};

// Lazy initialization to prevent build-time hanging
let app: ReturnType<typeof initializeApp> | undefined;
let db: ReturnType<typeof getFirestore> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;
let analytics: any;

function getFirebaseApp() {
  // Skip Firebase initialization during build or when explicitly disabled
  if (process.env.SKIP_FIREBASE_INIT === 'true' || typeof window === 'undefined') {
    return null as any;
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return app;
}

function getDb() {
  // Skip Firebase initialization during build or when explicitly disabled
  if (process.env.SKIP_FIREBASE_INIT === 'true' || typeof window === 'undefined') {
    return null as any;
  }
  if (!db) {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp) {
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}

function getAuthInstance() {
  // Skip Firebase initialization during build or when explicitly disabled
  if (process.env.SKIP_FIREBASE_INIT === 'true' || typeof window === 'undefined') {
    return null as any;
  }
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (firebaseApp) {
      auth = getAuth(firebaseApp);
    }
  }
  return auth;
}

// Initialize Analytics only on client side
if (typeof window !== 'undefined') {
  isSupported().then(yes => {
    if (yes) {
      analytics = getAnalytics(getFirebaseApp());
    }
  });
}

export { getFirebaseApp as app, getDb as db, getAuthInstance as auth, analytics };