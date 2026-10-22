import { useRef } from 'react';
import MediaCard from './MediaCard.jsx';

/**
 * MediaCarousel
 * Carosello orizzontale scrollabile di card multimediali (film o serie).
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {Array<Object>} props.items
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function MediaCarousel({ title, subtitle, items = [], type = 'movie' }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const distance = 400;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-end mb-3">
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
        className="d-flex gap-3 overflow-x-auto pb-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {items.map((item, idx) => (
          <div key={item.id || idx} style={{ scrollSnapAlign: 'start' }}>
            <MediaCard item={item} type={type} />
          </div>
        ))}
      </div>
    </section>
  );
}
