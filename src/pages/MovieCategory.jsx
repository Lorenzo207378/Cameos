import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MediaCard from '../components/media/MediaCard.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useMovieViewModel } from '../viewmodel/index.js';
import { getCategoryDisplayInfo } from '../utils/selections.js';
import { formatTranslation } from '../utils/translations.js';
import '../css/media/mediaCategory.css';
import '../css/common/elements.css';

/**
 * MovieCategory
 * Pagina per visualizzare la griglia completa dei film di una categoria.
 */
export default function MovieCategory() {
  const { category, id } = useParams();
  const categoryKey = category || id || 'upcoming';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const movieVM = useMovieViewModel();

  const { loadMoviesFromCategory } = movieVM;

  const categoryInfo = useMemo(() => getCategoryDisplayInfo(categoryKey, t, 'movie'), [categoryKey, t]);

  const categoryMoviesMap = movieVM.categoryMovies;
  const upcomingMovies = movieVM.upcomingMovies;

  const movies = useMemo(() => {
    return (
      categoryMoviesMap?.[categoryKey] ||
      (categoryKey === 'upcoming' ? upcomingMovies : null) ||
      []
    );
  }, [categoryKey, categoryMoviesMap, upcomingMovies]);

  const pagination = movieVM.categoryPagination?.[categoryKey];
  const hasMore = pagination?.hasMore ?? (movies.length >= 20);
  const isLoadingMore = Boolean(pagination?.loadingMore);
  const initialLoading = movies.length === 0 && (!pagination?.page || movieVM.loading);

  useEffect(() => {
    if (movies.length === 0 && !movieVM.categoryPagination?.[categoryKey]?.page) {
      loadMoviesFromCategory(categoryKey, { page: 1 });
    }
  }, [categoryKey, loadMoviesFromCategory, movies.length, pagination?.page]);

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/Cameos/movies');
    }
  }, [navigate]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await loadMoviesFromCategory(categoryKey, { append: true });
  }, [categoryKey, hasMore, isLoadingMore, loadMoviesFromCategory]);

  if (initialLoading && movies.length === 0) {
    return (
      <LoadingScreen
        showBackButton={true}
        onBack={handleGoBack}
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
              onClick={handleGoBack}
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

          {/* Badge pill conteggio film */}
          <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary rounded-pill fw-normal d-flex align-items-center gap-1 gap-sm-2 count-pill flex-shrink-0">
            <i className="bi bi-film text-success"></i>
            <span>{formatTranslation(t('common.mediaCount'), { count: movies.length, media: t('nav.movies') })}</span>
          </span>
        </div>
      </header>

      {/* AREA GRIGLIA SCROLLABILE (SENZA SCROLLBAR) */}
      <div className="media-category-scroll-container scrollbar-none">
        <div className="container-fluid px-2 px-sm-4 px-md-5">
          {movies.length > 0 ? (
            <div className="media-category-grid">
              {movies.map((movie) => (
                <MediaCard key={movie.id} item={movie} type="movie" upcoming={categoryKey === 'upcoming'} />
              ))}
            </div>
          ) : (
            <div className="text-center py-5 my-5">
              <i className="bi bi-camera-reels text-secondary display-3 mb-3 d-block"></i>
              <p className="text-muted fs-5">{t('common.noResults')}</p>
            </div>
          )}

          {/* PULSANTE LOAD MORE */}
          {hasMore && movies.length > 0 && (
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

          {!hasMore && movies.length > 0 && (
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
