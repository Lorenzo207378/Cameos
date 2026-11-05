import { useEffect, useMemo } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import FamousCameosSection from '../components/cameo/FamousCameosSection.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { getMovieCarouselSections } from '../utils/selections.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/common/carouselControls.css';
import '../css/common/text.css';
import '../css/common/moviesAndSeries.css';

export default function Movies() {
  const { t } = useTranslation();

  const movieVM = useMovieViewModel();
  const cameoVM = useCameoViewModel();

  const { loadFilmsFeed, loadMoviesFromCategory, loadUpcomingMovies } = movieVM;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoVM;

  // Fetch feed film (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    if (!movieVM.feedLoaded) {
      void loadFilmsFeed({ initialPages: 2 });
    }
  }, [loadFilmsFeed, movieVM.feedLoaded]);

  // Carica i cameo celebri dal ViewModel (16 camei iniziali = 2 tranche complete per scorrimento istantaneo)
  useEffect(() => {
    if (!cameoVM.famousCameos || cameoVM.famousCameos.length === 0) {
      void loadFamousCameos(16);
    }
  }, [loadFamousCameos, cameoVM.famousCameos]);

  const trendingMovies = useMemo(() => {
    return movieVM.trendingMovies || [];
  }, [movieVM.trendingMovies]);

  // Recupera i cameo celebri dal ViewModel
  const displayedFamousCameos = cameoVM.famousCameos;
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');
  const carouselSections = getMovieCarouselSections(movieVM, t);

  const isMovieFeedReady =
      (movieVM.feedLoaded && !movieVM.loading) ||
      (!movieVM.loading && (Boolean(movieVM.error) || movieVM.isOffline));

  const isFamousCameosReady =
    ((cameoVM.famousCameos?.length > 0 || Boolean(cameoVM.famousCameosPagination)) && !cameoVM.loading) ||
    (!cameoVM.loading && (Boolean(cameoVM.error) || cameoVM.isOffline));

  const isPageReady = isMovieFeedReady && isFamousCameosReady;

  if (!isPageReady) {
    return <LoadingScreen />;
  }

  return (
    <div className="main-page w-100">
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
          hasMore={movieVM.categoryPagination?.[section.key]?.hasMore}
          isLoadingMore={movieVM.categoryPagination?.[section.key]?.loadingMore}
        />
      ))}

      {/* SEZIONE SPECIALE: CAMEO LEGGENDARI NEI FILM */}
      <FamousCameosSection
        cameos={displayedFamousCameos}
        loading={cameoVM.loading && (!displayedFamousCameos || displayedFamousCameos.length === 0)}
        onLoadMore={loadMoreFamousCameos}
        hasMore={cameoVM.famousCameosPagination?.hasMore}
        isLoadingMore={cameoVM.famousCameosPagination?.loadingMore}
      />

      {/* SEZIONE: RECENSIONI DELLA COMMUNITY */}
      <ReviewSection
        initialReviews={movieReviews}
        targetKey="movie:299534"
        title={t('reviews.sectionTitle')}
      />
    </div>
  );
}
