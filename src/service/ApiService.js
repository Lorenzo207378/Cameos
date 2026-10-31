/// <reference types="vite/client" />
import { DEFAULT_LANGUAGE } from '../utils/languages.js';
import {
    enrichWithImageUrls,
    fetchLanguagesDetail,
    fetchLanguagesEpisode,
    fetchLanguagesList
} from './ApiServiceHelpers.js';

/**
 * ApiService.js
 * Centralized service for TMDB API v3 communication.
 * Handles HTTP GET requests, authorization, query parameters, and image URL formatting.
 */

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';
const MAX_CONCURRENT_REQUESTS = 10;

/**
 * Extract TMDB v3 32-hex API key from a v4 JWT Read Access Token ('aud' claim) if present.
 * Using ?api_key=... without an Authorization header turns GET calls into CORS Simple Requests,
 * eliminating browser OPTIONS preflight requests and preventing preflight rate-limit failures.
 * @param {string} token
 * @returns {string}
 */
function extractApiKeyFromJwt(token) {
    if (!token || typeof token !== 'string') return '';
    const parts = token.trim().split('.');
    if (parts.length !== 3) return '';
    try {
        const rawBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const paddedBase64 = rawBase64.padEnd(rawBase64.length + ((4 - (rawBase64.length % 4)) % 4), '=');
        const json = typeof atob === 'function'
            ? atob(paddedBase64)
            : globalThis.Buffer?.from(paddedBase64, 'base64').toString('utf8');
        if (!json) return '';
        const payload = JSON.parse(json);
        if (typeof payload?.aud === 'string' && /^[0-9a-f]{32}$/i.test(payload.aud)) {
            return payload.aud;
        }
    } catch {
        // Ignore non-JWT or malformed tokens
    }
    return '';
}

/**
 * Normalize a 32-hex v3 API key or extract it from a v4 JWT token ('aud' claim)
 * @param {string|null|undefined} value
 * @returns {string}
 */
function normalizeOrExtractApiKey(value) {
    if (!value || typeof value !== 'string') return '';
    const trimmed = value.trim();
    if (/^[0-9a-f]{32}$/i.test(trimmed)) {
        return trimmed;
    }
    return extractApiKeyFromJwt(trimmed);
}

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
        if (this._token) {
            return this._token;
        }

        // Check Vite / ESM environment safely
        try {
            if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TMDB_API_TOKEN) {
                return import.meta.env.VITE_TMDB_API_TOKEN;
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

    /**
     * Run a network task through the concurrency limiter
     * @template T
     * @param {() => Promise<T>} task
     * @returns {Promise<T>}
     */
    _scheduleRequest(task) {
        return new Promise((resolve, reject) => {
            const execute = async () => {
                this._activeRequests++;
                try {
                    resolve(await task());
                } catch (err) {
                    reject(err);
                } finally {
                    this._activeRequests--;
                    if (this._requestQueue.length > 0) {
                        const next = this._requestQueue.shift();
                        next();
                    }
                }
            };

            if (this._activeRequests < MAX_CONCURRENT_REQUESTS) {
                execute();
            } else {
                this._requestQueue.push(execute);
            }
        });
    }

    /**
     * Base fetch method with remote request construction, CORS-simple auth, deduplication, and retry
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

        const hasCustomHeaders = options.headers && Object.keys(options.headers).length > 0;
        const resolvedApiKey = this.apiKey;
        const useSimpleCorsQuery = Boolean(resolvedApiKey && !hasCustomHeaders);

        if (useSimpleCorsQuery && !url.searchParams.has('api_key')) {
            url.searchParams.append('api_key', resolvedApiKey);
        }

        const requestKey = `${url.toString()}|${hasCustomHeaders ? JSON.stringify(options.headers) : ''}`;

        let rawPromise = this._inflightRequests.get(requestKey);
        if (!rawPromise) {
            rawPromise = this._scheduleRequest(async () => {
                const performFetch = async (forceBearer = false) => {
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
                };

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
            });

            this._inflightRequests.set(requestKey, rawPromise);
            rawPromise.finally(() => {
                this._inflightRequests.delete(requestKey);
            }).catch(() => {});
        }

        const rawData = await rawPromise;
        const data = typeof structuredClone === 'function'
            ? structuredClone(rawData)
            : JSON.parse(JSON.stringify(rawData));
        enrichWithImageUrls(this, data);

        return data;
    }

    /**
     * GET /discover/tv
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    discoverTv(params = {}) {
        return fetchLanguagesList(this, '/discover/tv', params);
    }

    /**
     * GET /discover/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    discoverMovie(params = {}) {
        return fetchLanguagesList(this, '/discover/movie', params);
    }

    /**
     * GET /discover/movie with primary_release_date.gte >= today (upcoming movies)
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
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
     * @returns {Promise<any>}
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
     * @returns {Promise<any>}
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
     * @returns {Promise<any>}
     */
    searchTv(params = {}) {
        return fetchLanguagesList(this, '/search/tv', params);
    }

    /**
     * GET /search/movie
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    searchMovie(params = {}) {
        return fetchLanguagesList(this, '/search/movie', params);
    }

    searchMoviesByGenre(params = {}) {
        return fetchLanguagesList(this, '/discover/movie', {...params, with_genres: params.genreId});
    }

    /**
     * GET /tv/{series_id}
     * @param {number|string} seriesId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getTvSeriesDetails(seriesId, params = {}) {
        return fetchLanguagesDetail(this, `/tv/${seriesId}`, 'aggregate_credits', params);
    }

    /**
     * GET /movie/{movie_id}
     * @param {number|string} movieId
     * @param {Record<string, any>} [params={}]
     * @returns {Promise<any>}
     */
    getMovieDetails(movieId, params = {}) {
        return fetchLanguagesDetail(this, `/movie/${movieId}`, 'credits', params);
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
