import { BaseViewModel } from '../BaseViewModel.js';
import { cameoRepository as defaultCameoRepository } from '../../repository/cameos/CameoRepository.js';
import { isExcludedMedia } from '../../models/utils/index.js';

/**
 * @typedef {Object} CameoPagination
 * @property {number} page
 * @property {number} totalPages
 * @property {boolean} hasMore
 * @property {boolean} loadingMore
 */

/**
 * @typedef {Object} CameoPageParams
 * @property {number} [page]
 * @property {number} [limit]
 * @property {number} [initialPages]
 * @property {boolean} [append]
 * @property {string} [language]
 */

/** @typedef {CameoPageParams & { personId: number|string }} ActorCameoParams */

/**
 * @typedef {Object} CachedMovieCameos
 * @property {import('../../models/Movie.js').Movie|{id: number|string}|null} [movie]
 * @property {number|string} [movieId]
 * @property {number|string} [id]
 * @property {Array<import('../../models/Cameo.js').Cameo>} cameos
 */

/**
 * @typedef {Object} CameoViewModelState
 * @property {Array<import('../../models/Series.js').Series>} cameoHeavySeries
 * @property {Array<import('../../models/Movie.js').Movie>} cameoHeavyMovies
 * @property {{ movie: import('../../models/Movie.js').Movie|null, cameos: Array<import('../../models/Cameo.js').Cameo>, allCast: Array<import('../../models/Cameo.js').Cameo> }} movieCameos
 * @property {Array<CachedMovieCameos>} moviesCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} famousCameos
 * @property {CameoPagination} famousCameosPagination
 * @property {{ episode: Object|null, cameos: Array<import('../../models/Cameo.js').Cameo>, allGuestStars: Array<Object> }} episodeCameos
 * @property {{ season: Object|null, episodesWithCameos: Array<Object>, seasonCameos: Array<import('../../models/Cameo.js').Cameo> }} seasonCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} seriesVipCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorMovieCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorTVCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorCareerCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorCameos
 * @property {CameoPagination} actorMovieCameosPagination
 * @property {CameoPagination} actorTVCameosPagination
 * @property {CameoPagination} actorCameosPagination
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * CameoViewModel
 * MVVM ViewModel mediating between CameoRepository and Cameo UI components.
 * Holds observable state for cameo-heavy series/movies, episode/season/series/movie cameos, and actor career cameos.
 */
export class CameoViewModel extends BaseViewModel {
  /** @type {import('../../repository/cameos/CameoRepository.js').CameoRepository} */
  repository;

  /**
   * @param {import('../../repository/cameos/CameoRepository.js').CameoRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultCameoRepository, options = {}) {
    super(
      {
        cameoHeavySeries: [],
        cameoHeavyMovies: [],
        movieCameos: { movie: null, cameos: [], allCast: [] },
        moviesCameos: [],
        famousCameos: [],
        famousCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false },
        episodeCameos: { episode: null, cameos: [], allGuestStars: [] },
        seasonCameos: { season: null, episodesWithCameos: [], seasonCameos: [] },
        seriesVipCameos: [],
        actorMovieCameos: [],
        actorTVCameos: [],
        actorCareerCameos: [],
        actorCameos: [],
        actorMovieCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false },
        actorTVCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false },
        actorCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false }
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {CameoViewModelState}
   */
  get state() {
    return /** @type {CameoViewModelState} */ (super.state);
  }

  /**
   * Load TV series known for frequent cameos
   * @param {Object} [params={}]
   * @param {string} [params.language]
   * @returns {Promise<Object|null>}
   */
  loadCameoHeavySeries = async (params = {}) => {
    const language = params.language || this.language;
    return await this.runAsync(
      'loadCameoHeavySeries',
      () => this.repository.getCameoHeavySeries({ ...params, language }),
      (response) => ({
        cameoHeavySeries: response.results || []
      })
    );
  };

  /**
   * Load movies known for frequent cameos
   * @param {Object} [params={}]
   * @param {string} [params.language]
   * @returns {Promise<Object|null>}
   */
  loadCameoHeavyMovies = async (params = {}) => {
    const language = params.language || this.language;
    return await this.runAsync(
      'loadCameoHeavyMovies',
      () => this.repository.getCameoHeavyMovies({ ...params, language }),
      (response) => ({
        cameoHeavyMovies: response.results || []
      })
    );
  };

  /**
   * Exclude main cast members (first 20 billed actors displayed in CastCarousel) from movie cameos
   * @param {Object|null} result
   * @returns {Object|null}
   */
  _excludeMainCastFromMovieCameos(result) {
    if (!result || !Array.isArray(result.cameos)) {
      return result;
    }
    const mainCast = (result.movie?.cast || []).slice(0, 20);
    if (mainCast.length === 0) {
      return result;
    }
    const castIds = new Set(
      mainCast.map((member) => member?.id).filter((id) => id !== undefined && id !== null)
    );
    const castNames = new Set(
      mainCast
        .map((member) => (member?.name || member?.original_name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const filteredCameos = result.cameos.filter((cameo) => {
      if (cameo?.id !== undefined && cameo?.id !== null && castIds.has(cameo.id)) {
        return false;
      }
      const cameoName = (cameo?.name || '').trim().toLowerCase();
      return !castNames.has(cameoName);
    });

    return {
      ...result,
      cameos: filteredCameos
    };
  }

  /**
   * Load cameos detected in a single movie
   * @param {number|string|{ movieId?: number|string, id?: number|string, minPopularity?: number, language?: string }} movieIdOrParams
   * @param {number} [minPopularity=8]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadMovieCameos = async (movieIdOrParams, minPopularity = 8, language = this.language) => {
    const isObj = typeof movieIdOrParams === 'object' && movieIdOrParams !== null;
    const movieId = isObj ? (movieIdOrParams.movieId || movieIdOrParams.id) : movieIdOrParams;
    const minPop = isObj && movieIdOrParams.minPopularity !== undefined ? movieIdOrParams.minPopularity : minPopularity;
    const lang = isObj && movieIdOrParams.language ? movieIdOrParams.language : language;

    if (!movieId) return null;

    return await this.runAsync(
      `loadMovieCameos_${movieId}`,
      async () => {
        const res = await this.repository.getMovieCameos({ movieId, minPopularity: minPop, language: lang });
        return this._excludeMainCastFromMovieCameos(res);
      },
      (result) => ({
        movieCameos: result
      })
    );
  };

  /**
   * Load cameos for a list of movies concurrently
   * @param {Array<import('../../models/Movie.js').Movie|Object|number|string>} movies
   * @param {number} [minPopularity=8]
   * @param {string} [language]
   * @returns {Promise<Array<{ movie: import('../../models/Movie.js').Movie|Object, cameos: Array<import('../../models/Cameo.js').Cameo> }>>}
   */
  loadMoviesCameos = async (movies = [], minPopularity = 8, language = this.language) => {
    return await this.runAsync(
      'loadMoviesCameos',
      async () => {
        return await Promise.all(
          movies.map(async (movie) => {
            const movieId = typeof movie === 'object' ? movie?.id : movie;
            const movieObj = typeof movie === 'object' ? movie : { id: movieId };
            if (!movieId) return { movie: movieObj, cameos: [] };
            try {
              const res = await this.loadMovieCameos(movieId, minPopularity, language);
              return {
                movie: res?.movie || movieObj,
                cameos: res?.cameos || []
              };
            } catch (err) {
              console.warn(`[CameoViewModel] Failed to load cameos for movie ${movieId}:`, err);
              return { movie: movieObj, cameos: [] };
            }
          })
        );
      },
      (moviesCameos) => ({
        moviesCameos: moviesCameos || []
      })
    );
  };

  /**
   * Load famous movie cameos hydrated with live TMDb data with pagination support
   * @param {CameoPageParams|number} [paramsOrLimit=8]
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
   */
  loadFamousCameos = async (paramsOrLimit = 8, language = this.language) => {
    const params = typeof paramsOrLimit === 'object' && paramsOrLimit !== null ? paramsOrLimit : null;
    const limit = params ? (params.limit || 8) : (Number(paramsOrLimit) || 8);
    const lang = params?.language || language;
    const isAppend = Boolean(params?.append);
    const page = params?.page;
    const initialPages = params ? (params.initialPages || 1) : Math.max(1, Math.ceil(limit / 8));

    return this.loadPagination({
      categoryKey: 'famousCameos',
      stateProp: 'famousCameos',
      paginationProp: 'famousCameosPagination',
      asyncKey: 'loadFamousCameos',
      fetchPage: (p) => this.repository.getFamousCameos({ page: p, limit: 8, language: lang }),
      params: {
        page,
        limit: 8,
        initialPages,
        append: isAppend,
        language: lang
      }
    });
  };

  /**
   * Load next page of famous movie cameos and append to observable state
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
   */
  loadMoreFamousCameos = async () => {
    return this.loadFamousCameos({ append: true });
  };

  /**
   * Synchronous helper to get cached cameos for a media ID
   * @param {number|string} mediaId
   * @returns {Array<import('../../models/Cameo.js').Cameo>}
   */
  getCameosForMedia = (mediaId) => {
    const id = Number(mediaId);
    if (!id) return [];
    const fromList = this.state.moviesCameos?.find((item) => Number(item?.movie?.id || item?.movieId || item?.id) === id);
    if (fromList?.cameos?.length) return fromList.cameos;
    if (Number(this.state.movieCameos?.movie?.id) === id && this.state.movieCameos?.cameos?.length) {
      return this.state.movieCameos.cameos;
    }
    return [];
  };

  /**
   * Load cameos detected in a TV episode
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {number} [minPopularity=12]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadEpisodeCameos = async (seriesId, seasonNumber, episodeNumber, minPopularity = 12, language = this.language) => {
    return await this.runAsync(
      'loadEpisodeCameos',
      () => this.repository.getEpisodeCameos({ seriesId, seasonNumber, episodeNumber, minPopularity, language }),
      (result) => ({
        episodeCameos: result
      })
    );
  };

  /**
   * Load cameos across all episodes of a season
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number} [minPopularity=12]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadSeasonCameos = async (seriesId, seasonNumber, minPopularity = 12, language = this.language) => {
    return await this.runAsync(
      'loadSeasonCameos',
      () => this.repository.getSeasonCameos({ seriesId, seasonNumber, minPopularity, language }),
      (result) => ({
        seasonCameos: result
      })
    );
  };

  /**
   * Load VIP cameos across an entire TV series
   * @param {number|string} seriesId
   * @param {number} [maxEpisodes=2]
   * @param {number} [minPopularity=10]
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadSeriesVipCameos = async (seriesId, maxEpisodes = 2, minPopularity = 10, language = this.language) => {
    return await this.runAsync(
      'loadSeriesVipCameos',
      () => this.repository.getSeriesVipCameos({ seriesId, maxEpisodes, minPopularity, language }),
      (list) => ({
        seriesVipCameos: list || []
      })
    );
  };

  /**
   * Slice a local list of cameos into standard pagination structure
   * @private
   * @param {Array<import('../../models/Cameo.js').Cameo>} [items=[]]
   * @param {number} [page=1]
   * @param {number} [limit=8]
   * @returns {{ results: Array<import('../../models/Cameo.js').Cameo>, totalPages: number, hasMore: boolean }}
   */
  _paginateList(items = [], page = 1, limit = 8) {
    if (!items) items = [];
    const start = (page - 1) * limit;
    const results = items.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(items.length / limit));
    return { results, totalPages, hasMore: page < totalPages };
  }

  /**
   * Normalize personId or params object for actor cameo operations
   * @private
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} fallbackLanguage
   * @returns {{ personId: number|string, language: string, hasPagination: boolean, limit: number, params: ActorCameoParams }}
   */
  _parseActorCameoParams(personIdOrParams, fallbackLanguage) {
    /** @type {ActorCameoParams} */
    const params = typeof personIdOrParams === 'object' && personIdOrParams !== null
      ? personIdOrParams
      : { personId: personIdOrParams };
    return {
      personId: params.personId,
      language: params.language || fallbackLanguage,
      hasPagination: Boolean(params.page !== undefined || params.append || params.limit),
      limit: params.limit || 8,
      params
    };
  }

  /**
   * Load career movie cameos for a specific actor with optional pagination
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
   */
  loadActorMovieCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang, hasPagination, limit, params } = this._parseActorCameoParams(personIdOrParams, language);

    if (hasPagination) {
      return this.loadPagination({
        categoryKey: `actorMovieCameos_${personId}`,
        stateProp: 'actorMovieCameos',
        paginationProp: 'actorMovieCameosPagination',
        asyncKey: `loadActorMovieCameos_${personId}`,
        fetchPage: async (page) => {
          const all = await this.repository.getActorMovieCameos({ personId, language: lang });
          return this._paginateList(all, page, limit);
        },
        params
      });
    }

    return await this.runAsync(
      `loadActorMovieCameos_${personId}`,
      () => this.repository.getActorMovieCameos({ personId, language: lang }),
      (list) => ({
        actorMovieCameos: list || []
      })
    );
  };

  /**
   * Load career TV cameos for a specific actor with optional pagination
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
   */
  loadActorTVCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang, hasPagination, limit, params } = this._parseActorCameoParams(personIdOrParams, language);

    if (hasPagination) {
      return this.loadPagination({
        categoryKey: `actorTVCameos_${personId}`,
        stateProp: 'actorTVCameos',
        paginationProp: 'actorTVCameosPagination',
        asyncKey: `loadActorTVCameos_${personId}`,
        fetchPage: async (page) => {
          const all = await this.repository.getActorTVCameos({ personId, language: lang });
          return this._paginateList(all, page, limit);
        },
        params
      });
    }

    return await this.runAsync(
      `loadActorTVCameos_${personId}`,
      () => this.repository.getActorTVCameos({ personId, language: lang }),
      (list) => ({
        actorTVCameos: list || [],
        actorCareerCameos: list || []
      })
    );
  };

  /**
   * Load all career cameos (both Movie and TV) for a specific actor with optional pagination.
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
   */
  loadActorCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang, hasPagination, limit, params } = this._parseActorCameoParams(personIdOrParams, language);

    const fetchCombined = async () => {
      const [movieCameos, tvCameos] = await Promise.all([
        this.loadActorMovieCameos(personId, lang),
        this.loadActorTVCameos(personId, lang)
      ]);

      const seen = new Set();
      const combined = [];
      for (const cameo of [...(movieCameos || []), ...(tvCameos || [])]) {
        if (!cameo || isExcludedMedia(cameo)) continue;
        const key = `${cameo?.mediaType || 'movie'}-${cameo?.mediaId || cameo?.id}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(cameo);
        }
      }

      return combined.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    };

    if (hasPagination) {
      return this.loadPagination({
        categoryKey: `actorCameos_${personId}`,
        stateProp: 'actorCameos',
        paginationProp: 'actorCameosPagination',
        asyncKey: `loadActorCameos_${personId}`,
        fetchPage: async (page) => {
          const all = await fetchCombined();
          return this._paginateList(all, page, limit);
        },
        params
      });
    }

    return await this.runAsync(
      `loadActorCameos_${personId}`,
      fetchCombined,
      (list) => ({
        actorCameos: list || []
      })
    );
  };
}

export default CameoViewModel;
