import { getLocalizedGenres } from './mediaLabels.js';
import { DEFAULT_LANGUAGE_KEY, SUPPORTED_LANGUAGE_KEYS } from '../utils/languages.js';
import { getSavedLanguage, translate } from '../utils/translationUtils.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeLanguagesImage, resolveLocalizedImage, normalizeLanguagesText, resolveLocalizedText } from './modelUtils.js';

function translateLabel(key) {
  return translate(key, getSavedLanguage());
}

function formatMillions(amount) {
  return amount > 0
    ? `$${(amount / 1_000_000).toFixed(0)} ${translateLabel('detail.millions')}`
    : translateLabel('detail.notDisclosed');
}

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
    this._title = normalizeLanguagesText(data.titles || data.title, data._title);
    this.titles = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, this._title[key]]));
    this.title = String(this._title);
    this.originalTitle = data.originalTitle || data.original_title || '';
    this._overview = normalizeLanguagesText(data.overview, data._overview);
    this.releaseDate = data.releaseDate || data.release_date || null;
    this.runtime = data.runtime ?? null;
    this.status = data.status || '';
    this._tagline = normalizeLanguagesText(data.taglines || data.tagline, data._tagline);
    this.taglines = Object.fromEntries(SUPPORTED_LANGUAGE_KEYS.map((key) => [key, this._tagline[key]]));
    this.tagline = String(this._tagline);
    this.budget = Number(data.budget) || 0;
    this.revenue = Number(data.revenue) || 0;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds ||  this.genres.map((g) => g.id);

    this.collection = data.collection ||  null;
    this.productionCompanies = data.productionCompanies || data.production_companies || [];
    this.productionCountries = data.productionCountries || data.production_countries || [];

    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];
    this.languages = data.languages || this.spokenLanguages.map((l) => l.iso_639_1 || l.name);

    this._posterUrl = normalizeLanguagesImage(data.posterUrl, data._posterUrl);
    this._backdropUrl = normalizeLanguagesImage(data.backdropUrl, data._backdropUrl);

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
  getTitle(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this._title, lang, this.title);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTagline(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this._tagline, lang, this.tagline);
  }

  /**
   * @returns {string}
   */
  getStatusLabel() {
    if (!this.status) return translateLabel('status.released');

    const normalizedStatus = String(this.status).toLowerCase();
    if (normalizedStatus.includes('releas') || normalizedStatus.includes('rilascia')) return translateLabel('status.released');
    if (normalizedStatus.includes('post')) return translateLabel('status.postProduction');
    if (normalizedStatus.includes('in prod')) return translateLabel('status.inProduction');
    if (normalizedStatus.includes('plan') || normalizedStatus.includes('pianif')) return translateLabel('status.planned');
    if (normalizedStatus.includes('cancel')) return translateLabel('status.canceled');
    return this.status;
  }

  /**
   * @returns {Array<Object>} Genres with names translated into the saved language.
   */
  getGenres() {
    return getLocalizedGenres(this.genres);
  }

  /** @returns {Array<Object>} Directors and members of the directing department. */
  getDirectors() {
    return this.crew.filter((member) => member.job === 'Director' || member.department === 'Directing');
  }

  /** @returns {Array<Object>} Screenwriters and members of the writing department. */
  getWriters() {
    return this.crew.filter((member) => member.job === 'Screenplay' || member.department === 'Writing');
  }

  /**
   * @returns {string} Budget in millions, or the translated undisclosed label.
   */
  getBudget() {
    return formatMillions(this.budget);
  }

  /**
   * @returns {string} Revenue in millions, or the translated undisclosed label.
   */
  getRevenue() {
    return formatMillions(this.revenue);
  }

  /** @returns {string|null} Runtime formatted in hours and minutes. */
  getRuntime() {
    if (!this.runtime) return null;
    return `${Math.floor(this.runtime / 60)}${translateLabel('detail.hoursShort')} ${this.runtime % 60}${translateLabel('detail.minShort')}`;
  }


  /** @returns {Object|string} */
  get overview() {
    return this._overview;
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getOverview(lang = DEFAULT_LANGUAGE_KEY) {
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
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this._posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = DEFAULT_LANGUAGE_KEY) {
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
