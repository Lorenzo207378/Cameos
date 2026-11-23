import { isNetworkOnline } from '../utils/networkStatus.js';
import { normalizeLanguage as normalizeLangTag } from '../models/utils/modelUtils.js';

/**
 * @typedef {Object} BaseViewModelState
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
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
    return isNetworkOnline();
  }

  /**
   * Subscribe a listener to state changes (used by React `useSyncExternalStore`)
   * @param {() => void} listener
   * @returns {() => void} Unsubscribe function
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

  /** Check whether a route-bound detail entity is unrequested, switched, or currently loading. */
  _isRouteEntityLoading(operationKey, requestedId, targetId) {
    return String(requestedId) !== String(targetId) || this._pendingOperations.has(operationKey);
  }
}

export default BaseViewModel;
