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
  const dialogRef = useRef(null);
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
 * Start a single-finger gesture without handling the component-specific swipe action.
 * @param {{touches?: ArrayLike<{clientX: number, clientY: number}>}} event
 * @param {{touchStartX: {current: number}, touchStartY: {current: number}, touchDeltaX: {current: number}, touchDeltaY: {current: number}}} refs
 */
export function startTouchSwipe(event, { touchStartX, touchStartY, touchDeltaX, touchDeltaY }) {
  if (event.touches && event.touches.length === 1) {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
  }
}

/**
 * Update the displacement of a single-finger gesture.
 * @param {{touches?: ArrayLike<{clientX: number, clientY: number}>}} event
 * @param {{touchStartX: {current: number}, touchStartY: {current: number}, touchDeltaX: {current: number}, touchDeltaY: {current: number}}} refs
 */
export function moveTouchSwipe(event, { touchStartX, touchStartY, touchDeltaX, touchDeltaY }) {
  if (event.touches && event.touches.length === 1) {
    touchDeltaX.current = event.touches[0].clientX - touchStartX.current;
    touchDeltaY.current = event.touches[0].clientY - touchStartY.current;
  }
}
