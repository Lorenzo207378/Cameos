import { BaseViewModel } from '../BaseViewModel.js';
import { movieRepository as defaultMovieRepository } from '../../repository/movies/MovieRepository.js';
import { isMediaUpcoming } from '../../models/utils/index.js';
import { MOVIE_CATEGORY_CONFIG } from '../../utils/mediaCategories.js';

const allMovieCategoryKeys = Object.keys(MOVIE_CATEGORY_CONFIG);
const movieCategoryKeys = allMovieCategoryKeys.filter((key) => key !== 'upcoming');

/**
 * @typedef {Object} MovieViewModelState
 * @property {Array<import('../../models/Movie.js').Movie>} moviesList
 * @property {Array<import('../../models/Movie.js').Movie>} trendingMovies
 * @property {Array<import('../../models/Movie.js').Movie>} upcomingMovies
 * @property {Array<import('../../models/Movie.js').Movie>} actionMovies
 * @property {Array<import('../../models/Movie.js').Movie>} comedyMovies
 * @property {Array<import('../../models/Movie.js').Movie>} romanceMovies
 * @property {Array<import('../../models/Movie.js').Movie>} crimeMovies
 * @property {Array<import('../../models/Movie.js').Movie>} sciFiMovies
 * @property {Array<import('../../models/Movie.js').Movie>} fantasyMovies
 * @property {Array<import('../../models/Movie.js').Movie>} horrorMovies
 * @property {Array<import('../../models/Movie.js').Movie>} sagasMovies
 * @property {Array<import('../../models/Movie.js').Movie>} dramaMovies
 * @property {Array<import('../../models/Movie.js').Movie>} animationMovies
 * @property {Array<import('../../models/Movie.js').Movie>} thrillerMovies
 * @property {Array<import('../../models/Movie.js').Movie>} adventureMovies
 * @property {Array<import('../../models/Movie.js').Movie>} warMovies
 * @property {Record<string, Array<import('../../models/Movie.js').Movie>>} categoryMovies
 * @property {Record<string, { page: number, totalPages: number, hasMore: boolean, loadingMore: boolean, loading?: boolean, error?: string|null }>} categoryPagination
 * @property {boolean} feedLoaded
 * @property {Array<import('../../models/Movie.js').Movie>} searchResults
 * @property {import('../../models/Movie.js').Movie|null} selectedMovie
 * @property {number|string|null} requestedMovieId
 * @property {number} page
 * @property {number} totalPages
 * @property {number} totalResults
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * MovieViewModel
 * MVVM ViewModel mediating between MovieRepository and Movie UI components.
 * Holds observable state for movie discovery, trending, search, and full movie details.
 */
export class MovieViewModel extends BaseViewModel {
    /** @type {import('../../repository/movies/MovieRepository.js').MovieRepository} */
    repository;

    /**
     * @param {import('../../repository/movies/MovieRepository.js').MovieRepository} [repository]
     * @param {Object} [options={}]
     * @param {string} [options.language='it-IT']
     */
    constructor(repository = defaultMovieRepository, options = {}) {
        super(
            {
                ...BaseViewModel.buildCategoryInitialState(allMovieCategoryKeys, 'Movies', 'categoryMovies'),
                moviesList: [],
                trendingMovies: [],
                searchResults: [],
                selectedMovie: null,
                requestedMovieId: null,
                page: 1,
                totalPages: 0,
                totalResults: 0
            },
            options
        );
        this.repository = repository;
    }

    /**
     * Convenience getter for typed state
     * @override
     * @returns {MovieViewModelState}
     */
    get state() {
        return /** @type {MovieViewModelState} */ (super.state);
    }

    /**
     * Discover and filter movies
     * @param {Object} [params={}]
     * @returns {Promise<Object|null>}
     */
    discoverMovies = async (params = {}) => {
        const language = params.language || this.language;
        return await this.runAsync(
            'discoverMovies',
            () => this.repository.discoverMovies({...params, language}),
            (res) => this.mapPaginatedResult('moviesList', res)
        );
    };

    /**
     * Load upcoming movies whose release date is strictly in the future and status is not released.
     * Handles both initial load (single or multi-page) and incremental pagination via { append: true }.
     * @param {Object} [params={}]
     * @param {number} [params.page]
     * @param {number} [params.initialPages=1]
     * @param {boolean} [params.append=false]
     * @param {string} [params.language]
     * @returns {Promise<Array<import('../../models/Movie.js').Movie>>}
     */
    loadUpcomingMovies = async (params = {}) => {
        const language = params.language || this.language;
        return this.loadPagination({
            categoryKey: 'upcoming',
            stateProp: 'upcomingMovies',
            paginationMapProp: 'categoryPagination',
            asyncKey: 'loadUpcomingMovies',
            fetchPage: (page) => this.repository.getUpcomingMovies({...params, page, language}),
            filterFn: isMediaUpcoming,
            params
        });
    };

    /**
     * Load movies for a specific category key (e.g. comedy, romance, action, upcoming, etc.)
     * Handles both initial load and incremental pagination via { append: true }.
     * @param {string} categoryKey
     * @param {Object} [params={}]
     * @param {number} [params.page]
     * @param {number} [params.initialPages=1]
     * @param {boolean} [params.append=false]
     * @param {string} [params.language]
     * @returns {Promise<Array<import('../../models/Movie.js').Movie>>}
     */
    loadMoviesFromCategory = async (categoryKey, params = {}) => {
        if (categoryKey === 'upcoming') {
            return await this.loadUpcomingMovies(params);
        }

        const language = params.language || this.language;
        return this.loadPagination({
            categoryKey,
            stateProp: `${categoryKey}Movies`,
            paginationMapProp: 'categoryPagination',
            groupedListProp: 'categoryMovies',
            asyncKey: `loadCategory_${categoryKey}`,
            fetchPage: (page) => this.repository.getMoviesByCategory(categoryKey, {...params, page, language}),
            params
        });
    };


    /**
     * Load movies for a list of categories in parallel
     * @param {Array<string>} [categories]
     * @param {Object} [options={}]
     * @returns {Promise<Record<string, Array<import('../../models/Movie.js').Movie>>>}
     */
    loadMoviesFromCategoryList = async (
        categories = movieCategoryKeys,
        options = {}
    ) => {
        return this._loadCategoryList(
            categories,
            (catKey) => this.loadMoviesFromCategory(catKey, options),
            'MovieViewModel'
        );
    };

    /**
     * Load media page feed in parallel: trending, upcoming and all major categories.
     * @param {Object} [options={}]
     * @param {number} [options.initialPages=2]
     * @param {string} [options.language]
     * @param {boolean} [options.force=false]
     * @param {Array<string>} [options.categories]
     * @returns {Promise<Object|null>}
     */
    loadFilmsFeed = async ({
                               initialPages = 2,
                               language = this.language,
                               force = false,
                               categories = movieCategoryKeys
                           } = {}) => {
        return this._loadMediaFeed('loadFilmsFeed', [
            this.loadTrendingMovies({timeWindow: 'month', onlyReleased: true, language, force}),
            this.loadUpcomingMovies({initialPages, language, force, retainPages: !force}),
            this.loadMoviesFromCategoryList(categories, {initialPages, language, force, retainPages: !force})
        ]);
    };

    /**
     * Load trending movies (with strictly released filter)
     * @param {Object} [params={}]
     * @returns {Promise<Object|null>}
     */
    loadTrendingMovies = async (params = {}) => {
        const language = params.language || this.language;
        return await this.runAsync(
            'loadTrendingMovies',
            () => this.repository.getTrendingMovies({timeWindow: 'month', onlyReleased: true, ...params, language}),
            (res) => this.mapPaginatedResult('trendingMovies', res)
        );
    };

    /**
     * Search movies by title, genre, actor or director. Existing positional title calls remain valid.
     * @param {string|import('../../utils/search.js').MediaSearchParams} query
     * @param {number} [page=1]
     * @param {string} [language]
     * @returns {Promise<Object|null>}
     */
    searchMovies = async (query, page = 1, language = this.language) => {
        const params = this._mediaSearchInput(query, page, language);
        return this.runSearch(() => this.repository.searchMovies(params));
    };

    /**
     * Search movies by genre ID or localized name.
     * @param {number|string|import('../../utils/search.js').MediaSearchParams} genreId
     * @param {number} [page=1]
     * @param {string} [language]
     * @returns {Promise<Object|null>}
     */
    searchMoviesByGenre = async (genreId, page = 1, language = this.language) => {
        return this.searchMovies(this._mediaSearchInput(genreId, page, language, 'genre'));
    };

    /** Search movies using a person name, ID, or MediaSearchParams. */
    searchMoviesByActor = async (actor, page = 1, language = this.language) => {
        return this.searchMovies(this._mediaSearchInput(actor, page, language, 'actor'));
    };

    /** Search only Director credits, using a person name, ID, or MediaSearchParams. */
    searchMoviesByDirector = async (director, page = 1, language = this.language) => {
        return this.searchMovies(this._mediaSearchInput(director, page, language, 'director'));
    };

    /**
     * Load full movie details by ID
     * @param {number|string} movieId
     * @param {boolean} [appendCredits=true]
     * @param {string} [language]
     * @returns {Promise<import('../../models/Movie.js').Movie|null>}
     */
    loadMovieDetails = async (movieId, appendCredits = true, language = this.language) => {
        return await this.runAsync(
            'loadMovieDetails',
            () => {
                this.setState({requestedMovieId: movieId});
                return this.repository.getMovieDetails({movieId, appendCredits, language});
            },
            (selectedMovie) => ({selectedMovie})
        );
    };

    /** Distinguish an unrequested route from a completed request without waiting for unrelated operations. */
    isMovieLoading = (movieId) => this._isRouteEntityLoading('loadMovieDetails', this.state.requestedMovieId, movieId);

    /**
     * Reset currently selected movie
     */
    clearSelection = () => {
        this.setState({selectedMovie: null, requestedMovieId: null});
    };
}

export default MovieViewModel;
