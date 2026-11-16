// Add supported TMDB locales here; the first entry is the application fallback.
export const SUPPORTED_LANGUAGES = Object.freeze(['it-IT', 'en-US']);
export const SUPPORTED_LANGUAGE_KEYS = Object.freeze(
  SUPPORTED_LANGUAGES.map((locale) => locale.split('-')[0].toLowerCase())
);
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];
export const DEFAULT_LANGUAGE_KEY = SUPPORTED_LANGUAGE_KEYS[0];

/**
 * Resolve a supported short language key from a language tag.
 * @param {string} [lang='it']
 * @returns {string}
 */
export function resolveLangKey(lang = DEFAULT_LANGUAGE_KEY) {
  const key = String(lang || DEFAULT_LANGUAGE_KEY).trim().toLowerCase().split('-')[0];
  return SUPPORTED_LANGUAGE_KEYS.includes(key) ? key : DEFAULT_LANGUAGE_KEY;
}
