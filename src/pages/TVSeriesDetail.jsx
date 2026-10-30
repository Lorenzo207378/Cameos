import { formatTranslation } from '../utils/translationUtils.js';
import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CastCarousel from '../components/media/CastCarousel.jsx';
import MediaOverview from '../components/media/MediaOverview.jsx';
import MediaDetail from '../components/media/MediaDetail.jsx';
import MediaPreferencesBar from '../components/media/MediaPreferencesBar.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { getSeriesById, getSeasonDetails, getCameosForMedia, getReviewsForTarget, CATALOG_SERIES } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';

export default function TVSeriesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, langKey } = useTranslation();

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(1);

  // Retrieve TV series by ID or fallback
  const series = useMemo(() => {
    return getSeriesById(id) || CATALOG_SERIES[0];
  }, [id]);

  const cameos = useMemo(() => {
    return getCameosForMedia('tv', series?.id);
  }, [series]);

  const reviews = useMemo(() => {
    return getReviewsForTarget(`tv:${series?.id}`);
  }, [series]);

  // Current selected season details
  const currentSeason = useMemo(() => {
    return getSeasonDetails(series?.id, selectedSeasonNumber);
  }, [series, selectedSeasonNumber]);

  if (!series) return null;
  const rawSeriesName =
    (typeof series.getName === 'function' ? series.getName(langKey) : null) ||
    (typeof series.getTitle === 'function' ? series.getTitle(langKey) : null) ||
    series.name?.[langKey] ||
    series.name?.it ||
    series.name?.en ||
    (typeof series.name === 'string' ? series.name : null) ||
    '';
  const seriesName = typeof rawSeriesName === 'string' ? rawSeriesName : (rawSeriesName?.it || rawSeriesName?.en || String(rawSeriesName || ''));

  const backdropSrc =
    (typeof series.getBackdropUrl === 'function' ? series.getBackdropUrl(langKey) : null) ||
    series.backdropUrl?.[langKey] ||
    series.backdropUrl?.it ||
    series.backdropUrl?.en ||
    (typeof series.backdropUrl === 'string' ? series.backdropUrl : null);

  const firstAirYear = (series.firstAirDate || series.first_air_date || '').slice(0, 4);
  const lastAirYear = (series.lastAirDate || series.last_air_date || '').slice(0, 4);
  const yearsSpan = firstAirYear ? (lastAirYear && lastAirYear !== firstAirYear ? `${firstAirYear} - ${lastAirYear}` : firstAirYear) : t('common.notAvailable');

  const rating = (Number(series.voteAverage ?? series.vote_average) || 0).toFixed(1);
  const voteCount = series.voteCount || series.vote_count || 0;
  const numSeasons = series.numberOfSeasons || series.number_of_seasons || series.seasons?.length || 1;

  const creators = series.createdBy || series.created_by || [];

  return (
    <div className="series-detail-page w-100 carousel-page-padding py-4 pb-5">
      {/* PORZIONE SUPERIORE (CIRCA 1/3 PAGINA): IMMAGINE ORIZZONTALE E PULSANTE CIRCOLARE INDIETRO */}
      <section
        className="position-relative rounded-4 mb-4 overflow-hidden shadow-lg"
        style={{
          minHeight: '360px',
          backgroundColor: '#1E1E24',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            backgroundImage: backdropSrc
              ? `linear-gradient(180deg, rgba(14, 15, 20, 0.4) 0%, rgba(14, 15, 20, 0.95) 100%), url(${backdropSrc})`
              : 'linear-gradient(135deg, rgba(10, 93, 10, 0.9) 0%, rgba(20, 40, 25, 0.95) 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center top'
          }}
        />

        {/* PULSANTE CIRCOLARE PER TORNARE INDIETRO */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="position-absolute top-0 start-0 m-3 btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center z-3 border border-secondary border-opacity-50"
          style={{ width: '44px', height: '44px' }}
          aria-label={t('detail.goBack')}
        >
          <i className="bi bi-arrow-left text-white fs-5"></i>
        </button>

        {/* TITOLO E TAGLINE */}
        <div className="position-absolute bottom-0 start-0 w-100 p-4 p-md-5 z-2">
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold">{t('detail.tvSeriesTab')}</span>
            <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
              {yearsSpan}
            </span>
            <span className="badge rounded-pill bg-dark bg-opacity-75 text-white-50 px-3 py-1 border border-secondary border-opacity-25">
              {formatTranslation(t('slider.seasonsCount'), { count: numSeasons })}
            </span>
            <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold d-flex align-items-center gap-1">
              <i className="bi bi-star-fill"></i> {rating} ({voteCount} {t('detail.votes')})
            </span>
          </div>

          <h1 className="display-4 fw-bold text-white mb-1">{seriesName}</h1>
          {series.tagline && <p className="fs-5 text-warning fw-semibold mb-0">{series.tagline}</p>}
        </div>
      </section>

      {/* BARRA PULSANTI PREFERENZE & RECENSIONE */}
      <MediaPreferencesBar
        target={series}
      />

      <section className="row g-4 mb-5 align-items-start">
        <div className="col-12 col-lg-8">
          <MediaOverview key={series.id} media={series} type="tv" cameos={cameos} />
        </div>
        <div className="col-12 col-lg-4">
          <MediaDetail media={series} type="tv" />
        </div>
      </section>

      {/* GUIDA ALLE STAGIONI & EPISODI */}
      <section className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <h3 className="h4 text-white fw-bold mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-collection-play-fill text-success"></i> {t('detail.seasonsGuideTitle')}
          </h3>
          <span className="text-white-50 small">
            {formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber })}
          </span>
        </div>

        {/* PILLOLE SELEZIONE STAGIONE */}
        <div className="d-flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-none">
          {Array.from({ length: numSeasons }).map((_, idx) => {
            const seasonNum = idx + 1;
            const isSelected = selectedSeasonNumber === seasonNum;
            return (
              <button
                key={seasonNum}
                type="button"
                onClick={() => setSelectedSeasonNumber(seasonNum)}
                className={`btn rounded-pill px-4 py-2 text-nowrap fw-semibold small ${
                  isSelected ? 'btn-success shadow-sm' : 'btn-dark text-white-50 border-secondary border-opacity-25'
                }`}
              >
                {formatTranslation(t('detail.seasonLabel'), { number: seasonNum })}
              </button>
            );
          })}
        </div>

        {/* PREVIEW RAPIDA EPISODI DELLA STAGIONE SELEZIONATA */}
        <div className="rounded-3 p-3 bg-dark bg-opacity-50 border border-secondary border-opacity-25">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="h6 fw-bold text-white mb-0">
              {formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber })} ({currentSeason?.episodes?.length || 10} {t('detail.episodes')})
            </h5>
            <Link
              to={`/Cameos/series/${series.id}/season/${selectedSeasonNumber}`}
              className="text-success small fw-semibold text-decoration-none"
            >
              {t('detail.openFullEpisodeList')} <i className="bi bi-chevron-right"></i>
            </Link>
          </div>

          <div className="row g-3">
            {(currentSeason?.episodes || []).slice(0, 4).map((ep) => {
              const epNum = ep.episodeNumber || ep.episode_number || 1;
              const epTitle = ep.name || formatTranslation(t('detail.episodeLabel'), { number: epNum });
              const stillSrc =
                (typeof ep.getStillUrl === 'function' ? ep.getStillUrl(langKey) : null) ||
                ep.stillUrl?.[langKey] ||
                ep.stillUrl?.it ||
                (ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : null) ||
                IMAGE_PLACEHOLDERS.STILL;

              return (
                <div className="col-12 col-md-6" key={ep.id || epNum}>
                  <div className="card-2pxb-dark-background rounded-3 p-3 h-100 d-flex gap-3 align-items-start">
                    <div
                      className="rounded-2 overflow-hidden flex-shrink-0 bg-dark"
                      style={{ width: '100px', height: '65px' }}
                    >
                      <img src={stillSrc} alt={epTitle} className="w-100 h-100 object-fit-cover" />
                    </div>
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex justify-content-between align-items-baseline mb-1">
                        <span className="badge bg-secondary bg-opacity-50 text-white-50 small" style={{ fontSize: '10px' }}>
                          Ep. {epNum}
                        </span>
                        {ep.runtime && <small className="text-white-50">{ep.runtime}m</small>}
                      </div>
                      <h6 className="fw-bold text-white mb-1 text-truncate" title={epTitle} style={{ fontSize: '13px' }}>
                        {epTitle}
                      </h6>
                      <small className="text-white-50 text-truncate d-block" style={{ fontSize: '11px' }}>
                        {ep.overview || t('slider.plotUpdating')}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PORZIONE INFERIORE: CAST & CREATORI */}
      <CastCarousel cast={series.cast || []} title={t('cast.title')} />

      {creators.length > 0 && (
        <section className="mb-5">
          <h3 className="h4 text-white fw-bold mb-3">{t('detail.creators')}</h3>
          <div className="row g-3">
            {creators.map((c) => (
              <div className="col-12 col-sm-6 col-md-4" key={c.id || c.name}>
                <div className="card-2pxb-dark-background rounded-4 p-3 d-flex align-items-center gap-3">
                  <div
                    className="rounded-circle overflow-hidden bg-dark flex-shrink-0"
                    style={{ width: '56px', height: '56px' }}
                  >
                    <img
                      src={c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : IMAGE_PLACEHOLDERS.PROFILE}
                      alt={c.name}
                      className="w-100 h-100 object-fit-cover"
                    />
                  </div>
                  <div>
                    <span className="badge bg-dark text-warning border border-warning border-opacity-25 small mb-1">
                      {t('detail.creator')}
                    </span>
                    <h5 className="h6 fw-bold text-white mb-0">{c.name}</h5>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECENSIONI UTENTI SULLA SERIE */}
      <ReviewSection
        initialReviews={reviews}
        targetKey={`tv:${series.id}`}
        isModalOpen={isReviewModalOpen}
        onCloseModal={() => setIsReviewModalOpen(false)}
        title={`${t('reviews.sectionTitle')} - ${seriesName}`}
      />
    </div>
  );
}
