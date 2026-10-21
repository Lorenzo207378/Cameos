/**
 * Shared domain utilities for models, repositories, and viewmodels.
 */

export const IMAGE_PLACEHOLDERS = Object.freeze({
  POSTER: 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile',
  BACKDROP: 'https://via.placeholder.com/780x440?text=Immagine+Non+Disponibile',
  PROFILE: 'https://via.placeholder.com/185x278?text=Nessuna+Foto',
  STILL: 'https://via.placeholder.com/300x169?text=Immagine+Non+Disponibile'
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

/**
 * Extract comparable identifier from a collection item or primitive ID
 * @param {*} item
 * @returns {string|number|null}
 */
export function extractItemKey(item) {
  if (item === null || item === undefined) return null;
  if (typeof item === 'string' || typeof item === 'number') return item;
  return item.id ?? item.uid ?? item.mediaId ?? item.reviewId ?? null;
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
