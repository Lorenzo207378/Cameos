import PropTypes from 'prop-types';
import MediaCard from './MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * Shared category grid shell with fixed glass header, optional header actions, count badge,
 * empty/error state with retry, and optional Load More footer.
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle='']
 * @param {string} [props.countLabel]
 * @param {string} [props.emptyMessage]
 * @param {import('react').ReactNode} [props.headerActions]
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'|'mixed'} props.type
 * @param {boolean} [props.upcoming=false]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 * @param {Error|string|Object|null} [props.error=null]
 * @param {boolean} [props.isOffline=false]
 * @param {() => void} props.onBack
 * @param {() => void} [props.onLoadMore]
 * @param {() => void} [props.onRetry]
 * @returns {import('react').ReactElement}
 */
export default function MediaCategoryLayout({
  title,
  subtitle = '',
  countLabel = undefined,
  emptyMessage = undefined,
  headerActions = undefined,
  items,
  type,
  upcoming = false,
  hasMore = false,
  isLoadingMore = false,
  error = null,
  isOffline = false,
  onBack,
  onLoadMore = undefined,
  onRetry = undefined
}) {
  const { t, formatTranslation } = useTranslation();
  const countIcon = type === 'mixed' ? 'bi-collection' : (type === 'tv' ? 'bi-tv' : 'bi-film');
  const resolvedCountLabel = countLabel
    ?? formatTranslation(t('common.mediaCount'), {
      count: items.length,
      media: t(type === 'mixed' ? 'nav.media' : (type === 'tv' ? 'nav.tvSeries' : 'nav.movies'))
    });
  const emptyIcon = error
    ? (isOffline ? 'bi-wifi-off' : 'bi-exclamation-triangle')
    : (type === 'mixed' ? 'bi-collection' : 'bi-camera-reels');
  const showLoadMore = Boolean(hasMore && onLoadMore && (items.length > 0 || !error));

  return (
    <div className="media-category-page position-relative d-flex flex-column w-100">
      <header className="glass-header-fixed">
        <div className="media-category-header-content d-flex align-items-center justify-content-between gap-2 w-100 container-fluid px-2 px-sm-4 px-md-5">
          <div className="d-flex align-items-center gap-2 gap-sm-3 min-w-0 flex-grow-1">
            <button
              type="button"
              onClick={onBack}
              className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" aria-hidden="true" />
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

          <div className="d-flex align-items-center gap-2 gap-sm-3 flex-shrink-0">
            {headerActions && (
              <div className="media-category-header-actions d-flex align-items-center flex-shrink-0">
                {headerActions}
              </div>
            )}

            <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary rounded-pill fw-normal d-flex align-items-center gap-1 gap-sm-2 count-pill flex-shrink-0">
              <i className={`bi ${countIcon} text-success`} aria-hidden="true" />
              <span>{resolvedCountLabel}</span>
            </span>
          </div>
        </div>
      </header>

      <div className="media-category-scroll-container scrollbar-none">
        <div className="container-fluid px-2 px-sm-4 px-md-5">
          {items.length > 0 ? (
            <div className="media-category-grid">
              {items.map((item, idx) => (
                <MediaCard
                  key={item.targetKey || `${item.mediaType || type}-${item.seriesId ?? item.mediaId ?? item.id ?? idx}-${item.seasonNumber ?? ''}-${item.episodeNumber ?? ''}`}
                  item={item}
                  type={type === 'mixed' ? (item.mediaType === 'movie' ? 'movie' : 'tv') : type}
                  showType={type === 'mixed'}
                  upcoming={upcoming}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 my-5">
              <i className={`bi ${emptyIcon} text-secondary display-3 mb-3 d-block`} aria-hidden="true" />
              <p className="text-muted fs-5" role={error ? 'alert' : undefined}>
                {error ? t('common.error') : (emptyMessage || t('common.noResults'))}
              </p>
              {error && onRetry && (
                <button type="button" className="btn btn-outline-success rounded-pill" onClick={onRetry}>
                  {t('common.retry')}
                </button>
              )}
            </div>
          )}

          {items.length > 0 && error && (
            <p className="text-danger text-center small mt-4 mb-2" role="alert">
              <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
              {t('common.error')}
            </p>
          )}

          {showLoadMore && (
            <div className={`d-flex justify-content-center ${items.length > 0 && error ? 'mt-2' : 'mt-4'} mb-4`}>
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
                ) : error ? (
                  <>
                    <span>{t('common.retry')}</span>
                    <i className="bi bi-arrow-clockwise" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>{t('common.loadMore')}</span>
                    <i className="bi bi-chevron-down" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && items.length > 0 && (
            <div className="text-center text-muted small mt-4 mb-4">
              <p className="mb-0 text-secondary opacity-75">
                <i className="bi bi-check2-circle me-1 text-success" aria-hidden="true" />
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
  countLabel: PropTypes.string,
  emptyMessage: PropTypes.string,
  headerActions: PropTypes.node,
  items: PropTypes.array.isRequired,
  type: PropTypes.oneOf(['movie', 'tv', 'mixed']).isRequired,
  upcoming: PropTypes.bool,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ]),
  isOffline: PropTypes.bool,
  onBack: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func,
  onRetry: PropTypes.func
};
