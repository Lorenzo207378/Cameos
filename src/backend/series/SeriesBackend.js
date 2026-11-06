import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Series, Season, Episode, isMediaUpcoming } from '../../models/utils/index.js';
import { SERIES_CATEGORY_CONFIG } from '../../utils/mediaCategories.js';
import { cameoBackend } from '../cameos/CameoBackend.js';
import { findUpcomingSeason } from './upcomingSeason.js';
import { BaseBackend } from '../BaseBackend.js';

/**
 * SeriesBackend
 * Scope: Handles TV series listing, searching, filtering, and hierarchical navigation (series -> seasons -> episodes).
 * Transforms UI parameters into TMDB API calls via ApiService and returns typed domain models (Series, Season, Episode).
 */
export class SeriesBackend extends BaseBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    super(apiService);
  }

  async getGenres(params = {}) {
    return this.apiService.getGenres('tv', params);
  }

  /**
   * Discover and filter TV series
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.sortBy='popularity.desc'] - 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc'
   * @param {string|number} [params.genreId] - Single genre ID or comma-separated genre IDs
   * @param {string|number} [params.watchProviderId] - Watch provider ID (e.g. 8 for Netflix, 119 for Prime Video, 337 for Disney+)
   * @param {string|number} [params.keywords] - Keyword ID (e.g. 179430 for Cameo)
   * @param {string} [params.language] - Language code (e.g. 'it-IT', 'en-US')
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async discoverSeries({ page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords, language } = {}) {
    const queryParams = {
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords,
      language
    };

    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.discoverTv(queryParams);
    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Helper to enrich a series item with status and upcoming season details.
   * Identifies brand-new series (season 1 in future) and returning series with an upcoming season.
   * @param {Object} item
   * @param {string} today
   * @param {string} [language]
   * @returns {Promise<Object|null>}
   */
  async _enrichUpcomingSeriesItem(item, today, language) {
    if (!item?.id) return item;
    try {
      const detail = await this.apiService.fetch(`/tv/${item.id}`, { language });
      if (!detail) return item;

      const status = detail.status || item.status || '';
      const upcomingSeason = findUpcomingSeason(item, detail, today);
      if (upcomingSeason) return { ...item, status, upcomingSeason };

      if (isMediaUpcoming(item, today) || isMediaUpcoming(detail, today)) {
        return { ...item, status };
      }

      return null;
    } catch {
      return item;
    }
  }

  /**
   * Get upcoming TV series (brand new series + returning series with an upcoming season)
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getUpcomingSeries({ page = 1, language } = {}) {
    const today = new Date().toISOString().slice(0, 10);

    const responses = await Promise.all([
      this.apiService.getUpcomingSeries({ page, language }),
      this.apiService.fetch('/discover/tv', {
        sort_by: 'popularity.desc',
        'air_date.gte': today,
        'first_air_date.lte': today,
        page,
        language
      }).catch(() => ({ results: [] }))
    ]);
    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const brandNewData = responses[0];
    const returningData = responses[1];

    const candidateMap = new Map();
    (brandNewData.results || []).forEach((item) => candidateMap.set(item.id, item));
    (returningData.results || []).forEach((item) => {
      if (!candidateMap.has(item.id)) candidateMap.set(item.id, item);
    });

    const candidates = Array.from(candidateMap.values());
    const enrichedCandidates = await Promise.all(
      candidates.map((item) => this._enrichUpcomingSeriesItem(item, today, language))
    );

    const futureSeries = enrichedCandidates.filter(Boolean).filter((item) => isMediaUpcoming(item, today));

    return {
      ...brandNewData,
      page,
      total_pages: Math.max(brandNewData.total_pages || 1, returningData.total_pages || 1),
      results: futureSeries.map((item) => new Series(item))
    };
  }

  /**
   * Get TV series by category/genre
   * @param {string} categoryKey
   * @param {Object} [params={}]
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {string} [params.sortBy='popularity.desc']
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getSeriesByCategory(categoryKey, { page = 1, language, sortBy = 'popularity.desc' } = {}) {
    if (categoryKey === 'upcoming') {
      return this.getUpcomingSeries({ page, language });
    }

    const config = SERIES_CATEGORY_CONFIG[categoryKey] || {};
    const today = new Date().toISOString().slice(0, 10);
    const queryParams = {
      page,
      sort_by: sortBy,
      'first_air_date.lte': today,
      language,
      ...(config.genreId ? { with_genres: config.genreId } : {}),
      ...(config.additionalParams || {})
    };

    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.discoverTv(queryParams);
    return {
      ...data,
      results: (data.results || []).map((item) => new Series(item))
    };
  }

  /**
   * Get trending TV series (today, this week or this month)
   * @param {Object} [params={}]
   * @param {string} [params.timeWindow='month']
   * @param {number} [params.page=1]
   * @param {string} [params.language]
   * @param {boolean} [params.onlyReleased]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async getTrendingSeries({ timeWindow = 'month', page = 1, language, onlyReleased, limit = 10 } = {}) {
    /** @type {import('../../service/ApiServiceHelpers.js').ApiPage} */
    const data = await this.apiService.getTrendingTv(timeWindow, { page, language });
    let items = data.results || [];
    if (onlyReleased) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter((s) => {
        const release = s.firstAirDate || s.first_air_date;
        return !release || release <= today;
      });
    }
    if (typeof limit === 'number' && limit > 0) {
      items = items.slice(0, limit);
    }
    return {
      ...data,
      results: items.map((item) => new Series(item))
    };
  }

  /**
   * Search TV series by title, genre, actor or director.
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeries(params = {}) {
    // Blank spaces are removed by the shared search normalizer.
    return this._searchMedia('tv', params, Series);
  }

  /**
   * Search TV series by genre ID or localized name.
   * @param {import('../../utils/search.js').MediaSearchParams} [params={}]
   * @returns {Promise<{ page: number, total_pages: number, total_results: number, results: Array<Series> }>}
   */
  async searchSeriesByGenre(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'genre' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchSeriesByActor(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'actor' });
  }

  /** @param {import('../../utils/search.js').MediaSearchParams} [params={}] */
  async searchSeriesByDirector(params = {}) {
    return this.searchSeries({ ...params, searchBy: 'director' });
  }

  /**
   * Get TV series details with seasons list and aggregate credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Series>}
   */
  async getSeriesDetails({ seriesId, appendAggregateCredits = true, language } = {}) {
    if (!seriesId) throw new Error('seriesId is required');

    const data = await this.apiService.getTvSeriesDetails(seriesId, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : '',
      language
    });

    return new Series(data);
  }

  /**
   * Get season details including all episodes and guest stars as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {boolean} [params.appendAggregateCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Season>}
   */
  async getSeasonDetails({ seriesId, seasonNumber, appendAggregateCredits = true, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined) {
      throw new Error('seriesId and seasonNumber are required');
    }

    /** @type {ConstructorParameters<typeof Season>[0]} */
    const data = await this.apiService.getSeasonDetails(seriesId, seasonNumber, {
      append_to_response: appendAggregateCredits ? 'aggregate_credits' : '',
      language
    });

    return new Season({ ...data, seriesId });
  }

  /**
   * Get individual episode details with credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.seriesId]
   * @param {number|string} [params.seasonNumber]
   * @param {number|string} [params.episodeNumber]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Episode>}
   */
  async getEpisodeDetails({ seriesId, seasonNumber, episodeNumber, appendCredits = true, language } = {}) {
    if (seriesId === undefined || seasonNumber === undefined || episodeNumber === undefined) {
      throw new Error('seriesId, seasonNumber and episodeNumber are required');
    }

    /** @type {ConstructorParameters<typeof Episode>[0]} */
    const data = await this.apiService.getEpisodeDetails(seriesId, seasonNumber, episodeNumber, {
      append_to_response: appendCredits ? 'credits' : '',
      language
    });

    const guestStars = data.guest_stars || data.credits?.guest_stars || [];
    const cameos = data.cameos || cameoBackend.extractCameosFromGuestStars(guestStars).filter((star) => star.isCameoHighlight);

    return new Episode({ ...data, seriesId, seasonNumber, cameos });
  }
}

export const seriesBackend = new SeriesBackend();
export default SeriesBackend;
