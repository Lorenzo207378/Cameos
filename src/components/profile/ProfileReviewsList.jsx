import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { resolveLocalizedText } from '../../models/utils/index.js';
import '../../css/common/mediaIconButton.css';

/**
 * @param {any} media
 * @param {Object|null|undefined} review
 * @param {string} langKey
 * @returns {string}
 */
function resolveReviewTitle(media, review, langKey) {
  return (
    resolveLocalizedText(media?.titles || media?.names || media?.title || media?.name, langKey)
    || review?.targetKey
    || ''
  );
}

/**
 * ProfileReviewsList
 * Colonna o pagina scrollabile delle recensioni pubblicate dall'utente.
 * @param {Object} props
 * @param {Array<{ media: any, review: Object|null }>} [props.reviewItems=[]]
 * @param {number} [props.reviewsCount=0]
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.isCollapsed=false]
 * @param {() => void} [props.onToggleCollapse]
 * @returns {import('react').ReactElement}
 */
export default function ProfileReviewsList({
  reviewItems = [],
  reviewsCount = 0,
  loading = false,
  isCollapsed = false,
  onToggleCollapse = undefined
}) {
  const { t, langKey } = useTranslation();

  return (
    <aside className="profile-reviews-panel d-flex flex-column w-100 h-100">
      <div className="profile-reviews-header d-flex align-items-center gap-2 flex-shrink-0 pb-2 mb-2">
        <i className="bi bi-chat-square-text-fill text-success" aria-hidden="true" />
        <h2 className="profile-reviews-title mb-0">{t('profile.reviewsHeading')}</h2>
        <span className="profile-reviews-counter">({reviewsCount})</span>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="media-icon-button ms-auto profile-reviews-collapse-btn"
            aria-expanded={!isCollapsed}
            aria-label={t('detail.collapse')}
            title={t('detail.collapse')}
          >
            <i className="bi bi-chevron-right text-white" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="profile-reviews-scroll-list scrollbar-none pe-1">
        {loading && reviewItems.length === 0 ? (
          <div className="profile-reviews-state py-4 px-3 text-center text-white-50" role="status">
            <span className="spinner-border spinner-border-sm text-success me-2" aria-hidden="true" />
            <span className="profile-state-text">{t('common.loading')}</span>
          </div>
        ) : reviewItems.length === 0 ? (
          <div className="profile-reviews-state py-4 px-3 text-center text-white-50">
            <i className="bi bi-chat-square text-secondary d-block mb-2 fs-4" aria-hidden="true" />
            <p className="mb-0 profile-state-text">{t('profile.noReviewsYet')}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {reviewItems.map(({ media, review }, index) => (
              <article
                key={review?.id || review?.targetKey || index}
                className="profile-review-placeholder-card p-2"
              >
                <div className="d-flex align-items-center justify-content-between gap-2 mb-1">
                  <h3 className="profile-review-card-title text-single-line mb-0">
                    {resolveReviewTitle(media, review, langKey)}
                  </h3>
                  {review?.rating !== null && review?.rating !== undefined && (
                    <span className="badge bg-dark text-warning border border-warning border-opacity-25 flex-shrink-0">
                      <i className="bi bi-star-fill me-1" aria-hidden="true" />
                      {review.rating}
                    </span>
                  )}
                </div>
                {review?.text && (
                  <p className="profile-review-card-text text-white-50 mb-0">{review.text}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

ProfileReviewsList.propTypes = {
  reviewItems: PropTypes.array,
  reviewsCount: PropTypes.number,
  loading: PropTypes.bool,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func
};
