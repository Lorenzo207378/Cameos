import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage, normalizeDualText, resolveLocalizedText } from './modelUtils.js';

/**
 * Movie
 * Domain model representing a Movie.
 */
export class Movie {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this._title = normalizeDualText(data.titles || data.title, data._title);
    this.titles = { it: this._title.it, en: this._title.en };
    this.title = String(this._title.it || this._title.en || '');
    this.originalTitle = data.originalTitle || data.original_title || '';
    this._overview = normalizeDualText(data.overview, data._overview);
    this.releaseDate = data.releaseDate || data.release_date || null;
    this.runtime = data.runtime ?? null;
    this.status = data.status || '';
    this._tagline = normalizeDualText(data.taglines || data.tagline, data._tagline);
    this.taglines = { it: this._tagline.it, en: this._tagline.en };
    this.tagline = String(this._tagline.it || this._tagline.en || '');
    this.budget = Number(data.budget) || 0;
    this.revenue = Number(data.revenue) || 0;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds || data.genre_ids || this.genres.map((g) => g.id);

    this.collection = data.collection || data.belongs_to_collection || null;
    this.productionCompanies = data.productionCompanies || data.production_companies || [];
    this.productionCountries = data.productionCountries || data.production_countries || [];

    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];
    this.languages = data.languages || this.spokenLanguages.map((l) => l.iso_639_1 || l.name);

    this._posterUrl = normalizeDualImage(data.posterUrl, data._posterUrl);
    this._backdropUrl = normalizeDualImage(data.backdropUrl, data._backdropUrl);

    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.voteCount = Number(data.voteCount ?? data.vote_count) || 0;
    this.popularity = Number(data.popularity) || 0;

    this.originalLanguage = data.originalLanguage || data.original_language || '';
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.cast = data.cast || data.credits?.cast || [];
    this.crew = data.crew || data.credits?.crew || [];
    this.credits = data.credits || { cast: this.cast, crew: this.crew };

    this.cameos = (data.cameos || []).map((c) =>
      c instanceof Cameo ? c : new Cameo({ ...c, mediaId: this.id, mediaType: 'movie', mediaTitle: this.title })
    );
  }



  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTitle(lang = 'it') {
    return resolveLocalizedText(this._title, lang, this.title);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTagline(lang = 'it') {
    return resolveLocalizedText(this._tagline, lang, this.tagline);
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
  get posterUrl() {
    return this._posterUrl;
  }

  /** @returns {Object|string} */
  get backdropUrl() {
    return this._backdropUrl;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = 'it') {
    return resolveLocalizedImage(this._posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = 'it') {
    return resolveLocalizedImage(this._backdropUrl, lang, IMAGE_PLACEHOLDERS.BACKDROP);
  }

  /** @returns {boolean} */
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

export default Movie;
