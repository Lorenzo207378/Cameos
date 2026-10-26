import { defaultDb, defaultFirestoreAdapter } from '../firestoreAdapter.js';
import { User } from '../../models/index.js';

const USERS_COLLECTION = 'users';

const USER_ALLOWED_FIELDS = [
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

/**
 * UserBackend
 * Ambito: Gestione del profilo utente e persistenza remota su Cloud Firestore (`users` collection).
 */
export class UserBackend {
  /**
   * @param {import('firebase/firestore').Firestore} [db]
   * @param {Object} [adapter]
   */
  constructor(db = defaultDb, adapter = defaultFirestoreAdapter) {
    this.db = db;
    this.adapter = adapter;
  }

  /**
   * Recupera un utente da Firestore tramite UID
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async getUserById(uid) {
    if (!uid) throw new Error('uid is required');
    const raw = await this.adapter.getDocument(this.db, USERS_COLLECTION, uid);
    return raw ? new User({ ...raw, uid: raw.uid || raw.id || uid }) : null;
  }

  /**
   * Recupera un utente da Firestore tramite username
   * @param {string} username
   * @returns {Promise<User|null>}
   */
  async getUserByUsername(username) {
    const trimmed = (username || '').trim();
    if (!trimmed) return null;

    const [first] = await this.adapter.queryByField(this.db, USERS_COLLECTION, 'username', trimmed);
    return first ? new User({ ...first, uid: first.uid || first.id }) : null;
  }

  /**
   * Verifica se un username è disponibile
   * @param {string} username
   * @param {string|null} [excludeUid=null]
   * @returns {Promise<boolean>}
   */
  async isUsernameAvailable(username, excludeUid = null) {
    const trimmed = (username || '').trim();
    if (trimmed.length < 3) return false;

    const matches = await this.adapter.queryByField(this.db, USERS_COLLECTION, 'username', trimmed);
    return !matches.some((match) => (match.uid || match.id) !== excludeUid);
  }

  /**
   * Inserisce o aggiorna un utente su Firestore in fase di login/registrazione
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<User>}
   */
  async upsertUser(userInput, username = null) {
    const uid = userInput?.uid;
    if (!uid) throw new Error('user.uid is required');

    const existing = await this.adapter.getDocument(this.db, USERS_COLLECTION, uid);
    const nowIso = new Date().toISOString();

    if (!existing) {
      const newUser = new User({
        ...userInput,
        uid,
        username: username ?? userInput.username,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      await this.adapter.setDocument(this.db, USERS_COLLECTION, uid, {
        uid: newUser.uid,
        email: newUser.email,
        username: newUser.username,
        photoURL: newUser.photoURL,
        language: newUser.language,
        friends: newUser.friends,
        watchlist: newUser.watchlist,
        favorites: newUser.favorites,
        watched: newUser.watched,
        reviews: newUser.reviews,
        createdAt: this.adapter.timestamp(),
        updatedAt: this.adapter.timestamp()
      });

      return newUser;
    }

    const updates = { updatedAt: this.adapter.timestamp() };
    if (username) updates.username = username;
    if (userInput.photoURL) updates.photoURL = userInput.photoURL;
    if (userInput.email && !existing.email) updates.email = userInput.email;
    if (userInput.language) updates.language = userInput.language;

    await this.adapter.setDocument(this.db, USERS_COLLECTION, uid, updates, { merge: true });
    return new User({ ...existing, ...updates, uid, updatedAt: nowIso });
  }

  /**
   * Aggiorna gli attributi dell'utente su Firestore
   * @param {string} uid
   * @param {Object} [updates={}]
   * @returns {Promise<User>}
   */
  async updateUser(uid, updates = {}) {
    if (!uid) throw new Error('uid is required');

    const existing = await this.adapter.getDocument(this.db, USERS_COLLECTION, uid);
    const nowIso = new Date().toISOString();

    const updatedUser = new User({
      ...existing,
      ...updates,
      uid,
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    });

    const payload = { uid, updatedAt: this.adapter.timestamp() };
    for (const field of USER_ALLOWED_FIELDS) {
      if (updates[field] !== undefined) {
        payload[field] = updatedUser[field];
      }
    }
    if (!existing) {
      payload.createdAt = this.adapter.timestamp();
    }

    await this.adapter.setDocument(this.db, USERS_COLLECTION, uid, payload, { merge: true });
    return updatedUser;
  }

  /**
   * Elimina il profilo utente da Firestore
   * @param {string} uid
   * @returns {Promise<void>}
   */
  async deleteUserById(uid) {
    if (!uid) throw new Error('uid is required');
    await this.adapter.deleteDocument(this.db, USERS_COLLECTION, uid);
  }
}

export const userBackend = new UserBackend();
export default UserBackend;
