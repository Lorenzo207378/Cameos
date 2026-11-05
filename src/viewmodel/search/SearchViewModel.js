import { BaseViewModel } from '../BaseViewModel.js';
import { movieRepository, seriesRepository, personRepository } from '../../repository/index.js';
import { normalizeSearchRequest, matchSearchGenres, MAX_SEARCH_PAGE_BATCH } from '../../utils/search.js';
import { translate } from '../../utils/translations.js';

/** Prepare independent search carousels, sharing people requests and existing repository policies. */
export class SearchViewModel extends BaseViewModel {
  constructor({ movies = movieRepository, series = seriesRepository, people = personRepository } = {}, options = {}) {
    super({ query: '', filter: 'all', sections: [], loading: true, hasSearched: false, hasResults: false, hasFailures: false }, options);
    this.media = [
      { type: 'movie', repository: movies, search: (params) => movies.searchMovies(params), titleKey: 'nav.movies' },
      { type: 'tv', repository: series, search: (params) => series.searchSeries(params), titleKey: 'nav.tvSeries' }
    ];
    this.people = people;
    this._generation = 0;
  }

  _resultState(sections) {
    return { sections, hasResults: sections.some((section) => section.items.length > 0),
      hasFailures: sections.some((section) => section.error) };
  }

  _section(id, title, kind, type, fetchPage) {
    return { id, title, kind, type, fetchPage, items: [], page: 0, hasMore: false,
      isLoadingMore: false, error: false, onLoadMore: () => this.loadMore(id) };
  }

  async _loadSection(section, page = 1) {
    try {
      let response;
      // A filtered page can be empty while later remote pages still contain valid results.
      // Limit automatic scanning so one search never walks the entire remote catalog.
      for (let attempt = 0; attempt < MAX_SEARCH_PAGE_BATCH; attempt++) {
        response = await section.fetchPage(page);
        if (response.results?.length || (response.page || page) >= response.total_pages || attempt === MAX_SEARCH_PAGE_BATCH - 1) break;
        page = (response.page || page) + 1;
      }
      return { ...section, items: response.results || [], page: response.page || page,
        hasMore: (response.page || page) < response.total_pages, isLoadingMore: false, error: false };
    } catch {
      return { ...section, isLoadingMore: false, error: true };
    }
  }

  _titleSections(query, language) {
    return this.media.map((media) => this._loadSection(this._section(media.type,
      translate(media.titleKey, language), 'media', media.type,
      (page) => media.search({ query, page, language }))));
  }

  _peopleSections(query, filter, language) {
    const pages = new Map();
    const roles = [
      { id: 'actor', department: 'Acting', title: 'search.actors', role: 'actor.acting', credits: 'cast' },
      { id: 'director', department: 'Directing', title: 'search.directors', role: 'detail.directing', credits: 'crew' }
    ];
    return roles.filter((role) => filter === 'all' || filter === role.id).map((role) => {
      const fetchPage = async (page) => {
        if (!pages.has(page)) pages.set(page, this.people.searchPeople({ query, page, language }));
        const response = await pages.get(page);
        return { ...response, results: response.results
          .filter((person) => person.knownForDepartment === role.department)
          .map((person) => ({ ...person, role: translate(role.role, language), personCredits: role.credits })) };
      };
      return this._loadSection(this._section(role.id, translate(role.title, language), 'people', null, fetchPage));
    });
  }

  /**
   * @param {Object<string, *>} item
   * @param {string} mediaType
   * @param {string} language
   */
  _mediaItem(item, mediaType, language) {
    const title = item.getTitle?.(language) || item.title || item.name;
    return { ...item, mediaType, title, name: title };
  }

  async _genreSections(query, language) {
    const registries = await Promise.allSettled(this.media.map(async (media) => {
      const data = await media.repository.getGenres({ language });
      return data.genres.map((genre) => ({ ...genre, mediaType: media.type }));
    }));
    const genres = matchSearchGenres(query, registries.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
    /** @type {Object[]} */
    const sections = await Promise.all(genres.map((genre) => {
      const sources = this.media.filter((media) => genre.mediaTypes.includes(media.type));
      const totals = new Map();
      const fetchPage = async (page) => {
        const responses = await Promise.all(sources.map(async (media) => {
          if (totals.has(media.type) && page > totals.get(media.type)) return { results: [], total_pages: totals.get(media.type) };
          const response = await media.search({ searchBy: 'genre', genreId: genre.id, page, language });
          totals.set(media.type, response.total_pages);
          return { ...response, results: response.results.map((item) => this._mediaItem(item, media.type, language)) };
        }));
        return { page, total_pages: Math.max(...responses.map((response) => response.total_pages)),
          results: responses.flatMap((response) => response.results).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)) };
      };
      return this._loadSection(this._section(`genre-${genre.id}`, genre.name, 'media', 'mixed', fetchPage));
    }));
    if (registries.some((result) => result.status === 'rejected')) {
      sections.push({ id: 'genre-error', items: [], error: true, hasMore: false });
    }
    return sections;
  }

  /**
   * @param {string} query
   * @param {string} [filter='all']
   * @param {string} [language]
   */
  search = async (query, filter = 'all', language = this.language) => {
    ({ query, filter } = normalizeSearchRequest(query, filter));
    this._generation += 1;
    this.setState({ query, filter, sections: [], hasSearched: false, hasResults: false, hasFailures: false });
    return this.runAsync('search', async () => {
      if (!query) return [];
      const requests = [];
      if (filter === 'all' || filter === 'title') requests.push(...this._titleSections(query, language));
      if (filter === 'all' || filter === 'actor' || filter === 'director') requests.push(...this._peopleSections(query, filter, language));
      if (filter === 'all' || filter === 'genre') requests.push(this._genreSections(query, language));
      return (await Promise.all(requests)).flat();
    }, (sections) => ({ ...this._resultState(sections), hasSearched: Boolean(query) }));
  };

  loadMore = async (id) => {
    const section = this.state.sections.find((item) => item.id === id);
    if (!section || section.isLoadingMore || !section.hasMore) return;
    const generation = this._generation;
    this.setState({ sections: this.state.sections.map((item) => item.id === id ? { ...item, isLoadingMore: true } : item) });
    const next = await this._loadSection(section, section.page + 1);
    if (generation !== this._generation) return;
    const items = [...new Map([...section.items, ...next.items].map((item) => [`${item.mediaType || section.type}:${item.id}`, item])).values()];
    this.setState(this._resultState(this.state.sections.map((item) => item.id === id ? { ...next, items } : item)));
  };

  retrySearch = async () => this.search(this.state.query, this.state.filter);
}

export default SearchViewModel;
