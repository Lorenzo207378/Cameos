import { useEffect, useState } from 'react';

const IMAGE_PRELOAD_TIMEOUT_MS = 1200;

/** Wait for all distinct images to load and decode; errors settle without blocking the page. */
export function preloadImages(urls, onReady) {
  const sources = [...new Set(urls.filter((url) => typeof url === 'string' && url))];
  const images = sources.map(() => new Image());
  let active = true;
  let pending = images.length;
  const finish = () => { if (active) onReady(); };
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
    image.src = sources[index];
  });

  return () => {
    active = false;
    images.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
  };
}

/** Image readiness belongs to the full URL set, including changes for the same page or language. */
export function useImagesReady(pageKey, urls) {
  const sourcesKey = JSON.stringify([...new Set(urls.filter(Boolean))]);
  const requestKey = pageKey === null ? null : `${pageKey}:${sourcesKey}`;
  const [readyKey, setReadyKey] = useState(null);

  useEffect(() => {
    if (requestKey === null) return undefined;
    return preloadImages(JSON.parse(sourcesKey), () => setReadyKey(requestKey));
  }, [requestKey, sourcesKey]);

  return requestKey !== null && readyKey === requestKey;
}

export function useMovieImagesReady(movieId, backdropSrc, posterSrc) {
  const [loadedMovieId, setLoadedMovieId] = useState(null);

  useEffect(() => {
    if (movieId === null) return;

    const urls = [backdropSrc, posterSrc].filter(
      (src) => typeof src === 'string' && src.startsWith('http')
    );
    const images = urls.map(() => new Image());
    let pendingImages = images.length;

    const markReady = () => setLoadedMovieId(movieId);
    const onImageSettled = () => {
      pendingImages -= 1;
      if (pendingImages === 0) markReady();
    };

    // Failed or slow images must not keep the page on the loading screen.
    const timer = setTimeout(markReady, images.length ? IMAGE_PRELOAD_TIMEOUT_MS : 0);

    images.forEach((image, index) => {
      image.onload = onImageSettled;
      image.onerror = onImageSettled;
      image.src = urls[index];
    });

    return () => {
      clearTimeout(timer);
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [movieId, backdropSrc, posterSrc]);

  return movieId !== null && loadedMovieId === movieId;
}
