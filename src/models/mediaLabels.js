import { getSavedLanguage, translate } from '../utils/translationUtils.js';

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
