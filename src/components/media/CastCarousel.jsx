import CarouselHeading from '../CarouselHeading.jsx';
import PropTypes from 'prop-types';
import Carousel from '../Carousel.jsx';
import PersonCard from '../person/PersonCard.jsx';
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
 * @param {number} [props.limit=20] Maximum number of loaded people to display.
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 * @param {boolean} [props.showRoles=true] Show character/role captions below the names.
 */
export default function CastCarousel({ cast = [], title = 'Cast & Interpreti', limit = 20, onLoadMore, hasMore = false, isLoadingMore = false, showRoles = true }) {
  const { t } = useTranslation();
  if (!cast || cast.length === 0) return null;

  return (
    <Carousel
      header={<CarouselHeading title={title} />}
      trackClassName="cast-carousel-track carousel-edge-track"
      previousLabel={t('cast.scrollPrevious')}
      nextLabel={t('cast.scrollNext')}
      scrollDistance="page"
      itemCount={Math.min(cast.length, limit ?? cast.length)}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    >
      {cast.slice(0, limit ?? cast.length).map((member, idx) => (
        <PersonCard
          key={member.id ? `${member.id}-${idx}` : idx}
          member={member}
          variant="cast"
          showRole={showRoles}
        />
      ))}
    </Carousel>
  );
}

CastCarousel.propTypes = {
  cast: PropTypes.array,
  title: PropTypes.string,
  limit: PropTypes.number,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool,
  showRoles: PropTypes.bool
};
