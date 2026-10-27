import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../../utils/translations.js';
import TrendingMediaCardLateral from './TrendingMediaCardLateral.jsx';
import TrendingMediaCardMain from './TrendingMediaCardMain.jsx';
import '../../css/media/trendingMediaCardSlider.css';

/**
 * Prepara i soli dati usati dalle card, delegando la localizzazione al modello.
 * @param {import('../../models/Movie.js').Movie|import('../../models/Series.js').Series} item
 * @param {'movie'|'tv'} type
 * @param {string} langKey
 * @param {Function} t
 * @returns {Object|null}
 */
function extractMediaPresentation(item, type, langKey, t) {
  if (!item) return null;

  const isMovie = type === 'movie';
  const overview = item.getOverview(langKey);
  const overviewSnippet = overview.length > 180
    ? `${overview.slice(0, 180)}...`
    : overview || t('slider.plotUpdating');

  let extraBadge;
  if (!isMovie && item.numberOfSeasons) {
    extraBadge = t('slider.seasonsCount', { count: item.numberOfSeasons });
  } else {
    const releaseDate = isMovie ? item.releaseDate : item.firstAirDate;
    extraBadge = releaseDate?.slice(0, 4) || '';
  }

  return {
    detailPath: `/Cameos/${isMovie ? 'films' : 'series'}/${item.id}`,
    title: item.getTitle(langKey) || t('slider.unknownTitle'),
    backdropSrc: item.getBackdropUrl(langKey),
    rating: item.voteAverage.toFixed(1),
    extraBadge,
    overviewSnippet,
    cameoHighlight: item.cameos?.[0] || item.vipCameos?.[0]
  };
}

/**
 * TrendingMediaCardSlider
 * Slider / Carousel superiore per i top trend con rotazione automatica (7s).
 * - Su schermi estesi si trasforma in carousel con card preview per media precedente e successivo.
 * - Dimensione massima card centrale: dimensione dell'immagine di backdrop (780px x 440px).
 * - Progress bar a pallini posizionata sotto al carousel e centrata orizzontalmente.
 * - Pulsanti di navigazione posizionati sulla destra al di sotto del carousel.
 * - Card laterali con info sul media a posizione -1 e +1 attenuate, che entrano in risalto quando portate al centro.
 *
 * @param {Object} props
 * @param {Array<import('../../models/Movie.js').Movie|import('../../models/Series.js').Series>} props.items - Top 10 titoli
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function TrendingMediaCardSlider({ items = [], type = 'movie' }) {
  const { t, langKey } = useTranslation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  const total = Math.min(items.length, 10);

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setSlideDirection('next');
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setSlideDirection('prev');
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const selectSlide = useCallback((index) => {
    if (index === currentIndex) return;
    setSlideDirection(index > currentIndex ? 'next' : 'prev');
    setCurrentIndex(index);
  }, [currentIndex]);

  useEffect(() => {
    if (total <= 1 || isPaused) return undefined;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [total, isPaused, nextSlide]);

  if (total === 0) return null;

  const prevIndex = (currentIndex - 1 + total) % total;
  const nextIndex = (currentIndex + 1) % total;

  const prevMedia = extractMediaPresentation(items[prevIndex], type, langKey, t);
  const currentMedia = extractMediaPresentation(items[currentIndex], type, langKey, t);
  const nextMedia = extractMediaPresentation(items[nextIndex], type, langKey, t);

  return (
    <section
      className="trending-carousel-wrapper position-relative mb-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label={t('slider.carouselAria')}
    >
      {/* CORPO DEL CAROUSEL (CARD CENTRALE ATTIVA + CARD PREVIEW LATERALI -1 E +1) */}
      <div className="trending-carousel-track">
        <TrendingMediaCardLateral
          media={prevMedia}
          rank={prevIndex + 1}
          side="left"
          animationClass={slideDirection === 'next' ? 'side-anim-left-next' : ''}
          onSelect={prevSlide}
          t={t}
        />

        {/* CARD CENTRALE ATTIVA: MASSIMA PROMINENZA (780px x 440px) CON CONTENUTO COMPLETO */}
        <TrendingMediaCardMain
          key={currentIndex}
          media={currentMedia}
          rank={currentIndex + 1}
          slideDirection={slideDirection}
          onAnimationEnd={() => setSlideDirection('')}
          t={t}
        />

        <TrendingMediaCardLateral
          media={nextMedia}
          rank={nextIndex + 1}
          side="right"
          animationClass={slideDirection === 'prev' ? 'side-anim-right-prev' : ''}
          onSelect={nextSlide}
          t={t}
        />
      </div>

      {/* PROGRESS BAR E PULSANTI DI NAVIGAZIONE POSIZIONATI AL DI SOTTO DEL CAROUSEL */}
      <div className="trending-carousel-controls position-relative d-flex align-items-center justify-content-center mx-auto mt-4 px-3">
        {/* PROGRESS BAR ORIGINALE CENTRATA ORIZZONTALMENTE RISPETTO AL CAROUSEL */}
        <div className="d-flex align-items-center gap-2">
          {Array.from({ length: total }).map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => selectSlide(idx)}
              aria-label={t('slider.goToSlide', { index: idx + 1 })}
              aria-current={idx === currentIndex ? 'true' : undefined}
            />
          ))}
        </div>

        {/* PULSANTI DI NAVIGAZIONE SULLA DESTRA */}
        <div className="position-absolute top-50 end-0 translate-middle-y d-flex align-items-center gap-2 pe-3">
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 carousel-nav-btn"
            onClick={prevSlide}
            aria-label={t('slider.prevSlide')}
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 carousel-nav-btn"
            onClick={nextSlide}
            aria-label={t('slider.nextSlide')}
          >
            <i className="bi bi-chevron-right text-white"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
