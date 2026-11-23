import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useDevice } from '../contexts/DeviceContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useProfileLoader } from '../utils/use/useProfileLoader.js';
import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import ProfileTabs from '../components/profile/ProfileTabs.jsx';
import ProfileReviewsList from '../components/profile/ProfileReviewsList.jsx';
import Watchlist from '../components/profile/Watchlist.jsx';
import Favourites from '../components/profile/Favourites.jsx';
import Watched from '../components/profile/Watched.jsx';
import Voted from '../components/profile/Voted.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/common/carouselControls.css';
import '../css/pages/profile.css';

export default function Profile() {
  const { user, userProfile, avatarDataUrl, loading: authLoading, logout } = useAuth();
  const { isMobile } = useDevice();
  const { t, normalizedLang, setLanguage } = useTranslation();
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

  const backBar = (
    <div className="profile-top-bar d-flex align-items-center justify-content-between gap-3 mb-3">
      <button
        type="button"
        onClick={goBack}
        className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
        aria-label={t('detail.goBack')}
        title={t('detail.goBack')}
      >
        <i className="bi bi-arrow-left text-white" aria-hidden="true" />
      </button>
      {!isVisitor && (
          <Link to={APP_ROUTES.friends} className="profile-friends-top-link d-inline-flex align-items-baseline gap-1 py-1 px-2 text-decoration-none">
            <span>{t('profile.friendsTopPrefix')}</span>
            <span className="profile-friends-top-count">{friendsCount}</span>
            <span>{t('profile.friendsTopSuffix')}</span>
          </Link>
      )}
    </div>
  );

  if (isVisitor && !vmLoading && !profileData) {
    return (
      <div className="profile-page w-100">
        <div className="profile-container w-100 mx-auto">
          {backBar}
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

  const watchlistCount = isVisitor && !currentUser ? (profileData?.watchlist?.length ?? 0) : watchlist.length;
  const favoritesCount = isVisitor && !currentUser ? (profileData?.favorites?.length ?? 0) : favorites.length;
  const watchedCount = isVisitor && !currentUser ? (profileData?.watched?.length ?? 0) : watched.length;
  const reviewsCount = isVisitor && !currentUser ? (profileData?.reviews?.length ?? 0) : reviews.length;

  const visitorUid = isVisitor ? routeUid : undefined;
  const collectionLink = (sectionKey) => APP_ROUTES.profileCollectionOf(sectionKey, visitorUid);
  const reviewsLink = APP_ROUTES.profileReviewsOf(visitorUid);

  return (
    <div className="profile-page w-100">
      <div className="profile-split-layout w-100">
        <div className="profile-main-column">
          {backBar}

          <ProfileHeader
            avatarUrl={avatarUrl}
            displayName={displayName}
            displayEmail={displayEmail}
            reviewsLink={reviewsLink}
            isVisitor={isVisitor}
            onLanguageChange={handleLanguageChange}
            onLogout={handleLogout}
          />

          <ProfileTabs
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            watchlistCount={watchlistCount}
            favoritesCount={favoritesCount}
            watchedCount={watchedCount}
            votedCount={reviewsCount}
          />

          {activeSection === 'watchlist' && (
            <Watchlist
              items={resolvedWatchlist}
              titleLink={collectionLink('watchlist')}
              loading={vmLoading}
              error={vmError}
            />
          )}
          {activeSection === 'favourites' && (
            <Favourites
              items={resolvedFavorites}
              titleLink={collectionLink('favourites')}
              loading={vmLoading}
              error={vmError}
            />
          )}
          {activeSection === 'watched' && (
            <Watched
              items={resolvedWatched}
              titleLink={collectionLink('watched')}
              loading={vmLoading}
              error={vmError}
            />
          )}
          {activeSection === 'voted' && (
            <Voted
              reviewItems={resolvedReviews}
              titleLink={collectionLink('voted')}
              loading={vmLoading}
              error={vmError}
            />
          )}
        </div>

        {!isMobile && (
          <div className="profile-reviews-column d-flex">
            <ProfileReviewsList
              reviewItems={resolvedReviews}
              reviewsCount={reviewsCount}
              loading={vmLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
