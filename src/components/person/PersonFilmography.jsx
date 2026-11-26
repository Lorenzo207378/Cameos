import PropTypes from 'prop-types';
import CarouselHeading from '../CarouselHeading.jsx';
import Carousel from '../Carousel.jsx';
import MediaCard from '../media/MediaCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/actor/actorFilmography.css';

/**
 * Format a filmography credit entry into MediaCard props and localized role caption.
 * @param {Record<string, any>} item
 * @param {Record<string, string>} roleLabels
 * @param {(key: string) => string} t
 * @param {(text: string, params?: Object<string, *>) => string} formatTranslation
 */
function buildFilmographyCard(item, roleLabels, t, formatTranslation) {
  /** @type {'movie'|'tv'} */
  const type = item.mediaType === 'movie' ? 'movie' : 'tv';
  const hasCreativeRoles = Boolean(item.creditRoleKeys?.length);
  const media = {
    ...item,
    name: item.name || item.title || t('slider.unknownTitle'),
    posterUrl: item.posterUrl || item.poster_path,
    episodeCount: hasCreativeRoles ? item.episodeCount : undefined
  };

  const role = hasCreativeRoles
    ? item.creditRoleKeys
        .map((key) => {
          const label = roleLabels[key];
          const count = !item.episodeCount && item.creditRoleCounts?.[key];
          return count > 0
            ? `${label} (${formatTranslation(t('slider.episodesShort'), { count })})`
            : label;
        })
        .join(' / ')
    : item.character || t(type === 'movie' ? 'detail.moviesTab' : 'detail.tvSeriesTab');

  return { type, media, role };
}

/**
 * @param {Object} props
 * @param {Array<Record<string, any>>} [props.credits=[]]
 * @param {boolean} [props.failed=false]
 * @param {string} [props.title]
 * @param {1|2} [props.rows=2]
 * @returns {import('react').ReactElement|null}
 */
export default function PersonFilmography({ credits = [], failed = false, title = undefined, rows = 2 }) {
  const { t, formatTranslation } = useTranslation();

  if (!credits.length && !failed) return null;

  const roleLabels = {
    'detail.directing': t('detail.directing'),
    'detail.writing': t('detail.writing'),
    'detail.creation': t('detail.creation')
  };

  const cards = credits.map((item) => ({
    item,
    ...buildFilmographyCard(item, roleLabels, t, formatTranslation)
  }));

  return (
    <>
      {failed && <p role="alert" className="text-warning">{t('common.error')}</p>}
      <Carousel
        className="actor-filmography"
        trackClassName={`${rows === 1 ? 'actor-filmography-track-single-row' : 'actor-filmography-track'} carousel-edge-track pb-3`}
        itemCount={cards.length}
        scrollDistance="page"
        header={<CarouselHeading as="h2" title={title || t('detail.filmography')} />}
      >
        {cards.map(({ item, type, media, role }, index) => (
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
        ))}
      </Carousel>
    </>
  );
}

PersonFilmography.propTypes = {
  credits: PropTypes.array,
  failed: PropTypes.bool,
  title: PropTypes.string,
  rows: PropTypes.oneOf([1, 2])
};
