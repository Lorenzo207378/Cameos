import { useRef } from 'react';
import Carousel from '../Carousel.jsx';
import { Link } from 'react-router-dom';
import MediaCard from './MediaCard.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useSingleLineFit } from '../../utils/domUtils.js';

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
 * @param {'movie'|'tv'} [props.type='movie']
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
  const headingRef = useRef(null);
  const titleRef = useRef(null);
  const targetLink = titleLink || (categoryKey ? `/Cameos/movies/category/${categoryKey}` : null);
  const hasArrow = Boolean(targetLink || onTitleClick);

  useSingleLineFit(headingRef, titleRef, [title, hasArrow, items?.length], hasArrow ? 20 : 0);

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
      header={
        <div ref={headingRef} className="carousel-heading">
          {subtitle && (
            <p className="text-success text-uppercase fw-bold mb-0" title={subtitle}>
              {subtitle}
            </p>
          )}
          {targetLink ? (
            <Link
              to={targetLink}
              className="text-decoration-none text-white d-inline-flex align-items-center gap-1 media-carousel-title-link"
              title={`${title} - ${t('carousels.showAllMovies')}`}
            >
              <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={title}>
                {title}
              </h3>
              <i className="bi bi-chevron-right text-secondary media-carousel-title-arrow"></i>
            </Link>
          ) : onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="btn btn-link p-0 text-decoration-none text-white d-inline-flex align-items-center gap-1 media-carousel-title-link"
            >
              <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={title}>
                {title}
              </h3>
              <i className="bi bi-chevron-right text-secondary media-carousel-title-arrow"></i>
            </button>
          ) : (
            <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={title}>
              {title}
            </h3>
          )}
        </div>
      }
    >
      {items.map((item, idx) => (
        <div key={item.id || idx} className="media-carousel-item">
          <MediaCard item={item} type={type} upcoming={upcoming || Boolean(item.upcoming)} />
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
