import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { resolveLocalizedText } from '../../models/utils/index.js';

/**
 * ProfileReviewsList
 * Colonna o pagina scrollabile delle recensioni pubblicate dall'utente.
 * @param {Object} props
 * @param {Array<{ media: any, review: Object|null }>} [props.reviewItems=[]]
 * @param {number} [props.reviewsCount=0]
 * @param {boolean} [props.loading=false]
 * @returns {import('react').JSX.Element}
 */
export default function ProfileReviewsList({
  reviewItems = [],
  reviewsCount = 0,
  loading = false
}) {
  const { t, langKey } = useTranslation();

  return (
    <aside className="profile-reviews-panel">
      <div className="profile-reviews-header d-flex align-items-center gap-2">
        <i className="bi bi-chat-square-text-fill text-success" aria-hidden="true" />
        <h2 className="profile-reviews-title mb-0">{t('profile.reviewsHeading')}</h2>
        <span className="profile-reviews-counter">({reviewsCount})</span>
      </div>

      <div className="profile-reviews-scroll-list scrollbar-none">
        {loading && reviewItems.length === 0 ? (
          <div className="profile-reviews-state text-white-50" role="status">
            <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
            <span className="profile-state-text">{t('common.loading')}</span>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="profile-reviews-state text-white-50">
            <i className="bi bi-chat-square text-secondary d-block mb-2 fs-4" aria-hidden="true" />
            <p className="mb-0 profile-state-text">{t('profile.noReviewsYet')}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {reviewItems.map(({ media, review }, index) => {
              const title = resolveLocalizedText(
                media?.titles || media?.names || media?.title || media?.name,
                langKey
              ) || review?.targetKey || '';
              const rating = review?.rating;
              const text = review?.text;

              return (
                <article
                  key={review?.id || review?.targetKey || index}
                  className="profile-review-placeholder-card"
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                    <h3 className="profile-review-card-title text-single-line mb-0">{title}</h3>
                    {rating !== null && rating !== undefined && (
                      <span className="badge bg-dark text-warning border border-warning border-opacity-25 flex-shrink-0">
                        <i className="bi bi-star-fill me-1" aria-hidden="true" />
                        {rating}
                      </span>
                    )}
                  </div>
                  {text && (
                    <p className="profile-review-card-text text-white-50 mb-0">{text}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
