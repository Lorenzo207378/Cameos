import { BaseRepository, STORES } from '../BaseRepository.js';
import { cameoBackend as defaultCameoBackend } from '../../backend/cameos/CameoBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Cameo, Movie, Series, Season, Episode, isExcludedMedia } from '../../models/utils/index.js';

/**
 * CameoRepository
 * Manages Cameos persistence in IndexedDB across Series, Seasons, Episodes, Movies, and Actors
 * with Network-First strategy and automatic fallback to local storage when offline or on API errors.
 */
export class CameoRepository extends BaseRepository {
  /**
   * @param {import('../../backend/cameos/CameoBackend.js').CameoBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultCameoBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Execute a Cameo list query (`Array<Cameo>`) with TTL caching in `STORES.CAMEOS`
   * @param {string} prefix
   * @param {{ language?: string, [key: string]: * }} keyParams
   * @param {Function} fetchRemote
   * @param {Object} [options={}]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Array<Cameo>>}
   */
  async _executeCameoList(prefix, keyParams, fetchRemote, { force = false } = {}) {
    const cacheKey = this.buildCacheKey(prefix, {
      ...keyParams,
      language: this.normalizeLanguage(keyParams.language)
    });
    return this.executeCatalogQuery({
      storeName: STORES.CAMEOS,
      force,
      context: cacheKey,
      fetchRemote: async () => {
        const freshList = await fetchRemote();
        return (freshList || []).filter((item) => !isExcludedMedia(item));
      },
      saveLocal: async (freshList) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, cachedAt: Date.now(), items: freshList });
      },
      getLocal: async (prefetchedRecord) => {
        const cached = prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.CAMEOS, cacheKey);
        return cached?.items
          ? cached.items.map((item) => new Cameo(item)).filter((c) => !isExcludedMedia(c))
          : null;
      }
    });
  }

  /**
   * Execute a structured Cameo query (`movie`, `episode`, `season`) with TTL caching in `STORES.CAMEOS`.
   * @private
   * @template T
   * @param {Object} options
   * @param {string} options.prefix
   * @param {Object} options.keyParams
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @param {Function} options.fetchRemote
   * @param {Function} [options.onSave]
   * @param {Function} options.mapCached
   * @returns {Promise<T>}
   */
  async _executeCameoEntity({ prefix, keyParams, language = undefined, force = false, fetchRemote, onSave = undefined, mapCached }) {
    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey(prefix, { ...keyParams, language: lang });

    return this.executeCatalogQuery({
      storeName: STORES.CAMEOS,
      force,
      context: cacheKey,
      fetchRemote,
      saveLocal: async (freshData) => {
        const now = Date.now();
        await this.storage.put(STORES.CAMEOS, { cacheKey, cachedAt: now, data: freshData });
        if (onSave) {
          await onSave(freshData, lang, now);
        }
      },
      getLocal: async (prefetchedRecord) => {
        const cached = prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.CAMEOS, cacheKey);
        return cached?.data ? mapCached(cached.data) : null;
      }
    });
  }

  /**
   * Helper algorithm to inspect guest stars array and classify cameos
   * @param {Array<Object>} [guestStars=[]]
   * @param {number} [minPopularity=12]
   * @returns {Array<Cameo>}
   */
  extractCameosFromGuestStars(guestStars = [], minPopularity = 12) {
    return this.backend.extractCameosFromGuestStars(guestStars, minPopularity);
  }

  /**
   * Discover TV series known for frequent cameos (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getCameoHeavySeries(params = {}) {
    return this._executeMediaCatalogPage(Series, {
      prefix: 'cameo_heavy_series',
      queryParams: { page: params.page ?? 1, sortBy: params.sortBy ?? 'popularity.desc' },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getCameoHeavySeries(params)
    });
  }

  /**
   * Discover movies known for frequent cameos (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getCameoHeavyMovies(params = {}) {
    return this._executeMediaCatalogPage(Movie, {
      prefix: 'cameo_heavy_movies',
      queryParams: { page: params.page ?? 1, sortBy: params.sortBy ?? 'popularity.desc' },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getCameoHeavyMovies(params)
    });
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {number} [params.minPopularity=8]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ movie: Movie, cameos: Array<Cameo>, allCast: Array<Cameo> }>}
   */
  async getMovieCameos(params = {}) {
    const { movieId, minPopularity = 8, language, force = false } = params;
    if (!movieId) throw new Error('movieId is required');

    return this._executeCameoEntity({
      prefix: 'movie_cameos',
      keyParams: { movieId: Number(movieId), minPopularity },
      language,
      force,
      fetchRemote: () => this.backend.getMovieCameos(params),
      onSave: async (freshData, lang, cachedAt) => {
        if (freshData.movie?.id) {
          await this.storage.put(STORES.MOVIES, {
            cacheKey: `movie:${Number(freshData.movie.id)}:${lang}`,
            id: Number(freshData.movie.id),
            language: lang,
            isComplete: true,
            cachedAt,
            data: freshData.movie
          });
        }
      },
      mapCached: (data) => ({
        movie: new Movie(data.movie),
        cameos: (data.cameos || []).map((c) => new Cameo(c)),
        allCast: (data.allCast || []).map((c) => new Cameo(c))
      })
    });
  }

  /**
   * Get famous cinema cameos dynamically hydrated with live TMDb data with pagination support
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {number} [params.limit=8]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, totalPages: number, totalResults: number, results: Array<Cameo>, hasMore: boolean }>}
   */
  async getFamousCameos(params = {}) {
    const { page = 1, limit = 8, language } = params;
    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('famous_cinema_cameos', { language: lang, page, limit });

    return this.executeCatalogQuery({
      storeName: STORES.CAMEOS,
      force: params.force,
      context: cacheKey,
      fetchRemote: async () => this.backend.getFamousCameos({ page, limit, language: lang }),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
      },
      getLocal: async (prefetchedRecord) => {
        const cached = prefetchedRecord !== undefined
          ? prefetchedRecord
          : await this.storage.get(STORES.CAMEOS, cacheKey);
        if (cached?.data?.results) {
          return {
            ...cached.data,
            results: cached.data.results.map((item) => new Cameo(item))
          };
        }
        if (cached?.items) {
          return {
            page,
            totalPages: Math.ceil(cached.items.length / limit),
            totalResults: cached.items.length,
            results: cached.items.map((item) => new Cameo(item)),
            hasMore: false
          };
        }
        return null;
      }
    });
  }

  getFamousCameosTotalCount() {
    return this.backend.getFamousCameosTotalCount ? this.backend.getFamousCameosTotalCount() : 1000;
  }

  /**
   * Get all movie cameos for a given actor (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorMovieCameos(params = {}) {
    const { personId, language, force = false } = params;
    if (!personId) throw new Error('personId is required');

    return this._executeCameoList(
      'actor_movie_cameos',
      { personId: Number(personId), language },
      () => this.backend.getActorMovieCameos(params),
      { force }
    );
  }

  /**
   * Get episode cameos with full badge classifications (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ episode: Episode, cameos: Array<Cameo>, allGuestStars: Array<Cameo> }>}
   */
  async getEpisodeCameos(params = {}) {
    const { seriesId, seasonNumber, episodeNumber, minPopularity = 12, language, force = false } = params;
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    return this._executeCameoEntity({
      prefix: 'episode_cameos',
      keyParams: {
        seriesId: Number(seriesId),
        seasonNumber: Number(seasonNumber),
        episodeNumber: Number(episodeNumber),
        minPopularity
      },
      language,
      force,
      fetchRemote: () => this.backend.getEpisodeCameos(params),
      onSave: async (freshData, lang, cachedAt) => {
        if (freshData.episode) {
          await this.storage.put(STORES.EPISODES, {
            cacheKey: `episode:${Number(seriesId)}:${Number(seasonNumber)}:${Number(episodeNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            episodeNumber: Number(episodeNumber),
            language: lang,
            isComplete: true,
            cachedAt,
            data: freshData.episode
          });
        }
      },
      mapCached: (data) => ({
        episode: new Episode(data.episode),
        cameos: (data.cameos || []).map((c) => new Cameo(c)),
        allGuestStars: (data.allGuestStars || []).map((c) => new Cameo(c))
      })
    });
  }

  /**
   * Get all cameos across episodes of a season (TTL + Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ season: Season, episodesWithCameos: Array<Episode>, seasonCameos: Array<Cameo> }>}
   */
  async getSeasonCameos(params = {}) {
    const { seriesId, seasonNumber, minPopularity = 12, language, force = false } = params;
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    return this._executeCameoEntity({
      prefix: 'season_cameos',
      keyParams: {
        seriesId: Number(seriesId),
        seasonNumber: Number(seasonNumber),
        minPopularity
      },
      language,
      force,
      fetchRemote: () => this.backend.getSeasonCameos(params),
      onSave: async (freshData, lang, cachedAt) => {
        if (freshData.season) {
          await this.storage.put(STORES.SEASONS, {
            cacheKey: `season:${Number(seriesId)}:${Number(seasonNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            language: lang,
            isComplete: true,
            cachedAt,
            data: freshData.season
          });
        }
      },
      mapCached: (data) => ({
        season: new Season(data.season),
        episodesWithCameos: (data.episodesWithCameos || []).map((ep) => new Episode(ep)),
        seasonCameos: (data.seasonCameos || []).map((c) => new Cameo(c))
      })
    });
  }

  /**
   * Detect VIP cameos at the series level (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number} [params.maxEpisodes=2]
   * @param {number} [params.minPopularity=10]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Array<Cameo>>}
   */
  async getSeriesVipCameos(params = {}) {
    const { seriesId, maxEpisodes = 2, minPopularity = 10, language, force = false } = params;
    if (!seriesId) throw new Error('seriesId is required');

    return this._executeCameoList(
      'series_vip_cameos',
      { seriesId: Number(seriesId), maxEpisodes, minPopularity, language },
      () => this.backend.getSeriesVipCameos(params),
      { force }
    );
  }

  /**
   * Get all career TV cameos for a given actor (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorCareerCameos(params = {}) {
    const { personId, language, force = false } = params;
    if (!personId) throw new Error('personId is required');

    return this._executeCameoList(
      'actor_career_cameos',
      { personId: Number(personId), language },
      () => this.backend.getActorCareerCameos(params),
      { force }
    );
  }

  /**
   * Alias for getActorCareerCameos
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorTVCameos(params = {}) {
    return this.getActorCareerCameos(params);
  }
}

export const cameoRepository = new CameoRepository();
export default CameoRepository;
