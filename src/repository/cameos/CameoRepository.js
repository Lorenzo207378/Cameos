import { BaseRepository, STORES } from '../BaseRepository.js';
import { cameoBackend as defaultCameoBackend } from '../../backend/cameos/CameoBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Cameo, Movie, Series, Season, Episode } from '../../models/index.js';

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
   * Execute a Cameo list query (`Array<Cameo>`) with automatic caching in `STORES.CAMEOS`
   * @param {string} cacheKey
   * @param {Function} fetchRemote
   * @returns {Promise<Array<Cameo>>}
   */
  async _executeCameoListQuery(cacheKey, fetchRemote) {
    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote,
      saveLocal: async (freshList) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, items: freshList });
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        return cached?.items ? cached.items.map((item) => new Cameo(item)) : null;
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
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getCameoHeavySeries(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('cameo_heavy_series', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.getCameoHeavySeries(params), Series);
  }

  /**
   * Discover movies known for frequent cameos (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getCameoHeavyMovies(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('cameo_heavy_movies', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.getCameoHeavyMovies(params), Movie);
  }

  /**
   * Get movie cameos by analyzing cast credits and billing order (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {number} [params.minPopularity=8]
   * @param {string} [params.language]
   * @returns {Promise<{ movie: Movie, cameos: Array<Cameo>, allCast: Array<Cameo> }>}
   */
  async getMovieCameos(params = {}) {
    const { movieId, minPopularity = 8, language } = params;
    if (!movieId) throw new Error('movieId is required');

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('movie_cameos', {
      movieId: Number(movieId),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getMovieCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.movie?.id) {
          await this.storage.put(STORES.MOVIES, {
            cacheKey: `movie:${Number(freshData.movie.id)}:${lang}`,
            id: Number(freshData.movie.id),
            language: lang,
            isComplete: true,
            data: freshData.movie
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          movie: new Movie(cached.data.movie),
          cameos: (cached.data.cameos || []).map((c) => new Cameo(c)),
          allCast: (cached.data.allCast || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Get all career movie cameos for a given actor (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorMovieCameos(params = {}) {
    const { personId, language } = params;
    if (!personId) throw new Error('personId is required');

    const cacheKey = this.buildCacheKey('actor_movie_cameos', {
      personId: Number(personId),
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getActorMovieCameos(params));
  }

  /**
   * Get episode cameos with full badge classifications (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ episode: Episode, cameos: Array<Cameo>, allGuestStars: Array<Cameo> }>}
   */
  async getEpisodeCameos(params = {}) {
    const { seriesId, seasonNumber, episodeNumber, minPopularity = 12, language } = params;
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('episode_cameos', {
      seriesId: Number(seriesId),
      seasonNumber: Number(seasonNumber),
      episodeNumber: Number(episodeNumber),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getEpisodeCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.episode) {
          await this.storage.put(STORES.EPISODES, {
            cacheKey: `episode:${Number(seriesId)}:${Number(seasonNumber)}:${Number(episodeNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            episodeNumber: Number(episodeNumber),
            language: lang,
            data: freshData.episode
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          episode: new Episode(cached.data.episode),
          cameos: (cached.data.cameos || []).map((c) => new Cameo(c)),
          allGuestStars: (cached.data.allGuestStars || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Get all cameos across episodes of a season (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number} [params.minPopularity=12]
   * @param {string} [params.language]
   * @returns {Promise<{ season: Season, episodesWithCameos: Array<Episode>, seasonCameos: Array<Cameo> }>}
   */
  async getSeasonCameos(params = {}) {
    const { seriesId, seasonNumber, minPopularity = 12, language } = params;
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const lang = this.normalizeLanguage(language);
    const cacheKey = this.buildCacheKey('season_cameos', {
      seriesId: Number(seriesId),
      seasonNumber: Number(seasonNumber),
      minPopularity,
      language: lang
    });

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getSeasonCameos(params),
      saveLocal: async (freshData) => {
        await this.storage.put(STORES.CAMEOS, { cacheKey, data: freshData });
        if (freshData.season) {
          await this.storage.put(STORES.SEASONS, {
            cacheKey: `season:${Number(seriesId)}:${Number(seasonNumber)}:${lang}`,
            seriesId: Number(seriesId),
            seasonNumber: Number(seasonNumber),
            language: lang,
            data: freshData.season
          });
        }
      },
      getLocal: async () => {
        const cached = await this.storage.get(STORES.CAMEOS, cacheKey);
        if (!cached?.data) return null;
        return {
          season: new Season(cached.data.season),
          episodesWithCameos: (cached.data.episodesWithCameos || []).map((ep) => new Episode(ep)),
          seasonCameos: (cached.data.seasonCameos || []).map((c) => new Cameo(c))
        };
      }
    });
  }

  /**
   * Detect VIP cameos at the series level (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number} [params.maxEpisodes=2]
   * @param {number} [params.minPopularity=10]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getSeriesVipCameos(params = {}) {
    const { seriesId, maxEpisodes = 2, minPopularity = 10, language } = params;
    if (!seriesId) throw new Error('seriesId is required');

    const cacheKey = this.buildCacheKey('series_vip_cameos', {
      seriesId: Number(seriesId),
      maxEpisodes,
      minPopularity,
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getSeriesVipCameos(params));
  }

  /**
   * Get all career TV cameos for a given actor (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.language]
   * @returns {Promise<Array<Cameo>>}
   */
  async getActorCareerCameos(params = {}) {
    const { personId, language } = params;
    if (!personId) throw new Error('personId is required');

    const cacheKey = this.buildCacheKey('actor_career_cameos', {
      personId: Number(personId),
      language: this.normalizeLanguage(language)
    });

    return this._executeCameoListQuery(cacheKey, () => this.backend.getActorCareerCameos(params));
  }
}

export const cameoRepository = new CameoRepository();
export default CameoRepository;
