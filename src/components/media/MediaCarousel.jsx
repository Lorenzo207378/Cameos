import { useRef } from 'react';
import { Link } from 'react-router-dom';
import MediaCard from './MediaCard.jsx';
import '../../css/media/mediaCarousel.css';
import {useTranslation} from "../../contexts/LanguageContext.jsx";

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
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {

  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const targetLink = titleLink || (categoryKey ? `/Cameos/films/category/${categoryKey}` : null);

  const checkScrollThreshold = (el) => {
    if (!el || !onLoadMore || !hasMore || isLoadingMore) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    
    if (scrollWidth - (scrollLeft + clientWidth) <= 500) {
      onLoadMore();
    }
  };

  const handleScroll = (e) => {
    checkScrollThreshold(e.currentTarget);
  };

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });

    if (direction === 'right') {
      setTimeout(() => {
        checkScrollThreshold(scrollRef.current);
      }, 350);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="media-carousel mb-5">
      <div className="d-flex justify-content-between align-items-end mb-1">
        <div>
          {subtitle && <p className="text-success text-uppercase small fw-bold mb-1">{subtitle}</p>}
          {targetLink ? (
            <Link
              to={targetLink}
              className="text-decoration-none text-white d-inline-flex align-items-center gap-2 media-carousel-title-link"
              title={`${title} - Mostra tutti i film`}
            >
              <h3 className="h4 text-white fw-bold mb-0 media-carousel-title">{title}</h3>
              <i className="bi bi-chevron-right fs-6 text-secondary media-carousel-title-arrow"></i>
            </Link>
          ) : onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="btn btn-link p-0 text-decoration-none text-white d-inline-flex align-items-center gap-2 media-carousel-title-link"
            >
              <h3 className="h4 text-white fw-bold mb-0 media-carousel-title">{title}</h3>
              <i className="bi bi-chevron-right fs-6 text-secondary media-carousel-title-arrow"></i>
            </button>
          ) : (
            <h3 className="h4 text-white fw-bold mb-0">{title}</h3>
          )}
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 carousel-nav-btn"
            style={{ width: '36px', height: '36px' }}
            onClick={() => scroll('left')}
            aria-label="Scorri a sinistra"
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 carousel-nav-btn"
            style={{ width: '36px', height: '36px' }}
            onClick={() => scroll('right')}
            aria-label="Scorri a destra"
          >
            <i className="bi bi-chevron-right text-white"></i>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="media-carousel-track d-flex gap-3 overflow-x-auto pt-2 pb-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item, idx) => (
          <div key={item.id || idx} style={{ scrollSnapAlign: 'start' }}>
            <MediaCard item={item} type={type} />
          </div>
        ))}

        {isLoadingMore && (
          <div
            className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 px-4"
            style={{ width: '140px', minHeight: '260px', scrollSnapAlign: 'start' }}
          >
            <div className="spinner-border spinner-border-sm text-success mb-2" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
            <span className="small fw-semibold">{t('common.loading')}</span>
          </div>
        )}
      </div>
    </section>
  );
}
