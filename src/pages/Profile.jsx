import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import {
  filterByMediaType,
  useProfileLoader
} from '../viewmodel/index.js';
import { useElementOuterHeight, useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import ProfileTabs from '../components/profile/ProfileTabs.jsx';
import ProfileMediaFilter from '../components/profile/ProfileMediaFilter.jsx';
import ProfileReviewsList from '../components/profile/ProfileReviewsList.jsx';
import ProfileMediaGrid from '../components/profile/ProfileMediaGrid.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/common/carouselControls.css';
import '../css/pages/profile.css';

/** @type {Array<any>} */
const EMPTY_LIST = [];

export default function Profile() {
  const { user, userProfile, avatarDataUrl, loading: authLoading, logout } = useAuth();
  const { isMobile } = useDevice();
  const { t, normalizedLang, setLanguage } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const { uid: routeUid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    isVisitor,
    targetUid,
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
    isInitialLoading,
    error: vmError,
    isOffline,
    retry
  } = useProfileLoader({
    routeUid,
    user,
    userProfile,
    normalizedLang
  });
  const prefetchedVisitor = isVisitor ? (location.state?.visitorUser || null) : null;
  const goBack = useGoBack(isVisitor ? APP_ROUTES.friends : APP_ROUTES.home);
  const mainColumnRef = useRef(/** @type {HTMLDivElement|null} */ (null));

  useScrollToTop(targetUid || 'me', !authLoading && isMobile);

  useEffect(() => {
    if (!isMobile && mainColumnRef.current) {
      mainColumnRef.current.scrollTop = 0;
    }
  }, [isMobile, targetUid]);

  const [activeSection, setActiveSection] = useState(/** @type {'watchlist'|'favorites'|'watched'} */ ('watchlist'));
  const [isReviewsCollapsed, setIsReviewsCollapsed] = useState(false);
  const [mediaTypeFilter, setMediaTypeFilter] = useState(/** @type {'all'|'movie'|'tv'|'season'|'episode'} */ ('all'));
  const navbarOffset = useElementOuterHeight('.navbar-top-bar', !isMobile);

  const effectiveMediaFilter = isMobile ? 'all' : mediaTypeFilter;

  const profileData = currentUser || (isVisitor ? (isInitialLoading ? prefetchedVisitor : null) : userProfile);
  const rawWatchlist = isVisitor && !currentUser ? (profileData?.watchlist || EMPTY_LIST) : watchlist;
  const rawFavorites = isVisitor && !currentUser ? (profileData?.favorites || EMPTY_LIST) : favorites;
  const rawWatched = isVisitor && !currentUser ? (profileData?.watched || EMPTY_LIST) : watched;

  const collectionCounts = useMemo(() => ({
    watchlist: filterByMediaType(rawWatchlist, effectiveMediaFilter).length,
    favorites: filterByMediaType(rawFavorites, effectiveMediaFilter).length,
    watched: filterByMediaType(rawWatched, effectiveMediaFilter).length
  }), [rawWatchlist, rawFavorites, rawWatched, effectiveMediaFilter]);

  const activeResolvedSource = activeSection === 'favorites'
    ? resolvedFavorites
    : activeSection === 'watched'
      ? resolvedWatched
      : resolvedWatchlist;

  const activeItems = useMemo(
    () => filterByMediaType(activeResolvedSource, effectiveMediaFilter),
    [activeResolvedSource, effectiveMediaFilter]
  );

  const handleLanguageChange = useCallback((nextLang) => {
    if (isVisitor) return;
    setLanguage(nextLang);
  }, [isVisitor, setLanguage]);

  const handleLogout = useCallback(async () => {
    if (isVisitor) return;
    await logout();
    navigate(APP_ROUTES.home);
  }, [isVisitor, logout, navigate]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

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

  if (isVisitor && !isInitialLoading && !profileData) {
    const visitorErrorIcon = vmError
      ? (isOffline ? 'bi-wifi-off' : 'bi-exclamation-triangle')
      : 'bi-person-x';
    return (
      <div className="profile-page w-100">
        <div className="profile-container w-100 mx-auto">
          <div className="profile-top-bar d-flex align-items-center justify-content-between gap-3 mb-3">
            {backButton}
          </div>
          <div className={`glass-panel profile-state-box ${vmError ? 'is-error' : ''}`} role={vmError ? 'alert' : 'status'}>
            <i className={`bi ${visitorErrorIcon} text-secondary d-block profile-state-icon mb-2`} aria-hidden="true" />
            <p className="mb-0 profile-state-text">
              {vmError ? t('common.error') : t('profile.userNotFound')}
            </p>
            {vmError && (
              <button type="button" className="btn btn-outline-success btn-sm rounded-pill mt-3" onClick={retry}>
                {t('common.retry')}
              </button>
            )}
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

  const activeTitleLink = APP_ROUTES.profileCollectionOf(activeSection, visitorUid, effectiveMediaFilter);
  const collectionLabels = {
    watchlist: {
      title: t('profile.watchlistTab'),
      loading: t('profile.loadingWatchlist'),
      error: t('profile.watchlistError'),
      empty: t('profile.noWatchlist')
    },
    favorites: {
      title: t('profile.favoritesTab'),
      loading: t('profile.loadingFavorites'),
      error: t('profile.favoritesError'),
      empty: t('profile.noFavorites')
    },
    watched: {
      title: t('profile.watchedTab'),
      loading: t('profile.loadingWatched'),
      error: t('profile.watchedError'),
      empty: t('profile.noWatched')
    }
  }[activeSection];
  const activeEmptyLabel = effectiveMediaFilter !== 'all'
    ? t('profile.noFilteredMedia')
    : collectionLabels.empty;

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
        <div ref={mainColumnRef} className="profile-main-column scrollbar-none">
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
              watchlistCount={collectionCounts.watchlist}
              favoritesCount={collectionCounts.favorites}
              watchedCount={collectionCounts.watched}
            />
            {!isMobile && (
              <ProfileMediaFilter
                value={mediaTypeFilter}
                onChange={setMediaTypeFilter}
              />
            )}
          </div>

          <div
            id="profile-collection-tabpanel"
            role="tabpanel"
            aria-labelledby={`profile-tab-${activeSection}`}
            className="profile-collection-panel"
          >
            <ProfileMediaGrid
              title={collectionLabels.title}
              titleLink={activeTitleLink}
              items={activeItems}
              loading={isInitialLoading}
              error={vmError}
              isOffline={isOffline}
              loadingLabel={collectionLabels.loading}
              errorLabel={collectionLabels.error}
              emptyLabel={activeEmptyLabel}
              onRetry={retry}
            />
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
              loading={isInitialLoading}
              isCollapsed={isReviewsCollapsed}
              onToggleCollapse={() => setIsReviewsCollapsed(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
