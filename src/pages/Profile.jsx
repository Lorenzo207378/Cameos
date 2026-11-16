import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useUserViewModel } from '../viewmodel/index.js';
import { useGoBack } from '../utils/domUtils.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileHeader from '../components/profile/ProfileHeader.jsx';
import ProfileTabs from '../components/profile/ProfileTabs.jsx';
import Watchlist from '../components/profile/Watchlist.jsx';
import Favourites from '../components/profile/Favourites.jsx';
import Voted from '../components/profile/Voted.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/common/carouselControls.css';
import '../css/pages/profile.css';

export default function Profile() {
  const { user, userProfile, loading: authLoading, logout } = useAuth();
  const { t, normalizedLang, setLanguage } = useTranslation();
  const { uid: routeUid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const isVisitor = Boolean(routeUid && (!user?.uid || routeUid !== user.uid));
  const targetUid = isVisitor ? routeUid : (user?.uid || null);
  const prefetchedVisitor = isVisitor ? (location.state?.visitorUser || null) : null;
  const goBack = useGoBack(isVisitor ? '/Cameos/friends' : '/Cameos/');

  const userVm = useUserViewModel({
    language: normalizedLang,
    initialUser: isVisitor ? null : (userProfile || user)
  });
  const {
    loadUser,
    loadVisitorProfile,
    switchLanguage,
    hydrateUserMediaLists,
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

  useEffect(() => {
    if (!user?.uid || !targetUid) return undefined;
    let ignore = false;

    const loadPromise = isVisitor
      ? loadVisitorProfile(targetUid)
      : loadUser(targetUid);

    void loadPromise.then((loadedUser) => {
      if (!ignore && loadedUser) {
        void hydrateUserMediaLists({ language: normalizedLang });
      }
    });

    return () => {
      ignore = true;
    };
  }, [user?.uid, targetUid, isVisitor, normalizedLang, loadUser, loadVisitorProfile, hydrateUserMediaLists]);

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
    navigate('/Cameos/');
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  const profileData = currentUser || (isVisitor ? (vmLoading ? prefetchedVisitor : null) : userProfile);
  const backBar = (
    <div className="profile-top-bar d-flex align-items-center mb-3">
      <button
        type="button"
        onClick={goBack}
        className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
        aria-label={t('detail.goBack')}
        title={t('detail.goBack')}
      >
        <i className="bi bi-arrow-left text-white" aria-hidden="true" />
      </button>
    </div>
  );

  if (isVisitor && !vmLoading && !profileData) {
    return (
      <div className="profile-page w-100">
        <div className="profile-container">
          {backBar}
          <div className={`glass-panel profile-state-box ${vmError ? 'is-error' : ''}`} role={vmError ? 'alert' : 'status'}>
            <i className="bi bi-person-x text-secondary d-block profile-state-icon" aria-hidden="true" />
            <p className="mb-0 profile-state-text">{vmError || t('profile.userNotFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = isVisitor
    ? (profileData?.photoURL || null)
    : (profileData?.photoURL || user.photoURL || null);
  const displayName = isVisitor
    ? (profileData?.username || profileData?.uid || t('nav.user'))
    : (profileData?.username || user.displayName || t('nav.user'));
  const displayEmail = isVisitor
    ? (profileData?.email || '')
    : (profileData?.email || user.email || '');

  const friendsCount = isVisitor && !currentUser ? (profileData?.friends?.length ?? 0) : friends.length;
  const watchlistCount = isVisitor && !currentUser ? (profileData?.watchlist?.length ?? 0) : watchlist.length;
  const favoritesCount = isVisitor && !currentUser ? (profileData?.favorites?.length ?? 0) : favorites.length;
  const watchedCount = isVisitor && !currentUser ? (profileData?.watched?.length ?? 0) : watched.length;
  const reviewsCount = isVisitor && !currentUser ? (profileData?.reviews?.length ?? 0) : reviews.length;

  return (
    <div className="profile-page w-100">
      <div className="profile-container">
        {backBar}

        <ProfileHeader
          avatarUrl={avatarUrl}
          displayName={displayName}
          displayEmail={displayEmail}
          friendsCount={friendsCount}
          watchlistCount={watchlistCount}
          favoritesCount={favoritesCount}
          watchedCount={watchedCount}
          reviewsCount={reviewsCount}
          isVisitor={isVisitor}
          onSelectSection={setActiveSection}
          onLanguageChange={handleLanguageChange}
          onLogout={handleLogout}
        />

        <ProfileTabs
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          watchlistCount={watchlistCount}
          favoritesCount={favoritesCount}
          votedCount={watchedCount + reviewsCount}
        />

        {activeSection === 'watchlist' && (
          <Watchlist items={resolvedWatchlist} loading={vmLoading} error={vmError} />
        )}
        {activeSection === 'favourites' && (
          <Favourites items={resolvedFavorites} loading={vmLoading} error={vmError} />
        )}
        {activeSection === 'voted' && (
          <Voted
            watchedItems={resolvedWatched}
            reviewItems={resolvedReviews}
            loading={vmLoading}
            error={vmError}
          />
        )}
      </div>
    </div>
  );
}
