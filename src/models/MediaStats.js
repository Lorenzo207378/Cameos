import { normalizeMediaReference, normalizeTimestamp } from './modelUtils.js';

/**
 * MediaStats
 * Domain model tracking community likes, ratings, and preference lists (watchlist, favorites, watched)
 * for a specific Movie, TV Series, Season, or Episode in Firestore (`media_stats` collection).
 * Stores only media identifiers (`targetKey`, `mediaType`, `mediaId`, `seasonNumber`, `episodeNumber`)
 * and user UID arrays/counters, avoiding full media object duplication.
 */
export class MediaStats {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    const ref = normalizeMediaReference(
      {
        targetKey: data.targetKey || data.id,
        id: data.mediaId ?? data.id,
        mediaId: data.mediaId ?? data.id,
        mediaType: data.mediaType,
        seasonNumber: data.seasonNumber,
        episodeNumber: data.episodeNumber
      },
      data.mediaType || 'movie'
    );

    this.id = ref.targetKey;
    this.targetKey = ref.targetKey;
    this.mediaType = ref.mediaType;
    this.mediaId = ref.mediaId;
    this.seasonNumber = ref.seasonNumber;
    this.episodeNumber = ref.episodeNumber;

    this.likedBy = Array.isArray(data.likedBy) ? Array.from(new Set(data.likedBy.map(String))) : [];
    this.favoritedBy = Array.isArray(data.favoritedBy) ? Array.from(new Set(data.favoritedBy.map(String))) : [];
    this.watchlistedBy = Array.isArray(data.watchlistedBy) ? Array.from(new Set(data.watchlistedBy.map(String))) : [];
    this.watchedBy = Array.isArray(data.watchedBy) ? Array.from(new Set(data.watchedBy.map(String))) : [];

    this.ratingCount = Number(data.ratingCount) || 0;
    this.ratingSum = Number(data.ratingSum) || 0;
    this.averageRating =
      this.ratingCount > 0
        ? Number((this.ratingSum / this.ratingCount).toFixed(2))
        : (Number(data.averageRating) || 0);

    this.updatedAt = normalizeTimestamp(data.updatedAt) || new Date().toISOString();
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
