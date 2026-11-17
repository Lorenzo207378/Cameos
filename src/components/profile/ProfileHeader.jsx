import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import FriendAvatar from '../friends/FriendAvatar.jsx';

/**
 * ProfileHeader
 * Banner identità profilo con avatar spotlight, statistiche contestuali, lingua e logout.
 * @param {Object} props
 * @param {string|null} [props.avatarUrl]
 * @param {string} props.displayName
 * @param {string} [props.displayEmail='']
 * @param {number} [props.watchlistCount=0]
 * @param {number} [props.favoritesCount=0]
 * @param {number} [props.watchedCount=0]
 * @param {number} [props.reviewsCount=0]
 * @param {string} [props.reviewsLink='/Cameos/profile/reviews']
 * @param {boolean} [props.isVisitor=false]
 * @param {(section: string) => void} [props.onSelectSection]
 * @param {(lang: string) => (void|Promise<void>)} [props.onLanguageChange]
 * @param {() => (void|Promise<void>)} [props.onLogout]
 * @returns {import('react').JSX.Element}
 */
export default function ProfileHeader({
  avatarUrl = undefined,
  displayName,
  displayEmail = '',
  watchlistCount = 0,
  favoritesCount = 0,
  watchedCount = 0,
  reviewsCount = 0,
  reviewsLink = '/Cameos/profile/reviews',
  isVisitor = false,
  onSelectSection = undefined,
  onLanguageChange = undefined,
  onLogout = undefined
}) {
  const { t, langKey, formatTranslation } = useTranslation();
  const { isMobile } = useDevice();

  const languageOptions = [
    { code: 'it', label: t('profile.italianLang') },
    { code: 'en', label: t('profile.englishLang') }
  ];

  return (
    <section className="profile-identity-banner text-white">
      <div className="profile-identity-main">
        <div className="profile-avatar-wrap">
          <FriendAvatar
            photoURL={avatarUrl}
            name={displayName}
            seed={displayEmail || displayName}
            size="lg"
            ringVariant="emerald"
          />
        </div>

        <div className="profile-identity-copy min-w-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="profile-username mb-0">{displayName}</h1>
            {isVisitor && (
              <span className="badge rounded-pill bg-dark text-success border border-success border-opacity-25 profile-visitor-badge">
                <i className="bi bi-eye me-1" aria-hidden="true" />
                {t('profile.visitorBadge')}
              </span>
            )}
          </div>

          {displayEmail && <p className="profile-email mb-0">{displayEmail}</p>}

          {isVisitor && (
            <div className="profile-stats-grid">
              <button
                type="button"
                onClick={() => onSelectSection?.('watchlist')}
                className="profile-stat-pill"
              >
                <i className="bi bi-bookmark-fill text-success" aria-hidden="true" />
                <span>{formatTranslation(t('profile.watchlistCount'), { count: watchlistCount })}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSection?.('favourites')}
                className="profile-stat-pill"
              >
                <i className="bi bi-star-fill text-warning" aria-hidden="true" />
                <span>{formatTranslation(t('profile.favoritesCount'), { count: favoritesCount })}</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectSection?.('voted')}
                className="profile-stat-pill"
              >
                <i className="bi bi-check-circle-fill text-info" aria-hidden="true" />
                <span>{formatTranslation(t('profile.watchedCount'), { count: watchedCount })}</span>
              </button>
            </div>
          )}

          {isMobile && (
            <Link to={reviewsLink} className="profile-mobile-reviews-btn text-decoration-none">
              <span className="d-inline-flex align-items-center gap-2 min-w-0">
                <i className="bi bi-chat-square-text-fill text-success flex-shrink-0" aria-hidden="true" />
                <span className="fw-semibold text-truncate">{t('profile.openReviewsCta')}</span>
              </span>
              <span className="profile-mobile-reviews-badge flex-shrink-0">
                <span>{reviewsCount}</span>
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {!isVisitor && (
        <div className="profile-controls-dock">
          <div className="profile-lang-pill-group">
            <span className="profile-lang-label">
              <i className="bi bi-translate me-1" aria-hidden="true" />
              {t('profile.languageSettings')}
            </span>
            <div className="profile-lang-segmented" role="group" aria-label={t('profile.languageSettings')}>
              {languageOptions.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  aria-pressed={langKey === option.code}
                  className={`profile-lang-option ${langKey === option.code ? 'is-active' : ''}`.trim()}
                  onClick={() => {
                    void onLanguageChange?.(option.code);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            variant="danger"
            size="sm"
            className="rounded-pill fw-semibold profile-logout-btn"
            onClick={() => {
              void onLogout?.();
            }}
          >
            <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
            {t('nav.logout')}
          </Button>
        </div>
      )}
    </section>
  );
}
