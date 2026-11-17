import PropTypes from 'prop-types';
import MediaCard from './MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * Shared category grid shell with fixed glass header, count badge, empty/error state, and Load More footer.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle='']
 * @param {string} props.countIcon
 * @param {string} props.countLabel
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'} props.type
 * @param {boolean} [props.upcoming=false]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 * @param {string|null} [props.error=null]
 * @param {() => void} props.onBack
 * @param {() => void} props.onLoadMore
 * @param {() => void} props.onRetry
 * @returns {import('react').JSX.Element}
 */
export default function MediaCategoryLayout({
  title,
  subtitle = '',
  countIcon,
  countLabel,
  items,
  type,
  upcoming = false,
  hasMore = false,
  isLoadingMore = false,
  error = null,
  onBack,
  onLoadMore,
  onRetry
}) {
  const { t } = useTranslation();

  return (
    <div className="media-category-page w-100">
      <header className="glass-header-fixed">
        <div className="media-category-header-content container-fluid px-2 px-sm-4 px-md-5">
          <div className="d-flex align-items-center gap-2 gap-sm-3 min-w-0 flex-grow-1">
            <button
              type="button"
              onClick={onBack}
              className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" />
            </button>
            <div className="min-w-0">
              {subtitle && (
                <p className="text-success text-uppercase fw-bold mb-0 category-subtitle text-truncate">
                  {subtitle}
                </p>
              )}
              <h1 className="h4 text-white fw-bold mb-0 category-title text-truncate">
                {title}
              </h1>
            </div>
          </div>

          <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary rounded-pill fw-normal d-flex align-items-center gap-1 gap-sm-2 count-pill flex-shrink-0">
            <i className={`bi ${countIcon} text-success`} />
            <span>{countLabel}</span>
          </span>
        </div>
      </header>

      <div className="media-category-scroll-container scrollbar-none">
        <div className="container-fluid px-2 px-sm-4 px-md-5">
          {items.length > 0 ? (
            <div className="media-category-grid">
              {items.map((item) => (
                <MediaCard key={item.id} item={item} type={type} upcoming={upcoming} />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 my-5">
              <i className="bi bi-camera-reels text-secondary display-3 mb-3 d-block" />
              <p className="text-muted fs-5" role={error ? 'alert' : undefined}>
                {t(error ? 'common.error' : 'common.noResults')}
              </p>
              {error && (
                <button type="button" className="btn btn-outline-success rounded-pill" onClick={onRetry}>
                  {t('common.retry')}
                </button>
              )}
            </div>
          )}

          {hasMore && items.length > 0 && (
            <div className="d-flex justify-content-center mt-4 mb-4">
              <button
                type="button"
                className="btn btn-outline-success px-4 py-2 fw-bold rounded-pill d-inline-flex align-items-center gap-2 shadow load-more-btn"
                onClick={onLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>{t('common.loadingMore')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('common.loadMore')}</span>
                    <i className="bi bi-chevron-down" />
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <div className="text-center text-muted small mt-4 mb-4">
              <p className="mb-0 text-secondary opacity-75">
                <i className="bi bi-check2-circle me-1 text-success" />
                {t('common.noMoreItems')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

MediaCategoryLayout.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  countIcon: PropTypes.string.isRequired,
  countLabel: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  type: PropTypes.oneOf(['movie', 'tv']).isRequired,
  upcoming: PropTypes.bool,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  onBack: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired
};
