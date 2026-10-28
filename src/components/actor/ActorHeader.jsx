import { IMAGE_PLACEHOLDERS } from '../../models/index.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { formatTranslation } from '../../utils/translationUtils.js';
import '../../css/actor/actorHeader.css';

export default function ActorHeader({ person }) {
  const { t, langKey } = useTranslation();
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

  return (
    <section className="actor-header w-100">
      {/* HEADER PROFILO ATTORE */}
      <div className="actor-header-layout">
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
          <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
            <span className="badge rounded-pill bg-success px-3 py-1 fw-bold">
              {departments[person.knownForDepartment] || person.knownForDepartment || t('actor.acting')}
            </span>
            <span className={`badge rounded-pill px-3 py-1 ${isAlive ? 'bg-primary' : 'bg-secondary'}`}>
              {statusLife}
            </span>
            {person.popularity > 0 && (
              <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold">
                {formatTranslation(t('actor.popularity'), { value: person.popularity.toFixed(1) })}
              </span>
            )}
          </div>

          <h1 className="display-4 fw-bold text-white mb-2 actor-header-name">{person.name}</h1>

          <div className="d-flex flex-wrap gap-3 text-white-50 small mb-3">
            {person.birthday && (
              <span>
                <i className="bi bi-calendar3 me-1 text-success"></i> {t('detail.dateOfBirth')}: {person.birthday}
              </span>
            )}
            {person.placeOfBirth && (
              <span>
                <i className="bi bi-geo-alt me-1 text-success"></i> {t('detail.placeOfBirth')}: {person.placeOfBirth}
              </span>
            )}
          </div>

          {/* ALIAS & NOMI NOTI */}
          {(person.alsoKnownAs || []).length > 0 && (
            <div className="d-flex flex-wrap gap-1 mt-3">
              <small className="text-white-50 me-2">{t('detail.alsoKnownAs')}</small>
              {person.alsoKnownAs.slice(0, 4).map((alias) => (
                <span key={alias} className="badge bg-dark text-white-50 border border-secondary border-opacity-25 small">
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
