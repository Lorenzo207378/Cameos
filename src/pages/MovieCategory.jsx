import { formatTranslation } from '../utils/translationUtils.js';
import { useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MediaCard from '../components/media/MediaCard.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import { useTranslation } from '../utils/translations.js';
import { useMovieViewModel } from '../viewmodel/index.js';
import '../css/movies/moviesCategory.css';
import '../css/common/elements.css';

const resolveCategoryInfo = (key, t) => {
  const shortName = t(`categories.${key}`);
  const titleKey = key === 'comedy' ? 'movieComedyTitle' : `${key}Title`;
  const subKey = key === 'comedy' ? 'movieComedySub' : `${key}Sub`;
  const fullTitle = t(`carousels.${titleKey}`);
  const subtitle = t(`carousels.${subKey}`);

  const hasShort = shortName && !shortName.startsWith('categories.');
  const hasFull = fullTitle && !fullTitle.startsWith('carousels.');
  const hasSub = subtitle && !subtitle.startsWith('carousels.');

  return {
    name: hasShort ? shortName : (hasFull ? fullTitle : key),
    fullTitle: hasFull ? fullTitle : (hasShort ? shortName : key),
    subtitle: hasSub ? subtitle : ''
  };
};

/**
 * MovieCategory
 * Pagina a tutto schermo per visualizzare la griglia completa dei film di una categoria.
 * Include navigazione indietro, titolo localizzato e pulsante "Load More" per il caricamento a tranche.
 */
export default function MovieCategory() {
  const { category, id } = useParams();
  const categoryKey = category || id || 'upcoming';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const movieVM = useMovieViewModel();

  const { loadMoviesFromCategory, loadUpcomingMovies } = movieVM;

  const categoryInfo = useMemo(() => resolveCategoryInfo(categoryKey, t), [categoryKey, t]);

  // Recupera i film per questa categoria dallo stato
  const rawMovies = useMemo(() => {
    if (categoryKey === 'upcoming') {
      return movieVM.upcomingMovies || movieVM.categoryMovies?.upcoming || [];
    }
    return movieVM[`${categoryKey}Movies`] || movieVM.categoryMovies?.[categoryKey] || [];
  }, [categoryKey, movieVM]);

  // Deduplica per ID mantenendo l'ordine
  const movies = useMemo(() => {
    const map = new Map();
    rawMovies.forEach((m) => {
      if (m && m.id && !map.has(m.id)) {
        map.set(m.id, m);
      }
    });
    return Array.from(map.values());
  }, [rawMovies]);

  // Caricamento iniziale se non presenti nel feed
  useEffect(() => {
    const existing = categoryKey === 'upcoming'
      ? (movieVM.upcomingMovies?.length ? movieVM.upcomingMovies : movieVM.categoryMovies?.upcoming)
      : (movieVM[`${categoryKey}Movies`]?.length ? movieVM[`${categoryKey}Movies`] : movieVM.categoryMovies?.[categoryKey]);

    if (!existing || existing.length === 0) {
      if (categoryKey === 'upcoming') {
        loadUpcomingMovies({ page: 1 });
      } else {
        loadMoviesFromCategory(categoryKey, { page: 1 });
      }
    }
  }, [categoryKey, loadMoviesFromCategory, loadUpcomingMovies, movieVM]);

  const pagination = movieVM.categoryPagination?.[categoryKey] || {};
  const hasMore = pagination.hasMore ?? (movies.length >= 20);
  const isLoadingMore = Boolean(pagination.loadingMore);
  const initialLoading = movies.length === 0 && (!pagination.page || movieVM.loading);

  const handleGoBack = useCallback(() => {
      navigate('/Cameos/movies');
  }, [navigate]);

  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    if (categoryKey === 'upcoming') {
      await loadUpcomingMovies({ append: true });
    } else {
      await loadMoviesFromCategory(categoryKey, { append: true });
    }
  };

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
    <div className="films-category-page w-100">
      {/* HEADER FISSO IN ALTO CON EFFETTO GLASS */}
      <header className="glass-header-fixed">
        <div className="films-category-header-content container-fluid px-3 px-sm-4 px-md-5">
          <div className="d-flex align-items-center gap-3">
            <button
                type="button"
                onClick={handleGoBack}
                className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn"
                aria-label={t('detail.goBack')}
                title={t('detail.goBack')}
            >
              <i className="bi bi-arrow-left text-white fs-5" />
            </button>
            <div>
              {categoryInfo.subtitle && (
                <p className="text-success text-uppercase small fw-bold mb-0 category-subtitle">
                  {categoryInfo.subtitle}
                </p>
              )}
              <h1 className="h4 text-white fw-bold mb-0 category-title">
                {categoryInfo.name}
              </h1>
            </div>
          </div>

          {/* Badge pill conteggio film */}
          <span className="badge bg-dark bg-opacity-75 border border-secondary border-opacity-25 text-secondary px-3 py-2 rounded-pill fs-6 fw-normal d-flex align-items-center gap-2 count-pill">
            <i className="bi bi-film text-success"></i>
            <span>{formatTranslation(t('common.moviesCount'), { count: movies.length })}</span>
          </span>
        </div>
      </header>

      {/* AREA GRIGLIA SCROLLABILE (SENZA SCROLLBAR) */}
      <div className="films-category-scroll-container scrollbar-none">
        <div className="container-fluid px-3 px-sm-4 px-md-5">
          {movies.length > 0 ? (
            <div className="films-category-grid">
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
