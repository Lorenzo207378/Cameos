import { useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import CameoCarousel from '../components/cameo/CameoCarousel.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { Episode } from '../models/Episode.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { useSeriesViewModel } from '../viewmodel/index.js';
import '../css/common/text.css';
import '../css/common/carouselControls.css';
import '../css/common/mediaDetailPage.css';

export default function TVSeriesEpisodeDetail() {
  const { id, seasonNumber, episodeNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, langKey } = useTranslation();

  const { selectedEpisode, loading, loadEpisodeDetails } = useSeriesViewModel();

  const passedEpisode = useMemo(() => {
    const raw = location.state?.episode;
    if (!raw) return null;
    const ep = raw instanceof Episode ? raw : new Episode(raw);
    if (
      String(ep.seriesId) === String(id) &&
      Number(ep.seasonNumber) === Number(seasonNumber) &&
      Number(ep.episodeNumber) === Number(episodeNumber)
    ) {
      return ep;
    }
    return null;
  }, [location.state, id, seasonNumber, episodeNumber]);

  useEffect(() => {
    if (!passedEpisode && id && seasonNumber !== undefined && episodeNumber !== undefined) {
      void loadEpisodeDetails(id, seasonNumber, episodeNumber, true);
    }
  }, [passedEpisode, id, seasonNumber, episodeNumber, loadEpisodeDetails]);

  const episode = useMemo(() => {
    if (passedEpisode) return passedEpisode;
    if (
      selectedEpisode &&
      String(selectedEpisode.seriesId) === String(id) &&
      Number(selectedEpisode.seasonNumber) === Number(seasonNumber) &&
      Number(selectedEpisode.episodeNumber) === Number(episodeNumber)
    ) {
      return selectedEpisode;
    }
    return null;
  }, [passedEpisode, selectedEpisode, id, seasonNumber, episodeNumber]);

  const episodeId = episode ? String(episode.id) : null;
  const backdropSrc = episode?.getStillUrl(langKey, 'w1280');
  const isImageReady = useMovieImagesReady(episodeId, backdropSrc);
  const isEpisodeReady = Boolean(episode && isImageReady);

  const handleGoBack = () => {
    navigate(window.history.state?.idx > 0 ? -1 : `/Cameos/series/${id}`);
  };

  if (!episode && loading) {
    return <LoadingScreen />;
  }

  if (!loading && !episode) {
    return (
      <div className="w-100 min-vh-100 d-flex flex-column position-relative film-detail-empty">
        <div className="px-3 px-md-4 px-xl-5 pt-2 pt-md-3">
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
          <i className="bi bi-tv text-secondary fs-1 mb-3 opacity-50" />
          <h2 className="fw-bold mb-2 text-white">{t('detail.episodeNotFound')}</h2>
          <p className="text-secondary mb-4">{t('common.noResults')}</p>
          <button
            type="button"
            onClick={handleGoBack}
            className="btn btn-outline-success rounded-pill px-4 py-2 fw-semibold"
          >
            {t('detail.goBack')}
          </button>
        </div>
      </div>
    );
  }

  if (!isEpisodeReady) {
    return <LoadingScreen />;
  }

  const episodeTitle = episode.getName(langKey);
  const cast = episode.cast || [];
  const cameos = episode.cameos || [];

  return (
    <div className="film-detail-page episode-detail-page position-relative w-100 min-vh-100 pb-5">
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
        {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO (IN ALTO A SINISTRA) */}
        <div className="d-flex align-items-center mb-2 mb-md-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center border border-secondary border-opacity-50 shadow-lg back-btn flex-shrink-0"
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>

        {/* HERO INFO DELL'EPISODIO (TITOLO IN BIANCO) */}
        <div className="mb-2 mb-md-5 film-detail-heading">
          <h1 className="fw-bold text-white mb-2 film-detail-title">
            {episodeTitle}
          </h1>
        </div>

        {/* SEZIONE INFORMAZIONI PRINCIPALI (OVERVIEW E DETTAGLIO) */}
        <section className="row g-3 g-md-4 mb-4 mb-md-5 align-items-start film-detail-info-section">
          <div className="col-12 col-lg-8">
            <MediaOverview key={episode.id} media={episode} type="episode" />
          </div>
          <div className="col-12 col-lg-4">
            <MediaDetail media={episode} type="episode" />
          </div>
        </section>

        {/* CAROUSEL ATTORI */}
        <CastCarousel cast={cast} title={t('cast.titleSimple')} />

        {/* CAROUSEL CAMEO */}
        <CameoCarousel cameos={cameos} title={t('cameos.title')} cardVariant="episode-detail" />
      </div>
    </div>
  );
}
