import { Season } from './Season.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage, normalizeDualText, resolveLocalizedText } from './modelUtils.js';

/**
 * Series
 * Domain model representing a TV Series.
 */
export class Series {
  /**
   * @param {Object} [data={}]
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this._name = normalizeDualText(data.names || data.name || data.title, data._name);
    this.names = { it: this._name.it, en: this._name.en };
    this.name = String(this._name.it || this._name.en || '');
    this.originalName = data.originalName || data.original_name || '';
    this._overview = normalizeDualText(data.overview, data._overview);
    this.firstAirDate = data.firstAirDate || data.first_air_date || null;
    this.lastAirDate = data.lastAirDate || data.last_air_date || null;
    this.status = data.status || '';
    this.type = data.type || '';
    this._tagline = normalizeDualText(data.taglines || data.tagline, data._tagline);
    this.taglines = { it: this._tagline.it, en: this._tagline.en };
    this.tagline = String(this._tagline.it || this._tagline.en || '');
    this.inProduction = Boolean(data.inProduction ?? data.in_production);
    this.homepage = data.homepage || '';

    this.numberOfSeasons = Number(data.numberOfSeasons ?? data.number_of_seasons) || (data.seasons?.length || 0);
    this.numberOfEpisodes = Number(data.numberOfEpisodes ?? data.number_of_episodes) || 0;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds || data.genre_ids || this.genres.map((g) => g.id);

    this.createdBy = data.createdBy || data.created_by || [];
    this.networks = data.networks || [];
    this.productionCompanies = data.productionCompanies || data.production_companies || [];
    this.productionCountries = data.productionCountries || data.production_countries || [];

    this.languages = data.languages || [];
    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];

    this._posterUrl = normalizeDualImage(data.posterUrl, data._posterUrl);
    this._backdropUrl = normalizeDualImage(data.backdropUrl, data._backdropUrl);

    this.voteAverage = Number(data.voteAverage ?? data.vote_average) || 0;
    this.voteCount = Number(data.voteCount ?? data.vote_count) || 0;
    this.popularity = Number(data.popularity) || 0;

    this.originCountry = data.originCountry || data.origin_country || [];
    this.originalLanguage = data.originalLanguage || data.original_language || '';

    this.seasons = (data.seasons || []).map((s) => (s instanceof Season ? s : new Season({ ...s, seriesId: this.id })));
    this.cast = data.cast || data.aggregate_credits?.cast || [];
    this.vipCameos = (data.vipCameos || []).map((c) =>
      c instanceof Cameo ? c : new Cameo({ ...c, mediaId: this.id, mediaType: 'tv', mediaTitle: this.name })
    );
  }



  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getName(lang = 'it') {
    return resolveLocalizedText(this._name, lang, this.name);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTagline(lang = 'it') {
    return resolveLocalizedText(this._tagline, lang, this.tagline);
  }

  /** @returns {string} */
  get title() {
    return this.name;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTitle(lang = 'it') {
    return this.getName(lang);
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
    return Boolean(this.status && (this.seasons.length > 0 || this.numberOfSeasons > 0));
  }

  get first_air_date() {
    return this.firstAirDate;
  }

  get last_air_date() {
    return this.lastAirDate;
  }

  get vote_average() {
    return this.voteAverage;
  }

  get vote_count() {
    return this.voteCount;
  }

  get number_of_seasons() {
    return this.numberOfSeasons;
  }

  get number_of_episodes() {
    return this.numberOfEpisodes;
  }

  get origin_country() {
    return this.originCountry;
  }

  get original_language() {
    return this.originalLanguage;
  }

  get original_name() {
    return this.originalName;
  }

  get production_countries() {
    return this.productionCountries;
  }

  get production_companies() {
    return this.productionCompanies;
  }
}

export default Series;
