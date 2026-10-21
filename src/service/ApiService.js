import { IMAGE_PLACEHOLDERS } from '../models/modelUtils.js';

/**
 * ApiService.js
 * Centralized service for TMDB API v3 communication.
 * Handles HTTP GET requests, authorization, language query parameters, and sessionStorage caching.
 */

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

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
    const viteEnv = typeof import.meta !== 'undefined' ? import.meta.env : null;
    const nodeEnv = typeof globalThis !== 'undefined' ? globalThis.process?.env : null;
    return (
      this._token ||
      viteEnv?.VITE_TMDB_API_TOKEN ||
      viteEnv?.VITE_TMDB_READ_TOKEN ||
      nodeEnv?.VITE_TMDB_API_TOKEN ||
      nodeEnv?.VITE_TMDB_READ_TOKEN ||
      ''
    );
  }

  /**
   * @param {string|null} token
   */
  set token(token) {
    this._token = token;
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
   * Safe check for browser sessionStorage
   * @returns {Storage|null}
   */
  _getSessionStorage() {
    try {
      return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
    } catch {
      return null;
    }
  }

  /**
   * Base fetch method with automatic caching and bearer authentication
   * @param {string} endpoint - API path (e.g. '/discover/tv')
   * @param {Object} [params={}] - Query parameters
   * @param {Object} [options={}] - Options { noCache: boolean, headers: Object }
   * @returns {Promise<Object>}
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

    const cache = this._getSessionStorage();
    const cacheKey = `tmdb_${url.toString()}`;

    if (!options.noCache && cache) {
      const cached = cache.getItem(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          cache.removeItem(cacheKey);
        }
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

    if (!options.noCache && cache) {
      try {
        cache.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // Ignore storage quota errors
      }
    }

    return data;
  }

  // =================================================================
  // Raw TMDB Endpoints
  // =================================================================

  /**
   * Helper to fetch list endpoints (discover, trending, search) with dual language posters (it + en)
   * while respecting the caller's requested primary metadata language.
   * @param {string} endpoint
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
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
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
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
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  discoverTv(params = {}) {
    return this._fetchDualLanguageList('/discover/tv', params);
  }

  /**
   * GET /discover/movie
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  discoverMovie(params = {}) {
    return this._fetchDualLanguageList('/discover/movie', params);
  }

  /**
   * GET /trending/tv/{time_window}
   * @param {string} [timeWindow='week']
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getTrendingTv(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/tv/${timeWindow}`, params);
  }

  /**
   * GET /trending/movie/{time_window}
   * @param {string} [timeWindow='week']
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getTrendingMovie(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/movie/${timeWindow}`, params);
  }

  /**
   * GET /search/tv
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  searchTv(params = {}) {
    return this._fetchDualLanguageList('/search/tv', params);
  }

  /**
   * GET /search/movie
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  searchMovie(params = {}) {
    return this._fetchDualLanguageList('/search/movie', params);
  }

  /**
   * GET /tv/{series_id}
   * @param {number|string} seriesId
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getTvSeriesDetails(seriesId, params = {}) {
    return this._fetchWithImages(`/tv/${seriesId}`, 'aggregate_credits', params);
  }

  /**
   * Alias for getTvSeriesDetails
   * @param {number|string} seriesId
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getTvDetails(seriesId, params = {}) {
    return this.getTvSeriesDetails(seriesId, params);
  }

  /**
   * GET /movie/{movie_id}
   * @param {number|string} movieId
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getMovieDetails(movieId, params = {}) {
    return this._fetchWithImages(`/movie/${movieId}`, 'credits', params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getSeasonDetails(seriesId, seasonNumber, params = {}) {
    return this._fetchWithImages(`/tv/${seriesId}/season/${seasonNumber}`, 'aggregate_credits', params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}/episode/{episode_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
   */
  getEpisodeDetails(seriesId, seasonNumber, episodeNumber, params = {}) {
    return this.fetch(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, params);
  }

  /**
   * GET /person/{person_id}
   * @param {number|string} personId
   * @param {Object} [params={}]
   * @returns {Promise<Object>}
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
    if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }

  /**
   * Build dual-language `{ it, en }` URL pair from TMDB gallery items (`posters`, `backdrops`, `logos`)
   * @param {Array<Object>} [items=[]]
   * @param {string|null} [defaultPath=null]
   * @param {string} [size='w500']
   * @param {boolean} [preferTextlessFallback=false]
   * @returns {Object}
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
   * @param {*} data
   * @returns {*}
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
