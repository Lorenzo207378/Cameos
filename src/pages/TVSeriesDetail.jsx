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
import TVSeasonsSection from '../components/tv/TVSeasonsSection.jsx';
import { getReviewsForTarget } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useMovieImagesReady } from '../utils/imageUtils.js';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/text.css';
import '../css/common/carouselControls.css';
import '../css/common/mediaDetailPage.css';

export default function TVSeriesDetail() {
  const { id } = useParams();
  // Reset season/modal state cleanly whenever the series route changes.
  return <TVSeriesDetailContent key={id} id={id} />;
}

function TVSeriesDetailContent({ id }) {
  const { t, langKey, normalizedLang } = useTranslation();
  const { isMobile } = useDevice();

  const seriesViewModel = useSeriesViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang });

  const { selectedSeries, selectedSeason, requestedSeason, isSeriesLoading, isSeasonLoading,
    loadSeriesDetails, loadSeasonDetails, loadEpisodeDetails } = seriesViewModel;
  const { loadSeriesVipCameos } = cameoViewModel;
  const loading = isSeriesLoading(id);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);

  useEffect(() => {
    if (id) {
      void loadSeriesDetails(id, true, normalizedLang);
      void loadSeriesVipCameos(id, 2, 10, normalizedLang);
    }
  }, [id, normalizedLang, loadSeriesDetails, loadSeriesVipCameos]);

  useEffect(() => {
    if (id && selectedSeasonNumber) {
      void loadSeasonDetails(id, selectedSeasonNumber, true, normalizedLang);
    }
  }, [id, selectedSeasonNumber, normalizedLang, loadSeasonDetails]);

  const series = useMemo(() => {
    if (selectedSeries && String(selectedSeries.id) === String(id)) {
      return selectedSeries;
    }
    return null;
  }, [id, selectedSeries]);

  const cameos = useMemo(() => {
    if (series?.vipCameos?.length) return series.vipCameos;
    if (cameoViewModel.seriesVipCameos?.length) return cameoViewModel.seriesVipCameos;
    return [];
  }, [series, cameoViewModel.seriesVipCameos]);

  const reviews = useMemo(() => {
    return series ? getReviewsForTarget(`tv:${series.id}`) : [];
  }, [series]);

  const currentSeason = useMemo(() => {
    const targetNum = Number(selectedSeasonNumber);
    if (selectedSeason && String(selectedSeason.seriesId) === String(id) && Number(selectedSeason.seasonNumber) === targetNum) {
      return selectedSeason;
    }
    const foundInSeries = series?.seasons?.find((s) => Number(s.seasonNumber) === targetNum);
    if (foundInSeries?.episodes?.length) {
      return foundInSeries;
    }
    return null;
  }, [id, selectedSeason, selectedSeasonNumber, series]);

  const seriesId = series ? String(series.id) : null;
  const backdropSrc = series?.getBackdropUrl(langKey)?.replace('/w780/', '/w1280/');
  const isImageReady = useMovieImagesReady(seriesId, backdropSrc);
  const isSeriesReady = Boolean(series && seriesId === String(id) && isImageReady);

  useScrollToTop(id, isSeriesReady);

  const goBack = useGoBack('/Cameos/series');

  if (!series && loading) {
    return <LoadingScreen />;
  }

  if (!loading && !series) {
    return (
      <div className="w-100 min-vh-100 d-flex flex-column position-relative film-detail-empty">
        <div className="px-3 px-md-4 px-xl-5 pt-2 pt-md-3">
          <button
            type="button"
            onClick={goBack}
            className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn"
            aria-label={t('detail.goBack')}
            title={t('detail.goBack')}
          >
            <i className="bi bi-arrow-left text-white fs-5" />
          </button>
        </div>

        <div className="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center p-4 pb-5">
          <i className="bi bi-tv text-secondary fs-1 mb-3 opacity-50" />
          <h2 className="fw-bold mb-2 text-white">{t('detail.seriesNotFound')}</h2>
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

  if (!isSeriesReady) {
    return <LoadingScreen />;
  }

  const seriesTitle = series.getName(langKey);
  const seriesTagline = series.getTagline(langKey);
  const creators = series.createdBy || [];
  const directors = series.getDirectors();
  const writers = series.getWriters();

  return (
    <div className="film-detail-page tv-series-detail-page position-relative w-100 min-vh-100 pb-5">
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
              <i className="bi bi-arrow-left text-white fs-5" />
            </button>
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
                <MediaOverview key={series.id} media={series} type="tv" />
              </div>

              {!isMobile && (
                <div className="mb-3">
                  <MediaProvidersSection media={series} />
                </div>
              )}

              {/* BARRA PULSANTI PREFERENZE */}
              <MediaPreferencesBar
                target={series}
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
          selectedSeasonNumber={selectedSeasonNumber}
          onSelectSeason={setSelectedSeasonNumber}
          currentSeason={currentSeason}
          isLoadingEpisodes={isSeasonLoading(id, selectedSeasonNumber)}
          failed={Boolean(requestedSeason?.error)}
          onRetry={() => { void loadSeasonDetails(id, selectedSeasonNumber, true, normalizedLang); }}
          onLoadEpisodeDetails={loadEpisodeDetails}
          className={"mb-5"}
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
