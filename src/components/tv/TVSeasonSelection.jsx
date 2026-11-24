import { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { moveTouchSwipe, startTouchSwipe } from '../../utils/domUtils.js';
import '../../css/common/carouselControls.css';
import '../../css/tv/tvSeasonsSection.css';

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
 * @returns {import('react').JSX.Element|null}
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
  const viewportRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const trackRef = useRef(/** @type {HTMLDivElement|null} */ (null));

  const [viewportWidth, setViewportWidth] = useState(/** @type {number|null} */ (null));
  const [needsNavigation, setNeedsNavigation] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);
  const scrollTimerRef = useRef(/** @type {ReturnType<typeof setTimeout>|null} */ (null));

  // Aggiorna lo stato dei pulsanti di scorrimento (abilitato/disabilitato)
  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  const scheduleScrollStateUpdate = useCallback(() => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
    scrollTimerRef.current = setTimeout(() => {
      updateScrollState();
      scrollTimerRef.current = null;
    }, 350);
  }, [updateScrollState]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // Calcola esattamente quante pillole intere possono entrare nello spazio disponibile
  // e imposta la larghezza del viewport per non tagliare MAI nessuna pillola a metà.
  const updatePillGeometry = useCallback((overrideContentWidth = 0) => {
    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    if (!wrapper || !track) return;

    // Calcola la larghezza netta interna del wrapper sottraendo il padding-inline
    let availableContentWidth = overrideContentWidth;
    if (typeof availableContentWidth !== 'number' || availableContentWidth <= 0) {
      const computedStyle = window.getComputedStyle(wrapper);
      const padLeft = parseFloat(computedStyle.paddingLeft) || 0;
      const padRight = parseFloat(computedStyle.paddingRight) || 0;
      availableContentWidth = Math.max(0, wrapper.clientWidth - padLeft - padRight);
    }

    const children = Array.from(track.children);
    if (children.length === 0 || availableContentWidth <= 0) return;

    // Misura reale della larghezza di ciascuna pillola nel DOM
    const widths = children.map((el) => Math.ceil(el.getBoundingClientRect().width));
    if (widths.some((w) => w <= 0)) {
      return;
    }

    const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
    const leftBtnWidth = leftBtnRef.current?.getBoundingClientRect().width || 32;
    const rightBtnWidth = rightBtnRef.current?.getBoundingClientRect().width || 32;

    const containerStyle = containerRef.current ? window.getComputedStyle(containerRef.current) : null;
    const containerGap = containerStyle ? parseFloat(containerStyle.gap) || 10 : 10;
    const buttonsSpace = leftBtnWidth + rightBtnWidth + (containerGap * 2);

    const getWidthForK = (count) => {
      const pillsSum = widths.slice(0, count).reduce((sum, w) => sum + w, 0);
      return pillsSum + (count - 1) * trackGap;
    };

    const totalAllPillsWidth = getWidthForK(widths.length);

    if (totalAllPillsWidth <= availableContentWidth) {
      // Tutte le pillole entrano nello spazio disponibile senza ridurne il numero: nascondi i pulsanti
      setNeedsNavigation(false);
      setViewportWidth(Math.floor(totalAllPillsWidth));
      if (track.scrollLeft !== 0) {
        track.scrollLeft = 0;
      }
    } else {
      // Non tutte le pillole entrano: mostra i pulsanti e riduci 'k' riservando lo spazio per la navigazione
      setNeedsNavigation(true);
      const maxViewportWidth = Math.max(0, Math.floor(availableContentWidth - buttonsSpace));

      let fittedWidth = widths[0];
      for (let k = widths.length - 1; k >= 1; k--) {
        const currentKWidth = getWidthForK(k);
        if (currentKWidth <= maxViewportWidth) {
          fittedWidth = currentKWidth;
          break;
        }
      }
      setViewportWidth(Math.floor(fittedWidth));
    }

    updateScrollState();
  }, [updateScrollState]);

  useLayoutEffect(() => {
    updatePillGeometry();
  }, [updatePillGeometry, seasonsCount, langKey]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return undefined;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === wrapper) {
          // entry.contentRect.width è la larghezza esatta del box di contenuto (senza padding)
          updatePillGeometry(entry.contentRect.width);
        }
      }
    });
    observer.observe(wrapper);

    return () => {
      observer.disconnect();
    };
  }, [updatePillGeometry]);

  // Seleziona la stagione e la mantiene nel viewport orizzontale senza spostare lo scroll verticale della pagina
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const selectedBtn = track.children[selectedSeasonNumber - 1];
    if (selectedBtn instanceof HTMLElement && track.clientWidth > 0) {
      const trackLeft = track.scrollLeft;
      const trackRight = trackLeft + track.clientWidth;
      const btnLeft = selectedBtn.offsetLeft;
      const btnRight = btnLeft + selectedBtn.offsetWidth;

      if (btnLeft < trackLeft || btnRight > trackRight) {
        const targetLeft = Math.max(0, btnLeft - Math.max(0, (track.clientWidth - selectedBtn.offsetWidth) / 2));
        if (typeof track.scrollTo === 'function') {
          track.scrollTo({ left: targetLeft, behavior: 'smooth' });
        } else {
          track.scrollLeft = targetLeft;
        }
      }
    }
    updateScrollState();
  }, [selectedSeasonNumber, viewportWidth, updateScrollState]);

  const handlePrevClick = () => {
    const track = trackRef.current;
    if (!track) return;
    const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
    const scrollAmount = (viewportWidth || track.clientWidth || 240) + trackGap;
    if (typeof track.scrollBy === 'function') {
      track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
    scheduleScrollStateUpdate();
  };

  const handleNextClick = () => {
    const track = trackRef.current;
    if (!track) return;
    const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
    const scrollAmount = (viewportWidth || track.clientWidth || 240) + trackGap;
    if (typeof track.scrollBy === 'function') {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
    scheduleScrollStateUpdate();
  };

  // Supporto gesture touch swipe per scorrimento con il dito
  const touchRefs = { touchStartX, touchStartY, touchDeltaX, touchDeltaY };
  const handleTouchStart = (event) => startTouchSwipe(event, touchRefs);
  const handleTouchMove = (event) => moveTouchSwipe(event, touchRefs);

  const handleTouchEnd = () => {
    const dx = touchDeltaX.current;
    const dy = touchDeltaY.current;
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.1) {
      const track = trackRef.current;
      if (track) {
        const trackGap = parseFloat(window.getComputedStyle(track).gap) || 8;
        const scrollAmount = (viewportWidth || track.clientWidth || 240) + trackGap;
        if (typeof track.scrollBy === 'function') {
          if (dx < 0) {
            track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
          } else {
            track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
          }
        }
        scheduleScrollStateUpdate();
      }
    }
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  };

  if (!seasonsCount || seasonsCount <= 0) return null;

  /** @type {Array<number>} */
  const seasonNumbers = [];
  for (let i = 1; i <= seasonsCount; i += 1) {
    seasonNumbers.push(i);
  }

  /** @type {Array<import('react').JSX.Element>} */
  const seasonButtons = seasonNumbers.map((seasonNum) => {
    const isSelected = selectedSeasonNumber === seasonNum;
    return (
      <button
        key={seasonNum}
        type="button"
        onClick={() => onSelectSeason?.(seasonNum)}
        aria-pressed={isSelected}
        className={`btn rounded-pill px-4 py-2 text-nowrap fw-semibold small flex-shrink-0 tv-season-pill ${
          isSelected
            ? 'btn-success shadow-sm'
            : 'btn-dark text-white-50 border border-secondary border-opacity-25'
        }`}
      >
        {formatTranslation(t('detail.seasonLabel'), { number: seasonNum })}
      </button>
    );
  });

  return (
    <div ref={wrapperRef} className={`tv-season-selection-wrapper w-100 d-flex justify-content-center align-items-center mb-3 ${className}`.trim()}>
      <div ref={containerRef} className="tv-season-selection-container d-inline-flex align-items-center justify-content-center gap-2 mw-100">
        {/* Pulsante di navigazione sinistro (mostrato solo se serve scorrere tra le pillole) */}
        {needsNavigation && (
          <button
            ref={leftBtnRef}
            type="button"
            className="rounded-circle d-flex align-items-center justify-content-center carousel-button carousel-nav-btn flex-shrink-0"
            onClick={handlePrevClick}
            disabled={!canScrollLeft}
            aria-label={t('carousels.scrollLeft')}
          >
            <i className="bi bi-chevron-left text-white" aria-hidden="true" />
          </button>
        )}

        {/* Viewport centrale calibrato esattamente per contenere solo pillole intere */}
        <div
          ref={viewportRef}
          className="tv-season-selection-viewport overflow-hidden flex-shrink-0"
          style={viewportWidth ? { width: `${viewportWidth}px` } : {}}
          onTouchStart={needsNavigation ? handleTouchStart : undefined}
          onTouchMove={needsNavigation ? handleTouchMove : undefined}
          onTouchEnd={needsNavigation ? handleTouchEnd : undefined}
        >
          <div
            ref={trackRef}
            onScroll={needsNavigation ? updateScrollState : undefined}
            className={`tv-season-selection-track d-flex gap-2 overflow-x-auto scrollbar-none py-1 ${needsNavigation ? 'tv-season-scroll-snap' : ''}`}
          >
            {seasonButtons}
          </div>
        </div>

        {/* Pulsante di navigazione destro (mostrato solo se serve scorrere tra le pillole) */}
        {needsNavigation && (
          <button
            ref={rightBtnRef}
            type="button"
            className="rounded-circle d-flex align-items-center justify-content-center carousel-button carousel-nav-btn flex-shrink-0"
            onClick={handleNextClick}
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
