import { apiService as defaultApiService } from '../../service/ApiService.js';

/**
 * MovieBackend
 * Scope: Handles movies listing, searching, filtering, and detail extraction.
 * Transforms UI parameters into TMDB Movie API calls via ApiService.
 */
export class MovieBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
  }

  /**
   * Discover and filter movies
   * @param {object} params
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc'] - 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc'
   * @param {string|number} [params.genreId] - Single genre ID or comma-separated genre IDs
   * @param {string|number} [params.watchProviderId] - Watch provider ID (e.g. 8 for Netflix, 119 for Prime Video, 337 for Disney+)
   * @param {string|number} [params.keywords] - Keyword ID (e.g. 179430 for Cameo)
   * @returns {Promise<any>}
   */
  async discoverMovies({ page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords } = {}) {
    const queryParams = {
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords
    };

    return this.apiService.discoverMovie(queryParams);
  }

  /**
   * Get trending movies (today or this week)
   * @param {object} params
   * @param {'day'|'week'} [params.timeWindow='week']
   * @param {number} [params.page=1]
   * @returns {Promise<any>}
   */
  async getTrendingMovies({ timeWindow = 'week', page = 1 } = {}) {
    return this.apiService.getTrendingMovie(timeWindow, { page });
  }

  /**
   * Search movies by query title
   * @param {object} params
   * @param {string} params.query
   * @param {number} [params.page=1]
   * @returns {Promise<any>}
   */
  async searchMovies({ query, page = 1 } = {}) {
    const sanitizedQuery = (query || '').trim();
    if (!sanitizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };
    }

    return this.apiService.searchMovie({ query: sanitizedQuery, page });
  }

  /**
   * Get movie details with full cast and crew credits
   * @param {object} params
   * @param {number|string} params.movieId
   * @param {boolean} [params.appendCredits=true]
   * @returns {Promise<any>}
   */
  async getMovieDetails({ movieId, appendCredits = true } = {}) {
    if (!movieId) throw new Error('movieId is required');

    return this.apiService.getMovieDetails(movieId, {
      append_to_response: appendCredits ? 'credits' : undefined
    });
  }
}

export const movieBackend = new MovieBackend();
export default MovieBackend;
