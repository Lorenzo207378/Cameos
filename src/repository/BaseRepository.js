import { indexedDBService as defaultStorage, STORES } from '../storage/IndexedDBService.js';
import { normalizeLanguage as normalizeLangTag } from '../models/utils/modelUtils.js';
import { normalizeMediaSearch, emptySearchPage } from '../utils/search.js';
import { isExcludedMedia } from '../models/utils/index.js';
import { isCatalogCacheFresh, CATALOG_CACHE_TTL_MS } from './catalogCache.js';

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
    this._catalogRequests = new Map();
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
   * @param {string} [config._cacheReason=''] - Optional cache miss/expiry reason for testing logs
   * @returns {Promise<T>}
   */
  async executeWithFallback({ context, fetchRemote, saveLocal, getLocal, _cacheReason = '' }) {
    if (this.isOnline()) {
      try {
        const freshData = await fetchRemote();
        try {
          await saveLocal(freshData);
        } catch (storageError) {
          console.warn(`[Repository] Impossible to save into IndexedDB (${context}):`, storageError);
        }
        const ttlDetails = _cacheReason
          ? ` [${_cacheReason}] | TTL reset: ${CATALOG_CACHE_TTL_MS / 1000}s`
          : '';
        console.info(`[Repository] ONLINE -> ${context}${ttlDetails}`);
        return freshData;
      } catch (networkError) {
        const cachedData = await getLocal();
        if (cachedData !== null && cachedData !== undefined) {
          console.info(`[Repository] LOCAL FALLBACK (network error) -> ${context}`);
          return cachedData;
        }
        throw networkError;
      }
    }

    const cachedData = await getLocal();
    if (cachedData !== null && cachedData !== undefined) {
      console.info(`[Repository] LOCAL FALLBACK (offline) -> ${context}`);
      return cachedData;
    }

    throw new Error(`Connettività assente e nessun dato locale in cache per: ${context}`);
  }

  /**
   * Persist individual entities from a paginated list
   * @protected
   * @param {string} storeName
   * @param {Array<Object>} [items]
   * @param {string} [language]
   * @param {Function} buildKey
   * @returns {Promise<void>}
   */
  async _cacheEntitiesFromList(storeName, items, language, buildKey) {
    const lang = this.normalizeLanguage(language);
    const recordsToPut = [];

    for (const item of items || []) {
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
   * @param {Object} [prefetchedExact]
   * @returns {Promise<T|null>}
   */
  async _getEntityWithIndexFallback(storeName, exactKey, indexName, indexValue, ModelClass, prefetchedExact = undefined) {
    const exact = prefetchedExact !== undefined
      ? prefetchedExact
      : await this.storage.get(storeName, exactKey);
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
   * @param {boolean} [options.cache=true] - Reuse catalog results until their fixed TTL expires
   * @param {boolean} [options.force=false] - Refresh even when the catalog cache is still fresh
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<*> }>}
   */
  async _executePaginatedQuery(queryKey, fetchRemote, ModelClass, { onSaveItems = undefined, searchLocal = undefined, cache = true, force = false } = {}) {
    const config = {
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
      getLocal: async (prefetchedRecord) => {
        const cached = prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.QUERIES, queryKey);
        if (!cached?.data) return searchLocal ? searchLocal() : null;
        return {
          ...cached.data,
          results: (cached.data.results || []).map((item) => new ModelClass(item))
        };
      }
    };
    return cache
      ? this.executeCatalogQuery({ ...config, storeName: STORES.QUERIES, force })
      : this.executeWithFallback(config);
  }

  /**
   * Reuse fresh catalog records and share simultaneous requests for the same query.
   * @template T
   * @param {Object} options
   * @param {string} options.storeName
   * @param {string} options.context
   * @param {Function} options.fetchRemote
   * @param {Function} options.saveLocal
   * @param {Function} options.getLocal
   * @param {boolean} [options.force=false]
   * @param {Function} [options.isRecordValid]
   * @returns {Promise<T>}
   */
  async executeCatalogQuery({
    storeName,
    context,
    fetchRemote,
    saveLocal,
    getLocal,
    force = false,
    isRecordValid = () => true
  }) {
    const key = `${storeName}:${context}`;
    if (this._catalogRequests.has(key)) {
      console.info(`[Repository] IN-FLIGHT DEDUP -> ${key}`);
      return this._catalogRequests.get(key);
    }

    let prefetchedRecord;
    let hasPrefetched = false;
    const getLocalWithPrefetch = async () => (hasPrefetched ? getLocal(prefetchedRecord) : getLocal());

    const request = (async () => {
      let cacheReason = force ? 'force refresh' : 'cache miss';
      if (!force) {
        try {
          prefetchedRecord = await this.storage.get(storeName, context);
          hasPrefetched = true;
          const timestamp = prefetchedRecord?.cachedAt ?? prefetchedRecord?.updatedAt;
          const ageMs = Number.isFinite(timestamp) ? Date.now() - timestamp : null;
          if (isRecordValid(prefetchedRecord) && isCatalogCacheFresh(timestamp)) {
            const data = await getLocal(prefetchedRecord);
            if (data != null) {
              const ageSec = Math.round((ageMs ?? 0) / 1000);
              const remainingSec = Math.max(0, Math.round((CATALOG_CACHE_TTL_MS - (ageMs ?? 0)) / 1000));
              console.info(
                `[Repository] LOCAL CACHE (TTL HIT) -> ${key} | age: ${ageSec}s, remaining: ${remainingSec}s/${CATALOG_CACHE_TTL_MS / 1000}s`
              );
              return data;
            }
          } else if (prefetchedRecord) {
            if (!isRecordValid(prefetchedRecord)) {
              cacheReason = 'incomplete/invalid record';
            } else if (ageMs !== null) {
              cacheReason = `TTL expired (${Math.round(ageMs / 1000)}s >= ${CATALOG_CACHE_TTL_MS / 1000}s)`;
            }
          }
        } catch {
          // An unavailable local store must not prevent an online request.
        }
      }
      return this.executeWithFallback({
        context,
        fetchRemote,
        saveLocal,
        getLocal: getLocalWithPrefetch,
        _cacheReason: cacheReason
      });
    })();

    this._catalogRequests.set(key, request);
    try {
      return await request;
    } finally {
      this._catalogRequests.delete(key);
    }
  }

  /**
   * Centralize catalog pagination queries (discover, upcoming, category, trending).
   * @protected
   * @template T
   * @param {function(new:T, Object)} ModelClass
   * @param {Object} options
   * @param {string} options.prefix
   * @param {Object} [options.queryParams={}]
   * @param {string} [options.language]
   * @param {boolean} [options.cache=true]
   * @param {boolean} [options.force=false]
   * @param {Function} options.fetchRemote
   * @param {Function} [options.saveItems]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<*> }>}
   */
  async _executeMediaCatalogPage(ModelClass, {
    prefix,
    queryParams = {},
    language = undefined,
    cache = true,
    force = false,
    fetchRemote,
    saveItems = undefined
  }) {
    const lang = this.normalizeLanguage(language);
    const queryKey = this.buildCacheKey(prefix, { ...queryParams, language: lang });
    return this._executePaginatedQuery(queryKey, fetchRemote, ModelClass, {
      cache,
      force,
      onSaveItems: saveItems ? (results) => saveItems(results, lang) : undefined
    });
  }

  /**
   * Centralize single-entity detail lookup with complete vs. basic record separation and TTL cache.
   * @protected
   * @template T
   * @param {function(new:T, Object)} ModelClass
   * @param {Object} options
   * @param {string} options.storeName
   * @param {string} options.entityKey
   * @param {number|string} [options.id]
   * @param {string} [options.indexName='id']
   * @param {*} [options.indexValue]
   * @param {Object} [options.extraFields={}]
   * @param {string} [options.language]
   * @param {boolean} options.isComplete
   * @param {boolean} [options.force=false]
   * @param {Function} [options.onSave]
   * @param {Function} options.fetchRemote
   * @returns {Promise<T>}
   */
  async _executeEntityDetails(ModelClass, {
    storeName,
    entityKey,
    id = undefined,
    indexName = 'id',
    indexValue = Number(id),
    extraFields = {},
    language = undefined,
    isComplete,
    force = false,
    onSave = undefined,
    fetchRemote
  }) {
    const lang = this.normalizeLanguage(language);
    const cacheKey = `${entityKey}${isComplete ? '' : ':basic'}`;
    return this.executeCatalogQuery({
      storeName,
      force,
      context: cacheKey,
      isRecordValid: (record) => Boolean(record?.cachedAt) && (!isComplete || Boolean(record?.isComplete)),
      fetchRemote,
      saveLocal: async (freshEntity) => {
        await this.storage.put(storeName, {
          cacheKey,
          ...(id !== undefined && id !== null ? { id: Number(id) } : {}),
          ...extraFields,
          language: lang,
          isComplete,
          cachedAt: Date.now(),
          data: freshEntity
        });
        if (onSave) {
          await onSave(freshEntity, lang);
        }
      },
      getLocal: (prefetchedRecord) => this._getEntityWithIndexFallback(
        storeName, cacheKey, indexName, indexValue, ModelClass, prefetchedRecord
      )
    });
  }

  /**
   * Cache localized genre registries using the unified TTL + Network-First policy.
   * @protected
   * @param {string} mediaType
   * @param {string} [language]
   * @param {Function} fetchRemote
   * @param {boolean} [force=false]
   * @returns {Promise<Array<Object>>}
   */
  async _getGenres(mediaType, language, fetchRemote, force = false) {
    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey(`genres_${mediaType}`, { language: lang });
    return this.executeCatalogQuery({
      storeName: STORES.QUERIES,
      force,
      context: cacheKey,
      fetchRemote: () => fetchRemote({ language: lang }),
      saveLocal: (data) => this.storage.put(STORES.QUERIES, { cacheKey, cachedAt: Date.now(), data }),
      getLocal: async (prefetchedRecord) => (
        prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.QUERIES, cacheKey)
      )?.data ?? null
    });
  }

  /**
   * Share query keys, TTL + Network-First caching and title fallback across both media repositories.
   * @protected
   * @template T
   * @param {import('../utils/search.js').MediaSearchParams} params
   * @param {function(new:T, Object)} ModelClass
   * @param {Object} options
   * @param {'movie'|'tv'} options.mediaType
   * @param {Function} options.saveItems
   * @param {Function} options.fetchRemote
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<*> }>}
   */
  async _executeMediaSearch(params, ModelClass, { mediaType, saveItems, fetchRemote }) {
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
      force: Boolean(params?.force),
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
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<*> }|null>}
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
