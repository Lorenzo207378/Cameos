import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CastCarousel from '../components/CastCarousel.jsx';
import CameoCard from '../components/CameoCard.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { getMovieById, getCameosForMedia, getReviewsForTarget } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';
import { useMovieViewModel } from '../viewmodel/index.js';
import '../css/films/filmDetail.css';
import '../css/media/trendingMediaCardSlider.css'

const GENRE_KEY_MAP = Object.freeze({
  28: 'action',
  12: 'adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'sciFi',
  10770: 'tvMovie',
  53: 'thriller',
  10752: 'war',
  37: 'western'
});

export default function FilmDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, langKey } = useTranslation();

  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const movieVM = useMovieViewModel();
  const { loadMovieDetails } = movieVM;

  useEffect(() => {
    if (id) {
      loadMovieDetails(id, true);
    }
  }, [id, loadMovieDetails]);

  // Retrieve movie by ID from ViewModel, with fallback to local catalog
  const movie = useMemo(() => {
    if (movieVM.selectedMovie && String(movieVM.selectedMovie.id) === String(id)) {
      return movieVM.selectedMovie;
    }
    return getMovieById(id);
  }, [id, movieVM.selectedMovie]);

  const cameos = useMemo(() => {
    return movie ? getCameosForMedia('movie', movie.id) : [];
  }, [movie]);

  const reviews = useMemo(() => {
    return movie ? getReviewsForTarget(`movie:${movie.id}`) : [];
  }, [movie]);

  const rawBackdropSrc =
    (typeof movie?.getBackdropUrl === 'function' ? movie.getBackdropUrl(langKey) : null) ||
    movie?.backdropUrl?.[langKey] ||
    movie?.backdropUrl?.it ||
    movie?.backdropUrl?.en ||
    (typeof movie?.backdropUrl === 'string' ? movie.backdropUrl : null);
  const backdropSrc = rawBackdropSrc ? rawBackdropSrc.replace('/w780/', '/w1280/') : null;

  const posterSrc =
    (typeof movie?.getPosterUrl === 'function' ? movie.getPosterUrl(langKey) : null) ||
    movie?.posterUrl?.[langKey] ||
    movie?.posterUrl?.it ||
    movie?.posterUrl?.en ||
    IMAGE_PLACEHOLDERS.POSTER;

  const [loadedMovieId, setLoadedMovieId] = useState(null);

  useEffect(() => {
    if (!movie) return;

    const currentMovieId = String(movie.id);
    const urlsToPreload = [backdropSrc, posterSrc].filter(
      (src) => typeof src === 'string' && src.startsWith('http')
    );

    let isMounted = true;

    if (urlsToPreload.length === 0) {
      const timer = setTimeout(() => {
        if (isMounted) setLoadedMovieId(currentMovieId);
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }

    let pending = urlsToPreload.length;

    const onDone = () => {
      pending -= 1;
      if (pending <= 0 && isMounted) {
        setLoadedMovieId(currentMovieId);
      }
    };

    urlsToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = onDone;
      img.onerror = onDone;
    });

    const timer = setTimeout(() => {
      if (isMounted) {
        setLoadedMovieId(currentMovieId);
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [id, movie, backdropSrc, posterSrc]);

  const isImageReady = Boolean(movie && loadedMovieId === String(movie.id));
  const isDataReady = Boolean(movie && String(movie.id) === String(id));
  const isPageReady = isDataReady && isImageReady && !movieVM.loading;

  if (!movieVM.loading && !movie) {
    return (
      <div
        className="w-100 min-vh-100 d-flex flex-column position-relative"
        style={{ backgroundColor: '#1E1E24', color: '#fff' }}
      >
        <div className="px-3 px-md-4 px-xl-5 pt-3 pt-md-4">
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/Cameos/films');
              }
            }}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50"
            style={{
              width: '44px',
              height: '44px',
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(30, 30, 36, 0.65)'
            }}
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>

        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 pb-5">
          <i className="bi bi-film text-secondary fs-1 mb-3 opacity-50" />
          <h2 className="fw-bold mb-2 text-white">{t('detail.movieNotFound')}</h2>
          <p className="text-secondary mb-4">{t('common.noResults')}</p>
          <button
            type="button"
            onClick={() => navigate('/Cameos/films')}
            className="btn btn-outline-success rounded-pill px-4 py-2 fw-semibold"
          >
            {t('detail.goBack')}
          </button>
        </div>
      </div>
    );
  }

  if (!isPageReady) {
    return <LoadingScreen />;
  }

  const rawMovieTitle =
    (typeof movie.getTitle === 'function' ? movie.getTitle(langKey) : null) ||
    movie.title?.[langKey] ||
    movie.title?.it ||
    movie.title?.en ||
    (typeof movie.title === 'string' ? movie.title : null) ||
    '';
  const movieTitle = typeof rawMovieTitle === 'string' ? rawMovieTitle : (rawMovieTitle?.it || rawMovieTitle?.en || String(rawMovieTitle || ''));

  // Tagline fetched bilingual & rendered white
  const rawMovieTagline =
    (typeof movie.getTagline === 'function' ? movie.getTagline(langKey) : null) ||
    movie.taglines?.[langKey] ||
    movie.tagline?.[langKey] ||
    (typeof movie.tagline === 'string' ? movie.tagline : '') ||
    '';
  const movieTagline = typeof rawMovieTagline === 'string' ? rawMovieTagline : (rawMovieTagline?.it || rawMovieTagline?.en || String(rawMovieTagline || ''));

  const releaseYear = (movie.releaseDate || movie.release_date || '').slice(0, 4);
  const runtimeHours = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}${t('detail.hoursShort')} ${movie.runtime % 60}${t('detail.minShort')}`
    : null;
  const rating = (Number(movie.voteAverage ?? movie.vote_average) || 0).toFixed(1);
  const voteCount = movie.voteCount || movie.vote_count || 0;

  const getGenreLabel = (genre) => {
    const key = genre?.id ? GENRE_KEY_MAP[genre.id] : null;
    if (key) {
      return t(`categories.${key}`);
    }
    return genre?.name || '';
  };

  const getStatusLabel = (status) => {
    if (!status) return t('status.released');
    const s = String(status).toLowerCase();
    if (s.includes('releas') || s.includes('rilascia')) return t('status.released');
    if (s.includes('post')) return t('status.postProduction');
    if (s.includes('in prod')) return t('status.inProduction');
    if (s.includes('plan') || s.includes('pianif')) return t('status.planned');
    if (s.includes('cancel') || s.includes('cancell')) return t('status.canceled');
    return status;
  };

  // Directors and crew
  const directors = (movie.crew || []).filter((c) => c.job === 'Director' || c.department === 'Directing');
  const writers = (movie.crew || []).filter((c) => c.job === 'Screenplay' || c.department === 'Writing');

  const budgetStr = movie.budget > 0
    ? `$${(movie.budget / 1000000).toFixed(0)} ${t('detail.millions')}`
    : t('detail.notDisclosed');
  const revenueStr = movie.revenue > 0
    ? `$${(movie.revenue / 1000000).toFixed(0)} ${t('detail.millions')}`
    : t('detail.notDisclosed');

  const overviewText =
    (typeof movie.getOverview === 'function' ? movie.getOverview(langKey) : null) ||
    movie.overview?.[langKey] ||
    movie.overview?.it ||
    movie.overview?.en ||
    (typeof movie.overview === 'string' ? movie.overview : null) ||
    t('detail.overviewUnavailable');
  const shortOverview = overviewText.length > 280 ? `${overviewText.slice(0, 280)}...` : overviewText;

  return (
    <div className="film-detail-page position-relative w-100 min-vh-100 pb-5">
      {/* SFONDO DELLA PAGINA: BACKDROP CON PROPORZIONE NATURALE (16:9) E SFUMATURA CONTINUA VERSO IL BASSO */}
      <div className="film-detail-backdrop-wrapper">
        <div className="film-detail-backdrop-container">
          {backdropSrc ? (
            <img
              src={backdropSrc}
              alt=""
              className="film-detail-backdrop-image"
            />
          ) : (
            <div className="film-detail-backdrop-placeholder" />
          )}

          {/* GRADIENTE SFUMATO SOVRAPPOSTO ALL'IMMAGINE PER CONTINUITÀ */}
          <div className="film-detail-backdrop-overlay" />
        </div>

        {/* PROSIEGUO DEL GRADIENTE SOTTOSTANTE ALL'IMMAGINE: INIZIA ESATTAMENTE A #1E1E24 */}
        <div className="film-detail-backdrop-continuation" />
      </div>

      {/* CONTENUTO DELLA PAGINA SOPRA LO SFONDO */}
      <div className="position-relative z-1 w-100 px-3 px-md-4 px-xl-5 pt-3 pt-md-4">
        {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO (IN ALTO A SINISTRA) */}
        <div className="d-flex align-items-center mb-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/Cameos/films');
              }
            }}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50"
            style={{
              width: '44px',
              height: '44px',
              backdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(30, 30, 36, 0.65)'
            }}
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>

        {/* HERO INFO DEL FILM (TITOLO & TAGLINE IN BIANCO) */}
        <div className="mb-4" style={{ paddingTop: 'clamp(60px, 12vw, 180px)' }}>
          <h1
            className="display-4 fw-bold text-white mb-2"
            style={{ textShadow: '0 2px 14px rgba(0, 0, 0, 0.9)' }}
          >
            {movieTitle}
          </h1>
          {movieTagline && (
            <p
              className="fs-5 text-white fw-semibold mb-0"
              style={{ textShadow: '0 1px 8px rgba(0, 0, 0, 0.85)' }}
            >
              {movieTagline}
            </p>
          )}
        </div>

        {/* BARRA PULSANTI PREFERENZE & RECENSIONE */}
        <MediaPreferencesBar
          target={movie}
          onOpenReviewModal={() => setIsReviewModalOpen(true)}
        />

        {/* PORZIONE CENTRALE: TRAMA ESPANDIBILE, GENERI, STATISTICHE E LINGUA */}
        <section className="row g-4 mb-5">
          {/* COLONNA SINISTRA: CARD OVERVIEW CENTRATA TRA GENERI E INFO PILL */}
          <div className="col-12 col-lg-8">
            <div className="film-detail-glass-card rounded-4 p-4 shadow-sm h-100 d-flex flex-column justify-content-between">
              {/* 1. FILA GENERI (IN ALTO) */}
              <div className="d-flex flex-wrap gap-2 mb-3">
                {(movie.genres || []).map((genre) => (
                  <span
                    key={genre.id || genre.name}
                    className="film-detail-genre-pill badge"
                  >
                    {getGenreLabel(genre)}
                  </span>
                ))}
              </div>

              {/* 2. LAYOUT CENTRALE: TITOLO "OVERVIEW", TESTO E TEXT-BUTTON */}
              <div className="film-detail-overview-content my-auto">
                <h3 className="film-detail-overview-title">
                  {t('detail.synopsisTitle')}
                </h3>
                <p className="film-detail-overview-text">
                  {isOverviewExpanded ? overviewText : shortOverview}
                </p>
                {overviewText.length > 280 && (
                  <button
                    type="button"
                    onClick={() => setIsOverviewExpanded((prev) => !prev)}
                    className="film-detail-read-more-btn d-flex align-items-center gap-1"
                  >
                    <span>{isOverviewExpanded ? t('detail.showLess') : t('detail.readMore')}</span>
                    <i className={`bi bi-chevron-${isOverviewExpanded ? 'up' : 'down'}`} />
                  </button>
                )}
              </div>

              {/* 3. FILA PILL INFO FILM IN BASSO A SINISTRA (TIPO, ANNO, DURATA, VOTI) */}
              <div className="d-flex flex-wrap gap-2 align-items-center mt-3 pt-3 border-top border-white border-opacity-10">
                <span className="badge rounded-pill bg-success px-3 py-2 fw-bold text-uppercase">
                  {t('detail.moviesTab')}
                </span>
                {releaseYear && (
                  <span className="film-detail-info-pill badge">
                    {releaseYear}
                  </span>
                )}
                {runtimeHours && (
                  <span className="film-detail-info-pill badge">
                    {runtimeHours}
                  </span>
                )}
                <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold d-flex align-items-center gap-1 shadow-sm">
                  <i className="bi bi-star-fill" /> {rating} ({voteCount} {voteCount === 1 ? t('detail.voteSingle') : t('detail.votes')})
                </span>
              </div>

              {/* CAMEI RILEVATI NEL FILM */}
              {cameos.length > 0 && (
                <div className="mt-4 pt-3 border-top border-white border-opacity-10">
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-stars text-success fs-5" />
                    <h4
                      className="h6 fw-bold text-white mb-0 text-uppercase tracking-wider"
                      style={{ textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}
                    >
                      {t('detail.cameosSectionTitle')}
                    </h4>
                  </div>
                  <div className="row g-3">
                    {cameos.map((c) => (
                      <div className="col-12 col-md-6" key={c.id}>
                        <CameoCard cameo={c} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLONNA DESTRA: STATISTICHE FILM, ANNO E LINGUA PRINCIPALE */}
          <div className="col-12 col-lg-4">
            <div className="film-detail-glass-card rounded-4 p-4 shadow-sm text-white h-100">
              <div className="d-flex gap-3 align-items-center mb-3">
                <div
                  className="rounded-3 overflow-hidden bg-dark shadow-sm flex-shrink-0"
                  style={{
                    width: '60px',
                    height: '90px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <img src={posterSrc} alt={movieTitle} className="w-100 h-100 object-fit-cover" />
                </div>
                <div>
                  <h3
                    className="h6 fw-bold text-white mb-1 d-flex align-items-center gap-2"
                    style={{ textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)' }}
                  >
                    <i className="bi bi-bar-chart-fill text-success" /> {t('detail.statsAndDetails')}
                  </h3>
                  <small
                    className="fw-medium"
                    style={{ color: '#94A3B8', textShadow: '0 1px 2px rgba(0, 0, 0, 0.6)' }}
                  >
                    {t('detail.technicalSheet')}
                  </small>
                </div>
              </div>

              <ul className="list-unstyled mb-0 d-flex flex-column gap-3 small">
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.originalTitle')}</span>
                  <span
                    className="fw-bold text-end text-truncate text-white"
                    style={{ maxWidth: '180px', textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
                  >
                    {movie.originalTitle || movie.original_title || movieTitle}
                  </span>
                </li>
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.releaseDate')}</span>
                  <span
                    className="fw-bold text-white"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
                  >
                    {releaseYear || t('common.notAvailable')}
                  </span>
                </li>
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.runtime')}</span>
                  <span
                    className="fw-bold text-white"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
                  >
                    {runtimeHours || t('common.notAvailable')}
                  </span>
                </li>
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.originalLanguage')}</span>
                  <span
                    className="badge px-2 py-1 text-uppercase fw-bold"
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#FBBF24',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      letterSpacing: '0.5px'
                    }}
                  >
                    {movie.originalLanguage || movie.original_language || 'IT'}
                  </span>
                </li>
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.budget')}</span>
                  <span
                    className="fw-bold text-white"
                    style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)' }}
                  >
                    {budgetStr}
                  </span>
                </li>
                <li className="d-flex justify-content-between border-bottom border-white border-opacity-10 pb-2">
                  <span style={{ color: '#94A3B8' }}>{t('detail.revenue')}</span>
                  <span
                    className="fw-bold"
                    style={{ color: '#25E285', textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)' }}
                  >
                    {revenueStr}
                  </span>
                </li>
                <li className="d-flex justify-content-between align-items-center">
                  <span style={{ color: '#94A3B8' }}>{t('detail.status')}</span>
                  <span
                    className="badge rounded-pill fw-bold px-3 py-1 shadow-sm"
                    style={{
                      backgroundColor: 'rgba(25, 135, 84, 0.85)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(25, 135, 84, 0.5)'
                    }}
                  >
                    {getStatusLabel(movie.status)}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* PORZIONE INFERIORE: CAROUSEL ATTORI & REGIA */}
        <CastCarousel cast={movie.cast || []} title={t('cast.title')} />

        {/* REGIA & SCENEGGIATURA: DUE LISTE ORIZZONTALI DI NOMI */}
        {(directors.length > 0 || writers.length > 0) && (
          <section className="film-detail-glass-card rounded-4 p-4 mb-5">
            <h3 className="h5 text-white fw-bold mb-3 d-flex align-items-center gap-2">
              <i className="bi bi-camera-reels text-success" />
              {t('detail.directorsAndWriters')}
            </h3>

            <div className="d-flex flex-column gap-3">
              {directors.length > 0 && (
                <div className="film-detail-credit-row">
                  <span className="film-detail-credit-label text-success-emphasis">
                    {directors.length > 1 ? t('detail.directors') : t('detail.director')}:
                  </span>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {directors.map((d, idx) => (
                      <span
                        key={d.credit_id || d.id || idx}
                        className="film-detail-credit-badge"
                      >
                        {d.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {writers.length > 0 && (
                <div className={`film-detail-credit-row ${directors.length > 0 ? 'pt-3 border-top border-white border-opacity-10' : ''}`}>
                  <span className="film-detail-credit-label text-info-emphasis">
                    {writers.length > 1 ? t('detail.writers') : t('detail.writer')}:
                  </span>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {writers.map((w, idx) => (
                      <span
                        key={w.credit_id || w.id || idx}
                        className="film-detail-credit-badge"
                      >
                        {w.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SEZIONE: RECENSIONI UTENTI SCROLLABILI & FORM */}
        <ReviewSection
          initialReviews={reviews}
          targetKey={`movie:${movie.id}`}
          isModalOpen={isReviewModalOpen}
          onCloseModal={() => setIsReviewModalOpen(false)}
          title={`${t('reviews.sectionTitle')} - ${movieTitle}`}
        />
      </div>
    </div>
  );
}
