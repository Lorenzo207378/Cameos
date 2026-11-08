/// <reference types="vite/client" />
import { DEFAULT_LANGUAGE } from '../utils/languages.js';
import {
    cloneApiPayload,
    createApiRequest,
    normalizeOrExtractApiKey,
    resolveApiToken,
    scheduleApiRequest,
    enrichWithImageUrls,
    fetchLanguagesDetail,
    fetchLanguagesEpisode,
    fetchLanguagesCredits,
    fetchLanguagesList
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
     * @param {string|null} [options.apiKey=null]
     * @param {string} [options.defaultLanguage='it-IT']
     */
    constructor({
                    baseUrl = DEFAULT_BASE_URL,
                    imageBaseUrl = DEFAULT_IMAGE_BASE_URL,
                    token = null,
                    apiKey = null,
                    defaultLanguage = DEFAULT_LANGUAGE
                } = {}) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.imageBaseUrl = imageBaseUrl.replace(/\/+$/, '');
        this.defaultLanguage = defaultLanguage;
        this._token = token;
        this._apiKey = apiKey;
        this._inflightRequests = new Map();
        this._activeRequests = 0;
        this._requestQueue = [];
    }

    /**
     * Resolve token dynamically from instance field, Vite env (VITE_TMDB_API_TOKEN), or process env
     * @returns {string}
     */
    get token() {
        return resolveApiToken(this._token);
    }

    /**
     * Resolve TMDB v3 32-hex API key extracted from VITE_TMDB_API_TOKEN JWT 'aud' claim
     * @returns {string}
     */
    get apiKey() {
        return normalizeOrExtractApiKey(this._apiKey) || normalizeOrExtractApiKey(this.token);
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

    /** Send one GET using the existing query-key or Bearer authorization policy. */
    async _performFetch(url, options, useSimpleCorsQuery, forceBearer = false) {
        if (useSimpleCorsQuery && !forceBearer) {
            // Simple GET without custom headers: avoids CORS OPTIONS preflight completely
            return fetch(url.toString(), { method: 'GET' });
        }
        const bearerUrl = new URL(url.toString());
        if (forceBearer) {
            bearerUrl.searchParams.delete('api_key');
        }
        return fetch(bearerUrl.toString(), {
            method: 'GET',
            headers: {
                accept: 'application/json',
                Authorization: `Bearer ${this.token}`,
                ...(options.headers || {})
            }
        });
    }

    /** Fetch JSON with one network retry and one retry for throttling or server errors. */
    async _fetchJson(url, formattedEndpoint, options, useSimpleCorsQuery) {
        const performFetch = (forceBearer) => this._performFetch(url, options, useSimpleCorsQuery, forceBearer);
        let response;
        try {
            response = await performFetch(false);
        } catch (networkErr) {
            // Retry once after brief backoff (and fallback to Bearer if simple query failed)
            await new Promise((r) => setTimeout(r, 200));
            response = await performFetch(Boolean(useSimpleCorsQuery && this.token)).catch(() => {
                throw networkErr;
            });
        }

        if (response.status === 429 || response.status >= 500) {
            await new Promise((r) => setTimeout(r, 300));
            response = await performFetch(false);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(`TMDB API Error [${response.status} ${response.statusText}] at ${formattedEndpoint}: ${errorText}`);
        }

        return response.json();
    }

    /**
     * Base fetch method with remote request construction, CORS-simple auth, deduplication, and retry
     * @param {string} endpoint - API path (e.g. '/discover/tv')
     * @param {Record<string, any>} [params={}] - Query parameters
     * @param {{ headers?: Record<string, string> }} [options={}] - Request options
     * @returns {Promise<any>}
     */
    async fetch(endpoint, params = {}, options = {}) {
        const { formattedEndpoint, url, useSimpleCorsQuery, requestKey } = createApiRequest(this, endpoint, params, options);

        let rawPromise = this._inflightRequests.get(requestKey);
        if (!rawPromise) {
            rawPromise = scheduleApiRequest(this, () =>
                this._fetchJson(url, formattedEndpoint, options, useSimpleCorsQuery)
            );

            this._inflightRequests.set(requestKey, rawPromise);
            rawPromise.finally(() => {
                this._inflightRequests.delete(requestKey);
            }).catch(() => {});
        }

        const rawData = await rawPromise;
        const data = cloneApiPayload(rawData);
        enrichWithImageUrls(this, data);

        return data;
    }

    /**
     * GET /discover/tv
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    discoverTv(params = {}) {
        return fetchLanguagesList(this, '/discover/tv', params);
    }

    /**
     * GET /discover/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    discoverMovie(params = {}) {
        return fetchLanguagesList(this, '/discover/movie', params);
    }

    /**
     * GET /discover/movie with primary_release_date.gte >= today (upcoming movies)
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    getUpcomingSeries(params = {}) {
        const today = new Date().toISOString().slice(0, 10);
        return fetchLanguagesList(this, '/discover/tv', {
            sort_by: 'popularity.desc',
            'first_air_date.gte': today,
            ...params
        });
    }

    /** @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>} */
    getUpcomingTv(params = {}) {
        return this.getUpcomingSeries(params);
    }

    /** @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>} */
    getUpcomingMovies(params = {}) {
        const today = new Date().toISOString().slice(0, 10);
        return fetchLanguagesList(this, '/discover/movie', {
            sort_by: 'popularity.desc',
            'primary_release_date.gte': today,
            ...params
        });
    }

    /**
     * GET /trending/tv/{time_window}
     * @param {string} [timeWindow='month']
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    getTrendingTv(timeWindow = 'month', params = {}) {
        if (timeWindow === 'month') {
            const today = new Date().toISOString().slice(0, 10);
            const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            return fetchLanguagesList(this, '/discover/tv', {
                sort_by: 'popularity.desc',
                'first_air_date.gte': pastMonth,
                'first_air_date.lte': today,
                ...params
            });
        }
        return fetchLanguagesList(this, `/trending/tv/${timeWindow}`, params);
    }

    /**
     * GET /trending/movie/{time_window}
     * @param {string} [timeWindow='month']
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    getTrendingMovies(timeWindow = 'month', params = {}) {
        if (timeWindow === 'month') {
            const today = new Date().toISOString().slice(0, 10);
            const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            return fetchLanguagesList(this, '/discover/movie', {
                sort_by: 'popularity.desc',
                'primary_release_date.gte': pastMonth,
                'primary_release_date.lte': today,
                ...params
            });
        }
        return fetchLanguagesList(this, `/trending/movie/${timeWindow}`, params);
    }

    /**
     * GET /search/tv
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    async searchTv(params = {}) {
        return fetchLanguagesList(this, '/search/tv', params);
    }

    /**
     * GET /search/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>}
     */
    async searchMovie(params = {}) {
        return fetchLanguagesList(this, '/search/movie', params);
    }

    /** @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>} */
    async searchSeriesByGenre(params = {}) {
        return fetchLanguagesList(this, '/discover/tv', {...params, with_genres: params.genreId});
    }

    /** @returns {Promise<import('./ApiServiceHelpers.js').ApiPage>} */
    async searchMoviesByGenre(params = {}) {
        return fetchLanguagesList(this, '/discover/movie', {...params, with_genres: params.genreId});
    }

    /** Search people by name; keep the original person names and relevance order. */
    async searchPeople(params = {}) {
        return this.fetch('/search/person', params);
    }

    /** Retrieve localized genre names for movie or TV search. */
    async getGenres(mediaType, params = {}) {
        return this.fetch(`/genre/${mediaType}/list`, params);
    }

    /** Retrieve cast/crew credits with localized media titles and artwork. */
    async getPersonMediaCredits(personId, mediaType, params = {}) {
        return fetchLanguagesCredits(this, `/person/${personId}/${mediaType}_credits`, params);
    }

    /**
     * GET /tv/{series_id}
     * @param {number|string} seriesId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getSeriesDetails(seriesId, params = {}) {
        return this.getTvSeriesDetails(seriesId, params);
    }

    getTvSeriesDetails(seriesId, params = {}) {
        return fetchLanguagesDetail(this, `/tv/${seriesId}`, 'aggregate_credits,watch/providers', params);
    }

    /**
     * GET /movie/{movie_id}
     * @param {number|string} movieId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getMovieDetails(movieId, params = {}) {
        return fetchLanguagesDetail(this, `/movie/${movieId}`, 'credits,watch/providers', params);
    }

    /**
     * GET /tv/{series_id}/season/{season_number}
     * @param {number|string} seriesId
     * @param {number|string} seasonNumber
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getSeasonDetails(seriesId, seasonNumber, params = {}) {
        return fetchLanguagesDetail(this, `/tv/${seriesId}/season/${seasonNumber}`, 'aggregate_credits', params);
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
        return fetchLanguagesEpisode(this, endpoint, params);
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

}

export const apiService = new ApiService();
export default ApiService;
