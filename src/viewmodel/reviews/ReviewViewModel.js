import { BaseViewModel } from '../BaseViewModel.js';
import { reviewRepository as defaultReviewRepository } from '../../repository/reviews/ReviewRepository.js';
import { normalizeMediaReference } from '../../models/index.js';

/**
 * @typedef {Object} ReviewViewModelState
 * @property {string|null} mediaTargetKey
 * @property {Array<import('../../models/Review.js').Review>} mediaReviews
 * @property {Array<import('../../models/Review.js').Review>} userReviews
 * @property {Object|null} currentMediaStats
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * ReviewViewModel
 * ViewModel MVVM per la gestione e la visualizzazione di recensioni, valutazioni, like e statistiche media.
 */
export class ReviewViewModel extends BaseViewModel {
  /** @type {import('../../repository/reviews/ReviewRepository.js').ReviewRepository} */
  repository;

  /**
   * @param {import('../../repository/reviews/ReviewRepository.js').ReviewRepository} [repository]
   * @param {Object} [options={}]
   */
  constructor(repository = defaultReviewRepository, options = {}) {
    super(
      {
        mediaTargetKey: null,
        mediaReviews: [],
        userReviews: [],
        currentMediaStats: null
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {ReviewViewModelState}
   */
  get state() {
    return /** @type {ReviewViewModelState} */ (super.state);
  }

  /**
   * Carica recensioni e statistiche di un'opera multimediale (film, serie, stagione, episodio)
   * @param {Object|string|number} targetInput
   * @returns {Promise<Object|null>}
   */
  loadMediaFeedback = (targetInput) => {
    const { targetKey } = normalizeMediaReference(targetInput);

    return this.runAsync(
      'loadMediaFeedback',
      async () => {
        const [mediaReviews, currentMediaStats] = await Promise.all([
          this.repository.getMediaReviews(targetInput),
          this.repository.getMediaStats(targetInput)
        ]);
        return { mediaReviews, currentMediaStats, mediaTargetKey: targetKey };
      },
      (data) => data
    );
  };

  /**
   * Carica tutte le recensioni scritte da uno specifico utente
   * @param {string} uid
   * @returns {Promise<Array<Object>|null>}
   */
  loadUserReviews = (uid) => {
    return this.runAsync(
      'loadUserReviews',
      () => this.repository.getUserReviews(uid),
      (userReviews) => ({ userReviews })
    );
  };

  /**
   * Salva una recensione/valutazione per l'opera
   * @param {string} uid
   * @param {Object} reviewInput
   * @returns {Promise<Object|null>}
   */
  saveReview = (uid, reviewInput) => {
    return this.runAsync(
      'saveReview',
      () => this.repository.saveReview(uid, reviewInput),
      ({ review, stats }) => {
        const isCurrent = !this.state.mediaTargetKey || review.targetKey === this.state.mediaTargetKey;
        return {
          userReviews: [review, ...this.state.userReviews.filter((r) => r.id !== review.id)],
          ...(isCurrent && {
            mediaTargetKey: review.targetKey,
            mediaReviews: [review, ...this.state.mediaReviews.filter((r) => r.id !== review.id)],
            currentMediaStats: stats
          })
        };
      }
    );
  };

  /**
   * Elimina una recensione
   * @param {string} uid
   * @param {string} reviewId
   * @returns {Promise<boolean|null>}
   */
  removeReview = (uid, reviewId) => {
    return this.runAsync(
      'removeReview',
      async () => {
        const res = await this.repository.removeReview(uid, reviewId);
        return res.stats;
      },
      (stats) => ({
        userReviews: this.state.userReviews.filter((r) => r.id !== reviewId),
        mediaReviews: this.state.mediaReviews.filter((r) => r.id !== reviewId),
        ...(stats && stats.targetKey === this.state.mediaTargetKey && { currentMediaStats: stats })
      })
    );
  };

  /**
   * Aggiunge o rimuove il like di un utente ad una recensione
   * @param {string} reviewId
   * @param {string} likerUid
   * @returns {Promise<Object|null>}
   */
  toggleReviewLike = (reviewId, likerUid) => {
    return this.runAsync(
      'toggleReviewLike',
      () => this.repository.toggleReviewLike(reviewId, likerUid),
      (updated) => ({
        mediaReviews: this.state.mediaReviews.map((r) => (r.id === updated.id ? updated : r))
      })
    );
  };

  /**
   * Aggiunge o rimuove il like diretto ad un'opera multimediale
   * @param {string} uid
   * @param {Object|string|number} targetInput
   * @returns {Promise<Object|null>}
   */
  toggleMediaLike = (uid, targetInput) => {
    return this.runAsync(
      'toggleMediaLike',
      () => this.repository.toggleMediaLike(uid, targetInput),
      (stats) => ({
        mediaTargetKey: stats.targetKey,
        currentMediaStats: stats
      })
    );
  };
}

export default ReviewViewModel;
