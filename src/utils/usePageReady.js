import { useEffect, useState } from 'react';
import { preloadImages } from './imageUtils.js';

/** Prepare the mounted layout behind the loader; data retrieval stays in the ViewModels. */
export function usePageReady(contentRef, mediaState, cameoState) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const content = contentRef.current;
    if (ready || !content) return undefined;

    let active = true;
    let frame;
    let cancelImages;

    const isVisible = (element) => {
      const bounds = element.getBoundingClientRect();
      const track = element.closest('.carousel-track')?.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0
        && bounds.bottom > 0 && bounds.top < window.innerHeight
        && bounds.right > Math.max(0, track?.left ?? 0)
        && bounds.left < Math.min(window.innerWidth, track?.right ?? window.innerWidth);
    };

    frame = requestAnimationFrame(async () => {
      // Only sections and automatic carousel filling inside the initial viewport block reveal.
      const pending = [...content.querySelectorAll('[data-catalog-loading="true"], .carousel-loading')];
      if (pending.some(isVisible)) return;

      const images = [...content.querySelectorAll('img')].filter(isVisible);
      // Hidden content keeps its real width; eagerly load its initial posters before revealing it.
      images.forEach((image) => { image.loading = 'eager'; });
      const sources = images.map((image) => image.currentSrc || image.src);
      content.querySelectorAll('[style]').forEach((element) => {
        if (!isVisible(element)) return;
        const backdrop = element.style.getPropertyValue('--card-backdrop-img');
        const match = backdrop.match(/^url\(["']?(.*?)["']?\)$/);
        if (match) sources.push(match[1]);
      });

      await Promise.all([
        new Promise((resolve) => { cancelImages = preloadImages(sources, resolve, { timeoutMs: 1200 }); }),
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
  }, [contentRef, mediaState, cameoState, ready]);

  return ready;
}
