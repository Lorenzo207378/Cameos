import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import { useEffect, useEffectEvent, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MediaCategoryLayout from '../components/media/MediaCategoryLayout.jsx';
import { DetailNotFound } from '../components/media/MediaDetailLayout.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useMovieViewModel } from '../viewmodel/index.js';
import { MOVIE_CATEGORY_CONFIG } from '../utils/media/mediaCategoryConfig.js';
import { getCategoryDisplayInfo } from '../utils/media/mediaCategoryPresentation.js';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/** @type {Array<import('../models/Movie.js').Movie>} */
const EMPTY_MOVIES = [];

/**
 * MovieCategory
 * Pagina per visualizzare la griglia completa dei film di una categoria.
 */
export default function MovieCategory() {
  const { category } = useParams();
  const categoryKey = category || 'upcoming';
  const isValidCategory = Object.hasOwn(MOVIE_CATEGORY_CONFIG, categoryKey);
  const { t, normalizedLang } = useTranslation();
  const { categoryMovies, categoryPagination, loadMoviesFromCategory } = useMovieViewModel({ language: normalizedLang });

  const categoryInfo = useMemo(
    () => (isValidCategory ? getCategoryDisplayInfo(categoryKey, t, 'movie') : null),
    [categoryKey, isValidCategory, t]
  );

  const movies = isValidCategory ? (categoryMovies?.[categoryKey] || EMPTY_MOVIES) : EMPTY_MOVIES;
  const pagination = isValidCategory ? categoryPagination?.[categoryKey] : undefined;
  const hasMore = isValidCategory ? (pagination?.hasMore ?? (movies.length >= 20)) : false;
  const isLoadingMore = Boolean(pagination?.loadingMore);
  const initialLoading = isValidCategory && movies.length === 0 && (!pagination || pagination.loading);

  useScrollToTop(categoryKey, !initialLoading);

  const fetchInitialCategory = useEffectEvent((targetCategory) => {
    void loadMoviesFromCategory(targetCategory, { page: 1, language: normalizedLang });
  });

  useEffect(() => {
    if (!isValidCategory || pagination?.loading || pagination?.error) return;
    if (movies.length === 0 && !pagination?.page) {
      fetchInitialCategory(categoryKey);
    }
  }, [categoryKey, isValidCategory, movies.length, pagination?.loading, pagination?.error, pagination?.page]);

  const goBack = useGoBack(APP_ROUTES.movies);

  const handleLoadMore = useCallback(async () => {
    if (!isValidCategory || isLoadingMore || !hasMore) return;
    await loadMoviesFromCategory(categoryKey, { append: true, language: normalizedLang });
  }, [categoryKey, hasMore, isLoadingMore, isValidCategory, loadMoviesFromCategory, normalizedLang]);

  const handleRetry = useCallback(() => {
    if (!isValidCategory) return;
    void loadMoviesFromCategory(categoryKey, { page: 1, language: normalizedLang, force: true });
  }, [categoryKey, isValidCategory, loadMoviesFromCategory, normalizedLang]);

  if (!isValidCategory) {
    return (
      <DetailNotFound
        icon="bi-film"
        title={t('common.noResults')}
        subtitle={null}
        onBack={goBack}
      />
    );
  }

  if (initialLoading) {
    return <LoadingScreen />;
  }

  return (
    <MediaCategoryLayout
      title={categoryInfo?.name || categoryKey}
      subtitle={categoryInfo?.subtitle || ''}
      items={movies}
      type="movie"
      upcoming={categoryKey === 'upcoming'}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={pagination?.error}
      onBack={goBack}
      onLoadMore={handleLoadMore}
      onRetry={handleRetry}
    />
  );
}
