/// <reference types="vite/client" />
import { IMAGE_PLACEHOLDERS } from '../models/index.js';

/**
 * ApiService.js
 * Centralized service for TMDB API v3 communication.
 * Handles HTTP GET requests, authorization, query parameters, and image URL formatting.
 */

/**
 * @typedef {Object} ImageFieldRule
 * @property {string} pathKey
 * @property {string} rawKey
 * @property {string} snakeUrlKey
 * @property {string} targetKey
 * @property {string} size
 */

/**
 * @typedef {Object} TmdbGalleryImage
 * @property {string|null} [iso_639_1]
 * @property {string} [file_path]
 */

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

/** @type {readonly ImageFieldRule[]} */
const IMAGE_FIELD_RULES = Object.freeze([
  { pathKey: 'poster_path', rawKey: 'raw_poster_path', snakeUrlKey: 'poster_url', targetKey: 'posterUrl', size: 'w500' },
  { pathKey: 'backdrop_path', rawKey: 'raw_backdrop_path', snakeUrlKey: 'backdrop_url', targetKey: 'backdropUrl', size: 'w780' },
  { pathKey: 'profile_path', rawKey: 'raw_profile_path', snakeUrlKey: 'profile_url', targetKey: 'profileUrl', size: 'w185' },
  { pathKey: 'still_path', rawKey: 'raw_still_path', snakeUrlKey: 'still_url', targetKey: 'stillUrl', size: 'w300' },
  { pathKey: 'logo_path', rawKey: 'raw_logo_path', snakeUrlKey: 'logo_url', targetKey: 'logoUrl', size: 'w185' }
]);

export class ApiService {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.baseUrl]
   * @param {string} [options.imageBaseUrl]
   * @param {string|null} [options.token=null]
   * @param {string} [options.defaultLanguage='it-IT']
   */
  constructor({ baseUrl = DEFAULT_BASE_URL, imageBaseUrl = DEFAULT_IMAGE_BASE_URL, token = null, defaultLanguage = 'it-IT' } = {}) {
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
      const meta = /** @type {any} */ (typeof import.meta !== 'undefined' ? import.meta : null);
      const viteToken = meta?.['env']?.['VITE_TMDB_API_TOKEN'] || meta?.env?.VITE_TMDB_API_TOKEN;
      if (viteToken) {
        return viteToken;
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
    this._enrichWithImageUrls(data);

    return data;
  }

  // =================================================================
  // Raw TMDB Endpoints
  // =================================================================

  /**
   * Helper to fetch list endpoints (discover, trending, search) with dual language posters (it + en)
   * while respecting the caller's requested primary metadata language.
   * @param {string} endpoint
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  async _fetchDualLanguageList(endpoint, params = {}) {
    const requestedLang = String(params.language || this.defaultLanguage || 'it-IT').toLowerCase();
    const isEnglishPrimary = requestedLang.startsWith('en');

    const [itData, enData] = await Promise.all([
      this.fetch(endpoint, { ...params, language: 'it-IT' }),
      this.fetch(endpoint, { ...params, language: 'en-US' })
    ]);

    const itMap = new Map((itData.results || []).map((item) => [item.id, item]));
    const enMap = new Map((enData.results || []).map((item) => [item.id, item]));
    const primaryData = isEnglishPrimary ? enData : itData;

    const results = (primaryData.results || []).map((primaryItem) => {
      const itItem = itMap.get(primaryItem.id);
      const enItem = enMap.get(primaryItem.id);

      const itPoster = itItem?.posterUrl?.it || itItem?.posterUrl?.en;
      const enPoster = enItem?.posterUrl?.en || enItem?.posterUrl?.it;

      const itBackdrop = itItem?.backdropUrl?.it || itItem?.backdropUrl?.en;
      const enBackdrop = enItem?.backdropUrl?.en || enItem?.backdropUrl?.it;

      return {
        ...primaryItem,
        posterUrl: {
          it: itPoster || enPoster || IMAGE_PLACEHOLDERS.POSTER,
          en: enPoster || itPoster || IMAGE_PLACEHOLDERS.POSTER
        },
        backdropUrl: {
          it: itBackdrop || enBackdrop || IMAGE_PLACEHOLDERS.BACKDROP,
          en: enBackdrop || itBackdrop || IMAGE_PLACEHOLDERS.BACKDROP
        }
      };
    });

    return {
      ...primaryData,
      results
    };
  }

  /**
   * Helper to append `images` and `include_image_language` for detail endpoints
   * @param {string} endpoint
   * @param {string} defaultAppend
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  _fetchWithImages(endpoint, defaultAppend, params = {}) {
    const append = params.append_to_response ? `${params.append_to_response},images` : `${defaultAppend},images`;
    return this.fetch(endpoint, {
      include_image_language: 'it,en,null',
      ...params,
      append_to_response: append
    });
  }

  /**
   * GET /discover/tv
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  discoverTv(params = {}) {
    return this._fetchDualLanguageList('/discover/tv', params);
  }

  /**
   * GET /discover/movie
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  discoverMovie(params = {}) {
    return this._fetchDualLanguageList('/discover/movie', params);
  }

  /**
   * GET /trending/tv/{time_window}
   * @param {string} [timeWindow='week']
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getTrendingTv(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/tv/${timeWindow}`, params);
  }

  /**
   * GET /trending/movie/{time_window}
   * @param {string} [timeWindow='week']
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getTrendingMovie(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/movie/${timeWindow}`, params);
  }

  /**
   * GET /search/tv
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  searchTv(params = {}) {
    return this._fetchDualLanguageList('/search/tv', params);
  }

  /**
   * GET /search/movie
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  searchMovie(params = {}) {
    return this._fetchDualLanguageList('/search/movie', params);
  }

  searchMoviesByGenre(params = {}) {
    return this._fetchDualLanguageList('/discover/movie', { ...params, with_genres: params.genreId });
  }

  /**
   * GET /tv/{series_id}
   * @param {number|string} seriesId
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getTvSeriesDetails(seriesId, params = {}) {
    return this._fetchWithImages(`/tv/${seriesId}`, 'aggregate_credits', params);
  }

  /**
   * GET /movie/{movie_id}
   * @param {number|string} movieId
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getMovieDetails(movieId, params = {}) {
    return this._fetchWithImages(`/movie/${movieId}`, 'credits', params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getSeasonDetails(seriesId, seasonNumber, params = {}) {
    return this._fetchWithImages(`/tv/${seriesId}/season/${seasonNumber}`, 'aggregate_credits', params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}/episode/{episode_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {Record<string, any>} [params={}]
   * @returns {Promise<any>}
   */
  getEpisodeDetails(seriesId, seasonNumber, episodeNumber, params = {}) {
    return this.fetch(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, params);
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
    if (!path) {
      return IMAGE_PLACEHOLDERS.POSTER;
    }
    if (typeof path === 'string' && path.startsWith('https://')) {
      return path;
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }

  /**
   * Build dual-language `{ it, en }` URL pair from TMDB gallery items (`posters`, `backdrops`, `logos`)
   * @param {Array<TmdbGalleryImage|Record<string, any>>} [items=[]]
   * @param {string|null} [defaultPath=null]
   * @param {string} [size='w500']
   * @param {boolean} [preferTextlessFallback=false]
   * @returns {{ it: string, en: string }}
   */
  _buildGalleryImagePair(items = [], defaultPath = null, size = 'w500', preferTextlessFallback = false) {
    const itPath = items.find((img) => img.iso_639_1 === 'it')?.file_path;
    const enPath = items.find((img) => img.iso_639_1 === 'en')?.file_path;
    const textlessPath = preferTextlessFallback ? items.find((img) => img.iso_639_1 === null)?.file_path : null;
    const fallbackPath = defaultPath || textlessPath || items[0]?.file_path;

    return {
      it: this.getImageUrl(itPath || fallbackPath || enPath, size),
      en: this.getImageUrl(enPath || fallbackPath || itPath, size)
    };
  }

  /**
   * Recursively traverses response JSON, composes full image URLs for both IT and EN,
   * and removes all relative `*_path`, `raw_*_path`, and duplicate `*_url` fields.
   * @param {any} data
   * @returns {any}
   */
  _enrichWithImageUrls(data) {

    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      for (const item of data) {
        this._enrichWithImageUrls(item);
      }
      return data;
    }

    if (data.images && typeof data.images === 'object') {
      const { posters = [], backdrops = [], logos = [] } = data.images;
      data.posterUrl = this._buildGalleryImagePair(posters, data.poster_path, 'w500', false);
      data.backdropUrl = this._buildGalleryImagePair(backdrops, data.backdrop_path, 'w780', true);

      if (logos.length > 0 || data.logo_path) {
        data.logoUrl = this._buildGalleryImagePair(logos, data.logo_path, 'w185', false);
      }
      delete data.images;
    }

    for (const rule of IMAGE_FIELD_RULES) {
      if (rule.pathKey in data && !data[rule.targetKey]) {
        const url = this.getImageUrl(data[rule.pathKey], rule.size);
        data[rule.targetKey] = { it: url, en: url };
      }
      delete data[rule.pathKey];
      delete data[rule.rawKey];
      delete data[rule.snakeUrlKey];
    }

    for (const value of Object.values(data)) {
      if (value && typeof value === 'object') {
        this._enrichWithImageUrls(value);
      }
    }

    return data;
  }
}

export const apiService = new ApiService();
export default ApiService;
