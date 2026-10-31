import PropTypes from 'prop-types';
import Carousel from '../Carousel.jsx';
import ActorCard from './ActorCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/text.css';
import '../../css/common/carouselControls.css';
import '../../css/media/castCarousel.css';

/**
 * CastCarousel
 * Carosello orizzontale degli attori del cast con foto, nome e personaggio.
 * @param {Object} props
 * @param {Array<Object>} props.cast
 * @param {string} [props.title='Cast & Interpreti']
 */
export default function CastCarousel({ cast = [], title = 'Cast & Interpreti' }) {
  const { t } = useTranslation();
  if (!cast || cast.length === 0) return null;

  return (
    <Carousel
      header={<h3 className="h4 text-white fw-bold mb-0 cast-carousel-title">{title}</h3>}
      trackClassName="cast-carousel-track carousel-edge-track"
      previousLabel={t('cast.scrollPrevious')}
      nextLabel={t('cast.scrollNext')}
      scrollDistance="page"
      itemCount={Math.min(cast.length, 20)}
    >
      {cast.slice(0, 20).map((member, idx) => (
        <ActorCard
          key={member.id ? `${member.id}-${idx}` : idx}
          member={member}
          variant="cast"
        />
      ))}
    </Carousel>
  );
}

CastCarousel.propTypes = {
  cast: PropTypes.array,
  title: PropTypes.string
};
