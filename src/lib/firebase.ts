import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager,
  persistentSingleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "telemsg-app",
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:209402570311:web:f3cce87fdfded18a803362",
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyCik2rjcl7TKRiLGhGw8ID5YZepiAJHCSs",
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "telemsg-app.firebaseapp.com",
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "telemsg-app.firebasestorage.app",
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "209402570311",
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

// Initialize Firebase App safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Check if running inside Google AI Studio preview or local dev server
const isAIStudio = typeof window !== "undefined" && (
  window.location.hostname.includes("run.app") || 
  window.location.hostname.includes("aistudio") || 
  window.location.hostname.includes("localhost") ||
  window.location.hostname.includes("127.0.0.1")
);

let db: any;

const initFirestoreWithConfig = (config: any) => {
  return initializeFirestore(app, config, "ai-studio-1c44d389-e5a0-4e9f-ab46-06546753cae9");
};

// Safe Firestore initialization with multi-stage fallback
try {
  // 1. Try with Multi-Tab persistence (best for desktop browsers)
  db = initFirestoreWithConfig({
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log("Firestore initialized with persistentMultipleTabManager");
} catch (e1) {
  console.warn("Firestore persistentMultipleTabManager failed, trying Single-Tab manager...", e1);
  try {
    // 2. Try with Single-Tab persistence (better for some mobile webviews)
    db = initFirestoreWithConfig({
      experimentalForceLongPolling: true,
      localCache: persistentLocalCache({
        tabManager: persistentSingleTabManager({ forceOwnership: true })
      })
    });
    console.log("Firestore initialized with persistentSingleTabManager");
  } catch (e2) {
    console.warn("Firestore persistentSingleTabManager failed, trying default persistent cache...", e2);
    try {
      // 3. Try with basic persistent cache (let SDK choose best defaults)
      db = initFirestoreWithConfig({
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache()
      });
      console.log("Firestore initialized with default persistentLocalCache");
    } catch (e3) {
      console.warn("Firestore persistentLocalCache failed, trying default initialization...", e3);
      try {
        // 4. Try standard initialization with only long polling
        db = initFirestoreWithConfig({
          experimentalForceLongPolling: true
        });
        console.log("Firestore initialized with standard long polling");
      } catch (e4) {
        // 5. Hard fallback to standard getFirestore (simplest, never throws)
        console.error("All custom Firestore initializations failed. Using getFirestore fallback.", e4);
        db = getFirestore(app);
      }
    }
  }
}

export { db };
export const storage = getStorage(app);
