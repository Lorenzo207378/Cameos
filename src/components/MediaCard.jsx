import { IMAGE_PLACEHOLDERS } from '../models/index.js';
import { Link } from 'react-router-dom';

/**
 * MediaCard
 * Card verticale con poster, titolo sottostante, badge valutazione e indicazione cameo.
 * @param {Object} props
 * @param {import('../models/Movie.js').Movie|import('../models/Series.js').Series|Object} props.item
 * @param {'movie'|'tv'} [props.type='movie']
 */
export default function MediaCard({ item, type = 'movie' }) {
  if (!item) return null;

  const isMovie = type === 'movie' || Boolean(item.title);
  const detailPath = isMovie ? `/Cameos/films/${item.id}` : `/Cameos/series/${item.id}`;
  const title = item.title || item.name || 'Titolo';

  const posterSrc =
    (typeof item.getPosterUrl === 'function' ? item.getPosterUrl('it') : null) ||
    item.posterUrl?.it ||
    item.posterUrl?.en ||
    (typeof item.posterUrl === 'string' ? item.posterUrl : null) ||
    IMAGE_PLACEHOLDERS.POSTER;

  const rating = (Number(item.voteAverage ?? item.vote_average) || 0).toFixed(1);
  const year = (item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date || '').slice(0, 4);
  const seasonsInfo = !isMovie && (item.numberOfSeasons || item.number_of_seasons)
    ? `${item.numberOfSeasons || item.number_of_seasons} Stag.`
    : year;

  const hasCameos = Boolean(item.cameos?.length || item.vipCameos?.length);

  return (
    <div className="media-card flex-shrink-0" style={{ width: '180px' }}>
      <Link to={detailPath} className="text-decoration-none text-white d-block hover-scale">
        <div
          className="position-relative rounded-3 overflow-hidden shadow-sm bg-dark"
          style={{ width: '100%', height: '260px' }}
        >
          <img
            src={posterSrc}
            alt={title}
            className="w-100 h-100 object-fit-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = IMAGE_PLACEHOLDERS.POSTER;
            }}
          />

          <div className="position-absolute top-0 end-0 m-2">
            <span className="badge bg-dark bg-opacity-75 text-warning fw-bold d-flex align-items-center gap-1 shadow-sm px-2 py-1">
              <i className="bi bi-star-fill text-warning" style={{ fontSize: '11px' }}></i>
              {rating > 0 ? rating : 'N/D'}
            </span>
          </div>

          {hasCameos && (
            <div className="position-absolute bottom-0 start-0 m-2">
              <span className="badge rounded-pill bg-success text-white shadow-sm d-flex align-items-center gap-1 px-2 py-1" style={{ fontSize: '11px' }}>
                <i className="bi bi-eye-fill"></i> Cameo
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
            <span className="text-uppercase" style={{ fontSize: '11px' }}>
              {isMovie ? 'Film' : 'Serie TV'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
