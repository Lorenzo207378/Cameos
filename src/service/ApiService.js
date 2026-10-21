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
    this._enrichWithImageUrls(data);

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
   * Helper to fetch list endpoints (discover, trending, search) with dual language posters (it + en)
   * @param {string} endpoint
   * @param {Record<string, any>} params
   * @returns {Promise<any>}
   */
  async _fetchDualLanguageList(endpoint, params = {}) {
    const [itData, enData] = await Promise.all([
      this.fetch(endpoint, { ...params, language: 'it-IT' }),
      this.fetch(endpoint, { ...params, language: 'en-US' })
    ]);

    const enMap = new Map((enData.results || []).map((item) => [item.id, item]));

    const results = (itData.results || []).map((itItem) => {
      const enItem = enMap.get(itItem.id);

      const itPoster = itItem.posterUrl?.it || itItem.posterUrl?.en;
      const enPoster = enItem?.posterUrl?.en || enItem?.posterUrl?.it;

      const itBackdrop = itItem.backdropUrl?.it || itItem.backdropUrl?.en;
      const enBackdrop = enItem?.backdropUrl?.en || enItem?.backdropUrl?.it;

      itItem.posterUrl = {
        it: itPoster || enPoster || 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile',
        en: enPoster || itPoster || 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile'
      };

      itItem.backdropUrl = {
        it: itBackdrop || enBackdrop || 'https://via.placeholder.com/780x440?text=Immagine+Non+Disponibile',
        en: enBackdrop || itBackdrop || 'https://via.placeholder.com/780x440?text=Immagine+Non+Disponibile'
      };

      return itItem;
    });

    return {
      ...itData,
      results
    };
  }

  /**
   * GET /discover/tv
   * @param {Record<string, any>} params
   */
  discoverTv(params = {}) {
    return this._fetchDualLanguageList('/discover/tv', params);
  }

  /**
   * GET /discover/movie
   * @param {Record<string, any>} params
   */
  discoverMovie(params = {}) {
    return this._fetchDualLanguageList('/discover/movie', params);
  }

  /**
   * GET /trending/tv/{time_window}
   * @param {'day' | 'week'} timeWindow
   * @param {Record<string, any>} params
   */
  getTrendingTv(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/tv/${timeWindow}`, params);
  }

  /**
   * GET /trending/movie/{time_window}
   * @param {'day' | 'week'} timeWindow
   * @param {Record<string, any>} params
   */
  getTrendingMovie(timeWindow = 'week', params = {}) {
    return this._fetchDualLanguageList(`/trending/movie/${timeWindow}`, params);
  }

  /**
   * GET /search/tv
   * @param {Record<string, any>} params
   */
  searchTv(params = {}) {
    return this._fetchDualLanguageList('/search/tv', params);
  }

  /**
   * GET /search/movie
   * @param {Record<string, any>} params
   */
  searchMovie(params = {}) {
    return this._fetchDualLanguageList('/search/movie', params);
  }

  /**
   * GET /tv/{series_id}
   * @param {number|string} seriesId
   * @param {Record<string, any>} params
   */
  getTvSeriesDetails(seriesId, params = {}) {
    const append = params.append_to_response ? `${params.append_to_response},images` : 'aggregate_credits,images';
    return this.fetch(`/tv/${seriesId}`, {
      include_image_language: 'it,en,null',
      ...params,
      append_to_response: append
    });
  }

  /**
   * Alias for getTvSeriesDetails
   */
  getTvDetails(seriesId, params = {}) {
    return this.getTvSeriesDetails(seriesId, params);
  }

  /**
   * GET /movie/{movie_id}
   * @param {number|string} movieId
   * @param {Record<string, any>} params
   */
  getMovieDetails(movieId, params = {}) {
    const append = params.append_to_response ? `${params.append_to_response},images` : 'credits,images';
    return this.fetch(`/movie/${movieId}`, {
      include_image_language: 'it,en,null',
      ...params,
      append_to_response: append
    });
  }

  /**
   * GET /tv/{series_id}/season/{season_number}
   * @param {number|string} seriesId
   * @param {number|string} seasonNumber
   * @param {Record<string, any>} params
   */
  getSeasonDetails(seriesId, seasonNumber, params = {}) {
    const append = params.append_to_response ? `${params.append_to_response},images` : 'aggregate_credits,images';
    return this.fetch(`/tv/${seriesId}/season/${seasonNumber}`, {
      include_image_language: 'it,en,null',
      ...params,
      append_to_response: append
    });
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
    if (typeof path === 'string' && (path.startsWith('http://') || path.startsWith('https://'))) {
      return path;
    }
    return `${this.imageBaseUrl}/${size}${path}`;
  }

  /**
   * Recursively traverses response JSON, composes full image URLs for both IT and EN,
   * and completely removes all relative *_path, raw_*_path, and duplicate *_url fields.
   * @param {any} data
   * @returns {any}
   */
  _enrichWithImageUrls(data) {
    if (!data || typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        this._enrichWithImageUrls(data[i]);
      }
      return data;
    }

    // 1. If images gallery is present (from append_to_response=images)
    if (data.images && typeof data.images === 'object') {
      const itPoster = data.images.posters?.find((p) => p.iso_639_1 === 'it')?.file_path;
      const enPoster = data.images.posters?.find((p) => p.iso_639_1 === 'en')?.file_path;
      const defaultPoster = data.poster_path || data.images.posters?.[0]?.file_path;

      data.posterUrl = {
        it: this.getImageUrl(itPoster || defaultPoster || enPoster, 'w500'),
        en: this.getImageUrl(enPoster || defaultPoster || itPoster, 'w500')
      };

      const itBackdrop = data.images.backdrops?.find((b) => b.iso_639_1 === 'it')?.file_path;
      const enBackdrop = data.images.backdrops?.find((b) => b.iso_639_1 === 'en')?.file_path;
      const textlessBackdrop = data.images.backdrops?.find((b) => b.iso_639_1 === null)?.file_path;
      const defaultBackdrop = data.backdrop_path || textlessBackdrop || data.images.backdrops?.[0]?.file_path;

      data.backdropUrl = {
        it: this.getImageUrl(itBackdrop || defaultBackdrop || enBackdrop, 'w780'),
        en: this.getImageUrl(enBackdrop || defaultBackdrop || itBackdrop, 'w780')
      };

      const itLogo = data.images.logos?.find((l) => l.iso_639_1 === 'it')?.file_path;
      const enLogo = data.images.logos?.find((l) => l.iso_639_1 === 'en')?.file_path;
      const defaultLogo = data.logo_path || data.images.logos?.[0]?.file_path;

      if (itLogo || enLogo || defaultLogo) {
        data.logoUrl = {
          it: this.getImageUrl(itLogo || defaultLogo || enLogo, 'w185'),
          en: this.getImageUrl(enLogo || defaultLogo || itLogo, 'w185')
        };
      }

      delete data.images;
    }

    // 2. Standard poster_path -> posterUrl { it, en }
    if ('poster_path' in data && !data.posterUrl) {
      const url = this.getImageUrl(data.poster_path, 'w500');
      data.posterUrl = {
        it: url,
        en: url
      };
    }

    // 3. Standard backdrop_path -> backdropUrl { it, en }
    if ('backdrop_path' in data && !data.backdropUrl) {
      const url = this.getImageUrl(data.backdrop_path, 'w780');
      data.backdropUrl = {
        it: url,
        en: url
      };
    }

    // 4. Profile path (actors / guest stars) -> profileUrl { it, en }
    if ('profile_path' in data && !data.profileUrl) {
      const url = this.getImageUrl(data.profile_path, 'w185');
      data.profileUrl = {
        it: url,
        en: url
      };
    }

    // 5. Still path (episodes) -> stillUrl { it, en }
    if ('still_path' in data && !data.stillUrl) {
      const url = this.getImageUrl(data.still_path, 'w300');
      data.stillUrl = {
        it: url,
        en: url
      };
    }

    // 6. Logo path (companies / networks) -> logoUrl { it, en }
    if ('logo_path' in data && !data.logoUrl) {
      const url = this.getImageUrl(data.logo_path, 'w185');
      data.logoUrl = {
        it: url,
        en: url
      };
    }

    // 7. Strictly delete all relative path and duplicate url fields
    delete data.poster_path;
    delete data.raw_poster_path;
    delete data.poster_url;
    delete data.backdrop_path;
    delete data.raw_backdrop_path;
    delete data.backdrop_url;
    delete data.profile_path;
    delete data.raw_profile_path;
    delete data.profile_url;
    delete data.still_path;
    delete data.raw_still_path;
    delete data.still_url;
    delete data.logo_path;
    delete data.raw_logo_path;
    delete data.logo_url;

    // Recursively process nested structures
    for (const key of Object.keys(data)) {
      if (data[key] && typeof data[key] === 'object') {
        this._enrichWithImageUrls(data[key]);
      }
    }

    return data;
  }
}

// Export singleton instance for direct import
export const apiService = new ApiService();
export default ApiService;
