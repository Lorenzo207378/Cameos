import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage, normalizeDualText, resolveLocalizedText } from './modelUtils.js';

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
    this._name = normalizeDualText(data.names || data.name, data._name);
    this.names = { it: this._name.it, en: this._name.en };
    this.name = String(this._name.it || this._name.en || '');
    this._overview = normalizeDualText(data.overview, data._overview);
    this.airDate = data.airDate || data.air_date || null;
    this.runtime = data.runtime ?? null;
    this._stillUrl = normalizeDualImage(data.stillUrl, data._stillUrl);
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
  getName(lang = 'it') {
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
  getOverview(lang = 'it') {
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
  getStillUrl(lang = 'it') {
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
