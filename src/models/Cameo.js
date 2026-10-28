import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage } from './modelUtils.js';

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
    this.character = data.character || '';
    this._profileUrl = normalizeLanguagesImage(data.profileUrl, data._profileUrl);
    this.popularity = Number(data.popularity) || 0;
    this.cameoBadge = data.cameoBadge || data.badge || null;
    this.isVoiceActor = Boolean(data.isVoiceActor);
    this.isCameoHighlight = data.isCameoHighlight ?? true;
    this.order = data.order !== undefined ? data.order : null;
    this.episodeCount = data.episodeCount ?? data.episode_count ?? data.total_episode_count ?? null;
    this.appearedInEpisodes = data.appearedInEpisodes || [];
    this.mediaType = data.mediaType || data.media_type || null;
    this.mediaTitle = data.mediaTitle || data.title || data.name || null;
    this.mediaId = data.mediaId || null;

    // Properties for career cameos / credits representation
    this.title = data.title || null;
    this.releaseDate = data.releaseDate || data.release_date || null;
    this.firstAirDate = data.firstAirDate || data.first_air_date || null;
    this._posterUrl = normalizeLanguagesImage(data.posterUrl, data._posterUrl);
    this._backdropUrl = normalizeLanguagesImage(data.backdropUrl, data._backdropUrl);
    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.roles = data.roles || [];
    this.role = data.role || data.description || data.overview || null;
    this.overview = this.role;
  }

  /** @returns {Object|string} */
  get profileUrl() {
    return this._profileUrl;
  }

  /** @returns {Object|string} */
  get posterUrl() {
    return this._posterUrl;
  }

  /** @returns {Object|string} */
  get backdropUrl() {
    return this._backdropUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._profileUrl, lang, IMAGE_PLACEHOLDERS.PROFILE);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._backdropUrl, lang, IMAGE_PLACEHOLDERS.BACKDROP);
  }

  get episode_count() {
    return this.episodeCount;
  }

  get total_episode_count() {
    return this.episodeCount;
  }

  get media_type() {
    return this.mediaType;
  }

  get release_date() {
    return this.releaseDate;
  }

  get first_air_date() {
    return this.firstAirDate;
  }

  get vote_average() {
    return this.voteAverage;
  }
}

export default Cameo;
