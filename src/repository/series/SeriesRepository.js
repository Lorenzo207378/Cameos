import { BaseRepository, STORES } from '../BaseRepository.js';
import { seriesBackend as defaultSeriesBackend } from '../../backend/series/SeriesBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Series, Season, Episode } from '../../models/index.js';

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
  async _saveSeriesItemsFromList(seriesList = [], language) {
    await this._cacheEntitiesFromList(STORES.SERIES, seriesList, language, (id, lang) => this._seriesKey(id, lang));
  }

  /**
   * Discover and filter TV series (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string|number} [params.genreId]
   * @param {string|number} [params.watchProviderId]
   * @param {string|number} [params.keywords]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async discoverSeries(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('discover_series', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      genreId: params.genreId,
      watchProviderId: params.watchProviderId,
      keywords: params.keywords,
      language: lang
    });

    return this._executePaginatedQuery(
      queryKey,
      () => this.backend.discoverSeries(params),
      Series,
      { onSaveItems: (results) => this._saveSeriesItemsFromList(results, lang) }
    );
  }

  /**
   * Get trending TV series (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getTrendingSeries(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('trending_series', {
      timeWindow: params.timeWindow ?? 'month',
      page: params.page ?? 1,
      language: lang
    });

    return this._executePaginatedQuery(
      queryKey,
      () => this.backend.getTrendingSeries({ timeWindow: params.timeWindow ?? 'month', ...params }),
      Series,
      { onSaveItems: (results) => this._saveSeriesItemsFromList(results, lang) }
    );
  }

  /**
   * Search TV series by title (Network-First + IndexedDB Query & Local Store Search Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.query]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeries(params = {}) {
    const sanitizedQuery = (params.query || '').trim();
    if (!sanitizedQuery) {
      return { page: 1, results: [], total_pages: 0, total_results: 0 };
    }

    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('search_series', {
      query: sanitizedQuery.toLowerCase(),
      page: params.page ?? 1,
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.searchSeries(params), Series, {
      onSaveItems: (results) => this._saveSeriesItemsFromList(results, lang),
      searchLocal: () => this._searchLocalEntities(STORES.SERIES, sanitizedQuery, lang, ['name', 'originalName'], Series)
    });
  }

  /**
   * Get TV series details with seasons and aggregate credits (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Series>}
   */
  async getSeriesDetails(params = {}) {
    const { seriesId, language } = params;
    if (!seriesId) throw new Error('seriesId is required');

    const lang = this.normalizeLanguage(language);
    const cacheKey = this._seriesKey(seriesId, lang);

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getSeriesDetails(params),
      saveLocal: async (freshSeries) => {
        await this.storage.put(STORES.SERIES, {
          cacheKey,
          id: Number(seriesId),
          language: lang,
          isComplete: true,
          data: freshSeries
        });
      },
      getLocal: () => this._getEntityWithIndexFallback(STORES.SERIES, cacheKey, 'id', Number(seriesId), Series)
    });
  }

  /**
   * Get season details with episodes and guest stars (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Season>}
   */
  async getSeasonDetails(params = {}) {
    const { seriesId, seasonNumber, language } = params;
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this._seasonKey(seriesId, seasonNumber, lang);

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getSeasonDetails(params),
      saveLocal: async (freshSeason) => {
        await this.storage.put(STORES.SEASONS, {
          cacheKey,
          seriesId: Number(seriesId),
          seasonNumber: Number(seasonNumber),
          language: lang,
          data: freshSeason
        });

        const episodeRecords = (freshSeason.episodes || []).map((ep) => ({
          cacheKey: this._episodeKey(seriesId, seasonNumber, ep.episodeNumber, lang),
          seriesId: Number(seriesId),
          seasonNumber: Number(seasonNumber),
          episodeNumber: Number(ep.episodeNumber),
          language: lang,
          data: ep
        }));

        if (episodeRecords.length > 0) {
          await this.storage.putMany(STORES.EPISODES, episodeRecords);
        }
      },
      getLocal: () =>
        this._getEntityWithIndexFallback(
          STORES.SEASONS,
          cacheKey,
          'seasonKey',
          [Number(seriesId), Number(seasonNumber)],
          Season
        )
    });
  }

  /**
   * Get individual episode details (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Episode>}
   */
  async getEpisodeDetails(params = {}) {
    const { seriesId, seasonNumber, episodeNumber, language } = params;
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this._episodeKey(seriesId, seasonNumber, episodeNumber, lang);

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getEpisodeDetails(params),
      saveLocal: async (freshEpisode) => {
        await this.storage.put(STORES.EPISODES, {
          cacheKey,
          seriesId: Number(seriesId),
          seasonNumber: Number(seasonNumber),
          episodeNumber: Number(episodeNumber),
          language: lang,
          data: freshEpisode
        });
      },
      getLocal: () =>
        this._getEntityWithIndexFallback(
          STORES.EPISODES,
          cacheKey,
          'episodeKey',
          [Number(seriesId), Number(seasonNumber), Number(episodeNumber)],
          Episode
        )
    });
  }
}

export const seriesRepository = new SeriesRepository();
export default SeriesRepository;
