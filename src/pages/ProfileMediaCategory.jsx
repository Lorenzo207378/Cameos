import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useProfileLoader } from '../utils/use/useProfileLoader.js';
import { normalizeMediaReference } from '../models/utils/index.js';
import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import MediaCard from '../components/media/MediaCard.jsx';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

export default function ProfileMediaCategory() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t, formatTranslation, normalizedLang } = useTranslation();
  const { uid: routeUid, collection } = useParams();

  const { isVisitor, targetUid, userVm } = useProfileLoader({
    routeUid,
    user,
    userProfile,
    normalizedLang
  });
  const goBack = useGoBack(APP_ROUTES.profileOf(isVisitor ? routeUid : undefined));

  useScrollToTop(`${targetUid || 'me'}-${collection || 'watchlist'}`);

  const {
    resolvedWatchlist,
    resolvedFavorites,
    resolvedWatched,
    resolvedReviews,
    loading: vmLoading,
    error: vmError
  } = userVm;

  const mediaItems = useMemo(() => {
    let rawList = resolvedWatchlist;
    if (collection === 'favorites') {
      rawList = resolvedFavorites;
    } else if (collection === 'watched') {
      rawList = resolvedWatched;
    } else if (collection === 'voted') {
      const reviewMedia = resolvedReviews.map((entry) => entry?.media).filter(Boolean);
      const seenKeys = new Set();
      rawList = [...resolvedWatched, ...reviewMedia].filter((item) => {
        if (!item) return false;
        try {
          const ref = normalizeMediaReference(item);
          if (seenKeys.has(ref.targetKey)) return false;
          seenKeys.add(ref.targetKey);
          return true;
        } catch {
          return false;
        }
      });
    }

    const mapped = [];
    for (const item of rawList) {
      if (!item) continue;
      try {
        const ref = normalizeMediaReference(item);
        mapped.push({
          ...item,
          id: ref.targetKey,
          mediaId: ref.mediaId,
          seriesId: item.seriesId ?? (ref.mediaType !== 'movie' ? ref.mediaId : undefined),
          seasonNumber: item.seasonNumber ?? ref.seasonNumber,
          episodeNumber: item.episodeNumber ?? ref.episodeNumber,
          mediaType: ref.mediaType === 'movie' ? 'movie' : 'tv'
        });
      } catch {
        // Skip malformed item
      }
    }
    return mapped;
  }, [collection, resolvedWatchlist, resolvedFavorites, resolvedWatched, resolvedReviews]);

  if (authLoading || (vmLoading && mediaItems.length === 0)) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  const collectionTitles = {
    watchlist: t('profile.watchlistTab'),
    favorites: t('profile.favoritesTab'),
    watched: t('profile.watchedTab'),
    voted: t('profile.votedTab')
  };
  const pageTitle = collectionTitles[collection] || t('profile.watchlistTab');

  return (
    <div className="media-category-page position-relative d-flex flex-column w-100">
      <header className="glass-header-fixed">
        <div className="media-category-header-content d-flex align-items-center justify-content-between gap-2 w-100 container-fluid px-2 px-sm-4 px-md-5">
          <div className="d-flex align-items-center gap-2 gap-sm-3 min-w-0 flex-grow-1">
            <button
              type="button"
              onClick={goBack}
              className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-success text-uppercase fw-bold mb-0 category-subtitle text-truncate">
                {t('profile.title')}
              </p>
              <h1 className="h4 text-white fw-bold mb-0 category-title text-truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary rounded-pill fw-normal d-flex align-items-center gap-1 gap-sm-2 count-pill flex-shrink-0">
            <i className="bi bi-collection text-success" aria-hidden="true" />
            <span>{formatTranslation(t('common.mediaCount'), { count: mediaItems.length, media: t('nav.media') })}</span>
          </span>
        </div>
      </header>

      <div className="media-category-scroll-container scrollbar-none">
        <div className="container-fluid px-2 px-sm-4 px-md-5">
          {mediaItems.length > 0 ? (
            <div className="media-category-grid">
              {mediaItems.map((entry) => (
                <MediaCard key={entry.id} item={entry} type={entry.mediaType} showType />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 my-5">
              <i className="bi bi-collection text-secondary display-3 mb-3 d-block" aria-hidden="true" />
              <p className="text-muted fs-5" role={vmError ? 'alert' : undefined}>
                {vmError || t('common.noResults')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
