import PropTypes from 'prop-types';
import { useTranslation } from '../../contexts/LanguageContext.jsx';

/**
 * ProfileTabs
 * Schede di navigazione per le collezioni personali nella pagina profilo.
 * @param {Object} props
 * @param {string} props.activeSection
 * @param {(section: string) => void} [props.onSelectSection]
 * @param {number} [props.watchlistCount=0]
 * @param {number} [props.favoritesCount=0]
 * @param {number} [props.watchedCount=0]
 * @param {number} [props.votedCount=0]
 * @returns {import('react').JSX.Element}
 */
export default function ProfileTabs({
  activeSection,
  onSelectSection = undefined,
  watchlistCount = 0,
  favoritesCount = 0,
  watchedCount = 0,
  votedCount = 0
}) {
  const { t } = useTranslation();

  return (
    <div className="profile-tabs d-flex flex-wrap justify-content-center" role="tablist" aria-label={t('profile.title')}>
      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'watchlist'}
        onClick={() => onSelectSection?.('watchlist')}
        className={`btn rounded-pill fw-semibold profile-tab-btn ${
          activeSection === 'watchlist'
            ? 'btn-success'
            : 'btn-dark text-white-50 border-secondary border-opacity-25'
        }`}
      >
        <i className="bi bi-bookmark-fill me-2" aria-hidden="true" />
        {t('profile.watchlistTab')} ({watchlistCount})
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'favourites'}
        onClick={() => onSelectSection?.('favourites')}
        className={`btn rounded-pill fw-semibold profile-tab-btn ${
          activeSection === 'favourites'
            ? 'btn-success'
            : 'btn-dark text-white-50 border-secondary border-opacity-25'
        }`}
      >
        <i className="bi bi-star-fill me-2" aria-hidden="true" />
        {t('profile.favoritesTab')} ({favoritesCount})
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'watched'}
        onClick={() => onSelectSection?.('watched')}
        className={`btn rounded-pill fw-semibold profile-tab-btn ${
          activeSection === 'watched'
            ? 'btn-success'
            : 'btn-dark text-white-50 border-secondary border-opacity-25'
        }`}
      >
        <i className="bi bi-check-circle-fill me-2" aria-hidden="true" />
        {t('profile.watchedTab')} ({watchedCount})
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={activeSection === 'voted'}
        onClick={() => onSelectSection?.('voted')}
        className={`btn rounded-pill fw-semibold profile-tab-btn ${
          activeSection === 'voted'
            ? 'btn-success'
            : 'btn-dark text-white-50 border-secondary border-opacity-25'
        }`}
      >
        <i className="bi bi-star-half me-2" aria-hidden="true" />
        {t('profile.votedTab')} ({votedCount})
      </button>
    </div>
  );
}

ProfileTabs.propTypes = {
  activeSection: PropTypes.string.isRequired,
  onSelectSection: PropTypes.func,
  watchlistCount: PropTypes.number,
  favoritesCount: PropTypes.number,
  watchedCount: PropTypes.number,
  votedCount: PropTypes.number
};
