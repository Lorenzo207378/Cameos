import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useEffectEvent, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import CameoCarousel from '../components/cameo/CameoCarousel.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import MediaProvidersSection from '../components/media/MediaProvidersSection.jsx';
import MediaTrailerCard from '../components/media/MediaTrailerCard.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import { DetailBackdrop, DetailNotFound } from '../components/media/MediaDetailLayout.jsx';
import CrewCredits from '../components/media/CrewCredits.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import TVSeasonsSection from '../components/tv/TVSeasonsSection.jsx';
import { getReviewsForTarget } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { parseSeasonParam } from '../utils/formatters.js';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/text.css';
import '../css/common/carouselControls.css';
import '../css/common/mediaDetailPage.css';

export default function TVSeriesDetail() {
  const { id, seasonNumber } = useParams();
  const [searchParams] = useSearchParams();
  const rawSeasonParam = seasonNumber ?? searchParams.get('season');
  // Reset season/modal state cleanly whenever the series or initial season param changes.
  return <TVSeriesDetailContent key={`${id}:${rawSeasonParam ?? ''}`} id={id} seasonParam={rawSeasonParam} />;
}

/**
 * @param {Object} props
 * @param {string} [props.id]
 * @param {string|null} [props.seasonParam=null]
 */
function TVSeriesDetailContent({ id = undefined, seasonParam = null }) {
  const { t, langKey, normalizedLang } = useTranslation();
  const { isMobile } = useDevice();

  const seriesViewModel = useSeriesViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang });

  const {
    selectedSeries,
    selectedSeason,
    requestedSeason,
    seriesError,
    isSeriesLoading,
    isSeasonLoading,
    loadSeriesDetails,
    loadSeasonDetails
  } = seriesViewModel;
  const { extractSeriesVipCameos } = cameoViewModel;
  const loading = isSeriesLoading(id);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(() => parseSeasonParam(seasonParam));
  const [revealedSeriesId, setRevealedSeriesId] = useState(/** @type {string|null} */ (null));

  const fetchSeriesData = useEffectEvent((targetId) => {
    void loadSeriesDetails({ seriesId: targetId, appendAggregateCredits: true, language: normalizedLang });
  });

  useEffect(() => {
    if (id) {
      fetchSeriesData(id);
    }
  }, [id]);

  const series = selectedSeries && String(selectedSeries.id) === String(id) ? selectedSeries : null;

  const totalSeasons = series ? Math.max(1, Number(series.numberOfSeasons) || 1) : null;
  const activeSeasonNumber = totalSeasons && selectedSeasonNumber > totalSeasons ? 1 : selectedSeasonNumber;
  // Delay season > 1 fetch until series metadata confirms the requested season is within totalSeasons.
  const canFetchSeason = Boolean(id && (series || activeSeasonNumber === 1));

  const fetchSeasonData = useEffectEvent((targetId, targetSeasonNumber) => {
    void loadSeasonDetails({
      seriesId: targetId,
      seasonNumber: targetSeasonNumber,
      appendAggregateCredits: true,
      language: normalizedLang
    });
  });

  useEffect(() => {
    if (canFetchSeason && id) {
      fetchSeasonData(id, activeSeasonNumber);
    }
  }, [canFetchSeason, id, activeSeasonNumber]);

  const handleRetrySeries = useCallback(() => {
    if (!id) return;
    void loadSeriesDetails({ seriesId: id, appendAggregateCredits: true, language: normalizedLang, force: true });
    if (canFetchSeason) {
      void loadSeasonDetails({
        seriesId: id,
        seasonNumber: activeSeasonNumber,
        appendAggregateCredits: true,
        language: normalizedLang,
        force: true
      });
    }
  }, [id, canFetchSeason, activeSeasonNumber, normalizedLang, loadSeriesDetails, loadSeasonDetails]);

  const handleRetrySeason = useCallback(() => {
    if (!id) return;
    void loadSeasonDetails({
      seriesId: id,
      seasonNumber: activeSeasonNumber,
      appendAggregateCredits: true,
      language: normalizedLang,
      force: true
    });
  }, [id, activeSeasonNumber, normalizedLang, loadSeasonDetails]);

  const cameos = useMemo(() => {
    if (!series) return [];
    if (series.vipCameos?.length) return series.vipCameos;
    return extractSeriesVipCameos(series, { maxEpisodes: 2, minPopularity: 10, language: normalizedLang });
  }, [series, normalizedLang, extractSeriesVipCameos]);

  const reviews = useMemo(() => {
    return series ? getReviewsForTarget(`tv:${series.id}`) : [];
  }, [series]);

  const isLoadingSeason = isSeasonLoading(id, activeSeasonNumber);

  const currentSeason = useMemo(() => {
    const targetNum = Number(activeSeasonNumber);
    if (selectedSeason && String(selectedSeason.seriesId) === String(id)) {
      if (Number(selectedSeason.seasonNumber) === targetNum || isLoadingSeason) {
        return selectedSeason;
      }
    }
    const foundInSeries = series?.seasons?.find((s) => Number(s.seasonNumber) === targetNum);
    if (foundInSeries?.episodes?.length) {
      return foundInSeries;
    }
    return null;
  }, [id, selectedSeason, activeSeasonNumber, series, isLoadingSeason]);

  const resolvedSeriesId = series?.id ?? null;
  const seasonWatchlistTarget = useMemo(() => {
    if (!resolvedSeriesId) return null;
    if (currentSeason && Number(currentSeason.seasonNumber) === Number(activeSeasonNumber)) {
      return currentSeason;
    }
    return {
      mediaType: 'season',
      seriesId: resolvedSeriesId,
      seasonNumber: activeSeasonNumber
    };
  }, [resolvedSeriesId, currentSeason, activeSeasonNumber]);

  const seriesId = series ? String(series.id) : null;
  const backdropSrc = series?.getBackdropUrl(langKey, 'w1280');
  const isImageReady = useMovieImagesReady(seriesId, backdropSrc);
  const isReadyNow = Boolean(series && seriesId === String(id) && isImageReady && !loading);
  if (isReadyNow && revealedSeriesId !== seriesId) {
    setRevealedSeriesId(seriesId);
  }
  const isPageReady = isReadyNow || Boolean(series && seriesId === String(id) && revealedSeriesId === seriesId);

  useScrollToTop(id, isPageReady);

  const goBack = useGoBack(APP_ROUTES.series);

  if (!loading && !series) {
    return (
      <DetailNotFound
        icon="bi-tv"
        title={seriesError ? t('common.error') : t('detail.seriesNotFound')}
        onBack={goBack}
        onRetry={seriesError ? handleRetrySeries : undefined}
      />
    );
  }

  if (!isPageReady || !series) {
    return <LoadingScreen />;
  }

  const seriesTitle = series.getName(langKey);
  const seriesTagline = series.getTagline(langKey);
  const creators = series.createdBy || [];
  const directors = series.getDirectors();
  const writers = series.getWriters();

  return (
    <div className="film-detail-page tv-series-detail-page position-relative w-100 min-vh-100 pb-5">
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
            <MediaTrailerCard media={series} />
          </div>

          {/* HERO INFO DELLA SERIE (TITOLO & TAGLINE IN BIANCO) */}
          <div className="mb-2 mb-md-5 film-detail-heading">
            <h1 className="fw-bold text-white mb-2 film-detail-title">
              {seriesTitle}
            </h1>
            {seriesTagline && (
              <p className="text-white fw-semibold mb-4 film-detail-tagline">
                {seriesTagline}
              </p>
            )}
          </div>

          {/* SEZIONE INFORMAZIONI PRINCIPALI (OVERVIEW, PREFERENZE, DETTAGLIO) */}
          <section className="row g-3 g-md-4 mb-3 mb-md-4 align-items-start film-detail-info-section">
            <div className="col-12 col-lg-8">
              <div className={isMobile ? 'mb-1' : 'mb-3'}>
                <MediaOverview media={series} type="tv" />
              </div>

              {!isMobile && (
                <div className="mb-3">
                  <MediaProvidersSection media={series} />
                </div>
              )}

              {/* BARRA PULSANTI PREFERENZE */}
              <MediaPreferencesBar
                target={series}
                watchlistTarget={seasonWatchlistTarget}
                actionRight={
                  isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsProvidersModalOpen(true)}
                      className="media-pref-platforms-btn"
                      aria-label={t('detail.platforms')}
                    >
                      <i className="bi bi-tv text-success" aria-hidden="true" />
                      <span>{t('detail.platforms')}</span>
                    </button>
                  )
                }
              />
            </div>
            <div className="col-12 col-lg-4">
              <MediaDetail media={series} type="tv" />
            </div>
          </section>
        </div>

        {/* MODALE PIATTAFORME PER MOBILE */}
        {isMobile && (
          <MediaProvidersSection
            media={series}
            isModal
            isOpen={isProvidersModalOpen}
            onClose={() => setIsProvidersModalOpen(false)}
          />
        )}

        {/* SEZIONE: GUIDA STAGIONI ED EPISODI (ESTRATTA IN COMPONENTE DEDICATO) */}
        <TVSeasonsSection
          series={series}
          selectedSeasonNumber={activeSeasonNumber}
          onSelectSeason={setSelectedSeasonNumber}
          currentSeason={currentSeason}
          isLoadingEpisodes={isLoadingSeason}
          failed={Boolean(
            requestedSeason?.error
            && String(requestedSeason.seriesId) === String(id)
            && Number(requestedSeason.seasonNumber) === Number(activeSeasonNumber)
          )}
          onRetry={handleRetrySeason}
          className="mb-5"
        />

        {/* PORZIONE INFERIORE: CAROUSEL ATTORI */}
        <CastCarousel cast={series.cast || []} title={t('cast.title')} />

        {/* CREATORI / REGIA */}
        <CrewCredits directors={directors} writers={writers} creators={creators} className="mb-4 mb-md-5" />

        {/* CAROUSEL CAMEO */}
        <CameoCarousel cameos={cameos} title={t('cameos.title')} />

        {/* SEZIONE: RECENSIONI UTENTI SCROLLABILI & FORM */}
        <ReviewSection
          initialReviews={reviews}
          targetKey={`tv:${series.id}`}
          isModalOpen={isReviewModalOpen}
          onCloseModal={() => setIsReviewModalOpen(false)}
          title={isMobile ? t('reviews.sectionTitle') : `${t('reviews.sectionTitle')} - ${seriesTitle}`}
        />
      </div>
    </div>
  );
}

TVSeriesDetailContent.propTypes = {
  id: PropTypes.string,
  seasonParam: PropTypes.string
};
