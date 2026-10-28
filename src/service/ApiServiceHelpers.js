import { IMAGE_PLACEHOLDERS, resolveLangKey } from '../models/index.js';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_KEYS } from '../utils/languages.js';

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
    ...(params.append_to_response || defaultAppend || '').split(',').filter(Boolean), 'images'
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
