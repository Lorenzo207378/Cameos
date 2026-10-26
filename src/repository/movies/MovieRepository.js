import { BaseRepository, STORES } from '../BaseRepository.js';
import { movieBackend as defaultMovieBackend } from '../../backend/movies/MovieBackend.js';
import { indexedDBService as defaultStorage } from '../../storage/IndexedDBService.js';
import { Movie } from '../../models/index.js';

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
  async _saveMovieItemsFromList(movieList = [], language) {
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
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async discoverMovies(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('discover_movies', {
      page: params.page ?? 1,
      sortBy: params.sortBy ?? 'popularity.desc',
      genreId: params.genreId,
      watchProviderId: params.watchProviderId,
      keywords: params.keywords,
      language: lang
    });

    return this._executePaginatedQuery(
      queryKey,
      () => this.backend.discoverMovies(params),
      Movie,
      { onSaveItems: (results) => this._saveMovieItemsFromList(results, lang) }
    );
  }

  /**
   * Get trending movies (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='week']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async getTrendingMovies(params = {}) {
    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('trending_movies', {
      timeWindow: params.timeWindow ?? 'week',
      page: params.page ?? 1,
      language: lang
    });

    return this._executePaginatedQuery(
      queryKey,
      () => this.backend.getTrendingMovies(params),
      Movie,
      { onSaveItems: (results) => this._saveMovieItemsFromList(results, lang) }
    );
  }

  /**
   * Search movies by title (Network-First + IndexedDB Query & Local Store Search Fallback)
   * @param {Object} [params={}]
   * @param {string} [params.query]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Movie> }>}
   */
  async searchMovies(params = {}) {
    const cleanedQuery = (params.query || '').trim();
    if (!cleanedQuery) {
      return { page: 1, results: [], total_pages: 0, total_results: 0 };
    }

    const lang = this.normalizeLanguage(params.language);
    const queryKey = this.buildCacheKey('search_movies', {
      query: cleanedQuery.toLowerCase(),
      page: params.page ?? 1,
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.searchMovies(params), Movie, {
      onSaveItems: (results) => this._saveMovieItemsFromList(results, lang),
      searchLocal: () => this._searchLocalEntities(STORES.MOVIES, cleanedQuery, lang, ['title', 'originalTitle'], Movie)
    });
  }

  async searchMoviesByGenre(params = {}) {
    const { genreId, page = 1, language } = params;
    if (!genreId) throw new Error('genreId is required');

    const lang = this.normalizeLanguage(language);
    const queryKey = this.buildCacheKey('search_movies_by_genre', {
      genreId,
      page,
      language: lang
    });

    return this._executePaginatedQuery(queryKey, () => this.backend.searchMoviesByGenre(params), Movie, {
      onSaveItems: (results) => this._saveMovieItemsFromList(results, lang)
    });
  }

  /**
   * Get movie details with cast and crew credits (Network-First + IndexedDB Fallback)
   * @param {Object} [params={}]
   * @param {number|string} [params.movieId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Movie>}
   */
  async getMovieDetails(params = {}) {
    const { movieId, language } = params;
    if (!movieId) throw new Error('movieId is required');

    const lang = this.normalizeLanguage(language);
    const cacheKey = this._movieKey(movieId, lang);

    return this.executeWithFallback({
      context: cacheKey,
      fetchRemote: () => this.backend.getMovieDetails(params),
      saveLocal: async (freshMovie) => {
        await this.storage.put(STORES.MOVIES, {
          cacheKey,
          id: Number(movieId),
          language: lang,
          isComplete: true,
          data: freshMovie
        });
      },
      getLocal: () => this._getEntityWithIndexFallback(STORES.MOVIES, cacheKey, 'id', Number(movieId), Movie)
    });
  }
}

export const movieRepository = new MovieRepository();
export default MovieRepository;
