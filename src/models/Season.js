import { Episode } from './Episode.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage } from './modelUtils.js';

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
    this.name = data.name || '';
    this.overview = data.overview || '';
    this.airDate = data.airDate || data.air_date || null;
    this._posterUrl = normalizeDualImage(data.posterUrl, data._posterUrl);
    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.episodeCount = data.episodeCount ?? data.episode_count ?? (data.episodes?.length || 0);

    this.episodes = (data.episodes || []).map((ep) =>
      ep instanceof Episode ? ep : new Episode({ ...ep, seriesId: this.seriesId, seasonNumber: this.seasonNumber })
    );
    this.cameos = (data.cameos || data.seasonCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /** @returns {Object|string} */
  get posterUrl() {
    return this._posterUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = 'it') {
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
