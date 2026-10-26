import { useRef } from 'react';
import MediaCard from './MediaCard.jsx';

/**
 * MediaCarousel
 * Carosello orizzontale scrollabile di card multimediali (film o serie).
 * Supporta paginazione on-demand allo scorrimento (infinite horizontal scroll).
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'} [props.type='movie']
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 */
export default function MediaCarousel({
  title,
  subtitle,
  items = [],
  type = 'movie',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const scrollRef = useRef(null);

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
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-end mb-1">
        <div>
          {subtitle && <p className="text-success text-uppercase small fw-bold mb-1">{subtitle}</p>}
          <h3 className="h4 text-white fw-bold mb-0">{title}</h3>
        </div>

        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
            style={{ width: '36px', height: '36px' }}
            onClick={() => scroll('left')}
            aria-label="Scorri a sinistra"
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
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
        className="d-flex gap-3 overflow-x-auto pt-2 pb-3 scrollbar-none"
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
              <span className="visually-hidden">Caricamento...</span>
            </div>
            <span className="small fw-semibold">Caricamento...</span>
          </div>
        )}
      </div>
    </section>
  );
}
