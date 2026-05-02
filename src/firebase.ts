import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

if (!firebaseConfig.firestoreDatabaseId) {
  console.warn("Firestore Database ID is missing in configuration. Defaulting to (default).");
}

// Initialize Firestore with persistent cache for stability and offline support
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId || '(default)');

export { db };
export const auth = getAuth();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Comprehensive Diagnostic Check
async function checkConnection(retryCount = 0) {
  const MAX_RETRIES = 3;
  console.log(`[Diagnostic] Connection check attempt ${retryCount + 1}/${MAX_RETRIES + 1}`);
  
  try {
    const { getDocFromServer, doc } = await import('firebase/firestore');
    // Using a known path that should exist or at least be reachable
    const testDoc = doc(db, '_diagnostics_', 'connection');
    
    const startTime = Date.now();
    await getDocFromServer(testDoc).catch(e => {
        // If it's 'not-found' (404) or 'permission-denied', it means we REACHED the backend
        if (e.code === 'not-found' || e.code === 'permission-denied') {
            console.log(`[Diagnostic] Firestore reachable (Response: ${e.code}) in ${Date.now() - startTime}ms`);
            return;
        }
        throw e;
    });
    
    console.log(`[Diagnostic] Firestore connected (Success) in ${Date.now() - startTime}ms`);
  } catch (error: any) {
    console.error(`[Diagnostic] Firestore unreachable:`, error.code, error.message);
    
    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 2000;
      console.log(`[Diagnostic] Retrying in ${delay}ms...`);
      setTimeout(() => checkConnection(retryCount + 1), delay);
    } else {
      console.error("[Diagnostic] Max retries reached. Persistent connectivity issue detected.");
      window.dispatchEvent(new CustomEvent('firestore-connection-error', { 
        detail: { message: "Could not reach database backend after multiple attempts." } 
      }));
    }
  }
}

// Start diagnostic check after a short delay
if (typeof window !== 'undefined') {
  setTimeout(() => checkConnection(), 3000);
}
