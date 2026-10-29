import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import '../css/common/carouselControls.css';
import '../css/common/text.css';

const clearNavBtnState = (el) => {
  if (!el) return;
  delete el.dataset.hovered;
  delete el.dataset.active;
  el.blur();
};

const navBtnPointerHandlers = {
  onPointerEnter: (e) => {
    if (e.pointerType === 'mouse' && !e.currentTarget.disabled) {
      e.currentTarget.dataset.hovered = 'true';
    }
  },
  onPointerLeave: (e) => {
    clearNavBtnState(e.currentTarget);
  },
  onPointerDown: (e) => {
    if (!e.currentTarget.disabled) {
      e.currentTarget.dataset.active = 'true';
    }
  },
  onPointerUp: (e) => {
    delete e.currentTarget.dataset.active;
    if (e.pointerType !== 'mouse') {
      clearNavBtnState(e.currentTarget);
    }
  },
  onPointerCancel: (e) => {
    clearNavBtnState(e.currentTarget);
  },
  onBlur: (e) => {
    delete e.currentTarget.dataset.hovered;
    delete e.currentTarget.dataset.active;
  }
};

/** Shared layout, scrolling and navigation for horizontal carousels. */
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
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const canLoadMore = Boolean(onLoadMore && hasMore && !isLoadingMore);
  const pendingNextScroll = useRef(false);
  const prevItemCount = useRef(itemCount);
  const prevIsLoadingMore = useRef(isLoadingMore);

  const checkLoadMore = useCallback((track, delta = 0) => {
    if (!canLoadMore) return;
    const remaining = track.scrollWidth - track.clientWidth - (track.scrollLeft + delta);
    const threshold = Math.max(600, track.clientWidth * 0.75);
    if (remaining <= threshold) {
      onLoadMore();
    }
  }, [canLoadMore, onLoadMore]);

  const getScrollDelta = useCallback((track) => {
    if (typeof scrollDistance === 'function') {
      return scrollDistance(track);
    }
    if (scrollDistance === 'page') {
      return track.clientWidth;
    }
    if (typeof scrollDistance === 'number' && scrollDistance > 0) {
      return scrollDistance;
    }
    return track.clientWidth || 400;
  }, [scrollDistance]);

  const scroll = useCallback((direction) => {
    const track = scrollRef.current;
    if (!track) return;

    const delta = getScrollDelta(track);
    const maxScroll = track.scrollWidth - track.clientWidth;
    const canActuallyScrollRight = maxScroll - track.scrollLeft > 2;
    const canActuallyScrollLeft = track.scrollLeft > 2;

    if (direction === 'right') {
      if (canActuallyScrollRight) {
        track.scrollBy({
          left: delta,
          behavior: 'smooth'
        });
        checkLoadMore(track, delta);
      } else if (canLoadMore) {
        pendingNextScroll.current = true;
        onLoadMore();
      }
    } else {
      if (canActuallyScrollLeft) {
        track.scrollBy({
          left: -delta,
          behavior: 'smooth'
        });
      }
    }
  }, [canLoadMore, checkLoadMore, getScrollDelta, onLoadMore]);

  const handleNavClick = useCallback((direction, event) => {
    scroll(direction);
    clearNavBtnState(event.currentTarget);
  }, [scroll]);

  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      if (pendingNextScroll.current) {
        pendingNextScroll.current = false;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const track = scrollRef.current;
            if (!track) return;
            const delta = getScrollDelta(track);
            track.scrollBy({
              left: delta,
              behavior: 'smooth'
            });
            checkLoadMore(track, delta);
          });
        });
      }
    }
    prevItemCount.current = itemCount;
  }, [itemCount, getScrollDelta, checkLoadMore]);

  useEffect(() => {
    if (prevIsLoadingMore.current && !isLoadingMore && itemCount <= prevItemCount.current) {
      pendingNextScroll.current = false;
    }
    prevIsLoadingMore.current = isLoadingMore;
  }, [isLoadingMore, itemCount]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track) return;

    const updateScrollState = () => {
      setCanScrollLeft(track.scrollLeft > 1);
      setCanScrollRight(track.scrollWidth - track.clientWidth - track.scrollLeft > 1);
    };

    const frame = requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(track);
    Array.from(track.children).forEach((child) => resizeObserver.observe(child));
    track.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      track.removeEventListener('scroll', updateScrollState);
    };
  }, [itemCount, isLoadingMore]);

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
            {...navBtnPointerHandlers}
            disabled={!canScrollLeft}
            aria-label={previousLabel ?? t('carousels.scrollLeft')}
          >
            <i className="bi bi-chevron-left text-white" />
          </button>
          <button
            type="button"
            className={buttonClassName}
            onClick={(e) => handleNavClick('right', e)}
            {...navBtnPointerHandlers}
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
