import { getSavedLanguage, translate } from '../utils/translations.js';

const GENRE_KEY_MAP = Object.freeze({
  28: 'action',
  12: 'adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'sciFi',
  10770: 'tvMovie',
  53: 'thriller',
  10752: 'war',
  37: 'western',
  10759: 'actionAdventure',
  10762: 'kids',
  10763: 'news',
  10764: 'reality',
  10765: 'sciFiFantasy',
  10766: 'soap',
  10767: 'talk',
  10768: 'warPolitics'
});

export function getLocalizedGenres(genres) {
  const language = getSavedLanguage();
  return genres.map((genre) => {
    const key = GENRE_KEY_MAP[genre?.id];
    const name = key ? translate(`categories.${key}`, language) : genre?.name || '';
    return { ...genre, name };
  });
}

/**
 * Excluded genre IDs on TMDb (Documentaries, Talk Shows, Reality Shows, News)
 * Strips non-narrative content (making-of, retrospectives, talk/reality/news) to keep scripted fiction.
 */
export const EXCLUDED_GENRES = Object.freeze(new Set([
  99,    // Documentary (Film & TV)
  10767, // Talk Show (TV)
  10764, // Reality (TV)
  10763  // News (TV)
]));

const NON_NARRATIVE_TITLE_REGEX = /(\boscars?\b|\bemmys?\b|\bgolden globes?\b|\bgrammys?\b|\bacademy awards?\b|\bfilm festival\b|\bcritics choice|\bteen choice|\bmtv movie|\bceremony\b)/i;
const NON_NARRATIVE_ROLE_REGEX = /(archive footage|repertorio|self\s*-\s*(guest|panelist|host|presenter))/i;

/**
 * Checks whether a media item belongs to an excluded genre (documentary, talk, reality, news)
 * or non-narrative appearances (archive footage, award ceremonies, talk show guest/panelist).
 * @param {Object} item
 * @returns {boolean}
 */
export function isExcludedMedia(item) {
  if (!item) return false;
  const genreIds = item.genre_ids || item.genreIds;
  if (Array.isArray(genreIds) && genreIds.some((id) => EXCLUDED_GENRES.has(Number(id)))) {
    return true;
  }
  const genres = item.genres;
  if (Array.isArray(genres) && genres.some((g) => EXCLUDED_GENRES.has(Number(g?.id)))) {
    return true;
  }

  const role = item.character || item.role || '';
  if (NON_NARRATIVE_ROLE_REGEX.test(role)) {
    return true;
  }

  const title = item.mediaTitle || item.title || (item.mediaType === 'tv' ? item.name : '') || item.name || '';
  if (NON_NARRATIVE_TITLE_REGEX.test(title)) {
    return true;
  }

  return false;
}
