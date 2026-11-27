import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import MediaPreferencesBar from '../media/MediaPreferencesBar.jsx';
import { useKeepExpandedCardAnchored } from '../../utils/domUtils.js';
import { resolveEpisodeView } from '../../utils/formatters.js';
import { APP_ROUTES } from '../../utils/appRoutes.js';
import { IMAGE_PLACEHOLDERS } from '../../models/utils/index.js';
import '../../css/common/mediaIconButton.css';
import '../../css/tv/tvSeasonsSection.css';

/**
 * TVEpisodeCard
 * Scheda episodio con supporto collasso/espansione, fotogramma still,
 * messa in onda, valutazione a pillola e pulsante dettagli episodio.
 * @param {Object} props
 * @param {import('../../models/Episode.js').Episode|Object<string, *>} props.episode
 * @param {number|string} [props.seriesId]
 * @param {number|string} [props.seasonNumber]
 * @param {boolean} [props.defaultExpanded=false]
 * @param {(params: Object) => Promise<import('../../models/Episode.js').Episode|null>} [props.onLoadEpisodeDetails]
 * @returns {import('react').ReactElement|null}
 */
export default function TVEpisodeCard({
  episode,
  seriesId = undefined,
  seasonNumber = undefined,
  defaultExpanded = false,
  onLoadEpisodeDetails = undefined
}) {
  const { t, langKey, normalizedLang, formatTranslation } = useTranslation();
  const { isMobile } = useDevice();

  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [details, setDetails] = useState(/** @type {import('../../models/Episode.js').Episode|null} */ (null));
  const cardRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const epNum = episode?.episodeNumber ?? 1;
  const sId = episode?.seriesId || seriesId;
  const sNum = episode?.seasonNumber ?? seasonNumber;
  const episodePreferenceTarget = useMemo(() => ({
    mediaType: 'episode',
    seriesId: sId,
    seasonNumber: sNum,
    episodeNumber: epNum
  }), [sId, sNum, epNum]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDetailsIfMissing = useCallback(() => {
    const hasData = Boolean(episode?.airDate && episode?.voteAverage);
    if (hasData || details || fetchingRef.current || !onLoadEpisodeDetails || !sId || sNum === null || sNum === undefined) {
      return;
    }
    fetchingRef.current = true;
    onLoadEpisodeDetails({ seriesId: sId, seasonNumber: sNum, episodeNumber: epNum, language: normalizedLang })
      .then((fetched) => {
        if (mountedRef.current && fetched) setDetails(fetched);
      })
      .catch((err) => {
        console.warn('[TVEpisodeCard] Error fetching episode details:', err);
      })
      .finally(() => {
        fetchingRef.current = false;
      });
  }, [episode?.airDate, episode?.voteAverage, details, onLoadEpisodeDetails, sId, sNum, epNum, normalizedLang]);

  useEffect(() => {
    if (defaultExpanded) fetchDetailsIfMissing();
  }, [defaultExpanded, fetchDetailsIfMissing]);

  useKeepExpandedCardAnchored(cardRef, isExpanded);

  if (!episode) return null;

  const { epTitle, epOverview, stillSrc, runtime, formattedAirDate, rating } = resolveEpisodeView(
    episode, details, { epNum, langKey, normalizedLang, t, formatTranslation }
  );
  const episodeLink = sId && sNum !== null && sNum !== undefined ? APP_ROUTES.episode(sId, sNum, epNum) : '#';

  const toggleExpand = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next) fetchDetailsIfMissing();
  };

  const stillImage = (
    <img
      src={stillSrc}
      alt={epTitle}
      className="w-100 h-100 object-fit-cover"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.src = IMAGE_PLACEHOLDERS.STILL;
      }}
    />
  );

  const ratingPill = rating ? (
    <span className="badge rounded-pill bg-warning text-dark tv-episode-rating-pill shadow-sm">
      <i className="bi bi-star-fill" aria-hidden="true" /> {rating}
    </span>
  ) : null;

  const detailsLink = (
    <Link
      to={episodeLink}
      onClick={(e) => e.stopPropagation()}
      className={`tv-episode-details-btn fw-semibold text-decoration-none d-inline-flex align-items-center gap-1${isMobile ? '' : ' ms-auto'}`}
    >
      {t('detail.episodeDetails')} <i className="bi bi-chevron-right" aria-hidden="true" />
    </Link>
  );

  return (
    <div
      ref={cardRef}
      className={`tv-episode-card bg-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-3 p-2 p-md-3 w-100 ${
        isExpanded ? 'is-expanded' : ''
      }`}
      onClick={toggleExpand}
    >
      {/* Riga superiore (pill numero, titolo, durata e pulsante collasso) */}
      <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
        <div className="d-flex align-items-center gap-2 min-w-0 flex-wrap">
          <span className="badge bg-secondary bg-opacity-50 text-white-50 fw-semibold flex-shrink-0 tv-episode-pill">
            Ep. {epNum}
          </span>
          <h6 className="fw-bold text-white mb-0 text-truncate tv-episode-title" title={epTitle}>
            {epTitle}
          </h6>
        </div>

        <div className={`d-flex align-items-center gap-2 flex-shrink-0 ms-auto ${isMobile ? 'tv-episode-header-actions' : ''}`}>
          {runtime ? (
            <span className="text-white-50 small fw-medium tv-episode-meta-text">
              {runtime}{t('detail.minShort')}
            </span>
          ) : null}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="media-icon-button tv-episode-collapse-btn"
            aria-label={isExpanded ? t('detail.collapse') : t('detail.expand')}
            aria-expanded={isExpanded}
            title={isExpanded ? t('detail.collapse') : t('detail.expand')}
          >
            <i
              className={`bi bi-chevron-up text-white media-card-collapse-icon tv-episode-collapse-icon ${
                !isExpanded ? 'is-collapsed' : ''
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* VISTA COLLASSATA */}
      <div className={`media-collapse-wrapper ${isExpanded ? 'collapsed' : ''}`}>
        <div className="media-collapse-inner">
          <div className="text-white-50 small tv-episode-overview-collapsed pt-1">
            {epOverview}
          </div>
        </div>
      </div>

      {/* VISTA ESPANSA */}
      <div className={`media-collapse-wrapper ${!isExpanded ? 'collapsed' : ''}`}>
        <div className="media-collapse-inner">
          {isMobile ? (
            <div className="tv-episode-expanded-mobile pt-2 d-flex flex-column gap-2">
              <div className="tv-episode-mobile-media-row d-flex align-items-start gap-2">
                <div className="tv-episode-still-container tv-episode-still-mobile rounded-2 overflow-hidden bg-dark shadow-sm">
                  {stillImage}
                </div>

                <div className="tv-episode-mobile-meta d-flex flex-column gap-1 flex-grow-1 min-w-0">
                  {formattedAirDate && (
                    <div className="tv-episode-air-date-block d-flex flex-column gap-1">
                      <span className="tv-episode-air-date-label d-block">{t('detail.airedLabel')}</span>
                      <span className="tv-episode-air-date-val d-block">{formattedAirDate}</span>
                    </div>
                  )}
                  {ratingPill && <div className="pt-1">{ratingPill}</div>}
                </div>
              </div>

              <div className="text-white-50 small tv-episode-overview-expanded">{epOverview}</div>

              <div className="tv-episode-mobile-btn-row d-flex justify-content-end mt-2">
                {detailsLink}
              </div>
            </div>
          ) : (
            <div className="tv-episode-expanded-body d-flex align-items-center gap-3 pt-2">
              <div className="tv-episode-still-container rounded-2 overflow-hidden bg-dark shadow-sm">
                {stillImage}
              </div>

              <div className="tv-episode-expanded-content d-flex flex-column flex-grow-1 min-w-0">
                <div className="text-white-50 small tv-episode-overview-expanded">{epOverview}</div>
                <div className="tv-episode-meta-row d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2 pt-0">
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    {formattedAirDate && (
                      <span className="text-white-50 small tv-episode-meta-text">
                        {formatTranslation(t('detail.airedOnPrefix'), { date: formattedAirDate })}
                      </span>
                    )}
                    {ratingPill}
                  </div>
                  {detailsLink}
                </div>
              </div>
            </div>
          )}
          {isExpanded && (
            <div className="tv-episode-preferences mt-2" onClick={(event) => event.stopPropagation()}>
              <MediaPreferencesBar target={episodePreferenceTarget} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

TVEpisodeCard.propTypes = {
  episode: PropTypes.object,
  seriesId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  seasonNumber: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultExpanded: PropTypes.bool,
  onLoadEpisodeDetails: PropTypes.func
};
