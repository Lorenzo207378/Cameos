import PropTypes from 'prop-types';
import Carousel from '../Carousel.jsx';
import ActorCard from './ActorCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/text.css';
import '../../css/common/carouselControls.css';
import '../../css/media/castCarousel.css';

/**
 * CameoCarousel
 * Carosello orizzontale dei camei con avatar circolari (ActorCard variant="cameo").
 * Presenta la stessa struttura e stile di CastCarousel.
 *
 * @param {Object} props
 * @param {string} [props.title]
 * @param {Array<Object>} [props.cameos=[]]
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 */
export default function CameoCarousel({
  title,
  cameos = [],
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();
  if (!cameos || cameos.length === 0) return null;

  const displayTitle = (title && !title.startsWith('cameos.'))
    ? title
    : (t('cameos.title') || t('detail.cameosSectionTitle') || 'Camei ed Easter Egg');

  return (
    <Carousel
      header={<h3 className="h4 text-white fw-bold mb-0 cast-carousel-title">{displayTitle}</h3>}
      trackClassName="cast-carousel-track carousel-edge-track"
      previousLabel={t('cameos.scrollPrevious') || t('cast.scrollPrevious')}
      nextLabel={t('cameos.scrollNext') || t('cast.scrollNext')}
      scrollDistance="page"
      itemCount={cameos.length}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    >
      {cameos.map((cameo, idx) => (
        <ActorCard
          key={cameo.id ? `${cameo.id}-${idx}` : idx}
          member={cameo}
          variant="cameo"
        />
      ))}

      {isLoadingMore && (
        <div
          className="d-flex flex-column align-items-center justify-content-center text-white-50 flex-shrink-0 carousel-loading"
        >
          <div className="spinner-border spinner-border-sm text-success mb-2" role="status">
            <span className="visually-hidden">{t('common.loading')}</span>
          </div>
          <span className="small fw-semibold">{t('common.loading')}</span>
        </div>
      )}
    </Carousel>
  );
}

CameoCarousel.propTypes = {
  title: PropTypes.string,
  cameos: PropTypes.array,
  cardVariant: PropTypes.string,
  onLoadMore: PropTypes.func,
  hasMore: PropTypes.bool,
  isLoadingMore: PropTypes.bool
};
