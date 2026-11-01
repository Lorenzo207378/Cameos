import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorFilmography.css';

export default function ActorFilmography({ credits = [], failed = false }) {
  const { t } = useTranslation();
  const columnCount = Math.ceil(credits.length / 2);

  return (
    <>
      {failed && <p role="alert" className="text-warning">{t('common.error')}</p>}
      <Carousel
        className="actor-filmography"
        trackClassName="actor-filmography-track pb-3"
        itemCount={columnCount}
        scrollDistance="page"
        header={<h2 className="actor-section-title text-white fw-bold mb-0">{t('detail.filmography')}</h2>}
      >
        {credits.map((item, index) => {
          const type = item.media_type === 'movie' ? 'movie' : 'tv';
          const media = {
            ...item,
            name: item.name || item.title || t('slider.unknownTitle'),
            posterUrl: item.posterUrl || (item.poster_path
              ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
              : undefined)
          };
          const role = item.character || t(type === 'movie' ? 'detail.moviesTab' : 'detail.tvSeriesTab');

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
