import { BaseRepository, STORES } from './BaseRepository.js';
import { normalizeMediaSearch, emptySearchPage } from '../utils/media/search.js';
import { isExcludedMedia } from '../models/utils/mediaLabels.js';

/**
 * MediaCatalogRepository
 * Specialized Repository base class for media catalog queries, localized genres, and media search.
 * Keeps catalog-domain persistence helpers separate from generic offline/TTL mechanics in BaseRepository.
 */
export class MediaCatalogRepository extends BaseRepository {
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
   * Cache localized genre registries using the unified TTL + Network-First policy.
   * @protected
   * @param {string} mediaType
   * @param {string|undefined} language
   * @param {Function} fetchRemote
   * @param {boolean} [force=false]
   * @returns {Promise<{ genres: Array<{ id: number, name: string }> }>}
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
   * @template {{ popularity?: number }} T
   * @param {import('../utils/media/search.js').MediaSearchParams} params
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
   * @template {{ popularity?: number }} T
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
export default MediaCatalogRepository;
