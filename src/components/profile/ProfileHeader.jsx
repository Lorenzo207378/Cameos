import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import FriendAvatar from '../friends/FriendAvatar.jsx';
import { APP_ROUTES } from '../../utils/appRoutes.js';

/**
 * ProfileHeader
 * Banner identità profilo con avatar spotlight, contatore amici, lingua e logout.
 * @param {Object} props
 * @param {string|null} [props.avatarUrl]
 * @param {string} props.displayName
 * @param {string} [props.displayEmail='']
 * @param {number} [props.friendsCount=0]
 * @param {boolean} [props.isVisitor=false]
 * @param {(lang: string) => (void|Promise<void>)} [props.onLanguageChange]
 * @param {() => (void|Promise<void>)} [props.onLogout]
 * @returns {import('react').ReactElement}
 */
export default function ProfileHeader({
  avatarUrl = undefined,
  displayName,
  displayEmail = '',
  friendsCount = 0,
  isVisitor = false,
  onLanguageChange = undefined,
  onLogout = undefined
}) {
  const { t, langKey } = useTranslation();

  const languageOptions = [
    { code: 'it', label: t('profile.italianLang') },
    { code: 'en', label: t('profile.englishLang') }
  ];

  const friendsContent = (
    <>
      <span className="profile-friends-stat-count">{friendsCount}</span>
      <span className="profile-friends-stat-label">{t('profile.friendsTab')}</span>
    </>
  );

  const friendsIndicator = isVisitor ? (
    <div className="profile-friends-stat d-inline-flex flex-column align-items-center flex-shrink-0">
      {friendsContent}
    </div>
  ) : (
    <Link
      to={APP_ROUTES.friends}
      className="profile-friends-stat profile-friends-stat--interactive d-inline-flex flex-column align-items-center flex-shrink-0 text-decoration-none"
    >
      {friendsContent}
    </Link>
  );

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

        <div className="profile-identity-copy d-flex flex-column justify-content-center gap-1 min-w-0 pe-2 pe-sm-3">
          <h1 className="profile-username mb-0" title={displayName}>{displayName}</h1>

          {displayEmail && <p className="profile-email mb-0" title={displayEmail}>{displayEmail}</p>}
        </div>

        <div className="ms-auto flex-shrink-0">{friendsIndicator}</div>
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
  friendsCount: PropTypes.number,
  isVisitor: PropTypes.bool,
  onLanguageChange: PropTypes.func,
  onLogout: PropTypes.func
};
