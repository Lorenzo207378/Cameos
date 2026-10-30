import {BaseViewModel} from '../BaseViewModel.js';
import {movieRepository as defaultMovieRepository} from '../../repository/movies/MovieRepository.js';
import {isUpcomingMovie} from '../../models/index.js';

export const DEFAULT_MOVIE_CATEGORIES = Object.freeze([
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
    'thriller',
    'war'
]);

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
 * @property {Record<string, { page: number, totalPages: number, hasMore: boolean, loadingMore: boolean }>} categoryPagination
 * @property {boolean} feedLoaded
 * @property {Array<import('../../models/Movie.js').Movie>} searchResults
 * @property {import('../../models/Movie.js').Movie|null} selectedMovie
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
                warMovies: [],
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
            filterFn: isUpcomingMovie,
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
     * Load movies for a list of categories in parallel by invoking loadMoviesFromCategory for each category.
     * @param {Array<string>} [categories]
     * @param {Object} [options={}]
     * @returns {Promise<Record<string, Array<import('../../models/Movie.js').Movie>>>}
     */
    loadMoviesFromCategoryList = async (
        categories = DEFAULT_MOVIE_CATEGORIES,
        options = {}
    ) => {
        const results = await Promise.all(
            categories.map(async (catKey) => {
                try {
                    const movies = await this.loadMoviesFromCategory(catKey, options);
                    return [catKey, movies || []];
                } catch (err) {
                    console.warn(`[MovieViewModel] Failed to load category ${catKey}:`, err);
                    return [catKey, []];
                }
            })
        );

        return Object.fromEntries(results);
    };

    /**
     * Load media page feed in parallel: trending, upcoming and all major categories.
     * Reorganized into distinct delegated calls: loadTrendingMovies, loadUpcomingMovies and loadMoviesFromCategoryList.
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
        categories = DEFAULT_MOVIE_CATEGORIES
    } = {}) => {
        if (!force && this.state.feedLoaded) {
            return this.state;
        }

        return await this.runAsync(
            'loadFilmsFeed',
            async () => {
                await Promise.all([
                    this.loadTrendingMovies({ timeWindow: 'month', onlyReleased: true, language }),
                    this.loadUpcomingMovies({ initialPages, language }),
                    this.loadMoviesFromCategoryList(categories, { initialPages, language })
                ]);

                this.setState({ feedLoaded: true });
                return this.state;
            },
            () => ({ feedLoaded: true })
        );
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
        return await this.runAsync(
            'searchMovies',
            () => this.repository.searchMovies({query, page, language}),
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
        return await this.runAsync(
            'searchMoviesByGenre',
            () => this.repository.searchMoviesByGenre({genreId, page, language}),
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
        return await this.runAsync(
            'loadMovieDetails',
            () => this.repository.getMovieDetails({movieId, appendCredits, language}),
            (selectedMovie) => ({selectedMovie})
        );
    };

    /**
     * Set active language and refresh feed if already loaded
     * @param {string} language
     */
    setLanguage = (language) => {
        const prevLang = this.language;
        const normalized = this.normalizeLanguage(language);
        if (normalized !== prevLang) {
            this._language = normalized;
            this.setState({language: normalized});
            if (this.state.feedLoaded) {
                this.loadFilmsFeed({initialPages: 2, language: normalized, force: true});
            }
        }
    };

    /**
     * Reset currently selected movie
     */
    clearSelection = () => {
        this.setState({selectedMovie: null});
    };
}

export default MovieViewModel;
