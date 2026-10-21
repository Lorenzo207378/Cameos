import Episode from './Episode.js';
import Cameo from './Cameo.js';

/**
 * Season
 * Domain model representing a single season of a TV series.
 */
export default class Season {
  /**
   * @param {Record<string, any>} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.series_id || null;
    this.seasonNumber = data.seasonNumber !== undefined ? data.seasonNumber : (data.season_number ?? 0);
    this.name = data.name || '';
    this.overview = data.overview || '';
    this.airDate = data.airDate || data.air_date || null;
    this._posterUrl = data.posterUrl || { it: null, en: null };
    this.voteAverage = Number(data.voteAverage || data.vote_average) || 0;
    this.episodeCount = data.episodeCount !== undefined ? data.episodeCount : (data.episode_count ?? (data.episodes?.length || 0));

    // Map episodes into Episode instances
    this.episodes = (data.episodes || []).map((ep) => (ep instanceof Episode ? ep : new Episode({ ...ep, seriesId: this.seriesId, seasonNumber: this.seasonNumber })));

    // Map season cameos if present
    this.cameos = (data.cameos || data.seasonCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /**
   * Dual-language poster URL { it, en }
   * @returns {{ it: string, en: string } | string}
   */
  get posterUrl() {
    return this._posterUrl;
  }

  /**
   * Retrieve poster URL for a specific language ('it' | 'en') with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = 'it') {
    if (typeof this._posterUrl === 'string') return this._posterUrl;
    return this._posterUrl?.[lang] || this._posterUrl?.it || this._posterUrl?.en || 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile';
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
