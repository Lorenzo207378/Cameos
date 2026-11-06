import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { IMAGE_PLACEHOLDERS, getProfileSrc } from '../../models/utils/modelUtils.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/text.css';
import '../../css/media/castCarousel.css';

/**
 * PersonCard
 * Scheda attore per carosello orizzontale (avatar circolare, nome e ruolo).
 * Supporta varianti: 'cast' (standard) o 'cameo' (con voce uncredited sopra l'avatar).
 *
 * @param {Object} props
 * @param {Object<string, *>} props.member - Dati persona o cameo, con personCredits opzionale per il contesto della filmografia.
 * @param {'cast'|'cameo'} [props.variant='cast'] - Variante di visualizzazione
 * @param {string} [props.className=''] - Classi CSS addizionali
 * @param {boolean} [props.showRole=true] Show the character/role caption and expansion control.
 * @returns {import('react').JSX.Element|null}
 */
export default function PersonCard({ member, variant = 'cast', className = '', showRole = true }) {
  const { t, langKey } = useTranslation();
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [rolesOverflow, setRolesOverflow] = useState(false);
  const rolesRef = useRef(null);
  const rolesId = useId();

  const character = member ? member.character || member.role || t('common.role') : '';

  useEffect(() => {
    const element = rolesRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(() => {
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
      setRolesOverflow(element.scrollHeight > lineHeight * 4 + 1);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [character, member, showRole]);

  if (!member) return null;

  const { isUncredited } = member;
  const actorName = member.name || t('common.actor');
  const profileSrc = getProfileSrc(member, langKey);
  const actorLink = member.id
    ? `/Cameos/person/${member.id}${member.personCredits ? `?credits=${member.personCredits}` : ''}` : null;
  const uncreditedLabel = t('cards.uncredited');

  const cardContent = (
    <>
      {variant === 'cameo' && (
        <div className="cast-card-uncredited-slot">
          {isUncredited && (
            <span className="cast-card-uncredited text-warning small fw-bold d-block text-truncate" title={uncreditedLabel}>
              {uncreditedLabel}
            </span>
          )}
        </div>
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
      {showRole && (
        <small
          ref={rolesRef}
          id={rolesId}
          className={`cast-card-character${rolesExpanded ? ' is-expanded' : ''}`}
          title={character}
        >
          {character}
        </small>
      )}
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
      {showRole && rolesOverflow && (
        <button
          type="button"
          className="cast-card-roles-toggle"
          aria-expanded={rolesExpanded}
          aria-controls={rolesId}
          onClick={() => setRolesExpanded((expanded) => !expanded)}
        >
          {rolesExpanded ? t('common.seeLess') : t('common.seeMore')}
          <i
            className={`bi bi-chevron-up media-card-collapse-icon${rolesExpanded ? '' : ' is-collapsed'}`}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}

PersonCard.propTypes = {
  member: PropTypes.object,
  variant: PropTypes.oneOf(['cast', 'cameo']),
  className: PropTypes.string,
  showRole: PropTypes.bool
};
