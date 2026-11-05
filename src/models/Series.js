import { DEFAULT_LANGUAGE_KEY } from '../utils/languages.js';
import { getSavedLanguage, translate } from '../utils/translations.js';
import { getLocalizedGenres } from './utils/mediaLabels.js';
import { getCreativeCrew } from '../utils/personCredits.js';
import { Season } from './Season.js';
import { Cameo } from './Cameo.js';
import { IMAGE_PLACEHOLDERS, normalizeMediaArtwork, normalizeMediaMetrics, resolveLocalizedImage, normalizeTextFields, resolveLocalizedText, isMediaUpcoming } from './utils/index.js';

/**
 * Series
 * Domain model representing a TV Series.
 */
export class Series {
  /** @type {number} */
  voteAverage;
  /** @type {number} */
  voteCount;
  /** @type {number} */
  popularity;
  /** @type {Object<string, string>} */
  names;
  /** @type {string} */
  name;
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
   * @param {Object<string, string>|string|null} [data.names]
   * @param {Object<string, string>|string|null} [data.name]
   * @param {Object<string, string>|string|null} [data.title]
   * @param {string|null} [data.originalName]
   * @param {string|null} [data.original_name]
   * @param {Object<string, string>|string|null} [data.overviews]
   * @param {Object<string, string>|string|null} [data.overview]
   * @param {string|null} [data.firstAirDate]
   * @param {string|null} [data.first_air_date]
   * @param {string|null} [data.lastAirDate]
   * @param {string|null} [data.status]
   * @param {string|null} [data.type]
   * @param {Object<string, string>|string|null} [data.taglines]
   * @param {Object<string, string>|string|null} [data.tagline]
   * @param {boolean} [data.inProduction]
   * @param {string|null} [data.homepage]
   * @param {number|null} [data.numberOfSeasons]
   * @param {number|null} [data.number_of_seasons]
   * @param {Array<Object>} [data.seasons]
   * @param {number|null} [data.numberOfEpisodes]
   * @param {number|null} [data.number_of_episodes]
   * @param {Object|null} [data.upcomingSeason]
   * @param {Array<Object>} [data.genres]
   * @param {Array<number>} [data.genreIds]
   * @param {Array<Object>} [data.createdBy]
   * @param {Array<Object>} [data.networks]
   * @param {Array<Object>} [data.productionCompanies]
   * @param {Array<Object>} [data.productionCountries]
   * @param {Array<string>} [data.languages]
   * @param {Array<Object>} [data.spokenLanguages]
   * @param {number|null} [data.voteAverage]
   * @param {number|null} [data.vote_average]
   * @param {number|null} [data.voteCount]
   * @param {number|null} [data.vote_count]
   * @param {number|null} [data.popularity]
   * @param {Array<string>} [data.originCountry]
   * @param {string|null} [data.originalLanguage]
   * @param {Array<Object>} [data.cast]
   * @param {Array<Object>} [data.crew]
   * @param {Object|null} [data.aggregate_credits]
   * @param {Array<Object>} [data.vipCameos]
   * @param {Object|string|null} [data.posterUrl]
   * @param {Object|string|null} [data.backdropUrl]
   * @param {string|null} [data.poster_path]
   * @param {string|null} [data.backdrop_path]
   * @param {Object|string|null} [data._posterUrl]
   * @param {Object|string|null} [data._backdropUrl]
   * @param {string|null} [data.last_air_date] Latest air date from TMDb.
   * @param {boolean} [data.in_production] Production flag from TMDb.
   * @param {Object|null} [data.upcoming_season] Announced season from the source data.
   * @param {Array<number>} [data.genre_ids] Genre IDs from TMDb.
   * @param {Array<Object>} [data.created_by] Series creators from TMDb.
   * @param {Array<Object>} [data.production_companies] Production companies from TMDb.
   * @param {Array<Object>} [data.production_countries] Production countries from TMDb.
   * @param {Array<Object>} [data.spoken_languages] Spoken languages from TMDb.
   * @param {Array<string>} [data.origin_country] Country codes from TMDb.
   * @param {string} [data.original_language] Original language code from TMDb.
   */
  constructor(data = {}) {
    this.id = data.id ?? null;

    ({ translations: this.names, text: this.name } = normalizeTextFields(data.names || data.name || data.title));
    this.originalName = data.originalName || data.original_name || '';

    ({ translations: this.overviews, text: this.overview } = normalizeTextFields(data.overviews || data.overview));

    this.firstAirDate = data.firstAirDate || data.first_air_date || null;
    this.lastAirDate = data.lastAirDate || data.last_air_date || null;
    this.status = data.status || '';
    this.type = data.type || '';

    ({ translations: this.taglines, text: this.tagline } = normalizeTextFields(data.taglines || data.tagline));

    this.inProduction = Boolean(data.inProduction ?? data.in_production);
    this.homepage = data.homepage || '';

    this.numberOfSeasons = Number(data.numberOfSeasons ?? data.number_of_seasons) || (data.seasons?.length || 0);
    this.numberOfEpisodes = Number(data.numberOfEpisodes ?? data.number_of_episodes) || 0;
    this.upcomingSeason = data.upcomingSeason || data.upcoming_season || null;

    this.genres = data.genres || [];
    this.genreIds = data.genreIds || data.genre_ids || this.genres.map((g) => g.id);

    this.createdBy = data.createdBy || data.created_by || [];
    this.networks = data.networks || [];
    this.productionCompanies = data.productionCompanies || data.production_companies || [];
    this.languages = data.languages || [];
    this.spokenLanguages = data.spokenLanguages || data.spoken_languages || [];

    ({ posterUrl: this.posterUrl, backdropUrl: this.backdropUrl } = normalizeMediaArtwork(data));

    ({ voteAverage: this.voteAverage, voteCount: this.voteCount, popularity: this.popularity } = normalizeMediaMetrics(data));

    this.originCountry = data.originCountry || data.origin_country || [];
    this.originalLanguage = data.originalLanguage || data.original_language || '';

    this.seasons = (data.seasons || []).map((s) => (s instanceof Season ? s : new Season({ ...s, seriesId: this.id })));
    const rawCast = data.cast || data.aggregate_credits?.cast || [];
    this.crew = data.crew || data.aggregate_credits?.crew || [];
    this.cast = rawCast.map((m) => {
      if (!m) return m;
      const roleFromRoles = Array.isArray(m.roles) && m.roles.length > 0
        ? m.roles.map((r) => r.character || r.role).filter(Boolean).join(' / ')
        : null;
      return {
        ...m,
        character: m.character || m.role || roleFromRoles || ''
      };
    });
    this.vipCameos = (data.vipCameos || []).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getName(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.names, lang, this.name);
  }

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTitle(lang = DEFAULT_LANGUAGE_KEY) {
    return this.getName(lang);
  }

  /** @returns {Array<Object>} Genres translated into the saved language. */
  getGenres() {
    return getLocalizedGenres(this.genres);
  }

  /** @returns {Array<Object>} Directors from regular or aggregated series credits. */
  getDirectors() {
    return getCreativeCrew(this.crew, 'detail.directing');
  }

  /** @returns {Array<Object>} Writers from regular or aggregated series credits. */
  getWriters() {
    return getCreativeCrew(this.crew, 'detail.writing');
  }

  /** @returns {string} Localized series status, or the original unknown status. */
  getStatusLabel() {
    const statusKeys = {
      'returning series': 'returningSeries',
      'in production': 'inProduction',
      'post production': 'postProduction',
      planned: 'planned',
      pilot: 'pilot',
      ended: 'ended',
      canceled: 'canceled',
      cancelled: 'canceled'
    };
    const key = statusKeys[String(this.status).toLowerCase()];
    if (key) return translate(`status.${key}`, getSavedLanguage());
    return this.status || translate('status.unknown', getSavedLanguage());
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

  /**
   * @param {string} [lang='it']
   * @returns {string}
   */
  getTagline(lang = DEFAULT_LANGUAGE_KEY) {
    return resolveLocalizedText(this.taglines, lang, this.tagline);
  }

  /** @returns {boolean} */
  get isComplete() {
    return Boolean(this.status && (this.seasons.length > 0 || this.numberOfSeasons > 0));
  }

  /**
   * Static helper delegating to isMediaUpcoming
   * @param {Series|Object} series
   * @param {string} [today]
   * @returns {boolean}
   */
  static isUpcoming(series, today) {
    return isMediaUpcoming(series, today);
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

export default Series;
