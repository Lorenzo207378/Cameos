import { BaseViewModel } from '../BaseViewModel.js';
import { socialRepository as defaultSocialRepository } from '../../repository/social/SocialRepository.js';

/**
 * @typedef {Object} SocialViewModelState
 * @property {Array<any>} incomingRequests
 * @property {Array<any>} outgoingRequests
 * @property {Array<string>} friends
 * @property {Array<import('../../models/User.js').User>} friendsProfiles
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * SocialViewModel
 * ViewModel MVVM per la gestione della rete sociale: richieste di amicizia e profili amici.
 */
export class SocialViewModel extends BaseViewModel {
  /** @type {import('../../repository/social/SocialRepository.js').SocialRepository} */
  repository;

  /**
   * @param {import('../../repository/social/SocialRepository.js').SocialRepository} [repository]
   * @param {Object} [options={}]
   */
  constructor(repository = defaultSocialRepository, options = {}) {
    super(
      {
        incomingRequests: [],
        outgoingRequests: [],
        friends: [],
        friendsProfiles: []
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {SocialViewModelState}
   */
  get state() {
    return /** @type {SocialViewModelState} */ (super.state);
  }

  /**
   * Carica tutte le informazioni sociali dell'utente (richieste in entrata e uscita)
   * @param {string} uid
   * @returns {Promise<Object|null>}
   */
  loadSocialData = (uid) => {
    return this.runAsync(
      'loadSocialData',
      async () => {
        const [incomingRequests, outgoingRequests] = await Promise.all([
          this.repository.getIncomingFriendRequests(uid),
          this.repository.getOutgoingFriendRequests(uid)
        ]);
        return { incomingRequests, outgoingRequests };
      },
      (data) => data
    );
  };

  /**
   * Invia una richiesta di amicizia
   * @param {string} fromUid
   * @param {string} toUid
   * @param {Object} [metadata={}]
   * @returns {Promise<Object|null>}
   */
  sendFriendRequest = (fromUid, toUid, metadata = {}) => {
    return this.runAsync(
      'sendFriendRequest',
      () => this.repository.sendFriendRequest(fromUid, toUid, metadata),
      (created) => ({
        outgoingRequests: [...this.state.outgoingRequests.filter((r) => r.id !== created.id), created]
      })
    );
  };

  /**
   * Accetta una richiesta di amicizia ricevuta
   * @param {string} requestId
   * @param {string} actingUid
   * @returns {Promise<Object|null>}
   */
  acceptFriendRequest = (requestId, actingUid) => {
    return this.runAsync(
      'acceptFriendRequest',
      () => this.repository.acceptFriendRequest(requestId, actingUid),
      (res) => ({
        friends: res.recipientFriends || this.state.friends,
        incomingRequests: this.state.incomingRequests.filter((r) => r.id !== requestId)
      })
    );
  };

  /**
   * Rifiuta o cancella una richiesta di amicizia
   * @param {string} requestId
   * @param {string} [actingUid]
   * @returns {Promise<boolean|null>}
   */
  rejectFriendRequest = (requestId, actingUid = null) => {
    return this.runAsync(
      'rejectFriendRequest',
      async () => {
        await this.repository.rejectFriendRequest(requestId, actingUid);
        return true;
      },
      () => ({
        incomingRequests: this.state.incomingRequests.filter((r) => r.id !== requestId),
        outgoingRequests: this.state.outgoingRequests.filter((r) => r.id !== requestId)
      })
    );
  };

  /**
   * Rimuove un amico esistente
   * @param {string} uid
   * @param {string|Object} friendOrUid
   * @returns {Promise<Array<string>|null>}
   */
  removeFriend = (uid, friendOrUid) => {
    return this.runAsync(
      'removeFriend',
      () => this.repository.removeFriend(uid, friendOrUid),
      (updatedFriends) => ({
        friends: updatedFriends,
        friendsProfiles: this.state.friendsProfiles.filter((f) => f.uid !== friendOrUid)
      })
    );
  };

  /**
   * Risolve e carica i profili User completi degli amici
   * @param {string} uid
   * @returns {Promise<Array<Object>|null>}
   */
  loadFriendsProfiles = (uid) => {
    return this.runAsync(
      'loadFriendsProfiles',
      () => this.repository.getFriendsProfiles(uid),
      (friendsProfiles) => ({ friendsProfiles })
    );
  };
}

export default SocialViewModel;
