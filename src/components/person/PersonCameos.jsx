import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorCameos.css';

export default function PersonCameos({ cameos = [] }) {
  const { t, langKey } = useTranslation();

  if (!cameos || cameos.length === 0) return null;

  return (
    <Carousel
      className="actor-cameos"
      trackClassName="actor-cameos-track carousel-edge-track pb-1"
      itemCount={cameos.length}
      scrollDistance="page"
      header={<CarouselHeading as="h2" title={t('detail.memorableCameos')} />}
    >
      {cameos.map((cameo, index) => {
        const type = cameo.mediaType === 'tv' ? 'tv' : 'movie';
        const media = {
          id: cameo.mediaId,
          title: cameo.title,
          name: cameo.title,
          posterUrl: cameo.getPosterUrl?.(langKey) || cameo.posterUrl,
          voteAverage: cameo.voteAverage,
          releaseDate: cameo.releaseDate,
          firstAirDate: cameo.firstAirDate
        };

        const role = cameo.character || t('cards.cameoBadge');

        return (
          <div className="actor-cameo-item" key={`${type}-${media.id}-${index}`}>
            <MediaCard item={media} type={type} showType />
            <small className="actor-cameo-character d-block mt-1" title={role}>
              {role}
            </small>
            {cameo.isUncredited && (
              <div className="d-flex justify-content-center mt-1">
                <span className="actor-cameo-uncredited-box text-truncate" title={t('cards.uncredited')}>
                  {t('cards.uncredited')}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </Carousel>
  );
}
