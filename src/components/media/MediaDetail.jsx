import { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import { formatDate } from '../../utils/formatters.js';
import '../../css/media/mediaDetail.css';

/** Technical details for a Movie or Series model. */
export default function MediaDetail({ media, type = 'movie' }) {
  const { t, langKey, language } = useTranslation();
  const { isMobile } = useDevice();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleToggleCollapse = (e) => {
    setIsCollapsed((prev) => !prev);
    e.currentTarget.blur();
  };

  if (!media) return null;

  const isMovie = type === 'movie';
  const title = media.getTitle(langKey);
  const unavailable = t('common.notAvailable');
  const firstYear = media.firstAirDate?.slice(0, 4);
  const lastYear = media.lastAirDate?.slice(0, 4);
  const airingPeriod = firstYear && lastYear && firstYear !== lastYear
    ? `${firstYear} - ${lastYear}`
    : firstYear || lastYear || unavailable;

  const formattedReleaseDate = media.releaseDate
    ? formatDate(media.releaseDate, language || langKey)
    : unavailable;

  const rows = [
    {
      key: 'originalTitle',
      value: (isMovie ? media.originalTitle : media.originalName) || title,
      className: 'text-truncate media-detail-original-title'
    },
    ...(isMovie ? [
      { key: 'releaseDate', value: formattedReleaseDate },
      { key: 'runtime', value: media.getRuntime() || unavailable }
    ] : [
      { key: 'seasons', value: media.numberOfSeasons || unavailable },
      { key: 'episodes', value: media.numberOfEpisodes || unavailable },
      { key: 'airingPeriod', value: airingPeriod }
    ]),
    {
      key: 'originalLanguage',
      value: media.originalLanguage || unavailable,
      className: 'badge px-2 py-1 text-uppercase media-detail-language-badge'
    },
    ...(isMovie ? [
      { key: 'budget', value: media.getBudget() },
      { key: 'revenue', value: media.getRevenue(), className: 'media-detail-revenue' }
    ] : []),
    {
      key: 'status',
      value: media.getStatusLabel(),
      className: 'badge rounded-pill px-3 py-1 shadow-sm media-detail-status-badge'
    }
  ];

  return (
    <div className={`glass-card rounded-4 p-3 p-md-4 shadow-sm text-white h-100 position-relative media-detail-card ${isMobile && isCollapsed ? 'media-detail-collapsed' : ''}`}>
      {isMobile && (
        <button
          type="button"
          onClick={handleToggleCollapse}
          className="rounded-circle d-flex align-items-center justify-content-center carousel-nav-btn media-card-collapse-btn"
          aria-label={isCollapsed ? t('detail.expand') : t('detail.collapse')}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? t('detail.expand') : t('detail.collapse')}
        >
          <i className={`bi bi-chevron-up text-white media-card-collapse-icon ${isCollapsed ? 'is-collapsed' : ''}`} />
        </button>
      )}

      <div className="d-flex gap-2 gap-md-3 align-items-center pe-5 pe-md-0 mb-2 mb-md-3">
        <div className="rounded-3 overflow-hidden bg-dark shadow-sm flex-shrink-0 media-detail-stat-poster">
          <img src={media.getPosterUrl(langKey)} alt={title} className="w-100 h-100 object-fit-cover" />
        </div>
        <div className="flex-grow-1 min-w-0">
          <h3 className="h6 fw-bold text-white mb-1 d-flex align-items-center gap-2 media-detail-stats-title">
            <i className="bi bi-bar-chart-fill text-success" /> {t('detail.statsAndDetails')}
          </h3>
          <small className="fw-medium media-detail-stats-subtitle">{t('detail.technicalSheet')}</small>
        </div>
      </div>

      <div className={`media-collapse-wrapper ${isMobile && isCollapsed ? 'collapsed' : ''}`}>
        <div className="media-collapse-inner">
          <ul className="list-unstyled mb-0 d-flex flex-column gap-2 gap-md-3 small pt-1">
            {rows.map(({ key, value, className = 'text-white media-detail-stat-value' }, index) => (
              <li
                key={key}
                className={`d-flex justify-content-between ${index === rows.length - 1 ? 'align-items-center' : 'border-bottom border-white border-opacity-10 pb-1 pb-md-2'}`}
              >
                <span className="media-detail-stat-label">{t(`detail.${key}`)}</span>
                <span className={`fw-bold text-end ${className}`}>{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
