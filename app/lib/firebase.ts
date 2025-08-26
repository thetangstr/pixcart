// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics only on client side
let analytics;
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && (analytics = getAnalytics(app)));
}

export { app, analytics };