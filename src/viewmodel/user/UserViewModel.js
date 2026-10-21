import { BaseViewModel } from '../BaseViewModel.js';
import { userRepository as defaultUserRepository } from '../../repository/user/UserRepository.js';
import { extractItemKey } from '../../models/modelUtils.js';

/**
 * UserViewModel
 * MVVM ViewModel mediating between UserRepository and User Profile / Auth UI components.
 * Manages observable state for the logged-in User, preferred language ('it-IT' | 'en-US'),
 * watchlist, favorites, watched history, reviews, and friends.
 */
export class UserViewModel extends BaseViewModel {
  /**
   * @param {import('../../repository/user/UserRepository.js').UserRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultUserRepository, options = {}) {
    super(
      {
        currentUser: null,
        watchlist: [],
        favorites: [],
        watched: [],
        reviews: [],
        friends: []
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Map a User domain instance into ViewModel state fields
   * @param {import('../../models/User.js').User|null} user
   * @returns {Object}
   */
  _mapUserToState(user) {
    if (!user) {
      return {
        currentUser: null,
        watchlist: [],
        favorites: [],
        watched: [],
        reviews: [],
        friends: []
      };
    }

    const normalizedLang = this.normalizeLanguage(user.language || this.language);
    this._language = normalizedLang;

    return {
      currentUser: user,
      language: normalizedLang,
      watchlist: user.watchlist || [],
      favorites: user.favorites || [],
      watched: user.watched || [],
      reviews: user.reviews || [],
      friends: user.friends || []
    };
  }

  /**
   * Internal helper to run a UserRepository action and map the resulting User into state
   * @param {string} opKey
   * @param {Function} action
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  _runUserAction(opKey, action) {
    return this.runAsync(opKey, action, (user) => this._mapUserToState(user));
  }

  /**
   * Synchronize ViewModel state directly from an already loaded User instance (e.g. AuthContext)
   * @param {import('../../models/User.js').User|null} user
   */
  syncFromUser = (user) => {
    this.setState(this._mapUserToState(user));
  };

  /**
   * Load user profile by UID from UserRepository (Firestore + IndexedDB fallback)
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  loadUser = async (uid) => {
    return this._runUserAction('loadUser', () => this.repository.getUser(uid));
  };

  /**
   * Restore active session user during autologin (online or offline)
   * @param {string|null} [uid=null]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  restoreSession = async (uid = null) => {
    return this._runUserAction('restoreSession', () => this.repository.getSessionUser(uid));
  };

  /**
   * Create or update user on login/registration
   * @param {Object} userInput
   * @param {string|null} [username=null]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  saveUser = async (userInput, username = null) => {
    return this._runUserAction('saveUser', () => this.repository.saveUser(userInput, username));
  };

  /**
   * Update user profile metadata (username, photoURL, language)
   * @param {string} uid
   * @param {Object} [profileUpdates={}]
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  updateProfile = async (uid, profileUpdates = {}) => {
    return this._runUserAction('updateProfile', () => this.repository.updateProfile(uid, profileUpdates));
  };

  /**
   * Switch user preferred language ('it-IT' | 'en-US') and persist in Firestore + IndexedDB
   * @param {string} uid
   * @param {string} language
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  switchLanguage = async (uid, language) => {
    const normalized = this.normalizeLanguage(language);
    return this._runUserAction('switchLanguage', () => this.repository.updateLanguage(uid, normalized));
  };

  /**
   * Add item to user watchlist
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  addToWatchlist = async (uid, item) => {
    return this._runUserAction('watchlistMutation', () => this.repository.addToWatchlist(uid, item));
  };

  /**
   * Remove item from user watchlist
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  removeFromWatchlist = async (uid, itemOrId) => {
    return this._runUserAction('watchlistMutation', () => this.repository.removeFromWatchlist(uid, itemOrId));
  };

  /**
   * Toggle item in user watchlist
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  toggleWatchlist = async (uid, item) => {
    const targetId = extractItemKey(item);
    const exists = this.state.watchlist.some((entry) => extractItemKey(entry) === targetId);
    return exists ? this.removeFromWatchlist(uid, targetId) : this.addToWatchlist(uid, item);
  };

  /**
   * Add item to user favorites
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  addToFavorites = async (uid, item) => {
    return this._runUserAction('favoritesMutation', () => this.repository.addToFavorites(uid, item));
  };

  /**
   * Remove item from user favorites
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  removeFromFavorites = async (uid, itemOrId) => {
    return this._runUserAction('favoritesMutation', () => this.repository.removeFromFavorites(uid, itemOrId));
  };

  /**
   * Toggle item in user favorites
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  toggleFavorite = async (uid, item) => {
    const targetId = extractItemKey(item);
    const exists = this.state.favorites.some((entry) => extractItemKey(entry) === targetId);
    return exists ? this.removeFromFavorites(uid, targetId) : this.addToFavorites(uid, item);
  };

  /**
   * Add item to user watched history
   * @param {string} uid
   * @param {*} item
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  addToWatched = async (uid, item) => {
    return this._runUserAction('watchedMutation', () => this.repository.addToWatched(uid, item));
  };

  /**
   * Remove item from user watched history
   * @param {string} uid
   * @param {*} itemOrId
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  removeFromWatched = async (uid, itemOrId) => {
    return this._runUserAction('watchedMutation', () => this.repository.removeFromWatched(uid, itemOrId));
  };

  /**
   * Add or update review in user reviews
   * @param {string} uid
   * @param {*} review
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  addReview = async (uid, review) => {
    return this._runUserAction('reviewsMutation', () => this.repository.addReview(uid, review));
  };

  /**
   * Remove review from user reviews
   * @param {string} uid
   * @param {*} reviewOrId
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  removeReview = async (uid, reviewOrId) => {
    return this._runUserAction('reviewsMutation', () => this.repository.removeReview(uid, reviewOrId));
  };

  /**
   * Add friend to user friends list
   * @param {string} uid
   * @param {*} friend
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  addFriend = async (uid, friend) => {
    return this._runUserAction('friendsMutation', () => this.repository.addFriend(uid, friend));
  };

  /**
   * Remove friend from user friends list
   * @param {string} uid
   * @param {*} friendOrUid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  removeFriend = async (uid, friendOrUid) => {
    return this._runUserAction('friendsMutation', () => this.repository.removeFriend(uid, friendOrUid));
  };

  /**
   * Synchronize pending offline changes with Firestore
   * @param {string} uid
   * @returns {Promise<import('../../models/User.js').User|null>}
   */
  syncOfflineChanges = async (uid) => {
    return this.runAsync(
      'syncOfflineChanges',
      () => this.repository.syncPendingChanges(uid),
      (user) => (user ? this._mapUserToState(user) : {})
    );
  };

  /**
   * Clear active user session locally
   * @returns {Promise<void>}
   */
  logoutSession = async () => {
    await this.repository.clearSessionUser();
    this.setState(this._mapUserToState(null));
  };
}

export default UserViewModel;
