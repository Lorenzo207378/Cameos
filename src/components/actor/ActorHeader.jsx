import { IMAGE_PLACEHOLDERS } from '../../models/utils/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { formatDate, calculateAge } from '../../utils/formatters.js';
import '../../css/actor/actorHeader.css';

export default function ActorHeader({ person, onGoBack, className = '' }) {
  const { t, langKey, language, formatTranslation } = useTranslation();
  if (!person) return null;

  const profileSrc = person.getProfileUrl(langKey);
  const isAlive = person.isAlive;
  const statusLife = isAlive
    ? t('detail.alive')
    : formatTranslation(t('detail.deceased'), { year: (person.deathday || '').slice(0, 4) });
  const departments = {
    Acting: t('actor.acting'),
    Directing: t('detail.directing'),
    Writing: t('detail.writing')
  };

  const formattedBirthday = person.birthday ? formatDate(person.birthday, language || langKey) : null;
  const age = (isAlive && person.birthday) ? calculateAge(person.birthday) : null;

  return (
    <section className={`actor-header w-100 ${className}`.trim()}>
      {/* HEADER PROFILO ATTORE */}
      <div className="actor-header-layout">
        <div className="actor-header-top-bar">
          {onGoBack && (
            <div className="actor-header-nav">
              <button
                type="button"
                onClick={onGoBack}
                className="btn btn-dark rounded-circle d-flex align-items-center justify-content-center back-btn flex-shrink-0"
                aria-label={t('detail.goBack')}
                title={t('detail.goBack')}
              >
                <i className="bi bi-arrow-left text-white" />
              </button>
            </div>
          )}

          {/* DATI: PILLS (DIPARTIMENTO, STATO, POPOLARITA) */}
          <div className="actor-header-pills">
            <span className="badge rounded-pill bg-success fw-bold">
              {departments[person.knownForDepartment] || person.knownForDepartment || t('actor.acting')}
            </span>
            <span className={`badge rounded-pill ${isAlive ? 'bg-primary' : 'bg-secondary'}`}>
              {statusLife}
            </span>
            {person.popularity > 0 && (
              <span className="badge rounded-pill bg-warning text-dark fw-bold">
                <span className="d-none d-sm-inline">
                  {formatTranslation(t('actor.popularity'), { value: person.popularity.toFixed(1) })}
                </span>
                <span className="d-inline d-sm-none">
                  <i className="bi bi-star-fill me-1" />
                  {person.popularity.toFixed(1)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* FOTO PROFILO */}
        <div className="actor-header-photo">
          <div
            className="actor-header-portrait rounded-4 overflow-hidden bg-dark shadow-lg border border-secondary border-opacity-25"
          >
            <img
              src={profileSrc}
              alt={person.name}
              className="w-100 h-100 object-fit-cover"
              onError={(e) => {
                e.currentTarget.src = IMAGE_PLACEHOLDERS.PROFILE;
              }}
            />
          </div>
        </div>

        {/* DATI & BIOGRAFIA */}
        <div className="actor-header-info text-white">
          <h1 className="fw-bold text-white mb-2 actor-header-name">{person.name}</h1>

          <div className="actor-header-meta d-flex flex-wrap gap-2 gap-md-3 text-white-50 mb-2 mb-md-3">
            {person.birthday && (
              <span className="d-inline-flex align-items-center flex-wrap">
                <i className="bi bi-calendar3 me-1 text-success"></i>
                <span>{t('detail.dateOfBirth')}: {formattedBirthday}</span>
                {isAlive && age !== null && (
                  <span className="ms-1 text-white-50">
                    • {formatTranslation(t('actor.age'), { age })}
                  </span>
                )}
              </span>
            )}
            {person.placeOfBirth && (
              <span className="d-inline-flex align-items-center">
                <i className="bi bi-geo-alt me-1 text-success"></i>
                <span>{person.placeOfBirth}</span>
              </span>
            )}
          </div>

          {/* ALIAS & NOMI NOTI */}
          {(person.alsoKnownAs || []).length > 0 && (
            <div className="actor-header-aliases mt-2 mt-md-3">
              <span className="actor-header-alias-label text-white-50 me-1">
                {t('detail.alsoKnownAs')}:
              </span>
              {person.alsoKnownAs.slice(0, 4).map((alias) => (
                <span key={alias} className="badge bg-dark text-white-50 border border-secondary border-opacity-25 actor-header-alias-pill">
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
