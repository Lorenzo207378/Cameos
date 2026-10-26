import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CameoCard from '../components/CameoCard.jsx';
import { getPersonById, CATALOG_PERSON_STAN_LEE } from '../data/catalogData.js';

export default function ActorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const person = useMemo(() => {
    return getPersonById(id) || CATALOG_PERSON_STAN_LEE;
  }, [id]);

  if (!person) return null;

  const profileSrc =
    (typeof person.getProfileUrl === 'function' ? person.getProfileUrl('it') : null) ||
    person.profileUrl?.it ||
    person.profileUrl?.en ||
    (typeof person.profileUrl === 'string' ? person.profileUrl : null) ||
    IMAGE_PLACEHOLDERS.PROFILE;

  const isAlive = person.deathday === null || person.isAlive;
  const statusLife = isAlive ? 'In Vita' : `Deceduto (${(person.deathday || '').slice(0, 4)})`;

  const bioText = person.biography || 'Biografia al momento non disponibile.';
  const shortBio = bioText.length > 320 ? `${bioText.slice(0, 320)}...` : bioText;

  const careerCameos = person.careerCameos || [];

  // Movie credits and TV credits
  const movieCredits = person.movieCredits?.cast || [];
  const tvCredits = person.tvCredits?.cast || [];

  return (
    <div className="actor-detail-page w-100 px-3 px-md-4 px-xl-5 py-4 pb-5">
      {/* HEADER PROFILO ATTORE */}
      <section className="position-relative rounded-4 mb-5 p-4 p-md-5 card-2pxb-dark-background shadow-lg overflow-hidden">
        {/* PULSANTE INDIETRO CIRCOLARE */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="position-absolute top-0 start-0 m-3 btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center z-3 border border-secondary border-opacity-50"
          style={{ width: '44px', height: '44px' }}
          aria-label="Torna indietro"
        >
          <i className="bi bi-arrow-left text-white fs-5"></i>
        </button>

        <div className="row align-items-center g-4 pt-4 pt-md-2">
          {/* FOTO PROFILO */}
          <div className="col-12 col-sm-4 col-md-3 text-center text-sm-start">
            <div
              className="rounded-4 overflow-hidden mx-auto mx-sm-0 bg-dark shadow-lg border border-secondary border-opacity-25"
              style={{ width: '180px', height: '240px' }}
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
          <div className="col-12 col-sm-8 col-md-9 text-white">
            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
              <span className="badge rounded-pill bg-success px-3 py-1 fw-bold">
                {person.knownForDepartment || 'Recitazione'}
              </span>
              <span className={`badge rounded-pill px-3 py-1 ${isAlive ? 'bg-primary' : 'bg-secondary'}`}>
                {statusLife}
              </span>
              {person.popularity > 0 && (
                <span className="badge rounded-pill bg-warning text-dark px-3 py-1 fw-bold">
                  Popolarità: {person.popularity.toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="display-4 fw-bold text-white mb-2">{person.name}</h1>

            <div className="d-flex flex-wrap gap-3 text-white-50 small mb-3">
              {person.birthday && (
                <span>
                  <i className="bi bi-calendar3 me-1 text-success"></i> Nato: {person.birthday}
                </span>
              )}
              {person.placeOfBirth && (
                <span>
                  <i className="bi bi-geo-alt me-1 text-success"></i> Luogo: {person.placeOfBirth}
                </span>
              )}
            </div>

            {/* BIOGRAFIA CLICCABILE */}
            <p className="text-white-50 lead fs-6 mb-2" style={{ lineHeight: '1.7' }}>
              {isBioExpanded ? bioText : shortBio}
            </p>
            {bioText.length > 320 && (
              <button
                type="button"
                onClick={() => setIsBioExpanded((prev) => !prev)}
                className="btn btn-link text-success p-0 fw-semibold text-decoration-none small d-flex align-items-center gap-1"
              >
                <span>{isBioExpanded ? 'Mostra meno biografia' : 'Leggi tutta la biografia'}</span>
                <i className={`bi bi-chevron-${isBioExpanded ? 'up' : 'down'}`}></i>
              </button>
            )}

            {/* ALIAS & NOMI NOTI */}
            {(person.alsoKnownAs || []).length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-3">
                <small className="text-white-50 me-2">Noto anche come:</small>
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

      {/* SEZIONE: CAMEI DELLA CARRIERA */}
      {careerCameos.length > 0 && (
        <section className="mb-5">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-stars text-warning fs-4"></i>
            <h3 className="h4 text-white fw-bold mb-0">Camei Celebri & Apparizioni Storiche</h3>
          </div>
          <div className="row g-4">
            {careerCameos.map((c) => (
              <div className="col-12 col-md-6" key={c.id + '-' + c.mediaTitle}>
                <CameoCard cameo={c} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEZIONE: FILMOGRAFIA NOTA */}
      {(movieCredits.length > 0 || tvCredits.length > 0) && (
        <section className="mb-5">
          <h3 className="h4 text-white fw-bold mb-4">Filmografia & Crediti Selezionati</h3>
          <div className="row g-3">
            {[...movieCredits, ...tvCredits].slice(0, 12).map((item, idx) => {
              const posterSrc = item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : IMAGE_PLACEHOLDERS.POSTER;
              const title = item.title || item.name || 'Titolo';
              const isFilm = Boolean(item.title);
              const path = isFilm ? `/Cameos/films/${item.id}` : `/Cameos/series/${item.id}`;

              return (
                <div className="col-6 col-sm-4 col-md-3 col-lg-2" key={item.id + '-' + idx}>
                  <Link to={path} className="text-decoration-none text-white d-block hover-scale">
                    <div
                      className="rounded-3 overflow-hidden bg-dark position-relative shadow-sm mb-2"
                      style={{ aspectRatio: '2/3' }}
                    >
                      <img src={posterSrc} alt={title} className="w-100 h-100 object-fit-cover" loading="lazy" />
                      <span className="position-absolute top-0 end-0 m-1 badge bg-dark bg-opacity-75 text-warning small">
                        ★ {(item.vote_average || 7.5).toFixed(1)}
                      </span>
                    </div>
                    <h6 className="fw-bold text-white mb-0 text-truncate small" title={title}>
                      {title}
                    </h6>
                    <small className="text-white-50 text-truncate d-block" style={{ fontSize: '11px' }}>
                      {item.character || (isFilm ? 'Film' : 'Serie TV')}
                    </small>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
