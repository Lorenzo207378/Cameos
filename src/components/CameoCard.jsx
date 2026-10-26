import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { Link } from 'react-router-dom';

/**
 * CameoCard
 * Scheda per un'apparizione speciale o easter egg cameo in un film, serie o episodio.
 * @param {Object} props
 * @param {import('../models/Cameo.js').Cameo|Object} props.cameo
 */
export default function CameoCard({ cameo }) {
  if (!cameo) return null;

  const actorId = cameo.id;
  const actorName = cameo.name || 'Attore';
  const character = cameo.character || 'Cameo';
  const badgeText = cameo.cameoBadge || cameo.badge || 'Cameo Speciale';
  const roleDescription = cameo.role || cameo.description || cameo.overview;

  const profileSrc =
    (typeof cameo.getProfileUrl === 'function' ? cameo.getProfileUrl('it') : null) ||
    cameo.profileUrl?.it ||
    cameo.profileUrl?.en ||
    (typeof cameo.profileUrl === 'string' ? cameo.profileUrl : null) ||
    IMAGE_PLACEHOLDERS.PROFILE;

  const actorDetailPath = actorId ? `/Cameos/actor/${actorId}` : null;

  return (
    <div className="card-2pxb-dark-background rounded-4 p-3 h-100 text-white shadow-sm d-flex flex-column justify-content-between">
      <div className="d-flex gap-3 align-items-start mb-3">
        <div
          className="rounded-3 overflow-hidden flex-shrink-0 bg-dark shadow-sm"
          style={{ width: '70px', height: '95px' }}
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

        <div className="flex-grow-1 min-w-0">
          <div className="d-flex justify-content-between align-items-start gap-1 mb-1">
            <h5 className="h6 fw-bold text-white mb-0 text-truncate" title={actorName}>
              {actorDetailPath ? (
                <Link to={actorDetailPath} className="text-white text-decoration-none hover-primary">
                  {actorName}
                </Link>
              ) : (
                actorName
              )}
            </h5>
          </div>

          <p className="text-warning small fw-semibold mb-2 text-truncate" title={character}>
            {character}
          </p>

          <span className="badge rounded-pill bg-success bg-opacity-25 text-success border border-success border-opacity-25 px-2 py-1 small">
            <i className="bi bi-stars me-1"></i> {badgeText}
          </span>
        </div>
      </div>

      {roleDescription && (
        <div className="bg-dark bg-opacity-50 rounded-3 p-2 border border-secondary border-opacity-25 mb-3">
          <small className="text-white-50" style={{ fontSize: '12px', lineHeight: '1.4', display: 'block' }}>
            {roleDescription}
          </small>
        </div>
      )}

      {actorDetailPath && (
        <div className="pt-2 border-top border-secondary border-opacity-25 text-end">
          <Link to={actorDetailPath} className="btn btn-sm btn-outline-success rounded-pill px-3 py-1 text-nowrap" style={{ fontSize: '12px' }}>
            Profilo Attore <i className="bi bi-arrow-right ms-1"></i>
          </Link>
        </div>
      )}
    </div>
  );
}
