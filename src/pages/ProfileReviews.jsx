import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useProfileLoader } from '../viewmodel/index.js';
import { useGoBack } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
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

  const { isVisitor, userVm } = useProfileLoader({
    routeUid,
    user,
    userProfile,
    normalizedLang
  });
  const goBack = useGoBack(APP_ROUTES.profileOf(isVisitor ? routeUid : undefined));

  const {
    currentUser,
    reviews,
    resolvedReviews,
    loading: vmLoading,
    error: vmError
  } = userVm;

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  const profileData = currentUser || (isVisitor ? null : userProfile);
  const reviewsCount = isVisitor && !currentUser ? (profileData?.reviews?.length ?? 0) : reviews.length;

  return (
    <div className="profile-page w-100">
      <div className="profile-container w-100 mx-auto">
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
