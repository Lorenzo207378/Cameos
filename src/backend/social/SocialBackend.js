import { defaultDb, defaultFirestoreAdapter } from '../firestoreAdapter.js';
import { notificationBackend as defaultNotificationBackend } from '../notifications/NotificationBackend.js';
import { FriendRequest, NOTIFICATION_TYPES, extractFriendUid, uniqueStrings } from '../../models/index.js';

const FRIEND_REQUESTS_COLLECTION = 'friend_requests';
const USERS_COLLECTION = 'users';

/**
 * SocialBackend
 * Ambito: Gestione remota delle relazioni sociali (richieste di amicizia e lista amici) su Cloud Firestore.
 */
export class SocialBackend {
  /**
   * @param {import('firebase/firestore').Firestore} [db]
   * @param {Object} [adapter]
   * @param {import('../notifications/NotificationBackend.js').NotificationBackend} [notificationBackend]
   */
  constructor(db = defaultDb, adapter = defaultFirestoreAdapter, notificationBackend = defaultNotificationBackend) {
    this.db = db;
    this.adapter = adapter;
    this.notificationBackend = notificationBackend;
  }

  /**
   * Invia una richiesta di amicizia da un utente all'altro
   * @param {string} fromUid
   * @param {string} toUid
   * @param {Object} [metadata={}]
   * @returns {Promise<FriendRequest>}
   */
  async sendFriendRequest(fromUid, toUid, metadata = {}) {
    const from = extractFriendUid(fromUid);
    const to = extractFriendUid(toUid);
    if (!from || !to) throw new Error('fromUid and toUid are required');
    if (from === to) throw new Error('Cannot send a friend request to yourself');

    const requestId = FriendRequest.buildId(from, to);
    const reverseRequestId = FriendRequest.buildId(to, from);

    const [senderDoc, recipientDoc, directRequest, reverseRequest] = await Promise.all([
      this.adapter.getDocument(this.db, USERS_COLLECTION, from),
      this.adapter.getDocument(this.db, USERS_COLLECTION, to),
      this.adapter.getDocument(this.db, FRIEND_REQUESTS_COLLECTION, requestId),
      this.adapter.getDocument(this.db, FRIEND_REQUESTS_COLLECTION, reverseRequestId)
    ]);

    if ((senderDoc?.friends || []).includes(to)) {
      throw new Error('Users are already friends');
    }
    if (directRequest) {
      throw new Error('Friend request already pending for this user');
    }
    if (reverseRequest) {
      throw new Error('This user has already sent you a pending friend request');
    }

    const request = new FriendRequest({
      id: requestId,
      fromUid: from,
      fromUsername: metadata.fromUsername || senderDoc?.username,
      fromPhotoURL: metadata.fromPhotoURL || senderDoc?.photoURL,
      toUid: to,
      toUsername: metadata.toUsername || recipientDoc?.username
    });

    await this.adapter.setDocument(this.db, FRIEND_REQUESTS_COLLECTION, request.id, {
      id: request.id,
      fromUid: request.fromUid,
      fromUsername: request.fromUsername,
      fromPhotoURL: request.fromPhotoURL,
      toUid: request.toUid,
      toUsername: request.toUsername,
      status: request.status,
      createdAt: request.createdAt
    });

    await this.notificationBackend.notifySafely({
      recipientUid: to,
      senderUid: from,
      senderUsername: request.fromUsername,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST,
      title: 'Nuova richiesta di amicizia',
      message: `${request.fromUsername || from} ti ha inviato una richiesta di amicizia.`,
      referenceId: request.id,
      payload: { requestId: request.id }
    });

    return request;
  }

  /**
   * Richieste di amicizia pendenti ricevute da un utente (toUid == uid)
   * @param {string} uid
   * @returns {Promise<Array<FriendRequest>>}
   */
  async getIncomingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');
    const docs = await this.adapter.queryByField(this.db, FRIEND_REQUESTS_COLLECTION, 'toUid', uid);
    return docs.map((data) => new FriendRequest(data));
  }

  /**
   * Richieste di amicizia pendenti inviate da un utente (fromUid == uid)
   * @param {string} uid
   * @returns {Promise<Array<FriendRequest>>}
   */
  async getOutgoingFriendRequests(uid) {
    if (!uid) throw new Error('uid is required');
    const docs = await this.adapter.queryByField(this.db, FRIEND_REQUESTS_COLLECTION, 'fromUid', uid);
    return docs.map((data) => new FriendRequest(data));
  }

  /**
   * Accetta una richiesta di amicizia pendente.
   * Aggiunge reciprocamente gli UID nella lista friends dei due utenti,
   * elimina il documento pending ed invia una notifica al mittente.
   * @param {string} requestId
   * @param {string} actingUid - UID dell'utente che accetta (deve essere il destinatario)
   * @returns {Promise<{ recipientFriends: Array<string>, senderFriends: Array<string>, recipientUid: string, senderUid: string }>}
   */
  async acceptFriendRequest(requestId, actingUid) {
    const raw = requestId ? await this.adapter.getDocument(this.db, FRIEND_REQUESTS_COLLECTION, requestId) : null;
    if (!raw) throw new Error(`Friend request "${requestId}" not found`);

    const request = new FriendRequest(raw);
    if (actingUid && request.toUid !== actingUid) {
      throw new Error('Only the recipient can accept a friend request');
    }

    const [senderDoc, recipientDoc] = await Promise.all([
      this.adapter.getDocument(this.db, USERS_COLLECTION, request.fromUid),
      this.adapter.getDocument(this.db, USERS_COLLECTION, request.toUid)
    ]);

    const senderFriends = uniqueStrings([...(senderDoc?.friends || []), request.toUid]);
    const recipientFriends = uniqueStrings([...(recipientDoc?.friends || []), request.fromUid]);

    await Promise.all([
      this.adapter.setDocument(
        this.db,
        USERS_COLLECTION,
        request.fromUid,
        { friends: senderFriends, updatedAt: this.adapter.timestamp() },
        { merge: true }
      ),
      this.adapter.setDocument(
        this.db,
        USERS_COLLECTION,
        request.toUid,
        { friends: recipientFriends, updatedAt: this.adapter.timestamp() },
        { merge: true }
      ),
      this.adapter.deleteDocument(this.db, FRIEND_REQUESTS_COLLECTION, request.id)
    ]);

    const recipientUsername = recipientDoc?.username || actingUid;
    await this.notificationBackend.notifySafely({
      recipientUid: request.fromUid,
      senderUid: request.toUid,
      senderUsername: recipientUsername,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST_ACCEPTED,
      title: 'Richiesta di amicizia accettata',
      message: `${recipientUsername} ha accettato la tua richiesta di amicizia.`,
      referenceId: request.id,
      payload: { friendUid: request.toUid }
    });

    return {
      recipientUid: request.toUid,
      senderUid: request.fromUid,
      recipientFriends,
      senderFriends
    };
  }

  /**
   * Rifiuta o annulla una richiesta di amicizia pendente eliminandola
   * @param {string} requestId
   * @param {string} [actingUid]
   * @returns {Promise<void>}
   */
  async rejectFriendRequest(requestId, actingUid = null) {
    const raw = requestId ? await this.adapter.getDocument(this.db, FRIEND_REQUESTS_COLLECTION, requestId) : null;
    if (!raw) return;

    const request = new FriendRequest(raw);
    if (actingUid && actingUid !== request.toUid && actingUid !== request.fromUid) {
      throw new Error('Only sender or recipient can discard a friend request');
    }

    await this.adapter.deleteDocument(this.db, FRIEND_REQUESTS_COLLECTION, request.id);
  }

  /**
   * Rimuove un'amicizia esistente da entrambi gli utenti
   * @param {string} uid
   * @param {string|Object} friendOrUid
   * @returns {Promise<Array<string>>} Nuova lista amici di `uid`
   */
  async removeFriendship(uid, friendOrUid) {
    const friendUid = extractFriendUid(friendOrUid);
    if (!uid || !friendUid) throw new Error('uid and friendUid are required');

    const [userDoc, friendDoc] = await Promise.all([
      this.adapter.getDocument(this.db, USERS_COLLECTION, uid),
      this.adapter.getDocument(this.db, USERS_COLLECTION, friendUid)
    ]);

    const updatedUserFriends = (userDoc?.friends || []).filter((id) => id !== friendUid);
    const updatedFriendFriends = (friendDoc?.friends || []).filter((id) => id !== uid);

    await Promise.all([
      this.adapter.setDocument(
        this.db,
        USERS_COLLECTION,
        uid,
        { friends: updatedUserFriends, updatedAt: this.adapter.timestamp() },
        { merge: true }
      ),
      friendDoc
        ? this.adapter.setDocument(
            this.db,
            USERS_COLLECTION,
            friendUid,
            { friends: updatedFriendFriends, updatedAt: this.adapter.timestamp() },
            { merge: true }
          )
        : null
    ]);

    return updatedUserFriends;
  }
}

export const socialBackend = new SocialBackend();
export default SocialBackend;
