import { apiService as defaultApiService } from '../service/ApiService.js';
import { normalizeMediaSearch, emptySearchPage } from '../utils/search.js';
import { isExcludedMedia, isVideoMedia } from '../models/utils/index.js';

const PAGE_SIZE = 20;

/** Common remote search operations for media backends. */
export class BaseBackend {
  /** @param {import('../service/ApiService.js').ApiService} [apiService] */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
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
    return { ...data, results: (data.results || []).filter((item) => !isVideoMedia(item)).map((item) => new ModelClass(item)) };
  }
}

export default BaseBackend;
