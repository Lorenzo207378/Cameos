import { BaseRepository, STORES } from '../BaseRepository.js';
import { seriesBackend as defaultSeriesBackend } from '../../backend/series/SeriesBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Series, Season, Episode, isMediaUpcoming } from '../../models/utils/index.js';

/**
 * SeriesRepository
 * Manages TV Series, Seasons, and Episodes persistence in IndexedDB with Network-First strategy
 * and automatic fallback to local storage when offline or on API errors.
 */
export class SeriesRepository extends BaseRepository {
  /**
   * @param {import('../../backend/series/SeriesBackend.js').SeriesBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultSeriesBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Get localized TV series genres list
   * @param {Object} [options={}]
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Array<Object>>}
   */
  async getGenres({ language = undefined, force = false } = {}) {
    return this._getGenres('tv', language, (params) => this.backend.getGenres(params), force);
  }

  /**
   * @param {number|string} seriesId
   * @param {string} [language]
   * @returns {string}
   */
  _seriesKey(seriesId, language) {
    return `series:${Number(seriesId)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {string} [language]
   * @returns {string}
   */
  _seasonKey(seriesId, seasonNumber, language) {
    return `season:${Number(seriesId)}:${Number(seasonNumber)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {string} [language]
   * @returns {string}
   */
  _episodeKey(seriesId, seasonNumber, episodeNumber, language) {
    return `episode:${Number(seriesId)}:${Number(seasonNumber)}:${Number(episodeNumber)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * @param {Array<Series>} [seriesList=[]]
   * @param {string} [language]
   * @returns {Promise<void>}
   */
  async _saveSeriesItemsFromList(seriesList = [], language = undefined) {
    await this._cacheEntitiesFromList(STORES.SERIES, seriesList, language, (id, lang) => this._seriesKey(id, lang));
  }

  /**
   * Discover and filter TV series
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string|number} [params.genreId]
   * @param {string|number} [params.watchProviderId]
   * @param {string|number} [params.keywords]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async discoverSeries(params = {}) {
    return this._executeMediaCatalogPage(Series, {
      prefix: 'discover_series',
      queryParams: {
        page: params.page ?? 1,
        sortBy: params.sortBy ?? 'popularity.desc',
        genreId: params.genreId,
        watchProviderId: params.watchProviderId,
        keywords: params.keywords
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.discoverSeries(params),
      saveItems: (results, lang) => this._saveSeriesItemsFromList(results, lang)
    });
  }

  /**
   * Get upcoming TV series with future first air date (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getUpcomingSeries(params = {}) {
    const response = await this._executeMediaCatalogPage(Series, {
      prefix: 'upcoming_series',
      queryParams: { page: params.page ?? 1 },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getUpcomingSeries(params),
      saveItems: (results, lang) => this._saveSeriesItemsFromList(results, lang)
    });

    const today = new Date().toISOString().slice(0, 10);
    return {
      ...response,
      results: (response?.results || []).filter((series) => isMediaUpcoming(series, today))
    };
  }

  /**
   * Get TV series by category (Network-First + IndexedDB Fallback)
   * @param {string} categoryKey
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getSeriesByCategory(categoryKey, params = {}) {
    return this._executeMediaCatalogPage(Series, {
      prefix: `category_series_${categoryKey}`,
      queryParams: {
        categoryKey,
        page: params.page ?? 1,
        // Keep existing cache keys for the default ordering while isolating custom sorts.
        ...(params.sortBy && params.sortBy !== 'popularity.desc' ? { sortBy: params.sortBy } : {})
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getSeriesByCategory(categoryKey, params),
      saveItems: (results, lang) => this._saveSeriesItemsFromList(results, lang)
    });
  }

  /**
   * Get trending TV series (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {boolean} [params.onlyReleased=true]
   * @param {number} [params.limit=10]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getTrendingSeries(params = {}) {
    const timeWindow = params.timeWindow ?? 'month';
    const onlyReleased = params.onlyReleased ?? true;
    const limit = params.limit ?? 10;
    return this._executeMediaCatalogPage(Series, {
      prefix: 'trending_series',
      queryParams: {
        timeWindow,
        page: params.page ?? 1,
        onlyReleased,
        limit
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getTrendingSeries({ ...params, timeWindow, onlyReleased, limit }),
      saveItems: (results, lang) => this._saveSeriesItemsFromList(results, lang)
    });
  }

  /**
   * Search TV series by title, genre, actor or director
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeries(params = {}) {
    return this._executeMediaSearch(params, Series, {
      mediaType: 'tv',
      fetchRemote: (search) => this.backend.searchSeries(search),
      saveItems: (results, language) => this._saveSeriesItemsFromList(results, language)
    });
  }

  /**
   * Search TV series by genre ID or localized name (Network-First + IndexedDB fallback).
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeriesByGenre(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'genre' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchSeriesByActor(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'actor' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchSeriesByDirector(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'director' });
  }

  /**
   * Get TV series details with seasons and aggregate credits (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} params.seriesId
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Series>}
   */
  async getSeriesDetails(params = {}) {
    const { seriesId, language } = params;
    if (!seriesId) throw new Error('seriesId is required');

    return this._executeEntityDetails(Series, {
      storeName: STORES.SERIES,
      entityKey: this._seriesKey(seriesId, language),
      id: seriesId,
      language,
      isComplete: params.appendAggregateCredits !== false,
      force: params.force,
      fetchRemote: () => this.backend.getSeriesDetails(params)
    });
  }

  /**
   * Get season details with episodes and guest stars (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Season>}
   */
  async getSeasonDetails(params = {}) {
    const { seriesId, seasonNumber, language, force = false } = params;
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    return this._executeEntityDetails(Season, {
      storeName: STORES.SEASONS,
      entityKey: this._seasonKey(seriesId, seasonNumber, language),
      indexName: 'seasonKey',
      indexValue: [Number(seriesId), Number(seasonNumber)],
      extraFields: {
        seriesId: Number(seriesId),
        seasonNumber: Number(seasonNumber)
      },
      language,
      isComplete: params.appendAggregateCredits !== false,
      force,
      fetchRemote: () => this.backend.getSeasonDetails(params),
      onSave: async (freshSeason, lang) => {
        const episodeRecords = (freshSeason.episodes || []).map((ep) => ({
          cacheKey: this._episodeKey(seriesId, seasonNumber, ep.episodeNumber, lang) + ':summary',
          seriesId: Number(seriesId),
          seasonNumber: Number(seasonNumber),
          episodeNumber: Number(ep.episodeNumber),
          language: lang,
          isComplete: false,
          data: ep
        }));

        if (episodeRecords.length > 0) {
          await this.storage.putMany(STORES.EPISODES, episodeRecords);
        }
      }
    });
  }

  /**
   * Get individual episode details (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {number|string} params.episodeNumber
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Episode>}
   */
  async getEpisodeDetails(params = {}) {
    const { seriesId, seasonNumber, episodeNumber, language, force = false } = params;
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    return this._executeEntityDetails(Episode, {
      storeName: STORES.EPISODES,
      entityKey: this._episodeKey(seriesId, seasonNumber, episodeNumber, language),
      indexName: 'episodeKey',
      indexValue: [Number(seriesId), Number(seasonNumber), Number(episodeNumber)],
      extraFields: {
        seriesId: Number(seriesId),
        seasonNumber: Number(seasonNumber),
        episodeNumber: Number(episodeNumber)
      },
      language,
      isComplete: params.appendCredits !== false,
      force,
      fetchRemote: () => this.backend.getEpisodeDetails(params)
    });
  }
}

export const seriesRepository = new SeriesRepository();
export default SeriesRepository;
