import { IMAGE_PLACEHOLDERS } from '../models/index.js';

const IMAGE_FIELD_RULES = Object.freeze([
  { pathKey: 'poster_path', rawKey: 'raw_poster_path', snakeUrlKey: 'poster_url', targetKey: 'posterUrl', size: 'w500' },
  { pathKey: 'backdrop_path', rawKey: 'raw_backdrop_path', snakeUrlKey: 'backdrop_url', targetKey: 'backdropUrl', size: 'w780' },
  { pathKey: 'profile_path', rawKey: 'raw_profile_path', snakeUrlKey: 'profile_url', targetKey: 'profileUrl', size: 'w185' },
  { pathKey: 'still_path', rawKey: 'raw_still_path', snakeUrlKey: 'still_url', targetKey: 'stillUrl', size: 'w300' },
  { pathKey: 'logo_path', rawKey: 'raw_logo_path', snakeUrlKey: 'logo_url', targetKey: 'logoUrl', size: 'w185' }
]);

export async function fetchDualLanguageList(apiService, endpoint, params = {}) {
  const requestedLang = String(params.language || apiService.defaultLanguage || 'it-IT').toLowerCase();
  const isEnglishPrimary = requestedLang.startsWith('en');
  const [itData, enData] = await Promise.all([
    apiService.fetch(endpoint, { ...params, language: 'it-IT' }),
    apiService.fetch(endpoint, { ...params, language: 'en-US' })
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
    const itOverview = itItem?.overview || enItem?.overview || '';
    const enOverview = enItem?.overview || itItem?.overview || '';
    const itTitle = itItem?.title || itItem?.name || enItem?.title || enItem?.name || '';
    const enTitle = enItem?.title || enItem?.name || itItem?.title || itItem?.name || '';
    return {
      ...primaryItem,
      title: isEnglishPrimary ? (enTitle || itTitle) : (itTitle || enTitle),
      name: isEnglishPrimary ? (enTitle || itTitle) : (itTitle || enTitle),
      titles: { it: itTitle, en: enTitle },
      names: { it: itTitle, en: enTitle },
      overview: { it: itOverview, en: enOverview },
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
  return { ...primaryData, results };
}

export function fetchWithImages(apiService, endpoint, defaultAppend, params = {}) {
  const append = params.append_to_response ? `${params.append_to_response},images` : `${defaultAppend},images`;
  return apiService.fetch(endpoint, {
    include_image_language: 'it,en,null',
    ...params,
    append_to_response: append
  });
}

export async function fetchDualLanguageDetail(apiService, endpoint, defaultAppend, params = {}) {
  const requestedLang = String(params.language || apiService.defaultLanguage || 'it-IT').toLowerCase();
  const isEnglishPrimary = requestedLang.startsWith('en');
  const [itRes, enRes] = await Promise.allSettled([
    fetchWithImages(apiService, endpoint, defaultAppend, { ...params, language: 'it-IT' }),
    fetchWithImages(apiService, endpoint, defaultAppend, { ...params, language: 'en-US' })
  ]);
  const itData = itRes.status === 'fulfilled' ? itRes.value : null;
  const enData = enRes.status === 'fulfilled' ? enRes.value : null;
  if (!itData && !enData) {
    throw (itRes.status === 'rejected' ? itRes.reason : null) ||
      (enRes.status === 'rejected' ? enRes.reason : new Error('Failed to fetch details'));
  }
  const primaryData = (isEnglishPrimary ? enData : itData) || (isEnglishPrimary ? itData : enData);
  const secondaryData = (isEnglishPrimary ? itData : enData) || primaryData;
  const itOverview = itData?.overview || enData?.overview || '';
  const enOverview = enData?.overview || itData?.overview || '';
  const itTitle = itData?.title || itData?.name || enData?.title || enData?.name || '';
  const enTitle = enData?.title || enData?.name || itData?.title || itData?.name || '';
  const episodes = mergeLocalizedCollection(primaryData.episodes, secondaryData.episodes, 'episode_number');
  const seasons = mergeLocalizedCollection(primaryData.seasons, secondaryData.seasons, 'season_number');
  return {
    ...primaryData,
    ...(episodes ? { episodes } : {}),
    ...(seasons ? { seasons } : {}),
    title: isEnglishPrimary ? (enTitle || itTitle) : (itTitle || enTitle),
    name: isEnglishPrimary ? (enTitle || itTitle) : (itTitle || enTitle),
    titles: { it: itTitle, en: enTitle },
    names: { it: itTitle, en: enTitle },
    overview: { it: itOverview, en: enOverview },
    tagline: isEnglishPrimary ? (enData?.tagline || itData?.tagline || '') : (itData?.tagline || enData?.tagline || ''),
    taglines: { it: itData?.tagline || enData?.tagline || '', en: enData?.tagline || itData?.tagline || '' }
  };
}

function mergeLocalizedCollection(primaryItems, secondaryItems, key) {
  if (!Array.isArray(primaryItems)) return null;
  const secondaryMap = new Map((Array.isArray(secondaryItems) ? secondaryItems : []).map((item) => [item[key], item]));
  return primaryItems.map((item) => {
    const secondary = secondaryMap.get(item[key]);
    return {
      ...item,
      name: {
        it: item.name || secondary?.name || '',
        en: secondary?.name || item.name || ''
      },
      overview: {
        it: item.overview || secondary?.overview || '',
        en: secondary?.overview || item.overview || ''
      }
    };
  });
}

export async function fetchDualLanguageEpisode(apiService, endpoint, params = {}) {
  const requestedLang = String(params.language || apiService.defaultLanguage || 'it-IT').toLowerCase();
  const isEnglishPrimary = requestedLang.startsWith('en');
  const [itRes, enRes] = await Promise.allSettled([
    apiService.fetch(endpoint, { ...params, language: 'it-IT' }),
    apiService.fetch(endpoint, { ...params, language: 'en-US' })
  ]);
  const itData = itRes.status === 'fulfilled' ? itRes.value : null;
  const enData = enRes.status === 'fulfilled' ? enRes.value : null;
  if (!itData && !enData) {
    throw (itRes.status === 'rejected' ? itRes.reason : null) ||
      (enRes.status === 'rejected' ? enRes.reason : new Error('Failed to fetch episode details'));
  }
  const primaryData = (isEnglishPrimary ? enData : itData) || (isEnglishPrimary ? itData : enData);
  const itName = itData?.name || enData?.name || '';
  const enName = enData?.name || itData?.name || '';
  return {
    ...primaryData,
    name: isEnglishPrimary ? (enName || itName) : (itName || enName),
    names: { it: itName, en: enName },
    overview: {
      it: itData?.overview || enData?.overview || '',
      en: enData?.overview || itData?.overview || ''
    }
  };
}

export function getImageUrl(apiService, path, size = 'w500') {
  if (!path) return IMAGE_PLACEHOLDERS.POSTER;
  if (typeof path === 'string' && path.startsWith('https://')) return path;
  return `${apiService.imageBaseUrl}/${size}${path}`;
}

export function buildGalleryImagePair(apiService, items = [], defaultPath = null, size = 'w500', preferTextlessFallback = false) {
  const itPath = items.find((img) => img.iso_639_1 === 'it')?.file_path;
  const enPath = items.find((img) => img.iso_639_1 === 'en')?.file_path;
  const textlessPath = preferTextlessFallback ? items.find((img) => img.iso_639_1 === null)?.file_path : null;
  const fallbackPath = defaultPath || textlessPath || items[0]?.file_path;
  return {
    it: getImageUrl(apiService, itPath || fallbackPath || enPath, size),
    en: getImageUrl(apiService, enPath || fallbackPath || itPath, size)
  };
}

export function enrichWithImageUrls(apiService, data) {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    data.forEach((item) => enrichWithImageUrls(apiService, item));
    return data;
  }
  if (data.images && typeof data.images === 'object') {
    const { posters = [], backdrops = [], logos = [] } = data.images;
    data.posterUrl = buildGalleryImagePair(apiService, posters, data.poster_path, 'w500', false);
    data.backdropUrl = buildGalleryImagePair(apiService, backdrops, data.backdrop_path, 'w780', true);
    if (logos.length > 0 || data.logo_path) {
      data.logoUrl = buildGalleryImagePair(apiService, logos, data.logo_path, 'w185', false);
    }
    delete data.images;
  }
  IMAGE_FIELD_RULES.forEach((rule) => {
    if (rule.pathKey in data && !data[rule.targetKey]) {
      const url = getImageUrl(apiService, data[rule.pathKey], rule.size);
      data[rule.targetKey] = { it: url, en: url };
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
