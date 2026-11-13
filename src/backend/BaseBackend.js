import { apiService as defaultApiService } from '../service/ApiService.js';
import { normalizeMediaSearch, emptySearchPage } from '../utils/search.js';
import { isExcludedMedia } from '../models/utils/index.js';

const PAGE_SIZE = 20;

/** Common remote search operations for media backends. */
export class BaseBackend {
  /** @param {import('../service/ApiService.js').ApiService} [apiService] */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
  }

  /** Fetch localized genre list for movie or tv media. */
  async _getGenres(mediaType, params = {}) {
    return this.apiService.getGenres(mediaType, params);
  }

  /** Map a paginated API payload into domain models while keeping pagination metadata. */
  _mapPaginatedResults(data = {}, mapItem = (item) => item) {
    return {
      ...data,
      results: (data.results || []).map(mapItem)
    };
  }

  /** Discover media with common filter parameters and domain model mapping. */
  async _discoverMedia(
    { page = 1, sortBy = 'popularity.desc', genreId, watchProviderId, keywords, language } = {},
    discoverCall,
    ModelClass
  ) {
    const data = await discoverCall({
      page,
      sort_by: sortBy,
      with_genres: genreId,
      with_watch_providers: watchProviderId,
      watch_region: watchProviderId ? 'IT' : undefined,
      with_keywords: keywords,
      language
    });
    return this._mapPaginatedResults(data, (item) => new ModelClass(item));
  }

  /** Fetch media items for a configured category key (or delegate to upcoming feed). */
  async _getMediaByCategory(
    categoryConfigMap,
    categoryKey,
    { page = 1, language, sortBy = 'popularity.desc' } = {},
    { dateField, getUpcoming, discoverCall, ModelClass }
  ) {
    if (categoryKey === 'upcoming') {
      return getUpcoming({ page, language });
    }

    const config = categoryConfigMap[categoryKey] || {};
    const today = new Date().toISOString().slice(0, 10);
    const data = await discoverCall({
      page,
      sort_by: sortBy,
      [dateField]: today,
      language,
      ...(config.genreId ? { with_genres: config.genreId } : {}),
      ...(config.additionalParams || {})
    });
    return this._mapPaginatedResults(data, (item) => new ModelClass(item));
  }

  /** Fetch trending media with optional released-date filtering and result cap. */
  async _getTrendingMedia(
    { timeWindow = 'month', page = 1, language, onlyReleased, limit = 10 } = {},
    { dateFields, trendingCall, ModelClass }
  ) {
    const data = await trendingCall(timeWindow, { page, language });
    let items = data.results || [];
    if (onlyReleased) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter((item) => {
        const releaseDate = item[dateFields[0]] || item[dateFields[1]];
        return !releaseDate || releaseDate <= today;
      });
    }
    if (typeof limit === 'number' && limit > 0) {
      items = items.slice(0, limit);
    }
    return this._mapPaginatedResults({ ...data, results: items }, (item) => new ModelClass(item));
  }

  /** Run an async enrichment worker over an array with bounded concurrency, preserving order. */
  async _enrichWithConcurrency(items = [], concurrency = 4, workerFn) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const results = new Array(items.length);
    const workerCount = Math.min(Math.max(1, concurrency), items.length);
    let nextIndex = 0;

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < items.length) {
          const currentIndex = nextIndex++;
          results[currentIndex] = await workerFn(items[currentIndex], currentIndex);
        }
      })
    );
    return results;
  }

  /** Resolve the most relevant person, preferring an exact name among the API matches. */
  async _resolvePersonId(query, language) {
    const data = await this.apiService.searchPeople({ query, page: 1, language });
    const people = data.results || [];
    const person = people.find((item) => item.name?.toLowerCase() === query.toLowerCase()) || people[0];
    return person?.id;
  }

  /** Search actor/director credits, deduplicate media, then paginate the complete result. */
  async _searchPersonCredits(mediaType, { searchBy, query, personId, page, language }) {
    personId ??= await this._resolvePersonId(query, language);
    if (!personId) return emptySearchPage(page);
    const credits = await this.apiService.getPersonMediaCredits(personId, mediaType, { language });
    const items = searchBy === 'actor' ? credits.cast || [] : (credits.crew || []).filter((item) => item.job === 'Director');
    const unique = new Map();
    for (const item of items) {
      const excluded = isExcludedMedia({
        ...item, genreIds: item.genreIds || item.genre_ids,
        title: item.title || item.name || Object.values(item.titles || {})[0] || ''
      });
      if (item.id != null && !excluded && !unique.has(Number(item.id))) unique.set(Number(item.id), item);
    }
    const results = [...unique.values()].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    return {
      page, total_results: results.length, total_pages: Math.ceil(results.length / PAGE_SIZE),
      results: results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    };
  }

  /** Shared remote search for MovieBackend and SeriesBackend. */
  async _searchMedia(mediaType, params, ModelClass) {
    const search = normalizeMediaSearch(params);
    const { searchBy, query, page, language } = search;
    let data;
    if (searchBy === 'title') {
      if (!query) return emptySearchPage();
      data = mediaType === 'movie'
        ? await this.apiService.searchMovie({ query, page, language })
        : await this.apiService.searchTv({ query, page, language });
    } else if (searchBy === 'genre') {
      let genreId = search.genreId;
      if (!genreId) {
        const genres = await this.apiService.getGenres(mediaType, { language });
        genreId = genres.genres?.find((genre) => genre.name.toLowerCase() === query.toLowerCase())?.id;
        if (!genreId) return emptySearchPage(page);
      }
      data = mediaType === 'movie'
        ? await this.apiService.searchMoviesByGenre({ genreId, page, language })
        : await this.apiService.searchSeriesByGenre({ genreId, page, language });
    } else {
      data = await this._searchPersonCredits(mediaType, search);
    }
    // Raw credits retain role/video metadata; models also resolve localized title maps.
    const results = (data.results || []).filter((item) => !isExcludedMedia(item))
      .map((item) => new ModelClass(item)).filter((item) => !isExcludedMedia(item));
    return { ...data, results };
  }
}

export default BaseBackend;
