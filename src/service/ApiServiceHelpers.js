import { IMAGE_PLACEHOLDERS, resolveLangKey } from '../models/utils/modelUtils.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_KEYS } from '../utils/languages.js';

/**
 * @typedef {Object} ApiPage
 * @property {number} page
 * @property {number} total_pages
 * @property {number} total_results
 * @property {Object[]} results
 */

const IMAGE_FIELD_RULES = Object.freeze([
  { pathKey: 'poster_path', rawKey: 'raw_poster_path', snakeUrlKey: 'poster_url', targetKey: 'posterUrl', size: 'w500', placeholder: IMAGE_PLACEHOLDERS.POSTER },
  { pathKey: 'backdrop_path', rawKey: 'raw_backdrop_path', snakeUrlKey: 'backdrop_url', targetKey: 'backdropUrl', size: 'w780', placeholder: IMAGE_PLACEHOLDERS.BACKDROP },
  { pathKey: 'profile_path', rawKey: 'raw_profile_path', snakeUrlKey: 'profile_url', targetKey: 'profileUrl', size: 'w185', placeholder: IMAGE_PLACEHOLDERS.PROFILE },
  { pathKey: 'still_path', rawKey: 'raw_still_path', snakeUrlKey: 'still_url', targetKey: 'stillUrl', size: 'w300', placeholder: IMAGE_PLACEHOLDERS.STILL },
  { pathKey: 'logo_path', rawKey: 'raw_logo_path', snakeUrlKey: 'logo_url', targetKey: 'logoUrl', size: 'w185', placeholder: IMAGE_PLACEHOLDERS.POSTER }
]);

function languagesMap(getValue, fallback = '') {
  const values = SUPPORTED_LANGUAGE_KEYS.map(getValue);
  const fallbackValue = values.find(Boolean) || fallback;
  return Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key, index) => [key, values[index] || fallbackValue]));
}

async function fetchLanguagesResponses(apiService, endpoint, params, fetcher, allowPartial = true) {
  const requests = SUPPORTED_LANGUAGES.map((language) => fetcher(apiService, endpoint, { ...params, language }));
  let responses;
  if (allowPartial) {
    const settled = await Promise.allSettled(requests);
    if (settled.every((response) => response.status === 'rejected')) throw settled[0].reason;
    responses = settled.map((response) => response.status === 'fulfilled' ? response.value : null);
  } else {
    responses = await Promise.all(requests);
  }
  const dataByLanguage = new Map(SUPPORTED_LANGUAGE_KEYS.map((key, index) => [key, responses[index]]));
  const requestedKey = resolveLangKey(params.language || apiService.defaultLanguage || DEFAULT_LANGUAGE);
  const primaryData = dataByLanguage.get(requestedKey) || responses.find(Boolean);
  return { dataByLanguage, primaryData };
}

/** @returns {Object} Localized API payload, retaining the endpoint-specific fields. */
function mergeLanguagesMedia(primaryData, dataByLanguage) {
  const data = { ...primaryData };
  // Remove scalar fields even when they arrived via the spread.
  delete data.title;
  delete data.name;
  const titles = languagesMap((key) => {
    const item = dataByLanguage.get(key);
    return item?.title || item?.name;
  });
  data.titles = titles;
  data.names = { ...titles };
  data.overview = languagesMap((key) => dataByLanguage.get(key)?.overview);
  for (const { targetKey, placeholder } of IMAGE_FIELD_RULES) {
    if ([...dataByLanguage.values()].some((item) => item?.[targetKey])) {
      data[targetKey] = languagesMap((key) => {
        const image = dataByLanguage.get(key)?.[targetKey];
        return typeof image === 'string' ? image : image?.[key];
      }, placeholder);
    }
  }
  return data;
}

/** @returns {Promise<ApiPage>} */
export async function fetchLanguagesList(apiService, endpoint, params = {}) {
  const { dataByLanguage, primaryData } = await fetchLanguagesResponses(
    apiService, endpoint, params, (service, path, query) => service.fetch(path, query), false
  );
  const itemsByLanguage = new Map([...dataByLanguage].map(([key, data]) => [
    key, new Map((data.results || []).map((item) => [item.id, item]))
  ]));
  const results = (primaryData.results || []).map((item) => mergeLanguagesMedia(
    item, new Map([...itemsByLanguage].map(([key, items]) => [key, items.get(item.id)]))
  ));
  return { ...primaryData, results };
}

function fetchWithImages(apiService, endpoint, defaultAppend, params = {}) {
  const append = [...new Set([
    ...(params.append_to_response ?? defaultAppend ?? '').split(',').filter(Boolean), 'images'
  ])].join(',');
  return apiService.fetch(endpoint, {
    include_image_language: [...SUPPORTED_LANGUAGE_KEYS, 'null'].join(','),
    ...params,
    append_to_response: append
  });
}

export async function fetchLanguagesDetail(apiService, endpoint, defaultAppend, params = {}) {
  const { dataByLanguage, primaryData } = await fetchLanguagesResponses(
    apiService, endpoint, params, (service, path, query) => fetchWithImages(service, path, defaultAppend, query)
  );
  const data = mergeLanguagesMedia(primaryData, dataByLanguage);
  for (const [field, key] of [['episodes', 'episode_number'], ['seasons', 'season_number']]) {
    const collections = new Map([...dataByLanguage].map(([language, item]) => [language, item?.[field]]));
    const primaryItems = primaryData[field] || [...collections.values()].find(Array.isArray);
    if (Array.isArray(primaryItems)) data[field] = mergeLanguagesCollection(primaryItems, collections, key);
  }
  data.taglines = languagesMap((key) => dataByLanguage.get(key)?.tagline);
  data.tagline = data.taglines[resolveLangKey(params.language || apiService.defaultLanguage)] || '';
  return data;
}

function mergeLanguagesCollection(primaryItems, collections, key) {
  const itemsByLanguage = new Map([...collections].map(([language, items]) => [
    language, new Map((Array.isArray(items) ? items : []).map((item) => [item[key], item]))
  ]));
  return primaryItems.map((item) => mergeLanguagesMedia(
    item, new Map([...itemsByLanguage].map(([language, items]) => [language, items.get(item[key])]))
  ));
}

/** Localize person credits without treating a person's name as a media title. */
export async function fetchLanguagesCredits(apiService, endpoint, params = {}) {
  const { dataByLanguage, primaryData } = await fetchLanguagesResponses(
    apiService, endpoint, params, (service, path, query) => service.fetch(path, query)
  );
  const data = { ...primaryData };
  for (const field of ['cast', 'crew']) {
    const collections = new Map([...dataByLanguage].map(([language, item]) => [language, item?.[field]]));
    data[field] = mergeLanguagesCollection(primaryData[field] || [], collections, 'id');
  }
  return data;
}

export async function fetchLanguagesEpisode(apiService, endpoint, params = {}) {
  const { dataByLanguage, primaryData } = await fetchLanguagesResponses(
    apiService, endpoint, params, (service, path, query) => service.fetch(path, query)
  );
  return mergeLanguagesMedia(primaryData, dataByLanguage);
}

function getImageUrl(apiService, path, size = 'w500', placeholder = IMAGE_PLACEHOLDERS.POSTER) {
  if (!path) return placeholder;
  if (typeof path === 'string' && path.startsWith('https://')) return path;
  return `${apiService.imageBaseUrl}/${size}${path}`;
}

function buildLanguagesGalleryImages(apiService, items = [], defaultPath = null, size = 'w500', preferTextlessFallback = false, placeholder) {
  const textlessPath = preferTextlessFallback ? items.find((img) => img.iso_639_1 === null)?.file_path : null;
  const fallbackPath = defaultPath || textlessPath || items[0]?.file_path;
  return Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [
    key, getImageUrl(apiService, items.find((img) => img.iso_639_1 === key)?.file_path || fallbackPath, size, placeholder)
  ]));
}

/**
 * Enrich arbitrary JSON payloads recursively using the configured image rules.
 * @param {import('./ApiService.js').ApiService} apiService
 * @param {Object<string, *>} data
 * @returns {Object<string, *>}
 */
export function enrichWithImageUrls(apiService, data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    data.forEach((item) => enrichWithImageUrls(apiService, item));
    return data;
  }
  if (data.images && typeof data.images === 'object') {
    const { posters = [], backdrops = [], logos = [] } = data.images;
    data.posterUrl = buildLanguagesGalleryImages(apiService, posters, data.poster_path, 'w500');
    data.backdropUrl = buildLanguagesGalleryImages(apiService, backdrops, data.backdrop_path, 'w780', true, IMAGE_PLACEHOLDERS.BACKDROP);
    if (logos.length > 0 || data.logo_path) {
      data.logoUrl = buildLanguagesGalleryImages(apiService, logos, data.logo_path, 'w185');
    }
    delete data.images;
  }
  IMAGE_FIELD_RULES.forEach((rule) => {
    if (rule.pathKey in data && !data[rule.targetKey]) {
      const url = getImageUrl(apiService, data[rule.pathKey], rule.size, rule.placeholder);
      data[rule.targetKey] = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, url]));
    }
    delete data[rule.pathKey];
    delete data[rule.rawKey];
    delete data[rule.snakeUrlKey];
  });
  Object.values(data).forEach((value) => {
    if (value && typeof value === 'object') enrichWithImageUrls(apiService, value);
  });
  return data;
}

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
    /** @type {{from: (value: string, encoding: string) => {toString: (encoding: string) => string}}|undefined} */
    const buffer = globalThis.Buffer;
    const json = typeof atob === 'function'
      ? atob(paddedBase64)
      : buffer?.from(paddedBase64, 'base64').toString('utf8');
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
export function normalizeOrExtractApiKey(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (/^[0-9a-f]{32}$/i.test(trimmed)) {
    return trimmed;
  }
  return extractApiKeyFromJwt(trimmed);
}

/** Resolve an explicit token, Vite configuration or Node environment at call time.
 * @param {string|null} token
 * @returns {string}
 */
export function resolveApiToken(token) {
  if (token) {
    return token;
  }

  // Check Vite / ESM environment safely
  try {
    if (import.meta.env?.VITE_TMDB_API_TOKEN) {
      return import.meta.env.VITE_TMDB_API_TOKEN;
    }
  } catch {
    // Ignore reference errors in non-ESM environments
  }

  // Check Node / process environment safely without triggering no-undef
  try {
    const nodeToken = globalThis['process']?.env?.VITE_TMDB_API_TOKEN;
    if (nodeToken) {
      return nodeToken;
    }
  } catch {
    // Ignore reference errors in browser environments
  }

  return '';
}

/**
 * Run a network task through the concurrency limiter
 * @param {import('./ApiService.js').ApiService} apiService
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T>}
 */
export function scheduleApiRequest(apiService, task) {
  return new Promise((resolve, reject) => {
    const execute = async () => {
      apiService._activeRequests++;
      try {
        resolve(await task());
      } catch (err) {
        reject(err);
      } finally {
        apiService._activeRequests--;
        if (apiService._requestQueue.length > 0) {
          const next = apiService._requestQueue.shift();
          next();
        }
      }
    };

    if (apiService._activeRequests < MAX_CONCURRENT_REQUESTS) {
      void execute();
    } else {
      apiService._requestQueue.push(execute);
    }
  });
}

/** Prepare URL, authentication mode and the in-flight identity without performing network calls.
 * @param {import('./ApiService.js').ApiService} apiService
 * @param {string} endpoint
 * @param {Record<string, *>} params
 * @param {{headers?: Record<string, string>}} options
 */
export function createApiRequest(apiService, endpoint, params, options) {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${apiService.baseUrl}${formattedEndpoint}`);

  if (!params.language && apiService.defaultLanguage) {
    url.searchParams.append('language', apiService.defaultLanguage);
  }

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  }

  const hasCustomHeaders = options.headers && Object.keys(options.headers).length > 0;
  const resolvedApiKey = apiService.apiKey;
  const useSimpleCorsQuery = Boolean(resolvedApiKey && !hasCustomHeaders);

  if (useSimpleCorsQuery && !url.searchParams.has('api_key')) {
    url.searchParams.append('api_key', resolvedApiKey);
  }

  const requestKey = `${url.toString()}|${hasCustomHeaders ? JSON.stringify(options.headers) : ''}`;

  return { formattedEndpoint, url, useSimpleCorsQuery, requestKey };
}

/** Isolate a shared response before image enrichment or consumer mutations.
 * @template T
 * @param {T} data
 * @returns {T}
 */
export function cloneApiPayload(data) {
  return typeof structuredClone === 'function' ? structuredClone(data) : JSON.parse(JSON.stringify(data));
}
