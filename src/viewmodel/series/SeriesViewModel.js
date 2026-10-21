import { BaseViewModel } from '../BaseViewModel.js';
import { seriesRepository as defaultSeriesRepository } from '../../repository/series/SeriesRepository.js';

/**
 * SeriesViewModel
 * MVVM ViewModel mediating between SeriesRepository and TV Series UI components.
 * Holds observable state for series discovery, trending, search, series details, seasons, and episodes.
 */
export class SeriesViewModel extends BaseViewModel {
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
        searchResults: [],
        selectedSeries: null,
        selectedSeason: null,
        selectedEpisode: null,
        page: 1,
        totalPages: 0,
        totalResults: 0
      },
      options
    );
    this.repository = repository;
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
      () => this.repository.getTrendingSeries({ ...params, language }),
      (res) => this.mapPaginatedResult('trendingSeries', res)
    );
  };

  /**
   * Search TV series by title query
   * @param {string} query
   * @param {number} [page=1]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  searchSeries = async (query, page = 1, language = this.language) => {
    return this.runAsync(
      'searchSeries',
      () => this.repository.searchSeries({ query, page, language }),
      (res) => this.mapPaginatedResult('searchResults', res)
    );
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
      () => this.repository.getSeriesDetails({ seriesId, appendAggregateCredits, language }),
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
    return this.runAsync(
      'loadSeasonDetails',
      () => this.repository.getSeasonDetails({ seriesId, seasonNumber, appendAggregateCredits, language }),
      (selectedSeason) => ({ selectedSeason })
    );
  };

  /**
   * Load individual episode details
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {boolean} [appendCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Episode.js').Episode|null>}
   */
  loadEpisodeDetails = async (seriesId, seasonNumber, episodeNumber, appendCredits = true, language = this.language) => {
    return this.runAsync(
      'loadEpisodeDetails',
      () => this.repository.getEpisodeDetails({ seriesId, seasonNumber, episodeNumber, appendCredits, language }),
      (selectedEpisode) => ({ selectedEpisode })
    );
  };

  /**
   * Reset currently selected series, season, and episode
   */
  clearSelection = () => {
    this.setState({
      selectedSeries: null,
      selectedSeason: null,
      selectedEpisode: null
    });
  };
}

export default SeriesViewModel;
