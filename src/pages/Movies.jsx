import { useEffect, useMemo, useRef } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import FamousCameosSection from '../components/cameo/FamousCameosSection.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { getMovieCarouselSections } from '../utils/mediaCategories.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import { usePageReady } from '../utils/usePageReady.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function Movies() {
  const { t } = useTranslation();

  const movieViewModel = useMovieViewModel();
  const cameoViewModel = useCameoViewModel();

  const { loadFilmsFeed, loadMoviesFromCategory, loadUpcomingMovies } = movieViewModel;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoViewModel;
  const dataReady = movieViewModel.feedLoaded && !movieViewModel.loading && cameoViewModel.famousCameosPagination?.loading === false;
  const carouselsLoading = Object.values(movieViewModel.categoryPagination).some((pagination) => pagination.loadingMore)
    || cameoViewModel.famousCameosPagination?.loadingMore;
  const contentRef = useRef(null);
  const isPageReady = usePageReady(contentRef, dataReady && !carouselsLoading);

  // Fetch feed film (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    void loadFilmsFeed({ initialPages: 2 });
    // Carica i cameo celebri dal ViewModel (16 camei iniziali = 2 tranche complete per scorrimento istantaneo)
    void loadFamousCameos(16);
  }, [loadFilmsFeed, loadFamousCameos]);

  const trendingMovies = useMemo(() => {
    return movieViewModel.trendingMovies || [];
  }, [movieViewModel.trendingMovies]);

  // Recupera i cameo celebri dal ViewModel
  const displayedFamousCameos = cameoViewModel.famousCameos;
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');
  const carouselSections = getMovieCarouselSections(movieViewModel, t);

  if (!dataReady && !isPageReady) {
    return <LoadingScreen />;
  }

  return (
    <>
    {!isPageReady && <LoadingScreen />}
    <div ref={contentRef} className={`main-page w-100${isPageReady ? '' : ' main-page-preparing'}`}
      inert={!isPageReady} aria-hidden={!isPageReady}>
      <TrendingMediaCardSlider items={trendingMovies} type="movie" className="mb-3" />

      {carouselSections.map((section) => (
        <MediaCarousel
          key={section.key}
          categoryKey={section.key}
          title={section.title}
          subtitle={section.subtitle}
          items={section.items}
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
        loading={cameoViewModel.loading && (!displayedFamousCameos || displayedFamousCameos.length === 0)}
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
    </>
  );
}
