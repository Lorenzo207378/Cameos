import { useEffect, useMemo, useRef } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import FamousCameosSection from '../components/cameo/FamousCameosSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { usePageReady } from '../utils/usePageReady.js';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { getMovieCarouselSections } from '../utils/mediaCategories.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function Movies() {
  const { t, normalizedLang } = useTranslation();

  const movieViewModel = useMovieViewModel({ language: normalizedLang });
  const cameoViewModel = useCameoViewModel({ language: normalizedLang, shared: true });

  const { loadFilmsFeed, loadMoviesFromCategory, loadUpcomingMovies } = movieViewModel;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoViewModel;
  const contentRef = useRef(null);
  const isPageReady = usePageReady(contentRef, movieViewModel.state, cameoViewModel.state);

  // Fetch feed film (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    void loadFilmsFeed({ initialPages: 2, language: normalizedLang });
    // Carica i cameo celebri dal ViewModel (16 camei iniziali = 2 tranche complete per scorrimento istantaneo)
    void loadFamousCameos(16, normalizedLang);
  }, [loadFilmsFeed, loadFamousCameos, normalizedLang]);

  const trendingMovies = useMemo(() => {
    return movieViewModel.trendingMovies || [];
  }, [movieViewModel.trendingMovies]);

  // Recupera i cameo celebri dal ViewModel
  const displayedFamousCameos = cameoViewModel.famousCameos;
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');
  const carouselSections = getMovieCarouselSections(movieViewModel, t);

  return (
    <div className={`catalog-page position-relative w-100${isPageReady ? '' : ' catalog-page-preparing'}`}>
      {!isPageReady && <LoadingScreen className="catalog-loading-screen" />}
      <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
        inert={!isPageReady} aria-hidden={!isPageReady}>
        <TrendingMediaCardSlider items={trendingMovies} type="movie" className="mb-3" loading={!movieViewModel.feedLoaded} error={movieViewModel.error} />

        {carouselSections.map((section) => (
          <MediaCarousel
            key={section.key}
            categoryKey={section.key}
            title={section.title}
            subtitle={section.subtitle}
            items={section.items}
            loading={!movieViewModel.categoryPagination?.[section.key] || movieViewModel.categoryPagination[section.key].loading}
            error={movieViewModel.categoryPagination?.[section.key]?.error}
            type="movie"
            upcoming={section.key === 'upcoming'}
            onLoadMore={() => {
              if (section.key === 'upcoming') {
                void loadUpcomingMovies({ append: true });
              } else {
                void loadMoviesFromCategory(section.key, { append: true });
              }
            }}
            hasMore={movieViewModel.categoryPagination?.[section.key]?.hasMore}
            isLoadingMore={movieViewModel.categoryPagination?.[section.key]?.loadingMore}
          />
        ))}

        {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
        <FamousCameosSection
          cameos={displayedFamousCameos}
          loading={cameoViewModel.famousCameosPagination?.loading !== false}
          error={cameoViewModel.famousCameosPagination?.error}
          onLoadMore={loadMoreFamousCameos}
          hasMore={cameoViewModel.famousCameosPagination?.hasMore}
          isLoadingMore={cameoViewModel.famousCameosPagination?.loadingMore}
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
