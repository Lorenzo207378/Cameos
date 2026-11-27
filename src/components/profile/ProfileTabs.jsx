import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * ProfileTabs
 * Schede di navigazione per le collezioni personali nella pagina profilo.
 * @param {Object} props
 * @param {'watchlist'|'favorites'|'watched'} props.activeSection
 * @param {(section: 'watchlist'|'favorites'|'watched') => void} [props.onSelectSection]
 * @param {number} [props.watchlistCount=0]
 * @param {number} [props.favoritesCount=0]
 * @param {number} [props.watchedCount=0]
 * @returns {import('react').ReactElement}
 */
export default function ProfileTabs({
  activeSection,
  onSelectSection = undefined,
  watchlistCount = 0,
  favoritesCount = 0,
  watchedCount = 0
}) {
  const { t } = useTranslation();

  /** @type {Array<{ key: 'watchlist'|'favorites'|'watched', icon: string, label: string, count: number }>} */
  const tabs = [
    { key: 'watchlist', icon: 'bi-bookmark-fill', label: t('profile.watchlistTab'), count: watchlistCount },
    { key: 'favorites', icon: 'bi-star-fill', label: t('profile.favoritesTab'), count: favoritesCount },
    { key: 'watched', icon: 'bi-check-circle-fill', label: t('profile.watchedTab'), count: watchedCount }
  ];

  return (
    <div className="profile-tabs d-flex flex-wrap justify-content-center" role="tablist" aria-label={t('profile.title')}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          id={`profile-tab-${tab.key}`}
          type="button"
          role="tab"
          aria-selected={activeSection === tab.key}
          aria-controls="profile-collection-tabpanel"
          onClick={() => onSelectSection?.(tab.key)}
          className={`btn rounded-pill fw-semibold profile-tab-btn ${
            activeSection === tab.key
              ? 'btn-success'
              : 'btn-dark text-white-50 border-secondary border-opacity-25'
          }`}
        >
          <i className={`bi ${tab.icon} me-2`} aria-hidden="true" />
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
}

ProfileTabs.propTypes = {
  activeSection: PropTypes.oneOf(['watchlist', 'favorites', 'watched']).isRequired,
  onSelectSection: PropTypes.func,
  watchlistCount: PropTypes.number,
  favoritesCount: PropTypes.number,
  watchedCount: PropTypes.number
};
