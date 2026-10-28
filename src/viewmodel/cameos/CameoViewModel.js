import {BaseViewModel} from '../BaseViewModel.js';
import {cameoRepository as defaultCameoRepository} from '../../repository/cameos/CameoRepository.js';

/**
 * @typedef {Object} CameoViewModelState
 * @property {Array<import('../../models/Series.js').Series>} cameoHeavySeries
 * @property {Array<import('../../models/Movie.js').Movie>} cameoHeavyMovies
 * @property {{ movie: import('../../models/Movie.js').Movie|null, cameos: Array<import('../../models/Cameo.js').Cameo>, allCast: Array<import('../../models/Cameo.js').Cameo> }} movieCameos
 * @property {Array<{ movie: import('../../models/Movie.js').Movie|Object, cameos: Array<import('../../models/Cameo.js').Cameo> }>} moviesCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} famousCameos
 * @property {{ page: number, totalPages: number, hasMore: boolean, loadingMore: boolean }} famousCameosPagination
 * @property {{ episode: Object|null, cameos: Array<import('../../models/Cameo.js').Cameo>, allGuestStars: Array<Object> }} episodeCameos
 * @property {{ season: Object|null, episodesWithCameos: Array<Object>, seasonCameos: Array<import('../../models/Cameo.js').Cameo> }} seasonCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} seriesVipCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorMovieCameos
 * @property {Array<import('../../models/Cameo.js').Cameo>} actorCareerCameos
 * @property {boolean} loading
 * @property {string|null} error
 * @property {boolean} isOffline
 * @property {string} language
 */

/**
 * CameoViewModel
 * MVVM ViewModel mediating between CameoRepository and Cameo UI components.
 * Holds observable state for cameo-heavy series/movies, episode/season/series/movie cameos, and actor career cameos.
 */
export class CameoViewModel extends BaseViewModel {
    /** @type {import('../../repository/cameos/CameoRepository.js').CameoRepository} */
    repository;

    /**
     * @param {import('../../repository/cameos/CameoRepository.js').CameoRepository} [repository]
     * @param {Object} [options={}]
     * @param {string} [options.language='it-IT']
     */
    constructor(repository = defaultCameoRepository, options = {}) {
        super(
            {
                cameoHeavySeries: [],
                cameoHeavyMovies: [],
                movieCameos: {movie: null, cameos: [], allCast: []},
                moviesCameos: [],
                famousCameos: [],
                famousCameosPagination: { page: 1, totalPages: 1, hasMore: true, loadingMore: false },
                episodeCameos: {episode: null, cameos: [], allGuestStars: []},
                seasonCameos: {season: null, episodesWithCameos: [], seasonCameos: []},
                seriesVipCameos: [],
                actorMovieCameos: [],
                actorCareerCameos: []
            },
            options
        );
        this.repository = repository;
    }

    /**
     * Convenience getter for typed state
     * @override
     * @returns {CameoViewModelState}
     */
    get state() {
        return /** @type {CameoViewModelState} */ (super.state);
    }

    /**
     * Load TV series known for frequent cameos
     * @param {Object} [params={}]
     * @returns {Promise<Object|null>}
     */
    loadCameoHeavySeries = async (params = {}) => {
        const language = params.language || this.language;
        return await this.runAsync(
            'loadCameoHeavySeries',
            () => this.repository.getCameoHeavySeries({...params, language}),
            (response) => ({
                cameoHeavySeries: response.results || []
            })
        );
    };

    /**
     * Load movies known for frequent cameos
     * @param {Object} [params={}]
     * @returns {Promise<Object|null>}
     */
    loadCameoHeavyMovies = async (params = {}) => {
        const language = params.language || this.language;
        return await this.runAsync(
            'loadCameoHeavyMovies',
            () => this.repository.getCameoHeavyMovies({...params, language}),
            (response) => ({
                cameoHeavyMovies: response.results || []
            })
        );
    };

    /**
     * Load cameos detected in a single movie
     * @param {number|string} movieId
     * @param {number} [minPopularity=8]
     * @param {string} [language]
     * @returns {Promise<Object|null>}
     */
    loadMovieCameos = async (movieId, minPopularity = 8, language = this.language) => {
        return await this.runAsync(
            `loadMovieCameos_${movieId}`,
            () => this.repository.getMovieCameos({movieId, minPopularity, language}),
            (result) => ({
                movieCameos: result
            })
        );
    };

    /**
     * Load cameos for a list of movies concurrently
     * @param {Array<import('../../models/Movie.js').Movie|Object|number|string>} movies
     * @param {number} [minPopularity=8]
     * @param {string} [language]
     * @returns {Promise<Array<{ movie: import('../../models/Movie.js').Movie|Object, cameos: Array<import('../../models/Cameo.js').Cameo> }>>}
     */
    loadMoviesCameos = async (movies = [], minPopularity = 8, language = this.language) => {
        return await this.runAsync(
            'loadMoviesCameos',
            async () => {
                return await Promise.all(
                    movies.map(async (movie) => {
                        const movieId = typeof movie === 'object' ? movie?.id : movie;
                        const movieObj = typeof movie === 'object' ? movie : {id: movieId};
                        if (!movieId) return {movie: movieObj, cameos: []};
                        try {
                            const res = await this.repository.getMovieCameos({movieId, minPopularity, language});
                            return {
                                movie: res?.movie || movieObj,
                                cameos: res?.cameos || []
                            };
                        } catch (err) {
                            console.warn(`[CameoViewModel] Failed to load cameos for movie ${movieId}:`, err);
                            return {movie: movieObj, cameos: []};
                        }
                    })
                );
            },
            (moviesCameos) => ({
                moviesCameos: moviesCameos || []
            })
        );
    };

    /**
     * Load top famous movie cameos by fetching legendary cinema cameos hydrated with TMDb data
     * @param {Object|number} [paramsOrLimit=8]
     * @param {string} [language]
     * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>>}
     */
    loadFamousCameos = async (paramsOrLimit = 8, language = this.language) => {
        const page = typeof paramsOrLimit === 'object' ? (paramsOrLimit.page || 1) : 1;
        const limit = typeof paramsOrLimit === 'object' ? (paramsOrLimit.limit || 8) : (Number(paramsOrLimit) || 8);
        const lang = typeof paramsOrLimit === 'object' ? (paramsOrLimit.language || language) : language;

        return await this.runAsync(
            'loadFamousCameos',
            async () => {
                const res = await this.repository.getFamousCameos({ page, limit, language: lang });
                return res?.results || (Array.isArray(res) ? res : []);
            },
            (cameosList) => {
                const totalCount = this.repository.getFamousCameosTotalCount ? this.repository.getFamousCameosTotalCount() : 48;
                const pageSize = 8;
                const actualPage = Math.max(1, Math.ceil((cameosList?.length || limit) / pageSize));
                const totalPages = Math.ceil(totalCount / pageSize);
                return {
                    famousCameos: cameosList || [],
                    famousCameosPagination: {
                        page: actualPage,
                        totalPages: Math.max(totalPages, actualPage + 1),
                        hasMore: true,
                        loadingMore: false
                    }
                };
            }
        );
    };

    /**
     * Load next page of famous movie cameos and append to observable state
     * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
     */
    loadMoreFamousCameos = async () => {
        const pagination = this.state.famousCameosPagination || {
            page: 1,
            totalPages: 1,
            hasMore: true,
            loadingMore: false
        };

        if (pagination.loadingMore || pagination.hasMore === false) {
            return null;
        }

        const nextPage = (pagination.page || 1) + 1;

        this.setState({
            famousCameosPagination: {
                ...pagination,
                loadingMore: true
            }
        });

        try {
            const res = await this.repository.getFamousCameos({
                page: nextPage,
                limit: 8,
                language: this.language
            });

            const newCameos = res?.results || (Array.isArray(res) ? res : []);
            const totalPages = res?.totalPages || Math.max(pagination.totalPages, nextPage + 1);
            const hasMore = res?.hasMore ?? (newCameos.length > 0);

            const existingIds = new Set((this.state.famousCameos || []).map((c) => `${c.id}_${c.mediaId}`));
            const uniqueNew = newCameos.filter((c) => !existingIds.has(`${c.id}_${c.mediaId}`));

            this.setState({
                famousCameos: [...(this.state.famousCameos || []), ...uniqueNew],
                famousCameosPagination: {
                    page: nextPage,
                    totalPages,
                    hasMore,
                    loadingMore: false
                }
            });

            return newCameos;
        } catch (err) {
            console.error('[CameoViewModel] Failed to load more famous cameos:', err);
            this.setState({
                famousCameosPagination: {
                    ...pagination,
                    loadingMore: false
                }
            });
            return null;
        }
    };

    /**
     * Synchronous helper to get cached cameos for a media ID
     * @param {number|string} mediaId
     * @returns {Array<import('../../models/Cameo.js').Cameo>}
     */
    getCameosForMedia = (mediaId) => {
        const id = Number(mediaId);
        if (!id) return [];
        const fromList = this.state.moviesCameos?.find((item) => Number(item?.movie?.id || item?.movieId || item?.id) === id);
        if (fromList?.cameos?.length) return fromList.cameos;
        if (Number(this.state.movieCameos?.movie?.id) === id && this.state.movieCameos?.cameos?.length) {
            return this.state.movieCameos.cameos;
        }
        return [];
    };

    /**
     * Load cameos detected in a TV episode
     * @param {number|string} seriesId
     * @param {number|string} seasonNumber
     * @param {number|string} episodeNumber
     * @param {number} [minPopularity=12]
     * @param {string} [language]
     * @returns {Promise<Object|null>}
     */
    loadEpisodeCameos = async (seriesId, seasonNumber, episodeNumber, minPopularity = 12, language = this.language) => {
        return await this.runAsync(
            'loadEpisodeCameos',
            () => this.repository.getEpisodeCameos({seriesId, seasonNumber, episodeNumber, minPopularity, language}),
            (result) => ({
                episodeCameos: result
            })
        );
    };

    /**
     * Load cameos across all episodes of a season
     * @param {number|string} seriesId
     * @param {number|string} seasonNumber
     * @param {number} [minPopularity=12]
     * @param {string} [language]
     * @returns {Promise<Object|null>}
     */
    loadSeasonCameos = async (seriesId, seasonNumber, minPopularity = 12, language = this.language) => {
        return await this.runAsync(
            'loadSeasonCameos',
            () => this.repository.getSeasonCameos({seriesId, seasonNumber, minPopularity, language}),
            (result) => ({
                seasonCameos: result
            })
        );
    };

    /**
     * Load VIP cameos across an entire TV series
     * @param {number|string} seriesId
     * @param {number} [maxEpisodes=2]
     * @param {number} [minPopularity=10]
     * @param {string} [language]
     * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
     */
    loadSeriesVipCameos = async (seriesId, maxEpisodes = 2, minPopularity = 10, language = this.language) => {
        return await this.runAsync(
            'loadSeriesVipCameos',
            () => this.repository.getSeriesVipCameos({seriesId, maxEpisodes, minPopularity, language}),
            (list) => ({
                seriesVipCameos: list || []
            })
        );
    };

    /**
     * Load career movie cameos for a specific actor
     * @param {number|string} personId
     * @param {string} [language]
     * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
     */
    loadActorMovieCameos = async (personId, language = this.language) => {
        return await this.runAsync(
            'loadActorMovieCameos',
            () => this.repository.getActorMovieCameos({personId, language}),
            (list) => ({
                actorMovieCameos: list || []
            })
        );
    };

    /**
     * Load career TV cameos for a specific actor
     * @param {number|string} personId
     * @param {string} [language]
     * @returns {Promise<Array<import('../../models/Cameo.js').Cameo>|null>}
     */
    loadActorCareerCameos = async (personId, language = this.language) => {
        return await this.runAsync(
            'loadActorCareerCameos',
            () => this.repository.getActorCareerCameos({personId, language}),
            (list) => ({
                actorCareerCameos: list || []
            })
        );
    };
}

export default CameoViewModel;
