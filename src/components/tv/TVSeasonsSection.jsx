import { useMemo } from 'react';
import PropTypes from 'prop-types';
import TVEpisodeCard from './TVEpisodeCard.jsx';
import TVSeasonSelection from './TVSeasonSelection.jsx';
import SeasonSelectionDropDown from './SeasonSelectionDropDown.jsx';
import MediaTrailerCard from '../media/MediaTrailerCard.jsx';
import MediaPreferencesBar from '../media/MediaPreferencesBar.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useSeriesViewModel } from '../../viewmodel/index.js';
import '../../css/tv/tvSeasonsSection.css';

/**
 * Resolve the episode count for the active season from loaded data or series season metadata.
 * @param {Object<string, any>|null|undefined} activeSeason
 * @param {Object<string, any>} series
 * @param {number} selectedSeasonNumber
 * @returns {number}
 */
function resolveEpisodesCount(activeSeason, series, selectedSeasonNumber) {
  return (
    activeSeason?.episodes?.length ||
    activeSeason?.episodeCount ||
    series.seasons?.find((s) => Number(s.seasonNumber) === Number(selectedSeasonNumber))?.episodeCount ||
    0
  );
}

/**
 * TVSeasonsSection
 * Componente dedicato alla guida alle stagioni e all'elenco scrollabile degli episodi
 * per la pagina di dettaglio della serie TV.
 *
 * @param {Object} props
 * @param {import('../../models/Series.js').Series|Object} props.series - Serie TV corrente
 * @param {number} [props.selectedSeasonNumber=1] - Numero della stagione selezionata
 * @param {(seasonNumber: number) => void} props.onSelectSeason - Callback al cambio di stagione selezionata
 * @param {import('../../models/Season.js').Season|Object} [props.currentSeason] - Dati della stagione selezionata
 * @param {boolean} [props.isLoadingEpisodes=false] - Stato di caricamento degli episodi della stagione
 * @param {boolean} [props.failed=false] - Errore nel caricamento della stagione selezionata
 * @param {() => void} [props.onRetry] - Riprova il caricamento della stagione
 * @param {string} [props.className=''] - Classi CSS aggiuntive
 */
export default function TVSeasonsSection({
  series,
  selectedSeasonNumber = 1,
  onSelectSeason,
  currentSeason,
  isLoadingEpisodes = false,
  failed = false,
  onRetry,
  className = ''
}) {
  const { t, langKey, normalizedLang, formatTranslation } = useTranslation();
  const { isMobile } = useDevice();
  const { loadEpisodeDetails } = useSeriesViewModel({ language: normalizedLang });

  const seriesId = series?.id ?? null;
  const seasonPreferenceTarget = useMemo(() => ({
    mediaType: 'season',
    seriesId,
    seasonNumber: selectedSeasonNumber
  }), [seriesId, selectedSeasonNumber]);

  if (!series) return null;

  const episodes = currentSeason?.episodes || [];
  const activeSeason = isLoadingEpisodes ? null : currentSeason;
  const displayedSeasonNumber = currentSeason?.seasonNumber ?? selectedSeasonNumber;
  const keepLayoutWhileLoading = isLoadingEpisodes && episodes.length > 0;
  const showEpisodesList = episodes.length > 0 && (isLoadingEpisodes || !failed);
  const numSeasons = series.numberOfSeasons || 1;
  const episodesCount = resolveEpisodesCount(activeSeason, series, selectedSeasonNumber);
  const seasonLabelText = formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber });

  const seasonTrailerCard = (
    <MediaTrailerCard
      media={activeSeason}
      placement="inline"
      fallbackImage={series.getBackdropUrl?.(langKey)}
      ctaLabel={formatTranslation(t('detail.watchSeasonTrailer'), { number: selectedSeasonNumber })}
    />
  );

  const sectionHeading = (
    <h3 className="h4 text-white fw-bold mb-0 d-flex align-items-center gap-2 tv-seasons-title">
      <i className="bi bi-collection-play-fill text-success" aria-hidden="true" />
      {t('detail.seasonsGuideTitle')}
    </h3>
  );

  return (
    <section className={`tv-seasons-section ${className}`.trim()}>
      {/* GUIDA ALLE STAGIONI: HEADER / CONTROLLI */}
      {isMobile ? (
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          {sectionHeading}
          <SeasonSelectionDropDown
            seasonsCount={numSeasons}
            selectedSeasonNumber={selectedSeasonNumber}
            onSelectSeason={onSelectSeason}
          />
        </div>
      ) : (
        <div className="tv-seasons-desktop-header mb-3">
          <div className="tv-seasons-header-main d-flex flex-column justify-content-between gap-2">
            {sectionHeading}
            <TVSeasonSelection
              seasonsCount={numSeasons}
              selectedSeasonNumber={selectedSeasonNumber}
              onSelectSeason={onSelectSeason}
            />
          </div>

          <div className="tv-season-trailer-box d-flex flex-column align-items-center gap-1">
            <div className="tv-season-trailer-slot w-100 d-flex align-items-stretch justify-content-center">
              {seasonTrailerCard}
            </div>
            <span className="text-white-50 text-center tv-season-trailer-label">
              {seasonLabelText}
            </span>
          </div>
        </div>
      )}

      {/* CONTENITORE EPISODI + PREFERENZE STAGIONE (DESKTOP/TABLET IN COLONNA DESTRA, MOBILE SOLO ICONE) */}
      <div className={`tv-episodes-container w-100${isMobile ? ' d-flex flex-column' : ' tv-episodes-container--desktop'}`}>
        <div className="tv-episodes-header-block d-flex flex-column gap-2 mb-3">
          <div className="tv-episodes-header-row d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <h5 className="h6 fw-bold text-white mb-0">
              {seasonLabelText} ({episodesCount} {episodesCount === 1 ? t('detail.episode') : t('detail.episodes')})
            </h5>
            {isMobile && seasonTrailerCard}
          </div>

          {isMobile && (
            <div className="tv-season-preferences-mobile" role="group" aria-label={seasonLabelText}>
              <MediaPreferencesBar target={seasonPreferenceTarget} showLike={false} variant="icons" />
            </div>
          )}
        </div>

        <div className="tv-episodes-content-area position-relative d-flex flex-column">
          {showEpisodesList && (
            <div
              key={displayedSeasonNumber}
              className={`tv-episodes-scroll-container d-flex flex-column gap-3 py-2${keepLayoutWhileLoading ? ' invisible pe-none' : ''}`}
              inert={keepLayoutWhileLoading}
              aria-hidden={keepLayoutWhileLoading}
            >
              {episodes.map((ep) => (
                <TVEpisodeCard
                  key={`${displayedSeasonNumber}-${ep.id || ep.episodeNumber}`}
                  episode={ep}
                  seriesId={series.id}
                  seasonNumber={displayedSeasonNumber}
                  onLoadEpisodeDetails={loadEpisodeDetails}
                />
              ))}
            </div>
          )}

          {isLoadingEpisodes ? (
            <div
              className={`tv-episodes-loading-placeholder d-flex flex-column align-items-center justify-content-center text-center${keepLayoutWhileLoading ? ' position-absolute top-0 start-0 w-100 h-100' : ''}`}
            >
              <div className="spinner-border text-success mb-2" role="status">
                <span className="visually-hidden">{t('common.loading')}</span>
              </div>
              <small className="text-white-50">{t('detail.loadingEpisodes') || t('detail.episodePlotLoading')}</small>
            </div>
          ) : failed ? (
            <div className="text-center py-3" role="alert">
              <p className="text-warning">{t('common.error')}</p>
              {onRetry && (
                <button type="button" className="btn btn-outline-success rounded-pill" onClick={onRetry}>
                  {t('common.retry')}
                </button>
              )}
            </div>
          ) : episodes.length === 0 ? (
            <div className="d-flex align-items-center justify-content-center h-100 text-white-50 small">
              {t('common.noResults')}
            </div>
          ) : null}
        </div>

        {!isMobile && (
          <aside className="tv-season-preferences-box pt-2" role="group" aria-label={seasonLabelText}>
            <MediaPreferencesBar target={seasonPreferenceTarget} showLike={false} variant="stacked" />
          </aside>
        )}
      </div>
    </section>
  );
}

TVSeasonsSection.propTypes = {
  series: PropTypes.object,
  selectedSeasonNumber: PropTypes.number,
  onSelectSeason: PropTypes.func,
  currentSeason: PropTypes.object,
  isLoadingEpisodes: PropTypes.bool,
  failed: PropTypes.bool,
  onRetry: PropTypes.func,
  className: PropTypes.string
};
