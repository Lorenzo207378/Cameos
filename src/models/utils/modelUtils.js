import { DEFAULT_LANGUAGE, DEFAULT_LANGUAGE_KEY, SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_KEYS, resolveLangKey } from '../../utils/languages.js';

/**
 * Shared domain utilities for models, repositories, and viewmodels.
 */

/**
 * Genera un placeholder SVG per immagini mancanti o non disponibili
 * @param {number} width
 * @param {number} height
 * @param {string} text
 * @returns {string}
 */
const makeSvgPlaceholder = (width, height, text) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#16181f"/>` +
    `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="8" fill="none" stroke="#2d3748" stroke-width="2"/>` +
    `<circle cx="${width / 2}" cy="${Math.round(height * 0.42)}" r="${Math.min(32, Math.max(16, Math.round(width * 0.12)))}" fill="#0a5d0a" opacity="0.4"/>` +
    `<text x="50%" y="${Math.round(height * 0.58)}" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.max(11, Math.round(width * 0.045))}" font-weight="600">${text}</text>` +
    `</svg>`
  )}`;

export const IMAGE_PLACEHOLDERS = Object.freeze({
  POSTER: makeSvgPlaceholder(500, 750, ""),
  BACKDROP: makeSvgPlaceholder(780, 440, ""),
  PROFILE: makeSvgPlaceholder(185, 278, 'Photo not available'),
  STILL: makeSvgPlaceholder(300, 169, "")
});

/**
 * Normalize language tag ('it' | 'it-IT' -> 'it-IT', 'en' | 'en-US' -> 'en-US')
 * @param {string} [language='it-IT']
 * @returns {string}
 */
export function normalizeLanguage(language = DEFAULT_LANGUAGE) {
  if (!language) return DEFAULT_LANGUAGE;
  const clean = String(language).trim().toLowerCase();
  const key = clean.split('-')[0];
  return SUPPORTED_LANGUAGES.find((locale) => locale.toLowerCase() === clean) ||
    SUPPORTED_LANGUAGES.find((locale) => locale.split('-')[0].toLowerCase() === key) || language;
}

/**
 * Resolve a supported short language key from a language tag.
 * @param {string} [lang='it']
 * @returns {string}
 */
export { resolveLangKey };

/**
 * Normalize an image map for the configured languages.
 * @param {Object|string|null} [primary]
 * @param {Object|string|null} [secondary]
 * @returns {Object|string}
 */
export function normalizeLanguagesImage(primary, secondary) {
  return primary || secondary || Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, null]));
}

/**
 * Normalize poster and backdrop URLs from domain data or a TMDb response.
 * @param {Object} data
 * @param {Object|string|null} [data.posterUrl]
 * @param {Object|string|null} [data.backdropUrl]
 * @param {string|null} [data.poster_path]
 * @param {string|null} [data.backdrop_path]
 * @param {Object|string|null} [data._posterUrl]
 * @param {Object|string|null} [data._backdropUrl]
 * @returns {{posterUrl: Object|string, backdropUrl: Object|string}}
 */
export function normalizeMediaArtwork(data) {
  return {
    posterUrl: normalizeLanguagesImage(data.posterUrl || (data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null), data._posterUrl),
    backdropUrl: normalizeLanguagesImage(data.backdropUrl || (data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null), data._backdropUrl)
  };
}

/**
 * Normalize TMDb ratings and popularity shared by movies and series.
 * @param {Object} data
 * @param {number|null} [data.voteAverage]
 * @param {number|null} [data.vote_average]
 * @param {number|null} [data.voteCount]
 * @param {number|null} [data.vote_count]
 * @param {number|null} [data.popularity]
 * @returns {{voteAverage: number, voteCount: number, popularity: number}}
 */
export function normalizeMediaMetrics(data) {
  return {
    voteAverage: Number(data.voteAverage ?? data.vote_average) || 0,
    voteCount: Number(data.voteCount ?? data.vote_count) || 0,
    popularity: Number(data.popularity) || 0
  };
}

/**
 * Resolve a localized image URL from a language map or string with fallback.
 * @param {Object|string|null} imageField
 * @param {string} [lang='it']
 * @param {string} [placeholder=IMAGE_PLACEHOLDERS.POSTER]
 * @param {string} [size] Optional TMDb image size; other URLs and placeholders are preserved.
 * @returns {string}
 */
export function resolveLocalizedImage(imageField, lang = DEFAULT_LANGUAGE_KEY, placeholder = IMAGE_PLACEHOLDERS.POSTER, size) {
  const key = resolveLangKey(lang);
  const url = typeof imageField === 'string'
    ? imageField
    : imageField?.[key] || SUPPORTED_LANGUAGE_KEYS.map((language) => imageField?.[language]).find(Boolean) || placeholder;
  return size && url !== placeholder
    ? url.replace(/^(https:\/\/image\.tmdb\.org\/t\/p\/)\w+(\/)/, (_, prefix, suffix) => `${prefix}${size}${suffix}`)
    : url;
}
/**
 * Normalize a text map for all configured languages.
 * Supports string methods (`slice`, `length`, `toString`, `Symbol.toPrimitive`) for backward compatibility
 * @param {Object|string|null} [primary]
 * @param {Object|string|null} [secondary]
 * @returns {Object}
 */
export function normalizeLanguagesText(primary, secondary) {
  const readText = (value, key) => typeof value === 'string' ? value : value?.[key];
  const values = SUPPORTED_LANGUAGE_KEYS.map((key) => readText(primary, key) || readText(secondary, key) || '');
  const fallback = values.find(Boolean) || '';
  const defaultText = (value) => SUPPORTED_LANGUAGE_KEYS.map((key) => value[key]).find(Boolean) || '';
  return {
    ...Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key, index) => [key, values[index] || fallback])),
    slice(...args) {
      return defaultText(this).slice(...args);
    },
    get length() {
      return defaultText(this).length;
    },
    toString() {
      return defaultText(this);
    },
    [Symbol.toPrimitive]() {
      return defaultText(this);
    }
  };
}

/**
 * Produce a serializable language map and its legacy scalar text value.
 * @param {Object|string|null} [value]
 * @returns {{translations: Object<string, string>, text: string}}
 */
export function normalizeTextFields(value) {
  const normalized = normalizeLanguagesText(value);
  return {
    translations: Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, normalized[key]])),
    text: String(normalized)
  };
}

/**
 * Normalize localized descriptions and air dates shared by seasons and episodes.
 * @param {Object} data
 * @param {Object<string, string>|string|null} [data.names]
 * @param {Object<string, string>|string|null} [data.name]
 * @param {Object<string, string>|string|null} [data.overviews]
 * @param {Object<string, string>|string|null} [data.overview]
 * @param {string|null} [data.airDate]
 * @param {string|null} [data.air_date]
 * @returns {{names: Object<string, string>, name: string, overviews: Object<string, string>, overview: string, airDate: string|null}}
 */
export function normalizeTvEntry(data) {
  const name = normalizeTextFields(data.names || data.name);
  const overview = normalizeTextFields(data.overviews || data.overview);
  return {
    names: name.translations,
    name: name.text,
    overviews: overview.translations,
    overview: overview.text,
    airDate: data.airDate || data.air_date || null
  };
}

/**
 * Resolve localized text from a language map or string with fallback.
 * @param {Object|string|null} textField
 * @param {string} [lang='it']
 * @param {string} [fallback='']
 * @returns {string}
 */
export function resolveLocalizedText(textField, lang = DEFAULT_LANGUAGE_KEY, fallback = '') {
  if (!textField) return fallback;
  if (typeof textField === 'string') return textField;
  const key = resolveLangKey(lang);
  return (
    textField?.[key] ||
    SUPPORTED_LANGUAGE_KEYS.map((language) => textField?.[language]).find(Boolean) ||
    fallback
  );
}


const MEDIA_TYPES = Object.freeze(['movie', 'tv', 'season', 'episode']);

/**
 * @param {*} value
 * @returns {string} One of `MEDIA_TYPES` ('series' is accepted as alias of 'tv', unknown values map to 'movie')
 */
function toMediaType(value) {
  if (value === 'series') return 'tv';
  return MEDIA_TYPES.includes(value) ? value : 'movie';
}

/**
 * @param {*} value
 * @returns {number|string} Numeric ID when the value is numeric, the raw value otherwise
 */
function toMediaId(value) {
  return value !== '' && Number.isFinite(Number(value)) ? Number(value) : value;
}

/**
 * Build the canonical reference of a media target.
 * Target keys: `movie:299534`, `tv:1418`, `season:1418:3`, `episode:1418:3:16`.
 * `id` mirrors `targetKey` so a reference can be used directly as a lightweight record ID.
 * @param {string} mediaType
 * @param {number|string} mediaId - TMDB ID of the movie, or of the parent series for season/episode
 * @param {number|string|null} [seasonNumber]
 * @param {number|string|null} [episodeNumber]
 * @returns {{ targetKey: string, id: string, mediaType: string, mediaId: number|string, seasonNumber: number|null, episodeNumber: number|null }}
 */
function buildMediaReference(mediaType, mediaId, seasonNumber = null, episodeNumber = null) {
  const id = toMediaId(mediaId);
  if (id === undefined || id === null || id === '') {
    throw new Error(`Media reference of type "${mediaType}" requires a mediaId`);
  }

  const hasSeason = mediaType === 'season' || mediaType === 'episode';
  const hasEpisode = mediaType === 'episode';
  const toNumber = (value) => (value === null || value === undefined || value === '' ? NaN : Number(value));
  const season = hasSeason ? toNumber(seasonNumber) : null;
  const episode = hasEpisode ? toNumber(episodeNumber) : null;
  if ((hasSeason && !Number.isFinite(season)) || (hasEpisode && !Number.isFinite(episode))) {
    throw new Error(`Media reference "${mediaType}:${id}" requires valid season/episode numbers`);
  }

  const targetKey = [mediaType, id, season, episode].filter((part) => part !== null).join(':');
  return { targetKey, id: targetKey, mediaType, mediaId: id, seasonNumber: season, episodeNumber: episode };
}

/**
 * @param {Object} input
 * @param {string} fallbackType
 * @returns {string} Media type inferred from the shape of a domain object (Episode, Season, Series or Movie)
 */
function inferMediaType(input, fallbackType) {
  const hasValue = (value) => value !== undefined && value !== null;
  if (hasValue(input.episodeNumber)) return 'episode';
  if (hasValue(input.seasonNumber) && (input.seriesId !== undefined || input.episodes !== undefined)) return 'season';
  if (input.numberOfSeasons !== undefined || input.firstAirDate !== undefined || (input.name !== undefined && input.title === undefined)) return 'tv';
  if (input.releaseDate !== undefined || input.title !== undefined) return 'movie';
  return fallbackType;
}

/**
 * Normalize any media input into its canonical reference (see `buildMediaReference`).
 * Accepted inputs: target key string, primitive ID, reference object, or a Movie/Series/Season/Episode instance.
 * @param {Object|string|number} input
 * @param {string} [defaultMediaType='movie'] - Type used for primitive IDs and objects that cannot be inferred
 * @returns {{ targetKey: string, id: string, mediaType: string, mediaId: number|string, seasonNumber: number|null, episodeNumber: number|null }}
 */
export function normalizeMediaReference(input, defaultMediaType = 'movie') {
  if (input === null || input === undefined) {
    throw new Error('Media reference input cannot be null or undefined');
  }

  const fallbackType = toMediaType(defaultMediaType);
  const parseKey = (key) => {
    const [type, mediaId, season, episode] = key.split(':');
    return buildMediaReference(toMediaType(type), mediaId, season, episode);
  };

  if (typeof input !== 'object') {
    return typeof input === 'string' && input.includes(':')
      ? parseKey(input)
      : buildMediaReference(fallbackType, input);
  }

  const key = [input.targetKey, input.id].find((value) => typeof value === 'string' && value.includes(':'));
  if (key) return parseKey(key);

  const mediaType = toMediaType(input.mediaType ?? input.media_type ?? inferMediaType(input, fallbackType));
  const isSeriesChild = mediaType === 'season' || mediaType === 'episode';
  const mediaId = isSeriesChild ? (input.seriesId ?? input.mediaId) : (input.mediaId ?? input.id);

  return buildMediaReference(mediaType, mediaId, input.seasonNumber, input.episodeNumber);
}

/**
 * Check whether two media inputs point to the same logical target (compares canonical `targetKey`).
 * Inputs that cannot be normalized never match.
 * @param {*} entry
 * @param {*} target
 * @returns {boolean}
 */
export function isSameMediaTarget(entry, target) {
  try {
    return normalizeMediaReference(entry).targetKey === normalizeMediaReference(target).targetKey;
  } catch {
    return false;
  }
}

/**
 * Convert a list of values into a de-duplicated array of strings (used for UID lists)
 * @param {Array<*>} [values=[]]
 * @returns {Array<string>}
 */
export function uniqueStrings(values = []) {
  return Array.isArray(values) ? Array.from(new Set(values.map(String))) : [];
}

/**
 * Extract only the user UID string from a friend input (string UID or object with `uid`/`id`)
 * @param {string|Object} friendOrUid
 * @returns {string|null}
 */
export function extractFriendUid(friendOrUid) {
  if (!friendOrUid) return null;
  if (typeof friendOrUid === 'string') return friendOrUid.trim() || null;
  if (typeof friendOrUid === 'object') {
    const uid = friendOrUid.uid || friendOrUid.id || null;
    return uid ? String(uid).trim() : null;
  }
  return null;
}

/**
 * Normalize a timestamp value (Firestore Timestamp, Date, number, or ISO string)
 * into a serializable ISO string or number suitable for both Firestore and IndexedDB.
 * @param {*} value
 * @returns {string|number|null}
 */
export function normalizeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    return new Date(value.seconds * 1000).toISOString();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return null;
}


/**
 * Resolves the profile image URL for an actor or cameo member across formats and fallbacks.
 * @param {Object} [member]
 * @param {string} [langKey='it']
 * @returns {string}
 */
export function getProfileSrc(member, langKey = DEFAULT_LANGUAGE_KEY) {
  if (!member) return IMAGE_PLACEHOLDERS.PROFILE;
  if (typeof member.getProfileUrl === 'function') {
    return member.getProfileUrl(langKey);
  }
  const fallback = member.profile_path ? `https://image.tmdb.org/t/p/w185${member.profile_path}` : IMAGE_PLACEHOLDERS.PROFILE;
  return resolveLocalizedImage(member.profileUrl || null, langKey, fallback);
}

export const UNCREDITED_REGEX = /\b(uncredited|non accreditato)\b/i;
const UNCREDITED_CLEAN_REGEX = /\s*\(\s*(uncredited|non accreditato)\s*\)|\b(uncredited|non accreditato)\b/gi;

/**
 * Strips uncredited notations from a character or role string.
 * @param {string} [role='']
 * @returns {string}
 */
export function stripUncredited(role = '') {
  return String(role || '').replace(UNCREDITED_CLEAN_REGEX, '').replace(/[\s\-/]+$/, '').trim();
}

/**
 * Checks whether a media item (Movie or Series) is upcoming:
 * release or first air date is fully qualified (YYYY-MM-DD) and strictly in the future,
 * and status is not released.
 * @param {Object} media
 * @param {Object|null} [media.upcomingSeason]
 * @param {Object|null} [media.upcoming_season]
 * @param {string|null} [media.releaseDate]
 * @param {string|null} [media.release_date]
 * @param {string|null} [media.firstAirDate]
 * @param {string|null} [media.first_air_date]
 * @param {string} [media.status]
 * @param {number} [media.voteCount]
 * @param {number} [media.vote_count]
 * @param {string} [today]
 * @returns {boolean}
 */
export function isMediaUpcoming(media, today) {
  if (!media) return false;
  if (media.upcomingSeason || media.upcoming_season) return true;
  const todayStr = typeof today === 'string' && /^\d{4}-\d{2}-\d{2}/.test(today)
    ? today.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const release = String(media.releaseDate || media.release_date || media.firstAirDate || media.first_air_date || '').trim();
  const hasFullDate = /^\d{4}-\d{2}-\d{2}/.test(release);
  const isFutureDate = (hasFullDate && release.slice(0, 10) > todayStr)
    || (/^\d{4}$/.test(release) && release > todayStr.slice(0, 4));

  const status = String(media.status || '').toLowerCase().trim();
  const isReleased = status.includes('releas') || status.includes('rilascia');

  const voteCount = Number(media.voteCount ?? media.vote_count) || 0;
  const isUnreleasedAnnounced = !release && voteCount === 0 && !isReleased;

  return (isFutureDate || isUnreleasedAnnounced) && !isReleased;
}

// Backwards-compatible alias
export const isUpcomingMovie = isMediaUpcoming;
