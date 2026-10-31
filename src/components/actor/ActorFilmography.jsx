import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorFilmography.css';

export default function ActorFilmography({ credits = [], failed = false }) {
  const { t } = useTranslation();
  const columns = [];
  for (let index = 0; index < credits.length; index += 2) {
    columns.push(credits.slice(index, index + 2));
  }

  return (
    <>
      {/* SEZIONE: FILMOGRAFIA NOTA */}
      {failed && <p role="alert" className="text-warning">{t('common.error')}</p>}
      <Carousel
        className="actor-filmography"
        trackClassName="actor-filmography-track pb-3"
        itemCount={columns.length}
        scrollDistance="page"
        header={<h2 className="actor-section-title text-white fw-bold mb-0">{t('detail.filmography')}</h2>}
      >
        {columns.map((column, columnIndex) => (
          <div className="actor-filmography-column d-flex flex-column flex-shrink-0" key={columnIndex}>
            {column.map((item, rowIndex) => {
              const type = item.media_type === 'movie' ? 'movie' : 'tv';
              const media = {
                ...item,
                name: item.name || item.title || t('slider.unknownTitle'),
                posterUrl: item.posterUrl || (item.poster_path
                  ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                  : undefined)
              };

              return (
                <div className="actor-filmography-item" key={`${type}-${item.id}-${rowIndex}`}>
                  <MediaCard item={media} type={type} upcoming={Boolean(item.upcoming)} showType />
                  <small className="actor-filmography-character d-block px-1 mt-1" title={item.character}>
                    {item.character || t(type === 'movie' ? 'detail.moviesTab' : 'detail.tvSeriesTab')}
                  </small>
                </div>
              );
            })}
          </div>
        ))}
      </Carousel>
    </>
  );
}
