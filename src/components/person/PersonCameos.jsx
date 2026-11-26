import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorCameos.css';

/**
 * PersonCameos
 * Carosello dei camei memorabili associati a una persona.
 * @param {Object} props
 * @param {Array<Record<string, any>>} [props.cameos=[]]
 * @returns {import('react').ReactElement|null}
 */
export default function PersonCameos({ cameos = [] }) {
  const { t, langKey } = useTranslation();

  if (!cameos || cameos.length === 0) return null;

  const cameoCards = cameos.map((cameo) => ({
    type: /** @type {'movie'|'tv'} */ (cameo.mediaType === 'tv' ? 'tv' : 'movie'),
    media: {
      id: cameo.mediaId,
      title: cameo.title,
      name: cameo.title,
      posterUrl: cameo.getPosterUrl?.(langKey) || cameo.posterUrl,
      voteAverage: cameo.voteAverage,
      releaseDate: cameo.releaseDate,
      firstAirDate: cameo.firstAirDate
    },
    role: cameo.character || t('cards.cameoBadge'),
    isUncredited: Boolean(cameo.isUncredited)
  }));

  return (
    <Carousel
      className="actor-cameos"
      trackClassName="actor-cameos-track carousel-edge-track pb-1"
      itemCount={cameoCards.length}
      scrollDistance="page"
      header={<CarouselHeading as="h2" title={t('detail.memorableCameos')} />}
    >
      {cameoCards.map(({ type, media, role, isUncredited }, index) => (
        <div className="actor-cameo-item" key={`${type}-${media.id}-${index}`}>
          <MediaCard item={media} type={type} showType />
          <small className="actor-cameo-character d-block mt-1" title={role}>
            {role}
          </small>
          {isUncredited && (
            <div className="d-flex justify-content-center mt-1">
              <span className="actor-cameo-uncredited-box text-truncate" title={t('cards.uncredited')}>
                {t('cards.uncredited')}
              </span>
            </div>
          )}
        </div>
      ))}
    </Carousel>
  );
}

PersonCameos.propTypes = {
  cameos: PropTypes.array
};
