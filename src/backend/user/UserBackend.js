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
import { db as defaultDb } from '../../firebase.js';
import { User } from '../../models/User.js';

/**
 * Default Firestore adapter wrapping the Firebase v9 modular SDK.
 */
const defaultFirestoreAdapter = {
  async getDocument(db, collectionName, docId) {
    const ref = doc(db, collectionName, docId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async setDocument(db, collectionName, docId, data, options = {}) {
    const ref = doc(db, collectionName, docId);
    await setDoc(ref, data, options);
  },

  async deleteDocument(db, collectionName, docId) {
    const ref = doc(db, collectionName, docId);
    await deleteDoc(ref);
  },

  async queryByField(db, collectionName, field, value) {
    const colRef = collection(db, collectionName);
    const q = query(colRef, where(field, '==', value));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  },

  timestamp() {
    return serverTimestamp();
  }
};

/**
 * UserBackend
 * Scope: Handles remote Firestore persistence and retrieval of User domain objects (`users` collection).
 * Always returns typed `User` domain model instances.
 */
export class UserBackend {
  /**
   * @param {import('firebase/firestore').Firestore} [db]
   * @param {Object} [adapter]
   */
  constructor(db = defaultDb, adapter = defaultFirestoreAdapter) {
    this.db = db;
    this.adapter = adapter;
    this.collectionName = 'users';
  }

  /**
   * Retrieve a user from Firestore by UID
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async getUserById(uid) {
    if (!uid) throw new Error('uid is required');

    const raw = await this.adapter.getDocument(this.db, this.collectionName, uid);
    if (!raw) return null;

    return new User({ ...raw, uid: raw.uid || raw.id || uid });
  }

  /**
   * Retrieve a user from Firestore by username
   * @param {string} username
   * @returns {Promise<User|null>}
   */
  async getUserByUsername(username) {
    const trimmed = (username || '').trim();
    if (!trimmed) return null;

    const matches = await this.adapter.queryByField(this.db, this.collectionName, 'username', trimmed);
    if (matches.length === 0) return null;

    const first = matches[0];
    return new User({ ...first, uid: first.uid || first.id });
  }

  /**
   * Check whether a username is available on Firestore
   * @param {string} username
   * @param {string|null} [excludeUid=null]
   * @returns {Promise<boolean>}
   */
  async isUsernameAvailable(username, excludeUid = null) {
    const trimmed = (username || '').trim();
    if (!trimmed || trimmed.length < 3) return false;

    const matches = await this.adapter.queryByField(this.db, this.collectionName, 'username', trimmed);
    return !matches.some((docItem) => (docItem.uid || docItem.id) !== excludeUid);
  }

  /**
   * Create or update a user document in Firestore upon login or registration
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<User>}
   */
  async upsertUser(userInput, username = null) {
    const uid = userInput?.uid;
    if (!uid) throw new Error('user.uid is required');

    const existing = await this.adapter.getDocument(this.db, this.collectionName, uid);
    const nowIso = new Date().toISOString();

    if (!existing) {
      const newUser = new User({
        uid,
        email: userInput.email ?? null,
        username: username ?? userInput.username ?? null,
        photoURL: userInput.photoURL ?? null,
        language: userInput.language || 'it-IT',
        friends: userInput.friends || [],
        watchlist: userInput.watchlist || [],
        reviews: userInput.reviews || [],
        favorites: userInput.favorites || [],
        watched: userInput.watched || [],
        createdAt: nowIso,
        updatedAt: nowIso
      });

      const firestorePayload = {
        ...newUser.toPlainObject(),
        createdAt: this.adapter.timestamp(),
        updatedAt: this.adapter.timestamp()
      };

      await this.adapter.setDocument(this.db, this.collectionName, uid, firestorePayload);
      return newUser;
    }

    const updates = {
      updatedAt: this.adapter.timestamp()
    };

    if (username) {
      updates.username = username;
    }
    if (userInput.photoURL) {
      updates.photoURL = userInput.photoURL;
    }
    if (userInput.email && !existing.email) {
      updates.email = userInput.email;
    }
    if (userInput.language) {
      updates.language = userInput.language;
    }

    await this.adapter.setDocument(this.db, this.collectionName, uid, updates, { merge: true });

    return new User({
      ...existing,
      ...updates,
      uid,
      updatedAt: nowIso
    });
  }

  /**
   * Update user attributes and collections in Firestore
   * @param {string} uid
   * @param {Object} [updates={}]
   * @returns {Promise<User>}
   */
  async updateUser(uid, updates = {}) {
    if (!uid) throw new Error('uid is required');

    const existing = (await this.adapter.getDocument(this.db, this.collectionName, uid)) || { uid };
    const nowIso = new Date().toISOString();

    const allowedFields = [
      'email',
      'username',
      'photoURL',
      'language',
      'friends',
      'watchlist',
      'reviews',
      'favorites',
      'watched'
    ];

    const sanitizedUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    const firestorePayload = {
      ...sanitizedUpdates,
      uid,
      updatedAt: this.adapter.timestamp()
    };

    await this.adapter.setDocument(this.db, this.collectionName, uid, firestorePayload, { merge: true });

    return new User({
      ...existing,
      ...sanitizedUpdates,
      uid,
      createdAt: existing.createdAt || updates.createdAt || nowIso,
      updatedAt: nowIso
    });
  }

  /**
   * Delete user document from Firestore
   * @param {string} uid
   * @returns {Promise<void>}
   */
  async deleteUserById(uid) {
    if (!uid) throw new Error('uid is required');
    await this.adapter.deleteDocument(this.db, this.collectionName, uid);
  }
}

export const userBackend = new UserBackend();
export default UserBackend;
