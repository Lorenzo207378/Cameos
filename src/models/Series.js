import { Season } from './Season.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeDualImage, resolveLocalizedImage } from './modelUtils.js';

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
    this.name = data.name || '';
    this.originalName = data.originalName || data.original_name || '';
    this.overview = data.overview || '';
    this.firstAirDate = data.firstAirDate || data.first_air_date || null;
    this.lastAirDate = data.lastAirDate || data.last_air_date || null;
    this.status = data.status || '';
    this.type = data.type || '';
    this.tagline = data.tagline || '';
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
