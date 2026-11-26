import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSearchViewModel } from '../viewmodel/index.js';
import { useGoBack, useScrollToTop } from '../utils/domUtils.js';
import { APP_ROUTES } from '../utils/appRoutes.js';
import { normalizeSearchRequest } from '../utils/media/search.js';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import CastCarousel from '../components/media/CastCarousel.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../css/pages/searchPage.css';
import '../css/common/text.css';

export default function Search() {
  const [params] = useSearchParams();
  const { t, normalizedLang } = useTranslation();
  const goBack = useGoBack(APP_ROUTES.movies);
  const { query, filter } = normalizeSearchRequest(params.get('q') || '', params.get('filter') || 'all');

  const {
    query: stateQuery,
    filter: stateFilter,
    sections,
    loading,
    error,
    hasSearched,
    hasFailures,
    retrySearch
  } = useSearchViewModel({ query, filter, language: normalizedLang });

  const isRouteSynced = stateQuery === query && stateFilter === filter;
  const isLoading = loading || (Boolean(query) && !isRouteSynced);
  const visibleSections = isRouteSynced
    ? sections.filter((section) => section.items.length > 0 || section.hasMore)
    : [];
  const hasError = isRouteSynced && Boolean(error || hasFailures);

  useScrollToTop(`${query}:${filter}`, !isLoading);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="search-page w-100 carousel-page-padding carousel-page-padding-compact">
      <div className="d-flex flex-column align-items-start mb-4">
        <button
          type="button"
          onClick={goBack}
          className="btn btn-dark rounded-circle shadow-lg d-flex align-items-center justify-content-center border border-secondary border-opacity-50 back-btn flex-shrink-0 mb-2 mb-md-3"
          aria-label={t('detail.goBack')}
          title={t('detail.goBack')}
        >
          <i className="bi bi-arrow-left text-white" aria-hidden="true" />
        </button>
        <h1 className="search-page-title text-white fw-bold mb-2 min-w-0">{t('search.title')}</h1>
        {query && <p className="search-page-query text-white-50 text-break mb-0">{query}</p>}
      </div>
      {hasError && (
        <div className="d-flex align-items-center gap-3 mb-4" role="alert">
          <span className="text-warning">{t('common.error')}</span>
          <button type="button" className="btn btn-outline-success rounded-pill" onClick={retrySearch}>
            {t('common.retry')}
          </button>
        </div>
      )}
      {(!isRouteSynced || !hasSearched) && !hasError && <p className="text-white-50">{t('search.prompt')}</p>}
      {isRouteSynced && hasSearched && !visibleSections.length && !hasError && (
        <p className="text-white-50">{t('common.noResults')}</p>
      )}
      {visibleSections.map((section) => (
        !section.items.length && section.hasMore ? (
          <section key={section.id} className="mb-4 text-white" aria-label={section.titleKey ? t(section.titleKey) : section.title}>
            <h3 className="h5">{section.titleKey ? t(section.titleKey) : section.title}</h3>
            <button
              type="button"
              className="btn btn-outline-success rounded-pill d-inline-flex align-items-center gap-2"
              onClick={section.onLoadMore}
              disabled={section.isLoadingMore}
            >
              {section.isLoadingMore && (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              )}
              {section.isLoadingMore ? t('common.loading') : t('search.more')}
            </button>
          </section>
        ) : (
          <div key={section.id} className="mb-4">
            {section.kind === 'people' ? (
              <CastCarousel
                title={section.titleKey ? t(section.titleKey) : section.title}
                cast={section.items}
                limit={section.items.length}
                showRoles={false}
                onLoadMore={section.onLoadMore}
                hasMore={section.hasMore}
                isLoadingMore={section.isLoadingMore}
              />
            ) : (
              <MediaCarousel
                title={section.titleKey ? t(section.titleKey) : section.title}
                items={section.items}
                type={section.type}
                onLoadMore={section.onLoadMore}
                hasMore={section.hasMore}
                isLoadingMore={section.isLoadingMore}
              />
            )}
          </div>
        )
      ))}
    </div>
  );
}
