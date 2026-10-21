/**
 * Cameo
 * Domain model representing a special guest appearance in a TV series, season, episode, or movie.
 */
export default class Cameo {
  /**
   * @param {Record<string, any>} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.name = data.name || '';
    this.character = data.character || '';
    this._profileUrl = data.profileUrl || { it: null, en: null };
    this.popularity = Number(data.popularity) || 0;
    this.cameoBadge = data.cameoBadge || data.badge || null;
    this.isVoiceActor = Boolean(data.isVoiceActor);
    this.isCameoHighlight = data.isCameoHighlight ?? true;
    this.order = data.order !== undefined ? data.order : null;
    this.episodeCount = data.episodeCount || data.episode_count || (data.total_episode_count ?? null);
    this.appearedInEpisodes = data.appearedInEpisodes || [];
    this.mediaType = data.mediaType || data.media_type || null;
    this.mediaTitle = data.mediaTitle || data.title || data.name || null;
    this.mediaId = data.mediaId || null;

    // Properties for career cameos / credits representation
    this.title = data.title || null;
    this.releaseDate = data.releaseDate || data.release_date || null;
    this.firstAirDate = data.firstAirDate || data.first_air_date || null;
    this._posterUrl = data.posterUrl || { it: null, en: null };
    this._backdropUrl = data.backdropUrl || { it: null, en: null };
    this.voteAverage = Number(data.voteAverage || data.vote_average) || 0;
    this.roles = data.roles || [];
  }

  /**
   * Avatar profile URL { it, en } or string
   * @returns {{ it: string, en: string } | string}
   */
  get profileUrl() {
    return this._profileUrl;
  }

  /**
   * Dual-language poster URL { it, en }
   * @returns {{ it: string, en: string } | string}
   */
  get posterUrl() {
    return this._posterUrl;
  }

  /**
   * Dual-language backdrop URL { it, en }
   * @returns {{ it: string, en: string } | string}
   */
  get backdropUrl() {
    return this._backdropUrl;
  }

  /**
   * Retrieve avatar URL with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getProfileUrl(lang = 'it') {
    if (typeof this._profileUrl === 'string') return this._profileUrl;
    return this._profileUrl?.[lang] || this._profileUrl?.it || this._profileUrl?.en || 'https://via.placeholder.com/185x278?text=Nessuna+Foto';
  }

  /**
   * Retrieve poster URL with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = 'it') {
    if (typeof this._posterUrl === 'string') return this._posterUrl;
    return this._posterUrl?.[lang] || this._posterUrl?.it || this._posterUrl?.en || 'https://via.placeholder.com/500x750?text=Immagine+Non+Disponibile';
  }

  /**
   * Retrieve backdrop URL with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = 'it') {
    if (typeof this._backdropUrl === 'string') return this._backdropUrl;
    return this._backdropUrl?.[lang] || this._backdropUrl?.it || this._backdropUrl?.en || 'https://via.placeholder.com/780x440?text=Immagine+Non+Disponibile';
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
