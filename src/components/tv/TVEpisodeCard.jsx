import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
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
  defaultExpanded = false,
  onLoadEpisodeDetails
}) {
  const { t, langKey, normalizedLang, formatTranslation } = useTranslation();
  const { isMobile, isTablet } = useDevice();
  const isTouchDevice = isMobile || isTablet;

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [details, setDetails] = useState(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const epNum = episode?.episodeNumber ?? 1;
  const sId = episode?.seriesId || seriesId;
  const sNum = episode?.seasonNumber ?? seasonNumber;

  const fetchDetailsIfMissing = useCallback(() => {
    const hasData = Boolean(episode?.airDate && episode?.voteAverage);
    if (!hasData && !details && !fetchingRef.current && onLoadEpisodeDetails && sId && sNum != null) {
      fetchingRef.current = true;
      onLoadEpisodeDetails({
          seriesId: sId,
          seasonNumber: sNum,
          episodeNumber: epNum,
          language: normalizedLang
        })
        .then((fetched) => {
          if (mountedRef.current && fetched) {
            setDetails(fetched);
          }
        })
        .catch((err) => {
          console.warn('[TVEpisodeCard] Error fetching episode details:', err);
        })
        .finally(() => {
          fetchingRef.current = false;
        });
    }
  }, [episode?.airDate, episode?.voteAverage, details, onLoadEpisodeDetails, sId, sNum, epNum, normalizedLang]);

  // Se la card è configurata espansa al montaggio, recupera i dettagli se mancanti
  useEffect(() => {
    if (defaultExpanded) {
      fetchDetailsIfMissing();
    }
  }, [defaultExpanded, fetchDetailsIfMissing]);

  if (!episode) return null;

  const epTitle = episode.getName?.(langKey) || episode.name || formatTranslation(t('detail.episodeLabel'), { number: epNum });
  const epOverview = episode.getOverview?.(langKey) || episode.overview || t('detail.overviewUnavailable');
  const stillSrc = episode.getStillUrl?.(langKey) || episode.stillUrl || IMAGE_PLACEHOLDERS.STILL;

  const runtime = details?.runtime ?? episode.runtime;
  const airDate = details?.airDate || episode.airDate;
  const formattedAirDate = airDate ? formatDate(airDate, langKey) : null;

  const vote = details?.voteAverage ?? episode.voteAverage;
  const rating = vote > 0 ? Number(vote).toFixed(1) : null;

  const episodeLink = sId && sNum != null ? `/Cameos/series/${sId}/season/${sNum}/episode/${epNum}` : '#';

  const handleToggleClick = (e) => {
    e.stopPropagation();
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) {
      fetchDetailsIfMissing();
    }
  };

  const handleCardClick = () => {
    if (isTouchDevice) {
      const next = !isExpanded;
      setIsExpanded(next);
      if (next) {
        fetchDetailsIfMissing();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (isTouchDevice && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      const next = !isExpanded;
      setIsExpanded(next);
      if (next) {
        fetchDetailsIfMissing();
      }
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
          className="fw-bold text-white mb-0 text-truncate tv-episode-title"
          title={epTitle}
        >
          {epTitle}
        </h6>
      </div>

      <div className={`d-flex align-items-center gap-2 flex-shrink-0 ms-auto ${isMobile ? 'tv-episode-header-actions' : ''}`}>
        {runtime ? (
          <span className="text-white-50 small fw-medium tv-episode-meta-text">
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
            className={`bi bi-chevron-up text-white media-card-collapse-icon tv-episode-collapse-icon ${
              !isExpanded ? 'is-collapsed' : ''
            }`}
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
          <span className="text-white-50 small tv-episode-meta-text">
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
          <div className="text-white-50 small tv-episode-overview-collapsed pt-1">
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
              <div className="text-white-50 small tv-episode-overview-expanded">
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
                <div className="text-white-50 small tv-episode-overview-expanded">
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
  defaultExpanded: PropTypes.bool,
  onLoadEpisodeDetails: PropTypes.func
};
