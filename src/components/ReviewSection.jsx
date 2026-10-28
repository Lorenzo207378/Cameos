import { formatTranslation } from '../utils/translationUtils.js';
import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useReviewViewModel } from '../viewmodel/useViewModel.js';
import { Review } from '../models/Review.js';
import { useTranslation } from '../utils/translations.js';

/**
 * ReviewSection
 * Lista scrollabile di recensioni utente + modale interattiva per scrivere nuove recensioni e voti.
 *
 * @param {Object} props
 * @param {Array<import('../models/Review.js').Review|Object>} [props.initialReviews=[]]
 * @param {string} [props.targetKey]
 * @param {boolean} [props.isModalOpen=false]
 * @param {Function} [props.onCloseModal]
 * @param {string} [props.title]
 */
export default function ReviewSection({
  initialReviews = [],
  targetKey = 'movie:299534',
  isModalOpen = false,
  onCloseModal,
  title
}) {
  const { user, userProfile } = useAuth();
  const { t } = useTranslation();
  const reviewVm = useReviewViewModel();

  const sectionTitle = title || t('reviews.sectionTitle');
  const [reviews, setReviews] = useState(initialReviews);
  const [internalModalOpen, setInternalModalOpen] = useState(false);

  // Form state
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalShown = isModalOpen || internalModalOpen;
  const closeModal = () => {
    if (onCloseModal) onCloseModal();
    setInternalModalOpen(false);
  };

  const handleLikeReview = async (reviewId) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          const currentLikes = r.likes || [];
          const currentUid = user?.uid || 'guest_user';
          const hasLiked = currentLikes.includes(currentUid);
          const updatedLikes = hasLiked
            ? currentLikes.filter((uid) => uid !== currentUid)
            : [...currentLikes, currentUid];
          return new Review({ ...r, likes: updatedLikes });
        }
        return r;
      })
    );

    if (user?.uid) {
      try {
        await reviewVm.toggleReviewLike(reviewId, user.uid);
      } catch {
        // Handled in local state
      }
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    const authorName = userProfile?.username || user?.displayName || t('reviews.reviewerBadge');
    const authorUid = user?.uid || `guest_${Date.now()}`;

    const newReview = new Review({
      id: `rev_${authorUid}_${Date.now()}`,
      uid: authorUid,
      username: authorName,
      userPhotoURL: user?.photoURL || null,
      targetKey,
      rating,
      text: commentText.trim(),
      likes: [],
      createdAt: new Date().toISOString()
    });

    setReviews((prev) => [newReview, ...prev]);

    if (user?.uid) {
      try {
        await reviewVm.saveReview(user.uid, {
          targetKey,
          rating,
          text: commentText.trim()
        });
      } catch {
        // Fallback handled in local state
      }
    }

    setCommentText('');
    setIsSubmitting(false);
    closeModal();
  };

  return (
    <section className="review-section mt-5 pt-3">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-chat-square-quote-fill text-success fs-4"></i>
          <h3 className="h4 fw-bold text-white mb-0">{sectionTitle}</h3>
          <span className="badge bg-dark border border-secondary border-opacity-50 text-white-50 ms-2">
            {reviews.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setInternalModalOpen(true)}
          className="btn btn-outline-success rounded-pill px-3 py-2 fw-semibold d-flex align-items-center gap-2 shadow-sm"
        >
          <i className="bi bi-pencil-square"></i>
          <span>{t('reviews.writeReviewBtn')}</span>
        </button>
      </div>

      {reviews.length === 0 ? (
        <div className="card-2pxb-dark-background rounded-4 p-4 text-center text-white-50">
          <i className="bi bi-chat-dots fs-1 mb-2 d-block text-secondary"></i>
          <p className="mb-0">{t('reviews.noReviewsNotice')}</p>
        </div>
      ) : (
        <div className="d-flex gap-3 overflow-x-auto pb-3 scrollbar-none" style={{ scrollSnapType: 'x mandatory' }}>
          {reviews.map((rev) => {
            const isLikedByMe = (rev.likes || []).includes(user?.uid || '');
            const revLikes = rev.likes || [];
            const dateStr = rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : '';

            return (
              <div
                key={rev.id}
                className="card-2pxb-dark-background rounded-4 p-3 flex-shrink-0 d-flex flex-column justify-content-between shadow-sm"
                style={{ width: '320px', minHeight: '180px', scrollSnapAlign: 'start' }}
              >
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <div
                        className="rounded-circle bg-success text-white fw-bold d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '34px', height: '34px', fontSize: '13px' }}
                      >
                        {rev.username ? rev.username.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="text-truncate" style={{ maxWidth: '160px' }}>
                        <div className="fw-semibold text-truncate small text-white">{rev.username || t('nav.user')}</div>
                        <div className="text-white-50 small" style={{ fontSize: '11px' }}>{dateStr}</div>
                      </div>
                    </div>

                    <div className="text-warning small text-nowrap">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <i
                          key={i}
                          className={`bi ${i < (rev.rating || 5) ? 'bi-star-fill text-warning' : 'bi-star text-secondary'}`}
                        ></i>
                      ))}
                    </div>
                  </div>

                  <p className="text-white-50 small mb-3 fst-italic" style={{ lineHeight: '1.5' }}>
                    "{rev.text}"
                  </p>
                </div>

                <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 text-white-50 small">
                  <button
                    type="button"
                    onClick={() => handleLikeReview(rev.id)}
                    className="btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center gap-1"
                    style={{ color: isLikedByMe ? '#dc3545' : 'rgba(255, 255, 255, 0.6)' }}
                  >
                    <i className={`bi ${isLikedByMe ? 'bi-heart-fill text-danger' : 'bi-heart'}`}></i>
                    <span>{formatTranslation(t('reviews.likesCount'), { count: revLikes.length })}</span>
                  </button>

                  <span className="badge bg-dark text-white-50 border border-secondary border-opacity-25 px-2 py-1">
                    Verificata
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE SCRIVI RECENSIONE */}
      <Modal show={modalShown} onHide={closeModal} centered data-bs-theme="dark">
        <form onSubmit={handleSubmitReview}>
          <Modal.Header closeButton className="border-secondary border-opacity-25">
            <Modal.Title className="h5 fw-bold text-white d-flex align-items-center gap-2">
              <i className="bi bi-star-fill text-warning"></i> {t('reviews.modalTitle')}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="mb-3 text-center">
              <label className="form-label text-white-50 small d-block mb-2">{t('reviews.yourRating')}</label>
              <div className="d-flex justify-content-center gap-2 fs-3 text-warning cursor-pointer">
                {[1, 2, 3, 4, 5].map((star) => (
                  <i
                    key={star}
                    className={`bi ${
                      star <= (hoverRating || rating) ? 'bi-star-fill' : 'bi-star'
                    }`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  ></i>
                ))}
              </div>
              <small className="text-warning fw-semibold mt-1 d-block">{formatTranslation(t('reviews.starsCount'), { count: rating })}</small>
            </div>

            <div className="mb-3">
              <label className="form-label text-white fw-semibold small">{t('reviews.yourComment')}</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder={t('reviews.commentPlaceholder')}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
              />
            </div>
          </Modal.Body>

          <Modal.Footer className="border-secondary border-opacity-25">
            <Button variant="outline-secondary" onClick={closeModal} className="rounded-pill px-4">
              {t('reviews.cancelBtn')}
            </Button>
            <Button
              variant="success"
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="rounded-pill px-4 fw-bold"
            >
              {isSubmitting ? t('reviews.publishing') : t('reviews.publishBtn')}
            </Button>
          </Modal.Footer>
        </form>
      </Modal>
    </section>
  );
}
