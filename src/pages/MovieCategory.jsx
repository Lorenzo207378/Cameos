import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import { useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MediaCategoryLayout from '../components/media/MediaCategoryLayout.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useMovieViewModel } from '../viewmodel/index.js';
import { getCategoryDisplayInfo } from '../utils/media/mediaCategories.js';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/**
 * MovieCategory
 * Pagina per visualizzare la griglia completa dei film di una categoria.
 */
export default function MovieCategory() {
  const { category, id } = useParams();
  const categoryKey = category || id || 'upcoming';
  const { t, formatTranslation, normalizedLang } = useTranslation();
  const movieViewModel = useMovieViewModel({ language: normalizedLang });

  const { loadMoviesFromCategory } = movieViewModel;

  const categoryInfo = useMemo(() => getCategoryDisplayInfo(categoryKey, t, 'movie'), [categoryKey, t]);

  const categoryMoviesMap = movieViewModel.categoryMovies;
  const upcomingMovies = movieViewModel.upcomingMovies;

  const movies = useMemo(() => {
    return (
      categoryMoviesMap?.[categoryKey] ||
      (categoryKey === 'upcoming' ? upcomingMovies : null) ||
      []
    );
  }, [categoryKey, categoryMoviesMap, upcomingMovies]);

  const pagination = movieViewModel.categoryPagination?.[categoryKey];
  const hasMore = pagination?.hasMore ?? (movies.length >= 20);
  const isLoadingMore = Boolean(pagination?.loadingMore);
  const initialLoading = movies.length === 0 && (!pagination || pagination.loading);

  useScrollToTop(categoryKey);

  useEffect(() => {
    if (pagination?.loading) return;
    const loadedLang = pagination?.language;
    if ((movies.length === 0 && !pagination?.page) || (loadedLang && loadedLang !== normalizedLang)) {
      void loadMoviesFromCategory(categoryKey, { page: 1, language: normalizedLang });
    }
  }, [categoryKey, loadMoviesFromCategory, movies.length, pagination?.loading, pagination?.page, pagination?.language, normalizedLang]);

  const goBack = useGoBack(APP_ROUTES.movies);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await loadMoviesFromCategory(categoryKey, { append: true, language: normalizedLang });
  }, [categoryKey, hasMore, isLoadingMore, loadMoviesFromCategory, normalizedLang]);

  if (initialLoading && movies.length === 0) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  return (
    <MediaCategoryLayout
      title={categoryInfo.name}
      subtitle={categoryInfo.subtitle}
      countLabel={formatTranslation(t('common.mediaCount'), { count: movies.length, media: t('nav.movies') })}
      items={movies}
      type="movie"
      upcoming={categoryKey === 'upcoming'}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={pagination?.error}
      onBack={goBack}
      onLoadMore={handleLoadMore}
      onRetry={() => { void loadMoviesFromCategory(categoryKey, { page: 1, language: normalizedLang }); }}
    />
  );
}
