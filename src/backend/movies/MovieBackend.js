import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Movie } from '../../models/index.js';

/**
 * MovieBackend
 * Scope: Handles movies listing, searching, filtering, and detail extraction.
 * Transforms UI parameters into TMDB Movie API calls via ApiService and returns typed domain models (Movie).
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
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc'] - 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc'
   * @param {string|number} [params.genreId] - Single genre ID or comma-separated genre IDs
   * @param {string|number} [params.watchProviderId] - Watch provider ID (e.g. 8 for Netflix, 119 for Prime Video, 337 for Disney+)
   * @param {string|number} [params.keywords] - Keyword ID (e.g. 179430 for Cameo)
   * @param {string} [params.language] - Language code (e.g. 'it-IT', 'en-US')
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async discoverMovies({ page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords, language } = {}) {
    const queryParams = {
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords,
      language
    };

    const data = await this.apiService.discoverMovie(queryParams);
    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  /**
   * Get trending movies (today or this week)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='week']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getTrendingMovies({ timeWindow = 'week', page = 1, language } = {}) {
    const data = await this.apiService.getTrendingMovie(timeWindow, { page, language });
    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  /**
   * Search movies by query title
   * @param {Object} [params={}]
   * @param {string} [params.query]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async searchMovies({ query, page = 1, language } = {}) {
    const sanitizedQuery = (query || '').trim();
    if (!sanitizedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };
    }

    const data = await this.apiService.searchMovie({ query: sanitizedQuery, page, language });
    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  /**
   * Get movie details with full cast and crew credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Movie>}
   */
  async getMovieDetails({ movieId, appendCredits = true, language } = {}) {
    if (!movieId) throw new Error('movieId is required');

    const data = await this.apiService.getMovieDetails(movieId, {
      append_to_response: appendCredits ? 'credits' : undefined,
      language
    });

    return new Movie(data);
  }
}

export const movieBackend = new MovieBackend();
export default MovieBackend;
