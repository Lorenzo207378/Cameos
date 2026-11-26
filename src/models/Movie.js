import { getLocalizedGenres } from './utils/mediaLabels.js';
import { DEFAULT_LANGUAGE_KEY } from '../utils/language/languages.js';
import { dedupeCast, formatMillions, formatRuntime, formatStatusLabel, formatTrailers, formatWatchProviders, selectCrewByRole, selectPreferredTrailer, selectTrailersByPlatform } from '../utils/formatters.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeMediaArtwork, normalizeMediaMetrics, resolveLocalizedImage, normalizeTextFields, resolveLocalizedText, isMediaUpcoming, isUpcomingMovie } from './utils/modelUtils.js';

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
  /** @type {Array<{ key: string, label: string, badgeClass: string, items: Array<import('./WatchProvider.js').WatchProvider> }>} */
  watchProviders;
  /** @type {Array<import('./Trailer.js').Trailer>} */
  trailers;

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
   * @param {Array<Object>|Object} [data.watchProviders] Watch providers from TMDb.
   * @param {Array<Object>|Object} [data.trailers] Normalized or raw trailer entries.
   * @param {Object<string, Array<Object>>} [data.videosByLanguage] Localized video entries by language.
   * @param {Array<Object>|{ results?: Array<Object> }} [data.videos] Video payload from TMDb.
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

    this.cast = dedupeCast(data.cast || data.credits?.cast || []);
    this.crew = data.crew || data.credits?.crew || [];
    this.credits = data.credits || { cast: this.cast, crew: this.crew };

    this.cameos = (data.cameos || []).map((c) =>
      c instanceof Cameo ? c : new Cameo({ ...c, mediaId: this.id, mediaType: 'movie', mediaTitle: c.mediaTitle || this.title, mediaTitles: c.mediaTitles || this.titles })
    );

    this.watchProviders = formatWatchProviders(data.watchProviders || data['watch/providers']?.results);
    this.trailers = formatTrailers(data.trailers || data.videosByLanguage || data.videos);
  }

  /**
   * @param {string} [lang='it']
   * @returns {import('./Trailer.js').Trailer|null}
   */
  getTrailer(lang = DEFAULT_LANGUAGE_KEY) {
    return selectPreferredTrailer(this.trailers, lang);
  }

  /**
   * @param {string} [lang='it']
   * @returns {Array<import('./Trailer.js').Trailer>}
   */
  getTrailersByPlatform(lang = DEFAULT_LANGUAGE_KEY) {
    return selectTrailersByPlatform(this.trailers, lang);
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
   * @param {string} [lang]
   * @returns {string}
   */
  getStatusLabel(lang = undefined) {
    return formatStatusLabel(this.status, lang, 'status.released');
  }

  /**
   * @param {string} [lang]
   * @returns {Array<Object>} Genres with names translated into the requested (or saved) language.
   */
  getGenres(lang = undefined) {
    return getLocalizedGenres(this.genres, lang);
  }

  /** @returns {Array<Object>} Directors from movie credits. */
  getDirectors() {
    return selectCrewByRole(this.crew, 'detail.directing');
  }

  /** @returns {Array<Object>} Writers from movie credits. */
  getWriters() {
    return selectCrewByRole(this.crew, 'detail.writing');
  }

  /**
   * @param {string} [lang]
   * @returns {string} Budget in millions, or the translated undisclosed label.
   */
  getBudget(lang = undefined) {
    return formatMillions(this.budget, lang);
  }

  /**
   * @param {string} [lang]
   * @returns {string} Revenue in millions, or the translated undisclosed label.
   */
  getRevenue(lang = undefined) {
    return formatMillions(this.revenue, lang);
  }

  /**
   * @param {string} [lang]
   * @returns {string|null} Runtime formatted in hours and minutes.
   */
  getRuntime(lang = undefined) {
    return formatRuntime(this.runtime, lang);
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
   * @param {string} [size]
   * @returns {string}
   */
  getPosterUrl(lang = DEFAULT_LANGUAGE_KEY, size = undefined) {
    return resolveLocalizedImage(this.posterUrl, lang, IMAGE_PLACEHOLDERS.POSTER, size);
  }

  /**
   * @param {string} [lang='it']
   * @param {string} [size]
   * @returns {string}
   */
  getBackdropUrl(lang = DEFAULT_LANGUAGE_KEY, size = undefined) {
    return resolveLocalizedImage(this.backdropUrl, lang, IMAGE_PLACEHOLDERS.BACKDROP, size);
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

export { isMediaUpcoming, isUpcomingMovie };

export default Movie;
