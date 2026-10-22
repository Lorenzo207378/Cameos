import { BaseRepository, STORES } from '../BaseRepository.js';
import { reviewBackend as defaultReviewBackend } from '../../backend/reviews/ReviewBackend.js';
import { userBackend as defaultUserBackend } from '../../backend/user/UserBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Review, MediaStats, normalizeMediaReference } from '../../models/index.js';

const reviewKey = (reviewId) => `review:${reviewId}`;
const statsKey = (targetKey) => `stats:${targetKey}`;
const userKey = (uid) => `user:${uid}`;

/**
 * ReviewRepository
 * Gestisce la persistenza e la sincronizzazione di recensioni, valutazioni, like e statistiche media.
 * Strategia: Network-First su Firestore con fallback locale su IndexedDB (`STORES.REVIEWS` e `STORES.MEDIA_STATS`).
 */
export class ReviewRepository extends BaseRepository {
  /**
   * @param {import('../../backend/reviews/ReviewBackend.js').ReviewBackend} [backend]
   * @param {import('../../backend/user/UserBackend.js').UserBackend} [userBackend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultReviewBackend, userBackend = defaultUserBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
    this.userBackend = userBackend;
  }

  /**
   * Salva le statistiche di un'opera nella cache locale IndexedDB
   * @param {MediaStats} stats
   * @returns {Promise<void>}
   */
  async cacheStats(stats) {
    if (!stats?.targetKey) return;
    await this.storage.put(STORES.MEDIA_STATS, {
      cacheKey: statsKey(stats.targetKey),
      targetKey: stats.targetKey,
      data: { ...stats }
    });
  }

  /**
   * Converte le recensioni in record per IndexedDB
   * @param {Array<Review>} reviews
   * @returns {Array<Object>}
   */
  reviewRecords(reviews) {
    return reviews.map((r) => ({
      cacheKey: reviewKey(r.id),
      uid: r.uid,
      targetKey: r.targetKey,
      data: { ...r }
    }));
  }

  /**
   * Crea o aggiorna una recensione e aggiorna le statistiche dell'opera e il profilo utente (richiede connettività)
   * @param {string} uid
   * @param {Object} reviewInput
   * @returns {Promise<{ review: Review, stats: MediaStats, userReviews: Array<Object> }>}
   */
  async saveReview(uid, reviewInput) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile salvare recensioni offline');
    }

    const { review, stats } = await this.backend.saveReview({ ...reviewInput, uid });

    await Promise.all([
      this.storage.putMany(STORES.REVIEWS, this.reviewRecords([review])),
      this.cacheStats(stats)
    ]);

    // Riferimento leggero da memorizzare nella lista reviews dell'utente
    const reviewRef = {
      id: review.id,
      targetKey: review.targetKey,
      mediaType: review.mediaType,
      mediaId: review.mediaId,
      seasonNumber: review.seasonNumber,
      episodeNumber: review.episodeNumber,
      rating: review.rating,
      liked: review.liked
    };

    let updatedReviews = [reviewRef];
    const localUser = await this.storage.get(STORES.USERS, userKey(uid));
    if (localUser?.data) {
      const filtered = (localUser.data.reviews || []).filter((r) => r.id !== review.id);
      updatedReviews = [...filtered, reviewRef];
      await this.storage.put(STORES.USERS, {
        ...localUser,
        data: { ...localUser.data, reviews: updatedReviews }
      });
    }

    await this.userBackend.updateUser(uid, { reviews: updatedReviews });

    return { review, stats, userReviews: updatedReviews };
  }

  /**
   * Elimina una recensione, ricalcola le statistiche e aggiorna la lista reviews dell'utente
   * @param {string} uid
   * @param {string} reviewId
   * @returns {Promise<{ stats: MediaStats|null, userReviews: Array<Object> }>}
   */
  async removeReview(uid, reviewId) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile eliminare recensioni offline');
    }

    const stats = await this.backend.deleteReview(reviewId);
    if (stats) await this.cacheStats(stats);
    await this.storage.delete(STORES.REVIEWS, reviewKey(reviewId));

    let updatedReviews = [];
    const localUser = await this.storage.get(STORES.USERS, userKey(uid));
    if (localUser?.data) {
      updatedReviews = (localUser.data.reviews || []).filter((r) => r.id !== reviewId);
      await this.storage.put(STORES.USERS, {
        ...localUser,
        data: { ...localUser.data, reviews: updatedReviews }
      });
    }

    await this.userBackend.updateUser(uid, { reviews: updatedReviews });

    return { stats, userReviews: updatedReviews };
  }

  /**
   * Tutte le recensioni di un'opera multimediale (Network-First + IndexedDB Fallback)
   * @param {Object|string|number} targetInput
   * @returns {Promise<Array<Review>>}
   */
  async getMediaReviews(targetInput) {
    const target = normalizeMediaReference(targetInput);

    return this.executeWithFallback({
      context: `media_reviews:${target.targetKey}`,
      fetchRemote: () => this.backend.getMediaReviews(target),
      saveLocal: async (reviews) => {
        const stale = await this.storage.getByIndex(STORES.REVIEWS, 'targetKey', target.targetKey);
        await Promise.all(stale.map((r) => this.storage.delete(STORES.REVIEWS, r.cacheKey)));
        await this.storage.putMany(STORES.REVIEWS, this.reviewRecords(reviews));
      },
      getLocal: async () => {
        const records = await this.storage.getByIndex(STORES.REVIEWS, 'targetKey', target.targetKey);
        return records.map((r) => new Review(r.data)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      }
    });
  }

  /**
   * Tutte le recensioni scritte da un utente (Network-First + IndexedDB Fallback)
   * @param {string} uid
   * @returns {Promise<Array<Review>>}
   */
  async getUserReviews(uid) {
    if (!uid) throw new Error('uid is required');

    return this.executeWithFallback({
      context: `user_reviews:${uid}`,
      fetchRemote: () => this.backend.getUserReviews(uid),
      saveLocal: async (reviews) => {
        const stale = await this.storage.getByIndex(STORES.REVIEWS, 'uid', uid);
        await Promise.all(stale.map((r) => this.storage.delete(STORES.REVIEWS, r.cacheKey)));
        await this.storage.putMany(STORES.REVIEWS, this.reviewRecords(reviews));
      },
      getLocal: async () => {
        const records = await this.storage.getByIndex(STORES.REVIEWS, 'uid', uid);
        return records.map((r) => new Review(r.data)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      }
    });
  }

  /**
   * Aggiunge o rimuove il like di un utente a una recensione (richiede connettività)
   * @param {string} reviewId
   * @param {string} likerUid
   * @returns {Promise<Review>}
   */
  async toggleReviewLike(reviewId, likerUid) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile modificare i like offline');
    }

    const review = await this.backend.toggleReviewLike(reviewId, likerUid);
    await this.storage.putMany(STORES.REVIEWS, this.reviewRecords([review]));
    return review;
  }

  /**
   * Aggiunge o rimuove il like diretto di un utente a un'opera multimediale (richiede connettività)
   * @param {string} uid
   * @param {Object|string|number} targetInput
   * @returns {Promise<MediaStats>}
   */
  async toggleMediaLike(uid, targetInput) {
    if (!this.isOnline()) {
      throw new Error('Connettività assente: impossibile modificare i like offline');
    }

    const stats = await this.backend.toggleMediaLike(uid, targetInput);
    await this.cacheStats(stats);
    return stats;
  }

  /**
   * Recupera le statistiche della community di un'opera (Network-First + IndexedDB Fallback)
   * @param {Object|string|number} targetInput
   * @returns {Promise<MediaStats>}
   */
  async getMediaStats(targetInput) {
    const target = normalizeMediaReference(targetInput);

    return this.executeWithFallback({
      context: statsKey(target.targetKey),
      fetchRemote: () => this.backend.getMediaStats(target),
      saveLocal: (stats) => this.cacheStats(stats),
      getLocal: async () => {
        const cached = await this.storage.get(STORES.MEDIA_STATS, statsKey(target.targetKey));
        return new MediaStats(cached?.data || target);
      }
    });
  }

  /**
   * Sincronizza i contatori delle preferenze (watchlist, favorites, watched)
   * @param {string} uid
   * @param {Object|string|number} targetInput
   * @param {string} listName
   * @param {boolean} isAdded
   * @returns {Promise<MediaStats>}
   */
  async syncMediaPreference(uid, targetInput, listName, isAdded) {
    if (!this.isOnline()) return null;
    const stats = await this.backend.syncMediaPreference(uid, targetInput, listName, isAdded);
    await this.cacheStats(stats);
    return stats;
  }
}

export const reviewRepository = new ReviewRepository();
export default ReviewRepository;
