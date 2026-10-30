import { BaseRepository } from '../repository/BaseRepository.js';
import { normalizeLanguage as normalizeLangTag } from '../models/modelUtils.js';

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
    /** @protected */
    this._language = this.normalizeLanguage(language);

    /** @protected */
    this._state = Object.freeze({
      loading: false,
      error: null,
      isOffline: !this.checkOnlineStatus(),
      language: this._language,
      ...initialState
    });
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
   * @param {Object|Function} updater
   */
  setState(updater) {
    const partial = typeof updater === 'function' ? updater(this._state) : updater;
    if (!partial || typeof partial !== 'object') return;

    const isOfflineVal = partial.isOffline !== undefined ? partial.isOffline : !this.checkOnlineStatus();
    const nextState = {
      ...this._state,
      ...partial,
      isOffline: isOfflineVal
    };

    const prev = this._state;
    const prevKeys = Object.keys(prev);
    const nextKeys = Object.keys(nextState);

    let changed = prevKeys.length !== nextKeys.length;
    if (!changed) {
      for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (prev[key] !== nextState[key]) {
          changed = true;
          break;
        }
      }
    }

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
   * @param {Function} task - Async function invoking Repository
   * @param {Function} [mapResultToState] - Optional state reducer on success
   * @returns {Promise<T|null>}
   */
  async runAsync(operationKey, task, mapResultToState) {
    const currentSeq = (this._requestCounters.get(operationKey) || 0) + 1;
    this._requestCounters.set(operationKey, currentSeq);

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

      const nextPartial = mapResultToState ? mapResultToState(result) : {};
      this.setState({
        ...nextPartial,
        loading: false,
        error: null,
        isOffline: !this.checkOnlineStatus()
      });

      return result;
    } catch (err) {
      if (this._requestCounters.get(operationKey) === currentSeq) {
        this.setState({
          loading: false,
          error: err?.message || String(err),
          isOffline: !this.checkOnlineStatus()
        });
      }
      return null;
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
   * @param {Object} [options.params={}] - Options { page, initialPages, append, language }
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
    const activePaginationMapProp = paginationMapProp || (this.state['categoryPagination'] ? 'categoryPagination' : null);

    let currentPagination;
    if (paginationProp) {
      currentPagination = this.state[paginationProp];
    } else if (activePaginationMapProp) {
      currentPagination = this.state[activePaginationMapProp]?.[categoryKey];
    } else {
      currentPagination = this.state[`${categoryKey}Pagination`];
    }

    currentPagination = currentPagination || {
      page: 1,
      totalPages: 1,
      hasMore: true,
      loadingMore: false
    };

    if (isAppend && (currentPagination.loadingMore || currentPagination.hasMore === false)) {
      return this.state[stateProp] || [];
    }

    const pages = isAppend
      ? [params.page || (currentPagination.page || 1) + 1]
      : Array.from({ length: Math.max(1, params.initialPages || 1) }, (_, i) => i + (params.page || 1));

    const updateLoading = (loadingMore) => {
      if (!isAppend) return;
      if (paginationProp) {
        this.setState({
          [paginationProp]: { ...currentPagination, loadingMore }
        });
      } else if (activePaginationMapProp) {
        this.setState({
          [activePaginationMapProp]: {
            ...this.state[activePaginationMapProp],
            [categoryKey]: { ...currentPagination, loadingMore }
          }
        });
      } else {
        this.setState({
          [`${categoryKey}Pagination`]: { ...currentPagination, loadingMore }
        });
      }
    };

    updateLoading(true);

    const executeLoad = async () => {
      const responses = await Promise.all(pages.map((p) => fetchPage(p)));
      const raw = responses.flatMap((r) => r?.results || (Array.isArray(r) ? r : []));
      const filtered = filterFn ? raw.filter((m) => filterFn(m)) : raw;
      const existing = isAppend ? (this.state[stateProp] || []) : [];
      const getItemKey = keyFn || ((m) => (m.mediaId ? `${m.mediaId}_${m.id ?? ''}_${m.character || m.name || ''}` : (m.id ?? `${m.title || m.name}`)));
      const items = Array.from(new Map([...existing, ...filtered].map((m) => [getItemKey(m), m])).values());

      const totalPages = responses.reduce((max, r) => Math.max(max, r?.total_pages || r?.totalPages || 1), currentPagination.totalPages || 1);
      const targetPage = pages[pages.length - 1] || 1;
      const lastRes = responses[responses.length - 1];
      const hasMore = lastRes?.hasMore !== undefined ? Boolean(lastRes.hasMore) : targetPage < totalPages;

      /** @type {{ page: number, totalPages: number, hasMore: boolean, loadingMore: boolean }} */
      const paginationObj = {
        page: targetPage,
        totalPages,
        hasMore,
        loadingMore: false
      };

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

      if (paginationProp) {
        patch[paginationProp] = paginationObj;
      } else if (activePaginationMapProp) {
        patch[activePaginationMapProp] = {
          ...this.state[activePaginationMapProp],
          [categoryKey]: paginationObj
        };
      } else {
        patch[`${categoryKey}Pagination`] = paginationObj;
      }

      return patch;
    };

    try {
      if (isAppend) {
        const nextState = await executeLoad();
        this.setState(nextState);
      } else {
        await this.runAsync(asyncKey, executeLoad, (statePatch) => statePatch);
      }
    } catch (error) {
      console.error(`[BaseViewModel] Error loading pagination for ${categoryKey}:`, error);
      updateLoading(false);
    }

    return this.state[stateProp] || [];
  }
}

export default BaseViewModel;
