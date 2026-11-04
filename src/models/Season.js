import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { Episode } from './Episode.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage, normalizeTvEntry, resolveLocalizedText } from './utils/index.js';

/**
 * Season
 * Domain model representing a single season of a TV series.
 */
export class Season {
  /** @type {string|null} */
  airDate;
  /** @type {Object<string, string>} */
  names;
  /** @type {string} */
  name;
  /** @type {Object<string, string>} */
  overviews;
  /** @type {string} */
  overview;

  /**
   * @param {Object} [data={}]
   * @param {number|string|null} [data.id]
   * @param {number|string|null} [data.seriesId]
   * @param {number|null} [data.seasonNumber]
   * @param {number|null} [data.season_number]
   * @param {Object<string, string>|string|null} [data.names]
   * @param {Object<string, string>|string|null} [data.name]
   * @param {Object<string, string>|string|null} [data.overviews]
   * @param {Object<string, string>|string|null} [data.overview]
   * @param {string|null} [data.airDate]
   * @param {Object<string, string>|string|null} [data.posterUrl]
   * @param {string|null} [data.poster_path]
   * @param {number|null} [data.voteAverage]
   * @param {number|null} [data.vote_average]
   * @param {number|null} [data.episodeCount]
   * @param {Array<Object>} [data.episodes]
   * @param {Array<Object>} [data.cameos]
   * @param {Array<Object>} [data.seasonCameos]
   * @param {number|string|null} [data.series_id] Parent series ID from the source data.
   * @param {string|null} [data.air_date] Original air date from TMDb.
   * @param {number} [data.episode_count] Episode count from TMDb.
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.series_id || null;
    this.seasonNumber = data.seasonNumber ?? data.season_number ?? 0;

    ({ names: this.names, name: this.name, overviews: this.overviews, overview: this.overview, airDate: this.airDate } = normalizeTvEntry(data));
    this.posterUrl = normalizeLanguagesImage(data.posterUrl || (data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null));
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
    return resolveLocalizedText(this.names, lang, this.name);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getOverview(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.overviews, lang, this.overview);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }
}

export default Season;
