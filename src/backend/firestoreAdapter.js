import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { db as defaultDb } from '../firebase.js';

/**
 * Adapter predefinito per il modular SDK Firebase Firestore v9.
 * Consente l'iniezione di un adapter in-memory durante i test in Node.js.
 */
export const defaultFirestoreAdapter = {
  async getDocument(db, collectionName, docId) {
    const snap = await getDoc(doc(db, collectionName, docId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async setDocument(db, collectionName, docId, data, options = {}) {
    await setDoc(doc(db, collectionName, docId), data, options);
  },

  async deleteDocument(db, collectionName, docId) {
    await deleteDoc(doc(db, collectionName, docId));
  },

  async queryByField(db, collectionName, field, value) {
    const snapshot = await getDocs(query(collection(db, collectionName), where(field, '==', value)));
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  },

  timestamp() {
    return serverTimestamp();
  }
};

export { defaultDb };
