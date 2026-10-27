import { DEFAULT_LANGUAGE_KEY, SUPPORTED_LANGUAGE_KEYS } from '../utils/languages.js';
import { Episode } from './Episode.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage, normalizeLanguagesText, resolveLocalizedText } from './modelUtils.js';

/**
 * Season
 * Domain model representing a single season of a TV series.
 */
export class Season {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.series_id || null;
    this.seasonNumber = data.seasonNumber ?? data.season_number ?? 0;
    this._name = normalizeLanguagesText(data.names || data.name, data._name);
    this.names = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, this._name[key]]));
    this.name = String(this._name);
    this._overview = normalizeLanguagesText(data.overview, data._overview);
    this.airDate = data.airDate || data.air_date || null;
    this._posterUrl = normalizeLanguagesImage(data.posterUrl, data._posterUrl);
    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.episodeCount = data.episodeCount ?? data.episode_count ?? (data.episodes?.length || 0);

    this.episodes = (data.episodes || []).map((ep) =>
      ep instanceof Episode ? ep : new Episode({ ...ep, seriesId: this.seriesId, seasonNumber: this.seasonNumber })
    );
    this.cameos = (data.cameos || data.seasonCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
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
  get posterUrl() {
    return this._posterUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  get season_number() {
    return this.seasonNumber;
  }

  get air_date() {
    return this.airDate;
  }

  get episode_count() {
    return this.episodeCount;
  }

  get vote_average() {
    return this.voteAverage;
  }
}

export default Season;
