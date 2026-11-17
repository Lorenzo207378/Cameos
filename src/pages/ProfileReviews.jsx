import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useUserViewModel } from '../viewmodel/index.js';
import { useGoBack } from '../utils/domUtils.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileReviewsList from '../components/profile/ProfileReviewsList.jsx';
import '../css/common/text.css';
import '../css/common/elements.css';
import '../css/pages/profile.css';

export default function ProfileReviews() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t, normalizedLang } = useTranslation();
  const { uid: routeUid } = useParams();

  const isVisitor = Boolean(routeUid && (!user?.uid || routeUid !== user.uid));
  const targetUid = isVisitor ? routeUid : (user?.uid || null);
  const goBack = useGoBack(isVisitor ? `/Cameos/profile/${routeUid}` : '/Cameos/profile');

  const userVm = useUserViewModel({
    language: normalizedLang,
    initialUser: isVisitor ? null : (userProfile || user)
  });
  const {
    loadUser,
    loadVisitorProfile,
    hydrateUserMediaLists,
    currentUser,
    friends,
    reviews,
    resolvedReviews,
    loading: vmLoading,
    error: vmError
  } = userVm;

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

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  const profileData = currentUser || (isVisitor ? null : userProfile);
  const friendsCount = isVisitor && !currentUser ? (profileData?.friends?.length ?? 0) : friends.length;
  const reviewsCount = isVisitor && !currentUser ? (profileData?.reviews?.length ?? 0) : reviews.length;

  return (
    <div className="profile-page w-100">
      <div className="profile-container">
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

          <Link to="/Cameos/friends" className="profile-friends-top-link text-decoration-none">
            <span>{t('profile.friendsTopPrefix')}</span>
            <span className="profile-friends-top-count">{friendsCount}</span>
            <span>{t('profile.friendsTopSuffix')}</span>
          </Link>
        </div>

        {vmError && resolvedReviews.length === 0 ? (
          <div className="glass-panel profile-state-box is-error" role="alert">
            <span className="profile-state-text">{vmError}</span>
          </div>
        ) : (
          <ProfileReviewsList
            reviewItems={resolvedReviews}
            reviewsCount={reviewsCount}
            loading={vmLoading}
          />
        )}
      </div>
    </div>
  );
}
