import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import {
  IMAGE_PLACEHOLDERS,
  normalizeLanguagesImage,
  resolveLocalizedImage,
  UNCREDITED_REGEX,
  stripUncredited
} from './utils/index.js';

/**
 * Cameo
 * Domain model representing a special guest appearance in a TV series, season, episode, or movie.
 */
export class Cameo {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.name = data.name || '';
    const description = data.role || data.description || data.overview || '';
    const rawRole = `${data.character || ''} ${description}`;
    this.isUncredited = Boolean(
      data.isUncredited ||
      data.uncredited ||
      UNCREDITED_REGEX.test(rawRole)
    );
    this.character = stripUncredited(data.character || '');
    this.role = stripUncredited(description) || null;
    this.overview = this.role;
    this.profileUrl = normalizeLanguagesImage(data.profileUrl);
    this.popularity = Number(data.popularity) || 0;
    this.cameoBadge = data.cameoBadge || data.badge || null;
    this.isVoiceActor = Boolean(data.isVoiceActor);
    this.isCameoHighlight = data.isCameoHighlight ?? true;
    this.order = data.order !== undefined ? data.order : null;
    this.episodeCount = data.episodeCount ?? data.total_episode_count ?? null;
    this.appearedInEpisodes = data.appearedInEpisodes || [];
    this.mediaType = data.mediaType || null;
    this.mediaTitle = data.mediaTitle || data.title || data.name || null;
    this.mediaId = data.mediaId || null;

    // Properties for career cameos / credits representation
    this.title = data.title || null;
    this.releaseDate = data.releaseDate || null;
    this.firstAirDate = data.firstAirDate || null;
    this.posterUrl = normalizeLanguagesImage(data.posterUrl);
    this.backdropUrl = normalizeLanguagesImage(data.backdropUrl);
    this.voteAverage = Number(data.voteAverage) || 0;
    this.roles = data.roles || [];
    this.genreIds = data.genreIds || [];
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.profileUrl, lang, IMAGE_PLACEHOLDERS.PROFILE);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.backdropUrl, lang, IMAGE_PLACEHOLDERS.BACKDROP);
  }
}

export default Cameo;
