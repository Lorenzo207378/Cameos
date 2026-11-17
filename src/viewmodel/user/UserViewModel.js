import { BaseViewModel } from '../BaseViewModel.js';
import { userRepository as defaultUserRepository } from '../../repository/user/UserRepository.js';
import { isSameMediaTarget } from '../../models/utils/index.js';

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
  resolvedReviews: [],
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
 * @property {Array<{ media: Object, review: Object|null }>} resolvedReviews
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
   * @param {import('../../models/User.js').User|Object|null} user
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
   * @param {import('../../models/User.js').User|Object|null} user
   */
  syncFromUser = (user) => {
    const prev = this.state.currentUser;
    const currentUid = prev?.uid ?? null;
    const nextUid = user?.uid ?? null;
    if (currentUid === nextUid) {
      const prevIsDomain = Array.isArray(prev?.watchlist);
      const nextIsDomain = Array.isArray(user?.watchlist);
      if (!nextIsDomain && prevIsDomain) return;
      if (prev === user || (!user && !prev)) return;
      if (
        prevIsDomain === nextIsDomain
        && prev?.updatedAt === user?.updatedAt
        && (prev?.watchlist?.length ?? 0) === (user?.watchlist?.length ?? 0)
        && (prev?.favorites?.length ?? 0) === (user?.favorites?.length ?? 0)
        && (prev?.watched?.length ?? 0) === (user?.watched?.length ?? 0)
        && (prev?.reviews?.length ?? 0) === (user?.reviews?.length ?? 0)
        && (prev?.friends?.length ?? 0) === (user?.friends?.length ?? 0)
      ) {
        return;
      }
    }
    this.setState(this.mapUserToState(user));
  };

  /**
   * Mappa il profilo visitatore in sola lettura senza alterare la lingua attiva dell'utente corrente
   * @param {import('../../models/User.js').User|Object|null} user
   * @returns {Object}
   */
  _mapVisitorToState(user) {
    if (!user) return { ...EMPTY_USER_STATE };

    return {
      currentUser: user,
      watchlist: user.watchlist || [],
      favorites: user.favorites || [],
      watched: user.watched || [],
      reviews: user.reviews || [],
      friends: user.friends || []
    };
  }

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
   * Carica il profilo di un utente in modalità visitatore (solo lettura da Firestore)
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  loadVisitorProfile = (uid) => {
    if (!uid) {
      this.setState({ ...EMPTY_USER_STATE });
      return Promise.resolve(null);
    }
    return this.runAsync(
      'loadVisitorProfile',
      () => this.repository.getVisitorProfile(uid),
      (user) => this._mapVisitorToState(user)
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

  _runPreferenceOp(key, repoMethod, item) {
    if (!this.uid) throw new Error('Nessun utente attivo');
    return this.runAsync(key, () => repoMethod(this.uid, item), (user) => this.mapUserToState(user));
  }

  _togglePreferenceOp(listKey, item, addFn, removeFn) {
    const isPresent = this.state[listKey].some((entry) => isSameMediaTarget(entry, item));
    return isPresent ? removeFn(item) : addFn(item);
  }

  addToWatchlist = (item) => this._runPreferenceOp('watchlist', (uid, target) => this.repository.addToWatchlist(uid, target), item);
  removeFromWatchlist = (item) => this._runPreferenceOp('watchlist', (uid, target) => this.repository.removeFromWatchlist(uid, target), item);
  toggleWatchlist = (item) => this._togglePreferenceOp('watchlist', item, this.addToWatchlist, this.removeFromWatchlist);

  addToFavorites = (item) => this._runPreferenceOp('favorites', (uid, target) => this.repository.addToFavorites(uid, target), item);
  removeFromFavorites = (item) => this._runPreferenceOp('favorites', (uid, target) => this.repository.removeFromFavorites(uid, target), item);
  toggleFavorite = (item) => this._togglePreferenceOp('favorites', item, this.addToFavorites, this.removeFromFavorites);

  addToWatched = (item) => this._runPreferenceOp('watched', (uid, target) => this.repository.addToWatched(uid, target), item);
  removeFromWatched = (item) => this._runPreferenceOp('watched', (uid, target) => this.repository.removeFromWatched(uid, target), item);
  toggleWatched = (item) => this._togglePreferenceOp('watched', item, this.addToWatched, this.removeFromWatched);

  /**
   * Idrata i riferimenti leggeri (watchlist, favorites, watched, reviews) in oggetti di dominio completi
   * @param {Object} [options={}]
   * @param {string} [options.language]
   * @returns {Promise<Object|null>}
   */
  hydrateUserMediaLists = ({ language = this.language } = {}) => {
    const { watchlist, favorites, watched, reviews } = this.state;

    return this.runAsync(
      'hydrateUserMediaLists',
      async () => {
        const resolveReviews = async () => {
          if (!reviews.length) return [];
          if (typeof this.repository.resolveMediaReference === 'function') {
            const settled = await Promise.allSettled(
              reviews.map((ref) => this.repository.resolveMediaReference(ref, language))
            );
            return settled
              .map((res, idx) => (res.status === 'fulfilled' && res.value ? { media: res.value, review: reviews[idx] || null } : null))
              .filter(Boolean);
          }
          const resolved = await this.repository.resolveUserMediaList(reviews, language);
          return (resolved || []).map((media, idx) => ({ media, review: reviews[idx] || null }));
        };

        const [resolvedWatchlist, resolvedFavorites, resolvedWatched, resolvedReviews] = await Promise.all([
          this.repository.resolveUserMediaList(watchlist, language),
          this.repository.resolveUserMediaList(favorites, language),
          this.repository.resolveUserMediaList(watched, language),
          resolveReviews()
        ]);
        return { resolvedWatchlist, resolvedFavorites, resolvedWatched, resolvedReviews };
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
