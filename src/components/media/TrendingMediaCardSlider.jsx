import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../translations.js';
import TrendingMediaCardLateral from './TrendingMediaCardLateral.jsx';
import '../../css/media/trendingMediaCardSlider.css';

/**
 * Estrae le proprietà di visualizzazione di un'opera multimediale (Film o Serie TV)
 * @param {Object} item
 * @param {'movie'|'tv'} type
 * @param {'it'|'en'} [langKey='it']
 * @param {Function} [t]
 * @returns {Object|null}
 */
function extractMediaPresentation(item, type, langKey = 'it', t = (k, p, fb) => fb || k) {
  if (!item) return null;
  const isMovie = type === 'movie' || Boolean(item?.title);
  const detailPath = isMovie ? `/Cameos/films/${item.id}` : `/Cameos/series/${item.id}`;
  const rawTitle =
    (typeof item.getTitle === 'function' ? item.getTitle(langKey) : null) ||
    (typeof item.getName === 'function' ? item.getName(langKey) : null) ||
    item.title?.[langKey] ||
    item.name?.[langKey] ||
    item.title?.it ||
    item.title?.en ||
    item.name?.it ||
    item.name?.en ||
    (typeof item.title === 'string' ? item.title : null) ||
    (typeof item.name === 'string' ? item.name : null) ||
    t('slider.unknownTitle');
  const title = typeof rawTitle === 'string'
    ? rawTitle
    : (rawTitle?.it || rawTitle?.en || t('slider.unknownTitle'));

  const backdropSrc =
    (typeof item.getBackdropUrl === 'function' ? item.getBackdropUrl(langKey) : null) ||
    item.backdropUrl?.[langKey] ||
    item.backdropUrl?.it ||
    item.backdropUrl?.en ||
    (typeof item.backdropUrl === 'string' ? item.backdropUrl : null);

  const rating = (Number(item.voteAverage ?? item.vote_average) || 0).toFixed(1);
  const year = (
    item.releaseDate ||
    item.release_date ||
    item.firstAirDate ||
    item.first_air_date ||
    ''
  ).slice(0, 4);

  const seasonsCount = item.numberOfSeasons || item.number_of_seasons;
  const extraBadge = !isMovie && seasonsCount
    ? t('slider.seasonsCount', { count: seasonsCount })
    : year;

  const rawOverview =
    (typeof item.getOverview === 'function' ? item.getOverview(langKey) : null) ||
    item.overview?.[langKey] ||
    item.overview?.it ||
    item.overview?.en ||
    (typeof item.overview === 'string' ? item.overview : null) ||
    '';

  const overviewSnippet = rawOverview
    ? rawOverview.length > 180
      ? `${rawOverview.slice(0, 180)}...`
      : rawOverview
    : t('slider.plotUpdating');

  const cameoHighlight = item.cameos?.[0] || item.vipCameos?.[0];

  return {
    item,
    isMovie,
    detailPath,
    title,
    backdropSrc,
    rating,
    year,
    extraBadge,
    overviewSnippet,
    cameoHighlight
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
 * @param {Array<Object>} props.items - Top 10 titoli
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function TrendingMediaCardSlider({ items = [], type = 'movie' }) {
  const { t, langKey } = useTranslation();
  const navigate = useNavigate();
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
        {currentMedia && (
          <div
            key={currentIndex}
            className={`trending-card-active shadow-lg ${slideDirection ? `slide-anim-${slideDirection}` : ''}`}
            tabIndex={0}
            onAnimationEnd={() => setSlideDirection('')}
            onClick={(e) => {
              if (!e.target.closest('a, button') && currentMedia.detailPath) {
                navigate(currentMedia.detailPath);
              }
            }}
            aria-label={t('slider.activeTitleAria', { title: currentMedia.title })}
          >
            {/* Sfondo backdrop con gradiente */}
            <div
              className={`trending-card-backdrop ${currentMedia.backdropSrc ? 'has-backdrop' : ''}`}
              style={currentMedia.backdropSrc ? { '--card-backdrop-img': `url("${currentMedia.backdropSrc}")` } : undefined}
            />

            {/* Contenuto centrale prominente */}
            <div className="position-relative z-1 p-4 p-md-5 h-100 d-flex flex-column justify-content-center trending-card-content">
              <div className="col-12 col-md-11 col-lg-10">
                <div className="d-flex flex-wrap gap-2 align-items-center mb-3 trending-card-badges">
                  <span className="badge rounded-pill bg-success px-3 py-2 fw-semibold">
                    <i className="bi bi-fire me-1 text-warning"></i> {t('slider.topOfMonth', { rank: currentIndex + 1 })}
                  </span>
                  {currentMedia.extraBadge && (
                    <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-2 border border-secondary border-opacity-25">
                      {currentMedia.extraBadge}
                    </span>
                  )}
                  {currentMedia.rating > 0 && (
                    <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold d-flex align-items-center gap-1">
                      <i className="bi bi-star-fill"></i> {currentMedia.rating}
                    </span>
                  )}
                  {currentMedia.cameoHighlight && (
                    <span className="d-inline-flex align-items-center gap-2 fw-semibold text-info trending-cameo-badge">
                      <i className="bi bi-person-badge"></i>
                      <span>{t('slider.cameoDetected')}</span>
                    </span>
                  )}
                </div>

                <h2 className="display-6 fw-bold text-white mb-3 trending-card-title">{currentMedia.title}</h2>
                <p className="text-white-50 mb-3 trending-card-overview">
                  {currentMedia.overviewSnippet}
                </p>

                <div className="d-flex flex-wrap gap-3 mt-4 trending-card-action">
                  <Link
                    to={currentMedia.detailPath}
                    className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
                  >
                    <i className="bi bi-info-circle-fill"></i> {t('slider.fullDetails')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

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
              className={`hero-dot ${idx === currentIndex ? 'active' : ''} ${
                idx === currentIndex && isPaused ? 'paused' : ''
              }`}
              onClick={() => selectSlide(idx)}
              aria-label={t('slider.goToSlide', { index: idx + 1 })}
            >
              {idx === currentIndex && <span className="hero-dot-progress" />}
            </button>
          ))}
        </div>

        {/* PULSANTI DI NAVIGAZIONE SULLA DESTRA */}
        <div className="position-absolute top-50 end-0 translate-middle-y d-flex align-items-center gap-2 pe-3">
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 hero-nav-btn"
            onClick={prevSlide}
            aria-label={t('slider.prevSlide')}
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 hero-nav-btn"
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
