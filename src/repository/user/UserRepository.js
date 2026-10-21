import { BaseRepository, STORES } from '../BaseRepository.js';
import { userBackend as defaultUserBackend } from '../../backend/user/UserBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { User, extractItemKey } from '../../models/index.js';

const SESSION_USER_KEY = 'session:current_user';

/**
 * UserRepository
 * Coordinates User persistence and updates across remote Firestore (`UserBackend`)
 * and local IndexedDB (`STORES.USERS`).
 * - Online: reads/writes Firestore and keeps IndexedDB updated with fresh `User` data.
 * - Offline / Network Error: falls back to reading/updating IndexedDB (`pendingSync: true`)
 *   and synchronizes pending updates to Firestore when connectivity returns.
 */
export class UserRepository extends BaseRepository {
  /**
   * @param {import('../../backend/user/UserBackend.js').UserBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultUserBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * @param {string} uid
   * @returns {string}
   */
  _userKey(uid) {
    return `user:${uid}`;
  }

  /**
   * Persist a User instance into IndexedDB (and update session user if matching)
   * @param {User|Object} user
   * @param {Object} [options={}]
   * @param {boolean} [options.pendingSync=false]
   * @param {boolean} [options.isSessionUser=false]
   * @returns {Promise<User>}
   */
  async _saveUserLocal(user, { pendingSync = false, isSessionUser = false } = {}) {
    const instance = user instanceof User ? user : new User(user);
    if (!instance.uid) throw new Error('User.uid is required for local persistence');

    const baseRecord = {
      uid: instance.uid,
      username: instance.username,
      pendingSync,
      data: instance.toPlainObject()
    };

    await this.storage.put(STORES.USERS, {
      ...baseRecord,
      cacheKey: this._userKey(instance.uid)
    });

    const currentSession = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    if (isSessionUser || currentSession?.uid === instance.uid) {
      await this.storage.put(STORES.USERS, {
        ...baseRecord,
        cacheKey: SESSION_USER_KEY
      });
    }

    return instance;
  }

  /**
   * Synchronize any pending offline user modifications from IndexedDB to Firestore
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async syncPendingChanges(uid) {
    if (!uid || !this.isOnline()) return null;

    const localRecord = await this.storage.get(STORES.USERS, this._userKey(uid));
    if (!localRecord?.pendingSync || !localRecord?.data) {
      return localRecord?.data ? new User(localRecord.data) : null;
    }

    try {
      const syncedUser = await this.backend.updateUser(uid, localRecord.data);
      await this._saveUserLocal(syncedUser, { pendingSync: false });
      return syncedUser;
    } catch (err) {
      console.warn(`[UserRepository] Sync modifiche pendenti fallito per ${uid}:`, err);
      return new User(localRecord.data);
    }
  }

  /**
   * Get User by UID (Network-First from Firestore + IndexedDB Fallback)
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async getUser(uid) {
    if (!uid) throw new Error('uid is required');
    const cacheKey = this._userKey(uid);

    if (this.isOnline()) {
      await this.syncPendingChanges(uid);
    }

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getUserById(uid),
      saveLocal: async (freshUser) => {
        if (freshUser) {
          await this._saveUserLocal(freshUser, { pendingSync: false });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.USERS, cacheKey);
        return cached?.data ? new User(cached.data) : null;
      }
    });
  }

  /**
   * Save or upsert User on login / registration (Firestore + IndexedDB Session & Store)
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<User>}
   */
  async saveUser(userInput, username = null) {
    const uid = userInput?.uid;
    if (!uid) throw new Error('user.uid is required');

    if (this.isOnline()) {
      try {
        await this.syncPendingChanges(uid);
        const remoteUser = await this.backend.upsertUser(userInput, username);
        const savedUser = await this._saveUserLocal(remoteUser, { pendingSync: false, isSessionUser: true });
        return savedUser;
      } catch (err) {
        console.warn(`[UserRepository] Salvataggio remoto fallito per ${uid}, fallback su IndexedDB:`, err);
      }
    }

    const existingData = (await this.storage.get(STORES.USERS, this._userKey(uid)))?.data || {};
    const nowIso = new Date().toISOString();

    const fallbackUser = new User({
      ...existingData,
      uid,
      email: userInput.email ?? existingData.email ?? null,
      username: username ?? userInput.username ?? existingData.username ?? null,
      photoURL: userInput.photoURL ?? existingData.photoURL ?? null,
      language: userInput.language || existingData.language || 'it-IT',
      createdAt: existingData.createdAt || nowIso,
      updatedAt: nowIso
    });

    return this._saveUserLocal(fallbackUser, { pendingSync: true, isSessionUser: true });
  }

  /**
   * Update User attributes or collections remotely on Firestore and locally in IndexedDB.
   * When offline or on remote error, applies update locally in IndexedDB (`pendingSync: true`).
   * @param {string} uid
   * @param {Object} [updates={}]
   * @returns {Promise<User>}
   */
  async updateUser(uid, updates = {}) {
    if (!uid) throw new Error('uid is required');

    if (this.isOnline()) {
      try {
        await this.syncPendingChanges(uid);
        const updatedRemote = await this.backend.updateUser(uid, updates);
        const savedUser = await this._saveUserLocal(updatedRemote, { pendingSync: false });
        return savedUser;
      } catch (err) {
        console.warn(`[UserRepository] Aggiornamento remoto fallito per ${uid}, salvataggio locale in IndexedDB:`, err);
      }
    }

    const baseData = (await this.storage.get(STORES.USERS, this._userKey(uid)))?.data || { uid };
    const nowIso = new Date().toISOString();

    const updatedLocal = new User({
      ...baseData,
      ...updates,
      uid,
      createdAt: baseData.createdAt || nowIso,
      updatedAt: nowIso
    });

    return this._saveUserLocal(updatedLocal, { pendingSync: true });
  }

  /**
   * Update user preferred language ('it-IT' | 'en-US')
   * @param {string} uid
   * @param {string} language
   * @returns {Promise<User>}
   */
  async updateLanguage(uid, language) {
    return this.updateUser(uid, { language: this.normalizeLanguage(language) });
  }

  /**
   * Update user profile fields (username, photoURL, language)
   * @param {string} uid
   * @param {Object} [profileUpdates={}]
   * @param {string} [profileUpdates.username]
   * @param {string} [profileUpdates.photoURL]
   * @param {string} [profileUpdates.language]
   * @returns {Promise<User>}
   */
  async updateProfile(uid, { username, photoURL, language } = {}) {
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (photoURL !== undefined) updates.photoURL = photoURL;
    if (language !== undefined) updates.language = this.normalizeLanguage(language);
    return this.updateUser(uid, updates);
  }

  /**
   * Internal helper to add or replace an item inside one of the User's array collections
   * @param {string} uid
   * @param {string} collectionField
   * @param {*} item
   * @returns {Promise<User>}
   */
  async _addToCollection(uid, collectionField, item) {
    if (!uid) throw new Error('uid is required');
    const currentUser = (await this.getUser(uid)) || new User({ uid });
    const list = Array.isArray(currentUser[collectionField]) ? [...currentUser[collectionField]] : [];
    const targetKey = extractItemKey(item);

    const existingIndex = targetKey !== null ? list.findIndex((entry) => extractItemKey(entry) === targetKey) : -1;

    if (existingIndex >= 0) {
      list[existingIndex] = item;
    } else {
      list.push(item);
    }

    return this.updateUser(uid, { [collectionField]: list });
  }

  /**
   * Internal helper to remove an item from one of the User's array collections
   * @param {string} uid
   * @param {string} collectionField
   * @param {*} itemOrId
   * @returns {Promise<User>}
   */
  async _removeFromCollection(uid, collectionField, itemOrId) {
    if (!uid) throw new Error('uid is required');
    const currentUser = (await this.getUser(uid)) || new User({ uid });
    const list = Array.isArray(currentUser[collectionField]) ? [...currentUser[collectionField]] : [];
    const targetKey = extractItemKey(itemOrId);

    const filtered = list.filter((entry) => extractItemKey(entry) !== targetKey);
    return this.updateUser(uid, { [collectionField]: filtered });
  }

  /**
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<User>}
   */
  async addToWatchlist(uid, item) {
    return this._addToCollection(uid, 'watchlist', item);
  }

  /**
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<User>}
   */
  async removeFromWatchlist(uid, itemOrId) {
    return this._removeFromCollection(uid, 'watchlist', itemOrId);
  }

  /**
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<User>}
   */
  async addToFavorites(uid, item) {
    return this._addToCollection(uid, 'favorites', item);
  }

  /**
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<User>}
   */
  async removeFromFavorites(uid, itemOrId) {
    return this._removeFromCollection(uid, 'favorites', itemOrId);
  }

  /**
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<User>}
   */
  async addToWatched(uid, item) {
    return this._addToCollection(uid, 'watched', item);
  }

  /**
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<User>}
   */
  async removeFromWatched(uid, itemOrId) {
    return this._removeFromCollection(uid, 'watched', itemOrId);
  }

  /**
   * @param {string} uid
   * @param {*} review
   * @returns {Promise<User>}
   */
  async addReview(uid, review) {
    return this._addToCollection(uid, 'reviews', review);
  }

  /**
   * @param {string} uid
   * @param {*} reviewOrId
   * @returns {Promise<User>}
   */
  async removeReview(uid, reviewOrId) {
    return this._removeFromCollection(uid, 'reviews', reviewOrId);
  }

  /**
   * @param {string} uid
   * @param {*} friend
   * @returns {Promise<User>}
   */
  async addFriend(uid, friend) {
    return this._addToCollection(uid, 'friends', friend);
  }

  /**
   * @param {string} uid
   * @param {*} friendOrUid
   * @returns {Promise<User>}
   */
  async removeFriend(uid, friendOrUid) {
    return this._removeFromCollection(uid, 'friends', friendOrUid);
  }

  /**
   * Retrieve cached session user from IndexedDB (for instant offline/online autologin)
   * @param {string|null} [uid=null]
   * @returns {Promise<User|null>}
   */
  async getSessionUser(uid = null) {
    if (uid) {
      try {
        const user = await this.getUser(uid);
        if (user) {
          await this._saveUserLocal(user, { isSessionUser: true });
          return user;
        }
      } catch {
        const localByUid = await this.storage.get(STORES.USERS, this._userKey(uid));
        if (localByUid?.data) return new User(localByUid.data);
      }
    }

    const sessionRecord = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    return sessionRecord?.data ? new User(sessionRecord.data) : null;
  }

  /**
   * Clear active session user from IndexedDB upon logout
   * @returns {Promise<void>}
   */
  async clearSessionUser() {
    await this.storage.delete(STORES.USERS, SESSION_USER_KEY);
  }

  /**
   * Delete user from both Firestore and local IndexedDB
   * @param {string} uid
   * @returns {Promise<void>}
   */
  async deleteUser(uid) {
    if (!uid) throw new Error('uid is required');

    if (this.isOnline()) {
      await this.backend.deleteUserById(uid);
    }

    await this.storage.delete(STORES.USERS, this._userKey(uid));
    const sessionRecord = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    if (sessionRecord?.uid === uid) {
      await this.storage.delete(STORES.USERS, SESSION_USER_KEY);
    }
  }
}

export const userRepository = new UserRepository();
export default UserRepository;
