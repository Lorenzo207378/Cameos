import { normalizeLanguage, normalizeTimestamp } from './modelUtils.js';

/**
 * User
 * Domain model representing an application user stored in Firestore and cached in IndexedDB.
 */
export class User {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.uid = data.uid || null;
    this.email = data.email || null;
    this.username = data.username || null;
    this.photoURL = data.photoURL || null;
    this.language = normalizeLanguage(data.language || 'it-IT');
    this.friends = Array.isArray(data.friends) ? [...data.friends] : [];
    this.watchlist = Array.isArray(data.watchlist) ? [...data.watchlist] : [];
    this.reviews = Array.isArray(data.reviews) ? [...data.reviews] : [];
    this.favorites = Array.isArray(data.favorites) ? [...data.favorites] : [];
    this.watched = Array.isArray(data.watched) ? [...data.watched] : [];
    this.createdAt = normalizeTimestamp(data.createdAt);
    this.updatedAt = normalizeTimestamp(data.updatedAt);
  }

  /**
   * Convert User instance into a plain serializable object for Firestore / IndexedDB
   * @returns {Object}
   */
  toPlainObject() {
    return {
      uid: this.uid,
      email: this.email,
      username: this.username,
      photoURL: this.photoURL,
      language: this.language,
      friends: [...this.friends],
      watchlist: [...this.watchlist],
      reviews: [...this.reviews],
      favorites: [...this.favorites],
      watched: [...this.watched],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default User;
