import { normalizeMediaReference, normalizeTimestamp, uniqueStrings } from './modelUtils.js';

/**
 * MediaStats
 * Domain model tracking community likes, ratings, and preference lists (watchlist, favorites, watched)
 * for a specific Movie, TV Series, Season, or Episode in Firestore (`media_stats` collection).
 * Stores only the media target identifiers and user UID arrays/counters, avoiding full media object duplication.
 */
export class MediaStats {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    const target = normalizeMediaReference(data);

    this.id = target.targetKey;
    this.targetKey = target.targetKey;
    this.mediaType = target.mediaType;
    this.mediaId = target.mediaId;
    this.seasonNumber = target.seasonNumber;
    this.episodeNumber = target.episodeNumber;

    this.likedBy = uniqueStrings(data.likedBy);
    this.favoritedBy = uniqueStrings(data.favoritedBy);
    this.watchlistedBy = uniqueStrings(data.watchlistedBy);
    this.watchedBy = uniqueStrings(data.watchedBy);

    this.ratingCount = Number(data.ratingCount) || 0;
    this.ratingSum = Number(data.ratingSum) || 0;

    this.updatedAt = normalizeTimestamp(data.updatedAt) || new Date().toISOString();
  }

  /** @returns {number} Average rating rounded to 2 decimals (0 when no rating exists) */
  get averageRating() {
    return this.ratingCount > 0 ? Number((this.ratingSum / this.ratingCount).toFixed(2)) : 0;
  }

  /** @returns {number} */
  get likesCount() {
    return this.likedBy.length;
  }

  /** @returns {number} */
  get favoritesCount() {
    return this.favoritedBy.length;
  }

  /** @returns {number} */
  get watchlistCount() {
    return this.watchlistedBy.length;
  }

  /** @returns {number} */
  get watchedCount() {
    return this.watchedBy.length;
  }

  /**
   * Convert MediaStats instance into a plain serializable object for Firestore / IndexedDB
   * @returns {Object}
   */
  toPlainObject() {
    return {
      id: this.id,
      targetKey: this.targetKey,
      mediaType: this.mediaType,
      mediaId: this.mediaId,
      seasonNumber: this.seasonNumber,
      episodeNumber: this.episodeNumber,
      likedBy: [...this.likedBy],
      favoritedBy: [...this.favoritedBy],
      watchlistedBy: [...this.watchlistedBy],
      watchedBy: [...this.watchedBy],
      ratingCount: this.ratingCount,
      ratingSum: this.ratingSum,
      averageRating: this.averageRating,
      updatedAt: this.updatedAt
    };
  }
}

export default MediaStats;
