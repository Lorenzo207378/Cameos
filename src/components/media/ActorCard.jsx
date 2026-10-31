import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Cameo, IMAGE_PLACEHOLDERS, getProfileSrc } from '../../models/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/text.css';
import '../../css/media/castCarousel.css';

/**
 * ActorCard
 * Scheda attore per carosello orizzontale (avatar circolare, nome e ruolo).
 * Supporta varianti: 'cast' (standard) o 'cameo' (con voce uncredited sopra l'avatar).
 *
 * @param {Object} props
 * @param {Object} props.member - Dati attore o cameo
 * @param {'cast'|'cameo'} [props.variant='cast'] - Variante di visualizzazione
 * @param {string} [props.className=''] - Classi CSS addizionali
 */
export default function ActorCard({ member, variant = 'cast', className = '' }) {
  const { t, langKey } = useTranslation();
  if (!member) return null;

  const item = (variant === 'cameo' && !(member instanceof Cameo)) ? new Cameo(member) : member;

  const actorName = item.name || item.original_name || t('common.actor');
  const character = item.character || item.role || t('common.role');
  const profileSrc = getProfileSrc(item, langKey);
  const actorLink = item.id ? `/Cameos/actor/${item.id}` : null;
  const uncreditedLabel = t('cards.uncredited');

  const cardContent = (
    <>
      {variant === 'cameo' && item.isUncredited && (
        <span className="cast-card-uncredited text-warning small fw-bold d-block text-truncate" title={uncreditedLabel}>
          {uncreditedLabel}
        </span>
      )}
      <div className="cast-card-avatar rounded-circle overflow-hidden mx-auto mb-2 bg-dark shadow-sm border border-secondary border-opacity-25">
        <img
          src={profileSrc}
          alt={actorName}
          className="w-100 h-100 object-fit-cover"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = IMAGE_PLACEHOLDERS.PROFILE;
          }}
        />
      </div>
      <h5 className="fw-bold text-white mb-0 cast-card-name" title={actorName}>
        {actorName}
      </h5>
      <small className="d-block cast-card-character" title={character}>
        {character}
      </small>
    </>
  );

  return (
    <div className={`cast-card flex-shrink-0 text-center ${className}`}>
      {actorLink ? (
        <Link
          to={actorLink}
          className="cast-card-link text-decoration-none text-white d-block"
        >
          {cardContent}
        </Link>
      ) : (
        <div className="cast-card-link text-white d-block">
          {cardContent}
        </div>
      )}
    </div>
  );
}

ActorCard.propTypes = {
  member: PropTypes.object,
  variant: PropTypes.oneOf(['cast', 'cameo']),
  className: PropTypes.string
};
