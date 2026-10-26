/// <reference types="vite/client" />
import {
    enrichWithImageUrls,
    fetchDualLanguageDetail,
    fetchDualLanguageEpisode,
    fetchDualLanguageList,
    getImageUrl
} from './ApiServiceHelpers.js';

/**
 * ApiService.js
 * Centralized service for TMDB API v3 communication.
 * Handles HTTP GET requests, authorization, query parameters, and image URL formatting.
 */

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export class ApiService {
    /**
     * @param {Object} [options={}]
     * @param {string} [options.baseUrl]
     * @param {string} [options.imageBaseUrl]
     * @param {string|null} [options.token=null]
     * @param {string} [options.defaultLanguage='it-IT']
     */
    constructor({
                    baseUrl = DEFAULT_BASE_URL,
                    imageBaseUrl = DEFAULT_IMAGE_BASE_URL,
                    token = null,
                    defaultLanguage = 'it-IT'
                } = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.imageBaseUrl = imageBaseUrl.replace(/\/+$/, '');
        this.defaultLanguage = defaultLanguage;
        this._token = token;
    }

    /**
     * Resolve token dynamically from instance field, Vite env, or process env
     * @returns {string}
     */
    get token() {
        if (this._token) {
            return this._token;
        }

        //CONTROLLARE

        // Check Vite / ESM environment safely
        try {
            if (typeof import.meta !== 'undefined' && import.meta.env) {
                const viteToken = import.meta.env.VITE_TMDB_API_TOKEN || import.meta.env.VITE_TMDB_ACCESS_TOKEN;
                if (viteToken) {
                    return viteToken;
                }
            }
        } catch {
            // Ignore reference errors in non-ESM environments
        }

        // Check Node / process environment safely without triggering no-undef
        try {
            const globalProc = typeof globalThis !== 'undefined' ? globalThis['process'] : null;
            const nodeToken = globalProc?.['env']?.['VITE_TMDB_API_TOKEN'] || globalProc?.env?.VITE_TMDB_API_TOKEN;
            if (nodeToken) {
                return nodeToken;
            }
        } catch {
            // Ignore reference errors in browser environments
        }

        return '';
    }

    /**
     * Set or update authorization token dynamically
     * @param {string|null} token
     */
    setToken(token) {
        this._token = token;
    }

    /**
     * Set or update default language ('it-IT', 'en-US', etc.)
     * @param {string} language
     */
    setLanguage(language) {
        this.defaultLanguage = language;
    }

    /**
     * Get current default language
     * @returns {string}
     */
    getLanguage() {
        return this.defaultLanguage;
    }

    /**
     * Base fetch method with remote request construction and bearer authentication
     * @param {string} endpoint - API path (e.g. '/discover/tv')
     * @param {Record<string, any>} [params={}] - Query parameters
     * @param {{ headers?: Record<string, string> }} [options={}] - Request options
     * @returns {Promise<any>}
     */
    async fetch(endpoint, params = {}, options = {}) {
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = new URL(`${this.baseUrl}${formattedEndpoint}`);

        if (!('language' in params) && this.defaultLanguage) {
            url.searchParams.append('language', this.defaultLanguage);
        }

        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value));
            }
        }

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${this.token}`,
                ...(options.headers || {})
            }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`TMDB API Error [${response.status} ${response.statusText}] at ${formattedEndpoint}: ${errorText}`);
        }

        const data = await response.json();
        enrichWithImageUrls(this, data);

        return data;
    }

    /**
     * GET /discover/tv
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    discoverTv(params = {}) {
        return fetchDualLanguageList(this, '/discover/tv', params);
    }

    /**
     * GET /discover/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    discoverMovie(params = {}) {
        return fetchDualLanguageList(this, '/discover/movie', params);
    }

    /**
     * GET /discover/movie with primary_release_date.gte >= today (upcoming movies)
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getUpcomingMovies(params = {}) {
        const today = new Date().toISOString().slice(0, 10);
        return fetchDualLanguageList(this, '/discover/movie', {
            sort_by: 'popularity.desc',
            'primary_release_date.gte': today,
            ...params
        });
    }

    /**
     * GET /trending/tv/{time_window}
     * @param {string} [timeWindow='week']
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getTrendingTv(timeWindow = 'week', params = {}) {
        if (timeWindow === 'month') {
            const today = new Date().toISOString().slice(0, 10);
            const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            return fetchDualLanguageList(this, '/discover/tv', {
                sort_by: 'popularity.desc',
                'first_air_date.gte': pastMonth,
                'first_air_date.lte': today,
                ...params
            });
        }
        return fetchDualLanguageList(this, `/trending/tv/${timeWindow}`, params);
    }

    /**
     * GET /trending/movie/{time_window}
     * @param {string} [timeWindow='week']
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getTrendingMovies(timeWindow = 'week', params = {}) {
        if (timeWindow === 'month') {
            const today = new Date().toISOString().slice(0, 10);
            const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            return fetchDualLanguageList(this, '/discover/movie', {
                sort_by: 'popularity.desc',
                'primary_release_date.gte': pastMonth,
                'primary_release_date.lte': today,
                ...params
            });
        }
        return fetchDualLanguageList(this, `/trending/movie/${timeWindow}`, params);
    }

    /**
     * GET /search/tv
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    searchTv(params = {}) {
        return fetchDualLanguageList(this, '/search/tv', params);
    }

    /**
     * GET /search/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    searchMovie(params = {}) {
        return fetchDualLanguageList(this, '/search/movie', params);
    }

    searchMoviesByGenre(params = {}) {
        return fetchDualLanguageList(this, '/discover/movie', {...params, with_genres: params.genreId});
    }

    /**
     * GET /tv/{series_id}
     * @param {number|string} seriesId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getTvSeriesDetails(seriesId, params = {}) {
        return fetchDualLanguageDetail(this, `/tv/${seriesId}`, 'aggregate_credits', params);
    }

    /**
     * GET /movie/{movie_id}
     * @param {number|string} movieId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getMovieDetails(movieId, params = {}) {
        return fetchDualLanguageDetail(this, `/movie/${movieId}`, 'credits', params);
    }

    /**
     * GET /tv/{series_id}/season/{season_number}
     * @param {number|string} seriesId
     * @param {number|string} seasonNumber
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getSeasonDetails(seriesId, seasonNumber, params = {}) {
        return fetchDualLanguageDetail(this, `/tv/${seriesId}/season/${seasonNumber}`, 'aggregate_credits', params);
    }

    /**
     * GET /tv/{series_id}/season/{season_number}/episode/{episode_number}
     * @param {number|string} seriesId
     * @param {number|string} seasonNumber
     * @param {number|string} episodeNumber
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    async getEpisodeDetails(seriesId, seasonNumber, episodeNumber, params = {}) {
        const endpoint = `/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`;
        return fetchDualLanguageEpisode(this, endpoint, params);
    }

    /**
     * GET /person/{person_id}
     * @param {number|string} personId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getPersonDetails(personId, params = {}) {
        return this.fetch(`/person/${personId}`, params);
    }

    /**
     * Build complete image URL
     * @param {string|null} path
     * @param {string} [size='w500']
     * @returns {string}
     */
    getImageUrl(path, size = 'w500') {
        return getImageUrl(this, path, size);
    }

    /**
     * Recursively traverses response JSON, composes full image URLs for both IT and EN,
     * and removes all relative `*_path`, `raw_*_path`, and duplicate `*_url` fields.
     * @param {any} data
     * @returns {any}
     */
    _enrichWithImageUrls(data) {
        return enrichWithImageUrls(this, data);
    }
}

export const apiService = new ApiService();
export default ApiService;
