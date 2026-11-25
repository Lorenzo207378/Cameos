import { BaseViewModel } from './BaseViewModel.js';
import { isNumericIdList } from '../utils/media/search.js';
import { buildPaginationPatch, combinePages, mergeCategoryPatch, planPaginationLoad } from './pagination.js';

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

  /** Apply the pre-fetch loading transition for an append, cold load, or retained background revalidation. */
  _beginPaginationLoad(target, categoryKey, currentPagination, { isAppend, hasRetainedItems }) {
    const setPagination = (pagination) => {
      this.setState(buildPaginationPatch(this.state, target, categoryKey, pagination));
    };

    if (isAppend) {
      setPagination({ ...currentPagination, loadingMore: true, error: null });
    } else if (!hasRetainedItems) {
      setPagination({ ...currentPagination, loading: true, loadingMore: false, error: null });
    } else if (currentPagination.loading || currentPagination.loadingMore || currentPagination.error) {
      setPagination({ ...currentPagination, loading: false, loadingMore: false, error: null });
    }
  }

  /** Execute a non-append pagination load via runAsync while preserving its isolated error on failure. */
  async _runRefreshPagination(asyncKey, executeLoad, mergeCategoryState, isCurrent, onFailure) {
    /** @type {string|null} */
    let requestError = null;
    const result = await this.runAsync(
      asyncKey,
      async () => {
        try {
          return await executeLoad();
        } catch (err) {
          requestError = err instanceof Error ? err.message : String(err);
          throw err;
        }
      },
      mergeCategoryState
    );
    if (result === null && isCurrent() && requestError !== null) {
      onFailure(requestError);
    }
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
    paginationMapProp = undefined,
    paginationProp = undefined,
    groupedListProp = undefined,
    fetchPage,
    filterFn = undefined,
    keyFn = undefined,
    params = {}
  }) {
    const plan = planPaginationLoad(this.state, {
      categoryKey,
      stateProp,
      paginationProp,
      paginationMapProp,
      params,
      defaultLanguage: this.language
    });
    const { isAppend, target, currentPagination, language, pages } = plan;

    if (isAppend && (currentPagination.loadingMore || currentPagination.hasMore === false || this._pendingOperations.has(asyncKey))) {
      return this.state[stateProp] || [];
    }

    this._beginPaginationLoad(target, categoryKey, currentPagination, plan);

    const requestSeq = (this._requestCounters.get(asyncKey) || 0) + (isAppend ? 0 : 1);
    const isCurrent = () => (this._requestCounters.get(asyncKey) || 0) === requestSeq;
    const patchPagination = (pagination) => buildPaginationPatch(this.state, target, categoryKey, pagination);

    const executeLoad = async () => {
      const responses = await Promise.all(pages.map((p) => fetchPage(p)));
      const existing = isAppend ? (this.state[stateProp] || []) : [];
      const { items, pagination } = combinePages(responses, pages, isAppend ? currentPagination : {}, existing, filterFn, keyFn || undefined);
      /** @type {Record<string, any>} */
      const patch = {
        [stateProp]: items,
        ...(groupedListProp ? { [groupedListProp]: { ...this.state[groupedListProp], [categoryKey]: items } } : {}),
        ...patchPagination({ ...pagination, language, loading: false, error: null })
      };
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
        await this._runRefreshPagination(asyncKey, executeLoad, mergeCategoryState, isCurrent, (requestError) => {
          this.setState(patchPagination({ ...currentPagination, loading: false, loadingMore: false, error: requestError }));
        });
      }
    } catch (error) {
      console.error(`[MediaCatalogViewModel] Error loading pagination for ${categoryKey}:`, error);
      if (isAppend && isCurrent()) {
        this.setState(patchPagination({ ...currentPagination, loadingMore: false, error: error?.message || String(error) }));
      }
    }

    return this.state[stateProp] || [];
  }
}

export default MediaCatalogViewModel;
