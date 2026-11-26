import { MediaCatalogViewModel } from '../MediaCatalogViewModel.js';
import { cameoRepository as defaultCameoRepository } from '../../repository/cameos/CameoRepository.js';
import { isExcludedMedia } from '../../models/utils/mediaLabels.js';
import { excludeCameosFromCast } from '../../utils/formatters.js';

/**
 * @typedef {Object} CameoPagination
 * @property {number} page
 * @property {number} totalPages
 * @property {boolean} hasMore
 * @property {boolean} loadingMore
 * @property {boolean} loading
 * @property {string|null} error
 */

/**
 * @typedef {Object} CameoPageParams
 * @property {number} [page]
 * @property {number} [limit]
 * @property {number} [initialPages]
 * @property {boolean} [append]
 * @property {boolean} [force]
 * @property {boolean} [onlyIfEmpty]
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
 * @property {Array<import('../../models/Cameo.js').Cameo>} seriesCameos
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
export class CameoViewModel extends MediaCatalogViewModel {
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
        famousCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false, loading: false, error: null },
        episodeCameos: { episode: null, cameos: [], allGuestStars: [] },
        seasonCameos: { season: null, episodesWithCameos: [], seasonCameos: [] },
        seriesCameos: [],
        actorMovieCameos: [],
        actorTVCameos: [],
        actorCareerCameos: [],
        actorCameos: [],
        actorMovieCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false, loading: false, error: null },
        actorTVCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false, loading: false, error: null },
        actorCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false, loading: false, error: null }
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
   * Derive cameos synchronously from an already-loaded Movie model without extra network requests.
   * @param {import('../../models/Movie.js').Movie|Object|null} movie
   * @param {Object} [options={}]
   * @param {number} [options.minPopularity]
   * @param {string} [options.language]
   * @param {boolean} [options.excludeMainCast=true]
   * @returns {Array<import('../../models/Cameo.js').Cameo>}
   */
  extractMovieCameos = (movie, { minPopularity = undefined, language = this.language, excludeMainCast = true } = {}) => {
    if (!movie) return [];
    return this.repository.extractCameosFromMovie(movie, {
      ...(minPopularity !== undefined ? { minPopularity } : {}),
      language,
      excludeMainCast
    });
  };

  /**
   * Derive cameos synchronously from an already-loaded Series model without extra network requests.
   * @param {import('../../models/Series.js').Series|Object|null} series
   * @param {Object} [options={}]
   * @param {number} [options.maxEpisodes]
   * @param {number} [options.minPopularity]
   * @param {string} [options.language]
   * @returns {Array<import('../../models/Cameo.js').Cameo>}
   */
  extractSeriesCameos = (series, { maxEpisodes = undefined, minPopularity = undefined, language = this.language } = {}) => {
    if (!series) return [];
    return this.repository.extractCameosFromSeries(series, {
      ...(maxEpisodes !== undefined ? { maxEpisodes } : {}),
      ...(minPopularity !== undefined ? { minPopularity } : {}),
      language
    });
  };

  /**
   * Derive disjoint cast and cameo lists synchronously from an already-loaded Movie model.
   * @param {import('../../models/Movie.js').Movie|Object|null} movie
   * @param {Object} [options={}]
   * @param {number} [options.minPopularity]
   * @param {string} [options.language]
   * @param {boolean} [options.excludeMainCast=true]
   * @returns {{ cast: Array<Object>, cameos: Array<import('../../models/Cameo.js').Cameo> }}
   */
  getMovieCastAndCameos = (movie, options = {}) => {
    if (!movie) return { cast: [], cameos: [] };
    const cameos = this.extractMovieCameos(movie, options);
    return { cast: excludeCameosFromCast(movie.cast, cameos), cameos };
  };

  /**
   * Derive disjoint cast and cameo lists synchronously from an already-loaded Series model.
   * @param {import('../../models/Series.js').Series|Object|null} series
   * @param {Object} [options={}]
   * @param {number} [options.maxEpisodes]
   * @param {number} [options.minPopularity]
   * @param {string} [options.language]
   * @returns {{ cast: Array<Object>, cameos: Array<import('../../models/Cameo.js').Cameo> }}
   */
  getSeriesCastAndCameos = (series, options = {}) => {
    if (!series) return { cast: [], cameos: [] };
    const cameos = series.cameos?.length ? series.cameos : this.extractSeriesCameos(series, options);
    return { cast: excludeCameosFromCast(series.cast, cameos), cameos };
  };

  /**
   * Exclude main cast members (first 8 billed actors displayed in CastCarousel) from movie cameos
   * @param {Object|null} result
   * @returns {Object|null}
   */
  _excludeMainCastFromMovieCameos(result) {
    if (!result || !Array.isArray(result.cameos)) return result;
    const mainCast = (result.movie?.cast || []).slice(0, 8);
    return {
      ...result,
      cameos: excludeCameosFromCast(result.cameos, mainCast)
    };
  }

  /**
   * Load cameos detected in a single movie
   * @param {number|string|{ movieId?: number|string, id?: number|string, minPopularity?: number, language?: string, force?: boolean }} movieIdOrParams
   * @param {number} [minPopularity]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadMovieCameos = async (movieIdOrParams, minPopularity = undefined, language = this.language) => {
    let movieId;
    let minPop = minPopularity;
    let lang = language;
    let force = false;
    if (typeof movieIdOrParams === 'object' && movieIdOrParams !== null) {
      movieId = movieIdOrParams.movieId || movieIdOrParams.id;
      if (movieIdOrParams.minPopularity !== undefined) minPop = movieIdOrParams.minPopularity;
      if (movieIdOrParams.language) lang = movieIdOrParams.language;
      force = Boolean(movieIdOrParams.force);
    } else {
      movieId = movieIdOrParams;
    }

    if (!movieId) return null;

    return await this.runAsync(
      'loadMovieCameos',
      async () => {
        const res = await this.repository.getMovieCameos({
          movieId,
          ...(minPop !== undefined ? { minPopularity: minPop } : {}),
          language: lang,
          ...(force ? { force: true } : {})
        });
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
   * @param {number} [minPopularity]
   * @param {string} [language]
   * @returns {Promise<Array<{ movie: import('../../models/Movie.js').Movie|Object, cameos: Array<import('../../models/Cameo.js').Cameo> }>|null>}
   */
  loadMoviesCameos = async (movies = [], minPopularity = undefined, language = this.language) => {
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
    const force = Boolean(params?.force);
    const onlyIfEmpty = Boolean(params?.onlyIfEmpty);

    // Historical archive section: keep session-loaded cameos intact across in-app navigation.
    if (onlyIfEmpty && !isAppend && (this.state.famousCameos.length > 0 || this._pendingOperations.has('loadFamousCameos'))) {
      return this.state.famousCameos;
    }

    const page = params?.page;
    const initialPages = params?.initialPages || Math.max(1, Math.ceil(limit / 8));

    return this.loadPagination({
      categoryKey: 'famousCameos',
      stateProp: 'famousCameos',
      paginationProp: 'famousCameosPagination',
      asyncKey: 'loadFamousCameos',
      fetchPage: (p) => this.repository.getFamousCameos({
        page: p,
        limit: 8,
        language: lang,
        ...(force ? { force: true } : {})
      }),
      params: {
        page,
        limit: 8,
        initialPages,
        retainPages: true,
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
   * @param {number} [minPopularity]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadEpisodeCameos = async (seriesId, seasonNumber, episodeNumber, minPopularity = undefined, language = this.language) => {
    return await this.runAsync(
      'loadEpisodeCameos',
      () => this.repository.getEpisodeCameos({
        seriesId,
        seasonNumber,
        episodeNumber,
        ...(minPopularity !== undefined ? { minPopularity } : {}),
        language
      }),
      (result) => ({
        episodeCameos: result
      })
    );
  };

  /**
   * Load cameos across all episodes of a season
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number} [minPopularity]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  loadSeasonCameos = async (seriesId, seasonNumber, minPopularity = undefined, language = this.language) => {
    return await this.runAsync(
      'loadSeasonCameos',
      () => this.repository.getSeasonCameos({
        seriesId,
        seasonNumber,
        ...(minPopularity !== undefined ? { minPopularity } : {}),
        language
      }),
      (result) => ({
        seasonCameos: result
      })
    );
  };

  /**
   * Load cameos across an entire TV series
   * @param {number|string} seriesId
   * @param {number} [maxEpisodes]
   * @param {number} [minPopularity]
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadSeriesCameos = async (seriesId, maxEpisodes = undefined, minPopularity = undefined, language = this.language) => {
    this.setState({ seriesCameos: [] });
    return await this.runAsync(
      'loadSeriesCameos',
      () => this.repository.getSeriesCameos({
        seriesId,
        ...(maxEpisodes !== undefined ? { maxEpisodes } : {}),
        ...(minPopularity !== undefined ? { minPopularity } : {}),
        language
      }),
      (list) => ({
        seriesCameos: list || []
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
    const list = Array.isArray(items) ? items : [];
    const start = (page - 1) * limit;
    const results = list.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(list.length / limit));
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
    let params;
    if (typeof personIdOrParams === 'object' && personIdOrParams !== null) {
      params = personIdOrParams;
    } else {
      params = { personId: personIdOrParams };
    }
    return {
      personId: params.personId,
      language: params.language || fallbackLanguage,
      hasPagination: Boolean(params.page !== undefined || params.append || params.limit),
      limit: params.limit || 8,
      params
    };
  }

  /**
   * Shared loader for paginated or unpaginated actor cameo lists.
   * @private
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} fallbackLanguage
   * @param {Object} config
   * @param {string} config.stateProp
   * @param {string} config.paginationProp
   * @param {string} config.asyncKey
   * @param {() => Promise<Array<import('../../models/Cameo.js').Cameo>>} config.fetchAll
   * @param {(list: Array<import('../../models/Cameo.js').Cameo>) => Record<string, any>} [config.buildExtraState]
   */
  async _loadActorCameoList(personIdOrParams, fallbackLanguage, { stateProp, paginationProp, asyncKey, fetchAll, buildExtraState = undefined }) {
    const { personId, hasPagination, limit, params } = this._parseActorCameoParams(personIdOrParams, fallbackLanguage);

    if (hasPagination) {
      return this.loadPagination({
        categoryKey: `${stateProp}_${personId}`,
        stateProp,
        paginationProp,
        asyncKey,
        fetchPage: async (page) => {
          const all = await fetchAll();
          return this._paginateList(all, page, limit);
        },
        params
      });
    }

    return await this.runAsync(
      asyncKey,
      fetchAll,
      (list) => ({
        [stateProp]: list || [],
        ...(buildExtraState ? buildExtraState(list || []) : {})
      })
    );
  }

  /**
   * Load career movie cameos for a specific actor with optional pagination
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadActorMovieCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang } = this._parseActorCameoParams(personIdOrParams, language);
    return this._loadActorCameoList(personIdOrParams, language, {
      stateProp: 'actorMovieCameos',
      paginationProp: 'actorMovieCameosPagination',
      asyncKey: 'loadActorMovieCameos',
      fetchAll: () => this.repository.getActorMovieCameos({ personId, language: lang })
    });
  };

  /**
   * Load career TV cameos for a specific actor with optional pagination
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadActorTVCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang } = this._parseActorCameoParams(personIdOrParams, language);
    return this._loadActorCameoList(personIdOrParams, language, {
      stateProp: 'actorTVCameos',
      paginationProp: 'actorTVCameosPagination',
      asyncKey: 'loadActorTVCameos',
      fetchAll: () => this.repository.getActorTVCameos({ personId, language: lang }),
      buildExtraState: (list) => ({ actorCareerCameos: list })
    });
  };

  /**
   * Load all career cameos (both Movie and TV) for a specific actor with optional pagination.
   * @param {number|string|ActorCameoParams} personIdOrParams
   * @param {string} [language]
   * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
   */
  loadActorCameos = async (personIdOrParams, language = this.language) => {
    const { personId, language: lang } = this._parseActorCameoParams(personIdOrParams, language);

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

    return this._loadActorCameoList(personIdOrParams, language, {
      stateProp: 'actorCameos',
      paginationProp: 'actorCameosPagination',
      asyncKey: 'loadActorCameos',
      fetchAll: fetchCombined
    });
  };
}

export default CameoViewModel;
