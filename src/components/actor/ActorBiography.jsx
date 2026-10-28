import { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorBiography.css';

const BIOGRAPHY_PREVIEW_LENGTH = 320;

export default function ActorBiography({ person }) {
  const { t } = useTranslation();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  if (!person) return null;

  const bioText = person.biography || t('detail.bioUnavailable');
  const shortBio = bioText.length > BIOGRAPHY_PREVIEW_LENGTH
    ? `${bioText.slice(0, BIOGRAPHY_PREVIEW_LENGTH)}...`
    : bioText;

  return (
    <section className="glass-card rounded-4 p-4 mb-5">
      <h2 className="h4 text-white fw-bold mb-3">{t('detail.biographyTitle')}</h2>
      {/* BIOGRAFIA CLICCABILE */}
      <p className="actor-biography-text text-white-50 lead fs-6 mb-2">
        {isBioExpanded ? bioText : shortBio}
      </p>
      {bioText.length > BIOGRAPHY_PREVIEW_LENGTH && (
        <button
          type="button"
          onClick={() => setIsBioExpanded((prev) => !prev)}
          aria-expanded={isBioExpanded}
          className="btn btn-link text-success p-0 fw-semibold text-decoration-none small d-flex align-items-center gap-1"
        >
          <span>{isBioExpanded ? t('detail.showLess') : t('detail.readMore')}</span>
          <i className={`bi bi-chevron-${isBioExpanded ? 'up' : 'down'}`}></i>
        </button>
      )}
    </section>
  );
}
