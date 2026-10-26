import { BaseRepository, STORES } from '../BaseRepository.js';
import { socialBackend as defaultSocialBackend } from '../../backend/social/SocialBackend.js';
import { userBackend as defaultUserBackend } from '../../backend/user/UserBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { FriendRequest, User, extractFriendUid } from '../../models/index.js';

const friendRequestKey = (requestId) => `freq:${requestId}`;
const userKey = (uid) => `user:${uid}`;

/**
 * SocialRepository
 * Gestisce la rete sociale dell'utente (richieste di amicizia e lista amici).
 * Strategia: Network-First su Firestore con fallback locale su IndexedDB (`STORES.FRIEND_REQUESTS`).
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
   * Converte le richieste di amicizia in record IndexedDB
   * @param {Array<FriendRequest>} requests
   * @returns {Array<Object>}
   */
  friendRequestRecords(requests) {
    return requests.map((request) => ({
      cacheKey: friendRequestKey(request.id),
      fromUid: request.fromUid,
      toUid: request.toUid,
      data: { ...request }
    }));
  }

  /**
   * Invia una richiesta di amicizia (richiede connettività)
   * @param {string} fromUid
   * @param {string} toUid
   * @param {Object} [metadata={}]
   * @returns {Promise<FriendRequest>}
   */
  async sendFriendRequest(fromUid, toUid, metadata = {}) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile inviare richieste di amicizia offline');
    }

    const request = await this.backend.sendFriendRequest(fromUid, toUid, metadata);
    await this.storage.putMany(STORES.FRIEND_REQUESTS, this.friendRequestRecords([request]));
    return request;
  }

  /**
   * Richieste di amicizia in entrata (Network-First + IndexedDB Fallback)
   * @param {string} uid
   * @returns {Promise<Array<FriendRequest>>}
   */
  async getIncomingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');

    return this.executeWithFallback({
      context: `friend_requests:incoming:${uid}`,
      fetchRemote: () => this.backend.getIncomingFriendRequests(uid),
      saveLocal: async (requests) => {
        const stale = await this.storage.getByIndex(STORES.FRIEND_REQUESTS, 'toUid', uid);
        await Promise.all(stale.map((r) => this.storage.delete(STORES.FRIEND_REQUESTS, r.cacheKey)));
        await this.storage.putMany(STORES.FRIEND_REQUESTS, this.friendRequestRecords(requests));
      },
      getLocal: async () => {
        const records = await this.storage.getByIndex(STORES.FRIEND_REQUESTS, 'toUid', uid);
        return records.map((r) => new FriendRequest(r.data));
      }
    });
  }

  /**
   * Richieste di amicizia in uscita (Network-First + IndexedDB Fallback)
   * @param {string} uid
   * @returns {Promise<Array<FriendRequest>>}
   */
  async getOutgoingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');

    return this.executeWithFallback({
      context: `friend_requests:outgoing:${uid}`,
      fetchRemote: () => this.backend.getOutgoingFriendRequests(uid),
      saveLocal: async (requests) => {
        const stale = await this.storage.getByIndex(STORES.FRIEND_REQUESTS, 'fromUid', uid);
        await Promise.all(stale.map((r) => this.storage.delete(STORES.FRIEND_REQUESTS, r.cacheKey)));
        await this.storage.putMany(STORES.FRIEND_REQUESTS, this.friendRequestRecords(requests));
      },
      getLocal: async () => {
        const records = await this.storage.getByIndex(STORES.FRIEND_REQUESTS, 'fromUid', uid);
        return records.map((r) => new FriendRequest(r.data));
      }
    });
  }

  /**
   * Accetta una richiesta di amicizia (richiede connettività)
   * @param {string} requestId
   * @param {string} actingUid
   * @returns {Promise<{ recipientFriends: Array<string>, senderFriends: Array<string> }>}
   */
  async acceptFriendRequest(requestId, actingUid) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile accettare richieste di amicizia offline');
    }

    const result = await this.backend.acceptFriendRequest(requestId, actingUid);
    await this.storage.delete(STORES.FRIEND_REQUESTS, friendRequestKey(requestId));

    // Aggiorna la cache locale dei due utenti se presente in IndexedDB
    const [localRecipient, localSender] = await Promise.all([
      this.storage.get(STORES.USERS, userKey(result.recipientUid)),
      this.storage.get(STORES.USERS, userKey(result.senderUid))
    ]);

    if (localRecipient?.data) {
      await this.storage.put(STORES.USERS, {
        ...localRecipient,
        data: { ...localRecipient.data, friends: result.recipientFriends }
      });
    }
    if (localSender?.data) {
      await this.storage.put(STORES.USERS, {
        ...localSender,
        data: { ...localSender.data, friends: result.senderFriends }
      });
    }

    return result;
  }

  /**
   * Rifiuta o annulla una richiesta di amicizia (richiede connettività)
   * @param {string} requestId
   * @param {string} [actingUid]
   * @returns {Promise<void>}
   */
  async rejectFriendRequest(requestId, actingUid = null) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile rifiutare richieste di amicizia offline');
    }

    await this.backend.rejectFriendRequest(requestId, actingUid);
    await this.storage.delete(STORES.FRIEND_REQUESTS, friendRequestKey(requestId));
  }

  /**
   * Rimuove un'amicizia esistente da entrambi gli utenti
   * @param {string} uid
   * @param {string|Object} friendOrUid
   * @returns {Promise<Array<string>>}
   */
  async removeFriend(uid, friendOrUid) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile rimuovere amici offline');
    }

    const friendUid = extractFriendUid(friendOrUid);
    const updatedFriends = await this.backend.removeFriendship(uid, friendUid);

    const localUser = await this.storage.get(STORES.USERS, userKey(uid));
    if (localUser?.data) {
      await this.storage.put(STORES.USERS, {
        ...localUser,
        data: { ...localUser.data, friends: updatedFriends }
      });
    }

    return updatedFriends;
  }

  /**
   * Risolve gli UID degli amici nei rispettivi profili User completi
   * @param {string} uid
   * @returns {Promise<Array<User>>}
   */
  async getFriendsProfiles(uid) {
    let friendsUids;
    const localUser = await this.storage.get(STORES.USERS, userKey(uid));

    if (this.isOnline()) {
      try {
        const remoteUser = await this.userBackend.getUserById(uid);
        friendsUids = remoteUser?.friends || [];
      } catch {
        friendsUids = localUser?.data?.friends || [];
      }
    } else {
      friendsUids = localUser?.data?.friends || [];
    }

    const settled = await Promise.allSettled(
      friendsUids.map(async (friendUid) => {
        if (this.isOnline()) {
          try {
            const remote = await this.userBackend.getUserById(friendUid);
            if (remote) return remote;
          } catch {
            // fallback locale sotto
          }
        }
        const cached = await this.storage.get(STORES.USERS, userKey(friendUid));
        return cached?.data ? new User(cached.data) : null;
      })
    );

    return settled
      .filter((res) => res.status === 'fulfilled' && res.value)
      .map((res) => res.value);
  }
}

export const socialRepository = new SocialRepository();
export default SocialRepository;
