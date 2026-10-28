import { IMAGE_PLACEHOLDERS } from '../../models/index.js';
import Carousel from '../Carousel.jsx';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/media/castCarousel.css';

/**
 * CastCarousel
 * Carosello orizzontale degli attori del cast con foto, nome e personaggio.
 * Ciascun attore rimanda a ActorDetail (/Cameos/actor/:id).
 * @param {Object} props
 * @param {Array<Object>} props.cast
 * @param {string} [props.title='Cast & Attori']
 */
export default function CastCarousel({ cast = [], title = 'Cast & Interpreti' }) {
  const { t } = useTranslation();
  if (!cast || cast.length === 0) return null;

  return (
    <Carousel
      header={<h3 className="h4 text-white fw-bold mb-0">{title}</h3>}
      trackClassName="cast-carousel-track"
      previousLabel={t('cast.scrollPrevious')}
      nextLabel={t('cast.scrollNext')}
      scrollDistance={300}
      itemCount={Math.min(cast.length, 20)}
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
            className="cast-card flex-shrink-0 text-center"
            style={{ width: '130px', scrollSnapAlign: 'start' }}
          >
            <Link
              to={`/Cameos/actor/${actorId}`}
              className="cast-card-link text-decoration-none text-white d-block"
            >
              <div
                className="cast-card-avatar rounded-circle overflow-hidden mx-auto mb-2 bg-dark shadow-sm border border-secondary border-opacity-25"
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
    </Carousel>
  );
}
