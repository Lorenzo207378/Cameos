import PropTypes from 'prop-types';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useCarouselNavigation } from '../utils/use/useCarouselNavigation.js';
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

  const buttonClassName = 'rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn';

  return (
    <section className={`responsive-carousel ${className}`}>
      <div className={`carousel-header d-flex justify-content-between ${headerClassName}`}>
        {header}
        <div className="carousel-navigation d-flex">
          <button
            type="button"
            className={buttonClassName}
            onClick={() => handleNavClick('left')}
            disabled={!canScrollLeft}
            aria-label={previousLabel ?? t('carousels.scrollLeft')}
          >
            <i className="bi bi-chevron-left text-white" />
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={() => handleNavClick('right')}
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
      >
        {children}
        {isLoadingMore && (
          <div className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 carousel-loading">
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

Carousel.propTypes = {
  header: PropTypes.node,
  children: PropTypes.node,
  itemCount: PropTypes.number.isRequired,
  className: PropTypes.string,
  headerClassName: PropTypes.string,
  trackClassName: PropTypes.string,
  previousLabel: PropTypes.string,
  nextLabel: PropTypes.string,
  scrollDistance: PropTypes.oneOfType([
    PropTypes.oneOf(['page']),
    PropTypes.number,
    PropTypes.func
  ]),
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool
};
