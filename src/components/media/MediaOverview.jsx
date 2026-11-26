import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { useReviewViewModel } from '../../viewmodel/index.js';
import { normalizeMediaReference } from '../../models/utils/index.js';
import tmdbIconUrl from '../../assets/tmdb_icon.png';
import MediaRatingPill from './MediaRatingPill.jsx';
import '../../css/media/mediaOverview.css';
import '../../css/common/mediaIconButton.css';

const cameosIconUrl = `${import.meta.env?.BASE_URL || '/Cameos/'}app-icon.png`;

/**
 * Resolve normalized stats target reference for a Movie, Series, or Episode.
 * @param {'movie'|'tv'|'episode'} type
 * @param {number|string|null} mediaId
 * @param {number|string|null} seriesId
 * @param {number|string|null} seasonNumber
 * @param {number|string|null} episodeNumber
 */
function resolveMediaTarget(type, mediaId, seriesId, seasonNumber, episodeNumber) {
  try {
    if (type === 'episode') {
      if (seriesId === null || seasonNumber === null || episodeNumber === null) return null;
      return normalizeMediaReference({ mediaType: 'episode', seriesId, seasonNumber, episodeNumber });
    }
    if (!mediaId) return null;
    return normalizeMediaReference({ mediaType: type === 'movie' ? 'movie' : 'tv', mediaId });
  } catch {
    return null;
  }
}

/**
 * MediaOverview
 * Overview, genres, and TMDb + Cameos rating pills for a Movie, Series, or Episode model.
 * @param {Object} props
 * @param {Object} props.media
 * @param {'movie'|'tv'|'episode'} [props.type='movie']
 * @returns {import('react').ReactElement|null}
 */
export default function MediaOverview({ media, type = 'movie' }) {
  const { t, langKey, normalizedLang, formatTranslation } = useTranslation();
  const { isMobile } = useDevice();
  const { currentMediaStats, loadMediaStats } = useReviewViewModel({ language: normalizedLang });
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isMovie = type === 'movie';
  const isEpisode = type === 'episode';
  const isUpcoming = Boolean(media?.upcoming || media?.isUpcoming?.());
  const mediaId = media?.id ?? null;
  const seriesId = media?.seriesId ?? null;
  const seasonNumber = media?.seasonNumber ?? null;
  const episodeNumber = media?.episodeNumber ?? null;

  const targetInfo = useMemo(
    () => resolveMediaTarget(type, mediaId, seriesId, seasonNumber, episodeNumber),
    [type, mediaId, seriesId, seasonNumber, episodeNumber]
  );

  useEffect(() => {
    if (!targetInfo || isUpcoming) return;
    void loadMediaStats(targetInfo);
  }, [targetInfo, isUpcoming, loadMediaStats]);

  if (!media) return null;

  const overviewText = media.getOverview(langKey) || t('detail.overviewUnavailable');
  const releaseYear = (isMovie ? media.releaseDate : media.firstAirDate)?.slice(0, 4);
  const runtimeHours = isMovie ? media.getRuntime(langKey) : null;
  const genres = isEpisode ? [] : media.getGenres(langKey);
  const matchedStats = targetInfo && currentMediaStats?.targetKey === targetInfo.targetKey ? currentMediaStats : null;

  return (
    <div className={`glass-card rounded-4 p-3 p-md-4 shadow-sm position-relative media-overview-card ${isMobile && isCollapsed ? 'media-overview-collapsed' : ''}`}>
      {isMobile && (
        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="media-icon-button media-card-collapse-btn"
          aria-label={isCollapsed ? t('detail.expand') : t('detail.collapse')}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? t('detail.expand') : t('detail.collapse')}
        >
          <i className={`bi bi-chevron-up text-white media-card-collapse-icon ${isCollapsed ? 'is-collapsed' : ''}`} aria-hidden="true" />
        </button>
      )}

      {genres.length > 0 && (
        <div className="d-flex flex-wrap gap-2 gap-md-3 mb-2 mb-md-3 pe-5 pe-md-0 media-overview-genres">
          {genres.map((genre) => (
            <span
              key={genre.id || genre.name}
              className="genre-pill"
            >
              {genre.name}
            </span>
          ))}
        </div>
      )}

      <div className="media-overview-content">
        <h3 className="media-overview-title">
          {t('detail.synopsisTitle')}
        </h3>
        <div className={`media-collapse-wrapper ${isMobile && isCollapsed ? 'collapsed' : ''}`}>
          <div className="media-collapse-inner">
            <p className="media-overview-text mb-0 pt-2">
              {overviewText}
            </p>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center mt-2 mt-md-3 pt-2 pt-md-3 border-top border-white border-opacity-10 media-overview-meta-row">
        {isEpisode ? (
          <span className="badge rounded-pill bg-success fw-bold text-uppercase media-overview-type-badge">
            {formatTranslation(t('detail.seasonLabel'), { number: media.seasonNumber ?? 1 })} • {formatTranslation(t('detail.episodeLabel'), { number: media.episodeNumber ?? 1 })}
          </span>
        ) : (
          <>
            <span className="badge rounded-pill bg-success fw-bold text-uppercase media-overview-type-badge">
              {t(isMovie ? 'detail.moviesTab' : 'detail.tvSeriesTab')}
            </span>
            {isUpcoming && (
              <span className="badge rounded-pill bg-primary fw-bold text-uppercase media-overview-type-badge">
                {t('categories.upcoming')}
              </span>
            )}
            {releaseYear && (
              <span className="info-pill badge">
                {releaseYear}
              </span>
            )}
            {(isMovie ? runtimeHours : media.numberOfSeasons > 0) && (
              <span className="info-pill badge">
                {isMovie ? runtimeHours : formatTranslation(t(media.numberOfSeasons === 1 ? 'slider.seasonsCountSingle' : 'slider.seasonsCount'), { count: media.numberOfSeasons })}
              </span>
            )}
          </>
        )}
        {!isUpcoming && (
          <div className="media-overview-ratings-group d-inline-flex flex-wrap align-items-center gap-1 gap-md-2">
            <MediaRatingPill
              iconSrc={tmdbIconUrl}
              iconVariant="tmdb"
              rating={media?.voteAverage ?? media?.vote_average}
              voteCount={media?.voteCount ?? media?.vote_count}
              label={t('detail.tmdbRatingLabel')}
            />
            <MediaRatingPill
              iconSrc={cameosIconUrl}
              iconVariant="cameos"
              rating={matchedStats?.averageRating ?? 0}
              voteCount={matchedStats?.ratingCount ?? 0}
              label={t('detail.cameosRatingLabel')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

MediaOverview.propTypes = {
  media: PropTypes.object,
  type: PropTypes.oneOf(['movie', 'tv', 'episode'])
};
