import { formatTranslation } from '../../utils/translationUtils.js';
import { IMAGE_PLACEHOLDERS, resolveLocalizedImage, resolveLocalizedText } from '../../models/index.js';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../utils/translations.js';
import '../../css/common/text.css';
import '../../css/media/mediaCard.css';

/**
 * MediaCard
 * Card verticale con poster, titolo sottostante (fino a 2 righe), badge valutazione e indicazione cameo.
 * @param {Object} props
 * @param {import('../../models/Movie.js').Movie|import('../models/Series.js').Series|Object} props.item
 * @param {'movie'|'tv'} [props.type='movie']
 * @param {boolean} [props.upcoming=false] Nasconde il rating per i media in uscita.
 * @param {boolean} [props.showType=false] Mostra un pill con il tipo di media.
 */
export default function MediaCard({ item, type = 'movie', upcoming = false, showType = false }) {
  const { t, langKey } = useTranslation();

  const isMovie = type === 'movie';
  const title = item
    ? item.getTitle?.(langKey) ||
      item.getName?.(langKey) ||
      resolveLocalizedText(item.title || item.name, langKey)
    : '';

  if (!item) return null;

  const detailPath = isMovie ? `/Cameos/movie/${item.id}` : `/Cameos/series/${item.id}`;

  const posterSrc = item.getPosterUrl?.(langKey)
    || resolveLocalizedImage(item.posterUrl, langKey, IMAGE_PLACEHOLDERS.POSTER);

  const rating = (Number(item.voteAverage ?? item.vote_average) || 0).toFixed(1);
  const year = (item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date || '').slice(0, 4);
  const seasonsInfo = !isMovie && (item.numberOfSeasons || item.number_of_seasons)
    ? formatTranslation(t('slider.seasonsShort'), { count: item.numberOfSeasons || item.number_of_seasons })
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

          {!upcoming && (
            <div className="position-absolute top-0 end-0 media-card-badge-slot">
              <span className="badge bg-dark bg-opacity-75 text-warning fw-bold d-flex align-items-center gap-1 shadow-sm media-card-badge">
                <i className="bi bi-star-fill text-warning"></i>
                {rating > 0 ? rating : t('cards.ratingNotAvailable')}
              </span>
            </div>
          )}

          {showType && (
            <span
              className={`media-card-type position-absolute top-0 start-0 media-card-badge-slot rounded-circle ${isMovie ? 'bg-success' : 'bg-primary'} text-white shadow-sm`}
              role="img"
              aria-label={t(isMovie ? 'cards.movieType' : 'cards.tvType')}
              title={t(isMovie ? 'cards.movieType' : 'cards.tvType')}
            >
              <i className={`bi ${isMovie ? 'bi-camera-reels' : 'bi-tv'}`} aria-hidden="true" />
            </span>
          )}

          {hasCameos && (
            <div className="position-absolute bottom-0 start-0 media-card-badge-slot">
              <span className="badge rounded-pill bg-success text-white shadow-sm d-flex align-items-center gap-1 media-card-badge">
                <i className="bi bi-eye-fill"></i> {t('cards.cameoBadge')}
              </span>
            </div>
          )}
        </div>

        <div className="media-card-body">
          <h4
            className="fw-bold text-white media-card-title text-lines"
            title={title}
          >
            {title}
          </h4>
          <div className="media-card-meta text-white-50">
            <span>{seasonsInfo}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
