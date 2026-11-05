import { IMAGE_PLACEHOLDERS, resolveLocalizedImage, isMediaUpcoming } from '../../models/utils/index.js';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/common/text.css';
import '../../css/media/mediaCard.css';

/**
 * MediaCard
 * Card verticale con poster, titolo sottostante (fino a 2 righe), badge valutazione e indicazione cameo.
 * Supporta la variante 'filmography' per la filmografia di un attore con ruolo e badge upcoming.
 * @param {Object} props
 * @param {Parameters<typeof isMediaUpcoming>[0] & Object<string, *>} props.item Modello Movie/Series o credito TMDb con campi originali.
 * @param {'movie'|'tv'} [props.type='movie']
 * @param {boolean} [props.upcoming=false] Nasconde il rating per i media in uscita.
 * @param {boolean} [props.showType=false] Mostra un pill con il tipo di media.
 * @param {'default'|'filmography'} [props.variant='default'] Variante di visualizzazione.
 * @param {string|null} [props.role] Ruolo/personaggio interpretato dall'attore (per variante filmography).
 * @returns {import('react').JSX.Element|null}
 */
export default function MediaCard({
  item,
  type = 'movie',
  upcoming = false,
  showType = false,
  variant = 'default',
  role = null
}) {
  const { t, langKey, formatTranslation } = useTranslation();

  const isMovie = type === 'movie';
  const title = item ?  (isMovie ? item.title : item.name) : '';

  if (!item) return null;

  const detailPath = isMovie ? `/Cameos/movie/${item.id}` : `/Cameos/series/${item.id}`;

  const posterSrc = resolveLocalizedImage(item.posterUrl || item.poster_path, langKey, IMAGE_PLACEHOLDERS.POSTER);

  const rating = (Number(item.voteAverage ?? item.vote_average) || 0).toFixed(1);
  const releaseDate = isMovie
    ? item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date
    : item.firstAirDate || item.first_air_date;
  const year = String(releaseDate || '').slice(0, 4);
  const seasonsInfo = !isMovie && item.numberOfSeasons
    ? formatTranslation(t('slider.seasonsShort'), { count: item.numberOfSeasons })
    : year;

  const hasCameos = Boolean(item.cameos?.length || item.vipCameos?.length);
  const isFilmography = variant === 'filmography' || Boolean(role);
  const isUpcoming = Boolean(upcoming || item.upcoming || isMediaUpcoming(item));
  const upcomingSeason = !isMovie ? item.upcomingSeason : null;

  return (
    <div className={`media-card flex-shrink-0 ${isFilmography ? 'media-card-filmography' : ''}`}>
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

          {!isUpcoming && (
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

          {upcomingSeason && upcomingSeason.seasonNumber > 1 && (
            <div
              className="media-card-upcoming-season fw-semibold text-truncate mt-1"
              title={`${upcomingSeason.name || `Stagione ${upcomingSeason.seasonNumber}`} - ${t('cards.upcoming')}`}
            >
              <i className="bi bi-clock-history me-1"></i>
              <span>{upcomingSeason.name || `Stagione ${upcomingSeason.seasonNumber}`}</span>
              <span className="ms-1 opacity-75">({t('cards.upcoming').toLowerCase()})</span>
            </div>
          )}

          {isFilmography && role && (
            <small className="media-card-role d-block" title={role}>
              {role}
            </small>
          )}

          {isFilmography && isUpcoming && (
            <div className="d-flex justify-content-center mt-1">
              <span className="media-card-upcoming-box text-truncate" title={t('cards.upcoming')}>
                {t('cards.upcoming')}
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
