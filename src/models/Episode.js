import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { translateLabel } from '../utils/translations.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage, normalizeTvEntry, resolveLocalizedText } from './utils/modelUtils.js';

/**
 * Episode
 * Domain model representing a single TV series episode.
 */
export class Episode {
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
   * @param {number|string|null} [data.seasonNumber]
   * @param {number|null} [data.season_number]
   * @param {number|null} [data.episodeNumber]
   * @param {number|null} [data.episode_number]
   * @param {Object<string, string>|string|null} [data.names]
   * @param {Object<string, string>|string|null} [data.name]
   * @param {Object<string, string>|string|null} [data.overviews]
   * @param {Object<string, string>|string|null} [data.overview]
   * @param {string|null} [data.airDate]
   * @param {number|null} [data.runtime]
   * @param {Object<string, string>|string|null} [data.stillUrl]
   * @param {string|null} [data.still_path]
   * @param {number|null} [data.voteAverage]
   * @param {number|null} [data.vote_average]
   * @param {number|null} [data.voteCount]
   * @param {number|null} [data.vote_count]
   * @param {string|null} [data.episodeType]
   * @param {Array<Object>} [data.crew]
   * @param {Array<Object>} [data.cast]
   * @param {Array<Object>} [data.guestStars]
   * @param {Array<Object>} [data.cameos]
   * @param {Object} [data.credits]
   * @param {number|string|null} [data.show_id] Parent series ID from TMDb.
   * @param {string|null} [data.air_date] Original air date from TMDb.
   * @param {string} [data.episode_type] Episode classification from TMDb.
   * @param {Array<Object>} [data.guest_stars] Guest cast from TMDb.
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.show_id || null;
    this.seasonNumber = data.seasonNumber ?? data.season_number ?? null;
    this.episodeNumber = data.episodeNumber ?? data.episode_number ?? null;

    ({ names: this.names, name: this.name, overviews: this.overviews, overview: this.overview, airDate: this.airDate } = normalizeTvEntry(data));
    this.runtime = data.runtime ?? null;
    this.stillUrl = normalizeLanguagesImage(data.stillUrl || (data.still_path ? `https://image.tmdb.org/t/p/w300${data.still_path}` : null));
    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.voteCount = Number(data.voteCount ?? data.vote_count) || 0;
    this.episodeType = data.episodeType || data.episode_type || 'standard';
    this.crew = data.crew || data.credits?.crew || [];
    this.guestStars = data.guestStars || data.guest_stars || data.credits?.guest_stars || [];
    this.cameos = (data.cameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));

    const cameoIds = new Set(this.cameos.map((c) => c.id));
    const regularCast = data.cast || data.credits?.cast || [];
    const nonCameoGuests = this.guestStars.filter((g) => !cameoIds.has(g.id));
    const seenIds = new Set();
    this.cast = [...regularCast, ...nonCameoGuests].filter((actor) => {
      if (!actor?.id || seenIds.has(actor.id) || cameoIds.has(actor.id)) return false;
      seenIds.add(actor.id);
      return true;
    });
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
   * @param {string} [size='w300']
   * @returns {string}
   */
  getStillUrl(lang = DEFAULT_LANGUAGE_KEY, size = 'w300') {
    return resolveLocalizedImage(this.stillUrl, lang, IMAGE_PLACEHOLDERS.STILL, size);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return this.getStillUrl(lang);
  }

  /**
   * @returns {string|null}
   */
  getRuntime() {
    if (!this.runtime) return null;
    if (this.runtime < 60) return `${this.runtime}${translateLabel('detail.minShort')}`;
    return `${Math.floor(this.runtime / 60)}${translateLabel('detail.hoursShort')} ${this.runtime % 60}${translateLabel('detail.minShort')}`;
  }
}

export default Episode;
