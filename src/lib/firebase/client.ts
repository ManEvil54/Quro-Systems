// ============================================================
// Quro — Firebase Configuration
// ModernQure LLC
// ============================================================
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate config presence to prevent build-time crashes
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';

// Prevent re-initialization in dev hot-reload and handle missing config during build
const app = getApps().length 
  ? getApp() 
  : (isConfigValid ? initializeApp(firebaseConfig) : undefined);

// Safely export services (will be undefined during build if config is missing)
export const auth = app ? getAuth(app) : ({} as any);

// Safely configure Firestore cache with multi-tab support and graceful memory fallback
let localCacheConfig;
try {
  if (typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined') {
    localCacheConfig = persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    });
  } else {
    localCacheConfig = memoryLocalCache();
  }
} catch (e) {
  console.warn('Firestore offline cache initialization failed, falling back to memoryLocalCache:', e);
  localCacheConfig = memoryLocalCache();
}

export const db = app ? initializeFirestore(app, {
  localCache: localCacheConfig,
}) : ({} as any);

export default app;
