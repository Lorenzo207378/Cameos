import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import CrewCredits from '../components/media/CrewCredits.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { getMovieById, getCameosForMedia, getReviewsForTarget } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { useMovieViewModel } from '../viewmodel/index.js';
import '../css/movies/movieDetail.css';

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, langKey } = useTranslation();
  const { selectedMovie, loading, loadMovieDetails } = useMovieViewModel();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadMovieDetails(id, true);
    }
  }, [id, loadMovieDetails]);

  // Both the ViewModel and the local catalog provide normalized Movie models.
  const movie = useMemo(() => {
    if (selectedMovie && String(selectedMovie.id) === String(id)) {
      return selectedMovie;
    }
    return getMovieById(id);
  }, [id, selectedMovie]);

  const cameos = useMemo(() => {
    return movie ? getCameosForMedia('movie', movie.id) : [];
  }, [movie]);

  const reviews = useMemo(() => {
    return movie ? getReviewsForTarget(`movie:${movie.id}`) : [];
  }, [movie]);

  const movieId = movie ? String(movie.id) : null;
  const backdropSrc = movie?.getBackdropUrl(langKey).replace('/w780/', '/w1280/');
  const posterSrc = movie?.getPosterUrl(langKey);
  const isImageReady = useMovieImagesReady(movieId, backdropSrc, posterSrc);
  const isPageReady = movieId === String(id) && isImageReady && !loading;

  const handleGoBack = () => {
    navigate(window.history.state?.idx > 0 ? -1 : '/Cameos/films');
  };

  if (!loading && !movie) {
    return (
      <div
        className="w-100 min-vh-100 d-flex flex-column position-relative film-detail-empty"
      >
        <div className="px-3 px-md-4 px-xl-5 pt-3 pt-md-4">
          <button
            type="button"
            onClick={handleGoBack}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn"
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

  const movieTitle = movie.getTitle(langKey);
  const movieTagline = movie.getTagline(langKey);

  const directors = movie.getDirectors();
  const writers = movie.getWriters();

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
            onClick={handleGoBack}
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25 back-btn"
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>

        {/* HERO INFO DEL FILM (TITOLO & TAGLINE IN BIANCO) */}
        <div className="mb-4 film-detail-heading">
          <h1
            className="display-4 fw-bold text-white mb-2 film-detail-title"
          >
            {movieTitle}
          </h1>
          {movieTagline && (
            <p
              className="fs-5 text-white fw-semibold mb-0 film-detail-tagline"
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

        <section className="row g-4 mb-5 align-items-start">
          <div className="col-12 col-lg-8">
            <MediaOverview key={movie.id} media={movie} type="movie" cameos={cameos} />
          </div>
          <div className="col-12 col-lg-4">
            <MediaDetail media={movie} type="movie" />
          </div>
        </section>

        {/* PORZIONE INFERIORE: CAROUSEL ATTORI & REGIA */}
        <CastCarousel cast={movie.cast || []} title={t('cast.title')} />

        {/* REGIA & SCENEGGIATURA: DUE LISTE ORIZZONTALI DI NOMI */}
        <CrewCredits directors={directors} writers={writers} />

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
