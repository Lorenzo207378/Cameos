import { BaseViewModel } from '../BaseViewModel.js';
import { userRepository as defaultUserRepository } from '../../repository/user/UserRepository.js';
import { isSameMediaTarget, normalizeMediaReference } from '../../models/utils/index.js';

export const PROFILE_COLLECTION_KEYS = Object.freeze(['watchlist', 'favorites', 'watched']);

/**
 * Filtra una lista profilo (riferimenti Firestore o modelli Movie/Series/Season/Episode) per tipo di media.
 * @template T
 * @param {Array<T>} items
 * @param {'all'|'movie'|'tv'|'season'|'episode'} filter
 * @returns {Array<T>}
 */
export function filterByMediaType(items, filter) {
  if (!Array.isArray(items) || filter === 'all') return Array.isArray(items) ? items : [];
  return items.filter((item) => Boolean(item) && (/** @type {any} */ (item).mediaType || 'movie') === filter);
}

/** @param {*} entry @returns {string|null} */
const getTargetKey = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'object' && typeof entry.targetKey === 'string') return entry.targetKey;
  try {
    return normalizeMediaReference(entry).targetKey;
  } catch {
    return null;
  }
};

/** @param {Array<*>} [a=[]] @param {Array<*>} [b=[]] */
const isSameTargetList = (a = [], b = []) =>
  a.length === b.length && a.every((entry, idx) => isSameMediaTarget(entry, b[idx]));

const EMPTY_USER_STATE = Object.freeze({
  currentUser: null,
  loadedUid: null,
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
 * @property {string|null} loadedUid
 * @property {Array<any>} watchlist
 * @property {Array<any>} favorites
 * @property {Array<any>} watched
 * @property {Array<any>} reviews
 * @property {Array<string>} friends
 * @property {Array<Object>} resolvedWatchlist
 * @property {Array<Object>} resolvedFavorites
 * @property {Array<Object>} resolvedWatched
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
    this._latestProfileRequest = 0;
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
   * Mappa l'istanza User di dominio nei campi di stato del ViewModel.
   * Preserva `this._language` (gestito da `LanguageContext`) salvo `syncLanguage: true`.
   * @param {import('../../models/User.js').User|Object|null} user
   * @param {{ syncLanguage?: boolean }} [options={}]
   * @returns {Object}
   */
  mapUserToState(user, { syncLanguage = false } = {}) {
    if (!user) return { ...EMPTY_USER_STATE };

    if (syncLanguage && user.language) {
      this._language = this.normalizeLanguage(user.language);
    }

    const uidChanged = Boolean(this.state.currentUser?.uid && this.state.currentUser.uid !== user.uid);

    return {
      currentUser: user,
      language: this._language,
      watchlist: user.watchlist || [],
      favorites: user.favorites || [],
      watched: user.watched || [],
      reviews: user.reviews || [],
      friends: user.friends || [],
      ...(uidChanged ? {
        loadedUid: null,
        resolvedWatchlist: [],
        resolvedFavorites: [],
        resolvedWatched: [],
        resolvedReviews: []
      } : {})
    };
  }

  /**
   * Sincronizza lo stato da un utente già caricato (es. AuthContext).
   * Invalida `loadedUid` solo se cambiano UID o le liste preferenze/recensioni (mai al solo cambio lingua).
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
    }

    const listsChanged = currentUid !== nextUid
      || !isSameTargetList(prev?.watchlist, user?.watchlist)
      || !isSameTargetList(prev?.favorites, user?.favorites)
      || !isSameTargetList(prev?.watched, user?.watched)
      || !isSameTargetList(prev?.reviews, user?.reviews);

    if (
      !listsChanged
      && prev?.username === user?.username
      && prev?.email === user?.email
      && prev?.photoURL === user?.photoURL
      && (prev?.friends?.length ?? 0) === (user?.friends?.length ?? 0)
    ) {
      return;
    }

    this.setState({
      ...this.mapUserToState(user),
      ...(listsChanged ? { loadedUid: null } : {})
    });
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
   * @param {{ force?: boolean }} [options={}]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  loadUser = (uid, { force = false } = {}) => {
    if (!uid) {
      this.setState({ ...EMPTY_USER_STATE });
      return Promise.resolve(null);
    }
    return this.runAsync(
      'loadUser',
      () => this.repository.getUser(uid, { force }),
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
    if (this.state.currentUser?.uid && this.state.currentUser.uid !== uid) {
      this.setState({ ...EMPTY_USER_STATE });
    }
    return this.runAsync(
      'loadVisitorProfile',
      () => this.repository.getVisitorProfile(uid),
      (user) => this._mapVisitorToState(user)
    );
  };

  /**
   * Carica un profilo (proprio o visitatore) e risolve i relativi media in un unico flusso con guard anti-stale.
   * Se il profilo `uid` risulta già caricato e `force` è false, riusa direttamente lo stato in memoria.
   * @param {string} uid
   * @param {{ isVisitor?: boolean, language?: string, force?: boolean }} [options={}]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  loadProfile = async (uid, { isVisitor = false, language = this.language, force = false } = {}) => {
    if (!uid) {
      this._latestProfileRequest += 1;
      this.setState({ ...EMPTY_USER_STATE });
      return null;
    }
    if (!force && this.state.loadedUid === uid) {
      return this.state.currentUser;
    }

    const requestId = ++this._latestProfileRequest;
    const loadedUser = isVisitor
      ? await this.loadVisitorProfile(uid)
      : await this.loadUser(uid, { force });

    if (requestId !== this._latestProfileRequest) return null;
    if (!loadedUser) {
      if (!this.state.error) this.setState({ loadedUid: uid });
      return null;
    }

    await this.hydrateUserMediaLists({ language, user: loadedUser, force });
    if (requestId !== this._latestProfileRequest) return null;
    this.setState({ loadedUid: uid });
    return loadedUser;
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
      (user) => this.mapUserToState(user, { syncLanguage: true })
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
      (user) => this.mapUserToState(user, { syncLanguage: true })
    );
  };

  /**
   * Aggiorna i dati del profilo dell'utente attivo
   * @param {Object} profileUpdates
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  updateProfile = (profileUpdates = {}) => {
    const uid = this.uid;
    if (!uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'updateProfile',
      () => this.repository.updateProfile(uid, profileUpdates),
      (user) => this.mapUserToState(user, { syncLanguage: profileUpdates.language !== undefined })
    );
  };

  /**
   * Cambia la lingua preferita dell'utente attivo
   * @param {string} language
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  switchLanguage = (language) => {
    const uid = this.uid;
    if (!uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'switchLanguage',
      () => this.repository.updateLanguage(uid, language),
      (user) => this.mapUserToState(user, { syncLanguage: true })
    );
  };

  /**
   * Sincronizza su Firestore le modifiche offline pendenti
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  syncOfflineChanges = () => {
    const uid = this.uid;
    if (!uid) throw new Error('Nessun utente attivo');
    return this.runAsync(
      'syncOfflineChanges',
      () => this.repository.syncPendingChanges(uid),
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
    return this.runAsync(key, () => repoMethod(this.uid, item), (user) => ({
      ...this.mapUserToState(user),
      loadedUid: null
    }));
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
   * Risolve gli ID salvati nelle liste utente (watchlist, favorites, watched, reviews) nei modelli completi TMDB/IDB.
   * Deduplica gli ID condivisi tra più liste così ogni opera viene risolta una sola volta.
   * @param {Object} [options={}]
   * @param {string} [options.language]
   * @param {import('../../models/User.js').User|Object|null} [options.user]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Object|null>}
   */
  hydrateUserMediaLists = ({ language = this.language, user = null, force = false } = {}) => {
    const source = user || this.state;
    const watchlist = source.watchlist || [];
    const favorites = source.favorites || [];
    const watched = source.watched || [];
    const reviews = source.reviews || [];

    return this.runAsync(
      'hydrateUserMediaLists',
      async () => {
        const unique = new Map();
        for (const ref of [...watchlist, ...favorites, ...watched, ...reviews]) {
          const key = getTargetKey(ref);
          if (key && !unique.has(key)) unique.set(key, ref);
        }

        const resolved = unique.size > 0
          ? await this.repository.resolveUserMediaList([...unique.values()], language, { force })
          : [];

        const byKey = new Map();
        for (const media of resolved) {
          const key = getTargetKey(media);
          if (key) byKey.set(key, media);
        }

        const pick = (list) => list.map((ref) => byKey.get(getTargetKey(ref))).filter(Boolean);
        return {
          resolvedWatchlist: pick(watchlist),
          resolvedFavorites: pick(favorites),
          resolvedWatched: pick(watched),
          resolvedReviews: reviews
            .map((review) => {
              const media = byKey.get(getTargetKey(review));
              return media ? { media, review } : null;
            })
            .filter(Boolean)
        };
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
        loadedUid: null,
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
        loadedUid: null,
        mediaReviews: this.state.mediaReviews.filter((r) => r.id !== reviewId),
        ...(stats && { currentMediaStats: stats })
      })
    );
    return result?.user ?? null;
  };
}

export default UserViewModel;
