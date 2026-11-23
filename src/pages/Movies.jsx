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
import { MOVIE_CATEGORY_CONFIG } from '../utils/media/mediaCategoryConfig.js';
import { getMovieCarouselSections } from '../utils/media/mediaCategoryPresentation.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

const MOVIE_CATEGORY_KEYS = Object.keys(MOVIE_CATEGORY_CONFIG);

export default function Movies() {
  const { t, normalizedLang } = useTranslation();

  const movieViewModel = useMovieViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang, shared: true });

  const {
    state: movieState,
    trendingMovies,
    upcomingMovies,
    categoryMovies,
    categoryPagination,
    feedLoaded,
    error: movieError,
    loadFilmsFeed,
    loadTrendingMovies,
    loadMoviesFromCategory,
    loadUpcomingMovies
  } = movieViewModel;

  const {
    state: cameoState,
    famousCameos,
    famousCameosPagination,
    loadFamousCameos,
    loadMoreFamousCameos
  } = cameoViewModel;

  const contentRef = useRef(/** @type {HTMLDivElement|null} */ (null));
  const isPageReady = usePageReady(contentRef, movieState, cameoState);
  useScrollToTop('movies', isPageReady);

  // Fetch feed film (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    void loadFilmsFeed({ initialPages: 2, language: normalizedLang });
    void loadFamousCameos({ limit: 16, language: normalizedLang, onlyIfEmpty: true, force: true });
  }, [loadFilmsFeed, loadFamousCameos, normalizedLang]);

  const movieReviews = useMemo(
    () => INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie'),
    []
  );

  const carouselSections = useMemo(
    () => getMovieCarouselSections({ upcomingMovies, categoryMovies }, t),
    [upcomingMovies, categoryMovies, t]
  );

  const loadMoreByCategory = useMemo(() => {
    /** @type {Record<string, () => void>} */
    const handlers = {};
    for (const key of MOVIE_CATEGORY_KEYS) {
      handlers[key] = key === 'upcoming'
        ? () => { void loadUpcomingMovies({ append: true }); }
        : () => { void loadMoviesFromCategory(key, { append: true }); };
    }
    return handlers;
  }, [loadMoviesFromCategory, loadUpcomingMovies]);

  const retryByCategory = useMemo(() => {
    /** @type {Record<string, () => void>} */
    const handlers = {};
    for (const key of MOVIE_CATEGORY_KEYS) {
      handlers[key] = key === 'upcoming'
        ? () => { void loadUpcomingMovies({ initialPages: 2, language: normalizedLang }); }
        : () => { void loadMoviesFromCategory(key, { initialPages: 2, language: normalizedLang }); };
    }
    return handlers;
  }, [loadMoviesFromCategory, loadUpcomingMovies, normalizedLang]);

  const handleRetryTrending = useCallback(() => {
    void loadTrendingMovies({ timeWindow: 'month', onlyReleased: true, language: normalizedLang });
  }, [loadTrendingMovies, normalizedLang]);

  const handleRetryFamousCameos = useCallback(() => {
    void loadFamousCameos({ limit: 16, language: normalizedLang, force: true });
  }, [loadFamousCameos, normalizedLang]);

  return (
    <div className={`catalog-page position-relative w-100${isPageReady ? '' : ' catalog-page-preparing'}`}>
      {!isPageReady && <LoadingScreen className="catalog-loading-screen" />}
      <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
        inert={!isPageReady} aria-hidden={!isPageReady}>
        <TrendingMediaCardSlider
          items={trendingMovies}
          type="movie"
          className="mb-3"
          loading={!feedLoaded}
          error={movieError}
          onRetry={handleRetryTrending}
        />

        {carouselSections.map((section) => {
          const pagination = categoryPagination?.[section.key];
          return (
            <MediaCarousel
              key={section.key}
              categoryKey={section.key}
              title={section.title}
              subtitle={section.subtitle}
              items={section.items}
              loading={!pagination || Boolean(pagination.loading)}
              error={pagination?.error}
              type="movie"
              upcoming={section.key === 'upcoming'}
              onLoadMore={loadMoreByCategory[section.key]}
              onRetry={retryByCategory[section.key]}
              hasMore={pagination?.hasMore}
              isLoadingMore={pagination?.loadingMore}
            />
          );
        })}

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
          initialReviews={movieReviews}
          targetKey="movie:299534"
          title={t('reviews.sectionTitle')}
        />
      </div>
    </div>
  );
}
