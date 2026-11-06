import { useEffect, useState } from 'react';
import { preloadImages } from './imageUtils.js';

/** Prepare the mounted layout behind the loader; data retrieval stays in the ViewModels. */
export function usePageReady(contentRef, dataReady) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (!dataReady || ready || !content) return undefined;

    let active = true;
    let frame;
    let cancelImages;

    frame = requestAnimationFrame(async () => {
      const images = [...content.querySelectorAll('img')].filter((image) => {
        const track = image.closest('.carousel-track');
        if (!track) return true;
        const cardBounds = image.getBoundingClientRect();
        const trackBounds = track.getBoundingClientRect();
        return cardBounds.right > trackBounds.left && cardBounds.left < trackBounds.right;
      });
      // Hidden content keeps its real width; eagerly load its initial posters before revealing it.
      images.forEach((image) => { image.loading = 'eager'; });
      const sources = images.map((image) => image.currentSrc || image.src);
      content.querySelectorAll('[style]').forEach((element) => {
        const backdrop = element.style.getPropertyValue('--card-backdrop-img');
        const match = backdrop.match(/^url\(["']?(.*?)["']?\)$/);
        if (match) sources.push(match[1]);
      });

      await Promise.all([
        new Promise((resolve) => { cancelImages = preloadImages(sources, resolve); }),
        document.fonts?.ready
      ]);
      if (!active) return;

      // Allow carousel auto-fill and text measurements to commit before the first visible frame.
      frame = requestAnimationFrame(() => {
        if (active) setReady(true);
      });
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      cancelImages?.();
    };
  }, [contentRef, dataReady, ready]);

  return ready;
}
