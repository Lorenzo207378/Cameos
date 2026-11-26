import { useLayoutEffect, useEffect, useCallback, useRef } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
import { useNavigate } from 'react-router-dom';

const openDialogs = new Set();
let bodyOverflow = '';

/**
 * Control a native dialog. The browser manages focus trapping; cleanup restores focus.
 * Escape and clicks on the dialog backdrop request closure through onClose.
 * @param {boolean} isOpen
 * @param {() => void} [onClose]
 * @returns {import('react').RefObject<HTMLDialogElement|null>}
 */
export function useModal(isOpen, onClose) {
  const dialogRef = useRef(/** @type {HTMLDialogElement|null} */ (null));
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return undefined;

    const cancel = (event) => {
      event.preventDefault();
      closeRef.current?.();
    };
    const click = (event) => {
      if (event.target === dialog) closeRef.current?.();
    };
    const previousFocus = document.activeElement;
    dialog.showModal();
    if (!openDialogs.size) bodyOverflow = document.body.style.overflow;
    openDialogs.add(dialog);
    document.body.style.overflow = 'hidden';
    dialog.addEventListener('cancel', cancel);
    dialog.addEventListener('click', click);

    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.removeEventListener('click', click);
      dialog.close();
      openDialogs.delete(dialog);
      if (!openDialogs.size) document.body.style.overflow = bodyOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  return dialogRef;
}


/** Return to the previous app route, or use the fallback after opening a page directly. */
export function useGoBack(fallbackPath) {
  const navigate = useNavigate();
  return useCallback(() => {
    navigate(window.history.state?.idx > 0 ? -1 : fallbackPath);
  }, [navigate, fallbackPath]);
}

/**
 * Centralized hook to reset window scroll position to (0, 0).
 * Handles:
 * 1. Disabling automatic browser scroll restoration on SPAs (prevents clamped offsets on POP).
 * 2. Scrolling to top on trigger change (e.g. route, media ID) once `isReady` is true.
 *
 * @param {any} [trigger] - Dependency whose change triggers a scroll to top.
 * @param {boolean} [isReady=true] - Gate flag; scrolls only when true (e.g. when image/page is ready).
 */
export function useScrollToTop(trigger, isReady = true) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return undefined;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [trigger, isReady]);
}

/**
 * Calcola e restituisce la dimensione minima consentita per i testi in pixel,
 * leggendo la proprietà CSS personalizzata `--text-min-size` definita su :root.
 * In questo modo il valore minimo è governato esclusivamente dal CSS.
 * @returns {number} Dimensione minima in pixel
 */
function getMinFontSizePx() {
  if (typeof window === 'undefined') return 11;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--text-min-size').trim();
  if (raw.endsWith('rem')) {
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(raw) * rootSize;
  }
  if (raw.endsWith('px')) {
    return parseFloat(raw);
  }
  return 11;
}

/**
 * Adatta la dimensione del font di un elemento a riga singola per occupare
 * al massimo lo spazio disponibile senza andare a capo.
 * @param {HTMLElement} headingEl - Contenitore di riferimento
 * @param {HTMLElement} titleEl - Elemento testuale del titolo
 * @param {number} [reserve=0] - Spazio riservato a icone o frecce
 * @param baseFontSize
 */
function fitSingleLineText(headingEl, titleEl, reserve = 0, baseFontSize = '') {
  if (!headingEl || !titleEl) return;
  titleEl.style.removeProperty('font-size');
  if (baseFontSize) titleEl.style.fontSize = baseFontSize;
  titleEl.style.whiteSpace = 'nowrap';
  const availableWidth = Math.max(0, headingEl.clientWidth - reserve);
  const neededWidth = titleEl.scrollWidth;
  if (availableWidth > 0 && neededWidth > availableWidth) {
    const basePx = parseFloat(getComputedStyle(titleEl).fontSize) || 16;
    const minPx = getMinFontSizePx();
    const scaledPx = Math.max(minPx, Math.floor((basePx * availableWidth) / neededWidth));
    titleEl.style.setProperty('font-size', `${scaledPx}px`, 'important');
  }
}

/**
 * Hook che adatta dinamicamente il testo a una riga singola senza andare a capo.
 * @param {{current: HTMLElement|null}} containerRef - Ref del contenitore di riferimento
 * @param {{current: HTMLElement|null}} textRef - Ref dell'elemento di testo
 * @param {Array<any>} [deps=[]] - Dipendenze aggiuntive per ricalcolare il fit
 * @param {number} [reserve=0] - Spazio riservato a icone o frecce
 */
export function useSingleLineFit(containerRef, textRef, deps = [], reserve = 0) {
  useIsomorphicLayoutEffect(() => {
    const containerEl = containerRef?.current;
    const textEl = textRef?.current;
    if (!containerEl || !textEl) return undefined;

    const baseFontSize = textEl.style.fontSize;
    const fit = () => fitSingleLineText(containerEl, textEl, reserve, baseFontSize);
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(containerEl);
    window.addEventListener('resize', fit, { passive: true });
    let active = true;
    document.fonts?.ready.then(() => { if (active) fit(); });

    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener('resize', fit);
      textEl.style.removeProperty('font-size');
      if (baseFontSize) textEl.style.fontSize = baseFontSize;
    };
  }, [containerRef, textRef, reserve, ...deps]);
}

/** Measure loaded cards without treating a loading indicator as navigable content.
 * @param {HTMLDivElement} track
 * @param {number} itemCount
 */
export function getCardMetrics(track, itemCount) {
  // Measure actual cards: scrollWidth is at least clientWidth even when the row is mostly empty.
  // The loading indicator follows the itemCount cards and must not count towards their width.
  const first = track.firstElementChild;
  const last = track.children[itemCount - 1];
  if (!first || !last) return null;
  const style = getComputedStyle(track);
  const firstRect = first.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  return {
    availableWidth: track.clientWidth - paddingLeft - paddingRight,
    contentWidth: lastRect.right - firstRect.left,
    cardStep: firstRect.width + (parseFloat(style.columnGap) || 0),
    maxScroll: Math.max(0, lastRect.right - track.getBoundingClientRect().left - track.clientLeft + track.scrollLeft + paddingRight - track.clientWidth)
  };
}

/** Resolve a configured scroll step against the current track width.
 * @param {HTMLDivElement} track
 * @param {'page'|number|((track: HTMLDivElement) => number)} scrollDistance
 */
export function getCarouselScrollDistance(track, scrollDistance) {
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
}

/**
 * Track single-finger horizontal touch swipes and invoke the matching direction callback.
 * @param {Object} options
 * @param {() => void} [options.onSwipeLeft]
 * @param {() => void} [options.onSwipeRight]
 * @param {number} [options.threshold=35]
 * @returns {{
 *   onTouchStart: (event: import('react').TouchEvent) => void,
 *   onTouchMove: (event: import('react').TouchEvent) => void,
 *   onTouchEnd: () => void
 * }}
 */
export function useHorizontalSwipe({ onSwipeLeft = undefined, onSwipeRight = undefined, threshold = 35 } = {}) {
  const gestureRef = useRef({ startX: 0, startY: 0, deltaX: 0, deltaY: 0 });

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    gestureRef.current = {
      startX: event.touches[0].clientX,
      startY: event.touches[0].clientY,
      deltaX: 0,
      deltaY: 0
    };
  };

  const onTouchMove = (event) => {
    if (event.touches.length !== 1) return;
    gestureRef.current.deltaX = event.touches[0].clientX - gestureRef.current.startX;
    gestureRef.current.deltaY = event.touches[0].clientY - gestureRef.current.startY;
  };

  const onTouchEnd = () => {
    const { deltaX, deltaY } = gestureRef.current;
    gestureRef.current.deltaX = 0;
    gestureRef.current.deltaY = 0;
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      if (deltaX < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}

/**
 * Prevent multi-touch pinch zoom and Safari/WebKit gesture scaling so the app stays at 1.0x base scale.
 */
export function usePreventPinchZoom() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    /** @param {Event} event */
    const preventGestureZoom = (event) => {
      event.preventDefault();
    };

    /** @param {TouchEvent} event */
    const preventMultiTouchZoom = (event) => {
      if (event.touches && event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
    document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
    document.addEventListener('gestureend', preventGestureZoom, { passive: false });
    document.addEventListener('touchstart', preventMultiTouchZoom, { passive: false });

    return () => {
      document.removeEventListener('gesturestart', preventGestureZoom);
      document.removeEventListener('gesturechange', preventGestureZoom);
      document.removeEventListener('gestureend', preventGestureZoom);
      document.removeEventListener('touchstart', preventMultiTouchZoom);
    };
  }, []);
}

/**
 * Keep the bottom edge of the last card anchored inside its scroll container while it expands.
 * Stops automatically on user wheel/touch interaction or after the expansion transition settles.
 * @param {import('react').RefObject<HTMLElement|null>} cardRef
 * @param {boolean} isExpanded
 * @param {string} [scrollContainerSelector='.tv-episodes-scroll-container']
 */
export function useKeepExpandedCardAnchored(cardRef, isExpanded, scrollContainerSelector = '.tv-episodes-scroll-container') {
  useEffect(() => {
    const card = cardRef.current;
    if (!isExpanded || !card || card.nextElementSibling) return undefined;

    const scrollContainer = card.closest(scrollContainerSelector);
    if (!scrollContainer) return undefined;

    let stopped = false;
    let prevHeight = card.getBoundingClientRect().height;
    let frameId = 0;
    const stopAnchoring = () => {
      stopped = true;
    };

    const keepBottomAnchored = () => {
      if (stopped) return;
      const cardRect = card.getBoundingClientRect();
      if (cardRect.height <= prevHeight + 0.5) return;
      prevHeight = cardRect.height;

      const containerRect = scrollContainer.getBoundingClientRect();
      const padBottom = parseFloat(getComputedStyle(scrollContainer).paddingBottom) || 0;
      const overflow = cardRect.bottom - (containerRect.bottom - padBottom);
      if (overflow > 0) scrollContainer.scrollTop += overflow;
    };

    const tick = () => {
      if (stopped) return;
      keepBottomAnchored();
      frameId = requestAnimationFrame(tick);
    };

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(keepBottomAnchored) : null;
    observer?.observe(card);
    scrollContainer.addEventListener('wheel', stopAnchoring, { passive: true, once: true });
    scrollContainer.addEventListener('touchmove', stopAnchoring, { passive: true, once: true });
    frameId = requestAnimationFrame(tick);

    const stopTimer = setTimeout(() => {
      stopped = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    }, 1500);

    return () => {
      stopped = true;
      clearTimeout(stopTimer);
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      scrollContainer.removeEventListener('wheel', stopAnchoring);
      scrollContainer.removeEventListener('touchmove', stopAnchoring);
    };
  }, [cardRef, isExpanded, scrollContainerSelector]);
}
