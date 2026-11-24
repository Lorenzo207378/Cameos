import { useCallback, useEffect, useMemo, useRef } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import FamousCameosSection from '../components/cameo/FamousCameosSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { usePageReady } from '../utils/use/usePageReady.js';
import { useScrollToTop } from '../utils/domUtils.js';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { SERIES_CATEGORY_CONFIG } from '../utils/media/mediaCategoryConfig.js';
import { getSeriesCarouselSections } from '../utils/media/mediaCategoryPresentation.js';
import { useSeriesViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

const SERIES_CATEGORY_KEYS = Object.keys(SERIES_CATEGORY_CONFIG);

export default function TVSeries() {
  const { t, normalizedLang } = useTranslation();

  const seriesViewModel = useSeriesViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang, shared: true });

  const {
    state: seriesState,
    trendingSeries,
    upcomingSeries,
    categorySeries,
    categoryPagination,
    feedLoaded,
    error: seriesError,
    loadSeriesFeed,
    loadTrendingSeries,
    loadSeriesFromCategory,
    loadUpcomingSeries
  } = seriesViewModel;

  const {
    state: cameoState,
    famousCameos,
    famousCameosPagination,
    loadFamousCameos,
    loadMoreFamousCameos
  } = cameoViewModel;

  const contentRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const isPageReady = usePageReady(contentRef, seriesState, cameoState);
  useScrollToTop('tv-series', isPageReady);

  // Fetch feed serie TV (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    void loadSeriesFeed({ initialPages: 2, language: normalizedLang });
    void loadFamousCameos({ limit: 16, language: normalizedLang, onlyIfEmpty: true, force: true });
  }, [loadSeriesFeed, loadFamousCameos, normalizedLang]);

  const tvReviews = useMemo(
    () => INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'tv' || r.mediaType === 'episode'),
    []
  );

  const carouselSections = useMemo(
    () => getSeriesCarouselSections({ upcomingSeries, categorySeries }, t),
    [upcomingSeries, categorySeries, t]
  );

  const loadMoreByCategory = useMemo(() => {
    /** @type {Record<string, () => void>} */
    const handlers = {};
    for (const key of SERIES_CATEGORY_KEYS) {
      handlers[key] = key === 'upcoming'
        ? () => { void loadUpcomingSeries({ append: true }); }
        : () => { void loadSeriesFromCategory(key, { append: true }); };
    }
    return handlers;
  }, [loadSeriesFromCategory, loadUpcomingSeries]);

  const retryByCategory = useMemo(() => {
    /** @type {Record<string, () => void>} */
    const handlers = {};
    for (const key of SERIES_CATEGORY_KEYS) {
      handlers[key] = key === 'upcoming'
        ? () => { void loadUpcomingSeries({ initialPages: 2, language: normalizedLang }); }
        : () => { void loadSeriesFromCategory(key, { initialPages: 2, language: normalizedLang }); };
    }
    return handlers;
  }, [loadSeriesFromCategory, loadUpcomingSeries, normalizedLang]);

  const handleRetryTrending = useCallback(() => {
    void loadTrendingSeries({ timeWindow: 'month', onlyReleased: true, language: normalizedLang });
  }, [loadTrendingSeries, normalizedLang]);

  const handleRetryFamousCameos = useCallback(() => {
    void loadFamousCameos({ limit: 16, language: normalizedLang, force: true });
  }, [loadFamousCameos, normalizedLang]);

  return (
    <div className={`catalog-page position-relative w-100${isPageReady ? '' : ' catalog-page-preparing'}`}>
      {!isPageReady && <LoadingScreen className="catalog-loading-screen" />}
      <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
        inert={!isPageReady} aria-hidden={!isPageReady}>
        <TrendingMediaCardSlider
          items={trendingSeries}
          type="tv"
          className="mb-3"
          loading={!feedLoaded}
          error={seriesError}
          onRetry={handleRetryTrending}
        />

        {carouselSections.map((section) => (
          <MediaCarousel
            key={section.key}
            categoryKey={section.key}
            title={section.title}
            subtitle={section.subtitle}
            items={section.items}
            loading={!categoryPagination?.[section.key] || Boolean(categoryPagination[section.key].loading)}
            error={categoryPagination?.[section.key]?.error}
            type="tv"
            upcoming={section.key === 'upcoming'}
            onLoadMore={loadMoreByCategory[section.key]}
            onRetry={retryByCategory[section.key]}
            hasMore={categoryPagination?.[section.key]?.hasMore}
            isLoadingMore={categoryPagination?.[section.key]?.loadingMore}
          />
        ))}

        {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
        <FamousCameosSection
          cameos={famousCameos}
          loading={famousCameosPagination.loading}
          error={famousCameosPagination.error}
          onLoadMore={loadMoreFamousCameos}
          onRetry={handleRetryFamousCameos}
          hasMore={famousCameosPagination.hasMore}
          isLoadingMore={famousCameosPagination.loadingMore}
        />

        {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
        <ReviewSection
          initialReviews={tvReviews}
          targetKey="tv:1418"
          title={t('reviews.sectionTitle')}
        />
      </div>
    </div>
  );
}
