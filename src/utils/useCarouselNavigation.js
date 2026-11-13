import { useEffect, useRef, useState, useCallback } from 'react';
import { getCardMetrics, getCarouselScrollDistance } from './domUtils.js';

/** Manage carousel navigation, bounded loading and responsive viewport filling.
 * @param {Object} options
 * @param {number} options.itemCount
 * @param {'page'|number|((track: HTMLDivElement) => number)} options.scrollDistance
 * @param {() => *} [options.onLoadMore]
 * @param {boolean} options.hasMore
 * @param {boolean} options.isLoadingMore
 */
export function useCarouselNavigation({ itemCount, scrollDistance, onLoadMore, hasMore, isLoadingMore }) {
  /** @type {import('react').RefObject<HTMLDivElement|null>} */
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasLoadMoreHandler = Boolean(onLoadMore);
  const onLoadMoreRef = useRef(onLoadMore);
  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });
  const canLoadMore = Boolean(hasLoadMoreHandler && hasMore && !isLoadingMore);
  /** @type {import('react').RefObject<{left: number, loads: number, limit: number, itemCount: number}|null>} */
  const pendingNextScroll = useRef(null);
  const autoFill = useRef({ width: 0, loads: 0, limit: 0, itemCount: null });

  const checkLoadMore = useCallback((track, delta = 0) => {
    if (!canLoadMore || pendingNextScroll.current || track.scrollWidth <= track.clientWidth + 1) return;
    const remaining = track.scrollWidth - track.clientWidth - (track.scrollLeft + delta);
    const threshold = Math.max(600, track.clientWidth * 0.75);
    if (remaining <= threshold) {
      onLoadMoreRef.current?.();
    }
  }, [canLoadMore]);

  const getScrollDelta = useCallback((track) => getCarouselScrollDistance(track, scrollDistance), [scrollDistance]);

  const scroll = useCallback((direction) => {
    const track = scrollRef.current;
    if (!track) return;

    const delta = getScrollDelta(track);
    const metrics = getCardMetrics(track, itemCount);
    if (!metrics) return;
    const canActuallyScrollLeft = track.scrollLeft > 2;

    if (direction === 'right') {
      if (pendingNextScroll.current) return;
      const left = track.scrollLeft + delta;
      if (left > metrics.maxScroll + 1 && hasLoadMoreHandler && hasMore) {
        // Keep one absolute destination while sparse pages arrive, rather than clamping
        // the first click to the single extra card already loaded past the viewport.
        pendingNextScroll.current = {
          left, itemCount, loads: canLoadMore ? 1 : 0,
          limit: Math.max(1, Math.ceil((left - metrics.maxScroll) / Math.max(1, metrics.cardStep)))
        };
        if (canLoadMore) onLoadMoreRef.current?.();
        return;
      }
      track.scrollTo({ left: Math.min(left, metrics.maxScroll), behavior: 'smooth' });
      checkLoadMore(track, delta);
    } else {
      pendingNextScroll.current = null;
      if (canActuallyScrollLeft) {
        track.scrollBy({
          left: -delta,
          behavior: 'smooth'
        });
      }
    }
  }, [canLoadMore, checkLoadMore, getScrollDelta, hasLoadMoreHandler, hasMore, itemCount]);

  useEffect(() => {
    if (isLoadingMore || !pendingNextScroll.current) return undefined;
    const frame = requestAnimationFrame(() => {
      const navigation = pendingNextScroll.current;
      const track = scrollRef.current;
      if (!navigation || !track) return;
      const metrics = getCardMetrics(track, itemCount);
      if (!metrics) return;
      if (metrics.maxScroll >= navigation.left - 1 || !hasMore) {
        pendingNextScroll.current = null;
        const left = Math.min(navigation.left, metrics.maxScroll);
        const delta = left - track.scrollLeft;
        track.scrollTo({ left, behavior: 'smooth' });
        checkLoadMore(track, delta);
        return;
      }
      if (!canLoadMore || navigation.loads >= navigation.limit || (navigation.loads > 0 && navigation.itemCount === itemCount)) {
        pendingNextScroll.current = null;
        return;
      }
      navigation.itemCount = itemCount;
      navigation.loads += 1;
      onLoadMoreRef.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [itemCount, isLoadingMore, hasMore, canLoadMore, checkLoadMore]);

  useEffect(() => {
    const track = scrollRef.current;
    if (!track) return;

    const updateScrollState = () => {
      setCanScrollLeft(track.scrollLeft > 1);
      setCanScrollRight(track.scrollWidth - track.clientWidth - track.scrollLeft > 1);

      const fill = autoFill.current;
      if (fill.width !== track.clientWidth) {
        fill.width = track.clientWidth;
        fill.loads = 0;
        fill.limit = 0;
        fill.itemCount = null;
      }

      if (!canLoadMore || pendingNextScroll.current || !fill.width || fill.itemCount === itemCount) return;
      const metrics = getCardMetrics(track, itemCount);
      if (!metrics) return;
      const { availableWidth, contentWidth, cardStep } = metrics;
      if (contentWidth >= availableWidth - 1) return;

      // Sparse filtered pages may add only one card. Budget for the missing visible slots,
      // rather than stopping after a fixed number of loads while most of the row is still empty.
      if (!fill.limit) {
        if (cardStep <= 0) return;
        fill.limit = Math.ceil((availableWidth - contentWidth) / cardStep);
      }
      if (fill.loads >= fill.limit) return;

      // Record the attempt before loading, including in StrictMode or repeated resize notifications.
      // No progress (empty/duplicate page or error) stops automatic retries; navigation remains available.
      fill.loads += 1;
      fill.itemCount = itemCount;
      onLoadMoreRef.current?.();
    };

    let frame;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateScrollState);
    };
    scheduleUpdate();
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(track);
    Array.from(track.children).forEach((child) => resizeObserver.observe(child));
    track.addEventListener('scroll', updateScrollState, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      track.removeEventListener('scroll', updateScrollState);
    };
  }, [itemCount, isLoadingMore, canLoadMore]);

  return { scrollRef, canScrollLeft, canScrollRight, canLoadMore, handleNavClick: scroll, checkLoadMore };
}
