import { normalizeMediaReference, normalizeTimestamp, uniqueStrings } from './modelUtils.js';

/**
 * Review
 * Domain model representing a user review, rating, and like for a Movie, TV Series, Season, or Episode.
 * Stores only the media target identifiers (`targetKey`, `mediaType`, `mediaId`, `seasonNumber`, `episodeNumber`)
 * rather than the full media object.
 */
export class Review {
  /**
   * Build deterministic review ID: one review per user and media target
   * @param {string} uid
   * @param {string} targetKey
   * @returns {string}
   */
  static buildId(uid, targetKey) {
    return `rev_${uid}_${String(targetKey).replace(/:/g, '_')}`;
  }

  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    const target = normalizeMediaReference(data);

    this.uid = data.uid || null;
    this.username = data.username || null;
    this.userPhotoURL = data.userPhotoURL || null;

    this.targetKey = target.targetKey;
    this.mediaType = target.mediaType;
    this.mediaId = target.mediaId;
    this.seasonNumber = target.seasonNumber;
    this.episodeNumber = target.episodeNumber;

    this.id = data.id && !String(data.id).includes(':') ? data.id : Review.buildId(this.uid, this.targetKey);
    this.rating = data.rating !== undefined && data.rating !== null ? Number(data.rating) : null;
    this.text = data.text || '';
    this.liked = Boolean(data.liked);
    this.likes = uniqueStrings(data.likes);

    this.createdAt = normalizeTimestamp(data.createdAt) || new Date().toISOString();
    this.updatedAt = normalizeTimestamp(data.updatedAt) || this.createdAt;
  }

  /**
   * Number of users who liked this review
   * @returns {number}
   */
  get likesCount() {
    return this.likes.length;
  }

  /**
   * Return lightweight reference object suitable for storing inside `User.reviews`
   * @returns {Object}
   */
  toUserReference() {
    return {
      id: this.id,
      targetKey: this.targetKey,
      mediaType: this.mediaType,
      mediaId: this.mediaId,
      seasonNumber: this.seasonNumber,
      episodeNumber: this.episodeNumber,
      rating: this.rating,
      liked: this.liked
    };
  }

  /**
   * Convert Review instance into a plain serializable object for Firestore / IndexedDB
   * @returns {Object}
   */
  toPlainObject() {
    return {
      ...this.toUserReference(),
      uid: this.uid,
      username: this.username,
      userPhotoURL: this.userPhotoURL,
      text: this.text,
      likes: [...this.likes],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default Review;
