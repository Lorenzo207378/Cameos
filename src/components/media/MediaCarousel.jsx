import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from './MediaCard.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';

const SKELETON_INDICES = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * MediaCarousel
 * Carosello orizzontale scrollabile di card multimediali (film o serie).
 * Supporta navigazione verso la categoria e paginazione on-demand allo scorrimento (infinite horizontal scroll).
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.categoryKey] - Chiave della categoria per reindirizzamento al click sul titolo
 * @param {string} [props.titleLink] - Link personalizzato per il titolo
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'|'mixed'} [props.type='movie']
 * @param {1|2} [props.rows=1]
 * @param {boolean} [props.upcoming=false] Nasconde il rating su tutte le card del carosello.
 * @param {() => any} [props.onLoadMore]
 * @param {() => void} [props.onRetry]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 * @param {boolean} [props.loading=false]
 * @param {Error|string|Object|null} [props.error=null]
 */
export default function MediaCarousel({
  title,
  subtitle = undefined,
  categoryKey = undefined,
  titleLink = undefined,
  items = [],
  type = 'movie',
  rows = 1,
  upcoming = false,
  onLoadMore = undefined,
  onRetry = undefined,
  hasMore = false,
  isLoadingMore = false,
  loading = false,
  error = null
}) {
  const { t } = useTranslation();

  const targetLink = categoryKey ? APP_ROUTES.category(type, categoryKey) : titleLink;

  if (!items?.length) {
    if (!loading && !error) return null;
    return (
      <section className="media-carousel" aria-busy={loading} data-catalog-loading={loading && !error}>
        <CarouselHeading title={title} subtitle={subtitle} titleLink={targetLink} />
        {error ? (
          <div className="d-flex flex-column align-items-start gap-2 py-2" role="alert">
            <p className="text-warning mb-0">{t('common.error')}</p>
            {onRetry && (
              <button type="button" className="btn btn-outline-success rounded-pill" onClick={onRetry}>
                {t('common.retry')}
              </button>
            )}
          </div>
        ) : (
          <>
            <span role="status" className="visually-hidden">{t('common.loading')}</span>
            <div className="catalog-placeholder-track d-flex overflow-hidden" aria-hidden="true">
              {SKELETON_INDICES.map((index) => (
                <div className="media-carousel-item" key={index}>
                  <div className="media-card-poster catalog-placeholder" />
                  <div className="catalog-placeholder-title" />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  return (
    <Carousel
      className="media-carousel"
      headerClassName="align-items-end mb-1"
      trackClassName={`${rows === 2 ? 'media-carousel-track-two-rows' : 'media-carousel-track'} pt-1 pb-2`}
      itemCount={items.length}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      header={<CarouselHeading title={title} subtitle={subtitle} titleLink={targetLink} />}
    >
      {items.map((item, idx) => (
        <div
          key={item.targetKey || `${item.mediaType || type}-${item.seriesId ?? item.mediaId ?? item.id ?? idx}-${item.seasonNumber ?? ''}-${item.episodeNumber ?? ''}`}
          className="media-carousel-item"
        >
          <MediaCard
            item={item}
            type={type === 'mixed' ? (item.mediaType === 'movie' ? 'movie' : 'tv') : type}
            showType={type === 'mixed'}
            upcoming={upcoming || Boolean(item.upcoming)}
          />
        </div>
      ))}
    </Carousel>
  );
}

MediaCarousel.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  categoryKey: PropTypes.string,
  titleLink: PropTypes.string,
  items: PropTypes.array,
  type: PropTypes.oneOf(['movie', 'tv', 'mixed']),
  rows: PropTypes.oneOf([1, 2]),
  upcoming: PropTypes.bool,
  onLoadMore: PropTypes.func,
  onRetry: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ])
};
