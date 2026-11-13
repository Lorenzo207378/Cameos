import { BaseRepository, STORES } from '../BaseRepository.js';
import { movieBackend as defaultMovieBackend } from '../../backend/movies/MovieBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Movie, isMediaUpcoming } from '../../models/Movie.js';

/**
 * MovieRepository
 * Manages Movies persistence in IndexedDB with Network-First strategy
 * and automatic fallback to local storage when offline or on API errors.
 */
export class MovieRepository extends BaseRepository {
  /**
   * @param {import('../../backend/movies/MovieBackend.js').MovieBackend} [backend]
   * @param {import('../../storage/IndexedDBService.js').IndexedDBService} [storage]
   */
  constructor(backend = defaultMovieBackend, storage = defaultStorage) {
    super(storage);
    this.backend = backend;
  }

  /**
   * Get localized movie genres list
   * @param {Object} [options={}]
   * @param {string} [options.language]
   * @param {boolean} [options.force=false]
   * @returns {Promise<Array<Object>>}
   */
  async getGenres({ language = undefined, force = false } = {}) {
    return this._getGenres('movie', language, (params) => this.backend.getGenres(params), force);
  }

  /**
   * @param {number|string} movieId
   * @param {string} [language]
   * @returns {string}
   */
  _movieKey(movieId, language) {
    return `movie:${Number(movieId)}:${this.normalizeLanguage(language)}`;
  }

  /**
   * @param {Array<Movie>} [movieList=[]]
   * @param {string} [language]
   * @returns {Promise<void>}
   */
  async _saveMovieItemsFromList(movieList = [], language = undefined) {
    await this._cacheEntitiesFromList(STORES.MOVIES, movieList, language, (id, lang) => this._movieKey(id, lang));
  }

  /**
   * Discover and filter movies (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string|number} [params.genreId]
   * @param {string|number} [params.watchProviderId]
   * @param {string|number} [params.keywords]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async discoverMovies(params = {}) {
    return this._executeMediaCatalogPage(Movie, {
      prefix: 'discover_movies',
      queryParams: {
        page: params.page ?? 1,
        sortBy: params.sortBy ?? 'popularity.desc',
        genreId: params.genreId,
        watchProviderId: params.watchProviderId,
        keywords: params.keywords
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.discoverMovies(params),
      saveItems: (results, lang) => this._saveMovieItemsFromList(results, lang)
    });
  }

  /**
   * Get upcoming movies with future release date (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{page: number, total_pages: number, total_results: number, results: T[]}>}
   */
  async getUpcomingMovies(params = {}) {
    const response = await this._executeMediaCatalogPage(Movie, {
      prefix: 'upcoming_movies',
      queryParams: { page: params.page ?? 1 },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getUpcomingMovies(params),
      saveItems: (results, lang) => this._saveMovieItemsFromList(results, lang)
    });

    const today = new Date().toISOString().slice(0, 10);
    return {
      ...response,
      results: (response?.results || []).filter((movie) => isMediaUpcoming(movie, today))
    };
  }

  /**
   * Get movies by category (Network-First + IndexedDB Fallback)
   * @param {string} categoryKey
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc']
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getMoviesByCategory(categoryKey, params = {}) {
    return this._executeMediaCatalogPage(Movie, {
      prefix: `category_movies_${categoryKey}`,
      queryParams: {
        categoryKey,
        page: params.page ?? 1,
        // Keep existing cache keys for the default ordering while isolating custom sorts.
        ...(params.sortBy && params.sortBy !== 'popularity.desc' ? { sortBy: params.sortBy } : {})
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getMoviesByCategory(categoryKey, params),
      saveItems: (results, lang) => this._saveMovieItemsFromList(results, lang)
    });
  }

  /**
   * Get trending movies (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {boolean} [params.onlyReleased=true]
   * @param {number} [params.limit=10]
   * @param {boolean} [params.force=false]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getTrendingMovies(params = {}) {
    const timeWindow = params.timeWindow ?? 'month';
    const onlyReleased = params.onlyReleased ?? true;
    const limit = params.limit ?? 10;
    return this._executeMediaCatalogPage(Movie, {
      prefix: 'trending_movies',
      queryParams: {
        timeWindow,
        page: params.page ?? 1,
        onlyReleased,
        limit
      },
      language: params.language,
      force: params.force,
      fetchRemote: () => this.backend.getTrendingMovies({ ...params, timeWindow, onlyReleased, limit }),
      saveItems: (results, lang) => this._saveMovieItemsFromList(results, lang)
    });
  }

  /**
   * Search movies by title, genre, actor or director
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async searchMovies(params = {}) {
    return this._executeMediaSearch(params, Movie, {
      mediaType: 'movie',
      fetchRemote: (search) => this.backend.searchMovies(search),
      saveItems: (results, language) => this._saveMovieItemsFromList(results, language)
    });
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
   * Get movie details with cast and crew credits (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @param {boolean} [params.force=false]
   * @returns {Promise<Movie>}
   */
  async getMovieDetails(params = {}) {
    const { movieId, language } = params;
    if (!movieId) throw new Error('movieId is required');

    return this._executeEntityDetails(Movie, {
      storeName: STORES.MOVIES,
      entityKey: this._movieKey(movieId, language),
      id: movieId,
      language,
      isComplete: params.appendCredits !== false,
      force: params.force,
      fetchRemote: () => this.backend.getMovieDetails(params)
    });
  }
}

export const movieRepository = new MovieRepository();
export default MovieRepository;
