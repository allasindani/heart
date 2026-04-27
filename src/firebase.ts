import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  memoryLocalCache
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Initialize Firestore with memory cache for stability in sandbox
const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
  // Use force long polling as it's more reliable in the AI Studio preview environment
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export { db };
export const auth = getAuth();

// Diagnostic check (Non-blocking)
async function checkConnection() {
  console.log("Navigator Online Status:", navigator.onLine);
  try {
    const { getDocFromServer, doc } = await import('firebase/firestore');
    // Use a small timeout to avoid long waits if backend is genuinely unreachable
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc);
    console.log("Firebase connected successfully to database:", firebaseConfig.firestoreDatabaseId);
  } catch (error: any) {
    if (error.message?.includes('offline') || error.code === 'unavailable') {
      console.warn("Firestore is operating in offline mode. This is common in some network configurations.");
      console.warn("Details:", error.message);
    } else {
      console.error("Firestore connection check failed:", error);
    }
  }
}

setTimeout(checkConnection, 5000);
