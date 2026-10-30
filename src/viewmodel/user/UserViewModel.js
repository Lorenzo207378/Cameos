import { BaseViewModel } from '../BaseViewModel.js';
import { userRepository as defaultUserRepository } from '../../repository/user/UserRepository.js';
import { isSameMediaTarget } from '../../models/modelUtils.js';

const EMPTY_USER_STATE = Object.freeze({
  currentUser: null,
  watchlist: [],
  favorites: [],
  watched: [],
  reviews: [],
  friends: [],
  resolvedWatchlist: [],
  resolvedFavorites: [],
  resolvedWatched: [],
  friendsProfiles: [],
  incomingFriendRequests: [],
  outgoingFriendRequests: [],
  notifications: [],
  unreadNotificationsCount: 0,
  mediaTargetKey: null,
  mediaReviews: [],
  currentMediaStats: null
});

/**
 * @typedef {Object} UserViewModelState
 * @property {import('../../models/User.js').User|null} currentUser
 * @property {Array<any>} watchlist
 * @property {Array<any>} favorites
 * @property {Array<any>} watched
 * @property {Array<any>} reviews
 * @property {Array<string>} friends
 * @property {Array<import('../../models/Movie.js').Movie|import('../../models/Series.js').Series>} resolvedWatchlist
 * @property {Array<import('../../models/Movie.js').Movie|import('../../models/Series.js').Series>} resolvedFavorites
 * @property {Array<import('../../models/Movie.js').Movie|import('../../models/Series.js').Series>} resolvedWatched
 * @property {Array<import('../../models/User.js').User>} friendsProfiles
 * @property {Array<any>} incomingFriendRequests
 * @property {Array<any>} outgoingFriendRequests
 * @property {Array<import('../../models/Notification.js').Notification>} notifications
 * @property {number} unreadNotificationsCount
 * @property {string|null} mediaTargetKey
 * @property {Array<import('../../models/Review.js').Review>} mediaReviews
 * @property {Object|null} currentMediaStats
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * UserViewModel
 * ViewModel MVVM per la gestione del profilo utente, della sessione locale e delle liste di preferenze.
 */
export class UserViewModel extends BaseViewModel {
  /** @type {import('../../repository/user/UserRepository.js').UserRepository} */
  repository;

  /**
   * @param {import('../../repository/user/UserRepository.js').UserRepository} [repository]
   * @param {Object} [options={}]
   */
  constructor(repository = defaultUserRepository, options = {}) {
    super({ ...EMPTY_USER_STATE }, options);
    this.repository = repository;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {UserViewModelState}
   */
  get state() {
    return /** @type {UserViewModelState} */ (super.state);
  }

  /**
   * UID dell'utente attualmente loggato
   * @returns {string|null}
   */
  get uid() {
    return this.state.currentUser?.uid ?? null;
  }

  /**
   * Mappa l'istanza User di dominio nei campi di stato del ViewModel
   * @param {import('../../models/User.js').User|null} user
   * @returns {Object}
   */
  mapUserToState(user) {
    if (!user) return { ...EMPTY_USER_STATE };

    if (user.language) {
      this._language = this.normalizeLanguage(user.language);
    }

    return {
      currentUser: user,
      language: this._language,
      watchlist: user.watchlist || [],
      favorites: user.favorites || [],
      watched: user.watched || [],
      reviews: user.reviews || [],
      friends: user.friends || []
    };
  }

  /**
   * Sincronizza lo stato da un utente già caricato (es. AuthContext)
   * @param {import('../../models/User.js').User|null} user
   */
  syncFromUser = (user) => {
    this.setState(this.mapUserToState(user));
  };

  /**
   * Carica il profilo utente e lo imposta come utente attivo
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  loadUser = (uid) => {
    return this.runAsync(
      'loadUser',
      () => this.repository.getUser(uid),
      (user) => this.mapUserToState(user)
    );
  };

  /**
   * Autologin: ripristina la sessione utente locale
   * @param {string|null} [uid=null]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  restoreSession = (uid = null) => {
    return this.runAsync(
      'restoreSession',
      () => this.repository.getSessionUser(uid),
      (user) => this.mapUserToState(user)
    );
  };

  /**
   * Registra o aggiorna l'utente attivo
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  saveUser = (userInput, username = null) => {
    return this.runAsync(
      'saveUser',
      () => this.repository.saveUser(userInput, username),
      (user) => this.mapUserToState(user)
    );
  };

  /**
   * Aggiorna i dati del profilo dell'utente attivo
   * @param {Object} profileUpdates
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  updateProfile = (profileUpdates = {}) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'updateProfile',
      () => this.repository.updateProfile(this.uid, profileUpdates),
      (user) => this.mapUserToState(user)
    );
  };

  /**
   * Cambia la lingua preferita dell'utente attivo
   * @param {string} language
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  switchLanguage = (language) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'switchLanguage',
      () => this.repository.updateLanguage(this.uid, language),
      (user) => this.mapUserToState(user)
    );
  };

  /**
   * Sincronizza su Firestore le modifiche offline pendenti
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  syncOfflineChanges = () => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'syncOfflineChanges',
      () => this.repository.syncPendingChanges(this.uid),
      (user) => (user ? this.mapUserToState(user) : {})
    );
  };

  /**
   * Effettua il logout cancellando la sessione locale
   * @returns {Promise<void>}
   */
  logoutSession = async () => {
    await this.repository.clearSessionUser();
    this.setState({ ...EMPTY_USER_STATE });
  };

  // ===========================================================================
  // PREFERENZE PERSONALI (Watchlist, Favorites, Watched)
  // ===========================================================================

  addToWatchlist = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'watchlist',
      () => this.repository.addToWatchlist(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  removeFromWatchlist = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'watchlist',
      () => this.repository.removeFromWatchlist(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  toggleWatchlist = (item) => {
    const isPresent = this.state.watchlist.some((entry) => isSameMediaTarget(entry, item));
    return isPresent ? this.removeFromWatchlist(item) : this.addToWatchlist(item);
  };

  addToFavorites = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'favorites',
      () => this.repository.addToFavorites(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  removeFromFavorites = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'favorites',
      () => this.repository.removeFromFavorites(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  toggleFavorite = (item) => {
    const isPresent = this.state.favorites.some((entry) => isSameMediaTarget(entry, item));
    return isPresent ? this.removeFromFavorites(item) : this.addToFavorites(item);
  };

  addToWatched = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'watched',
      () => this.repository.addToWatched(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  removeFromWatched = (item) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'watched',
      () => this.repository.removeFromWatched(this.uid, item),
      (user) => this.mapUserToState(user)
    );
  };

  toggleWatched = (item) => {
    const isPresent = this.state.watched.some((entry) => isSameMediaTarget(entry, item));
    return isPresent ? this.removeFromWatched(item) : this.addToWatched(item);
  };

  /**
   * Idrata i riferimenti leggeri (watchlist, favorites, watched) in oggetti di dominio completi
   * @param {Object} [options={}]
   * @returns {Promise<Object|null>}
   */
  hydrateUserMediaLists = ({ language = this.language } = {}) => {
    const { watchlist, favorites, watched } = this.state;

    return this.runAsync(
      'hydrateUserMediaLists',
      async () => {
        const [resolvedWatchlist, resolvedFavorites, resolvedWatched] = await Promise.all([
          this.repository.resolveUserMediaList(watchlist, language),
          this.repository.resolveUserMediaList(favorites, language),
          this.repository.resolveUserMediaList(watched, language)
        ]);
        return { resolvedWatchlist, resolvedFavorites, resolvedWatched };
      },
      (resolved) => resolved
    );
  };

  // ===========================================================================
  // DELEGATI PER RETROCOMPATIBILITÀ SOCIAL, NOTIFICHE E RECENSIONI
  // ===========================================================================

  sendFriendRequest = (toUid, metadata) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'sendFriendRequest',
      () => this.repository.sendFriendRequest(this.uid, toUid, metadata),
      (req) => ({
        outgoingFriendRequests: [...this.state.outgoingFriendRequests.filter((r) => r.id !== req.id), req]
      })
    );
  };

  acceptFriendRequest = (requestId) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'acceptFriendRequest',
      () => this.repository.acceptFriendRequest(requestId, this.uid),
      (user) => ({
        ...this.mapUserToState(user),
        incomingFriendRequests: this.state.incomingFriendRequests.filter((r) => r.id !== requestId)
      })
    );
  };

  loadSocialState = () => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'loadSocialState',
      async () => {
        const [incoming, outgoing, notifications] = await Promise.all([
          this.repository.getIncomingFriendRequests(this.uid),
          this.repository.getOutgoingFriendRequests(this.uid),
          this.repository.getUserNotifications(this.uid)
        ]);
        return { incoming, outgoing, notifications };
      },
      ({ incoming, outgoing, notifications }) => ({
        incomingFriendRequests: incoming,
        outgoingFriendRequests: outgoing,
        notifications,
        unreadNotificationsCount: notifications.filter((n) => !n.read).length
      })
    );
  };

  saveReview = async (reviewInput) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    const result = await this.runAsync(
      'saveReview',
      () => this.repository.saveReview(this.uid, reviewInput),
      ({ user, review, stats }) => ({
        ...this.mapUserToState(user),
        mediaReviews: [review, ...this.state.mediaReviews.filter((r) => r.id !== review.id)],
        currentMediaStats: stats
      })
    );
    return result?.review ?? null;
  };

  removeReview = async (reviewId) => {
    if (!this.uid) throw new Error('Nessun utente attivo');
    const result = await this.runAsync(
      'removeReview',
      () => this.repository.removeReview(this.uid, reviewId),
      ({ user, stats }) => ({
        ...this.mapUserToState(user),
        mediaReviews: this.state.mediaReviews.filter((r) => r.id !== reviewId),
        ...(stats && { currentMediaStats: stats })
      })
    );
    return result?.user ?? null;
  };
}

export default UserViewModel;
