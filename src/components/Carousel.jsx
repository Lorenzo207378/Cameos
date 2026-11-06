import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useCarouselNavigation } from '../utils/useCarouselNavigation.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';

/**
 * Shared layout, scrolling and navigation for horizontal carousels.
 * Underfilled rows allow at most one additional load per missing visible card, per container width.
 * @param {Object} props
 * @param {import('react').ReactNode} [props.header]
 * @param {import('react').ReactNode} props.children
 * @param {number} props.itemCount
 * @param {string} [props.className]
 * @param {string} [props.headerClassName]
 * @param {string} [props.trackClassName]
 * @param {string} [props.navigationClassName]
 * @param {string} [props.previousLabel]
 * @param {string} [props.nextLabel]
 * @param {'page'|number|((track: HTMLDivElement) => number)} [props.scrollDistance='page']
 * @param {() => *} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 */
export default function Carousel({
  header,
  children,
  itemCount,
  className = '',
  headerClassName = 'align-items-center mb-3',
  trackClassName = '',
  navigationClassName = 'carousel-nav-btn',
  previousLabel,
  nextLabel,
  scrollDistance = 'page',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();
  const { scrollRef, canScrollLeft, canScrollRight, canLoadMore, handleNavClick, checkLoadMore } = useCarouselNavigation({
    itemCount, scrollDistance, onLoadMore, hasMore, isLoadingMore
  });

  if (!itemCount) return null;

  const buttonClassName = `rounded-circle d-flex align-items-center justify-content-center carousel-button ${navigationClassName}`;

  return (
    <section className={`responsive-carousel ${className}`}>
      <div className={`carousel-header d-flex justify-content-between ${headerClassName}`}>
        {header}
        <div className="carousel-navigation d-flex">
          <button
            type="button"
            className={buttonClassName}
            onClick={(e) => handleNavClick('left', e)}
            disabled={!canScrollLeft}
            aria-label={previousLabel ?? t('carousels.scrollLeft')}
          >
            <i className="bi bi-chevron-left text-white" />
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={(e) => handleNavClick('right', e)}
            disabled={!canScrollRight && !canLoadMore}
            aria-label={nextLabel ?? t('carousels.scrollRight')}
          >
            <i className="bi bi-chevron-right text-white" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => checkLoadMore(event.currentTarget)}
        className={`carousel-track d-flex overflow-x-auto scrollbar-none ${trackClassName}`}
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {children}
      </div>
    </section>
  );
}
