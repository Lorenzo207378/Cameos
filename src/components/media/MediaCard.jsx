import { IMAGE_PLACEHOLDERS, resolveLocalizedImage, resolveLocalizedText } from '../../models/index.js';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../translations.js';
import '../../css/media/mediaCard.css';

/**
 * MediaCard
 * Card verticale con poster, titolo sottostante, badge valutazione e indicazione cameo.
 * @param {Object} props
 * @param {import('../../models/Movie.js').Movie|import('../models/Series.js').Series|Object} props.item
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function MediaCard({ item, type = 'movie' }) {
  const { t, langKey } = useTranslation();
  if (!item) return null;

  const isMovie = type === 'movie' || Boolean(item.title);

  const detailPath = isMovie ? `/Cameos/films/${item.id}` : `/Cameos/series/${item.id}`;

  const title =
    item.getTitle?.(langKey) ||
    item.getName?.(langKey) ||
    resolveLocalizedText(item.title || item.name, langKey);

  const posterSrc = item.getPosterUrl?.(langKey)
    || resolveLocalizedImage(item.posterUrl, langKey, IMAGE_PLACEHOLDERS.POSTER);

  const rating = (Number(item.voteAverage ?? item.vote_average) || 0).toFixed(1);
  const year = (item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date || '').slice(0, 4);
  const seasonsInfo = !isMovie && (item.numberOfSeasons || item.number_of_seasons)
    ? t('slider.seasonsShort', { count: item.numberOfSeasons || item.number_of_seasons })
    : year;

  const hasCameos = Boolean(item.cameos?.length || item.vipCameos?.length);

  return (
    <div className="media-card flex-shrink-0">
      <Link to={detailPath} className="media-card-link">
        <div className="media-card-poster">
          <img
            src={posterSrc}
            alt={title}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = IMAGE_PLACEHOLDERS.POSTER;
            }}
          />

          <div className="position-absolute top-0 end-0 m-2">
            <span className="badge bg-dark bg-opacity-75 text-warning fw-bold d-flex align-items-center gap-1 shadow-sm px-2 py-1">
              <i className="bi bi-star-fill text-warning" style={{ fontSize: '11px' }}></i>
              {rating > 0 ? rating : t('cards.ratingNotAvailable')}
            </span>
          </div>

          {hasCameos && (
            <div className="position-absolute bottom-0 start-0 m-2">
              <span className="badge rounded-pill bg-success text-white shadow-sm d-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: '11px' }}>
                <i className="bi bi-eye-fill"></i> {t('cards.cameoBadge')}
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 px-1">
          <h4
            className="h6 fw-bold text-white mb-1 text-truncate"
            title={title}
            style={{ fontSize: '14px' }}
          >
            {title}
          </h4>
          <div className="d-flex justify-content-between align-items-center text-white-50" style={{ fontSize: '12px' }}>
            <span>{seasonsInfo}</span>
          </div>
        </div>

      </Link>
    </div>
  );
}
