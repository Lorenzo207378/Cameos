import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import { useEffect, useEffectEvent, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MediaCategoryLayout from '../components/media/MediaCategoryLayout.jsx';
import { DetailNotFound } from '../components/media/MediaDetailLayout.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel } from '../viewmodel/index.js';
import { SERIES_CATEGORY_CONFIG } from '../utils/media/mediaCategoryConfig.js';
import { getCategoryDisplayInfo } from '../utils/media/mediaCategoryPresentation.js';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/** @type {Array<import('../models/Series.js').Series>} */
const EMPTY_SERIES = [];

/**
 * TVSeriesCategory
 * Pagina per visualizzare la griglia completa delle serie TV di una categoria.
 */
export default function TVSeriesCategory() {
  const { category } = useParams();
  const categoryKey = category || 'upcoming';
  const isValidCategory = Object.hasOwn(SERIES_CATEGORY_CONFIG, categoryKey);
  const { t, normalizedLang } = useTranslation();
  const { categorySeries, categoryPagination, loadSeriesFromCategory } = useSeriesViewModel({ language: normalizedLang });

  const categoryInfo = useMemo(
    () => (isValidCategory ? getCategoryDisplayInfo(categoryKey, t, 'series') : null),
    [categoryKey, isValidCategory, t]
  );

  const series = isValidCategory ? (categorySeries?.[categoryKey] || EMPTY_SERIES) : EMPTY_SERIES;
  const pagination = isValidCategory ? categoryPagination?.[categoryKey] : undefined;
  const hasMore = isValidCategory ? (pagination?.hasMore ?? (series.length >= 20)) : false;
  const isLoadingMore = Boolean(pagination?.loadingMore);
  const initialLoading = isValidCategory && series.length === 0 && (!pagination || pagination.loading);

  useScrollToTop(categoryKey, !initialLoading);

  const fetchInitialCategory = useEffectEvent((targetCategory) => {
    void loadSeriesFromCategory(targetCategory, { page: 1, language: normalizedLang });
  });

  useEffect(() => {
    if (!isValidCategory || pagination?.loading || pagination?.error) return;
    if (series.length === 0 && !pagination?.page) {
      fetchInitialCategory(categoryKey);
    }
  }, [categoryKey, isValidCategory, series.length, pagination?.loading, pagination?.error, pagination?.page]);

  const goBack = useGoBack(APP_ROUTES.series);

  const handleLoadMore = useCallback(async () => {
    if (!isValidCategory || isLoadingMore || !hasMore) return;
    await loadSeriesFromCategory(categoryKey, { append: true, language: normalizedLang });
  }, [categoryKey, hasMore, isLoadingMore, isValidCategory, loadSeriesFromCategory, normalizedLang]);

  const handleRetry = useCallback(() => {
    if (!isValidCategory) return;
    void loadSeriesFromCategory(categoryKey, { page: 1, language: normalizedLang, force: true });
  }, [categoryKey, isValidCategory, loadSeriesFromCategory, normalizedLang]);

  if (!isValidCategory) {
    return (
      <DetailNotFound
        icon="bi-tv"
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
      items={series}
      type="tv"
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
