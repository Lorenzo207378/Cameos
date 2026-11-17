import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MediaCategoryLayout from '../components/media/MediaCategoryLayout.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel } from '../viewmodel/index.js';
import { getCategoryDisplayInfo } from '../utils/media/mediaCategories.js';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/**
 * TVSeriesCategory
 * Pagina a tutto schermo per visualizzare la griglia completa delle serie TV di una categoria.
 * Include navigazione indietro, badge e metadati per le nuove stagioni in arrivo.
 */
export default function TVSeriesCategory() {
  const { category, id } = useParams();
  const categoryKey = category || id || 'upcoming';
  const { t, formatTranslation, normalizedLang } = useTranslation();

  const seriesViewModel = useSeriesViewModel({ language: normalizedLang });
  const { loadSeriesFromCategory } = seriesViewModel;

  const categoryInfo = useMemo(() => getCategoryDisplayInfo(categoryKey, t, 'series'), [categoryKey, t]);
  const categorySeriesMap = seriesViewModel.categorySeries;
  const directSeries = seriesViewModel[`${categoryKey}Series`];
  const upcomingSeries = seriesViewModel.upcomingSeries;

  const series = useMemo(() => {
    return (
      categorySeriesMap?.[categoryKey] ||
      directSeries ||
      (categoryKey === 'upcoming' ? upcomingSeries : null) ||
      []
    );
  }, [categoryKey, categorySeriesMap, directSeries, upcomingSeries]);

  const pagination =
    seriesViewModel.categoryPagination?.[categoryKey] ||
    (categoryKey === 'upcoming' ? seriesViewModel.upcomingPagination : null);
  const hasMore = pagination?.hasMore ?? (series.length >= 20);
  const isLoadingMore = Boolean(pagination?.loadingMore);
  const initialLoading = series.length === 0 && (!pagination || pagination.loading);

  useScrollToTop(categoryKey);

  useEffect(() => {
    if (pagination?.loading) return;
    const loadedLang = pagination?.language;
    if ((series.length === 0 && !pagination?.page) || (loadedLang && loadedLang !== normalizedLang)) {
      void loadSeriesFromCategory(categoryKey, { page: 1, language: normalizedLang });
    }
  }, [categoryKey, loadSeriesFromCategory, series.length, pagination?.loading, pagination?.page, pagination?.language, normalizedLang]);

  const goBack = useGoBack('/Cameos/series');

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await loadSeriesFromCategory(categoryKey, { append: true, language: normalizedLang });
  }, [isLoadingMore, hasMore, categoryKey, loadSeriesFromCategory, normalizedLang]);

  if (initialLoading && series.length === 0) {
    return <LoadingScreen message={t('common.loading')} />;
  }

  return (
    <MediaCategoryLayout
      title={categoryInfo.name}
      subtitle={categoryInfo.subtitle}
      countIcon="bi-tv"
      countLabel={formatTranslation(t('common.mediaCount'), { count: series.length, media: t('nav.tvSeries') })}
      items={series}
      type="tv"
      upcoming={categoryKey === 'upcoming'}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={pagination?.error}
      onBack={goBack}
      onLoadMore={handleLoadMore}
      onRetry={() => { void loadSeriesFromCategory(categoryKey, { page: 1, language: normalizedLang }); }}
    />
  );
}
