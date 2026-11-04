import { IMAGE_PLACEHOLDERS } from '../models/utils/index.js';
import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CameoCard from '../components/cameo/CameoCard.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { getSeriesById, getSeasonDetails, getReviewsForTarget, CATALOG_SERIES } from '../data/catalogData.js';
import { useSeriesViewModel } from '../viewmodel/index.js';

export default function SeasonDetail() {
  const { t, langKey, formatTranslation } = useTranslation();
  const { id, seasonNumber } = useParams();
  const navigate = useNavigate();
  const seriesVM = useSeriesViewModel();
  const { loadSeriesDetails, loadSeasonDetails, selectedSeries, selectedSeason, loading: vmLoading } = seriesVM;

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState({});

  const seriesId = Number(id);
  const seasonNum = Number(seasonNumber) || 1;

  useEffect(() => {
    if (seriesId && (!selectedSeries || selectedSeries.id !== seriesId)) {
      loadSeriesDetails(seriesId, true);
    }
    if (seriesId && seasonNum && (!selectedSeason || selectedSeason.seasonNumber !== seasonNum)) {
      loadSeasonDetails(seriesId, seasonNum);
    }
  }, [seriesId, seasonNum, loadSeriesDetails, loadSeasonDetails, selectedSeries, selectedSeason]);

  const series = useMemo(() => {
    if (selectedSeries && selectedSeries.id === seriesId) return selectedSeries;
    return getSeriesById(seriesId) || CATALOG_SERIES[0];
  }, [seriesId, selectedSeries]);

  const season = useMemo(() => {
    if (selectedSeason && selectedSeason.seasonNumber === seasonNum) return selectedSeason;
    return getSeasonDetails(seriesId, seasonNum);
  }, [seriesId, seasonNum, selectedSeason]);

  const reviews = useMemo(() => {
    return getReviewsForTarget(`season:${seriesId}:${seasonNum}`);
  }, [seriesId, seasonNum]);

  const seasonCameos = useMemo(() => {
    return season?.cameos || [];
  }, [season]);

  if (vmLoading && (!series || !season)) {
    return <LoadingScreen onBack={() => navigate('/Cameos/series')} />;
  }

  if (!series || !season) return null;

  const seriesBackdropSrc = typeof series.getBackdropUrl === 'function' ? series.getBackdropUrl(langKey) : IMAGE_PLACEHOLDERS.BACKDROP;
  const seasonPosterSrc = typeof season.getPosterUrl === 'function' ? season.getPosterUrl(langKey) : IMAGE_PLACEHOLDERS.POSTER;

  const seriesTitle = (typeof series.getName === 'function' ? series.getName(langKey) : series.name) || '';
  const seasonTitle = (typeof season.getName === 'function' ? season.getName(langKey) : season.name) || formatTranslation(t('detail.seasonLabel'), { number: seasonNum });
  const seasonOverview = (typeof season.getOverview === 'function' ? season.getOverview(langKey) : season.overview) || formatTranslation(t('detail.seasonOverviewFallback'), { number: seasonNum, name: seriesTitle });

  const rating = Number(season.voteAverage || 0).toFixed(1);
  const epCount = season.episodeCount || (season.episodes?.length || 0);
  const airYear = String(season.airDate || '').slice(0, 4);

  const toggleEpisodeWatched = (epId) => {
    setWatchedEpisodes((prev) => ({
      ...prev,
      [epId]: !prev[epId]
    }));
  };

  return (
    <div className="season-detail-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* PORZIONE SUPERIORE: BANNER STAGIONE CON PULSANTE INDIETRO CIRCOLARE */}
      <section
        className="position-relative rounded-4 mb-4 overflow-hidden shadow-lg"
        style={{
          minHeight: '320px',
          backgroundColor: '#1E1E24',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(14, 15, 20, 0.4) 0%, rgba(14, 15, 20, 0.95) 100%), url(${seriesBackdropSrc})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center top'
          }}
        />

        {/* PULSANTE CIRCOLARE PER TORNARE A TVSERIESDETAIL */}
        <button
          type="button"
          onClick={() => navigate(`/Cameos/series/${series.id}`)}
          className="position-absolute top-0 start-0 m-2 m-md-3 btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center z-3 border border-secondary border-opacity-50 back-btn"
          aria-label={t('detail.backToSeries')}
        >
          <i className="bi bi-arrow-left text-white"></i>
        </button>

        <div className="position-absolute bottom-0 start-0 w-100 p-4 p-md-5 z-2 d-flex align-items-end gap-4">
          <div className="rounded-3 overflow-hidden bg-dark shadow-lg d-none d-md-block flex-shrink-0" style={{ width: '5.3125rem', height: '7.8125rem' }}>
            <img src={seasonPosterSrc} alt={seasonTitle} className="w-100 h-100 object-fit-cover" />
          </div>
          <div>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <Link to={`/Cameos/series/${series.id}`} className="badge rounded-pill bg-warning text-dark text-decoration-none fw-bold">
                {seriesTitle}
              </Link>
              {airYear && (
                <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                  {airYear}
                </span>
              )}
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                {epCount} {t('detail.episodes')}
              </span>
              <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold d-flex align-items-center gap-1">
                <i className="bi bi-star-fill"></i> {rating}
              </span>
            </div>

            <h1 className="display-5 fw-bold text-white mb-1">
              {seasonTitle}
            </h1>
            <p className="text-white-50 mb-0" style={{ maxWidth: '40.625rem' }}>
              {seasonOverview}
            </p>
          </div>
        </div>
      </section>

      {/* PREFERENZE STAGIONE */}
      <MediaPreferencesBar target={season} />

      {/* SEZIONE: CAMEI RILEVATI IN QUESTA STAGIONE */}
      {seasonCameos.length > 0 && (
        <section className="mb-5 p-4 rounded-4 card-2pxb-dark-background shadow-sm">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-stars text-warning fs-4"></i>
            <h3 className="h5 fw-bold text-white mb-0 text-uppercase tracking-wider">
              {t('detail.seasonCameosTitle')}
            </h3>
          </div>
          <div className="row g-3">
            {seasonCameos.map((c) => (
              <div className="col-12 col-md-6" key={c.id || c.name}>
                <CameoCard cameo={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* LISTA VERTICALE DEGLI EPISODI (SX FOTO, DX NUMERO, NOME E TRAMA SOTTO) */}
      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <p className="text-success text-uppercase small fw-bold mb-1">{t('detail.fullEpisodeList')}</p>
            <h3 className="h4 text-white fw-bold mb-0">{t('detail.episodes')} ({season.episodes?.length || 0})</h3>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {(season.episodes || []).map((ep) => {
            const epNum = ep.episodeNumber || 1;
            const epTitle = (typeof ep.getName === 'function' ? ep.getName(langKey) : ep.name) || formatTranslation(t('detail.episodeLabel'), { number: epNum });
            const epOverview = (typeof ep.getOverview === 'function' ? ep.getOverview(langKey) : ep.overview) || t('detail.episodePlotLoading');
            const epId = ep.id || epNum;
            const isWatched = Boolean(watchedEpisodes[epId]);
            const stillSrc = typeof ep.getStillUrl === 'function' ? ep.getStillUrl(langKey) : IMAGE_PLACEHOLDERS.STILL;
            const epRating = Number(ep.voteAverage || 0).toFixed(1);
            const guestStars = ep.guestStars || [];
            const epCameos = ep.cameos || [];

            return (
              <div
                key={epId}
                className="card-2pxb-dark-background rounded-4 p-3 p-md-4 text-white shadow-sm hover-scale"
              >
                <div className="row g-3 align-items-center">
                  {/* SX: EVENTUALE FOTO (RATIO 16:9) */}
                  <div className="col-12 col-sm-4 col-md-3">
                    <div
                      className="rounded-3 overflow-hidden bg-dark position-relative shadow-sm"
                      style={{ aspectRatio: '16/9' }}
                    >
                      <img
                        src={stillSrc}
                        alt={epTitle}
                        className="w-100 h-100 object-fit-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = IMAGE_PLACEHOLDERS.STILL;
                        }}
                      />
                      <span className="position-absolute bottom-0 start-0 m-2 badge bg-dark bg-opacity-75 text-white fw-bold small">
                        Ep. {epNum}
                      </span>
                    </div>
                  </div>

                  {/* DX: NUMERO E NOME (SOPRA) - TRAMA (SOTTO) */}
                  <div className="col-12 col-sm-8 col-md-9 d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <h4 className="h5 fw-bold text-white mb-1">
                            {epNum}. {epTitle}
                          </h4>
                          <div className="d-flex flex-wrap gap-2 text-white-50 small">
                            {ep.airDate && <span>{t('detail.airedOn')}: {ep.airDate}</span>}
                            {ep.runtime && <span>• {formatTranslation(t('detail.runtimeMinutes'), { runtime: ep.runtime })}</span>}
                            <span>
                              • <i className="bi bi-star-fill text-warning me-1"></i> {epRating}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleEpisodeWatched(epId)}
                          className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold d-flex align-items-center gap-1 ${
                            isWatched ? 'btn-success text-white' : 'btn-dark border-secondary border-opacity-50 text-white-50'
                          }`}
                        >
                          <i className={`bi ${isWatched ? 'bi-check-circle-fill' : 'bi-check-circle'}`}></i>
                          <span>{isWatched ? t('preferences.watchedShort') : t('preferences.markWatchedShort')}</span>
                        </button>
                      </div>

                      {/* TRAMA (SOTTO) */}
                      <p className="text-white-50 small mb-2" style={{ lineHeight: '1.6' }}>
                        {epOverview}
                      </p>
                    </div>

                    {/* GUEST STARS & CAMEO BADGES */}
                    {(guestStars.length > 0 || epCameos.length > 0) && (
                      <div className="d-flex flex-wrap align-items-center gap-2 pt-2 border-top border-secondary border-opacity-25 mt-2">
                        <small className="text-warning fw-bold d-flex align-items-center gap-1">
                          <i className="bi bi-person-badge"></i> {t('detail.guestStarCameoLabel')}
                        </small>
                        {guestStars.slice(0, 3).map((gs) => (
                          <span
                            key={gs.id || gs.name}
                            className="badge rounded-pill bg-dark text-white border border-secondary border-opacity-50 px-2 py-1 small"
                          >
                            {gs.name} {gs.character ? `(${gs.character})` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* RECENSIONI SULLA STAGIONE */}
      <ReviewSection
        initialReviews={reviews}
        targetKey={`season:${seriesId}:${seasonNum}`}
        isModalOpen={isReviewModalOpen}
        onCloseModal={() => setIsReviewModalOpen(false)}
        title={formatTranslation(t('reviews.seasonReviewsTitle'), { number: seasonNum })}
      />
    </div>
  );
}
