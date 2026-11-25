import PropTypes from 'prop-types';
import {
  IMAGE_PLACEHOLDERS,
  isMediaUpcoming,
  resolveLocalizedImage,
  resolveLocalizedText
} from '../../models/utils/index.js';
import {Link} from 'react-router-dom';
import {useTranslation} from '../../contexts/LanguageContext.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';
import '../../css/common/text.css';
import '../../css/media/mediaCard.css';

/**
 * MediaCard
 * Card verticale con poster, titolo sottostante (fino a 2 righe), badge valutazione e indicazione cameo.
 * Supporta la variante 'filmography' per la filmografia di un attore con ruolo e badge upcoming.
 * @param {Object} props
 * @param {Object<string, *>} props.item Modello Movie/Series o credito TMDb con campi originali.
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

  if (!item) return null;

  const isMovie = type === 'movie';
  const isEpisode = Boolean(item.episodeNumber !== undefined && item.episodeNumber !== null && item.seriesId);
  const isSeason = Boolean(!isEpisode && item.seasonNumber !== undefined && item.seasonNumber !== null && item.seriesId);
  const resolvedTitle = isSeason
    ? resolveLocalizedText(item.seriesNames || item.seriesName || item.titles || item.names || item.title || item.name, langKey)
    : resolveLocalizedText(item.titles || item.names || (isMovie ? item.title : item.name), langKey);
  const mediaId = item.mediaId ?? item.id;
  const fallbackTitle = isEpisode
    ? formatTranslation(t('detail.episodeLabel'), { number: item.episodeNumber })
    : isSeason
      ? `${formatTranslation(t('detail.seasonLabel'), { number: item.seasonNumber })} · ${t('cards.tvType')} ${item.seriesId}`
      : `${t(isMovie ? 'cards.movieType' : 'cards.tvType')} ${mediaId}`;
  const title = resolvedTitle || (item.resolutionError ? fallbackTitle : '');

  let detailPath = isMovie ? APP_ROUTES.movie(mediaId) : APP_ROUTES.seriesOf(mediaId);
  if (isEpisode) {
    detailPath = APP_ROUTES.episode(item.seriesId, item.seasonNumber, item.episodeNumber);
  } else if (isSeason) {
    detailPath = APP_ROUTES.seriesOf(item.seriesId, item.seasonNumber);
  }

  const posterSrc = resolveLocalizedImage(
    item.posterUrl || item.poster_path || item.stillUrl || item.still_path,
    langKey,
    IMAGE_PLACEHOLDERS.POSTER
  );

  const numericRating = Number(item.voteAverage ?? item.vote_average) || 0;
  const rating = numericRating.toFixed(1);
  const releaseDate = isMovie
    ? item.releaseDate || item.release_date || item.firstAirDate || item.first_air_date
    : item.firstAirDate || item.first_air_date;
  let seasonsInfo = String(releaseDate || '').slice(0, 4);
  if (isEpisode) {
    seasonsInfo = `${formatTranslation(t('detail.seasonLabel'), { number: item.seasonNumber })} • ${formatTranslation(t('detail.episodeLabel'), { number: item.episodeNumber })}`;
  } else if (isSeason) {
    seasonsInfo = formatTranslation(t('detail.seasonLabel'), { number: item.seasonNumber });
  } else if (!isMovie && item.numberOfSeasons) {
    seasonsInfo = formatTranslation(t('slider.seasonsShort'), { count: item.numberOfSeasons });
  }

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
                {numericRating > 0 ? rating : t('cards.ratingNotAvailable')}
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

          {item.resolutionError && (
            <small className="d-block text-warning text-truncate mt-1" role="status" title={t('cards.detailsUnavailable')}>
              <i className="bi bi-exclamation-triangle-fill me-1" aria-hidden="true" />
              {t('cards.detailsUnavailable')}
            </small>
          )}
        </div>
      </Link>
    </div>
  );
}

MediaCard.propTypes = {
  item: PropTypes.object,
  type: PropTypes.oneOf(['movie', 'tv']),
  upcoming: PropTypes.bool,
  showType: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'filmography']),
  role: PropTypes.string
};
