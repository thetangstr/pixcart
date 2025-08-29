import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// Lazy-loaded Firebase Admin to prevent build-time issues
let adminApp: App | undefined;
let adminDbInstance: Firestore | undefined;

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length === 0) {
      const firebaseAdminConfig = {
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || "pixcarti",
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      };
      adminApp = initializeApp(firebaseAdminConfig, 'admin');
    } else {
      adminApp = getApps()[0];
    }
  }
  return adminApp;
}

function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    adminDbInstance = getFirestore(getAdminApp());
  }
  return adminDbInstance;
}

// Export lazy-loaded getters
export { getAdminApp as adminApp, getAdminDb as adminDb };