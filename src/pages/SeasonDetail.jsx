import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { useState, useMemo } from 'react';
import { useTranslation } from '../utils/translations.js';
import { resolveLangKey } from '../models/index.js';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CameoCard from '../components/CameoCard.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { getSeriesById, getSeasonDetails, getReviewsForTarget, CATALOG_SERIES } from '../data/catalogData.js';

export default function SeasonDetail() {
  const { t } = useTranslation();
  const langKey = resolveLangKey(t('meta.langCode', 'it'));
  const { id, seasonNumber } = useParams();
  const navigate = useNavigate();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [watchedEpisodes, setWatchedEpisodes] = useState({});

  const seriesId = Number(id);
  const seasonNum = Number(seasonNumber) || 1;

  const series = useMemo(() => {
    return getSeriesById(seriesId) || CATALOG_SERIES[0];
  }, [seriesId]);

  const season = useMemo(() => {
    return getSeasonDetails(seriesId, seasonNum);
  }, [seriesId, seasonNum]);

  const reviews = useMemo(() => {
    return getReviewsForTarget(`season:${seriesId}:${seasonNum}`);
  }, [seriesId, seasonNum]);

  const seasonCameos = useMemo(() => {
    return season?.cameos || [];
  }, [season]);

  if (!series || !season) return null;

  const seriesBackdropSrc =
    (typeof series.getBackdropUrl === 'function' ? series.getBackdropUrl('it') : null) ||
    series.backdropUrl?.it ||
    series.backdropUrl?.en ||
    IMAGE_PLACEHOLDERS.BACKDROP;

  const seasonPosterSrc =
    (typeof season.getPosterUrl === 'function' ? season.getPosterUrl('it') : null) ||
    season.posterUrl?.it ||
    season.posterUrl?.en ||
    IMAGE_PLACEHOLDERS.POSTER;

  const rating = (Number(season.voteAverage ?? season.vote_average) || 8.0).toFixed(1);
  const epCount = season.episodeCount || season.episodes?.length || 10;
  const airYear = (season.airDate || season.air_date || '').slice(0, 4);

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
          className="position-absolute top-0 start-0 m-3 btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center z-3 border border-secondary border-opacity-50"
          style={{ width: '44px', height: '44px' }}
          aria-label="Torna alla serie"
        >
          <i className="bi bi-arrow-left text-white fs-5"></i>
        </button>

        <div className="position-absolute bottom-0 start-0 w-100 p-4 p-md-5 z-2 d-flex align-items-end gap-4">
          <div className="rounded-3 overflow-hidden bg-dark shadow-lg d-none d-md-block flex-shrink-0" style={{ width: '85px', height: '125px' }}>
            <img src={seasonPosterSrc} alt={season.name} className="w-100 h-100 object-fit-cover" />
          </div>
          <div>
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <Link to={`/Cameos/series/${series.id}`} className="badge rounded-pill bg-warning text-dark text-decoration-none fw-bold">
                {series.name}
              </Link>
              {airYear && (
                <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                  {airYear}
                </span>
              )}
              <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
                {epCount} Episodi
              </span>
              <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold d-flex align-items-center gap-1">
                <i className="bi bi-star-fill"></i> {rating}
              </span>
            </div>

            <h1 className="display-5 fw-bold text-white mb-1">
              {(typeof season.getName === 'function' ? season.getName(langKey) : (season.name?.[langKey] || season.name?.it || season.name?.en || season.name)) || `Stagione ${seasonNum}`}
            </h1>
            <p className="text-white-50 mb-0" style={{ maxWidth: '650px' }}>
              {(typeof season.getOverview === 'function' ? season.getOverview(langKey) : (season.overview?.[langKey] || season.overview?.it || season.overview?.en || (typeof season.overview === 'string' ? season.overview : null))) || `Tutti gli episodi e i camei speciali della stagione ${seasonNum} di ${series.name}.`}
            </p>
          </div>
        </div>
      </section>

      {/* PREFERENZE STAGIONE */}
      <MediaPreferencesBar
        target={season}
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
      />

      {/* SEZIONE: CAMEI RILEVATI IN QUESTA STAGIONE */}
      {seasonCameos.length > 0 && (
        <section className="mb-5 p-4 rounded-4 card-2pxb-dark-background shadow-sm">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-stars text-warning fs-4"></i>
            <h3 className="h5 fw-bold text-white mb-0 text-uppercase tracking-wider">
              Camei & Guest Star in questa Stagione
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
            <p className="text-success text-uppercase small fw-bold mb-1">Elenco Completo</p>
            <h3 className="h4 text-white fw-bold mb-0">Episodi ({season.episodes?.length || 0})</h3>
          </div>
        </div>

        <div className="d-flex flex-column gap-3">
          {(season.episodes || []).map((ep) => {
            const epNum = ep.episodeNumber || ep.episode_number || 1;
            const epTitle = ep.name || `Episodio ${epNum}`;
            const epId = ep.id || epNum;
            const isWatched = Boolean(watchedEpisodes[epId]);

            const stillSrc =
              (typeof ep.getStillUrl === 'function' ? ep.getStillUrl('it') : null) ||
              ep.stillUrl?.it ||
              (ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null) ||
              IMAGE_PLACEHOLDERS.STILL;

            const epRating = (Number(ep.voteAverage ?? ep.vote_average) || 8.0).toFixed(1);
            const guestStars = ep.guestStars || ep.guest_stars || [];
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
                            {epNum}. {(typeof ep.getName === 'function' ? ep.getName(langKey) : (ep.name?.[langKey] || ep.name?.it || ep.name?.en || epTitle))}
                          </h4>
                          <div className="d-flex flex-wrap gap-2 text-white-50 small">
                            {ep.airDate && <span>Trasmesso il: {ep.airDate}</span>}
                            {ep.runtime && <span>• Durata: {ep.runtime} min</span>}
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
                          <span>{isWatched ? 'Visto' : 'Segna visto'}</span>
                        </button>
                      </div>

                      {/* TRAMA (SOTTO) */}
                      <p className="text-white-50 small mb-2" style={{ lineHeight: '1.6' }}>
                        {(typeof ep.getOverview === 'function' ? ep.getOverview(langKey) : (ep.overview?.[langKey] || ep.overview?.it || ep.overview?.en || (typeof ep.overview === 'string' ? ep.overview : null))) || 'Trama dettagliata dell\'episodio in caricamento...'}
                      </p>
                    </div>

                    {/* GUEST STARS & CAMEO BADGES */}
                    {(guestStars.length > 0 || epCameos.length > 0) && (
                      <div className="d-flex flex-wrap align-items-center gap-2 pt-2 border-top border-secondary border-opacity-25 mt-2">
                        <small className="text-warning fw-bold d-flex align-items-center gap-1">
                          <i className="bi bi-person-badge"></i> Guest Star / Cameo:
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
        title={`Recensioni per Stagione ${seasonNum}`}
      />
    </div>
  );
}
