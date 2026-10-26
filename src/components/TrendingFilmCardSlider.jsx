import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../css/trendingFilmSlider.css';

/**
 * TrendingFilmCardSlider
 * Slider / Carousel superiore per i top trend con rotazione automatica (10s).
 * - Su schermi estesi si trasforma in carousel con card placeholder scure laterali.
 * - Dimensione massima card centrale: dimensione dell'immagine di backdrop (780px x 440px).
 * - Progress bar a pallini originale posizionata sotto al carousel e centrata orizzontalmente.
 * - Pulsanti di navigazione posizionati sulla destra al di sotto del carousel.
 * - Animazione fluida di sliding con transizione a placeholder scuro e supporto alla modalità focus.
 *
 * @param {Object} props
 * @param {Array<Object>} props.items - Top 8 titoli
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function TrendingFilmCardSlider({ items = [], type = 'movie' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');
  const [isPaused, setIsPaused] = useState(false);

  const total = Math.min(items.length, 8);

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
    const interval = setInterval(nextSlide, 10000); // 10 secondi come da specifiche originali
    return () => clearInterval(interval);
  }, [total, isPaused, nextSlide]);

  if (total === 0) return null;

  const currentItem = items[currentIndex];
  const isMovie = type === 'movie' || Boolean(currentItem?.title);
  const detailPath = isMovie ? `/Cameos/films/${currentItem.id}` : `/Cameos/series/${currentItem.id}`;
  const title = currentItem.title || currentItem.name || 'Titolo';

  const backdropSrc =
    (typeof currentItem.getBackdropUrl === 'function' ? currentItem.getBackdropUrl('it') : null) ||
    currentItem.backdropUrl?.it ||
    currentItem.backdropUrl?.en ||
    (typeof currentItem.backdropUrl === 'string' ? currentItem.backdropUrl : null);

  const rating = (Number(currentItem.voteAverage ?? currentItem.vote_average) || 0).toFixed(1);
  const year = (
    currentItem.releaseDate ||
    currentItem.release_date ||
    currentItem.firstAirDate ||
    currentItem.first_air_date ||
    ''
  ).slice(0, 4);

  const extraBadge = !isMovie && (currentItem.numberOfSeasons || currentItem.number_of_seasons)
    ? `${currentItem.numberOfSeasons || currentItem.number_of_seasons} Stagioni`
    : year;

  const overviewSnippet = currentItem.overview
    ? currentItem.overview.length > 180
      ? `${currentItem.overview.slice(0, 180)}...`
      : currentItem.overview
    : 'Trama in fase di aggiornamento...';

  const cameoHighlight = currentItem.cameos?.[0] || currentItem.vipCameos?.[0];

  return (
    <section
      className="trending-carousel-wrapper position-relative mb-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-label="Carousel titoli in tendenza"
    >
      {/* CORPO DEL CAROUSEL (CARD CENTRALE ATTIVA + CARD PLACEHOLDER LATERALI) */}
      <div className="trending-carousel-track">
        {/* CARD PLACEHOLDER SINISTRA A SFONDO SCURO SENZA CONTENUTO */}
        <div
          className={`trending-card-placeholder trending-card-left d-none d-lg-block ${
            slideDirection === 'next' ? 'placeholder-anim-left-next' : ''
          }`}
          onClick={prevSlide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              prevSlide();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Titolo precedente: clicca per portare al centro"
        />

        {/* CARD CENTRALE ATTIVA: DIMENSIONE BACKDROP (780px x 440px) CON CONTENUTO E SLIDING ANIMATION */}
        <div
          key={currentIndex}
          className={`trending-card-active shadow-lg slide-anim-${slideDirection}`}
          tabIndex={0}
          aria-label={`Titolo attivo: ${title}`}
        >
          {/* SFONDO BACKDROP CON GRADIENTE */}
          <div
            className="position-absolute top-0 start-0 w-100 h-100"
            style={{
              backgroundImage: backdropSrc
                ? `linear-gradient(90deg, rgba(14, 15, 20, 0.95) 0%, rgba(14, 15, 20, 0.85) 45%, rgba(14, 15, 20, 0.4) 100%), url(${backdropSrc})`
                : 'linear-gradient(135deg, rgba(10, 93, 10, 0.9) 0%, rgba(20, 40, 25, 0.95) 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transition: 'background-image 500ms ease-in-out'
            }}
          />

          {/* CONTENUTO CENTRALE */}
          <div className="position-relative z-1 p-4 p-md-5 h-100 d-flex flex-column justify-content-center">
            <div className="col-12 col-md-11 col-lg-10">
              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                <span className="badge rounded-pill bg-success px-3 py-2 fw-semibold">
                  <i className="bi bi-fire me-1 text-warning"></i> TOP #{currentIndex + 1} DEL MESE
                </span>
                {extraBadge && (
                  <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-2 border border-secondary border-opacity-25">
                    {extraBadge}
                  </span>
                )}
                {rating > 0 && (
                  <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold d-flex align-items-center gap-1">
                    <i className="bi bi-star-fill"></i> {rating}
                  </span>
                )}
                {cameoHighlight && (
                  <span
                    className="d-inline-flex align-items-center gap-2 fw-semibold text-info"
                    style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.9)' }}
                  >
                    <i className="bi bi-person-badge"></i>
                    <span>Cameo detected</span>
                  </span>
                )}
              </div>

              <h2 className="display-6 fw-bold text-white mb-2">{title}</h2>
              <p
                className="text-white-50 mb-3"
                style={{
                  maxWidth: '580px',
                  lineHeight: '1.6',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 3,
                  overflow: 'hidden'
                }}
              >
                {overviewSnippet}
              </p>

              <div className="d-flex flex-wrap gap-3 mt-3">
                <Link
                  to={detailPath}
                  className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
                >
                  <i className="bi bi-info-circle-fill"></i> Dettagli Completi
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* CARD PLACEHOLDER DESTRA A SFONDO SCURO SENZA CONTENUTO */}
        <div
          className={`trending-card-placeholder trending-card-right d-none d-lg-block ${
            slideDirection === 'prev' ? 'placeholder-anim-right-prev' : ''
          }`}
          onClick={nextSlide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              nextSlide();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Titolo successivo: clicca per portare al centro"
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
              aria-label={`Vai al trend ${idx + 1}`}
            />
          ))}
        </div>

        {/* PULSANTI DI NAVIGAZIONE SULLA DESTRA */}
        <div className="position-absolute end-0 d-flex gap-2 pe-3">
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 hero-nav-btn"
            style={{ width: '38px', height: '38px' }}
            onClick={prevSlide}
            aria-label="Precedente"
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 hero-nav-btn"
            style={{ width: '38px', height: '38px' }}
            onClick={nextSlide}
            aria-label="Successivo"
          >
            <i className="bi bi-chevron-right text-white"></i>
          </button>
        </div>
      </div>
    </section>
  );
}
