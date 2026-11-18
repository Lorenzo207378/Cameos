import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import { useDevice } from '../../contexts/DeviceContext.jsx';
import FriendAvatar from '../friends/FriendAvatar.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';

/**
 * ProfileHeader
 * Banner identità profilo con avatar spotlight, statistiche contestuali, lingua e logout.
 * @param {Object} props
 * @param {string|null} [props.avatarUrl]
 * @param {string} props.displayName
 * @param {string} [props.displayEmail='']
 * @param {string} [props.reviewsLink]
 * @param {boolean} [props.isVisitor=false]
 * @param {(lang: string) => (void|Promise<void>)} [props.onLanguageChange]
 * @param {() => (void|Promise<void>)} [props.onLogout]
 * @returns {import('react').JSX.Element}
 */
export default function ProfileHeader({
  avatarUrl = undefined,
  displayName,
  displayEmail = '',
  reviewsLink = APP_ROUTES.profileReviews,
  isVisitor = false,
  onLanguageChange = undefined,
  onLogout = undefined
}) {
  const { t, langKey } = useTranslation();
  const { isMobile } = useDevice();

  const languageOptions = [
    { code: 'it', label: t('profile.italianLang') },
    { code: 'en', label: t('profile.englishLang') }
  ];

  return (
    <section className="profile-identity-banner text-white">
      <div className="profile-identity-main d-flex align-items-center min-w-0">
        <div className="profile-avatar-wrap">
          <FriendAvatar
            photoURL={avatarUrl}
            name={displayName}
            seed={displayEmail || displayName}
            size="lg"
            ringVariant="emerald"
          />
        </div>

        <div className="profile-identity-copy d-flex flex-column gap-1 min-w-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="profile-username mb-0">{displayName}</h1>
          </div>

          {displayEmail && <p className="profile-email mb-0">{displayEmail}</p>}

          {isMobile && (
            <Link to={reviewsLink} className="profile-mobile-reviews-btn align-self-start text-decoration-none">
              <span className="d-inline-flex align-items-center gap-3 min-w-0">
                <i className="bi bi-chat-square-text-fill text-success flex-shrink-0" aria-hidden="true" />
                <span className="fw-semibold text-truncate">{t('profile.openReviewsCta')}</span>
              </span>
              <span className="profile-mobile-reviews-badge flex-shrink-0">
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {!isVisitor && (
        <div className="profile-controls-dock d-flex flex-wrap">
          <div className="profile-lang-pill-group d-inline-flex align-items-center flex-wrap gap-2">
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

ProfileHeader.propTypes = {
  avatarUrl: PropTypes.string,
  displayName: PropTypes.string.isRequired,
  displayEmail: PropTypes.string,
  reviewsCount: PropTypes.number,
  reviewsLink: PropTypes.string,
  isVisitor: PropTypes.bool,
  onLanguageChange: PropTypes.func,
  onLogout: PropTypes.func
};
