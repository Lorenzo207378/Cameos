import { useEffect, useState } from 'react';

const IMAGE_PRELOAD_TIMEOUT_MS = 1200;

/**
 * Wait for all distinct images to load and decode; errors settle without blocking the page.
 * @param {Array<string|null|undefined>} urls
 * @param {() => void} onReady
 * @param {Object} [options={}]
 * @param {number} [options.timeoutMs=0]
 * @param {ReferrerPolicy} [options.referrerPolicy]
 * @returns {() => void}
 */
export function preloadImages(urls, onReady, { timeoutMs = 0, referrerPolicy = undefined } = {}) {
  const sources = [...new Set(urls.filter(/** @returns {url is string} */ (url) => typeof url === 'string' && Boolean(url)))];
  const images = sources.map(() => new Image());
  let active = true;
  let pending = images.length;
  let timer;
  const finish = () => {
    if (!active) return;
    active = false;
    clearTimeout(timer);
    onReady();
  };
  if (pending && timeoutMs > 0) timer = setTimeout(finish, timeoutMs);
  if (!pending) queueMicrotask(finish);

  images.forEach((image, index) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      pending -= 1;
      if (!pending) finish();
    };
    image.onload = () => {
      if (typeof image.decode === 'function') image.decode().then(settle, settle);
      else settle();
    };
    image.onerror = settle;
    if (referrerPolicy) image.referrerPolicy = referrerPolicy;
    image.src = sources[index];
  });

  return () => {
    active = false;
    clearTimeout(timer);
    images.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
  };
}

/** Image readiness belongs to the full URL set, including changes for the same page or language. */
export function useImagesReady(pageKey, urls, { timeoutMs = 0 } = {}) {
  const sourcesKey = JSON.stringify([...new Set(urls.filter(Boolean))]);
  const requestKey = pageKey === null ? null : `${pageKey}:${sourcesKey}`;
  const [readyKey, setReadyKey] = useState(/** @type {string|null} */ (null));

  useEffect(() => {
    if (requestKey === null) return undefined;
    return preloadImages(JSON.parse(sourcesKey), () => setReadyKey(requestKey), { timeoutMs });
  }, [requestKey, sourcesKey, timeoutMs]);

  return requestKey !== null && readyKey === requestKey;
}

export function useMovieImagesReady(movieId, backdropSrc, posterSrc) {
  const urls = [backdropSrc, posterSrc].filter((src) => typeof src === 'string' && src.startsWith('http'));
  // Failed or slow images must not keep the page on the loading screen.
  return useImagesReady(movieId, urls, { timeoutMs: IMAGE_PRELOAD_TIMEOUT_MS });
}
