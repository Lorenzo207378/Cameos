import { isValidNumericParam } from '../BaseViewModel.js';
import { MediaCatalogViewModel } from '../MediaCatalogViewModel.js';
import { seriesRepository as defaultSeriesRepository } from '../../repository/series/SeriesRepository.js';
import { SERIES_CATEGORY_CONFIG } from '../../utils/media/mediaCategoryConfig.js';

const allSeriesCategoryKeys = Object.keys(SERIES_CATEGORY_CONFIG);
const seriesCategoryKeys = allSeriesCategoryKeys.filter((key) => key !== 'upcoming');

/**
 * Validate seriesId (> 0) and seasonNumber (>= 0 for specials).
 * @param {number|string|null|undefined} seriesId
 * @param {number|string|null|undefined} seasonNumber
 * @returns {boolean}
 */
function isValidSeasonRoute(seriesId, seasonNumber) {
  return isValidNumericParam(seriesId)
    && isValidNumericParam(seasonNumber, { allowZero: true });
}

/**
 * Validate seriesId, seasonNumber (allows 0 for specials), and episodeNumber (allows 0).
 * @param {number|string|null|undefined} seriesId
 * @param {number|string|null|undefined} seasonNumber
 * @param {number|string|null|undefined} episodeNumber
 * @returns {boolean}
 */
function isValidEpisodeRoute(seriesId, seasonNumber, episodeNumber) {
  return isValidSeasonRoute(seriesId, seasonNumber)
    && isValidNumericParam(episodeNumber, { allowZero: true });
}

/**
 * @typedef {Object} SeriesViewModelState
 * @property {Array<import('../../models/Series.js').Series>} seriesList
 * @property {Array<import('../../models/Series.js').Series>} trendingSeries
 * @property {Array<import('../../models/Series.js').Series>} upcomingSeries
 * @property {Array<import('../../models/Series.js').Series>} actionAdventureSeries
 * @property {Array<import('../../models/Series.js').Series>} sciFiFantasySeries
 * @property {Array<import('../../models/Series.js').Series>} comedySeries
 * @property {Array<import('../../models/Series.js').Series>} dramaSeries
 * @property {Array<import('../../models/Series.js').Series>} crimeSeries
 * @property {Array<import('../../models/Series.js').Series>} mysterySeries
 * @property {Array<import('../../models/Series.js').Series>} animationSeries
 * @property {Array<import('../../models/Series.js').Series>} familySeries
 * @property {Array<import('../../models/Series.js').Series>} kidsSeries
 * @property {Array<import('../../models/Series.js').Series>} warPoliticsSeries
 * @property {Array<import('../../models/Series.js').Series>} westernSeries
 * @property {Array<import('../../models/Series.js').Series>} soapSeries
 * @property {Record<string, Array<import('../../models/Series.js').Series>>} categorySeries
 * @property {Record<string, { page: number, totalPages: number, hasMore: boolean, loadingMore: boolean, loading?: boolean, error?: string|null }>} categoryPagination
 * @property {boolean} feedLoaded
 * @property {Array<import('../../models/Series.js').Series>} searchResults
 * @property {import('../../models/Series.js').Series|null} selectedSeries
 * @property {import('../../models/Season.js').Season|null} selectedSeason
 * @property {import('../../models/Episode.js').Episode|null} selectedEpisode
 * @property {number|string|null} requestedSeriesId
 * @property {string|null} seriesError
 * @property {{seriesId: number|string, seasonNumber: number|string, error?: string|null}|null} requestedSeason
 * @property {{seriesId: number|string, seasonNumber: number|string, episodeNumber: number|string, error?: string|null}|null} requestedEpisode
 * @property {number} page
 * @property {number} totalPages
 * @property {number} totalResults
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * SeriesViewModel
 * MVVM ViewModel mediating between SeriesRepository and TV Series UI components.
 * Holds observable state for series discovery, trending, search, series details, seasons, and episodes.
 */
export class SeriesViewModel extends MediaCatalogViewModel {
  /** @type {import('../../repository/series/SeriesRepository.js').SeriesRepository} */
  repository;

  /**
   * @param {import('../../repository/series/SeriesRepository.js').SeriesRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultSeriesRepository, options = {}) {
    super(
      {
        ...MediaCatalogViewModel.buildCategoryInitialState(allSeriesCategoryKeys, 'Series', 'categorySeries'),
        seriesList: [],
        trendingSeries: [],
        searchResults: [],
        selectedSeries: null,
        selectedSeason: null,
        selectedEpisode: null,
        requestedSeriesId: null,
        seriesError: null,
        requestedSeason: null,
        requestedEpisode: null,
        page: 1,
        totalPages: 0,
        totalResults: 0
      },
      options
    );
    this.repository = repository;
    /** @type {Object|null} */
    this._latestSeriesRequest = null;
  }

  /**
   * Convenience getter for typed state
   * @override
   * @returns {SeriesViewModelState}
   */
  get state() {
    return /** @type {SeriesViewModelState} */ (super.state);
  }

  /**
   * Discover and filter TV series
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  discoverSeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'discoverSeries',
      () => this.repository.discoverSeries({ ...params, language }),
      (res) => this.mapPaginatedResult('seriesList', res)
    );
  };

  /**
   * Load trending TV series (with strictly released filter by default)
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadTrendingSeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadTrendingSeries',
      () => this.repository.getTrendingSeries({ timeWindow: 'month', onlyReleased: true, ...params, language }),
      (res) => this.mapPaginatedResult('trendingSeries', res)
    );
  };

  /**
   * Load upcoming TV series whose first air date is strictly in the future.
   * Handles both initial load (single or multi-page) and incremental pagination via { append: true }.
   * @param {Object} [params={}]
   * @param {number} [params.page]
   * @param {number} [params.initialPages=1]
   * @param {boolean} [params.append=false]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @param {boolean} [params.retainPages=false]
   * @returns {Promise<Array<import('../../models/Series.js').Series>>}
   */
  loadUpcomingSeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.loadPagination({
      categoryKey: 'upcoming',
      stateProp: 'upcomingSeries',
      paginationMapProp: 'categoryPagination',
      groupedListProp: 'categorySeries',
      asyncKey: 'loadUpcomingSeries',
      fetchPage: (page) => this.repository.getUpcomingSeries({ ...params, page, language }),
      params
    });
  };

  /**
   * Load TV series page feed in parallel: trending, upcoming and all major categories.
   * @param {Object} [options={}]
   * @param {number} [options.initialPages=2]
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @param {Array<string>} [options.categories]
   * @returns {Promise<Object|null>}
   */
  loadSeriesFeed = async ({
    initialPages = 2,
    language = this.language,
    force = false,
    categories = seriesCategoryKeys
  } = {}) => {
    return this._loadMediaFeed('loadSeriesFeed', [
      this.loadTrendingSeries({ timeWindow: 'month', onlyReleased: true, language, force }),
      this.loadUpcomingSeries({ initialPages, language, force, retainPages: !force }),
      this.loadSeriesFromCategoryList(categories, { initialPages, language, force, retainPages: !force })
    ]);
  };

  /**
   * Load TV series for a specific category key (e.g. crime, drama, comedy, upcoming, etc.)
   * Handles both initial load and incremental pagination via { append: true }.
   * @param {string} categoryKey
   * @param {Object} [options={}]
   * @param {number} [options.page]
   * @param {number} [options.initialPages=1]
   * @param {boolean} [options.append=false]
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @param {boolean} [options.retainPages=false]
   * @returns {Promise<Array<import('../../models/Series.js').Series>>}
   */
  loadSeriesFromCategory = async (categoryKey, options = {}) => {
    if (typeof categoryKey !== 'string' || !Object.hasOwn(SERIES_CATEGORY_CONFIG, categoryKey)) {
      return [];
    }

    if (categoryKey === 'upcoming') {
      return this.loadUpcomingSeries(options);
    }

    const language = options.language || this.language;
    return this.loadPagination({
      categoryKey,
      stateProp: `${categoryKey}Series`,
      paginationMapProp: 'categoryPagination',
      groupedListProp: 'categorySeries',
      asyncKey: `loadCategory_${categoryKey}`,
      fetchPage: (page) => this.repository.getSeriesByCategory(categoryKey, { ...options, page, language }),
      params: options
    });
  };

  /**
   * Load series for a list of categories in parallel
   * @param {Array<string>} [categories]
   * @param {Object} [options={}]
   * @returns {Promise<Record<string, Array<import('../../models/Series.js').Series>>>}
   */
  loadSeriesFromCategoryList = async (
    categories = seriesCategoryKeys,
    options = {}
  ) => {
    return this._loadCategoryList(
      categories,
      (catKey) => this.loadSeriesFromCategory(catKey, options),
      'SeriesViewModel'
    );
  };

  /**
   * Search TV series by title, genre, actor or director. Existing positional title calls remain valid.
   * @param {string|import('../../utils/media/search.js').MediaSearchParams} query
   * @param {number} [page=1]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  searchSeries = async (query, page = 1, language = this.language) => {
    const params = this._mediaSearchInput(query, page, language);
    return this.runSearch(() => this.repository.searchSeries(params));
  };

  /** Search series using a genre ID, localized name, or MediaSearchParams. */
  searchSeriesByGenre = async (genre, page = 1, language = this.language) => {
    return this.searchSeries(this._mediaSearchInput(genre, page, language, 'genre'));
  };

  /** Search series using a person name, ID, or MediaSearchParams. */
  searchSeriesByActor = async (actor, page = 1, language = this.language) => {
    return this.searchSeries(this._mediaSearchInput(actor, page, language, 'actor'));
  };

  /** Search only Director credits, using a person name, ID, or MediaSearchParams. */
  searchSeriesByDirector = async (director, page = 1, language = this.language) => {
    return this.searchSeries(this._mediaSearchInput(director, page, language, 'director'));
  };

  /**
   * Load full TV series details by ID
   * @param {number|string|null|undefined|{ seriesId?: number|string, id?: number|string, appendAggregateCredits?: boolean, language?: string, force?: boolean }} seriesIdOrParams
   * @param {boolean} [appendAggregateCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Series.js').Series|null>}
   */
  loadSeriesDetails = async (seriesIdOrParams, appendAggregateCredits = true, language = this.language) => {
    const isOptionsObject = typeof seriesIdOrParams === 'object' && seriesIdOrParams !== null;
    const seriesId = isOptionsObject
      ? (seriesIdOrParams.seriesId ?? seriesIdOrParams.id)
      : seriesIdOrParams;

    if (seriesId === null || seriesId === undefined || !isValidNumericParam(seriesId)) return null;

    const params = isOptionsObject
      ? {
          seriesId,
          appendAggregateCredits: seriesIdOrParams.appendAggregateCredits ?? true,
          language: seriesIdOrParams.language || this.language,
          ...(seriesIdOrParams.force ? { force: true } : {})
        }
      : { seriesId, appendAggregateCredits, language };

    const requestToken = {};
    this._latestSeriesRequest = requestToken;
    /** @type {string|null} */
    let requestError = null;
    const series = await this.runAsync(
      'loadSeriesDetails',
      async () => {
        this.setState({ requestedSeriesId: seriesId, seriesError: null });
        try {
          return await this.repository.getSeriesDetails(params);
        } catch (err) {
          requestError = err instanceof Error ? err.message : String(err);
          throw err;
        }
      },
      (selectedSeries) => ({ selectedSeries, seriesError: null })
    );

    if (series === null && this._latestSeriesRequest === requestToken && requestError !== null) {
      this.setState({ seriesError: requestError });
    }
    return series;
  };

  /**
   * Load season details including all episodes
   * @param {number|string|null|undefined|{ seriesId?: number|string, id?: number|string, seasonNumber?: number|string, appendAggregateCredits?: boolean, language?: string, force?: boolean }} seriesIdOrParams
   * @param {number|string} [seasonNumber]
   * @param {boolean} [appendAggregateCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Season.js').Season|null>}
   */
  loadSeasonDetails = async (seriesIdOrParams, seasonNumber = undefined, appendAggregateCredits = true, language = this.language) => {
    const isOptionsObject = typeof seriesIdOrParams === 'object' && seriesIdOrParams !== null;
    const seriesId = isOptionsObject
      ? (seriesIdOrParams.seriesId ?? seriesIdOrParams.id)
      : seriesIdOrParams;
    const resolvedSeasonNumber = isOptionsObject
      ? seriesIdOrParams.seasonNumber
      : seasonNumber;

    if (
      seriesId === null
      || seriesId === undefined
      || resolvedSeasonNumber === null
      || resolvedSeasonNumber === undefined
      || !isValidSeasonRoute(seriesId, resolvedSeasonNumber)
    ) {
      return null;
    }

    const params = isOptionsObject
      ? {
          seriesId,
          seasonNumber: resolvedSeasonNumber,
          appendAggregateCredits: seriesIdOrParams.appendAggregateCredits ?? true,
          language: seriesIdOrParams.language || this.language,
          ...(seriesIdOrParams.force ? { force: true } : {})
        }
      : { seriesId, seasonNumber: resolvedSeasonNumber, appendAggregateCredits, language };

    const request = { seriesId, seasonNumber: resolvedSeasonNumber, error: /** @type {string|null} */ (null) };
    /** @type {string|null} */
    let requestError = null;
    const season = await this.runAsync(
      'loadSeasonDetails',
      async () => {
        this.setState({ requestedSeason: request });
        try {
          return await this.repository.getSeasonDetails(params);
        } catch (err) {
          requestError = err instanceof Error ? err.message : String(err);
          throw err;
        }
      },
      (selectedSeason) => ({ selectedSeason })
    );
    if (season === null && this.state.requestedSeason === request && requestError !== null) {
      this.setState({ requestedSeason: { ...request, error: requestError } });
    }
    return season;
  };

  /**
   * Load individual episode details
   * @param {number|string|null|undefined|{ seriesId?: number|string, id?: number|string, seasonNumber?: number|string, episodeNumber?: number|string, appendCredits?: boolean, language?: string, force?: boolean }} seriesIdOrParams
   * @param {number|string} [seasonNumber]
   * @param {number|string} [episodeNumber]
   * @param {boolean} [appendCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Episode.js').Episode|null>}
   */
  loadEpisodeDetails = async (
    seriesIdOrParams,
    seasonNumber = undefined,
    episodeNumber = undefined,
    appendCredits = true,
    language = this.language
  ) => {
    const isOptionsObject = typeof seriesIdOrParams === 'object' && seriesIdOrParams !== null;
    const seriesId = isOptionsObject
      ? (seriesIdOrParams.seriesId ?? seriesIdOrParams.id)
      : seriesIdOrParams;
    const resolvedSeasonNumber = isOptionsObject
      ? seriesIdOrParams.seasonNumber
      : seasonNumber;
    const resolvedEpisodeNumber = isOptionsObject
      ? seriesIdOrParams.episodeNumber
      : episodeNumber;

    if (
      seriesId === null
      || seriesId === undefined
      || resolvedSeasonNumber === null
      || resolvedSeasonNumber === undefined
      || resolvedEpisodeNumber === null
      || resolvedEpisodeNumber === undefined
      || !isValidEpisodeRoute(seriesId, resolvedSeasonNumber, resolvedEpisodeNumber)
    ) {
      return null;
    }

    const params = isOptionsObject
      ? {
          seriesId,
          seasonNumber: resolvedSeasonNumber,
          episodeNumber: resolvedEpisodeNumber,
          appendCredits: seriesIdOrParams.appendCredits ?? true,
          language: seriesIdOrParams.language || this.language,
          ...(seriesIdOrParams.force ? { force: true } : {})
        }
      : {
          seriesId,
          seasonNumber: resolvedSeasonNumber,
          episodeNumber: resolvedEpisodeNumber,
          appendCredits,
          language
        };

    const request = {
      seriesId,
      seasonNumber: resolvedSeasonNumber,
      episodeNumber: resolvedEpisodeNumber,
      error: /** @type {string|null} */ (null)
    };
    /** @type {string|null} */
    let requestError = null;
    const episode = await this.runAsync(
      'loadEpisodeDetails',
      async () => {
        this.setState({ requestedEpisode: request });
        try {
          return await this.repository.getEpisodeDetails(params);
        } catch (err) {
          requestError = err instanceof Error ? err.message : String(err);
          throw err;
        }
      },
      (selectedEpisode) => ({ selectedEpisode })
    );
    if (episode === null && this.state.requestedEpisode === request && requestError !== null) {
      this.setState({ requestedEpisode: { ...request, error: requestError } });
    }
    return episode;
  };

  /** Loading belongs to the requested route and operation, not to every request sharing this ViewModel. */
  isSeriesLoading = (seriesId) => this._isRouteEntityLoading('loadSeriesDetails', this.state.requestedSeriesId, seriesId);

  isSeasonLoading = (seriesId, seasonNumber) => {
    if (!isValidSeasonRoute(seriesId, seasonNumber)) {
      return false;
    }
    const request = this.state.requestedSeason;
    return !request || String(request.seriesId) !== String(seriesId)
      || Number(request.seasonNumber) !== Number(seasonNumber)
      || this._pendingOperations.has('loadSeasonDetails');
  };

  isEpisodeLoading = (seriesId, seasonNumber, episodeNumber) => {
    if (!isValidEpisodeRoute(seriesId, seasonNumber, episodeNumber)) {
      return false;
    }
    const request = this.state.requestedEpisode;
    return !request || String(request.seriesId) !== String(seriesId)
      || Number(request.seasonNumber) !== Number(seasonNumber)
      || Number(request.episodeNumber) !== Number(episodeNumber)
      || this._pendingOperations.has('loadEpisodeDetails');
  };

  /** Resolve the current episode by route identity; detail retrieval remains a repository operation. */
  getEpisodeForRoute = (seriesId, seasonNumber, episodeNumber) => {
    if (!isValidEpisodeRoute(seriesId, seasonNumber, episodeNumber)) {
      return null;
    }
    const episode = this.state.selectedEpisode;
    return episode && String(episode.seriesId) === String(seriesId)
      && Number(episode.seasonNumber) === Number(seasonNumber)
      && Number(episode.episodeNumber) === Number(episodeNumber) ? episode : null;
  };

  /**
   * Reset currently selected series, season, and episode
   */
  clearSelection = () => {
    this._latestSeriesRequest = null;
    this.setState({
      selectedSeries: null,
      selectedSeason: null,
      selectedEpisode: null,
      requestedSeriesId: null,
      seriesError: null,
      requestedSeason: null,
      requestedEpisode: null
    });
  };
}

export default SeriesViewModel;
