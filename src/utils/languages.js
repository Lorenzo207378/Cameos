// Add supported TMDB locales here; the first entry is the application fallback.
export const SUPPORTED_LANGUAGES = Object.freeze(['it-IT', 'en-US']);
export const SUPPORTED_LANGUAGE_KEYS = Object.freeze(
  SUPPORTED_LANGUAGES.map((locale) => locale.split('-')[0].toLowerCase())
);
export const DEFAULT_LANGUAGE = SUPPORTED_LANGUAGES[0];
export const DEFAULT_LANGUAGE_KEY = SUPPORTED_LANGUAGE_KEYS[0];
