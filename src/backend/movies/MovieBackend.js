import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Movie, isMediaUpcoming } from '../../models/Movie.js';
import { MOVIE_CATEGORY_CONFIG } from '../../utils/mediaCategories.js';
import { BaseBackend } from '../BaseBackend.js';

/**
 * MovieBackend
 * Scope: Handles movies listing, searching, filtering, and detail extraction.
 * Transforms UI parameters into TMDB Movie API calls via ApiService and returns typed domain models (Movie).
 */

export class MovieBackend extends BaseBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    super(apiService);
  }

  async getGenres(params = {}) {
    return this._getGenres('movie', params);
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
  async discoverMovies(params = {}) {
    return this._discoverMedia(params, (queryParams) => this.apiService.discoverMovie(queryParams), Movie);
  }

  /**
   * Get upcoming movies whose release date is strictly in the future and not released
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getUpcomingMovies({ page = 1, language } = {}) {
    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.getUpcomingMovies({ page, language });
    const today = new Date().toISOString().slice(0, 10);

    const candidates = (data.results || []).filter((item) => isMediaUpcoming(item, today));

    const enrichedCandidates = await this._enrichWithConcurrency(candidates, 4, async (item) => {
      if (item.status) return item;
      try {
        const detail = await this.apiService.fetch(`/movie/${item.id}`, { language });
        if (detail?.status) {
          return { ...item, status: detail.status };
        }
      } catch {
        // If network error occurs on single detail, keep item
      }
      return item;
    });

    const futureMovies = enrichedCandidates.filter((item) => isMediaUpcoming(item, today));
    return this._mapPaginatedResults({ ...data, results: futureMovies }, (item) => new Movie(item));
  }

  /**
   * Get movies by category/genre
   * @param {string} categoryKey
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {string} [params.sortBy='popularity.desc']
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getMoviesByCategory(categoryKey, params = {}) {
    return this._getMediaByCategory(MOVIE_CATEGORY_CONFIG, categoryKey, params, {
      dateField: 'primary_release_date.lte',
      getUpcoming: (opts) => this.getUpcomingMovies(opts),
      discoverCall: (queryParams) => this.apiService.discoverMovie(queryParams),
      ModelClass: Movie
    });
  }

  /**
   * Get trending movies (today, this week or this month)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getTrendingMovies(params = {}) {
    return this._getTrendingMedia(params, {
      dateFields: ['releaseDate', 'release_date'],
      trendingCall: (timeWindow, opts) => this.apiService.getTrendingMovies(timeWindow, opts),
      ModelClass: Movie
    });
  }

  /**
   * Search movies by title, genre, actor or director.
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async searchMovies(params = {}) {
    // Blank spaces are removed by the shared search normalizer.
    return this._searchMedia('movie', params, Movie);
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchMoviesByGenre(params = {}) {
    return this.searchMovies({ ...params, searchBy: 'genre' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchMoviesByActor(params = {}) {
    return this.searchMovies({ ...params, searchBy: 'actor' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchMoviesByDirector(params = {}) {
    return this.searchMovies({ ...params, searchBy: 'director' });
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
      append_to_response: appendCredits ? 'credits,watch/providers' : '',
      language
    });

    return new Movie(data);
  }
}

export const movieBackend = new MovieBackend();
export default MovieBackend;
