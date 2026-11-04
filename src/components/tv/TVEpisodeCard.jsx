import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useSeriesViewModel } from "../../viewmodel/index.js";
import { formatDate } from '../../utils/formatters.js';
import { IMAGE_PLACEHOLDERS } from '../../models/utils/index.js';
import '../../css/common/mediaIconButton.css';
import '../../css/tv/tvSeasonsSection.css';

/**
 * TVEpisodeCard
 * Scheda episodio con supporto collasso/espansione, fotogramma still,
 * messa in onda, valutazione a pillola e pulsante dettagli episodio.
 */
export default function TVEpisodeCard({
  episode,
  seriesId,
  seasonNumber,
  defaultExpanded = false
}) {
  const { t, langKey, formatTranslation } = useTranslation();
  const { isMobile, isTablet } = useDevice();
  const isTouchDevice = isMobile || isTablet;

  const { loadEpisodeDetails } = useSeriesViewModel();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [details, setDetails] = useState(null);

  const epNum = episode?.episodeNumber || 1;
  const sId = episode?.seriesId || seriesId;
  const sNum = episode?.seasonNumber ?? seasonNumber;

  // Fallback: se data messa in onda o valutazione non sono presenti nell'oggetto iniziale,
  // effettua il recupero on-demand all'espansione della card (con gestione cache locale a tempo)
  useEffect(() => {
    let isMounted = true;
    const hasData = Boolean(episode?.airDate && episode?.voteAverage);

    if (isExpanded && !hasData && !details && sId && sNum) {
      loadEpisodeDetails({
          seriesId: sId,
          seasonNumber: sNum,
          episodeNumber: epNum,
          language: langKey
        })
        .then((fetched) => {
          if (isMounted && fetched) {
            setDetails(fetched);
          }
        })
        .catch((err) => {
          console.warn('[TVEpisodeCard] Error fetching episode details:', err);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isExpanded, episode?.airDate, episode?.voteAverage, details, sId, sNum, epNum, langKey, loadEpisodeDetails]);

  if (!episode) return null;

  const epTitle = episode.getName?.(langKey) || episode.name || formatTranslation(t('detail.episodeLabel'), { number: epNum });
  const epOverview = episode.getOverview?.(langKey) || episode.overview || t('detail.overviewUnavailable');
  const stillSrc = episode.getStillUrl?.(langKey) || episode.stillUrl || IMAGE_PLACEHOLDERS.STILL;

  const runtime = details?.runtime ?? episode.runtime;
  const airDate = details?.airDate || episode.airDate;
  const formattedAirDate = airDate ? formatDate(airDate, langKey) : null;

  const vote = details?.voteAverage ?? episode.voteAverage;
  const rating = vote > 0 ? Number(vote).toFixed(1) : null;

  const episodeLink = sId && sNum ? `/Cameos/series/${sId}/season/${sNum}/episode/${epNum}` : '#';

  const handleToggleClick = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleCardClick = () => {
    if (isTouchDevice) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleKeyDown = (e) => {
    if (isTouchDevice && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  // Riga superiore (pill numero, titolo, durata in linea a destra e pulsante collasso)
  const renderHeader = () => (
    <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
      <div className="d-flex align-items-center gap-2 min-w-0 flex-wrap">
        <span className="badge bg-secondary bg-opacity-50 text-white-50 fw-semibold flex-shrink-0 tv-episode-pill">
          Ep. {epNum}
        </span>
        <h6
          className="fw-bold text-white mb-0 text-truncate"
          title={epTitle}
          style={{ fontSize: '0.875rem' }}
        >
          {epTitle}
        </h6>
      </div>

      <div className={`d-flex align-items-center gap-2 flex-shrink-0 ms-auto ${isMobile ? 'tv-episode-header-actions' : ''}`}>
        {runtime ? (
          <span className="text-white-50 small fw-medium" style={{ fontSize: '0.75rem' }}>
            {runtime}m
          </span>
        ) : null}

        <button
          type="button"
          onClick={handleToggleClick}
          className="media-icon-button tv-episode-collapse-btn"
          aria-label={isExpanded ? t('detail.collapse') : t('detail.expand')}
          aria-expanded={isExpanded}
          title={isExpanded ? t('detail.collapse') : t('detail.expand')}
        >
          <i
            className={`bi bi-chevron-up text-white media-card-collapse-icon ${
              !isExpanded ? 'is-collapsed' : ''
            }`}
            style={{ fontSize: '0.875rem' }}
          />
        </button>
      </div>
    </div>
  );

  // Riga inferiore meta (messa in onda, pill valutazione e text-button dettagli episodio)
  const renderMetaRow = () => (
    <div className="tv-episode-meta-row d-flex justify-content-between align-items-center flex-wrap gap-2">
      <div className="d-flex align-items-center flex-wrap gap-2">
        {formattedAirDate && (
          <span className="text-white-50 small" style={{ fontSize: '0.75rem' }}>
            {formatTranslation(t('detail.airedOnPrefix'), { date: formattedAirDate })}
          </span>
        )}

        {rating && (
          <span className="badge rounded-pill bg-warning text-dark tv-episode-rating-pill shadow-sm">
            <i className="bi bi-star-fill" /> {rating}
          </span>
        )}
      </div>

      <Link
        to={episodeLink}
        onClick={(e) => e.stopPropagation()}
        className="tv-episode-details-btn fw-semibold text-decoration-none d-inline-flex align-items-center gap-1 ms-auto"
      >
        {t('detail.episodeDetails')} <i className="bi bi-chevron-right" />
      </Link>
    </div>
  );

  return (
    <div
      className={`tv-episode-card bg-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-3 p-3 w-100 ${
        isTouchDevice ? 'is-touch-card' : ''
      } ${isExpanded ? 'is-expanded' : ''}`}
      onClick={handleCardClick}
      role={isTouchDevice ? 'button' : undefined}
      tabIndex={isTouchDevice ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-expanded={isExpanded}
    >
      {renderHeader()}

      {/* VISTA COLLASSATA (transizione smooth fluida via grid-template-rows) */}
      <div className={`media-collapse-wrapper ${isExpanded ? 'collapsed' : ''}`}>
        <div className="media-collapse-inner">
          <div
            className="text-white-50 small tv-episode-overview-collapsed pt-1"
            style={{ fontSize: '0.75rem' }}
          >
            {epOverview}
          </div>
        </div>
      </div>

      {/* VISTA ESPANSA (transizione smooth fluida via grid-template-rows) */}
      <div className={`media-collapse-wrapper ${!isExpanded ? 'collapsed' : ''}`}>
        <div className="media-collapse-inner">
          {isMobile ? (
            <div className="tv-episode-expanded-mobile pt-2 d-flex flex-column gap-2">
              {/* RIGA 1: Immagine e blocco (messa in onda + pill) affiancati */}
              <div className="tv-episode-mobile-media-row">
                <div className="tv-episode-still-container tv-episode-still-mobile rounded-2 overflow-hidden bg-dark shadow-sm">
                  <img
                    src={stillSrc}
                    alt={epTitle}
                    className="w-100 h-100 object-fit-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = IMAGE_PLACEHOLDERS.STILL;
                    }}
                  />
                </div>

                <div className="tv-episode-mobile-meta flex-grow-1 min-w-0">
                  {formattedAirDate && (
                    <div className="tv-episode-air-date-block">
                      <span className="tv-episode-air-date-label d-block">
                        {t('detail.airedLabel')}
                      </span>
                      <span className="tv-episode-air-date-val d-block">
                        {formattedAirDate}
                      </span>
                    </div>
                  )}

                  {rating && (
                    <div className="pt-1">
                      <span className="badge rounded-pill bg-warning text-dark tv-episode-rating-pill shadow-sm">
                        <i className="bi bi-star-fill" /> {rating}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGA 2: Trama a tutta larghezza */}
              <div
                className="text-white-50 small tv-episode-overview-expanded"
                style={{ fontSize: '0.75rem' }}
              >
                {epOverview}
              </div>

              {/* RIGA 3: Textbutton dettagli episodio allineato a destra, solo margine (senza separatore) */}
              <div className="tv-episode-mobile-btn-row">
                <Link
                  to={episodeLink}
                  onClick={(e) => e.stopPropagation()}
                  className="tv-episode-details-btn fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
                >
                  {t('detail.episodeDetails')} <i className="bi bi-chevron-right" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="tv-episode-expanded-body pt-2">
              <div className="tv-episode-still-container rounded-2 overflow-hidden bg-dark shadow-sm">
                <img
                  src={stillSrc}
                  alt={epTitle}
                  className="w-100 h-100 object-fit-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.src = IMAGE_PLACEHOLDERS.STILL;
                  }}
                />
              </div>

              <div className="tv-episode-expanded-content flex-grow-1 min-w-0">
                <div
                  className="text-white-50 small tv-episode-overview-expanded"
                  style={{ fontSize: '0.75rem' }}
                >
                  {epOverview}
                </div>
                {renderMetaRow()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

TVEpisodeCard.propTypes = {
  episode: PropTypes.oneOfType([PropTypes.object]).isRequired,
  seriesId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  seasonNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultExpanded: PropTypes.bool
};
