import { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorBiography.css';

export default function ActorBiography({ person }) {
  const { t } = useTranslation();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  if (!person) return null;

  const bioText = person.biography || t('detail.bioUnavailable');
  const isExpandable = Boolean(person.biography && person.biography.length > 120);

  return (
    <section className="glass-card rounded-4 actor-biography-card mb-4 mb-md-5">
      <h2 className="actor-biography-title text-white fw-bold mb-2">{t('detail.biographyTitle')}</h2>
      <p className={`actor-biography-text text-white-50 mb-2 ${isBioExpanded ? 'expanded' : 'collapsed'}`}>
        {bioText}
      </p>
      {isExpandable && (
        <button
          type="button"
          onClick={() => setIsBioExpanded((prev) => !prev)}
          aria-expanded={isBioExpanded}
          className="btn btn-link text-success p-0 fw-semibold text-decoration-none actor-biography-toggle d-flex align-items-center gap-1"
        >
          <span>{isBioExpanded ? t('detail.showLess') : t('detail.readMore')}</span>
          <i className={`bi bi-chevron-${isBioExpanded ? 'up' : 'down'}`}></i>
        </button>
      )}
    </section>
  );
}
