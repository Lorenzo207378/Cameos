import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MediaCard from '../components/media/MediaCard.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSeriesViewModel } from '../viewmodel/index.js';
import { getCategoryDisplayInfo } from '../utils/mediaCategories.js';
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
    return (
      <LoadingScreen
        message={t('common.loading')}
      />
    );
  }

  return (
    <div className="media-category-page w-100">
      {/* HEADER FISSO IN ALTO CON EFFETTO GLASS */}
      <header className="glass-header-fixed">
        <div className="media-category-header-content container-fluid px-2 px-sm-4 px-md-5">
          <div className="d-flex align-items-center gap-2 gap-sm-3 min-w-0 flex-grow-1">
            <button
              type="button"
              onClick={goBack}
              className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0"
              aria-label={t('detail.goBack')}
              title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white" />
            </button>
            <div className="min-w-0">
              {categoryInfo.subtitle && (
                <p className="text-success text-uppercase fw-bold mb-0 category-subtitle text-truncate">
                  {categoryInfo.subtitle}
                </p>
              )}
              <h1 className="h4 text-white fw-bold mb-0 category-title text-truncate">
                {categoryInfo.name}
              </h1>
            </div>
          </div>

          {/* Badge pill conteggio serie */}
          <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary rounded-pill fw-normal d-flex align-items-center gap-1 gap-sm-2 count-pill flex-shrink-0">
            <i className="bi bi-tv text-success"></i>
            <span>{formatTranslation(t('common.mediaCount'), { count: series.length, media: t('nav.tvSeries') })}</span>
          </span>
        </div>
      </header>

      {/* AREA GRIGLIA SCROLLABILE (SENZA SCROLLBAR) */}
      <div className="media-category-scroll-container scrollbar-none">
        <div className="container-fluid px-2 px-sm-4 px-md-5">
          {series.length > 0 ? (
            <div className="media-category-grid">
              {series.map((item) => (
                <MediaCard key={item.id} item={item} type="tv" upcoming={categoryKey === 'upcoming'} />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 my-5">
              <i className="bi bi-camera-reels text-secondary display-3 mb-3 d-block"></i>
              <p className="text-muted fs-5" role={pagination?.error ? 'alert' : undefined}>
                {t(pagination?.error ? 'common.error' : 'common.noResults')}
              </p>
              {pagination?.error && (
                <button type="button" className="btn btn-outline-success rounded-pill"
                  onClick={() => { void loadSeriesFromCategory(categoryKey, { page: 1, language: normalizedLang }); }}>
                  {t('common.retry')}
                </button>
              )}
            </div>
          )}

          {/* PULSANTE LOAD MORE */}
          {hasMore && series.length > 0 && (
            <div className="d-flex justify-content-center mt-4 mb-4">
              <button
                type="button"
                className="btn btn-outline-success px-4 py-2 fw-bold rounded-pill d-inline-flex align-items-center gap-2 shadow load-more-btn"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>{t('common.loadingMore')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('common.loadMore')}</span>
                    <i className="bi bi-chevron-down"></i>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && series.length > 0 && (
            <div className="text-center text-muted small mt-4 mb-4">
              <p className="mb-0 text-secondary opacity-75">
                <i className="bi bi-check2-circle me-1 text-success"></i>
                {t('common.noMoreItems')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
