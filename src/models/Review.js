import { normalizeMediaReference, normalizeTimestamp } from './modelUtils.js';

/**
 * Review
 * Domain model representing a user review, rating, and like for a Movie, TV Series, Season, or Episode.
 * Stores only lightweight media identifiers (`targetKey`, `mediaType`, `mediaId`, `seasonNumber`, `episodeNumber`)
 * rather than full media objects.
 */
export class Review {
  /**
   * Build deterministic review ID per user and media target
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
    const ref = normalizeMediaReference(
      {
        targetKey: data.targetKey,
        id: data.mediaId ?? data.id,
        mediaId: data.mediaId ?? data.id,
        mediaType: data.mediaType,
        seasonNumber: data.seasonNumber,
        episodeNumber: data.episodeNumber
      },
      data.mediaType || 'movie'
    );

    this.uid = data.uid || null;
    this.username = data.username || null;
    this.userPhotoURL = data.userPhotoURL || null;
    this.targetKey = ref.targetKey;
    this.mediaType = ref.mediaType;
    this.mediaId = ref.mediaId;
    this.seasonNumber = ref.seasonNumber;
    this.episodeNumber = ref.episodeNumber;
    this.id =
      typeof data.id === 'string' && !data.id.includes(':')
        ? data.id
        : (data.reviewId || (this.uid ? Review.buildId(this.uid, this.targetKey) : `rev_${ref.targetKey}`));

    this.rating = data.rating !== undefined && data.rating !== null ? Number(data.rating) : null;
    this.text = data.text || '';
    this.liked = Boolean(data.liked);
    this.likes = Array.isArray(data.likes) ? Array.from(new Set(data.likes.map(String))) : [];
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
      reviewId: this.id,
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
      id: this.id,
      uid: this.uid,
      username: this.username,
      userPhotoURL: this.userPhotoURL,
      targetKey: this.targetKey,
      mediaType: this.mediaType,
      mediaId: this.mediaId,
      seasonNumber: this.seasonNumber,
      episodeNumber: this.episodeNumber,
      rating: this.rating,
      text: this.text,
      liked: this.liked,
      likes: [...this.likes],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export default Review;
