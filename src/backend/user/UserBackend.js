import { defaultDb, defaultFirestoreAdapter } from '../firestoreAdapter.js';
import { User } from '../../models/User.js';

const USERS_COLLECTION = 'users';
const MAX_AVATAR_BYTES = 512 * 1024;
const AVATAR_FETCH_TIMEOUT_MS = 5000;

/**
 * Convert a Blob to a base64 Data URL in browser environments.
 * @param {Blob} blob
 * @returns {Promise<string|null>}
 */
function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' && reader.result.startsWith('data:image/') ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

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
   * @param {import('firebase/firestore').Firestore|null} [db]
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
   * Recupera gli utenti il cui username inizia con la stringa fornita
   * @param {string} query
   * @returns {Promise<Array<User>>}
   */
  async getUsersByUsername(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const lower = trimmed.toLowerCase();
    const raws = typeof this.adapter.getCollection === 'function'
      ? await this.adapter.getCollection(this.db, USERS_COLLECTION)
      : [];

    return raws
      .filter((raw) => (raw.username || '').toLowerCase().startsWith(lower) || (raw.uid || raw.id) === trimmed)
      .map((raw) => new User({ ...raw, uid: raw.uid || raw.id }));
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
   * Scarica l'avatar remoto in ambiente browser e lo converte in Data URL per persistenza offline locale.
   * Restituisce `null` in ambienti headless o in caso di errori di rete/CORS.
   * @param {string|null|undefined} photoURL
   * @returns {Promise<string|null>}
   */
  async fetchAvatarDataUrl(photoURL) {
    if (
      typeof window === 'undefined'
      || typeof fetch !== 'function'
      || typeof FileReader === 'undefined'
      || typeof photoURL !== 'string'
      || !/^https?:\/\//i.test(photoURL)
    ) {
      return null;
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), AVATAR_FETCH_TIMEOUT_MS) : null;

    try {
      const response = await fetch(photoURL, {
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: controller?.signal
      });
      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob.type.startsWith('image/') || blob.size === 0 || blob.size > MAX_AVATAR_BYTES) {
        return null;
      }
      return await blobToDataUrl(blob);
    } catch {
      return null;
    } finally {
      if (timer !== null) clearTimeout(timer);
    }
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
