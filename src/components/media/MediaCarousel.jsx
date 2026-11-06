import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from './MediaCard.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * MediaCarousel
 * Carosello orizzontale scrollabile di card multimediali (film o serie).
 * Supporta navigazione verso la categoria e paginazione on-demand allo scorrimento (infinite horizontal scroll).
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {string} [props.categoryKey] - Chiave della categoria per reindirizzamento al click sul titolo
 * @param {string} [props.titleLink] - Link personalizzato per il titolo
 * @param {Function} [props.onTitleClick] - Handler di click sul titolo alternativo
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'|'mixed'} [props.type='movie']
 * @param {boolean} [props.upcoming=false] Nasconde il rating su tutte le card del carosello.
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 */
export default function MediaCarousel({
  title,
  subtitle,
  categoryKey,
  titleLink,
  onTitleClick,
  items = [],
  type = 'movie',
  upcoming = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();

  let targetLink = titleLink;
  if(categoryKey){
    if(type === 'movie'){
        targetLink = `/Cameos/movies/category/${categoryKey}`;
    }else{
        targetLink = `/Cameos/series/category/${categoryKey}`;
    }
  }


  if (!items || items.length === 0) return null;

  return (
    <Carousel
      className="media-carousel"
      headerClassName="align-items-end mb-1"
      trackClassName="media-carousel-track pt-1 pb-2"
      itemCount={items.length}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      header={<CarouselHeading title={title} subtitle={subtitle} titleLink={targetLink} onTitleClick={onTitleClick} />}
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
