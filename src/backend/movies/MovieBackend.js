import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Movie, isUpcomingMovie } from '../../models/index.js';
import { MOVIE_CATEGORY_CONFIG } from '../../utils/selections.js';

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
   * Get upcoming movies whose release date is strictly in the future and not released
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getUpcomingMovies({ page = 1, language } = {}) {
    const data = await this.apiService.getUpcomingMovies({ page, language });
    const today = new Date().toISOString().slice(0, 10);

    const candidates = (data.results || []).filter((item) => isUpcomingMovie(item, today));

    const enrichedCandidates = await Promise.all(
      candidates.map(async (item) => {
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
      })
    );

    const futureMovies = enrichedCandidates.filter((item) => isUpcomingMovie(item, today));

    return {
      ...data,
      results: futureMovies.map((item) => new Movie(item))
    };
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
  async getMoviesByCategory(categoryKey, { page = 1, language, sortBy = 'popularity.desc' } = {}) {
    if (categoryKey === 'upcoming') {
      return this.getUpcomingMovies({ page, language });
    }

    const config = MOVIE_CATEGORY_CONFIG[categoryKey] || {};
    const today = new Date().toISOString().slice(0, 10);
    const queryParams = {
      page,
      sort_by: sortBy,
      'primary_release_date.lte': today,
      language,
      ...(config.genreId ? { with_genres: config.genreId } : {}),
      ...(config.additionalParams || {})
    };

    const data = await this.apiService.discoverMovie(queryParams);
    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  /**
   * Get trending movies (today, this week or this month)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
  */
  async getTrendingMovies({ timeWindow = 'month', page = 1, language, onlyReleased } = {}) {
    const data = await this.apiService.getTrendingMovies(timeWindow, { page, language });
    let items = data.results || [];
    if (onlyReleased) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter((m) => {
        const release = m.releaseDate || m.release_date;
        return !release || release <= today;
      });
    }
    return {
      ...data,
      results: items.map((item) => new Movie(item))
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
    const cleanedQuery = (query || '').trim(); //blank spaces removed
    if (!cleanedQuery) {
      return {
        page: 1,
        results: [],
        total_pages: 0,
        total_results: 0
      };
    }

    const data = await this.apiService.searchMovie({ query: cleanedQuery, page, language });
    return {
      ...data,
      results: (data.results || []).map((item) => new Movie(item))
    };
  }

  async searchMoviesByGenre({ genreId, page = 1, language } = {}) {
    if (!genreId) throw new Error('genreId is required');

    const data = await this.apiService.searchMoviesByGenre({ genreId, page, language });
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
