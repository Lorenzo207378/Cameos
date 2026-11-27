import { BaseRepository, STORES } from '../BaseRepository.js';
import { userBackend as defaultUserBackend } from '../../backend/user/UserBackend.js';
import { movieRepository as defaultMovieRepository } from '../movies/MovieRepository.js';
import { seriesRepository as defaultSeriesRepository } from '../series/SeriesRepository.js';
import { socialRepository as defaultSocialRepository } from '../social/SocialRepository.js';
import { notificationRepository as defaultNotificationRepository } from '../notifications/NotificationRepository.js';
import { reviewRepository as defaultReviewRepository } from '../reviews/ReviewRepository.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import {
  User,
  isSameMediaTarget,
  normalizeMediaReference
} from '../../models/utils/index.js';

const SESSION_USER_KEY = 'session:current_user';
const userKey = (uid) => `user:${uid}`;
const avatarKey = (uid) => `avatar:${uid}`;

/**
 * UserRepository
 * Gestisce il profilo utente, la sessione locale IndexedDB, la sincronizzazione offline
 * e le preferenze personali (watchlist, favorites, watched) con risoluzione on-demand dei media.
 */
export class UserRepository extends BaseRepository {
  /**
   * @param {import('../../backend/user/UserBackend.js').UserBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   * @param {Object} [dependencies={}]
   */
  constructor(
    backend = defaultUserBackend,
    storage = defaultStorage,
    {
      seriesRepository = defaultSeriesRepository,
      movieRepository = defaultMovieRepository,
      socialRepository = defaultSocialRepository,
      notificationRepository = defaultNotificationRepository,
      reviewRepository = defaultReviewRepository
    } = {}
  ) {
    super(storage);
    this.backend = backend;
    this.seriesRepository = seriesRepository;
    this.movieRepository = movieRepository;
    this.socialRepository = socialRepository;
    this.notificationRepository = notificationRepository;
    this.reviewRepository = reviewRepository;
  }

  // ===========================================================================
  // 1. PROFILO UTENTE, SESSIONE ED AUTOLOGIN
  // ===========================================================================

  /**
   * Salva l'utente in IndexedDB e aggiorna la sessione attiva
   * @param {User|Object} user
   * @param {Object} [options={}]
   * @returns {Promise<User>}
   */
  async saveUserLocal(user, { pendingSync = false, isSessionUser = false } = {}) {
    const instance = user instanceof User ? user : new User(user);
    if (!instance.uid) throw new Error('User.uid is required for local persistence');

    const record = {
      cacheKey: userKey(instance.uid),
      uid: instance.uid,
      username: instance.username,
      pendingSync,
      data: { ...instance }
    };

    await this.storage.put(STORES.USERS, record);

    const session = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    if (isSessionUser || session?.uid === instance.uid) {
      await this.storage.put(STORES.USERS, { ...record, cacheKey: SESSION_USER_KEY });
    }

    return instance;
  }

  /**
   * Sincronizza su Firestore le modifiche offline pendenti
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async syncPendingChanges(uid) {
    if (!uid || !this.isOnline()) return null;

    const local = await this.storage.get(STORES.USERS, userKey(uid));
    if (!local?.data) return null;
    if (!local.pendingSync) return new User(local.data);

    try {
      const synced = await this.backend.updateUser(uid, local.data);
      return await this.saveUserLocal(synced, { pendingSync: false });
    } catch (err) {
      console.warn(`[UserRepository] Sync modifiche pendenti fallito per ${uid}:`, err);
      return new User(local.data);
    }
  }

  /**
   * Recupera il profilo utente (Network-First + IndexedDB Fallback)
   * @param {string} uid
   * @param {Object} [options={}]
   * @param {boolean} [options.force=false]
   * @returns {Promise<User|null>}
   */
  async getUser(uid, { force = false } = {}) {
    if (!uid) throw new Error('uid is required');

    await this.syncPendingChanges(uid);

    return this.executeWithFallback({
      context: userKey(uid),
      _cacheReason: force ? 'force refresh' : '',
      fetchRemote: () => this.backend.getUserById(uid),
      saveLocal: async (freshUser) => {
        if (freshUser) await this.saveUserLocal(freshUser);
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.USERS, userKey(uid));
        return cached?.data ? new User(cached.data) : null;
      }
    });
  }

  /**
   * Registra o aggiorna l'utente in fase di login e lo imposta come sessione attiva
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
        return await this.saveUserLocal(remoteUser, { isSessionUser: true });
      } catch (err) {
        console.warn(`[UserRepository] Salvataggio remoto fallito per ${uid}, fallback su IndexedDB:`, err);
      }
    }

    const existing = (await this.storage.get(STORES.USERS, userKey(uid)))?.data || {};
    const nowIso = new Date().toISOString();
    const offlineUser = new User({
      ...existing,
      uid,
      email: userInput.email ?? existing.email,
      username: username ?? userInput.username ?? existing.username,
      photoURL: userInput.photoURL ?? existing.photoURL,
      language: userInput.language || existing.language,
      createdAt: existing.createdAt || nowIso,
      updatedAt: nowIso
    });

    return this.saveUserLocal(offlineUser, { pendingSync: true, isSessionUser: true });
  }

  /**
   * Aggiorna gli attributi dell'utente su Firestore e IndexedDB (con pendingSync offline)
   * @param {string} uid
   * @param {Object} [updates={}]
   * @returns {Promise<User>}
   */
  async updateUser(uid, updates = {}) {
    if (!uid) throw new Error('uid is required');

    if (this.isOnline()) {
      try {
        await this.syncPendingChanges(uid);
        const remoteUser = await this.backend.updateUser(uid, updates);
        return await this.saveUserLocal(remoteUser);
      } catch (err) {
        console.warn(`[UserRepository] Aggiornamento remoto fallito per ${uid}, salvataggio locale:`, err);
      }
    }

    const existing = (await this.storage.get(STORES.USERS, userKey(uid)))?.data || {};
    const nowIso = new Date().toISOString();
    const localUser = new User({
      ...existing,
      ...updates,
      uid,
      createdAt: existing.createdAt || nowIso,
      updatedAt: nowIso
    });

    return this.saveUserLocal(localUser, { pendingSync: true });
  }

  /**
   * Aggiorna la lingua preferita dell'utente
   * @param {string} uid
   * @param {string} language
   * @returns {Promise<User>}
   */
  async updateLanguage(uid, language) {
    return this.updateUser(uid, { language: this.normalizeLanguage(language) });
  }

  /**
   * Aggiorna i campi di profilo (username, photoURL, language)
   * @param {string} uid
   * @param {Object} [profileUpdates={}]
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
   * Autologin: ripristina la sessione utente da IndexedDB o la aggiorna da Firestore
   * @param {string|null} [uid=null]
   * @returns {Promise<User|null>}
   */
  async getSessionUser(uid = null) {
    if (uid) {
      try {
        const user = await this.getUser(uid);
        if (user) return await this.saveUserLocal(user, { isSessionUser: true });
      } catch {
        // Fallback su sessione locale
      }
    }

    const session = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    const belongsToRequestedUser = !uid || session?.uid === uid;
    return session?.data && belongsToRequestedUser ? new User(session.data) : null;
  }

  /**
   * Rimuove la sessione utente da IndexedDB al logout
   * @returns {Promise<void>}
   */
  async clearSessionUser() {
    await this.storage.delete(STORES.USERS, SESSION_USER_KEY);
  }

  /**
   * Verifica se uno username è disponibile su Firestore
   * @param {string} username
   * @param {string|null} [excludeUid=null]
   * @returns {Promise<boolean>}
   */
  isUsernameAvailable(username, excludeUid = null) {
    return this.backend.isUsernameAvailable(username, excludeUid);
  }

  /**
   * Restituisce la Data URL dell'avatar salvata in IndexedDB per l'utente (se coerente o offline).
   * @param {string} uid
   * @param {string|null} [expectedPhotoUrl=null]
   * @returns {Promise<string|null>}
   */
  async getCachedAvatar(uid, expectedPhotoUrl = null) {
    if (!uid) return null;
    try {
      const cached = await this.storage.get(STORES.USERS, avatarKey(uid));
      if (!cached || typeof cached.dataUrl !== 'string' || !cached.dataUrl.startsWith('data:image/')) {
        return null;
      }
      if (!expectedPhotoUrl || cached.sourceUrl === expectedPhotoUrl || !this.isOnline()) {
        return cached.dataUrl;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Scarica (quando online e non già in cache per lo stesso URL) e salva in IndexedDB
   * la Data URL dell'avatar dell'utente per la visualizzazione offline.
   * @param {string} uid
   * @param {string|null|undefined} photoURL
   * @returns {Promise<string|null>}
   */
  async cacheUserAvatar(uid, photoURL) {
    if (!uid || typeof photoURL !== 'string' || !/^https?:\/\//i.test(photoURL)) {
      return null;
    }

    const existing = await this.storage.get(STORES.USERS, avatarKey(uid)).catch(() => null);

    if (
      existing
      && existing.sourceUrl === photoURL
      && typeof existing.dataUrl === 'string'
      && existing.dataUrl.startsWith('data:image/')
    ) {
      return existing.dataUrl;
    }

    if (!this.isOnline() || typeof this.backend.fetchAvatarDataUrl !== 'function') {
      return typeof existing?.dataUrl === 'string' && existing.dataUrl.startsWith('data:image/')
        ? existing.dataUrl
        : null;
    }

    const dataUrl = await this.backend.fetchAvatarDataUrl(photoURL);
    if (!dataUrl) {
      return typeof existing?.dataUrl === 'string' && existing.dataUrl.startsWith('data:image/')
        ? existing.dataUrl
        : null;
    }

    try {
      await this.storage.put(STORES.USERS, {
        cacheKey: avatarKey(uid),
        uid,
        sourceUrl: photoURL,
        dataUrl,
        updatedAt: Date.now()
      });
    } catch {
      // Cache avatar best-effort: non blocca il profilo utente
    }

    return dataUrl;
  }

  /**
   * Elimina l'utente sia da Firestore che da IndexedDB
   * @param {string} uid
   * @returns {Promise<void>}
   */
  async deleteUser(uid) {
    if (!uid) throw new Error('uid is required');
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile eliminare l\'account offline');
    }

    await this.backend.deleteUserById(uid);
    await this.storage.delete(STORES.USERS, userKey(uid));
    await this.storage.delete(STORES.USERS, avatarKey(uid));

    const session = await this.storage.get(STORES.USERS, SESSION_USER_KEY);
    if (session?.uid === uid) await this.clearSessionUser();
  }

  // ===========================================================================
  // 2. PREFERENZE PERSONALI (Watchlist, Favorites, Watched)
  // ===========================================================================

  /**
   * Modifica l'appartenenza di un'opera a una lista di preferenze (watchlist, favorites, watched)
   * @param {string} uid
   * @param {'watchlist'|'favorites'|'watched'} listName
   * @param {*} item
   * @param {boolean} isAdded
   * @returns {Promise<User>}
   */
  async changePreference(uid, listName, item, isAdded) {
    if (!uid) throw new Error('uid is required');

    const target = normalizeMediaReference(item);
    const user = (await this.getUser(uid)) || new User({ uid });
    const isPresent = user[listName].some((entry) => isSameMediaTarget(entry, target));
    if (isPresent === isAdded) return user;

    const list = isAdded
      ? [...user[listName], target]
      : user[listName].filter((entry) => !isSameMediaTarget(entry, target));
    const updatedUser = await this.updateUser(uid, { [listName]: list });

    if (this.isOnline()) {
      try {
        await this.reviewRepository.syncMediaPreference(uid, target, listName, isAdded);
      } catch (err) {
        console.warn(`[UserRepository] Sincronizzazione media_stats fallita per ${target.targetKey}:`, err);
      }
    }

    return updatedUser;
  }

  addToWatchlist(uid, item) {
    return this.changePreference(uid, 'watchlist', item, true);
  }

  removeFromWatchlist(uid, item) {
    return this.changePreference(uid, 'watchlist', item, false);
  }

  addToFavorites(uid, item) {
    return this.changePreference(uid, 'favorites', item, true);
  }

  removeFromFavorites(uid, item) {
    return this.changePreference(uid, 'favorites', item, false);
  }

  addToWatched(uid, item) {
    return this.changePreference(uid, 'watched', item, true);
  }

  removeFromWatched(uid, item) {
    return this.changePreference(uid, 'watched', item, false);
  }

  /**
   * Clona shallow preservando il prototipo del modello di dominio per arricchimenti non distruttivi.
   * @template {Object} T
   * @param {T} entity
   * @param {Record<string, any>} patch
   * @returns {T}
   */
  _cloneWithPatch(entity, patch) {
    return Object.assign(Object.create(Object.getPrototypeOf(entity)), entity, patch);
  }

  /**
   * Risolve una stagione arricchendola con il titolo della serie padre e il fallback poster senza mutare l'istanza in cache.
   * @param {number|string} seriesId
   * @param {number|string|null} seasonNumber
   * @param {string} lang
   * @param {boolean} [force=false]
   * @returns {Promise<Object>}
   */
  async _resolveSeasonWithSeries(seriesId, seasonNumber, lang, force = false) {
    const resolvedSeasonNumber = seasonNumber ?? 1;
    const forceOpt = force ? { force: true } : {};
    const [season, series] = await Promise.all([
      this.seriesRepository.getSeasonDetails({ seriesId, seasonNumber: resolvedSeasonNumber, language: lang, ...forceOpt }),
      typeof this.seriesRepository.getSeriesDetails === 'function'
        ? this.seriesRepository.getSeriesDetails({ seriesId, language: lang, ...forceOpt }).catch(() => null)
        : Promise.resolve(null)
    ]);
    if (season && series) {
      /** @type {Record<string, any>} */
      const patch = {};
      if (!season.seriesName) {
        patch.seriesNames = series.names;
        patch.seriesName = series.name;
      }
      const hasPoster = typeof season.posterUrl === 'string'
        ? Boolean(season.posterUrl)
        : Boolean(season.posterUrl && Object.values(season.posterUrl).some(Boolean));
      if (!hasPoster && series.posterUrl) {
        patch.posterUrl = series.posterUrl;
      }
      if (Object.keys(patch).length > 0) {
        return this._cloneWithPatch(season, patch);
      }
    }
    return season;
  }

  /**
   * Risolve un episodio arricchendolo con il titolo localizzato della serie padre e il fallback poster senza mutare l'istanza in cache.
   * @param {number|string} seriesId
   * @param {number|string|null} seasonNumber
   * @param {number|string|null} episodeNumber
   * @param {string} lang
   * @param {boolean} [force=false]
   * @returns {Promise<Object>}
   */
  async _resolveEpisodeWithSeries(seriesId, seasonNumber, episodeNumber, lang, force = false) {
    const forceOpt = force ? { force: true } : {};
    const [episode, series] = await Promise.all([
      this.seriesRepository.getEpisodeDetails({ seriesId, seasonNumber, episodeNumber, language: lang, ...forceOpt }),
      typeof this.seriesRepository.getSeriesDetails === 'function'
        ? this.seriesRepository.getSeriesDetails({ seriesId, language: lang, ...forceOpt }).catch(() => null)
        : Promise.resolve(null)
    ]);
    if (episode && series) {
      /** @type {Record<string, any>} */
      const patch = {};
      if (!episode.seriesName) {
        patch.seriesNames = series.names;
        patch.seriesName = series.name;
      }
      const hasStill = typeof episode.stillUrl === 'string'
        ? Boolean(episode.stillUrl)
        : Boolean(episode.stillUrl && Object.values(episode.stillUrl).some(Boolean));
      const hasPoster = typeof episode.posterUrl === 'string'
        ? Boolean(episode.posterUrl)
        : Boolean(episode.posterUrl && Object.values(episode.posterUrl).some(Boolean));
      if (!hasStill && !hasPoster && series.posterUrl) {
        patch.posterUrl = series.posterUrl;
      }
      if (Object.keys(patch).length > 0) {
        return this._cloneWithPatch(episode, patch);
      }
    }
    return episode;
  }

  /**
   * Risolve un riferimento leggero ({ mediaType, mediaId, ... }) nel corrispondente modello di dominio
   * (Movie, Series, Season, Episode) usando le rispettive repository con fallback offline.
   * @param {Object|string|number} reference
   * @param {string} [language='it-IT']
   * @param {Object} [options={}]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Object>}
   */
  resolveMediaReference(reference, language = 'it-IT', { force = false } = {}) {
    const { mediaType, mediaId, seasonNumber, episodeNumber } = normalizeMediaReference(reference);
    const lang = this.normalizeLanguage(language);
    const forceOpt = force ? { force: true } : {};

    switch (mediaType) {
      case 'episode':
        return this._resolveEpisodeWithSeries(mediaId, seasonNumber, episodeNumber, lang, force);
      case 'season':
        return this._resolveSeasonWithSeries(mediaId, seasonNumber, lang, force);
      case 'tv':
        return this.seriesRepository.getSeriesDetails({ seriesId: mediaId, language: lang, ...forceOpt });
      default:
        return this.movieRepository.getMovieDetails({ movieId: mediaId, language: lang, ...forceOpt });
    }
  }

  /**
   * Risolve in parallelo un array di riferimenti multimediali in modelli di dominio completi
   * @param {Array<Object|string|number>} [references=[]]
   * @param {string} [language='it-IT']
   * @param {Object} [options={}]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Array<Object>>}
   */
  async resolveUserMediaList(references = [], language = 'it-IT', { force = false } = {}) {
    const resolved = new Array(references.length);
    let nextIndex = 0;
    const resolveNext = async () => {
      while (nextIndex < references.length) {
        const index = nextIndex++;
        const reference = references[index];
        let target;

        try {
          target = normalizeMediaReference(reference);
        } catch (error) {
          console.error(`[UserRepository] Riferimento media non valido nella lista profilo (indice ${index}):`, error);
          resolved[index] = null;
          continue;
        }

        try {
          const media = await this.resolveMediaReference(target, language, { force });
          if (!media) throw new Error(`Nessun dato multimediale restituito per ${target.targetKey}`);
          if (!isSameMediaTarget(media, target)) {
            throw new Error(`I dettagli restituiti non corrispondono al riferimento ${target.targetKey}`);
          }
          resolved[index] = media;
        } catch (error) {
          console.warn(`[UserRepository] Risoluzione media fallita per ${target.targetKey}:`, error);
          resolved[index] = {
            ...target,
            ...(target.mediaType !== 'movie' ? { seriesId: target.mediaId } : {}),
            resolutionError: error instanceof Error ? error.message : String(error)
          };
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(5, references.length) }, () => resolveNext())
    );
    return resolved.filter(Boolean);
  }

  // ===========================================================================
  // 3. METODI DI DELEGA PER RETROCOMPATIBILITÀ (SOCIAL, NOTIFICHE, RECENSIONI)
  // ===========================================================================

  sendFriendRequest(fromUid, toUid, metadata) {
    return this.socialRepository.sendFriendRequest(fromUid, toUid, metadata);
  }

  getIncomingFriendRequests(uid) {
    return this.socialRepository.getIncomingFriendRequests(uid);
  }

  getOutgoingFriendRequests(uid) {
    return this.socialRepository.getOutgoingFriendRequests(uid);
  }

  async acceptFriendRequest(requestId, actingUid) {
    await this.socialRepository.acceptFriendRequest(requestId, actingUid);
    return this.getUser(actingUid);
  }

  rejectFriendRequest(requestId, actingUid) {
    return this.socialRepository.rejectFriendRequest(requestId, actingUid);
  }

  async removeFriend(uid, friendOrUid) {
    await this.socialRepository.removeFriend(uid, friendOrUid);
    return this.getUser(uid);
  }

  getFriendsProfiles(uid) {
    return this.socialRepository.getFriendsProfiles(uid);
  }

  /**
   * Recupera il profilo di un altro utente direttamente da `UserBackend` (solo online, senza dipendenza laterale da SocialRepository).
   * @param {string} uid
   * @returns {Promise<User|null>}
   */
  async getVisitorProfile(uid) {
    if (!uid) throw new Error('uid is required');
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile visualizzare il profilo utente offline');
    }
    return this.backend.getUserById(uid);
  }

  searchUsersByUsername(query, options) {
    return this.socialRepository.searchUsersByUsername(query, options);
  }

  sendNotification(notificationData) {
    return this.notificationRepository.sendNotification(notificationData);
  }

  getUserNotifications(recipientUid, options) {
    return this.notificationRepository.getUserNotifications(recipientUid, options);
  }

  markNotificationAsRead(notificationId) {
    return this.notificationRepository.markNotificationAsRead(notificationId);
  }

  markAllNotificationsAsRead(recipientUid) {
    return this.notificationRepository.markAllNotificationsAsRead(recipientUid);
  }

  deleteNotification(notificationId) {
    return this.notificationRepository.deleteNotification(notificationId);
  }

  async saveReview(uid, reviewInput) {
    const { review, stats } = await this.reviewRepository.saveReview(uid, reviewInput);
    const user = await this.getUser(uid);
    return { user, review, stats };
  }

  async removeReview(uid, reviewId) {
    const { stats } = await this.reviewRepository.removeReview(uid, reviewId);
    const user = await this.getUser(uid);
    return { user, stats };
  }

  getMediaReviews(targetInput) {
    return this.reviewRepository.getMediaReviews(targetInput);
  }

  getUserReviews(uid) {
    return this.reviewRepository.getUserReviews(uid);
  }

  toggleReviewLike(reviewId, likerUid) {
    return this.reviewRepository.toggleReviewLike(reviewId, likerUid);
  }

  toggleMediaLike(uid, targetInput) {
    return this.reviewRepository.toggleMediaLike(uid, targetInput);
  }

  getMediaStats(targetInput) {
    return this.reviewRepository.getMediaStats(targetInput);
  }
}

export const userRepository = new UserRepository();
export default UserRepository;
