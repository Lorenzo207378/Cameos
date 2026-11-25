import { BaseViewModel } from '../BaseViewModel.js';
import { movieRepository, seriesRepository, personRepository } from '../../repository/index.js';
import { normalizeSearchRequest, matchSearchGenres, MAX_SEARCH_PAGE_BATCH } from '../../utils/media/search.js';
import { translate } from '../../utils/language/translations.js';

/**
 * @typedef {Object} SearchSection
 * @property {string} id
 * @property {string} [title]
 * @property {string|null} [titleKey]
 * @property {'media'|'people'} [kind]
 * @property {string|null} [type]
 * @property {Array<Object>} items
 * @property {number} [page]
 * @property {boolean} hasMore
 * @property {boolean} [isLoadingMore]
 * @property {boolean} error
 * @property {(page: number, options?: { force?: boolean }) => Promise<Object>} [fetchPage]
 * @property {() => Promise<void>} [onLoadMore]
 */

/**
 * @typedef {import('../BaseViewModel.js').BaseViewModelState & {
 * query: string, filter: string, sections: Array<SearchSection>,
 * hasSearched: boolean, hasResults: boolean, hasFailures: boolean
 * }} SearchViewModelState
 */

/** Prepare independent search carousels, sharing people requests and existing repository policies. */
export class SearchViewModel extends BaseViewModel {
  constructor({ movies = movieRepository, series = seriesRepository, people = personRepository } = {}, options = {}) {
    super({ query: '', filter: 'all', sections: [], loading: false, hasSearched: false, hasResults: false, hasFailures: false }, options);
    this.media = [
      { type: 'movie', repository: movies, search: (params) => movies.searchMovies(params), titleKey: 'nav.movies' },
      { type: 'tv', repository: series, search: (params) => series.searchSeries(params), titleKey: 'nav.tvSeries' }
    ];
    this.people = people;
  }

  /** @override @returns {SearchViewModelState} */
  get state() {
    return /** @type {SearchViewModelState} */ (super.state);
  }

  _resultState(sections) {
    return { sections, hasResults: sections.some((section) => section.items.length > 0),
      hasFailures: sections.some((section) => section.error) };
  }

  /**
   * @param {string} id
   * @param {string} title
   * @param {'media'|'people'} kind
   * @param {string|null} type
   * @param {(page: number, options?: { force?: boolean }) => Promise<Object>} fetchPage
   * @param {string|null} [titleKey=null]
   * @returns {SearchSection}
   */
  _section(id, title, kind, type, fetchPage, titleKey = null) {
    return { id, title, titleKey, kind, type, fetchPage, items: [], page: 0, hasMore: false,
      isLoadingMore: false, error: false, onLoadMore: () => this.loadMore(id) };
  }

  async _loadSection(section, initialPage = 1, { force = false } = {}) {
    try {
      let currentPage = initialPage;
      let response;
      // A filtered page can be empty while later remote pages still contain valid results.
      // Limit automatic scanning so one search never walks the entire remote catalog.
      for (let attempt = 0; attempt < MAX_SEARCH_PAGE_BATCH; attempt++) {
        response = await section.fetchPage(currentPage, { force });
        if (response.results?.length || (response.page || currentPage) >= response.total_pages || attempt === MAX_SEARCH_PAGE_BATCH - 1) break;
        currentPage = (response.page || currentPage) + 1;
      }
      return { ...section, items: response.results || [], page: response.page || currentPage,
        hasMore: (response.page || currentPage) < response.total_pages, isLoadingMore: false, error: false };
    } catch {
      return { ...section, isLoadingMore: false, error: true };
    }
  }

  _titleSections(query, language, force = false) {
    return this.media.map((media) => this._loadSection(
      this._section(
        media.type,
        translate(media.titleKey, language),
        'media',
        media.type,
        (page, { force: forcePage = false } = {}) => media.search({ query, page, language, ...(forcePage ? { force: true } : {}) }),
        media.titleKey
      ),
      1,
      { force }
    ));
  }

  _peopleSections(query, filter, language, force = false) {
    const pages = new Map();
    const roles = [
      { id: 'actor', department: 'Acting', title: 'search.actors', role: 'actor.acting', credits: 'cast' },
      { id: 'director', department: 'Directing', title: 'search.directors', role: 'detail.directing', credits: 'crew' }
    ];
    return roles.filter((role) => filter === 'all' || filter === role.id).map((role) => {
      const fetchPage = async (page, { force: forcePage = false } = {}) => {
        if (!pages.has(page)) {
          const request = this.people.searchPeople({ query, page, language, ...(forcePage ? { force: true } : {}) });
          pages.set(page, request);
          request.catch(() => {
            if (pages.get(page) === request) pages.delete(page);
          });
        }
        const response = await pages.get(page);
        return { ...response, results: response.results
          .filter((person) => person.knownForDepartment === role.department)
          .map((person) => ({ ...person, role: translate(role.role, language), personCredits: role.credits })) };
      };
      return this._loadSection(
        this._section(role.id, translate(role.title, language), 'people', null, fetchPage, role.title),
        1,
        { force }
      );
    });
  }

  /**
   * @param {Object<string, *>} item
   * @param {string} mediaType
   * @param {string} language
   */
  _mediaItem(item, mediaType, language) {
    const title = mediaType === 'movie'
      ? item.getTitle?.(language) || item.title
      : item.getName?.(language) || item.name;
    return { ...item, mediaType, [mediaType === 'movie' ? 'title' : 'name']: title };
  }

  async _genreSections(query, language, force = false) {
    const registries = await Promise.allSettled(this.media.map(async (media) => {
      const data = await media.repository.getGenres({ language, ...(force ? { force: true } : {}) });
      return data.genres.map((genre) => ({ ...genre, mediaType: media.type }));
    }));
    const genres = matchSearchGenres(query, registries.flatMap((result) => result.status === 'fulfilled' ? result.value : []));
    /** @type {Object[]} */
    const sections = await Promise.all(genres.map((genre) => {
      const sources = this.media.filter((media) => genre.mediaTypes.includes(media.type));
      const totals = new Map();
      const fetchPage = async (page, { force: forcePage = false } = {}) => {
        const responses = await Promise.all(sources.map(async (media) => {
          if (totals.has(media.type) && page > totals.get(media.type)) return { results: [], total_pages: totals.get(media.type) };
          const response = await media.search({
            searchBy: 'genre',
            genreId: genre.id,
            page,
            language,
            ...(forcePage ? { force: true } : {})
          });
          totals.set(media.type, response.total_pages);
          return { ...response, results: response.results.map((item) => this._mediaItem(item, media.type, language)) };
        }));
        return { page, total_pages: Math.max(...responses.map((response) => response.total_pages)),
          results: responses.flatMap((response) => response.results).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)) };
      };
      return this._loadSection(
        this._section(`genre-${genre.id}`, genre.name, 'media', 'mixed', fetchPage),
        1,
        { force }
      );
    }));
    if (registries.some((result) => result.status === 'rejected')) {
      sections.push({ id: 'genre-error', items: [], error: true, hasMore: false });
    }
    return sections;
  }

  /**
   * @param {string} rawQuery
   * @param {string} [rawFilter='all']
   * @param {string} [requestedLanguage]
   * @param {{ force?: boolean }} [options={}]
   */
  search = async (rawQuery, rawFilter = 'all', requestedLanguage = this.language, { force = false } = {}) => {
    const { query, filter } = normalizeSearchRequest(rawQuery, rawFilter);
    this.setLanguage(requestedLanguage);
    const language = this.language;
    this.setState({ query, filter, sections: [], hasSearched: false, hasResults: false, hasFailures: false });
    return this.runAsync('search', async () => {
      if (!query) return [];
      const requests = [];
      if (filter === 'all' || filter === 'title') requests.push(...this._titleSections(query, language, force));
      if (filter === 'all' || filter === 'actor' || filter === 'director') requests.push(...this._peopleSections(query, filter, language, force));
      if (filter === 'all' || filter === 'genre') requests.push(this._genreSections(query, language, force));
      return (await Promise.all(requests)).flat();
    }, (sections) => ({ ...this._resultState(sections), hasSearched: Boolean(query) }));
  };

  loadMore = async (id) => {
    const section = this.state.sections.find((item) => item.id === id);
    if (!section || section.isLoadingMore || !section.hasMore) return;
    const searchSeq = this._requestCounters.get('search') || 0;
    this.setState({ sections: this.state.sections.map((item) => item.id === id ? { ...item, isLoadingMore: true } : item) });
    const next = await this._loadSection(section, (section.page || 0) + 1);
    if (searchSeq !== (this._requestCounters.get('search') || 0)) return;
    const items = [...new Map([...section.items, ...next.items].map((item) => [`${item.mediaType || section.type}:${item.id}`, item])).values()];
    this.setState(this._resultState(this.state.sections.map((item) => item.id === id ? { ...next, items } : item)));
  };

  retrySearch = async () => this.search(this.state.query, this.state.filter, this.language, { force: true });
}

export default SearchViewModel;
