import { apiService as defaultApiService } from '../../service/ApiService.js';

/**
 * SeriesBackend
 * Scope: Handles TV series listing, searching, filtering, and hierarchical navigation (series -> seasons -> episodes).
 * Transforms UI parameters into TMDB API calls via ApiService.
 */
export class SeriesBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
  }

  /**
   * Discover and filter TV series
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc'] - 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc'
   * @param {string|number} [params.genreId] - Single genre ID or comma-separated genre IDs
   * @param {string|number} [params.watchProviderId] - Watch provider ID (e.g. 8 for Netflix, 119 for Prime Video, 337 for Disney+)
   * @param {string|number} [params.keywords] - Keyword ID (e.g. 179430 for Cameo)
   * @returns {Promise<any>}
   */
  async discoverSeries({ page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords } = {}) {
    const queryParams = {
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords
    };

    return this.apiService.discoverTv(queryParams);
  }

  /**
   * Get trending TV series (today or this week)
   * @param {object} params
   * @param {'day'|'week'} [params.timeWindow='week']
   * @param {number} [params.page=1]
   * @returns {Promise<any>}
   */
  async getTrendingSeries({ timeWindow = 'week', page = 1 } = {}) {
    return this.apiService.getTrendingTv(timeWindow, { page });
  }

  /**
   * Search TV series by query title
   * @param {object} params
   * @param {string} params.query
   * @param {number} [params.page=1]
   * @returns {Promise<any>}
   */
  async searchSeries({ query, page = 1 } = {}) {
    const sanitizedQuery = (query || '').trim();
    if (!sanitizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };
    }

    return this.apiService.searchTv({ query: sanitizedQuery, page });
  }

  /**
   * Get TV series details with seasons list and aggregate credits
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {boolean} [params.appendAggregateCredits=true]
   * @returns {Promise<any>}
   */
  async getSeriesDetails({ seriesId, appendAggregateCredits = true } = {}) {
    if (!seriesId) throw new Error('seriesId is required');

    return this.apiService.getTvSeriesDetails(seriesId, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : undefined
    });
  }

  /**
   * Get season details including all episodes and guest stars
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {boolean} [params.appendAggregateCredits=true]
   * @returns {Promise<any>}
   */
  async getSeasonDetails({ seriesId, seasonNumber, appendAggregateCredits = true } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    return this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : undefined
    });
  }

  /**
   * Get individual episode details with credits
   * @param {object} params
   * @param {number|string} params.seriesId
   * @param {number|string} params.seasonNumber
   * @param {number|string} params.episodeNumber
   * @param {boolean} [params.appendCredits=true]
   * @returns {Promise<any>}
   */
  async getEpisodeDetails({ seriesId, seasonNumber, episodeNumber, appendCredits = true } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    return this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: appendCredits ? 'credits' : undefined
    });
  }
}

export const seriesBackend = new SeriesBackend();
export default SeriesBackend;
