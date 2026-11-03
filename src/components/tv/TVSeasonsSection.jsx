import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TVEpisodeCard from './TVEpisodeCard.jsx';
import TVSeasonSelection from './TVSeasonSelection.jsx';
import SeasonSelectionDropDown from './SeasonSelectionDropDown.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { formatTranslation } from '../../utils/translations.js';
import '../../css/tv/tvSeasonsSection.css';

/**
 * TVSeasonsSection
 * Componente dedicato alla guida alle stagioni e all'elenco scrollabile degli episodi
 * per la pagina di dettaglio della serie TV.
 *
 * @param {Object} props
 * @param {import('../../models/Series.js').Series|Object} props.series - Serie TV corrente
 * @param {number} [props.selectedSeasonNumber=1] - Numero della stagione selezionata
 * @param {Function} props.onSelectSeason - Callback al cambio di stagione selezionata
 * @param {import('../../models/Season.js').Season|Object} [props.currentSeason] - Dati della stagione selezionata
 * @param {boolean} [props.isLoadingEpisodes=false] - Stato di caricamento degli episodi della stagione
 * @param {string} [props.className=''] - Classi CSS aggiuntive
 */
export default function TVSeasonsSection({
  series,
  selectedSeasonNumber = 1,
  onSelectSeason,
  currentSeason,
  isLoadingEpisodes = false,
  className = ''
}) {
  const { t } = useTranslation();
  const { isMobile } = useDevice();

  const [persistingLoading, setPersistingLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingEpisodes && persistingLoading) {
      const timer = setTimeout(() => {
        setPersistingLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLoadingEpisodes, persistingLoading]);

  const handleSelectSeason = (seasonNum) => {
    if (seasonNum === selectedSeasonNumber) return;
    setPersistingLoading(true);
    onSelectSeason?.(seasonNum);
  };

  const showLoading = isLoadingEpisodes || persistingLoading;

  if (!series) return null;

  const numSeasons =
    series.numberOfSeasons ||
    series.number_of_seasons ||
    series.seasons?.length ||
    1;

  const episodes = currentSeason?.episodes || [];
  const episodesCount =
    episodes.length ||
    currentSeason?.episodeCount ||
    currentSeason?.episode_count ||
    series.seasons?.find((s) => (s.seasonNumber ?? s.season_number) === selectedSeasonNumber)?.episodeCount ||
    0;

  return (
    <section className={`tv-seasons-section mb-4 mb-md-5 ${className}`.trim()}>
      {/* GUIDA ALLE STAGIONI: HEADER */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <h3 className="h4 text-white fw-bold mb-0 d-flex align-items-center gap-2 tv-seasons-title">
          <i className="bi bi-collection-play-fill text-success"></i>
          {t('detail.seasonsGuideTitle')}
        </h3>

        {isMobile ? (
          <SeasonSelectionDropDown
            seasonsCount={numSeasons}
            selectedSeasonNumber={selectedSeasonNumber}
            onSelectSeason={handleSelectSeason}
          />
        ) : (
          <span className="text-white-50 small">
            {formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber })}
          </span>
        )}
      </div>

      {/* SELEZIONE STAGIONI CON SLIDER E NAVIGATORI (SOLO DESKTOP E TABLET) */}
      {!isMobile && (
        <TVSeasonSelection
          seasonsCount={numSeasons}
          selectedSeasonNumber={selectedSeasonNumber}
          onSelectSeason={handleSelectSeason}
        />
      )}

      {/* CONTENITORE EPISODI: SCROLLABILE CON DIMENSIONE FISSA TRASPARENTE */}
      <div className="tv-episodes-container">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="h6 fw-bold text-white mb-0">
            {formatTranslation(t('detail.seasonLabel'), { number: selectedSeasonNumber })} ({episodesCount} {t('detail.episodes')})
          </h5>
        </div>

        <div className="tv-episodes-content-area position-relative">
          {showLoading ? (
            <div className="tv-episodes-loading-placeholder text-center">
              <div className="spinner-border text-success mb-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <small className="text-white-50">{t('detail.loadingEpisodes') || t('detail.episodePlotLoading')}</small>
            </div>
          ) : episodes.length === 0 ? (
            <div className="d-flex align-items-center justify-content-center h-100 text-white-50 small">
              {t('common.noResults')}
            </div>
          ) : (
            <div className="tv-episodes-scroll-container d-flex flex-column gap-3">
              {episodes.map((ep) => (
                <TVEpisodeCard
                  key={ep.id || ep.episodeNumber || ep.episode_number}
                  episode={ep}
                  seriesId={series.id}
                  seasonNumber={selectedSeasonNumber}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

TVSeasonsSection.propTypes = {
  series: PropTypes.oneOfType([PropTypes.object]).isRequired,
  selectedSeasonNumber: PropTypes.number,
  onSelectSeason: PropTypes.func,
  currentSeason: PropTypes.oneOfType([PropTypes.object]),
  isLoadingEpisodes: PropTypes.bool,
  className: PropTypes.string
};
