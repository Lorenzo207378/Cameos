import { useRef } from 'react';
import Carousel from '../Carousel.jsx';
import CameoCard from './CameoCard.jsx';
import '../../css/common/carouselControls.css';
import '../../css/common/text.css';
import '../../css/media/mediaCarousel.css';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useSingleLineFit } from '../../utils/domUtils.js';

/**
 * CameoCarousel
 * Carosello orizzontale di CameoCard con lo stesso stile di MediaCarousel
 * (titolo, controlli e scorrimento senza card wrapper esterna).
 * @param {Object} props
 * @param {string} [props.title]
 * @param {string} [props.subtitle]
 * @param {Array<Object>} [props.cameos=[]]
 * @param {'default'|'movie-detail'} [props.cardVariant='default'] Presentation passed to each CameoCard.
 * @param {Function} [props.onLoadMore]
 * @param {boolean} [props.hasMore=false]
 * @param {boolean} [props.isLoadingMore=false]
 */
export default function CameoCarousel({
  title,
  subtitle,
  cameos = [],
  cardVariant = 'default',
  onLoadMore,
  hasMore = false,
  isLoadingMore = false
}) {
  const { t } = useTranslation();
  const headingRef = useRef(null);
  const titleRef = useRef(null);

  const displayTitle = (title && !title.startsWith('cameos.'))
    ? title
    : (t('cameos.title') || t('detail.cameosSectionTitle') || 'Camei ed Easter Egg');

  const displaySubtitle = subtitle ?? (t('cameos.subtitle') !== 'cameos.subtitle' ? t('cameos.subtitle') : '');

  useSingleLineFit(headingRef, titleRef, [displayTitle, displaySubtitle, cameos?.length], 0);

  if (!cameos || cameos.length === 0) return null;

  return (
    <Carousel
      className="media-carousel mb-4 mb-md-5"
      headerClassName="align-items-end mb-1"
      trackClassName="media-carousel-track carousel-edge-track pt-1 pb-2"
      itemCount={cameos.length}
      onLoadMore={onLoadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      scrollDistance="page"
      previousLabel={t('cameos.scrollPrevious')}
      nextLabel={t('cameos.scrollNext')}
      header={
        <div ref={headingRef} className="carousel-heading">
          {displaySubtitle && (
            <p className="text-success text-uppercase fw-bold mb-0" title={displaySubtitle}>
              {displaySubtitle}
            </p>
          )}
          <h3 ref={titleRef} className="text-white fw-bold mb-0 media-carousel-title" title={displayTitle}>
            {displayTitle}
          </h3>
        </div>
      }
    >
      {cameos.map((cameo, idx) => (
        <div
          key={cameo.id ? `${cameo.id}-${idx}` : idx}
          className="cameo-carousel-item h-100"
        >
          <CameoCard cameo={cameo} variant={cardVariant} />
        </div>
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
