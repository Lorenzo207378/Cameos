import { useState } from 'react';
import { formatTranslation } from '../../utils/translationUtils.js';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { formatNumber } from '../../utils/formatters.js';
import '../../css/media/mediaOverview.css';
import '../../css/common/mediaIconButton.css';

/** Overview, genres, and ratings for a Movie or Series model. */
export default function MediaOverview({ media, type = 'movie' }) {
  const { t, langKey } = useTranslation();
  const { isMobile } = useDevice();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = (e) => {
    setIsCollapsed((prev) => !prev);
    e.currentTarget.blur();
  };

  if (!media) return null;

  const isMovie = type === 'movie';
  const overviewText = media.getOverview(langKey) || t('detail.overviewUnavailable');
  const releaseYear = (isMovie ? media.releaseDate : media.firstAirDate)?.slice(0, 4);
  const runtimeHours = isMovie ? media.getRuntime() : null;
  const rating = media.voteAverage.toFixed(1);
  const voteCount = formatNumber(media.voteCount);
  const genres = media.getGenres();

  return (
    <div className={`glass-card rounded-4 p-3 p-md-4 shadow-sm position-relative media-overview-card ${isMobile && isCollapsed ? 'media-overview-collapsed' : ''}`}>
      {isMobile && (
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="media-icon-button media-card-collapse-btn"
          aria-label={isCollapsed ? t('detail.expand') : t('detail.collapse')}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? t('detail.expand') : t('detail.collapse')}
        >
          <i className={`bi bi-chevron-up text-white media-card-collapse-icon ${isCollapsed ? 'is-collapsed' : ''}`} />
        </button>
      )}

      <div className="d-flex flex-wrap gap-1 gap-md-2 mb-2 mb-md-3 pe-5 pe-md-0">
        {genres.map((genre) => (
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
        <div className={`media-collapse-wrapper ${isMobile && isCollapsed ? 'collapsed' : ''}`}>
          <div className="media-collapse-inner">
            <p className="media-overview-text mb-0 pt-2">
              {overviewText}
            </p>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-1 gap-md-2 align-items-center mt-2 mt-md-3 pt-2 pt-md-3 border-top border-white border-opacity-10 media-overview-meta-row">
        <span className="badge rounded-pill bg-success fw-bold text-uppercase media-overview-type-badge">
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
        <span className="badge rounded-pill bg-warning text-dark fw-bold d-flex align-items-center gap-1 shadow-sm media-overview-rating-badge">
          <i className="bi bi-star-fill" /> {rating} ({voteCount} {voteCount === 1 ? t('detail.voteSingle') : t('detail.votes')})
        </span>
      </div>
    </div>
  );
}
