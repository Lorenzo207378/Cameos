import { formatTranslation } from '../../utils/translationUtils.js';
import CameoCard from './CameoCard.jsx';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import '../../css/media/mediaOverview.css';

/** Overview, genres, ratings and cameos for a Movie or Series model. */
export default function MediaOverview({ media, type = 'movie', cameos = [] }) {
  const { t, langKey } = useTranslation();

  if (!media) return null;

  const isMovie = type === 'movie';
  const overviewText = media.getOverview(langKey) || t('detail.overviewUnavailable');
  const releaseYear = (isMovie ? media.releaseDate : media.firstAirDate)?.slice(0, 4);
  const runtimeHours = isMovie ? media.getRuntime() : null;
  const rating = media.voteAverage.toFixed(1);
  const voteCount = media.voteCount;

  return (
    <div className="glass-card rounded-4 p-4 shadow-sm">
      <div className="d-flex flex-wrap gap-2 mb-3">
        {media.getGenres().map((genre) => (
          <span
            key={genre.id || genre.name}
            className="genre-pill badge"
          >
            {genre.name}
          </span>
        ))}
      </div>
      <div className="media-overview-content">
        <h3 className="media-overview-title">
          {t('detail.synopsisTitle')}
        </h3>
        <p className="media-overview-text">
          {overviewText}
        </p>
      </div>
      <div className="d-flex flex-wrap gap-2 align-items-center mt-3 pt-3 border-top border-white border-opacity-10">
        <span className="badge rounded-pill bg-success px-3 py-2 fw-bold text-uppercase">
          {t(isMovie ? 'detail.moviesTab' : 'detail.tvSeriesTab')}
        </span>
        {releaseYear && (
          <span className="info-pill badge">
            {releaseYear}
          </span>
        )}
        {(isMovie ? runtimeHours : media.numberOfSeasons > 0) && (
          <span className="info-pill badge">
            {isMovie ? runtimeHours : formatTranslation(t('slider.seasonsCount'), { count: media.numberOfSeasons })}
          </span>
        )}
        <span className="badge rounded-pill bg-warning text-dark px-3 py-2 fw-bold d-flex align-items-center gap-1 shadow-sm">
          <i className="bi bi-star-fill" /> {rating} ({voteCount} {voteCount === 1 ? t('detail.voteSingle') : t('detail.votes')})
        </span>
      </div>
      {cameos.length > 0 && (
        <div className="mt-4 pt-3 border-top border-white border-opacity-10">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-stars text-success fs-5" />
            <h4
              className="h6 fw-bold text-white mb-0 text-uppercase tracking-wider media-overview-cameos-title"
            >
              {t('detail.cameosSectionTitle')}
            </h4>
          </div>
          <div className="row g-3">
            {cameos.map((c) => (
              <div className="col-12 col-md-6" key={c.id}>
                <CameoCard cameo={c} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
