import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext.jsx';
import { useSearchViewModel } from '../viewmodel/index.js';
import MediaCarousel from '../components/media/MediaCarousel.jsx';
import CastCarousel from '../components/media/CastCarousel.jsx';
import LoadingScreen from '../components/LoadingScreen.jsx';
import '../css/components/searchPage.css';
import '../css/common/text.css';

export default function Search() {
  const [params] = useSearchParams();
  const { t, normalizedLang } = useTranslation();
  const query = params.get('q') || '';
  const searchViewModel = useSearchViewModel({
    query, filter: params.get('filter') || 'all', language: normalizedLang
  });

  const { sections, loading, error, hasSearched, hasResults, hasFailures, retrySearch } = searchViewModel;

  if (loading) return <LoadingScreen />;

  return (
    <div className="search-page w-100 carousel-page-padding pb-5">
      <h1 className="search-page-title text-white fw-bold mb-2">{t('search.title')}</h1>
      <p className="search-page-query text-white-50 text-break mb-4">{query}</p>
      {(error || hasFailures) && (
        <div className="d-flex align-items-center gap-3 mb-4" role="alert">
          <span className="text-warning">{t('common.error')}</span>
          <button type="button" className="btn btn-outline-success rounded-pill" onClick={retrySearch}>{t('common.retry')}</button>
        </div>
      )}
      {!hasSearched && !error && <p className="text-white-50">{t('search.prompt')}</p>}
      {hasSearched && !hasResults && !hasFailures && <p className="text-white-50">{t('common.noResults')}</p>}
      {sections.map((section) => (
        <section key={section.id} className="mb-4" aria-label={section.title}>
          {section.kind === 'people' ? (
            <CastCarousel title={section.title} cast={section.items} limit={section.items.length} showRoles={false}
              onLoadMore={section.onLoadMore} hasMore={section.hasMore} isLoadingMore={section.isLoadingMore} />
          ) : (
            <MediaCarousel title={section.title} items={section.items} type={section.type}
              onLoadMore={section.onLoadMore} hasMore={section.hasMore} isLoadingMore={section.isLoadingMore} />
          )}
          {!section.items.length && section.hasMore && (
            <div className="text-white">
              <h3 className="h5">{section.title}</h3>
              <button type="button" className="btn btn-outline-success rounded-pill" onClick={section.onLoadMore} disabled={section.isLoadingMore}>
                {t('search.more')}
              </button>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
