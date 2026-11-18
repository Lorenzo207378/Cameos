import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from './MediaCard.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';

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
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 * @param {boolean} [props.loading=false]
 * @param {string|null} [props.error]
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
        {error ? <p role="alert" className="text-warning">{t('common.error')}</p> : (
          <>
            <span role="status" className="visually-hidden">{t('common.loading')}</span>
            <div className="catalog-placeholder-track" aria-hidden="true">
              {Array.from({ length: 8 }, /** @returns {import('react').JSX.Element} */ (_, index) => (
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
        <div key={`${item.mediaType || type}-${item.id || idx}`} className="media-carousel-item">
          <MediaCard item={item} type={type === 'mixed' ? item.mediaType : type}
            showType={type === 'mixed'} upcoming={upcoming || Boolean(item.upcoming)} />
        </div>
      ))}

      {isLoadingMore && (
        <div
          className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 carousel-loading"
        >
          <div className="spinner-border spinner-border-sm text-success mb-2" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
          <span className="small fw-semibold">{t('common.loading')}</span>
        </div>
      )}
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
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([
    PropTypes.instanceOf(Error),
    PropTypes.string,
    PropTypes.object
  ])
};
