import {BaseViewModel} from '../BaseViewModel.js';
import {movieRepository as defaultMovieRepository} from '../../repository/movies/MovieRepository.js';

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
     * Load upcoming movies whose release date is in the future
     * @param {Object} [params={}]
     * @returns {Promise<Array<import('../../models/Movie.js').Movie>>}
     */
    loadUpcomingMovies = async (params = {}) => {
        const language = params.language || this.language;
        const response = await this.runAsync(
            'loadUpcomingMovies',
            () => this.repository.getUpcomingMovies({...params, language}),
            (res) => this.mapPaginatedResult('upcomingMovies', res)
        );

        return response?.results || [];
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
        return await this.runAsync(
            `loadCategory_${categoryKey}`,
            () => this.repository.getMoviesByCategory(categoryKey, {...params, language}),
            (res) => {
                const items = res?.results || [];
                const page = res?.page || params.page || 1;
                const totalPages = res?.total_pages || 1;
                return {
                    [stateProp]: items,
                    categoryMovies: {
                        ...this.state.categoryMovies,
                        [categoryKey]: items
                    },
                    categoryPagination: {
                        ...this.state.categoryPagination,
                        [categoryKey]: {
                            page,
                            totalPages,
                            hasMore: page < totalPages,
                            loadingMore: false
                        }
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
     * @param {boolean} [options.force=false]
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
            'thriller',
            'war'
        ]
    } = {}) => {
        if (!force && this.state.feedLoaded) {
            return this.state;
        }
        return await this.runAsync(
            'loadFilmsFeed',
            async () => {
                const pagesToFetch = Array.from({length: Math.max(1, initialPages)}, (_, i) => i + 1);

                const trendingPromise = this.repository.getTrendingMovies({
                    timeWindow: 'month',
                    onlyReleased: true,
                    language
                });
                const upcomingPromises = pagesToFetch.map((page) =>
                    this.repository.getUpcomingMovies({page, language})
                );

                /** @type {Array<{ catKey: string, page: number, promise: Promise<any> }>} */
                const categoryPromises = [];
                categories.forEach((catKey) => {
                    pagesToFetch.forEach((page) => {
                        categoryPromises.push({
                            catKey,
                            page,
                            promise: this.repository.getMoviesByCategory(catKey, {page, language})
                        });
                    });
                });

                const [trendingRes, upcomingResults, ...categoryResults] = await Promise.all([
                    trendingPromise.catch((e) => {
                        console.warn('[MovieViewModel] Failed to load trending movies:', e);
                        return {results: []};
                    }),
                    Promise.allSettled(upcomingPromises),
                    ...categoryPromises.map((item) =>
                        item.promise
                            .then((res) => ({catKey: item.catKey, page: item.page, status: 'fulfilled', value: res}))
                            .catch((err) => ({catKey: item.catKey, page: item.page, status: 'rejected', reason: err}))
                    )
                ]);

                const trendingMovies = trendingRes?.results || [];

                // Raggruppa film in arrivo (deduplicati per ID)
                /** @type {Array<import('../../models/Movie.js').Movie>} */
                const rawUpcoming = [];
                let upcomingTotalPages = 1;
                upcomingResults.forEach((res) => {
                    if (res.status === 'fulfilled' && res.value?.results) {
                        rawUpcoming.push(...res.value.results);
                        if (res.value.total_pages) {
                            upcomingTotalPages = Math.max(upcomingTotalPages, res.value.total_pages);
                        }
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
                    /** @type {Array<import('../../models/Movie.js').Movie>} */
                    const rawCatMovies = [];
                    let catTotalPages = 1;

                    catBatch.forEach((res) => {
                        if (res.status === 'fulfilled' && res.value?.results) {
                            rawCatMovies.push(...res.value.results);
                            if (res.value.total_pages) {
                                catTotalPages = Math.max(catTotalPages, res.value.total_pages);
                            }
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
                ? await this.repository.getUpcomingMovies({page: nextPage, language: this.language})
                : await this.repository.getMoviesByCategory(categoryKey, {page: nextPage, language: this.language});

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
