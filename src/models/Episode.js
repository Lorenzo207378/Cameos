import { DEFAULT_LANGUAGE_KEY, SUPPORTED_LANGUAGE_KEYS } from '../utils/languages.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage, normalizeLanguagesText, resolveLocalizedText } from './modelUtils.js';

/**
 * Episode
 * Domain model representing a single TV series episode.
 */
export class Episode {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.show_id || null;
    this.seasonNumber = data.seasonNumber ?? data.season_number ?? null;
    this.episodeNumber = data.episodeNumber ?? data.episode_number ?? null;
    this._name = normalizeLanguagesText(data.names || data.name, data._name);
    this.names = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, this._name[key]]));
    this.name = String(this._name);
    this._overview = normalizeLanguagesText(data.overview, data._overview);
    this.airDate = data.airDate || data.air_date || null;
    this.runtime = data.runtime ?? null;
    this._stillUrl = normalizeLanguagesImage(data.stillUrl, data._stillUrl);
    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.voteCount = Number(data.voteCount ?? data.vote_count) || 0;
    this.episodeType = data.episodeType || data.episode_type || 'standard';
    this.crew = data.crew || [];
    this.guestStars = data.guestStars || data.guest_stars || [];
    this.cameos = (data.cameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }



  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getName(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this._name, lang, this.name);
  }

  /** @returns {Object|string} */
  get overview() {
    return this._overview;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getOverview(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this._overview, lang, '');
  }

  /** @returns {Object|string} */
  get stillUrl() {
    return this._stillUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getStillUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._stillUrl, lang, IMAGE_PLACEHOLDERS.STILL);
  }

  get episode_number() {
    return this.episodeNumber;
  }

  get season_number() {
    return this.seasonNumber;
  }

  get air_date() {
    return this.airDate;
  }

  get vote_average() {
    return this.voteAverage;
  }

  get vote_count() {
    return this.voteCount;
  }

  get guest_stars() {
    return this.guestStars;
  }
}

export default Episode;
