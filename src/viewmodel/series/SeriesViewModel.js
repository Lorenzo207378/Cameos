import { BaseViewModel } from '../BaseViewModel.js';
import { seriesRepository as defaultSeriesRepository } from '../../repository/series/SeriesRepository.js';
import { isMediaUpcoming } from '../../models/utils/index.js';
import { SERIES_CATEGORY_CONFIG } from '../../utils/mediaCategories.js';

const seriesCategoryKeys = Object.keys(SERIES_CATEGORY_CONFIG).filter((key) => key !== 'upcoming');

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
 * @property {{ page: number, totalPages: number, hasMore: boolean, loadingMore: boolean }} upcomingPagination
 * @property {Array<import('../../models/Series.js').Series>} searchResults
 * @property {import('../../models/Series.js').Series|null} selectedSeries
 * @property {import('../../models/Season.js').Season|null} selectedSeason
 * @property {import('../../models/Episode.js').Episode|null} selectedEpisode
 * @property {number|string|null} requestedSeriesId
 * @property {{seriesId: number|string, seasonNumber: number|string, error?: string|null}|null} requestedSeason
 * @property {{seriesId: number|string, seasonNumber: number|string, episodeNumber: number|string}|null} requestedEpisode
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
export class SeriesViewModel extends BaseViewModel {
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
        seriesList: [],
        trendingSeries: [],
        upcomingSeries: [],
        actionAdventureSeries: [],
        sciFiFantasySeries: [],
        comedySeries: [],
        dramaSeries: [],
        crimeSeries: [],
        mysterySeries: [],
        animationSeries: [],
        familySeries: [],
        kidsSeries: [],
        warPoliticsSeries: [],
        westernSeries: [],
        soapSeries: [],
        categorySeries: {},
        categoryPagination: {},
        feedLoaded: false,
        searchResults: [],
        selectedSeries: null,
        selectedSeason: null,
        selectedEpisode: null,
        requestedSeriesId: null,
        requestedSeason: null,
        requestedEpisode: null,
        page: 1,
        totalPages: 0,
        totalResults: 0
      },
      options
    );
    this.repository = repository;
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
   * Load trending TV series
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadTrendingSeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadTrendingSeries',
      () => this.repository.getTrendingSeries({ timeWindow: 'month', ...params, language }),
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
   * @returns {Promise<Array<import('../../models/Series.js').Series>>}
   */
  loadUpcomingSeries = async (params = {}) => {
    const language = params.language || this.language;
    return this.loadPagination({
      categoryKey: 'upcoming',
      stateProp: 'upcomingSeries',
      paginationMapProp: 'categoryPagination',
      asyncKey: 'loadUpcomingSeries',
      fetchPage: (page) => this.repository.getUpcomingSeries({ ...params, page, language }),
      filterFn: isMediaUpcoming,
      params
    });
  };

  /**
   * Load film page feed in parallel: trending, upcoming and all major categories.
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
    if (!force && this.state.feedLoaded) {
      return this.state;
    }

    return await this.runAsync(
      'loadSeriesFeed',
      async () => {
        await Promise.all([
          this.loadTrendingSeries({ timeWindow: 'month', onlyReleased: true, language }),
          this.loadUpcomingSeries({ initialPages, language }),
          this.loadSeriesFromCategoryList(categories, { initialPages, language })
        ]);

        return this.state;
      },
      () => ({ feedLoaded: true })
    );
  };

  loadSeriesFromCategory = async (categoryKey, options = {}) => {
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
    const results = await Promise.all(
      categories.map(async (catKey) => {
        try {
          const series = await this.loadSeriesFromCategory(catKey, options);
          return [catKey, series || []];
        } catch (err) {
          console.warn(`[SeriesViewModel] Error loading series from category ${catKey}:`, err);
          return [catKey, []];
        }
      })
    );

    return Object.fromEntries(results);
  };

  /**
   * Search TV series by title, genre, actor or director. Existing positional title calls remain valid.
   * @param {string|import('../../utils/search.js').MediaSearchParams} query
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
   * @param {number|string} seriesId
   * @param {boolean} [appendAggregateCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Series.js').Series|null>}
   */
  loadSeriesDetails = async (seriesId, appendAggregateCredits = true, language = this.language) => {
    return this.runAsync(
      'loadSeriesDetails',
      () => {
        this.setState({requestedSeriesId: seriesId});
        return this.repository.getSeriesDetails({ seriesId, appendAggregateCredits, language });
      },
      (selectedSeries) => ({ selectedSeries })
    );
  };

  /**
   * Load season details including all episodes
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {boolean} [appendAggregateCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Season.js').Season|null>}
   */
  loadSeasonDetails = async (seriesId, seasonNumber, appendAggregateCredits = true, language = this.language) => {
    const request = {seriesId, seasonNumber, error: null};
    const season = await this.runAsync(
      'loadSeasonDetails',
      () => {
        this.setState({requestedSeason: request});
        return this.repository.getSeasonDetails({ seriesId, seasonNumber, appendAggregateCredits, language });
      },
      (selectedSeason) => ({ selectedSeason })
    );
    if (season === null && this.state.requestedSeason === request) {
      this.setState({requestedSeason: {...request, error: this.state.error}});
    }
    return season;
  };

  /**
   * Load individual episode details
   * @param {number|string|Object} seriesIdOrParams
   * @param {number|string} [seasonNumber]
   * @param {number|string} [episodeNumber]
   * @param {boolean} [appendCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Episode.js').Episode|null>}
   */
  loadEpisodeDetails = async (seriesIdOrParams, seasonNumber, episodeNumber, appendCredits = true, language = this.language) => {
    const params = typeof seriesIdOrParams === 'object' && seriesIdOrParams !== null
      ? { appendCredits: true, language: this.language, ...seriesIdOrParams }
      : { seriesId: seriesIdOrParams, seasonNumber, episodeNumber, appendCredits, language };

    return this.runAsync(
      'loadEpisodeDetails',
      () => {
        this.setState({requestedEpisode: {
          seriesId: params.seriesId, seasonNumber: params.seasonNumber, episodeNumber: params.episodeNumber
        }});
        return this.repository.getEpisodeDetails(params);
      },
      (selectedEpisode) => ({ selectedEpisode })
    );
  };

  /** Loading belongs to the requested route and operation, not to every request sharing this ViewModel. */
  isSeriesLoading = (seriesId) => String(this.state.requestedSeriesId) !== String(seriesId)
    || this._pendingOperations.has('loadSeriesDetails');

  isSeasonLoading = (seriesId, seasonNumber) => {
    const request = this.state.requestedSeason;
    return !request || String(request.seriesId) !== String(seriesId)
      || Number(request.seasonNumber) !== Number(seasonNumber)
      || this._pendingOperations.has('loadSeasonDetails');
  };

  isEpisodeLoading = (seriesId, seasonNumber, episodeNumber) => {
    const request = this.state.requestedEpisode;
    return !request || String(request.seriesId) !== String(seriesId)
      || Number(request.seasonNumber) !== Number(seasonNumber)
      || Number(request.episodeNumber) !== Number(episodeNumber)
      || this._pendingOperations.has('loadEpisodeDetails');
  };

  /** Resolve the current episode by route identity; detail retrieval remains a repository operation. */
  getEpisodeForRoute = (seriesId, seasonNumber, episodeNumber) => {
    const episode = this.state.selectedEpisode;
    return episode && String(episode.seriesId) === String(seriesId)
      && Number(episode.seasonNumber) === Number(seasonNumber)
      && Number(episode.episodeNumber) === Number(episodeNumber) ? episode : null;
  };

  /**
   * Reset currently selected series, season, and episode
   */
  clearSelection = () => {
    this.setState({
      selectedSeries: null,
      selectedSeason: null,
      selectedEpisode: null,
      requestedSeriesId: null,
      requestedSeason: null,
      requestedEpisode: null
    });
  };
}

export default SeriesViewModel;
