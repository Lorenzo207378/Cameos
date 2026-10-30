import { IMAGE_PLACEHOLDERS } from '../../models/index.js';
import '../../css/common/text.css';
import '../../css/media/cameoCard.css';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../utils/translations.js';

/**
 * CameoCard
 * Scheda per un'apparizione speciale o easter egg cameo in un film, serie o episodio.
 * @param {Object} props
 * @param {import('../../models/Cameo.js').Cameo|Object} props.cameo
 * @param {'default'|'movie-detail'} [props.variant='default'] Movie details replace the film title with the actor action.
 */
export default function CameoCard({ cameo, className = '', variant = 'default' }) {
  const { t, langKey } = useTranslation();
  if (!cameo) return null;

  const actorId = cameo.id;
  const actorName = cameo.name || t('common.actor');
  const rawCharacter = cameo.character || t('cards.cameoBadge');

  const uncreditedRegex = /\s*\(\s*(uncredited|non accreditato)\s*\)/i;
  const isUncredited = Boolean(
    cameo.uncredited ||
    cameo.isUncredited ||
    uncreditedRegex.test(rawCharacter) ||
    uncreditedRegex.test(cameo.role || '')
  );

  // Rimuove l'indicazione (uncredited) dal ruolo del personaggio
  const character = rawCharacter
    .replace(/\s*\(\s*(uncredited|non accreditato)\s*\)/gi, '')
    .replace(/\b(uncredited|non accreditato)\b/gi, '')
    .trim() || t('cards.cameoBadge');

  const uncreditedLabel = t('cards.uncredited', '(uncredited)');
  const roleDescription = cameo.role || cameo.description || cameo.overview;

  const mediaTitle = cameo.mediaTitle || cameo.title;
  const mediaId = cameo.mediaId;
  const isMovie = cameo.mediaType !== 'tv' && cameo.mediaType !== 'series' && cameo.mediaType !== 'episode';
  const mediaDetailPath = mediaId ? (isMovie ? `/Cameos/movie/${mediaId}` : `/Cameos/series/${mediaId}`) : null;

  const profileSrc =
    (typeof cameo.getProfileUrl === 'function' ? cameo.getProfileUrl(langKey) : null) ||
    cameo.profileUrl?.[langKey] ||
    cameo.profileUrl?.it ||
    cameo.profileUrl?.en ||
    (typeof cameo.profileUrl === 'string' ? cameo.profileUrl : null) ||
    IMAGE_PLACEHOLDERS.PROFILE;

  const actorDetailPath = actorId ? `/Cameos/actor/${actorId}` : null;
  const isMovieDetail = variant === 'movie-detail';
  const actorAction = actorDetailPath ? (
    <Link
      to={actorDetailPath}
      className="btn btn-sm btn-outline-success rounded-pill px-3 py-1 cameo-card-action"
    >
      {t('cards.clickForActorDetails')} <i className="bi bi-arrow-right ms-1"></i>
    </Link>
  ) : null;

  return (
    <div
      className={`cameo-card card-2pxb-dark-background rounded-4 h-100 text-white shadow-sm d-flex flex-column justify-content-between position-relative ${className}`}
    >
      <div className="cameo-card-header d-flex align-items-center mb-1 min-w-0">
        <div
          className="cameo-card-profile rounded-3 overflow-hidden flex-shrink-0 bg-dark shadow-sm"
        >
          <img
            src={profileSrc}
            alt={actorName}
            className="w-100 h-100 object-fit-cover"
            onError={(e) => {
              e.currentTarget.src = IMAGE_PLACEHOLDERS.PROFILE;
            }}
          />
        </div>

        <div className="flex-grow-1 min-w-0 overflow-hidden ms-1">
          <div className="d-flex justify-content-between align-items-start gap-1 mb-1 min-w-0">
            <h5 className="fw-bold text-white mb-0 text-lines flex-grow-1 min-w-0" title={actorName}>
              {actorDetailPath ? (
                <Link to={actorDetailPath} className="text-white text-decoration-none hover-primary d-block">
                  {actorName}
                </Link>
              ) : (
                actorName
              )}
            </h5>
            {isUncredited && (
              <span
                className="badge rounded-pill bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1 flex-shrink-0 align-self-start cameo-uncredited-pill"
                title={uncreditedLabel}
              >
                {uncreditedLabel}
              </span>
            )}
          </div>

          <p className="text-warning fw-semibold mb-1 text-lines" title={character}>
            {character}
          </p>

          {isMovieDetail ? (
            actorAction && <div className="d-flex justify-content-end">{actorAction}</div>
          ) : mediaTitle && (
            <p className="text-white-50 mb-0 text-lines" title={mediaTitle}>
              <i className="bi bi-film me-1 text-secondary"></i>
              {mediaDetailPath ? (
                <Link to={mediaDetailPath} className="text-white-50 text-decoration-none hover-primary">
                  {mediaTitle}
                </Link>
              ) : (
                mediaTitle
              )}
            </p>
          )}
        </div>
      </div>

      {/* Testo del cameo centrato orizzontalmente ed interamente visibile senza troncature */}
      {roleDescription && (
        <div className="bg-dark bg-opacity-50 rounded-3 py-1 px-2 border border-secondary border-opacity-25 my-1 text-center">
          <p
            className="cameo-description text-white-50 mb-0 text-center"
            title={roleDescription}
          >
            {roleDescription}
          </p>
        </div>
      )}

      {!isMovieDetail && actorDetailPath && (
        <div className="pt-1 border-top border-secondary border-opacity-25 text-center mt-auto">
          {actorAction}
        </div>
      )}
    </div>
  );
}
