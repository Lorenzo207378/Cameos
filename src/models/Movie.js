import { getLocalizedGenres } from './utils/mediaLabels.js';
import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { translateLabel } from '../utils/translations.js';
import { dedupeCrew, formatMillions } from '../utils/formatters.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeMediaArtwork, normalizeMediaMetrics, resolveLocalizedImage, normalizeTextFields, resolveLocalizedText, isMediaUpcoming } from './utils/index.js';

/**
 * Movie
 * Domain model representing a Movie.
 */
export class Movie {
  /** @type {number} */
  voteAverage;
  /** @type {number} */
  voteCount;
  /** @type {number} */
  popularity;
  /** @type {Object<string, string>} */
  titles;
  /** @type {string} */
  title;
  /** @type {Object<string, string>} */
  overviews;
  /** @type {string} */
  overview;
  /** @type {Object<string, string>} */
  taglines;
  /** @type {string} */
  tagline;
  /** @type {Object|string} */
  posterUrl;
  /** @type {Object|string} */
  backdropUrl;

  /**
   * @param {Object} [data={}]
   * @param {number|string|null} [data.id]
   * @param {boolean} [data.video=false] TMDb flag for standalone video content.
   * @param {Object<string, string>|string|null} [data.titles]
   * @param {Object<string, string>|string|null} [data.title]
   * @param {Object<string, string>|string|null} [data.name]
   * @param {string|null} [data.originalTitle]
   * @param {Object<string, string>|string|null} [data.overviews]
   * @param {Object<string, string>|string|null} [data.overview]
   * @param {string|null} [data.releaseDate]
   * @param {number|null} [data.runtime]
   * @param {string|null} [data.status]
   * @param {Object<string, string>|string|null} [data.taglines]
   * @param {Object<string, string>|string|null} [data.tagline]
   * @param {number|null} [data.budget]
   * @param {number|null} [data.revenue]
   * @param {Array<Object>} [data.genres]
   * @param {Array<number>} [data.genreIds]
   * @param {Object|null} [data.collection]
   * @param {Array<Object>} [data.productionCompanies]
   * @param {Array<Object>} [data.productionCountries]
   * @param {Array<Object>} [data.spokenLanguages]
   * @param {Array<string>} [data.languages]
   * @param {number|null} [data.voteAverage]
   * @param {number|null} [data.vote_average]
   * @param {number|null} [data.voteCount]
   * @param {number|null} [data.vote_count]
   * @param {number|null} [data.popularity]
   * @param {string|null} [data.originalLanguage]
   * @param {string|null} [data.imdbId]
   * @param {string|null} [data.homepage]
   * @param {Array<Object>} [data.cast]
   * @param {Object|null} [data.credits]
   * @param {Array<Object>} [data.crew]
   * @param {Array<Object>} [data.cameos]
   * @param {Object|string|null} [data.posterUrl]
   * @param {Object|string|null} [data.backdropUrl]
   * @param {string|null} [data.poster_path]
   * @param {string|null} [data.backdrop_path]
   * @param {Object|string|null} [data._posterUrl]
   * @param {Object|string|null} [data._backdropUrl]
   * @param {string} [data.original_title] Original title from TMDb.
   * @param {string|null} [data.release_date] Release date from TMDb.
   * @param {Array<number>} [data.genre_ids] Genre IDs from TMDb.
   * @param {Array<Object>} [data.production_companies] Production companies from TMDb.
   * @param {Array<Object>} [data.production_countries] Production countries from TMDb.
   * @param {Array<Object>} [data.spoken_languages] Spoken languages from TMDb.
   * @param {string} [data.original_language] Original language code from TMDb.
   * @param {string|null} [data.imdb_id] IMDb identifier from TMDb.
   */
  constructor(data = {}) {
    this.id = data.id ?? null;
    this.video = data.video === true;

    ({ translations: this.titles, text: this.title } = normalizeTextFields(data.titles || data.title || data.name));
    this.originalTitle = data.originalTitle || data.original_title || '';

    ({ translations: this.overviews, text: this.overview } = normalizeTextFields(data.overviews || data.overview));

    this.releaseDate = data.releaseDate || data.release_date || null;
    this.runtime = data.runtime ?? null;
    this.status = data.status || '';

    ({ translations: this.taglines, text: this.tagline } = normalizeTextFields(data.taglines || data.tagline));

    this.budget = Number(data.budget) || 0;
    this.revenue = Number(data.revenue) || 0;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds || data.genre_ids || this.genres.map((g) => g.id);

    this.collection = data.collection || null;
    this.productionCompanies = data.productionCompanies || data.production_companies || [];

    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];
    this.languages = data.languages || this.spokenLanguages.map((l) => l.iso_639_1 || l.name);

    ({ posterUrl: this.posterUrl, backdropUrl: this.backdropUrl } = normalizeMediaArtwork(data));

    ({ voteAverage: this.voteAverage, voteCount: this.voteCount, popularity: this.popularity } = normalizeMediaMetrics(data));

    this.originalLanguage = data.originalLanguage || data.original_language || '';
    this.imdbId = data.imdbId || data.imdb_id || null;
    this.homepage = data.homepage || '';

    this.cast = data.cast || data.credits?.cast || [];
    this.crew = data.crew || data.credits?.crew || [];
    this.credits = data.credits || { cast: this.cast, crew: this.crew };

    this.cameos = (data.cameos || []).map((c) =>
      c instanceof Cameo ? c : new Cameo({ ...c, mediaId: this.id, mediaType: 'movie', mediaTitle: c.mediaTitle || this.title })
    );
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTitle(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.titles, lang, this.title);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTagline(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.taglines, lang, this.tagline);
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

  /** @returns {Array<Object>} Unique directors and members of the directing department. */
  getDirectors() {
    const list = (this.crew || []).filter((member) => member.job === 'Director' || member.department === 'Directing');
    const sorted = [...list].sort((a, b) => {
      if (a.job === 'Director' && b.job !== 'Director') return -1;
      if (b.job === 'Director' && a.job !== 'Director') return 1;
      return 0;
    });

    return dedupeCrew(sorted);
  }

  /** @returns {Array<Object>} Unique screenwriters and members of the writing department. */
  getWriters() {
    const list = (this.crew || []).filter((member) => member.job === 'Screenplay' || member.job === 'Writer' || member.department === 'Writing');
    const sorted = [...list].sort((a, b) => {
      const isPrimaryA = a.job === 'Screenplay' || a.job === 'Writer';
      const isPrimaryB = b.job === 'Screenplay' || b.job === 'Writer';
      if (isPrimaryA && !isPrimaryB) return -1;
      if (!isPrimaryA && isPrimaryB) return 1;
      return 0;
    });
    return dedupeCrew(sorted);
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

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getOverview(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.overviews, lang, this.overview);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getBackdropUrl(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedImage(this.backdropUrl, lang, IMAGE_PLACEHOLDERS.BACKDROP);
  }

  /** @returns {boolean} */
  get isComplete() {
    return Boolean(this.status && (this.runtime !== null || this.cast.length > 0));
  }

  /**
   * Static helper delegating to isMediaUpcoming
   * @param {Movie|Object} movie
   * @param {string} [today]
   * @returns {boolean}
   */
  static isUpcoming(movie, today) {
    return isMediaUpcoming(movie, today);
  }

  /**
   * Instance helper
   * @param {string} [today]
   * @returns {boolean}
   */
  isUpcoming(today) {
    return isMediaUpcoming(this, today);
  }
}

export { isMediaUpcoming, isUpcomingMovie } from './utils/modelUtils.js';

export default Movie;
