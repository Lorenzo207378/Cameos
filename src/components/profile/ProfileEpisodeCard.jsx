import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { IMAGE_PLACEHOLDERS } from '../../models/utils/index.js';

/**
 * ProfileEpisodeCard
 * Scheda compatta per episodi salvati o valutati nella pagina profilo.
 * @param {Object} props
 * @param {Object} props.episode
 * @param {number|null} [props.rating]
 * @returns {import('react').JSX.Element|null}
 */
export default function ProfileEpisodeCard({ episode, rating = undefined }) {
  const { t, langKey, formatTranslation } = useTranslation();

  if (!episode) return null;

  const still = episode.getStillUrl?.(langKey) || episode.stillUrl || null;
  const seasonNum = episode.seasonNumber ?? 0;
  const episodeNum = episode.episodeNumber ?? 1;
  const episodeLink = `/Cameos/series/${episode.seriesId}/season/${seasonNum}/episode/${episodeNum}`;
  const title = episode.getName?.(langKey) || episode.name || '';
  const overview = episode.getOverview?.(langKey) || t('common.noOverview');

  return (
    <Link to={episodeLink} className="profile-episode-card text-decoration-none text-white d-block">
      <div className="d-flex gap-3 align-items-start">
        {still ? (
          <img
            src={still}
            alt={title}
            className="profile-episode-thumb"
            onError={(e) => {
              e.currentTarget.src = IMAGE_PLACEHOLDERS.STILL;
            }}
          />
        ) : (
          <span className="profile-episode-placeholder" aria-hidden="true">
            <i className="bi bi-film" />
          </span>
        )}
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-1">
            <h5 className="fw-bold mb-0 text-white text-single-line profile-episode-title" title={title}>
              Ep. {episodeNum}: {title}
            </h5>
            {typeof rating === 'number' && rating > 0 && (
              <span className="badge rounded-pill profile-rating-badge">
                <i className="bi bi-star-fill me-1" aria-hidden="true" />
                {rating}/10
              </span>
            )}
          </div>
          <p className="text-white-50 mb-1 profile-episode-meta">
            {formatTranslation(t('detail.seriesIdLabel'), { id: episode.seriesId })} · {formatTranslation(t('detail.seasonLabel'), { number: seasonNum })}
          </p>
          <p className="mb-0 text-white-50 text-lines profile-episode-overview">
            {overview}
          </p>
        </div>
      </div>
    </Link>
  );
}

ProfileEpisodeCard.propTypes = {
  episode: PropTypes.object,
  rating: PropTypes.number
};
