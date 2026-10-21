import Cameo from './Cameo.js';

/**
 * Movie
 * Domain model representing a Movie.
 */
export default class Movie {
  /**
   * @param {Record<string, any>} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.title = data.title || '';
    this.originalTitle = data.originalTitle || data.original_title || '';
    this.overview = data.overview || '';
    this.releaseDate = data.releaseDate || data.release_date || null;
    this.runtime = data.runtime !== undefined ? data.runtime : null;
    this.status = data.status || '';
    this.tagline = data.tagline || '';
    this.budget = Number(data.budget) || 0;
    this.revenue = Number(data.revenue) || 0;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds || data.genre_ids || (data.genres || []).map((g) => g.id);

    this.collection = data.collection || data.belongs_to_collection || null;
    this.productionCompanies = data.productionCompanies || data.production_companies || [];
    this.productionCountries = data.productionCountries || data.production_countries || [];

    // Language availability indications
    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];
    this.languages = data.languages || (this.spokenLanguages || []).map((l) => l.iso_639_1 || l.name);

    // Dual-language image URLs (it + en)
    this._posterUrl = data.posterUrl || { it: null, en: null };
    this._backdropUrl = data.backdropUrl || { it: null, en: null };

    this.voteAverage = Number(data.voteAverage || data.vote_average) || 0;
    this.voteCount = Number(data.voteCount || data.vote_count) || 0;
    this.popularity = Number(data.popularity) || 0;

    this.originalLanguage = data.originalLanguage || data.original_language || '';
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.cast = data.cast || data.credits?.cast || [];
    this.crew = data.crew || data.credits?.crew || [];
    this.credits = data.credits || { cast: this.cast, crew: this.crew };

    // Map cameos into Cameo instances
    this.cameos = (data.cameos || []).map((c) => (c instanceof Cameo ? c : new Cameo({ ...c, mediaId: this.id, mediaType: 'movie', mediaTitle: this.title })));
  }

  /**
   * Dual-language poster URL { it, en }
   * @returns {{ it: string, en: string } | string}
   */
  get posterUrl() {
    return this._posterUrl;
  }

  /**
   * Dual-language backdrop cover URL { it, en }
   * @returns {{ it: string, en: string } | string}
   */
  get backdropUrl() {
    return this._backdropUrl;
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

  /**
   * Retrieve backdrop URL for a specific language ('it' | 'en') with fallback
   * @param {'it'|'en'} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = 'it') {
    if (typeof this._backdropUrl === 'string') return this._backdropUrl;
    return this._backdropUrl?.[lang] || this._backdropUrl?.it || this._backdropUrl?.en || 'https://via.placeholder.com/780x440?text=Immagine+Non+Disponibile';
  }

  /**
   * Checks if full movie details (runtime, cast) are loaded
   * @returns {boolean}
   */
  get isComplete() {
    return Boolean(this.status && (this.runtime !== null || this.cast.length > 0));
  }

  get original_title() {
    return this.originalTitle;
  }

  get release_date() {
    return this.releaseDate;
  }

  get vote_average() {
    return this.voteAverage;
  }

  get vote_count() {
    return this.voteCount;
  }

  get original_language() {
    return this.originalLanguage;
  }

  get production_countries() {
    return this.productionCountries;
  }

  get production_companies() {
    return this.productionCompanies;
  }

  get spoken_languages() {
    return this.spokenLanguages;
  }
}
