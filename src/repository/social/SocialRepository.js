import { BaseRepository, STORES } from '../BaseRepository.js';
import { socialBackend as defaultSocialBackend } from '../../backend/social/SocialBackend.js';
import { userBackend as defaultUserBackend } from '../../backend/user/UserBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { extractFriendUid } from '../../models/utils/index.js';

const SESSION_USER_KEY = 'session:current_user';
const userKey = (uid) => `user:${uid}`;

/**
 * SocialRepository
 * Gestisce la rete sociale e la ricerca utenti esclusivamente online su Cloud Firestore,
 * propagando eventuali errori remoti senza fallback o caching locale di altri utenti.
 */
export class SocialRepository extends BaseRepository {
  /**
   * @param {import('../../backend/social/SocialBackend.js').SocialBackend} [backend]
   * @param {import('../../backend/user/UserBackend.js').UserBackend} [userBackend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultSocialBackend, userBackend = defaultUserBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
    this.userBackend = userBackend;
  }

  /**
   * Verifica la presenza di connettività prima di eseguire operazioni social online-only
   * @param {string} action
   */
  _requireOnline(action) {
    if (!this.isOnline()) {
      throw new Error(`Connettività assente: impossibile ${action} offline`);
    }
  }

  /**
   * Esegue un'operazione social esclusivamente su Firestore propagando gli errori remoti
   * @template T
   * @param {string} operation
   * @param {string} action
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async _runOnline(operation, action, fn) {
    this._requireOnline(action);
    try {
      return await fn();
    } catch (error) {
      console.warn(`[SocialRepository] Remote Firestore error (${operation}):`, error);
      throw error;
    }
  }

  /**
   * Mantiene allineata la lista amici sul record locale dell'utente corrente se già presente,
   * senza salvare altri utenti o richieste di amicizia in IndexedDB.
   * @param {string|null|undefined} uid
   * @param {Array<string>} friends
   * @returns {Promise<void>}
   */
  async _syncLocalSelfFriends(uid, friends) {
    if (!uid || !this.storage) return;

    const [localUser, session] = await Promise.all([
      this.storage.get(STORES.USERS, userKey(uid)),
      this.storage.get(STORES.USERS, SESSION_USER_KEY)
    ]);

    if (localUser?.data) {
      await this.storage.put(STORES.USERS, {
        ...localUser,
        data: { ...localUser.data, friends }
      });
    }
    if (session?.uid === uid && session?.data) {
      await this.storage.put(STORES.USERS, {
        ...session,
        data: { ...session.data, friends }
      });
    }
  }

  /**
   * Invia una richiesta di amicizia (richiede connettività)
   * @param {string} fromUid
   * @param {string} toUid
   * @param {Object} [metadata={}]
   * @returns {Promise<import('../../models/FriendRequest.js').FriendRequest>}
   */
  async sendFriendRequest(fromUid, toUid, metadata = {}) {
    return this._runOnline(
      `friend_requests:send:${fromUid}->${toUid}`,
      'inviare richieste di amicizia',
      () => this.backend.sendFriendRequest(fromUid, toUid, metadata)
    );
  }

  /**
   * Richieste di amicizia in entrata (online-only su Firestore)
   * @param {string} uid
   * @returns {Promise<Array<import('../../models/FriendRequest.js').FriendRequest>>}
   */
  async getIncomingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');
    return this._runOnline(
      `friend_requests:incoming:${uid}`,
      'caricare le richieste di amicizia ricevute',
      () => this.backend.getIncomingFriendRequests(uid)
    );
  }

  /**
   * Richieste di amicizia in uscita (online-only su Firestore)
   * @param {string} uid
   * @returns {Promise<Array<import('../../models/FriendRequest.js').FriendRequest>>}
   */
  async getOutgoingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');
    return this._runOnline(
      `friend_requests:outgoing:${uid}`,
      'caricare le richieste di amicizia inviate',
      () => this.backend.getOutgoingFriendRequests(uid)
    );
  }

  /**
   * Accetta una richiesta di amicizia (richiede connettività)
   * @param {string} requestId
   * @param {string} actingUid
   * @returns {Promise<{ recipientUid: string, senderUid: string, recipientFriends: Array<string>, senderFriends: Array<string>, senderProfile?: Object }>}
   */
  async acceptFriendRequest(requestId, actingUid) {
    return this._runOnline(
      `friend_requests:accept:${requestId}`,
      'accettare richieste di amicizia',
      async () => {
        const result = await this.backend.acceptFriendRequest(requestId, actingUid);
        const targetUid = actingUid || result.recipientUid;
        const targetFriends = targetUid === result.senderUid ? result.senderFriends : result.recipientFriends;
        await this._syncLocalSelfFriends(targetUid, targetFriends);
        return result;
      }
    );
  }

  /**
   * Rifiuta o annulla una richiesta di amicizia (richiede connettività)
   * @param {string} requestId
   * @param {string|null} [actingUid=null]
   * @returns {Promise<void>}
   */
  async rejectFriendRequest(requestId, actingUid = null) {
    return this._runOnline(
      `friend_requests:reject:${requestId}`,
      'rifiutare richieste di amicizia',
      () => this.backend.rejectFriendRequest(requestId, actingUid)
    );
  }

  /**
   * Rimuove un'amicizia esistente da entrambi gli utenti
   * @param {string} uid
   * @param {string|Object} friendOrUid
   * @returns {Promise<Array<string>>}
   */
  async removeFriend(uid, friendOrUid) {
    return this._runOnline(
      `friends:remove:${uid}`,
      'rimuovere amici',
      async () => {
        const friendUid = extractFriendUid(friendOrUid);
        const updatedFriends = await this.backend.removeFriendship(uid, friendUid);
        await this._syncLocalSelfFriends(uid, updatedFriends);
        return updatedFriends;
      }
    );
  }

  /**
   * Risolve gli UID degli amici nei rispettivi profili User completi da Firestore
   * @param {string} uid
   * @returns {Promise<Array<import('../../models/User.js').User>>}
   */
  async getFriendsProfiles(uid) {
    if (!uid) throw new Error('uid is required');
    return this._runOnline(
      `friends_profiles:${uid}`,
      'caricare la lista amici',
      async () => {
        const remoteUser = await this.userBackend.getUserById(uid);
        const friendsUids = remoteUser?.friends || [];
        if (friendsUids.length === 0) return [];

        const settled = await Promise.allSettled(
          friendsUids.map((friendUid) => this.userBackend.getUserById(friendUid))
        );

        const profiles = settled.flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []));
        if (profiles.length === 0) {
          const firstFailure = settled.find((result) => result.status === 'rejected');
          if (firstFailure) throw firstFailure.reason;
        }
        return profiles;
      }
    );
  }

  /**
   * Recupera il profilo pubblico di un utente da Firestore (online-only, senza cache locale in STORES.USERS)
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  async getUserProfile(uid) {
    if (!uid) throw new Error('uid is required');
    return this._runOnline(
      `user_profile:${uid}`,
      'caricare il profilo utente',
      () => this.userBackend.getUserById(uid)
    );
  }

  /**
   * Cerca utenti su Firestore escludendo l'utente corrente (online-only)
   * @param {string} query
   * @param {Object} [options={}]
   * @param {string|null} [options.excludeUid=null]
   * @returns {Promise<Array<import('../../models/User.js').User>>}
   */
  async searchUsersByUsername(query, { excludeUid = null } = {}) {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    return this._runOnline(
      `search_users:${trimmed.toLowerCase()}`,
      'cercare gli utenti',
      async () => {
        const matches = await this.userBackend.getUsersByUsername(trimmed);
        return (matches || []).filter((u) => u?.uid && (!excludeUid || u.uid !== excludeUid));
      }
    );
  }
}

export const socialRepository = new SocialRepository();
export default SocialRepository;
