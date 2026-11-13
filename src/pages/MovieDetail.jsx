import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import CameoCarousel from '../components/cameo/CameoCarousel.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import MediaProvidersSection from '../components/media/MediaProvidersSection.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import CrewCredits from '../components/media/CrewCredits.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { getReviewsForTarget } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/text.css';
import '../css/common/carouselControls.css';
import '../css/common/mediaDetailPage.css';

export default function MovieDetail() {
  const { id } = useParams();
  const { t, langKey, normalizedLang } = useTranslation();
  const { isMobile } = useDevice();
  const movieViewModel = useMovieViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang });

  const { selectedMovie, isMovieLoading, loadMovieDetails } = movieViewModel;
  const { loadMovieCameos } = cameoViewModel;
  const loading = isMovieLoading(id);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      void loadMovieDetails(id, true, normalizedLang);
      void loadMovieCameos(id, 8, normalizedLang);
    }
  }, [id, normalizedLang, loadMovieDetails, loadMovieCameos]);

  const movie = useMemo(() => {
    if (selectedMovie && String(selectedMovie.id) === String(id)) {
      return selectedMovie;
    }
    return null;
  }, [id, selectedMovie]);

  const cameos = useMemo(() => {
    const cameoMovieId = cameoViewModel.movieCameos?.movie?.id;
    if (cameoViewModel.movieCameos?.cameos && cameoMovieId != null && String(cameoMovieId) === String(id)) {
      return cameoViewModel.movieCameos.cameos;
    }
    return [];
  }, [id, cameoViewModel.movieCameos]);

  const reviews = useMemo(() => {
    return movie ? getReviewsForTarget(`movie:${movie.id}`) : [];
  }, [movie]);

  const movieId = movie ? String(movie.id) : null;
  const backdropSrc = movie?.getBackdropUrl(langKey)?.replace('/w780/', '/w1280/');
  const isImageReady = useMovieImagesReady(movieId, backdropSrc);
  const isPageReady = Boolean(movie && movieId === String(id) && isImageReady && !loading);

  useScrollToTop(id, isPageReady);

  const goBack = useGoBack('/Cameos/movies');

  if (!loading && !movie) {
    return (
      <div
        className="w-100 min-vh-100 d-flex flex-column position-relative film-detail-empty"
      >
        <div className="px-3 px-md-4 px-xl-5 pt-2 pt-md-3">
          <button
            type="button"
            onClick={goBack}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn"
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white" />
          </button>
        </div>

        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 pb-5">
          <i className="bi bi-film text-secondary fs-1 mb-3 opacity-50" />
          <h2 className="fw-bold mb-2 text-white">{t('detail.movieNotFound')}</h2>
          <p className="text-secondary mb-4">{t('common.noResults')}</p>
          <button
            type="button"
            onClick={goBack}
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
      {/* SFONDO DELLA PAGINA: BACKDROP CON TRANSIZIONE SFUMATA MORBIDA */}
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

          {/* GRADIENTE SFUMATO SOVRAPPOSTO ALL'IMMAGINE PER TRANSIZIONE MORBIDA */}
          <div className="film-detail-backdrop-overlay" />
        </div>
      </div>

      {/* CONTENUTO DELLA PAGINA SOPRA LO SFONDO */}
      <div className="position-relative z-1 w-100 carousel-page-padding carousel-page-padding-compact pt-2 pt-md-3">
        <div className="film-detail-top-content">
          {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO (IN ALTO A SINISTRA) */}
          <div className="d-flex align-items-center mb-2 mb-md-3">
            <button
              type="button"
              onClick={goBack}
              className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center border border-secondary border-opacity-50 shadow-lg back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" />
            </button>
          </div>

          {/* HERO INFO DEL FILM (TITOLO & TAGLINE IN BIANCO) */}
          <div className="mb-2 mb-md-5 film-detail-heading">
            <h1 className="fw-bold text-white mb-2 film-detail-title">
              {movieTitle}
            </h1>
            {movieTagline && (
              <p className="text-white fw-semibold mb-4 film-detail-tagline">
                {movieTagline}
              </p>
            )}
          </div>

          <section className="row g-3 g-md-4 mb-3 mb-md-4 align-items-start film-detail-info-section">
            <div className="col-12 col-lg-8">

              <div className={isMobile ? 'mb-1' : 'mb-3'}>
                <MediaOverview key={movie.id} media={movie} type="movie" />
              </div>

              {!isMobile && (
                <div className="mb-3">
                  <MediaProvidersSection media={movie} />
                </div>
              )}

              {/* BARRA PULSANTI PREFERENZE */}
              <MediaPreferencesBar
                target={movie}
                actionRight={
                  isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsProvidersModalOpen(true)}
                      className="media-pref-platforms-btn"
                      aria-label={t('detail.platforms')}
                    >
                      <i className="bi bi-tv text-success" />
                      <span>{t('detail.platforms')}</span>
                    </button>
                  )
                }
              />
            </div>
            <div className="col-12 col-lg-4">
              <MediaDetail media={movie} type="movie" />
            </div>
          </section>
        </div>

        {/* MODALE PIATTAFORME PER MOBILE */}
        {isMobile && (
          <MediaProvidersSection
            media={movie}
            isModal
            isOpen={isProvidersModalOpen}
            onClose={() => setIsProvidersModalOpen(false)}
          />
        )}

        {/* PORZIONE INFERIORE: CAROUSEL ATTORI & REGIA */}
        <CastCarousel cast={movie.cast || []} title={t('cast.title')} />

        {/* REGIA & SCENEGGIATURA: DUE LISTE ORIZZONTALI DI NOMI */}
        <CrewCredits directors={directors} writers={writers} className="mb-4 mb-md-5" />

        {/* CAROUSEL CAMEO */}
        <CameoCarousel cameos={cameos} title={t('cameos.title')} />

        {/* SEZIONE: RECENSIONI UTENTI SCROLLABILI & FORM */}
        <ReviewSection
          initialReviews={reviews}
          targetKey={`movie:${movie.id}`}
          isModalOpen={isReviewModalOpen}
          onCloseModal={() => setIsReviewModalOpen(false)}
          title={isMobile ? t('reviews.sectionTitle') : `${t('reviews.sectionTitle')} - ${movieTitle}`}
        />
      </div>
    </div>
  );
}
