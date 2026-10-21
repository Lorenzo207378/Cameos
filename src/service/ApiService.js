/**
 * ApiService.js
 * Centralized service for TMDB API v3 communication.
 * Handles HTTP GET requests, authorization, language query parameters, and sessionStorage caching.
 */

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export class ApiService {
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
    return (
      this._token ||
      (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_TMDB_API_TOKEN || import.meta.env.VITE_TMDB_READ_TOKEN)) ||
      (typeof globalThis !== 'undefined' && globalThis.process?.env && (globalThis.process.env.VITE_TMDB_API_TOKEN || globalThis.process.env.VITE_TMDB_READ_TOKEN)) ||
      ''
    );
  }

  set token(token) {
    this._token = token;
  }

  /**
   * Set or update authorization token dynamically
   * @param {string} token
   */
  setToken(token) {
    this._token = token;
  }

  /**
   * Safe check for browser sessionStorage
   * @returns {Storage | null}
   */
  _getSessionStorage() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage;
      }
    } catch {
      // SecurityException in some iframe / sandboxed environments
    }
    return null;
  }

  /**
   * Base fetch method with automatic caching and bearer authentication
   * @param {string} endpoint - API path (e.g. '/discover/tv')
   * @param {Record<string, any>} params - Query parameters
   * @param {object} options - Options { noCache: boolean, headers: object }
   * @returns {Promise<any>}
   */
  async fetch(endpoint, params = {}, options = {}) {
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${formattedEndpoint}`);

    // Set default language if not explicitly provided
    if (!('language' in params) && this.defaultLanguage) {
      url.searchParams.append('language', this.defaultLanguage);
    }

    // Append non-empty query params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });

    const cache = this._getSessionStorage();
    const cacheKey = `tmdb_${url.toString()}`;

    // Read from cache if allowed
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

    const headers = {
      accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
      ...(options.headers || {})
    };

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`TMDB API Error [${response.status} ${response.statusText}] at ${formattedEndpoint}: ${errorText}`);
    }

    const data = await response.json();

    // Cache successful response
    if (!options.noCache && cache) {
      try {
        cache.setItem(cacheKey, JSON.stringify(data));
      } catch {
        // Handle QuotaExceededError silently
      }
    }

    return data;
  }

  // =================================================================
  // Raw TMDB Endpoints
  // =================================================================

  /**
   * GET /discover/tv
   * @param {Record<string, any>} params
   */
  discoverTv(params = {}) {
    return this.fetch('/discover/tv', params);
  }

  /**
   * GET /discover/movie
   * @param {Record<string, any>} params
   */
  discoverMovie(params = {}) {
    return this.fetch('/discover/movie', params);
  }

  /**
   * GET /trending/tv/{time_window}
   * @param {'day' | 'week'} timeWindow
   * @param {Record<string, any>} params
   */
  getTrendingTv(timeWindow = 'week', params = {}) {
    return this.fetch(`/trending/tv/${timeWindow}`, params);
  }

  /**
   * GET /trending/movie/{time_window}
   * @param {'day' | 'week'} timeWindow
   * @param {Record<string, any>} params
   */
  getTrendingMovie(timeWindow = 'week', params = {}) {
    return this.fetch(`/trending/movie/${timeWindow}`, params);
  }

  /**
   * GET /search/tv
   * @param {Record<string, any>} params
   */
  searchTv(params = {}) {
    return this.fetch('/search/tv', params);
  }

  /**
   * GET /search/movie
   * @param {Record<string, any>} params
   */
  searchMovie(params = {}) {
    return this.fetch('/search/movie', params);
  }

  /**
   * GET /tv/{series_id}
   * @param {number|string} seriesId
   * @param {Record<string, any>} params (e.g. { append_to_response: 'aggregate_credits' })
   */
  getTvSeriesDetails(seriesId, params = {}) {
    return this.fetch(`/tv/${seriesId}`, params);
  }

  /**
   * GET /movie/{movie_id}
   * @param {number|string} movieId
   * @param {Record<string, any>} params (e.g. { append_to_response: 'credits' })
   */
  getMovieDetails(movieId, params = {}) {
    return this.fetch(`/movie/${movieId}`, params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {Record<string, any>} params (e.g. { append_to_response: 'aggregate_credits' })
   */
  getSeasonDetails(seriesId, seasonNumber, params = {}) {
    return this.fetch(`/tv/${seriesId}/season/${seasonNumber}`, params);
  }

  /**
   * GET /tv/{series_id}/season/{season_number}/episode/{episode_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {number|string} episodeNumber
   * @param {Record<string, any>} params (e.g. { append_to_response: 'credits' })
   */
  getEpisodeDetails(seriesId, seasonNumber, episodeNumber, params = {}) {
    return this.fetch(`/tv/${seriesId}/season/${seasonNumber}/episode/${episodeNumber}`, params);
  }

  /**
   * GET /person/{person_id}
   * @param {number|string} personId
   * @param {Record<string, any>} params (e.g. { append_to_response: 'tv_credits' })
   */
  getPersonDetails(personId, params = {}) {
    return this.fetch(`/person/${personId}`, params);
  }

  /**
   * Build complete image URL
   * @param {string|null} path
   * @param {'w92'|'w154'|'w185'|'w300'|'w342'|'w500'|'w780'|'original'} size
   * @returns {string}
   */
  getImageUrl(path, size = 'w500') {
    if (!path) {
      return 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile';
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }
}

// Export singleton instance for direct import
export const apiService = new ApiService();
export default ApiService;
