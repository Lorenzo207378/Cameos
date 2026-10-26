import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * CastCarousel
 * Carosello orizzontale degli attori del cast con foto, nome e personaggio.
 * Ciascun attore rimanda a ActorDetail (/Cameos/actor/:id).
 * @param {Object} props
 * @param {Array<Object>} props.cast
 * @param {string} [props.title='Cast & Attori']
 */
export default function CastCarousel({ cast = [], title = 'Cast & Interpreti' }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -300 : 300,
      behavior: 'smooth'
    });
  };

  if (!cast || cast.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="h4 text-white fw-bold mb-0">{title}</h3>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
            style={{ width: '32px', height: '32px' }}
            onClick={() => scroll('left')}
            aria-label="Scorri indietro cast"
          >
            <i className="bi bi-chevron-left text-white"></i>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-dark rounded-circle d-flex align-items-center justify-content-center border-secondary border-opacity-25"
            style={{ width: '32px', height: '32px' }}
            onClick={() => scroll('right')}
            aria-label="Scorri avanti cast"
          >
            <i className="bi bi-chevron-right text-white"></i>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="d-flex gap-3 overflow-x-auto pb-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {cast.slice(0, 20).map((member, idx) => {
          const profileSrc =
            member.profileUrl?.it ||
            member.profileUrl?.en ||
            (typeof member.profileUrl === 'string' ? member.profileUrl : null) ||
            (member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : null) ||
            IMAGE_PLACEHOLDERS.PROFILE;

          const actorId = member.id || idx;
          const actorName = member.name || member.original_name || 'Attore';
          const character = member.character || member.roles?.[0]?.character || 'Ruolo';

          return (
            <div
              key={actorId + '-' + idx}
              className="flex-shrink-0 text-center"
              style={{ width: '130px', scrollSnapAlign: 'start' }}
            >
              <Link
                to={`/Cameos/actor/${actorId}`}
                className="text-decoration-none text-white d-block hover-scale"
              >
                <div
                  className="rounded-circle overflow-hidden mx-auto mb-2 bg-dark shadow-sm border border-secondary border-opacity-25"
                  style={{ width: '90px', height: '90px' }}
                >
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
                <h5 className="h6 fw-bold text-white mb-0 text-truncate" title={actorName} style={{ fontSize: '13px' }}>
                  {actorName}
                </h5>
                <small className="text-white-50 text-truncate d-block" title={character} style={{ fontSize: '11px' }}>
                  {character}
                </small>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
