import { useLayoutEffect, useEffect } from 'react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Calcola e restituisce la dimensione minima consentita per i testi in pixel,
 * leggendo la proprietà CSS personalizzata `--text-min-size` definita su :root.
 * In questo modo il valore minimo è governato esclusivamente dal CSS.
 * @returns {number} Dimensione minima in pixel
 */
export function getMinFontSizePx() {
  if (typeof window === 'undefined') return 11;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--text-min-size').trim();
  if (raw.endsWith('rem')) {
    const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return Math.round(parseFloat(raw) * rootSize);
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
 */
export function fitSingleLineText(headingEl, titleEl, reserve = 0) {
  if (!headingEl || !titleEl) return;
  titleEl.style.removeProperty('font-size');
  titleEl.style.whiteSpace = 'nowrap';
  const availableWidth = Math.max(0, headingEl.clientWidth - reserve);
  const neededWidth = titleEl.scrollWidth;
  if (availableWidth > 0 && neededWidth > availableWidth) {
    const basePx = parseFloat(getComputedStyle(titleEl).fontSize) || 16;
    const minPx = getMinFontSizePx();
    const scaledPx = Math.max(minPx, Math.floor((basePx * availableWidth) / neededWidth));
    titleEl.style.setProperty('font-size', `${scaledPx / 16}rem`, 'important');
  }
}

/**
 * Hook React che adatta dinamicamente il testo a una riga singola senza andare a capo.
 * Utilizza `useLayoutEffect` (isomorfo) per misurare e modificare il DOM in modo sincrono prima
 * che il browser effettui il paint visivo, evitando qualsiasi sfarfallio (FOUT / layout shift).
 *
 * @param {import('react').RefObject<HTMLElement>} containerRef - Ref del contenitore di riferimento
 * @param {import('react').RefObject<HTMLElement>} textRef - Ref dell'elemento di testo
 * @param {Array<any>} [deps=[]] - Dipendenze aggiuntive per ricalcolare il fit
 * @param {number} [reserve=0] - Spazio riservato a icone o frecce
 */
export function useSingleLineFit(containerRef, textRef, deps = [], reserve = 0) {
  useIsomorphicLayoutEffect(() => {
    const containerEl = containerRef?.current;
    const textEl = textRef?.current;
    if (!containerEl || !textEl) return undefined;

    const fit = () => fitSingleLineText(containerEl, textEl, reserve);
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(containerEl);
    window.addEventListener('resize', fit, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [containerRef, textRef, reserve, ...deps]);
}
