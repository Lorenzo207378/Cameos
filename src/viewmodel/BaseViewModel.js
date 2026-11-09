import { BaseRepository } from '../repository/BaseRepository.js';
import { normalizeLanguage as normalizeLangTag } from '../models/utils/modelUtils.js';
import { combinePages, mergeCategoryPatch, requestedPages, resolvePaginationTarget } from './pagination.js';

/**
 * @typedef {Object} BaseViewModelState
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 * @property {Record<string, any>} [categoryPagination]
 */

/**
 * BaseViewModel
 * Core MVVM ViewModel base class bridging Repositories and React UI Views.
 * - Maintains immutable observable UI state (`loading`, `error`, `isOffline`, `language`).
 * - Compatible with React 18/19 `useSyncExternalStore(vm.subscribe, vm.getSnapshot)`.
 * - Prevents race conditions on concurrent async operations via request sequence tracking.
 */
export class BaseViewModel {
  /**
   * @param {Object} [initialState={}]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(initialState = {}, { language = 'it-IT' } = {}) {
    this._listeners = new Set();
    this._requestCounters = new Map();
    this._pendingOperations = new Set();
    /** @protected */
    this._language = this.normalizeLanguage(language);

    /**
     * @protected
     * @type {Readonly<BaseViewModelState & Record<string, any>>}
     */
    this._state = Object.freeze({
      loading: false,
      error: null,
      isOffline: !this.checkOnlineStatus(),
      language: this._language,
      ...initialState
    });

    this.setState = this.setState.bind(this);
    this.runAsync = this.runAsync.bind(this);
    this.runSearch = this.runSearch.bind(this);
    this.loadPagination = this.loadPagination.bind(this);
    this.mapPaginatedResult = this.mapPaginatedResult.bind(this);
  }

  /**
   * Normalize language code ('it' | 'it-IT' -> 'it-IT', 'en' | 'en-US' -> 'en-US')
   * @param {string} [language='it-IT']
   * @returns {string}
   */
  normalizeLanguage(language = 'it-IT') {
    return normalizeLangTag(language);
  }

  /**
   * Map a paginated repository response (`results`, `page`, `total_pages`, `total_results`) to state fields
   * @protected
   * @param {string} listKey
   * @param {Object} [response={}]
   * @returns {Object}
   */
  mapPaginatedResult(listKey, response = {}) {
    return {
      [listKey]: response.results || [],
      page: response.page || 1,
      totalPages: response.total_pages || 0,
      totalResults: response.total_results || 0
    };
  }

  /**
   * Check current connectivity status
   * @returns {boolean}
   */
  checkOnlineStatus() {
    const globalOverride = BaseRepository.getGlobalOnlineOverride();
    if (typeof globalOverride === 'boolean') {
      return globalOverride;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Subscribe a listener to state changes (used by React `useSyncExternalStore`)
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe = (listener) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };

  /**
   * Return current immutable state snapshot (used by React `useSyncExternalStore`)
   * @returns {Object}
   */
  getSnapshot = () => {
    return this._state;
  };

  /**
   * Convenience getter for current state
   * @returns {Object}
   */
  get state() {
    return this._state;
  }

  /**
   * Convenience getter for active language
   * @returns {string}
   */
  get language() {
    return this._language;
  }

  /**
   * Update state immutably and notify all subscribed Views
   * @param {Record<string, any>|((state: Readonly<BaseViewModelState & Record<string, any>>) => Record<string, any>)} updater
   */
  setState(updater) {
    const partial = typeof updater === 'function' ? updater(this._state) : updater;
    if (!partial || typeof partial !== 'object') return;

    const isOfflineVal = partial.isOffline !== undefined ? partial.isOffline : !this.checkOnlineStatus();
    /** @type {BaseViewModelState & Record<string, any>} */
    const nextState = {
      ...this._state,
      ...partial,
      isOffline: isOfflineVal
    };

    const prev = this._state;
    const nextKeys = Object.keys(nextState);
    const changed = Object.keys(prev).length !== nextKeys.length ||
      nextKeys.some((key) => prev[key] !== nextState[key]);

    if (!changed) return;

    this._state = Object.freeze(nextState);

    for (const listener of this._listeners) {
      listener();
    }
  }

  /**
   * Set active language for subsequent repository requests
   * @param {string} language
   */
  setLanguage = (language) => {
    const normalized = this.normalizeLanguage(language);
    if (normalized !== this._language) {
      this._language = normalized;
      this.setState({ language: normalized });
    }
  };

  /**
   * Clear current error state
   */
  clearError = () => {
    if (this._state.error !== null) {
      this.setState({ error: null });
    }
  };

  /**
   * Refresh connectivity status in state
   * @param {boolean} [isOnline]
   */
  updateConnectivity = (isOnline = this.checkOnlineStatus()) => {
    this.setState({ isOffline: !isOnline });
  };

  /**
   * Execute an asynchronous Repository operation with automatic loading/error management
   * and stale-request cancellation guard.
   * @template T
   * @param {string} operationKey - Unique key to guard against out-of-order responses
   * @param {() => Promise<T>} task - Async function invoking Repository
   * @param {Function} [mapResultToState] - Optional state reducer on success
   * @returns {Promise<T|null>}
   */
  async runAsync(operationKey, task, mapResultToState) {
    const currentSeq = (this._requestCounters.get(operationKey) || 0) + 1;
    this._requestCounters.set(operationKey, currentSeq);
    this._pendingOperations.add(operationKey);

    this.setState({
      loading: true,
      error: null,
      isOffline: !this.checkOnlineStatus()
    });

    try {
      const result = await task();

      // Ignore stale responses if a newer request with the same operationKey started
      if (this._requestCounters.get(operationKey) !== currentSeq) {
        return result;
      }

      this._pendingOperations.delete(operationKey);
      const nextPartial = mapResultToState ? mapResultToState(result) : {};
      this.setState({
        ...nextPartial,
        loading: this._pendingOperations.size > 0,
        error: null,
        isOffline: !this.checkOnlineStatus()
      });

      return result;
    } catch (err) {
      if (this._requestCounters.get(operationKey) === currentSeq) {
        this._pendingOperations.delete(operationKey);
        this.setState({
          loading: this._pendingOperations.size > 0,
          error: err?.message || String(err),
          isOffline: !this.checkOnlineStatus()
        });
      }
      return null;
    }
  }

  /** Accept existing positional ViewModel calls as well as the shared parameter object. */
  _mediaSearchInput(value, page, language, searchBy) {
    if (value && typeof value === 'object') return { page, language, ...value, searchBy: searchBy || value.searchBy || 'title' };
    searchBy ||= 'title';
    const isId = searchBy !== 'title' && (typeof value === 'number' || /^\d+(?:[,|]\d+)*$/.test(String(value)));
    const key = isId ? (searchBy === 'genre' ? 'genreId' : 'personId') : 'query';
    return { [key]: value, page, language, searchBy };
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
   * @param {Function} [options.keyFn] - Optional stable item identity
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
    const initialPages = params.retainPages && currentPagination.language === language
      ? Math.max(params.initialPages || 1, currentPagination.page || 1)
      : params.initialPages;
    const pages = requestedPages({ ...params, initialPages }, currentPagination);

    const paginationPatch = (pagination) => target.grouped
      ? { [target.property]: { ...this.state[target.property], [categoryKey]: pagination } }
      : { [target.property]: pagination };

    const updateLoading = (loadingMore, error = null) => {
      if (isAppend) this.setState(paginationPatch({ ...currentPagination, loadingMore, error }));
    };

    if (isAppend) updateLoading(true);
    else this.setState(paginationPatch({ ...currentPagination, loading: true, loadingMore: false, error: null }));

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
      console.error(`[BaseViewModel] Error loading pagination for ${categoryKey}:`, error);
      if (isCurrent()) updateLoading(false, error?.message || String(error));
    }

    return this.state[stateProp] || [];
  }
}

export default BaseViewModel;
