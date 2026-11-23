import { BaseViewModel } from '../BaseViewModel.js';
import { socialRepository as defaultSocialRepository } from '../../repository/social/SocialRepository.js';
import { User, extractFriendUid } from '../../models/utils/index.js';

/**
 * @typedef {Object} SocialViewModelState
 * @property {Array<any>} incomingRequests
 * @property {Array<any>} outgoingRequests
 * @property {Array<string>} friends
 * @property {Array<import('../../models/User.js').User>} friendsProfiles
 * @property {Array<import('../../models/User.js').User>} searchResults
 * @property {boolean} isSearching
 * @property {string|null} searchError
 * @property {string} searchQuery
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
        friendsProfiles: [],
        searchResults: [],
        isSearching: false,
        searchError: null,
        searchQuery: ''
      },
      options
    );
    this.repository = repository;
    this._searchSeq = 0;
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
   * Carica tutte le informazioni sociali dell'utente (richieste in entrata/uscita e profili amici)
   * @param {string} uid
   * @returns {Promise<Object|null>}
   */
  loadSocialData = (uid) => {
    if (!uid) {
      this.setState({
        incomingRequests: [],
        outgoingRequests: [],
        friends: [],
        friendsProfiles: []
      });
      return Promise.resolve({ incomingRequests: [], outgoingRequests: [], friendsProfiles: [] });
    }

    return this.runAsync(
      'loadSocialData',
      async () => {
        const [incomingRequests, outgoingRequests, friendsProfiles] = await Promise.all([
          this.repository.getIncomingFriendRequests(uid),
          this.repository.getOutgoingFriendRequests(uid),
          typeof this.repository.getFriendsProfiles === 'function'
            ? this.repository.getFriendsProfiles(uid)
            : Promise.resolve([])
        ]);
        const safeProfiles = Array.isArray(friendsProfiles) ? friendsProfiles : [];
        return {
          incomingRequests: Array.isArray(incomingRequests) ? incomingRequests : [],
          outgoingRequests: Array.isArray(outgoingRequests) ? outgoingRequests : [],
          friendsProfiles: safeProfiles,
          friends: safeProfiles.map((f) => f.uid).filter(Boolean)
        };
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
   * Accetta una richiesta di amicizia ricevuta e aggiorna la lista profili amici
   * @param {string} requestId
   * @param {string} actingUid
   * @returns {Promise<Object|null>}
   */
  acceptFriendRequest = (requestId, actingUid) => {
    const acceptedReq = this.state.incomingRequests.find((r) => r.id === requestId);
    let refreshedProfiles = null;
    return this.runAsync(
      'acceptFriendRequest',
      async () => {
        const res = await this.repository.acceptFriendRequest(requestId, actingUid);
        const senderData = res?.senderProfile;
        if (!senderData && !acceptedReq?.fromUid && actingUid && typeof this.repository.getFriendsProfiles === 'function') {
          try {
            refreshedProfiles = await this.repository.getFriendsProfiles(actingUid);
          } catch {
            refreshedProfiles = null;
          }
        }
        return res;
      },
      (res) => {
        const senderData = res?.senderProfile || (acceptedReq?.fromUid
          ? {
              uid: acceptedReq.fromUid,
              username: acceptedReq.fromUsername || acceptedReq.fromUid,
              photoURL: acceptedReq.fromPhotoURL || null
            }
          : null);
        const nextProfiles = senderData?.uid && !this.state.friendsProfiles.some((f) => f.uid === senderData.uid)
          ? [...this.state.friendsProfiles, new User(senderData)]
          : this.state.friendsProfiles;
        return {
          friends: res.recipientFriends || this.state.friends,
          friendsProfiles: Array.isArray(refreshedProfiles) && refreshedProfiles.length > 0 ? refreshedProfiles : nextProfiles,
          incomingRequests: this.state.incomingRequests.filter((r) => r.id !== requestId)
        };
      }
    );
  };

  /**
   * Rifiuta o cancella una richiesta di amicizia
   * @param {string} requestId
   * @param {string|null} [actingUid=null]
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
    const targetUid = extractFriendUid(friendOrUid);
    return this.runAsync(
      'removeFriend',
      () => this.repository.removeFriend(uid, friendOrUid),
      (updatedFriends) => ({
        friends: updatedFriends,
        friendsProfiles: this.state.friendsProfiles.filter((f) => f.uid !== targetUid)
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
      (friendsProfiles) => ({ friendsProfiles: Array.isArray(friendsProfiles) ? friendsProfiles : [] })
    );
  };

  /**
   * Azzera gli errori globali e di ricerca utenti
   * @override
   */
  clearError = () => {
    if (this._state.error !== null || this._state.searchError !== null) {
      this.setState({ error: null, searchError: null });
    }
  };

  /**
   * Azzera risultati e stato di ricerca utenti
   */
  clearSearch = () => {
    this._searchSeq += 1;
    this.setState({ searchResults: [], isSearching: false, searchError: null, searchQuery: '' });
  };

  /**
   * Cerca utenti registrati per prefisso username senza bloccare il loading globale della pagina
   * @param {string} query
   * @param {string|null} [excludeUid=null]
   * @returns {Promise<Array<import('../../models/User.js').User>>}
   */
  searchUsers = async (query, excludeUid = null) => {
    const trimmed = (query || '').trim();
    const seq = ++this._searchSeq;
    if (!trimmed) {
      this.setState({ searchResults: [], isSearching: false, searchError: null, searchQuery: '' });
      return [];
    }

    this.setState({ isSearching: true, error: null, searchError: null, searchQuery: trimmed });
    try {
      const results = await this.repository.searchUsersByUsername(trimmed, { excludeUid });
      if (this._searchSeq !== seq) return results;
      const safeResults = Array.isArray(results) ? results : [];
      this.setState({ searchResults: safeResults, isSearching: false, searchError: null });
      return safeResults;
    } catch (err) {
      if (this._searchSeq === seq) {
        const message = err?.message || String(err);
        this.setState({ searchResults: [], isSearching: false, error: message, searchError: message });
      }
      return [];
    }
  };
}

export default SocialViewModel;
