import { useEffect, useState } from 'react';

const IMAGE_PRELOAD_TIMEOUT_MS = 1200;

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
