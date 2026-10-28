import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Series, Season, Episode } from '../../models/index.js';

/**
 * SeriesBackend
 * Scope: Handles TV series listing, searching, filtering, and hierarchical navigation (series -> seasons -> episodes).
 * Transforms UI parameters into TMDB API calls and returns typed domain models (Series, Season, Episode).
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
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc'] - 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc'
   * @param {string|number} [params.genreId] - Single genre ID or comma-separated genre IDs
   * @param {string|number} [params.watchProviderId] - Watch provider ID (e.g. 8 for Netflix, 119 for Prime Video, 337 for Disney+)
   * @param {string|number} [params.keywords] - Keyword ID (e.g. 179430 for Cameo)
   * @param {string} [params.language] - Language tag (e.g. 'it-IT', 'en-US')
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async discoverSeries({ page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords, language } = {}) {
    const queryParams = {
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords,
      language
    };

    const data = await this.apiService.discoverTv(queryParams);
    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Get trending TV series (today, this week or this month)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getTrendingSeries({ timeWindow = 'month', page = 1, language } = {}) {
    const data = await this.apiService.getTrendingTv(timeWindow, { page, language });
    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Search TV series by query title
   * @param {Object} [params={}]
   * @param {string} [params.query]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeries({ query, page = 1, language } = {}) {
    const sanitizedQuery = (query || '').trim();
    if (!sanitizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };
    }

    const data = await this.apiService.searchTv({ query: sanitizedQuery, page, language });
    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Get TV series details with seasons list and aggregate credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Series>}
   */
  async getSeriesDetails({ seriesId, appendAggregateCredits = true, language } = {}) {
    if (!seriesId) throw new Error('seriesId is required');

    const data = await this.apiService.getTvSeriesDetails(seriesId, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : undefined,
      language
    });

    return new Series(data);
  }

  /**
   * Get season details including all episodes and guest stars as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Season>}
   */
  async getSeasonDetails({ seriesId, seasonNumber, appendAggregateCredits = true, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    const data = await this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : undefined,
      language
    });

    return new Season({ ...data, seriesId });
  }

  /**
   * Get individual episode details with credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Episode>}
   */
  async getEpisodeDetails({ seriesId, seasonNumber, episodeNumber, appendCredits = true, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    const data = await this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: appendCredits ? 'credits' : undefined,
      language
    });

    return new Episode({ ...data, seriesId, seasonNumber });
  }
}

export const seriesBackend = new SeriesBackend();
export default SeriesBackend;
