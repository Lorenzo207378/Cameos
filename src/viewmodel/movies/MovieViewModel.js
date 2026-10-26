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
        upcomingMovies: [],
        actionMovies: [],
        comedyMovies: [],
        romanceMovies: [],
        crimeMovies: [],
        sciFiMovies: [],
        fantasyMovies: [],
        horrorMovies: [],
        sagasMovies: [],
        dramaMovies: [],
        animationMovies: [],
        thrillerMovies: [],
        adventureMovies: [],
        categoryMovies: {},
        categoryPagination: {},
        feedLoaded: false,
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
   * Load upcoming movies whose release date is in the future
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadUpcomingMovies = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadUpcomingMovies',
      () => this.repository.getUpcomingMovies({ ...params, language }),
      (res) => this.mapPaginatedResult('upcomingMovies', res)
    );
  };

  /**
   * Load movies for a specific category key (e.g. comedy, romance, action, etc.)
   * @param {string} categoryKey
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadCategoryMovies = async (categoryKey, params = {}) => {
    const language = params.language || this.language;
    const stateProp = `${categoryKey}Movies`;
    return this.runAsync(
      `loadCategory_${categoryKey}`,
      () => this.repository.getMoviesByCategory(categoryKey, { ...params, language }),
      (res) => {
        const items = res.results || [];
        return {
          [stateProp]: items,
          categoryMovies: {
            ...this.state.categoryMovies,
            [categoryKey]: items
          }
        };
      }
    );
  };

  /**
   * Load media page feed in parallel: trending, upcoming and all major categories
   * Defaults to fetching initialPages (2 pages = ~40 items per category)
   * @param {Object} [options={}]
   * @param {number} [options.initialPages=2]
   * @param {string} [options.language]
   * @param {Array<string>} [options.categories]
   * @returns {Promise<Object|null>}
   */
  loadFilmsFeed = async ({
    initialPages = 2,
    language = this.language,
    force = false,
    categories = [
      'animation',
      'adventure',
      'action',
      'comedy',
      'crime',
      'drama',
      'sciFi',
      'fantasy',
      'horror',
      'romance',
      'sagas',
      'thriller'
    ]
  } = {}) => {
    if (!force && this.state.feedLoaded) {
      return this.state;
    }
    return this.runAsync(
      'loadFilmsFeed',
      async () => {
        const pagesToFetch = Array.from({ length: Math.max(1, initialPages) }, (_, i) => i + 1);

        const trendingPromise = this.repository.getTrendingMovies({ timeWindow: 'month', onlyReleased: true, language });
        const upcomingPromises = pagesToFetch.map((page) =>
          this.repository.getUpcomingMovies({ page, language })
        );

        const categoryPromises = [];
        categories.forEach((catKey) => {
          pagesToFetch.forEach((page) => {
            categoryPromises.push({
              catKey,
              page,
              promise: this.repository.getMoviesByCategory(catKey, { page, language })
            });
          });
        });

        const [trendingRes, upcomingResults, ...categoryResults] = await Promise.all([
          trendingPromise.catch((e) => {
            console.warn('[MovieViewModel] Failed to load trending movies:', e);
            return { results: [] };
          }),
          Promise.allSettled(upcomingPromises),
          ...categoryPromises.map((item) =>
            item.promise
              .then((res) => ({ catKey: item.catKey, page: item.page, status: 'fulfilled', value: res }))
              .catch((err) => ({ catKey: item.catKey, page: item.page, status: 'rejected', reason: err }))
          )
        ]);

        const trendingMovies = trendingRes?.results || [];

        // Raggruppa film in arrivo (deduplicati per ID)
        const rawUpcoming = [];
        let upcomingTotalPages = 1;
        upcomingResults.forEach((res) => {
          if (res.status === 'fulfilled' && res.value?.results) {
            rawUpcoming.push(...res.value.results);
            if (res.value.total_pages) upcomingTotalPages = Math.max(upcomingTotalPages, res.value.total_pages);
          }
        });
        const upcomingMovies = Array.from(new Map(rawUpcoming.map((m) => [m.id, m])).values());

        const categoryMovies = {
          upcoming: upcomingMovies
        };
        const categoryPagination = {
          upcoming: {
            page: initialPages,
            totalPages: upcomingTotalPages,
            hasMore: initialPages < upcomingTotalPages,
            loadingMore: false
          }
        };
        const stateUpdate = {
          trendingMovies,
          upcomingMovies
        };

        // Raggruppa per ciascuna categoria
        categories.forEach((catKey) => {
          const catBatch = categoryResults.filter((r) => r.catKey === catKey);
          const rawCatMovies = [];
          let catTotalPages = 1;

          catBatch.forEach((res) => {
            if (res.status === 'fulfilled' && res.value?.results) {
              rawCatMovies.push(...res.value.results);
              if (res.value.total_pages) catTotalPages = Math.max(catTotalPages, res.value.total_pages);
            }
          });

          const uniqueMovies = Array.from(new Map(rawCatMovies.map((m) => [m.id, m])).values());
          categoryMovies[catKey] = uniqueMovies;
          stateUpdate[`${catKey}Movies`] = uniqueMovies;
          categoryPagination[catKey] = {
            page: initialPages,
            totalPages: catTotalPages,
            hasMore: initialPages < catTotalPages,
            loadingMore: false
          };
        });

        stateUpdate.categoryMovies = categoryMovies;
        stateUpdate.categoryPagination = categoryPagination;
        stateUpdate.feedLoaded = true;
        return stateUpdate;
      },
      (feed) => feed
    );
  };

  /**
   * Load more movies on-demand for a specific category or upcoming when scrolling near end
   * @param {string} categoryKey
   * @returns {Promise<Array<import('../../models/Movie.js').Movie>|null>}
   */
  loadMoreCategoryMovies = async (categoryKey) => {
    const currentPagination = this.state.categoryPagination?.[categoryKey] || {
      page: 1,
      totalPages: 1,
      hasMore: true,
      loadingMore: false
    };

    if (currentPagination.loadingMore || currentPagination.hasMore === false) {
      return null;
    }

    const nextPage = (currentPagination.page || 1) + 1;

    this.setState({
      categoryPagination: {
        ...this.state.categoryPagination,
        [categoryKey]: {
          ...currentPagination,
          loadingMore: true
        }
      }
    });

    try {
      const res = categoryKey === 'upcoming'
        ? await this.repository.getUpcomingMovies({ page: nextPage, language: this.language })
        : await this.repository.getMoviesByCategory(categoryKey, { page: nextPage, language: this.language });

      const newResults = res?.results || [];
      const stateProp = categoryKey === 'upcoming' ? 'upcomingMovies' : `${categoryKey}Movies`;
      const currentList = this.state[stateProp] || [];
      const merged = Array.from(new Map([...currentList, ...newResults].map((m) => [m.id, m])).values());
      const totalPages = res?.total_pages || currentPagination.totalPages;

      this.setState({
        [stateProp]: merged,
        categoryMovies: {
          ...this.state.categoryMovies,
          [categoryKey]: merged
        },
        categoryPagination: {
          ...this.state.categoryPagination,
          [categoryKey]: {
            page: nextPage,
            totalPages,
            hasMore: nextPage < totalPages,
            loadingMore: false
          }
        }
      });

      return merged;
    } catch (error) {
      console.error(`[MovieViewModel] Error loading page ${nextPage} for ${categoryKey}:`, error);
      this.setState({
        categoryPagination: {
          ...this.state.categoryPagination,
          [categoryKey]: {
            ...currentPagination,
            loadingMore: false
          }
        }
      });
      return null;
    }
  };

  /**
   * Load trending movies (with strictly released filter)
   * @param {Object} [params={}]
   * @returns {Promise<Object|null>}
   */
  loadTrendingMovies = async (params = {}) => {
    const language = params.language || this.language;
    return this.runAsync(
      'loadTrendingMovies',
      () => this.repository.getTrendingMovies({ timeWindow: 'month', onlyReleased: true, ...params, language }),
      (res) => {
        const today = new Date().toISOString().slice(0, 10);
        const releasedResults = (res.results || []).filter((movie) => {
          const release = movie.releaseDate || movie.release_date;
          return !release || release <= today;
        });

        return this.mapPaginatedResult('trendingMovies', {
          ...res,
          results: releasedResults,
          total_results: releasedResults.length
        });
      }
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
  };

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
   * Set active language and refresh feed if already loaded
   * @param {string} language
   */
  setLanguage = (language) => {
    const prevLang = this._language;
    const normalized = this.normalizeLanguage(language);
    if (normalized !== prevLang) {
      this._language = normalized;
      this.setState({ language: normalized });
      if (this.state.feedLoaded) {
        this.loadFilmsFeed({ initialPages: 2, language: normalized, force: true });
      }
    }
  };

  /**
   * Reset currently selected movie
   */
  clearSelection = () => {
    this.setState({ selectedMovie: null });
  };
}

export default MovieViewModel;
