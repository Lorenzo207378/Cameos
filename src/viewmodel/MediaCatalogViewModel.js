import { BaseViewModel } from './BaseViewModel.js';
import { isNumericIdList } from '../utils/media/search.js';
import { combinePages, mergeCategoryPatch, requestedPages, resolvePaginationTarget } from './pagination.js';

/**
 * MediaCatalogViewModel
 * Specialized ViewModel base class for paginated media catalog feeds, category lists, and media search.
 * Keeps catalog-specific orchestration separate from core observable state in BaseViewModel.
 */
export class MediaCatalogViewModel extends BaseViewModel {
  /**
   * Build initial observable state properties for a catalog category configuration map.
   * @param {Array<string>} categoryKeys
   * @param {string} listSuffix
   * @param {string} mapProperty
   * @returns {Record<string, any>}
   */
  static buildCategoryInitialState(categoryKeys, listSuffix, mapProperty) {
    const initial = { [mapProperty]: {}, categoryPagination: {}, feedLoaded: false };
    for (const key of categoryKeys) {
      initial[`${key}${listSuffix}`] = [];
    }
    return initial;
  }

  /**
   * @param {Object} [initialState={}]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(initialState = {}, options = {}) {
    super(initialState, options);
    this.runSearch = this.runSearch.bind(this);
    this.loadPagination = this.loadPagination.bind(this);
  }

  /** Load multiple catalog categories in parallel, isolating per-category errors. */
  async _loadCategoryList(categories, loaderFn, label = 'MediaCatalogViewModel') {
    const results = await Promise.all(
      (categories || []).map(async (catKey) => {
        try {
          const items = await loaderFn(catKey);
          return [catKey, items || []];
        } catch (err) {
          console.warn(`[${label}] Failed to load category ${catKey}:`, err);
          return [catKey, []];
        }
      })
    );
    return Object.fromEntries(results);
  }

  /** Load a full media feed (trending, upcoming, categories) under a single guarded operation. */
  async _loadMediaFeed(operationKey, tasks) {
    return this.runAsync(
      operationKey,
      async () => {
        await Promise.all(tasks);
        return this.state;
      },
      () => ({ feedLoaded: true })
    );
  }

  /** Accept existing positional ViewModel calls as well as the shared parameter object. */
  _mediaSearchInput(value, page, language, searchBy) {
    if (value && typeof value === 'object') return { page, language, ...value, searchBy: searchBy || value.searchBy || 'title' };
    const criterion = searchBy || 'title';
    const isId = criterion !== 'title' && (typeof value === 'number' || isNumericIdList(String(value)));
    const key = isId ? (criterion === 'genre' ? 'genreId' : 'personId') : 'query';
    return { [key]: value, page, language, searchBy: criterion };
  }

  /**
   * Share search state and guard against stale responses even when the criterion changes.
   */
  async runSearch(task) {
    return this.runAsync('search', task, (result) => this.mapPaginatedResult('searchResults', result));
  }

  /**
   * Common pagination handler for entities/lists (initial multi-page or incremental append).
   * @param {Object} options
   * @param {string} options.categoryKey - Key identifier (e.g. 'upcoming', 'action', 'famousCameos')
   * @param {string} [options.stateProp] - State property to store list (e.g. 'upcomingMovies', 'famousCameos')
   * @param {string} [options.asyncKey] - Operation key for runAsync
   * @param {string} [options.paginationMapProp] - State property holding map of pagination objects (e.g. 'categoryPagination')
   * @param {string} [options.paginationProp] - Direct state property holding pagination object (e.g. 'famousCameosPagination')
   * @param {string} [options.groupedListProp] - State property holding map of lists (e.g. 'categoryMovies')
   * @param {Function} options.fetchPage - (page) => Promise<{ results: Array<any>, total_pages?: number, totalPages?: number, hasMore?: boolean }>
   * @param {Function} [options.filterFn] - Optional item filter
   * @param {(item: any) => any} [options.keyFn] - Optional stable item identity
   * @param {Object} [options.params={}] - Options { page, initialPages, append, language, retainPages }
   * @returns {Promise<Array<any>>}
   */
  async loadPagination({
    categoryKey,
    stateProp = `${categoryKey}Movies`,
    asyncKey = `loadPagination_${categoryKey}`,
    paginationMapProp,
    paginationProp,
    groupedListProp,
    fetchPage,
    filterFn,
    keyFn,
    params = {}
  }) {
    const isAppend = Boolean(params.append);
    const target = resolvePaginationTarget(this.state, categoryKey, paginationProp, paginationMapProp);
    const currentPagination = target.current;

    if (isAppend && (currentPagination.loadingMore || currentPagination.hasMore === false || this._pendingOperations.has(asyncKey))) {
      return this.state[stateProp] || [];
    }

    const language = params.language || this.language;
    // Revisiting a catalog must not discard pages already loaded in the same language.
    const sameLanguageRetained = Boolean(params.retainPages && currentPagination.language === language);
    const initialPages = sameLanguageRetained
      ? Math.max(params.initialPages || 1, currentPagination.page || 1)
      : params.initialPages;
    const hasRetainedItems = sameLanguageRetained && Array.isArray(this.state[stateProp]) && this.state[stateProp].length > 0;
    const pages = requestedPages({ ...params, initialPages }, currentPagination);

    const paginationPatch = (pagination) => target.grouped
      ? { [target.property]: { ...this.state[target.property], [categoryKey]: pagination } }
      : { [target.property]: pagination };

    const updateLoading = (loadingMore, error = null) => {
      if (isAppend) this.setState(paginationPatch({ ...currentPagination, loadingMore, error }));
    };

    if (isAppend) {
      updateLoading(true);
    } else if (!hasRetainedItems) {
      this.setState(paginationPatch({ ...currentPagination, loading: true, loadingMore: false, error: null }));
    } else if (currentPagination.loading || currentPagination.loadingMore || currentPagination.error) {
      this.setState(paginationPatch({ ...currentPagination, loading: false, loadingMore: false, error: null }));
    }

    const requestSeq = (this._requestCounters.get(asyncKey) || 0) + (isAppend ? 0 : 1);
    const isCurrent = () => (this._requestCounters.get(asyncKey) || 0) === requestSeq;

    const executeLoad = async () => {
      const responses = await Promise.all(pages.map((p) => fetchPage(p)));
      const existing = isAppend ? (this.state[stateProp] || []) : [];
      const { items, pagination } = combinePages(responses, pages, isAppend ? currentPagination : {}, existing, filterFn, keyFn || undefined);

      /** @type {Record<string, any>} */
      const patch = {
        [stateProp]: items
      };

      if (groupedListProp) {
        patch[groupedListProp] = {
          ...this.state[groupedListProp],
          [categoryKey]: items
        };
      }

      Object.assign(patch, paginationPatch({ ...pagination, language, loading: false, error: null }));
      return patch;
    };

    // Merge category entries at commit time so concurrent loads preserve each other's state.
    const mergeCategoryState = (statePatch) => mergeCategoryPatch(
      this.state, statePatch, categoryKey, [groupedListProp, target.grouped && target.property]
    );

    try {
      if (isAppend) {
        const nextState = await executeLoad();
        if (isCurrent()) this.setState(mergeCategoryState(nextState));
      } else {
        const result = await this.runAsync(asyncKey, executeLoad, mergeCategoryState);
        if (result === null && isCurrent()) {
          this.setState(paginationPatch({ ...currentPagination, loading: false, loadingMore: false, error: this.state.error }));
        }
      }
    } catch (error) {
      console.error(`[MediaCatalogViewModel] Error loading pagination for ${categoryKey}:`, error);
      if (isCurrent()) updateLoading(false, error?.message || String(error));
    }

    return this.state[stateProp] || [];
  }
}

export default MediaCatalogViewModel;
