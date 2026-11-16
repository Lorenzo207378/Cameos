import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonGroup, Card } from 'react-bootstrap';
import { useTranslation } from '../../contexts/LanguageContext.jsx';
import SpotlightCard from '../reactbits/SpotlightCard.jsx';

/**
 * ProfileHeader
 * Scheda superiore del profilo con avatar, metadati utente, statistiche, lingua e logout.
 * @param {Object} props
 * @param {string|null} [props.avatarUrl]
 * @param {string} props.displayName
 * @param {string} [props.displayEmail='']
 * @param {number} [props.friendsCount=0]
 * @param {number} [props.watchlistCount=0]
 * @param {number} [props.favoritesCount=0]
 * @param {number} [props.watchedCount=0]
 * @param {number} [props.reviewsCount=0]
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
  friendsCount = 0,
  watchlistCount = 0,
  favoritesCount = 0,
  watchedCount = 0,
  reviewsCount = 0,
  isVisitor = false,
  onSelectSection = undefined,
  onLanguageChange = undefined,
  onLogout = undefined
}) {
  const { t, langKey, formatTranslation } = useTranslation();
  const [failedAvatarUrl, setFailedAvatarUrl] = useState(null);
  const isAvatarBroken = Boolean(avatarUrl && failedAvatarUrl === avatarUrl);

  return (
    <SpotlightCard
      spotlightColor="rgba(16, 185, 129, 0.2)"
      spotlightSize={320}
      intensity={0.18}
      borderGlow={0.6}
      className="profile-header-spotlight glass-card card-border-primary"
    >
      <Card className="profile-header-card border-0 text-white text-center">
        <Card.Body className="p-0 d-flex flex-column align-items-center">
          {avatarUrl && !isAvatarBroken ? (
            <img
              src={avatarUrl}
              alt={displayName}
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              className="profile-avatar"
              onError={() => setFailedAvatarUrl(avatarUrl)}
            />
          ) : (
            <div className="profile-avatar-fallback d-flex align-items-center justify-content-center">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <Card.Title className="profile-username">{displayName}</Card.Title>
          {isVisitor && (
            <span className="badge rounded-pill bg-dark text-success border border-success border-opacity-25 profile-visitor-badge mb-2">
              <i className="bi bi-eye me-1" aria-hidden="true" />
              {t('profile.visitorBadge')}
            </span>
          )}
          {displayEmail && <Card.Text className="profile-email">{displayEmail}</Card.Text>}

          <div className="profile-stats-grid">
            {isVisitor ? (
              <span className="profile-stat-pill">
                <i className="bi bi-people-fill text-success" aria-hidden="true" />
                <span>{formatTranslation(t('profile.friendsCount'), { count: friendsCount })}</span>
              </span>
            ) : (
              <Link to="/Cameos/friends" className="profile-stat-pill">
                <i className="bi bi-people-fill text-success" aria-hidden="true" />
                <span>{formatTranslation(t('profile.friendsCount'), { count: friendsCount })}</span>
              </Link>
            )}
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
            <button
              type="button"
              onClick={() => onSelectSection?.('voted')}
              className="profile-stat-pill"
            >
              <i className="bi bi-chat-square-text-fill text-success" aria-hidden="true" />
              <span>{formatTranslation(t('profile.reviewsCount'), { count: reviewsCount })}</span>
            </button>
          </div>

          {!isVisitor && (
            <div className="profile-lang-section w-100 d-flex flex-wrap align-items-center justify-content-center">
              <div className="d-flex align-items-center flex-wrap justify-content-center gap-2">
                <span className="text-white-50 fw-semibold profile-lang-label">
                  <i className="bi bi-translate me-1" aria-hidden="true" />
                  {t('profile.languageSettings')}
                </span>
                <ButtonGroup size="sm">
                  <Button
                    variant={langKey === 'it' ? 'success' : 'outline-secondary'}
                    className="fw-semibold profile-lang-btn"
                    onClick={() => {
                      void onLanguageChange?.('it');
                    }}
                  >
                    {t('profile.italianLang')}
                  </Button>
                  <Button
                    variant={langKey === 'en' ? 'success' : 'outline-secondary'}
                    className="fw-semibold profile-lang-btn"
                    onClick={() => {
                      void onLanguageChange?.('en');
                    }}
                  >
                    {t('profile.englishLang')}
                  </Button>
                </ButtonGroup>
              </div>

              <Button
                variant="outline-light"
                size="sm"
                className="rounded-pill profile-logout-btn"
                onClick={() => {
                  void onLogout?.();
                }}
              >
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                {t('nav.logout')}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    </SpotlightCard>
  );
}
