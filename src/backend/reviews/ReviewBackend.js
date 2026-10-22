import { defaultDb, defaultFirestoreAdapter } from '../firestoreAdapter.js';
import { notificationBackend as defaultNotificationBackend } from '../notifications/NotificationBackend.js';
import { Review, MediaStats, NOTIFICATION_TYPES, normalizeMediaReference, uniqueStrings } from '../../models/index.js';

const REVIEWS_COLLECTION = 'media_reviews';
const MEDIA_STATS_COLLECTION = 'media_stats';

const STATS_FIELD_BY_LIST = {
  watchlist: 'watchlistedBy',
  favorites: 'favoritedBy',
  watched: 'watchedBy'
};

function toggleListMember(list, value, shouldBePresent) {
  return shouldBePresent
    ? uniqueStrings([...(list || []), value])
    : (list || []).filter((item) => item !== value);
}

/**
 * ReviewBackend
 * Ambito: Gestione remota di recensioni, valutazioni, like e statistiche aggregate dei media su Cloud Firestore.
 */
export class ReviewBackend {
  /**
   * @param {import('firebase/firestore').Firestore} [db]
   * @param {Object} [adapter]
   * @param {import('../notifications/NotificationBackend.js').NotificationBackend} [notificationBackend]
   */
  constructor(db = defaultDb, adapter = defaultFirestoreAdapter, notificationBackend = defaultNotificationBackend) {
    this.db = db;
    this.adapter = adapter;
    this.notificationBackend = notificationBackend;
  }

  /**
   * Recupera le statistiche aggregate di un'opera multimediale
   * @param {Object|string|number} targetInput
   * @returns {Promise<MediaStats>}
   */
  async getMediaStats(targetInput) {
    const target = normalizeMediaReference(targetInput);
    const raw = await this.adapter.getDocument(this.db, MEDIA_STATS_COLLECTION, target.targetKey);
    return new MediaStats(raw || target);
  }

  /**
   * Aggiorna atomicamente le statistiche di un'opera multimediale
   * @param {Object|string|number} targetInput
   * @param {Function} updateFn
   * @returns {Promise<MediaStats>}
   */
  async updateMediaStats(targetInput, updateFn) {
    const stats = await this.getMediaStats(targetInput);
    const updated = new MediaStats({
      ...stats,
      ...updateFn(stats),
      updatedAt: new Date().toISOString()
    });

    await this.adapter.setDocument(this.db, MEDIA_STATS_COLLECTION, updated.targetKey, {
      id: updated.id,
      targetKey: updated.targetKey,
      mediaType: updated.mediaType,
      mediaId: updated.mediaId,
      seasonNumber: updated.seasonNumber,
      episodeNumber: updated.episodeNumber,
      likedBy: updated.likedBy,
      favoritedBy: updated.favoritedBy,
      watchlistedBy: updated.watchlistedBy,
      watchedBy: updated.watchedBy,
      ratingCount: updated.ratingCount,
      ratingSum: updated.ratingSum,
      updatedAt: updated.updatedAt
    });

    return updated;
  }

  /**
   * Ricalcola rating e like di un target basandosi sulle recensioni presenti
   * @param {Object} target
   * @param {Object} [options={}]
   * @returns {Promise<MediaStats>}
   */
  async syncStatsWithReviews(target, { savedReview = null, deletedReviewId = null } = {}) {
    const stored = await this.adapter.queryByField(this.db, REVIEWS_COLLECTION, 'targetKey', target.targetKey);
    const changedId = savedReview?.id ?? deletedReviewId;
    const reviews = stored.filter((r) => r.id !== changedId);
    if (savedReview) reviews.push(savedReview);

    const ratings = reviews.map((r) => Number(r.rating)).filter((r) => r > 0);

    return this.updateMediaStats(target, (stats) => ({
      ratingCount: ratings.length,
      ratingSum: ratings.reduce((sum, val) => sum + val, 0),
      ...(savedReview ? { likedBy: toggleListMember(stats.likedBy, savedReview.uid, savedReview.liked) } : {})
    }));
  }

  /**
   * Crea o aggiorna una recensione/valutazione/like per un'opera (film, serie, stagione o episodio)
   * @param {Object} reviewInput
   * @returns {Promise<{ review: Review, stats: MediaStats }>}
   */
  async saveReview(reviewInput) {
    if (!reviewInput?.uid) throw new Error('review.uid is required');

    const draft = new Review(reviewInput);
    const existing = await this.adapter.getDocument(this.db, REVIEWS_COLLECTION, draft.id);

    const review = new Review({
      ...draft,
      createdAt: existing?.createdAt || draft.createdAt,
      likes: existing?.likes || draft.likes,
      updatedAt: new Date().toISOString()
    });

    await this.adapter.setDocument(this.db, REVIEWS_COLLECTION, review.id, {
      id: review.id,
      targetKey: review.targetKey,
      mediaType: review.mediaType,
      mediaId: review.mediaId,
      seasonNumber: review.seasonNumber,
      episodeNumber: review.episodeNumber,
      uid: review.uid,
      username: review.username,
      userPhotoURL: review.userPhotoURL,
      rating: review.rating,
      text: review.text,
      liked: review.liked,
      likes: review.likes,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    });

    const stats = await this.syncStatsWithReviews(review, { savedReview: review });
    return { review, stats };
  }

  /**
   * Elimina una recensione e ricalcola le statistiche dell'opera
   * @param {string} reviewId
   * @returns {Promise<MediaStats|null>}
   */
  async deleteReview(reviewId) {
    if (!reviewId) throw new Error('reviewId is required');

    const existing = await this.adapter.getDocument(this.db, REVIEWS_COLLECTION, reviewId);
    if (!existing) return null;

    await this.adapter.deleteDocument(this.db, REVIEWS_COLLECTION, reviewId);
    return this.syncStatsWithReviews(new Review(existing), { deletedReviewId: reviewId });
  }

  /**
   * Tutte le recensioni di un'opera multimediale, ordinate dalla più recente
   * @param {Object|string|number} targetInput
   * @returns {Promise<Array<Review>>}
   */
  async getMediaReviews(targetInput) {
    const target = normalizeMediaReference(targetInput);
    const docs = await this.adapter.queryByField(this.db, REVIEWS_COLLECTION, 'targetKey', target.targetKey);
    return docs.map((data) => new Review(data)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /**
   * Tutte le recensioni scritte da un utente, ordinate dalla più recente
   * @param {string} uid
   * @returns {Promise<Array<Review>>}
   */
  async getUserReviews(uid) {
    if (!uid) throw new Error('uid is required');
    const docs = await this.adapter.queryByField(this.db, REVIEWS_COLLECTION, 'uid', uid);
    return docs.map((data) => new Review(data)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  /**
   * Aggiunge o rimuove il like di un utente ad una specifica recensione
   * @param {string} reviewId
   * @param {string} likerUid
   * @returns {Promise<Review>}
   */
  async toggleReviewLike(reviewId, likerUid) {
    if (!reviewId || !likerUid) throw new Error('reviewId and likerUid are required');

    const raw = await this.adapter.getDocument(this.db, REVIEWS_COLLECTION, reviewId);
    if (!raw) throw new Error(`Review "${reviewId}" not found`);

    const review = new Review(raw);
    const isLiking = !review.likes.includes(likerUid);
    const updatedLikes = toggleListMember(review.likes, likerUid, isLiking);

    const updated = new Review({
      ...review,
      likes: updatedLikes,
      updatedAt: new Date().toISOString()
    });

    await this.adapter.setDocument(
      this.db,
      REVIEWS_COLLECTION,
      updated.id,
      { likes: updatedLikes, updatedAt: updated.updatedAt },
      { merge: true }
    );

    if (isLiking && review.uid && review.uid !== likerUid) {
      await this.notificationBackend.notifySafely({
        recipientUid: review.uid,
        senderUid: likerUid,
        type: NOTIFICATION_TYPES.REVIEW_LIKE,
        title: 'Nuovo like alla tua recensione',
        message: 'Un utente ha messo like alla tua recensione.',
        referenceId: updated.id,
        payload: { reviewId: updated.id, targetKey: updated.targetKey }
      });
    }

    return updated;
  }

  /**
   * Aggiunge o rimuove il like diretto di un utente all'opera multimediale (media_stats.likedBy)
   * @param {string} uid
   * @param {Object|string|number} targetInput
   * @returns {Promise<MediaStats>}
   */
  async toggleMediaLike(uid, targetInput) {
    if (!uid) throw new Error('uid is required');
    return this.updateMediaStats(targetInput, (stats) => ({
      likedBy: toggleListMember(stats.likedBy, uid, !stats.likedBy.includes(uid))
    }));
  }

  /**
   * Sincronizza i contatori dell'opera multimediale quando un utente aggiunge/rimuove
   * l'opera dalle proprie preferenze (watchlist, favorites, watched)
   * @param {string} uid
   * @param {Object|string|number} targetInput
   * @param {string} listName
   * @param {boolean} isAdded
   * @returns {Promise<MediaStats>}
   */
  async syncMediaPreference(uid, targetInput, listName, isAdded) {
    const statsField = STATS_FIELD_BY_LIST[listName];
    if (!statsField) throw new Error(`Unknown preference list "${listName}"`);

    return this.updateMediaStats(targetInput, (stats) => ({
      [statsField]: toggleListMember(stats[statsField], uid, isAdded)
    }));
  }
}

export const reviewBackend = new ReviewBackend();
export default ReviewBackend;
