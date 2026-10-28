import { useEffect, useMemo } from 'react';
import TrendingMediaCardSlider from '../components/media/TrendingMediaCardSlider.jsx';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import FamousCameosSection from '../components/media/FamousCameosSection.jsx';
import ReviewSection from '../components/ReviewSection.jsx';
import { INITIAL_COMMUNITY_REVIEWS } from '../data/catalogData.js';
import { useTranslation } from '../utils/translations.js';
import { getMovieCarouselSections } from '../utils/selections.js';
import { useMovieViewModel, useCameoViewModel } from '../viewmodel/index.js';
import '../css/movies/movies.css';

export default function Movies() {
  const { t } = useTranslation();

  const movieVM = useMovieViewModel();
  const cameoVM = useCameoViewModel();

  const { loadFilmsFeed, loadMoreCategoryMovies } = movieVM;
  const { loadFamousCameos, loadMoreFamousCameos } = cameoVM;

  // Fetch feed film (trending + upcoming + categories) from ViewModel on mount
  useEffect(() => {
    if (!movieVM.feedLoaded) {
      loadFilmsFeed({ initialPages: 2 });
    } else if (!movieVM.warMovies || movieVM.warMovies.length === 0) {
      loadFilmsFeed({ initialPages: 2, force: true });
    }
  }, [loadFilmsFeed, movieVM.feedLoaded, movieVM.warMovies]);

  // Carica i cameo celebri dal ViewModel (16 camei iniziali = 2 tranche complete per scorrimento istantaneo)
  useEffect(() => {
    if (!cameoVM.famousCameos || cameoVM.famousCameos.length === 0) {
      loadFamousCameos(16);
    }
  }, [loadFamousCameos, cameoVM.famousCameos]);

  // Log dei film ricevuti dal ViewModel
  useEffect(() => {
    if (movieVM.trendingMovies?.length > 0) {
      movieVM.trendingMovies.forEach((movie) => {
        console.log(movie);
      });
    }
  }, [movieVM.trendingMovies]);

  const trendingMovies = useMemo(() => {
    return movieVM.trendingMovies?.length > 0
      ? movieVM.trendingMovies.slice(0, 10)
      : [];
  }, [movieVM.trendingMovies]);

  // Recupera i cameo celebri dal ViewModel
  const displayedFamousCameos = cameoVM.famousCameos;
  const movieReviews = INITIAL_COMMUNITY_REVIEWS.filter((r) => r.mediaType === 'movie');
  const carouselSections = getMovieCarouselSections(movieVM, t);

  return (
    <div className="films-page w-100 py-4 pb-5">
      <TrendingMediaCardSlider items={trendingMovies} type="movie" />

      {carouselSections.map((section) => (
        <MediaCarousel
          key={section.key}
          categoryKey={section.key}
          title={section.title}
          subtitle={section.subtitle}
          items={section.items}
          type="movie"
          upcoming={section.key === 'upcoming'}
          onLoadMore={() => loadMoreCategoryMovies(section.key)}
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
