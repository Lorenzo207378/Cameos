import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useHorizontalSwipe } from '../../utils/domUtils.js';
import '../../css/common/carouselControls.css';
import '../../css/tv/tvSeasonsSection.css';

/**
 * Measure rendered season pills and compute an exact integer-pill viewport width so no pill is ever clipped in half.
 * @param {HTMLDivElement|null} wrapper
 * @param {HTMLDivElement|null} track
 * @param {HTMLDivElement|null} container
 * @param {HTMLButtonElement|null} leftBtn
 * @param {HTMLButtonElement|null} rightBtn
 * @param {number} [overrideContentWidth=0]
 * @returns {{ needsNavigation: boolean, viewportWidth: number }|null}
 */
function computePillViewport(wrapper, track, container, leftBtn, rightBtn, overrideContentWidth = 0) {
  if (!wrapper || !track) return null;

  let availableContentWidth = overrideContentWidth;
  if (typeof availableContentWidth !== 'number' || availableContentWidth <= 0) {
    const style = window.getComputedStyle(wrapper);
    availableContentWidth = Math.max(
      0,
      wrapper.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0)
    );
  }

  const children = Array.from(track.children);
  if (children.length === 0 || availableContentWidth <= 0) return null;

  const widths = children.map((el) => Math.ceil(el.getBoundingClientRect().width));
  if (widths.some((w) => w <= 0)) return null;

  const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
  const widthForCount = (count) =>
    widths.slice(0, count).reduce((sum, w) => sum + w, 0) + (count - 1) * trackGap;

  const totalWidth = widthForCount(widths.length);
  if (totalWidth <= availableContentWidth) {
    return { needsNavigation: false, viewportWidth: Math.floor(totalWidth) };
  }

  const containerGap = container ? parseFloat(window.getComputedStyle(container).gap) || 10 : 10;
  const buttonsSpace =
    (leftBtn?.getBoundingClientRect().width || 32) +
    (rightBtn?.getBoundingClientRect().width || 32) +
    containerGap * 2;
  const maxViewportWidth = Math.max(0, Math.floor(availableContentWidth - buttonsSpace));

  let fittedWidth = widths[0];
  for (let k = widths.length - 1; k >= 1; k -= 1) {
    const candidate = widthForCount(k);
    if (candidate <= maxViewportWidth) {
      fittedWidth = candidate;
      break;
    }
  }
  return { needsNavigation: true, viewportWidth: Math.floor(fittedWidth) };
}

/**
 * TVSeasonSelection
 * Barra di navigazione delle stagioni per Desktop e Tablet:
 * - Pulsanti di navigazione adiacenti alla sequenza di pillole
 * - Adattamento dinamico del numero di pillole per evitare tagli a metà
 * - Supporto touch swipe e scorrimento a pagina
 * @param {Object} props
 * @param {number} props.seasonsCount
 * @param {number} [props.selectedSeasonNumber=1]
 * @param {(seasonNumber: number) => void} props.onSelectSeason
 * @param {string} [props.className='']
 * @returns {import('react').ReactElement|null}
 */
export default function TVSeasonSelection({
  seasonsCount,
  selectedSeasonNumber = 1,
  onSelectSeason,
  className = ''
}) {
  const { t, langKey, formatTranslation } = useTranslation();
  const wrapperRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const containerRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const leftBtnRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
  const rightBtnRef = useRef(/** @type {HTMLButtonElement|null} */ (null));
  const trackRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const scrollTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));

  const [viewportWidth, setViewportWidth] = useState(/** @type {number|null} */ (null));
  const [needsNavigation, setNeedsNavigation] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 2);
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 2);
  }, []);

  const updatePillGeometry = useCallback((overrideContentWidth = 0) => {
    const layout = computePillViewport(
      wrapperRef.current,
      trackRef.current,
      containerRef.current,
      leftBtnRef.current,
      rightBtnRef.current,
      overrideContentWidth
    );
    if (!layout) return;

    setNeedsNavigation(layout.needsNavigation);
    setViewportWidth(layout.viewportWidth);
    if (!layout.needsNavigation && trackRef.current && trackRef.current.scrollLeft !== 0) {
      trackRef.current.scrollLeft = 0;
    }
    updateScrollState();
  }, [updateScrollState]);

  useEffect(() => () => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
  }, []);

  useLayoutEffect(() => {
    updatePillGeometry();
  }, [updatePillGeometry, seasonsCount, langKey]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === wrapper) updatePillGeometry(entry.contentRect.width);
      }
    });
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [updatePillGeometry]);

  // Centra la stagione attiva nel viewport orizzontale senza spostare lo scroll verticale della pagina
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const selectedBtn = track.children[selectedSeasonNumber - 1];
    if (selectedBtn instanceof HTMLElement && track.clientWidth > 0) {
      const btnLeft = selectedBtn.offsetLeft;
      const btnRight = btnLeft + selectedBtn.offsetWidth;
      if (btnLeft < track.scrollLeft || btnRight > track.scrollLeft + track.clientWidth) {
        const targetLeft = Math.max(0, btnLeft - Math.max(0, (track.clientWidth - selectedBtn.offsetWidth) / 2));
        if (typeof track.scrollTo === 'function') track.scrollTo({ left: targetLeft, behavior: 'smooth' });
        else track.scrollLeft = targetLeft;
      }
    }
    updateScrollState();
  }, [selectedSeasonNumber, viewportWidth, updateScrollState]);

  const scrollByPage = (direction) => {
    const track = trackRef.current;
    if (!track) return;
    const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
    const scrollAmount = (viewportWidth || track.clientWidth || 240) + trackGap;
    if (typeof track.scrollBy === 'function') {
      track.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      updateScrollState();
      scrollTimerRef.current = null;
    }, 350);
  };

  const swipeHandlers = useHorizontalSwipe({
    onSwipeLeft: () => scrollByPage(1),
    onSwipeRight: () => scrollByPage(-1)
  });

  if (!seasonsCount || seasonsCount <= 0) return null;

  const seasonNumbers = Array.from({ length: seasonsCount }, (_, idx) => idx + 1);

  return (
    <div ref={wrapperRef} className={`tv-season-selection-wrapper w-100 d-flex justify-content-center align-items-center mb-3 ${className}`.trim()}>
      <div ref={containerRef} className="tv-season-selection-container d-inline-flex align-items-center justify-content-center gap-2 mw-100">
        {needsNavigation && (
          <button
            ref={leftBtnRef}
            type="button"
            className="rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn flex-shrink-0"
            onClick={() => scrollByPage(-1)}
            disabled={!canScrollLeft}
            aria-label={t('carousels.scrollLeft')}
          >
            <i className="bi bi-chevron-left text-white" aria-hidden="true" />
          </button>
        )}

        <div
          className="tv-season-selection-viewport overflow-hidden flex-shrink-0"
          style={viewportWidth ? { width: `${viewportWidth}px` } : {}}
          {...(needsNavigation ? swipeHandlers : {})}
        >
          <div
            ref={trackRef}
            onScroll={needsNavigation ? updateScrollState : undefined}
            className={`tv-season-selection-track d-flex gap-2 overflow-x-auto scrollbar-none py-1 ${needsNavigation ? 'tv-season-scroll-snap' : ''}`}
          >
            {seasonNumbers.map((seasonNum) => (
              <button
                key={seasonNum}
                type="button"
                onClick={() => onSelectSeason?.(seasonNum)}
                aria-pressed={selectedSeasonNumber === seasonNum}
                className={`btn rounded-pill px-4 py-2 text-nowrap fw-semibold small flex-shrink-0 tv-season-pill ${
                  selectedSeasonNumber === seasonNum
                    ? 'btn-success shadow-sm'
                    : 'btn-dark text-white-50 border border-secondary border-opacity-25'
                }`}
              >
                {formatTranslation(t('detail.seasonLabel'), { number: seasonNum })}
              </button>
            ))}
          </div>
        </div>

        {needsNavigation && (
          <button
            ref={rightBtnRef}
            type="button"
            className="rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn flex-shrink-0"
            onClick={() => scrollByPage(1)}
            disabled={!canScrollRight}
            aria-label={t('carousels.scrollRight')}
          >
            <i className="bi bi-chevron-right text-white" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

TVSeasonSelection.propTypes = {
  seasonsCount: PropTypes.number.isRequired,
  selectedSeasonNumber: PropTypes.number,
  onSelectSeason: PropTypes.func.isRequired,
  className: PropTypes.string
};
