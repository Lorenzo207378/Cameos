import { indexedDBService as defaultStorage, STORES } from '../storage/IndexedDBService.js';
import { normalizeLanguage as normalizeLangTag } from '../models/utils/modelUtils.js';
import { normalizeMediaSearch, emptySearchPage } from '../utils/search.js';
import { isExcludedMedia } from '../models/utils/index.js';

/**
 * BaseRepository
 * Base class implementing the Network-First with IndexedDB Offline Fallback strategy.
 * - Online: fetches fresh domain objects from Backend API, overwrites IndexedDB cache, returns fresh data.
 * - Fetch error or Offline: falls back to IndexedDB local storage and rehydrates domain models.
 */
export class BaseRepository {
  /** @type {boolean|null} */
  static _globalOnlineOverride = null;

  /**
   * @param {import('../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(storage = defaultStorage) {
    this.storage = storage;
    /** @type {boolean|null} */
    this._onlineOverride = null;
  }

  /**
   * Set global connectivity override for all repositories (pass null to restore navigator.onLine)
   * @param {boolean|null} isOnline
   */
  static setGlobalOnlineOverride(isOnline) {
    this._globalOnlineOverride = isOnline;
  }

  /**
   * Get current global connectivity override
   * @returns {boolean|null}
   */
  static getGlobalOnlineOverride() {
    return this._globalOnlineOverride;
  }

  /**
   * Set instance connectivity override (pass null to restore navigator.onLine)
   * @param {boolean|null} isOnline
   */
  setOnlineOverride(isOnline) {
    this._onlineOverride = isOnline;
  }

  /**
   * Check whether network connectivity is currently available
   * @returns {boolean}
   */
  isOnline() {
    if (typeof this._onlineOverride === 'boolean') {
      return this._onlineOverride;
    }
    if (typeof BaseRepository._globalOnlineOverride === 'boolean') {
      return BaseRepository._globalOnlineOverride;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return navigator.onLine;
    }
    return true;
  }

  /**
   * Normalize language tag ('it'|'it-IT' -> 'it-IT', 'en'|'en-US' -> 'en-US')
   * @param {string} [language='it-IT']
   * @returns {string}
   */
  normalizeLanguage(language = 'it-IT') {
    return normalizeLangTag(language);
  }

  /**
   * Build cache key from prefix and parameter object
   * @param {string} prefix
   * @param {Object} [params={}]
   * @returns {string}
   */
  buildCacheKey(prefix, params = {}) {
    const sortedEntries = Object.entries(params)
      .filter(([, val]) => val !== undefined && val !== null && val !== '')
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v).trim()}`);

    return sortedEntries.length > 0 ? `${prefix}:${sortedEntries.join('&')}` : prefix;
  }

  /**
   * Execute an operation using Network-First strategy and automatic fallback to IndexedDB
   * @template T
   * @param {Object} config
   * @param {string} config.context - Human-readable operation description
   * @param {Function} config.fetchRemote - Remote API call returning domain model(s)
   * @param {Function} config.saveLocal - Persists/overwrites fresh data into IndexedDB
   * @param {Function} config.getLocal - Reads and rehydrates domain model(s) from IndexedDB
   * @returns {Promise<T>}
   */
  async executeWithFallback({ context, fetchRemote, saveLocal, getLocal }) {
    if (this.isOnline()) {
      try {
        const freshData = await fetchRemote();
        try {
          await saveLocal(freshData);
        } catch (storageError) {
          console.warn(`[Repository] Impossible to save into IndexedDB (${context}):`, storageError);
        }
        return freshData;
      } catch (networkError) {
        const cachedData = await getLocal();
        if (cachedData !== null && cachedData !== undefined) {
          return cachedData;
        }
        throw networkError;
      }
    }

    const cachedData = await getLocal();
    if (cachedData !== null && cachedData !== undefined) {
      return cachedData;
    }

    throw new Error(`Connettività assente e nessun dato locale in cache per: ${context}`);
  }

  /**
   * Persist individual entities from a paginated list
   * @protected
   * @param {string} storeName
   * @param {Array<Object>} [items=[]]
   * @param {string} language
   * @param {Function} buildKey
   * @returns {Promise<void>}
   */
  async _cacheEntitiesFromList(storeName, items = [], language, buildKey) {
    const lang = this.normalizeLanguage(language);
    const recordsToPut = [];

    for (const item of items) {
      if (!item || item.id === null || item.id === undefined) continue;
      const cacheKey = buildKey(item.id, lang);

      recordsToPut.push({
        cacheKey,
        id: Number(item.id),
        language: lang,
        isComplete: false,
        data: item
      });
    }

    if (recordsToPut.length > 0) {
      // List payloads never guarantee the credits supplied by a full-detail request.
      // Evaluate this condition inside the write transaction to preserve concurrent detail saves.
      await this.storage.putMany(storeName, recordsToPut, { shouldReplace: (existing) => !existing?.isComplete });
    }
  }

  /**
   * Read an entity from IndexedDB by exact key with fallback to secondary index (any cached language)
   * Prefer complete details over an exact-language summary when offline.
   * @protected
   * @template T
   * @param {string} storeName
   * @param {string} exactKey
   * @param {string} indexName
   * @param {*} indexValue
   * @param {function(new:T, Object)} ModelClass
   * @returns {Promise<T|null>}
   */
  async _getEntityWithIndexFallback(storeName, exactKey, indexName, indexValue, ModelClass) {
    const exact = await this.storage.get(storeName, exactKey);
    if (exact?.data && exact.isComplete) {
      return new ModelClass(exact.data);
    }

    const matches = await this.storage.getByIndex(storeName, indexName, indexValue);
    const preferred = matches.find((record) => record.isComplete && record.data)
      || (exact?.data ? exact : matches.find((record) => record.data));
    return preferred ? new ModelClass(preferred.data) : null;
  }

  /**
   * Execute a paginated query with automatic `STORES.QUERIES` caching and optional entity list caching
   * @protected
   * @template T
   * @param {string} queryKey
   * @param {Function} fetchRemote
   * @param {function(new:T, Object)} ModelClass
   * @param {Object} [options={}]
   * @param {Function} [options.onSaveItems] - Receives the fresh results to cache them as individual entities
   * @param {Function} [options.searchLocal] - Used offline when the exact query was never cached
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<T> }>}
   */
  async _executePaginatedQuery(queryKey, fetchRemote, ModelClass, { onSaveItems, searchLocal } = {}) {
    return this.executeWithFallback({
      context: queryKey,
      fetchRemote,
      saveLocal: async (freshResponse) => {
        await this.storage.put(STORES.QUERIES, {
          cacheKey: queryKey,
          data: freshResponse
        });
        if (onSaveItems) {
          await onSaveItems(freshResponse.results || []);
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.QUERIES, queryKey);
        if (!cached?.data) return searchLocal ? searchLocal() : null;
        return {
          ...cached.data,
          results: (cached.data.results || []).map((item) => new ModelClass(item))
        };
      }
    });
  }

  /** Cache localized genre registries using the same Network-First policy as media queries. */
  async _getGenres(mediaType, language, fetchRemote) {
    language = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey(`genres_${mediaType}`, { language });
    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => fetchRemote({ language }),
      saveLocal: (data) => this.storage.put(STORES.QUERIES, { cacheKey, data }),
      getLocal: async () => (await this.storage.get(STORES.QUERIES, cacheKey))?.data ?? null
    });
  }

  /** Share query keys, Network-First caching and title fallback across both media repositories. */
  async _executeMediaSearch(params, { mediaType, ModelClass, saveItems, fetchRemote }) {
    const search = normalizeMediaSearch(params);
    const { searchBy, query, genreId, personId, page } = search;
    if (searchBy === 'title' && !query) return emptySearchPage();
    const language = this.normalizeLanguage(search.language);
    const isMovie = mediaType === 'movie';
    const prefix = isMovie ? 'search_movies' : 'search_series';
    const queryKey = this.buildCacheKey(searchBy === 'title' ? prefix : `${prefix}_by_${searchBy}`, {
      ...(genreId ? { genreId } : personId ? { personId } : { query: query.toLowerCase() }),
      page, language
    });
    const response = await this._executePaginatedQuery(queryKey, () => fetchRemote({ ...search, language }), ModelClass, {
      onSaveItems: (results) => saveItems(results, language),
      searchLocal: searchBy === 'title' ? () => this._searchLocalEntities(
        isMovie ? STORES.MOVIES : STORES.SERIES, query, language,
        isMovie ? ['title', 'originalTitle'] : ['name', 'originalName'], ModelClass
      ) : undefined
    });
    return { ...response, results: response.results.filter((item) => !isExcludedMedia(item)) };
  }

  /**
   * Search locally cached entities by matching text fields when exact search query was not cached
   * @protected
   * @template T
   * @param {string} storeName
   * @param {string} queryText
   * @param {string} language
   * @param {Array<string>} textFields
   * @param {function(new:T, Object)} ModelClass
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<T> }|null>}
   */
  async _searchLocalEntities(storeName, queryText, language, textFields, ModelClass) {
    const allRecords = await this.storage.getAll(storeName);
    const needle = queryText.toLowerCase();
    const deduped = new Map();

    for (const record of allRecords) {
      const entity = record?.data;
      if (!entity || isExcludedMedia(entity)) continue;

      const isMatch = textFields.some((field) => (entity[field] || '').toLowerCase().includes(needle));
      if (!isMatch) continue;

      const existing = deduped.get(entity.id);
      if (!existing || (record.language === language && existing.language !== language)) {
        deduped.set(entity.id, record);
      }
    }

    if (deduped.size === 0) return null;

    const results = Array.from(deduped.values())
      .map((r) => new ModelClass(r.data))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

    return {
      page: 1,
      total_pages: 1,
      total_results: results.length,
      results
    };
  }
}

export { STORES };
export default BaseRepository;


if (typeof window !== 'undefined') {
  window.setCameosOffline = (offline) => {
    BaseRepository.setGlobalOnlineOverride(offline === null ? null : !offline);
    return { isOnlineOverride: BaseRepository.getGlobalOnlineOverride() };
  };
}
