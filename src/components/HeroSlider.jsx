import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

/**
 * HeroSlider
 * Slider in evidenza superiore (~1/3 pagina) per i top trend con rotazione automatica (10s)
 * e progress bar punteggiata.
 * @param {Object} props
 * @param {Array<Object>} props.items - Top 8 titoli
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function HeroSlider({ items = [], type = 'movie' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const total = Math.min(items.length, 8);

  const nextSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    if (total === 0) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (total <= 1 || isPaused) return undefined;
    const interval = setInterval(nextSlide, 10000); // 10 secondi come da specifiche
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
    ? currentItem.overview.length > 220
      ? `${currentItem.overview.slice(0, 220)}...`
      : currentItem.overview
    : 'Trama in fase di aggiornamento...';

  const cameoHighlight = currentItem.cameos?.[0] || currentItem.vipCameos?.[0];

  return (
    <section
      className="position-relative rounded-4 mb-5 overflow-hidden shadow-lg"
      style={{
        minHeight: '380px',
        backgroundColor: '#1E1E24',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* SFONDO BACKDROP CON GRADIENTE */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          backgroundImage: backdropSrc
            ? `linear-gradient(90deg, rgba(14, 15, 20, 0.95) 0%, rgba(14, 15, 20, 0.85) 45%, rgba(14, 15, 20, 0.4) 100%), url(${backdropSrc})`
            : 'linear-gradient(135deg, rgba(10, 93, 10, 0.9) 0%, rgba(20, 40, 25, 0.95) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          transition: 'background-image 500ms ease-in-out'
        }}
      />

      {/* CONTENUTO HERO */}
      <div className="position-relative z-1 p-4 p-md-5 d-flex flex-column justify-content-between h-100" style={{ minHeight: '380px' }}>
        <div className="row align-items-center">
          <div className="col-lg-8 col-xl-7">
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
            </div>

            <h1 className="display-5 fw-bold text-white mb-2">{title}</h1>
            <p className="text-white-50 mb-3" style={{ maxWidth: '680px', lineHeight: '1.6' }}>
              {overviewSnippet}
            </p>

            {cameoHighlight && (
              <div
                className="p-2 px-3 rounded-3 mb-4 d-inline-flex align-items-center gap-2"
                style={{ background: 'rgba(10, 93, 10, 0.35)', border: '1px solid rgba(20, 189, 20, 0.4)' }}
              >
                <i className="bi bi-person-badge text-success fs-5"></i>
                <small className="text-white">
                  <strong className="text-success">Cameo in evidenza:</strong> {cameoHighlight.name} ({cameoHighlight.character || 'Cameo speciale'})
                </small>
              </div>
            )}

            <div className="d-flex flex-wrap gap-3 mt-2">
              <Link
                to={detailPath}
                className="btn btn-success rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2"
              >
                <i className="bi bi-info-circle-fill"></i> Dettagli Completi
              </Link>
            </div>
          </div>
        </div>

        {/* PROGRESS BAR PUNTEGGIATA PER MOSTRARE LO SCORRIMENTO */}
        <div className="d-flex justify-content-between align-items-center pt-4 mt-auto">
          <div className="d-flex align-items-center gap-2">
            {Array.from({ length: total }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`hero-dot ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Vai al trend ${idx + 1}`}
              />
            ))}
          </div>

          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
              style={{ width: '36px', height: '36px' }}
              onClick={prevSlide}
              aria-label="Precedente"
            >
              <i className="bi bi-chevron-left text-white"></i>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-dark bg-opacity-75 rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
              style={{ width: '36px', height: '36px' }}
              onClick={nextSlide}
              aria-label="Successivo"
            >
              <i className="bi bi-chevron-right text-white"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
