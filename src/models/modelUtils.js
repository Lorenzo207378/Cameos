/**
 * Shared domain utilities for models, repositories, and viewmodels.
 */

/**
 * Genera un data URI SVG leggero, offline e senza dipendenze di rete per i placeholder grafici
 * @param {number} width
 * @param {number} height
 * @param {string} text
 * @returns {string}
 */
export const makeSvgPlaceholder = (width, height, text) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="#16181f"/>` +
    `<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="8" fill="none" stroke="#2d3748" stroke-width="2"/>` +
    `<circle cx="${width / 2}" cy="${Math.round(height * 0.42)}" r="${Math.min(32, Math.max(16, Math.round(width * 0.12)))}" fill="#0a5d0a" opacity="0.4"/>` +
    `<text x="50%" y="${Math.round(height * 0.58)}" text-anchor="middle" fill="#9ca3af" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.max(11, Math.round(width * 0.045))}" font-weight="600">${text}</text>` +
    `</svg>`
  )}`;

export const IMAGE_PLACEHOLDERS = Object.freeze({
  POSTER: makeSvgPlaceholder(500, 750, 'Cameos - Locandina'),
  BACKDROP: makeSvgPlaceholder(780, 440, 'Cameos - Sfondo'),
  PROFILE: makeSvgPlaceholder(185, 278, 'Foto Non Disponibile'),
  STILL: makeSvgPlaceholder(300, 169, 'Cameos - Episodio')
});

/**
 * Normalize language tag ('it' | 'it-IT' -> 'it-IT', 'en' | 'en-US' -> 'en-US')
 * @param {string} [language='it-IT']
 * @returns {string}
 */
export function normalizeLanguage(language = 'it-IT') {
  if (!language) return 'it-IT';
  const clean = String(language).trim().toLowerCase();
  if (clean.startsWith('en')) return 'en-US';
  if (clean.startsWith('it')) return 'it-IT';
  return language;
}

/**
 * Resolve short language key ('it' | 'en') from any language tag ('it', 'it-IT', 'en', 'en-US')
 * @param {string} [lang='it']
 * @returns {string}
 */
export function resolveLangKey(lang = 'it') {
  return String(lang || 'it').trim().toLowerCase().startsWith('en') ? 'en' : 'it';
}

/**
 * Normalize dual-language image object `{ it, en }`
 * @param {Object|string|null} [primary]
 * @param {Object|string|null} [secondary]
 * @returns {Object|string}
 */
export function normalizeDualImage(primary, secondary) {
  return primary || secondary || { it: null, en: null };
}

/**
 * Resolve localized image URL from `{ it, en }` map or string with fallback
 * @param {Object|string|null} imageField
 * @param {string} [lang='it']
 * @param {string} [placeholder=IMAGE_PLACEHOLDERS.POSTER]
 * @returns {string}
 */
export function resolveLocalizedImage(imageField, lang = 'it', placeholder = IMAGE_PLACEHOLDERS.POSTER) {
  if (typeof imageField === 'string') return imageField;
  const key = resolveLangKey(lang);
  return imageField?.[key] || imageField?.it || imageField?.en || placeholder;
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
  if (input.firstAirDate !== undefined || input.numberOfSeasons !== undefined || input.name !== undefined) return 'tv';
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
