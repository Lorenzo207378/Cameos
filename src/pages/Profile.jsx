import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useProfileLoader } from '../utils/use/useProfileLoader.js';
import { useElementOuterHeight, useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { normalizeMediaReference } from '../models/utils/index.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import ProfileTabs from '../components/profile/ProfileTabs.jsx';
import ProfileMediaFilter from '../components/profile/ProfileMediaFilter.jsx';
import ProfileReviewsList from '../components/profile/ProfileReviewsList.jsx';
import Watchlist from '../components/profile/Watchlist.jsx';
import Favourites from '../components/profile/Favourites.jsx';
import Watched from '../components/profile/Watched.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/common/carouselControls.css';
import '../css/pages/profile.css';

/**
 * Filtra una collezione del profilo (riferimenti leggeri o modelli risolti) per tipo di media.
 * @template T
 * @param {Array<T>} items
 * @param {'all'|'movie'|'tv'|'season'|'episode'} mediaTypeFilter
 * @returns {Array<T>}
 */
function filterProfileMediaItems(items, mediaTypeFilter) {
  if (!Array.isArray(items) || mediaTypeFilter === 'all') {
    return Array.isArray(items) ? items : [];
  }
  return items.filter((item) => {
    if (!item) return false;
    try {
      return normalizeMediaReference(item).mediaType === mediaTypeFilter;
    } catch {
      return false;
    }
  });
}

export default function Profile() {
  const { user, userProfile, avatarDataUrl, loading: authLoading, logout } = useAuth();
  const { isMobile } = useDevice();
  const { t, normalizedLang, setLanguage } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const { uid: routeUid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { isVisitor, targetUid, userVm } = useProfileLoader({
    routeUid,
    user,
    userProfile,
    normalizedLang
  });
  const prefetchedVisitor = isVisitor ? (location.state?.visitorUser || null) : null;
  const goBack = useGoBack(isVisitor ? APP_ROUTES.friends : APP_ROUTES.home);

  useScrollToTop(targetUid || 'me', !authLoading);

  const {
    switchLanguage,
    currentUser,
    watchlist,
    favorites,
    watched,
    reviews,
    friends,
    resolvedWatchlist,
    resolvedFavorites,
    resolvedWatched,
    resolvedReviews,
    loading: vmLoading,
    error: vmError
  } = userVm;

  const [activeSection, setActiveSection] = useState('watchlist');
  const [isReviewsCollapsed, setIsReviewsCollapsed] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState(/** @type {'all'|'movie'|'tv'|'season'|'episode'} */ ('all'));
  const navbarOffset = useElementOuterHeight('.navbar-top-bar', !isMobile);

  const effectiveMediaFilter = isMobile ? 'all' : mediaTypeFilter;

  const filteredWatchlist = useMemo(
    () => filterProfileMediaItems(resolvedWatchlist, effectiveMediaFilter),
    [resolvedWatchlist, effectiveMediaFilter]
  );
  const filteredFavorites = useMemo(
    () => filterProfileMediaItems(resolvedFavorites, effectiveMediaFilter),
    [resolvedFavorites, effectiveMediaFilter]
  );
  const filteredWatched = useMemo(
    () => filterProfileMediaItems(resolvedWatched, effectiveMediaFilter),
    [resolvedWatched, effectiveMediaFilter]
  );

  const handleLanguageChange = async (nextLang) => {
    if (isVisitor) return;
    setLanguage(nextLang);
    if (userVm.uid) {
      try {
        await switchLanguage(nextLang);
      } catch {
        // Offline or network error keeps local preference active
      }
    }
  };

  const handleLogout = async () => {
    if (isVisitor) return;
    await logout();
    navigate(APP_ROUTES.home);
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  const profileData = currentUser || (isVisitor ? (vmLoading ? prefetchedVisitor : null) : userProfile);
  const friendsCount = isVisitor && !currentUser ? (profileData?.friends?.length ?? 0) : friends.length;
  const reviewsCount = isVisitor && !currentUser ? (profileData?.reviews?.length ?? 0) : reviews.length;
  const visitorUid = isVisitor ? routeUid : undefined;
  const reviewsLink = APP_ROUTES.profileReviewsOf(visitorUid);

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
      aria-label={t('detail.goBack')}
      title={t('detail.goBack')}
    >
      <i className="bi bi-arrow-left text-white" aria-hidden="true" />
    </button>
  );

  if (isVisitor && !vmLoading && !profileData) {
    return (
      <div className="profile-page w-100">
        <div className="profile-container w-100 mx-auto">
          <div className="profile-top-bar d-flex align-items-center justify-content-between gap-3 mb-3">
            {backButton}
          </div>
          <div className={`glass-panel profile-state-box ${vmError ? 'is-error' : ''}`} role={vmError ? 'alert' : 'status'}>
            <i className="bi bi-person-x text-secondary d-block profile-state-icon mb-2" aria-hidden="true" />
            <p className="mb-0 profile-state-text">{vmError || t('profile.userNotFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = isVisitor
    ? (profileData?.photoURL || null)
    : (avatarDataUrl || profileData?.photoURL || user.photoURL || null);
  const displayName = isVisitor
    ? (profileData?.username || profileData?.uid || t('nav.user'))
    : (profileData?.username || user.displayName || t('nav.user'));
  const displayEmail = isVisitor
    ? (profileData?.email || '')
    : (profileData?.email || user.email || '');

  const rawWatchlist = isVisitor && !currentUser ? (profileData?.watchlist || []) : watchlist;
  const rawFavorites = isVisitor && !currentUser ? (profileData?.favorites || []) : favorites;
  const rawWatched = isVisitor && !currentUser ? (profileData?.watched || []) : watched;

  const watchlistCount = filterProfileMediaItems(rawWatchlist, effectiveMediaFilter).length;
  const favoritesCount = filterProfileMediaItems(rawFavorites, effectiveMediaFilter).length;
  const watchedCount = filterProfileMediaItems(rawWatched, effectiveMediaFilter).length;
  const filteredEmptyLabel = effectiveMediaFilter !== 'all' ? t('profile.noFilteredMedia') : undefined;

  const collectionLink = (sectionKey) => APP_ROUTES.profileCollectionOf(sectionKey, visitorUid);
  const canShowReviews = !isVisitor;
  const isSplitReviewsCollapsed = !canShowReviews || isReviewsCollapsed;
  const splitStyle = !isMobile
    ? /** @type {import('react').CSSProperties} */ ({ '--profile-navbar-offset': `${navbarOffset}px` })
    : undefined;

  return (
    <div
      className={`profile-page w-100${!isMobile ? ' profile-page--split' : ''}`}
      style={splitStyle}
    >
      <div className={`profile-split-layout w-100${!isMobile && isSplitReviewsCollapsed ? ' is-reviews-collapsed' : ''}`}>
        <div className="profile-main-column scrollbar-none">
          <div className="profile-top-bar d-flex align-items-center justify-content-between gap-3 mb-3">
            {backButton}

            {isMobile && canShowReviews && (
              <Link to={reviewsLink} className="profile-mobile-reviews-btn m-0 text-decoration-none">
                <span className="d-inline-flex align-items-center gap-2 min-w-0">
                  <i className="bi bi-chat-square-text-fill text-success flex-shrink-0" aria-hidden="true" />
                  <span className="fw-semibold text-truncate">{t('profile.openReviewsCta')}</span>
                </span>
                <span className="profile-mobile-reviews-badge flex-shrink-0">
                  <span>({reviewsCount})</span>
                  <i className="bi bi-chevron-right" aria-hidden="true" />
                </span>
              </Link>
            )}

            <AnimatePresence initial={false}>
              {!isMobile && canShowReviews && isReviewsCollapsed && (
                <motion.button
                  key="reviews-expand-btn"
                  type="button"
                  onClick={() => setIsReviewsCollapsed(false)}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 10, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: 10, scale: 0.96 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="profile-reviews-expand-btn d-inline-flex align-items-center gap-2"
                  aria-expanded={false}
                  aria-label={`${t('detail.expand')} - ${t('profile.reviewsHeading')}`}
                  title={`${t('profile.reviewsHeading')} (${reviewsCount})`}
                >
                  <i className="bi bi-chevron-left" aria-hidden="true" />
                  <i className="bi bi-chat-square-text-fill text-success" aria-hidden="true" />
                  <span className="profile-reviews-counter">({reviewsCount})</span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <ProfileHeader
            avatarUrl={avatarUrl}
            displayName={displayName}
            displayEmail={displayEmail}
            friendsCount={friendsCount}
            isVisitor={isVisitor}
            onLanguageChange={handleLanguageChange}
            onLogout={handleLogout}
          />

          <div className={`profile-tabs-toolbar${!isMobile ? ' profile-tabs-toolbar--desktop' : ''}`}>
            <ProfileTabs
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              watchlistCount={watchlistCount}
              favoritesCount={favoritesCount}
              watchedCount={watchedCount}
            />
            {!isMobile && (
              <ProfileMediaFilter
                value={mediaTypeFilter}
                onChange={setMediaTypeFilter}
              />
            )}
          </div>

          <div className="profile-collection-panel">
            {activeSection === 'watchlist' && (
              <Watchlist
                items={filteredWatchlist}
                titleLink={collectionLink('watchlist')}
                loading={vmLoading}
                error={vmError}
                emptyLabel={filteredEmptyLabel}
              />
            )}
            {activeSection === 'favourites' && (
              <Favourites
                items={filteredFavorites}
                titleLink={collectionLink('favourites')}
                loading={vmLoading}
                error={vmError}
                emptyLabel={filteredEmptyLabel}
              />
            )}
            {activeSection === 'watched' && (
              <Watched
                items={filteredWatched}
                titleLink={collectionLink('watched')}
                loading={vmLoading}
                error={vmError}
                emptyLabel={filteredEmptyLabel}
              />
            )}
          </div>
        </div>

        {!isMobile && canShowReviews && (
          <div
            className={`profile-reviews-column d-flex${isReviewsCollapsed ? ' is-collapsed' : ''}`}
            aria-hidden={isReviewsCollapsed}
            inert={isReviewsCollapsed ? true : undefined}
          >
            <ProfileReviewsList
              reviewItems={resolvedReviews}
              reviewsCount={reviewsCount}
              loading={vmLoading}
              isCollapsed={isReviewsCollapsed}
              onToggleCollapse={() => setIsReviewsCollapsed(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
