import { useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import {
  PROFILE_COLLECTION_KEYS,
  filterByMediaType,
  useProfileLoader
} from '../viewmodel/index.js';
import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import LoadingScreen from '../components/LoadingScreen.jsx';
import ProfileGuestCard from '../components/profile/ProfileGuestCard.jsx';
import ProfileMediaFilter from '../components/profile/ProfileMediaFilter.jsx';
import MediaCategoryLayout from '../components/media/MediaCategoryLayout.jsx';
import { DetailNotFound } from '../components/media/MediaDetailLayout.jsx';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/** @type {Array<any>} */
const EMPTY_ITEMS = [];
const VALID_MEDIA_FILTERS = new Set(['all', 'movie', 'tv', 'season', 'episode']);

/**
 * ProfileMediaCategory
 * Pagina griglia completa per una collezione del profilo utente (watchlist, favorites, watched),
 * gemella di `MovieCategory.jsx` e `TVSeriesCategory.jsx` su `MediaCategoryLayout`.
 * Eredita l'eventuale filtro iniziale da `Profile.jsx` (`?type=...`) e mantiene eventuali cambi
 * del filtro solo localmente su questa pagina.
 */
export default function ProfileMediaCategory() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { t, normalizedLang } = useTranslation();
  const { uid: routeUid, collection } = useParams();
  const [searchParams] = useSearchParams();

  const isValidCollection = typeof collection === 'string' && PROFILE_COLLECTION_KEYS.includes(/** @type {any} */ (collection));
  const collectionKey = isValidCollection ? /** @type {'watchlist'|'favorites'|'watched'} */ (collection) : null;

  const [mediaTypeFilter, setMediaTypeFilter] = useState(() => {
    const initial = searchParams.get('type');
    return /** @type {'all'|'movie'|'tv'|'season'|'episode'} */ (
      initial && VALID_MEDIA_FILTERS.has(initial) ? initial : 'all'
    );
  });

  const {
    isVisitor,
    targetUid,
    currentUser,
    resolvedWatchlist,
    resolvedFavorites,
    resolvedWatched,
    isInitialLoading,
    error: vmError,
    isOffline,
    retry
  } = useProfileLoader({
    routeUid,
    user,
    userProfile,
    normalizedLang,
    enabled: isValidCollection
  });

  const goBack = useGoBack(APP_ROUTES.profileOf(isVisitor ? routeUid : undefined));
  useScrollToTop(`${targetUid || 'me'}-${collection || 'invalid'}`, !authLoading && !isInitialLoading);

  const rawResolvedList = collectionKey === 'favorites'
    ? resolvedFavorites
    : collectionKey === 'watched'
      ? resolvedWatched
      : collectionKey === 'watchlist'
        ? resolvedWatchlist
        : EMPTY_ITEMS;

  const mediaItems = useMemo(
    () => filterByMediaType(rawResolvedList, mediaTypeFilter),
    [rawResolvedList, mediaTypeFilter]
  );

  if (!collectionKey) {
    return (
      <DetailNotFound
        icon="bi-collection"
        title={t('common.noResults')}
        subtitle={null}
        onBack={goBack}
      />
    );
  }

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <ProfileGuestCard onBack={goBack} />;
  }

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  const profileData = currentUser || (isVisitor ? null : userProfile);
  if (isVisitor && !profileData && !vmError) {
    return (
      <DetailNotFound
        icon="bi-person-x"
        title={t('profile.userNotFound')}
        subtitle={null}
        onBack={goBack}
      />
    );
  }

  const pageTitle = collectionKey === 'favorites'
    ? t('profile.favoritesTab')
    : collectionKey === 'watched'
      ? t('profile.watchedTab')
      : t('profile.watchlistTab');

  const collectionEmptyMessage = collectionKey === 'favorites'
    ? t('profile.noFavorites')
    : collectionKey === 'watched'
      ? t('profile.noWatched')
      : t('profile.noWatchlist');

  return (
    <MediaCategoryLayout
      title={pageTitle}
      subtitle={t('profile.title')}
      items={mediaItems}
      type="mixed"
      hasMore={false}
      error={vmError}
      isOffline={isOffline}
      emptyMessage={mediaTypeFilter !== 'all' ? t('profile.noFilteredMedia') : collectionEmptyMessage}
      headerActions={
        <ProfileMediaFilter
          value={mediaTypeFilter}
          onChange={setMediaTypeFilter}
        />
      }
      onBack={goBack}
      onRetry={retry}
    />
  );
}
