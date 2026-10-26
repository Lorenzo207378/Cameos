import { BaseViewModel } from '../BaseViewModel.js';
import { movieRepository as defaultMovieRepository } from '../../repository/movies/MovieRepository.js';

/**
 * MovieViewModel
 * MVVM ViewModel mediating between MovieRepository and Movie UI components.
 * Holds observable state for movie discovery, trending, search, and full movie details.
 */
export class MovieViewModel extends BaseViewModel {
  /**
   * @param {import('../../repository/movies/MovieRepository.js').MovieRepository} [repository]
   * @param {Object} [options={}]
   * @param {string} [options.language='it-IT']
   */
  constructor(repository = defaultMovieRepository, options = {}) {
    super(
      {
        moviesList: [],
        trendingMovies: [],
        searchResults: [],
        selectedMovie: null,
        page: 1,
        totalPages: 0,
        totalResults: 0
      },
      options
    );
    this.repository = repository;
  }

  /**
   * Discover and filter movies
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  discoverMovies = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'discoverMovies',
      () => this.repository.discoverMovies({ ...params, language }),
      (res) => this.mapPaginatedResult('moviesList', res)
    );
  };

  /**
   * Load trending movies
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadTrendingMovies = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadTrendingMovies',
      () => this.repository.getTrendingMovies({ ...params, language }),
      (res) => this.mapPaginatedResult('trendingMovies', res)
    );
  };

  /**
   * Search movies by title query
   * @param {string} query
   * @param {number} [page=1]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  searchMovies = async (query, page = 1, language = this.language) => {
    return this.runAsync(
      'searchMovies',
      () => this.repository.searchMovies({ query, page, language }),
      (res) => this.mapPaginatedResult('searchResults', res)
    );
  };

  /**
   * Search movies by genre ID
   * @param {number} genreId
   * @param {number} [page=1]
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  searchMoviesByGenre = async (genreId, page = 1, language = this.language) => {
    return this.runAsync(
      'searchMoviesByGenre',
      () => this.repository.searchMoviesByGenre({ genreId, page, language }),
      (res) => this.mapPaginatedResult('searchResults', res)
    );
  }

  /**
   * Load full movie details by ID
   * @param {number|string} movieId
   * @param {boolean} [appendCredits=true]
   * @param {string} [language]
   * @returns {Promise<import('../../models/Movie.js').Movie|null>}
   */
  loadMovieDetails = async (movieId, appendCredits = true, language = this.language) => {
    return this.runAsync(
      'loadMovieDetails',
      () => this.repository.getMovieDetails({ movieId, appendCredits, language }),
      (selectedMovie) => ({ selectedMovie })
    );
  };

  /**
   * Reset currently selected movie
   */
  clearSelection = () => {
    this.setState({ selectedMovie: null });
  };
}

export default MovieViewModel;
