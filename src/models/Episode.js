import Cameo from './Cameo.js';

/**
 * Episode
 * Domain model representing a single TV series episode.
 */
export default class Episode {
  /**
   * @param {Record<string, any>} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.seriesId = data.seriesId || data.show_id || null;
    this.seasonNumber = data.seasonNumber !== undefined ? data.seasonNumber : (data.season_number ?? null);
    this.episodeNumber = data.episodeNumber !== undefined ? data.episodeNumber : (data.episode_number ?? null);
    this.name = data.name || '';
    this.overview = data.overview || '';
    this.airDate = data.airDate || data.air_date || null;
    this.runtime = data.runtime !== undefined ? data.runtime : null;
    this._stillUrl = data.stillUrl || { it: null, en: null };
    this.voteAverage = Number(data.voteAverage || data.vote_average) || 0;
    this.voteCount = Number(data.voteCount || data.vote_count) || 0;
    this.episodeType = data.episodeType || data.episode_type || 'standard';
    this.crew = data.crew || [];
    this.guestStars = data.guestStars || data.guest_stars || [];

    // Map cameo objects into Cameo instances
    this.cameos = (data.cameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /**
   * Still image URL { it, en } or string
   * @returns {{ it: string, en: string } | string}
   */
  get stillUrl() {
    return this._stillUrl;
  }

  /**
   * Retrieve still image URL with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getStillUrl(lang = 'it') {
    if (typeof this._stillUrl === 'string') return this._stillUrl;
    return this._stillUrl?.[lang] || this._stillUrl?.it || this._stillUrl?.en || 'https://via.placeholder.com/300x169?text=Immagine+Non+Disponibile';
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
