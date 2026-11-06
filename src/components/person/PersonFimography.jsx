import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorFilmography.css';

/**
 * @param {{ credits?: Array<Record<string, any>>, failed?: boolean }} props
 */
export default function PersonFimography({ credits = [], failed = false }) {
  const { t } = useTranslation();
  const roleLabels = {
    'detail.directing': t('detail.directing'),
    'detail.writing': t('detail.writing'),
    'detail.creation': t('detail.creation')
  };

  return (
    <>
      {failed && <p role="alert" className="text-warning">{t('common.error')}</p>}
      <Carousel
        className="actor-filmography"
        trackClassName="actor-filmography-track pb-3"
        itemCount={credits.length}
        scrollDistance="page"
        header={<CarouselHeading as="h2" title={t('detail.filmography')} />}
      >
        {credits.map(/** @returns {import('react').JSX.Element} */ (item, index) => {
          const type = item.mediaType === 'movie' ? 'movie' : 'tv';
          const media = {
            ...item,
            name: item.name || item.title || t('slider.unknownTitle'),
            posterUrl: item.posterUrl || item.poster_path,
          };
          const role = item.creditRoleKeys?.length
            ? item.creditRoleKeys.map((key) => roleLabels[key]).join(' / ')
            : item.character || t(type === 'movie' ? 'detail.moviesTab' : 'detail.tvSeriesTab');

          return (
            <div className="actor-filmography-item" key={`${type}-${item.id}-${index}`}>
              <MediaCard
                item={media}
                type={type}
                variant="filmography"
                role={role}
                upcoming={Boolean(item.upcoming)}
                showType
              />
            </div>
          );
        })}
      </Carousel>
    </>
  );
}
