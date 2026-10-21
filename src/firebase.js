import { initializeApp } from "firebase/app";
import {
    initializeAuth,
    browserLocalPersistence,
    indexedDBLocalPersistence,
    browserSessionPersistence,
    browserPopupRedirectResolver
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = import.meta.env || (typeof globalThis !== "undefined" && globalThis.process?.env) || {};

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-project",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
    appId: env.VITE_FIREBASE_APP_ID || "1:000000000000:web:000000000000",
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// 1. Inizializza Firebase
const app = initializeApp(firebaseConfig);

// 2. Inizializza ed esporta Authentication (con browserLocalPersistence prioritaria per evitare blocchi IndexedDB nelle WebApp iOS) e Firestore
export const auth = typeof window !== "undefined"
    ? initializeAuth(app, {
        persistence: [
            browserLocalPersistence,
            indexedDBLocalPersistence,
            browserSessionPersistence
        ],
        popupRedirectResolver: browserPopupRedirectResolver
    })
    : initializeAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
