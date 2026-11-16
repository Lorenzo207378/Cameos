import { initializeApp } from "firebase/app";
import {
    initializeAuth,
    browserLocalPersistence,
    indexedDBLocalPersistence,
    browserSessionPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env?.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID
};

// 1. Inizializza Firebase
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// 2. Inizializza ed esporta Authentication e Firestore senza iframe preemptivo
export const auth = app
    ? (typeof window !== "undefined"
        ? initializeAuth(app, {
            persistence: [
                browserLocalPersistence,
                indexedDBLocalPersistence,
                browserSessionPersistence
            ]
        })
        : initializeAuth(app))
    : null;
export const db = app ? getFirestore(app) : null;
export default app;
