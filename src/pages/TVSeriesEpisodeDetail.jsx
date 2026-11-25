import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import CameoCarousel from '../components/cameo/CameoCarousel.jsx';
import CrewCredits from '../components/media/CrewCredits.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import MediaTrailerCard from '../components/media/MediaTrailerCard.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import { DetailBackdrop, DetailNotFound } from '../components/media/MediaDetailLayout.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { useSeriesViewModel } from '../viewmodel/index.js';
import '../css/common/text.css';
import '../css/common/carouselControls.css';
import '../css/common/mediaDetailPage.css';

export default function TVSeriesEpisodeDetail() {
  const { id, seasonNumber, episodeNumber } = useParams();
  // Reset local reveal state cleanly whenever route parameters change.
  return (
    <TVSeriesEpisodeDetailContent
      key={`${id ?? ''}:${seasonNumber ?? ''}:${episodeNumber ?? ''}`}
      id={id}
      seasonNumber={seasonNumber}
      episodeNumber={episodeNumber}
    />
  );
}

/**
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string} [props.seasonNumber]
 * @param {string} [props.episodeNumber]
 */
function TVSeriesEpisodeDetailContent({ id = undefined, seasonNumber = undefined, episodeNumber = undefined }) {
  const { t, langKey, normalizedLang } = useTranslation();
  const { isMobile } = useDevice();

  const {
    requestedEpisode,
    isEpisodeLoading,
    loadEpisodeDetails,
    getEpisodeForRoute
  } = useSeriesViewModel({ language: normalizedLang });
  const loading = isEpisodeLoading(id, seasonNumber, episodeNumber);

  const routeKey = `${id ?? ''}:${seasonNumber ?? ''}:${episodeNumber ?? ''}`;
  const [revealedEpisodeKey, setRevealedEpisodeKey] = useState(/** @type {string|null} */ (null));

  const fetchEpisodeData = useEffectEvent((targetId, targetSeason, targetEpisode) => {
    // Route state can contain partial season data. Let the repository resolve full details or its cache.
    void loadEpisodeDetails({
      seriesId: targetId,
      seasonNumber: targetSeason,
      episodeNumber: targetEpisode,
      appendCredits: true,
      language: normalizedLang
    });
  });

  useEffect(() => {
    if (id && seasonNumber !== undefined && episodeNumber !== undefined) {
      fetchEpisodeData(id, seasonNumber, episodeNumber);
    }
  }, [id, seasonNumber, episodeNumber]);

  const handleRetryEpisode = useCallback(() => {
    if (!id || seasonNumber === undefined || episodeNumber === undefined) return;
    void loadEpisodeDetails({
      seriesId: id,
      seasonNumber,
      episodeNumber,
      appendCredits: true,
      language: normalizedLang,
      force: true
    });
  }, [id, seasonNumber, episodeNumber, normalizedLang, loadEpisodeDetails]);

  const episode = getEpisodeForRoute(id, seasonNumber, episodeNumber);
  const episodeError =
    requestedEpisode
    && String(requestedEpisode.seriesId) === String(id)
    && Number(requestedEpisode.seasonNumber) === Number(seasonNumber)
    && Number(requestedEpisode.episodeNumber) === Number(episodeNumber)
      ? requestedEpisode.error
      : null;

  const episodeId = episode ? String(episode.id) : null;
  const backdropSrc = episode?.getStillUrl(langKey, 'w1280');
  const isImageReady = useMovieImagesReady(episodeId, backdropSrc);
  const isReadyNow = Boolean(episode && isImageReady && !loading);
  if (isReadyNow && revealedEpisodeKey !== routeKey) {
    setRevealedEpisodeKey(routeKey);
  }
  const isPageReady = isReadyNow || Boolean(episode && revealedEpisodeKey === routeKey);

  useScrollToTop(routeKey, isPageReady);

  const goBack = useGoBack(id ? APP_ROUTES.seriesOf(id) : APP_ROUTES.series);

  if (!loading && !episode) {
    return (
      <DetailNotFound
        icon="bi-tv"
        title={episodeError ? t('common.error') : t('detail.episodeNotFound')}
        onBack={goBack}
        onRetry={episodeError ? handleRetryEpisode : undefined}
      />
    );
  }

  if (!isPageReady || !episode) {
    return <LoadingScreen />;
  }

  const episodeTitle = episode.getName(langKey);
  const cast = episode.cast || [];
  const cameos = episode.cameos || [];
  const directors = episode.getDirectors();
  const writers = episode.getWriters();

  return (
    <div className="film-detail-page episode-detail-page position-relative w-100 min-vh-100 pb-5">
      <DetailBackdrop src={backdropSrc} />

      {/* CONTENUTO DELLA PAGINA SOPRA LO SFONDO */}
      <div className="position-relative z-1 w-100 carousel-page-padding carousel-page-padding-compact pt-2 pt-md-3">
        <div className="film-detail-top-content">
          {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO (IN ALTO A SINISTRA) + TRAILER (IN ALTO A DESTRA) */}
          <div className="film-detail-top-bar d-flex align-items-start justify-content-between mb-2 mb-md-3 position-relative">
            <button
              type="button"
              onClick={goBack}
              className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center border border-secondary border-opacity-50 shadow-lg back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" aria-hidden="true" />
            </button>
            <MediaTrailerCard media={episode} />
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
              <div className={isMobile ? 'mb-1' : 'mb-3'}>
                <MediaOverview media={episode} type="episode" />
              </div>
              <MediaPreferencesBar target={episode} />
            </div>
            <div className="col-12 col-lg-4">
              <MediaDetail media={episode} type="episode" />
            </div>
          </section>
        </div>

        {/* CAROUSEL ATTORI */}
        <CastCarousel cast={cast} title={t('cast.titleSimple')} />

        {/* REGIA & SCENEGGIATURA */}
        <CrewCredits directors={directors} writers={writers} className="mb-4 mb-md-5" />

        {/* CAROUSEL CAMEO */}
        <CameoCarousel cameos={cameos} title={t('cameos.title')} />
      </div>
    </div>
  );
}

TVSeriesEpisodeDetailContent.propTypes = {
  id: PropTypes.string,
  seasonNumber: PropTypes.string,
  episodeNumber: PropTypes.string
};
