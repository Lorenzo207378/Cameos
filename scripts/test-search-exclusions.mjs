import assert from 'node:assert/strict';
import test from 'node:test';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { SearchViewModel } from '../src/viewmodel/search/SearchViewModel.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';

const types = [
  { kind: 'movie', search: 'searchMovies', prefix: 'search_movies', Backend: MovieBackend, Repository: MovieRepository, Model: Movie, store: STORES.MOVIES },
  { kind: 'tv', search: 'searchSeries', prefix: 'search_series', Backend: SeriesBackend, Repository: SeriesRepository, Model: Series, store: STORES.SERIES }
];

function entries() {
  const named = (id, suffix, metadata = {}) => ({ id, title: `Shared ${suffix}`, name: `Shared ${suffix}`, popularity: id, ...metadata });
  return [
    named(1, 'story', { genre_ids: [18] }),
    named(2, 'documentary', { genre_ids: [99] }),
    named(3, 'talk show', { genreIds: ['10767'] }),
    named(4, 'reality', { genres: [{ id: 10764, name: 'Reality' }] }),
    named(5, 'news', { genre_ids: [18, 10763] }),
    named(6, 'Academy Awards', { genre_ids: [] }),
    named(7, 'video', { video: true }),
    named(8, 'short', { genre_ids: [], vote_count: 0, runtime: 5 }),
    named(9, 'TV movie', { genre_ids: [10770] }),
    { id: 10, titles: { it: 'Shared Emmy Awards', en: 'Shared Emmy Awards' }, names: { it: 'Shared Emmy Awards', en: 'Shared Emmy Awards' } },
    named(11, 'guest appearance', { character: 'Self - Presenter' })
  ];
}

const ids = (items) => items.map((item) => item.id).sort((a, b) => a - b);
const pageOf = (results, page = 2) => ({ page, total_pages: 8, total_results: 151, results });

for (const { kind, search, prefix, Backend, Repository, Model, store } of types) {
  test(`${kind}: all search criteria apply the existing filmography exclusions without extra detail requests`, async () => {
    const calls = [];
    const respond = (criterion, params) => { calls.push(criterion); return pageOf(entries(), params.page); };
    const api = {
      searchMovie: async (params) => respond('title', params),
      searchTv: async (params) => respond('title', params),
      searchMoviesByGenre: async (params) => respond('genre', params),
      searchSeriesByGenre: async (params) => respond('genre', params),
      getPersonMediaCredits: async () => {
        calls.push('credits');
        return { cast: entries(), crew: entries().map((item) => ({ ...item, job: 'Director' })) };
      }
    };
    const backend = new Backend(api);
    for (const params of [{ query: 'Shared' }, { searchBy: 'genre', genreId: 18 }]) {
      const response = await backend[search]({ ...params, page: 2 });
      assert.deepEqual(ids(response.results), [1, 8, 9]);
      assert.ok(response.results.every((item) => item instanceof Model));
      assert.equal(response.page, 2);
      assert.equal(response.total_pages, 8);
      assert.equal(response.total_results, 151);
    }
    for (const searchBy of ['actor', 'director']) {
      const response = await backend[search]({ searchBy, personId: 42 });
      assert.deepEqual(ids(response.results), [1, 8, 9]);
      assert.equal(response.total_results, 3);
      assert.equal(response.total_pages, 1);
    }
    assert.deepEqual(calls, ['title', 'genre', 'credits', 'credits']);
  });

  test(`${kind}: old cached query pages are filtered offline for title, genre, actor and director`, async () => {
    const storage = new IndexedDBService();
    const repository = new Repository(new Backend(), storage);
    repository.setOnlineOverride(false);
    // Cached domain models retain classification fields but not person-credit character strings.
    // The Series model does not carry Movie's video flag.
    const records = entries().filter((item) => item.id !== 11 && (kind === 'movie' || item.id !== 7));
    const criteria = [
      { params: { query: 'Shared' }, suffix: '', key: { query: 'shared' } },
      { params: { searchBy: 'genre', genreId: 18 }, suffix: '_by_genre', key: { genreId: 18 } },
      { params: { searchBy: 'actor', personId: 42 }, suffix: '_by_actor', key: { personId: 42 } },
      { params: { searchBy: 'director', personId: 42 }, suffix: '_by_director', key: { personId: 42 } }
    ];
    for (const { params, suffix, key } of criteria) {
      const cacheKey = repository.buildCacheKey(prefix + suffix, { ...key, page: 2, language: 'it-IT' });
      await storage.put(STORES.QUERIES, { cacheKey, data: pageOf(records) });
      const response = await repository[search]({ ...params, page: 2 });
      assert.deepEqual(ids(response.results), [1, 8, 9]);
      assert.equal(response.page, 2);
      assert.equal(response.total_pages, 8);
      assert.equal(response.total_results, 151);
    }
  });

  test(`${kind}: offline title fallback filters saved entities before computing local totals`, async () => {
    const storage = new IndexedDBService();
    const repository = new Repository(new Backend(), storage);
    repository.setOnlineOverride(false);
    const records = entries().filter((item) => item.id !== 11 && (kind === 'movie' || item.id !== 7));
    for (const record of records) {
      await storage.put(store, { cacheKey: `${kind}:${record.id}:it-IT`, id: record.id, language: 'it-IT', data: new Model(record) });
    }
    const response = await repository[search]({ query: 'Shared' });
    assert.deepEqual(ids(response.results), [1, 8, 9]);
    assert.equal(response.total_results, 3);
    assert.equal(response.total_pages, 1);
  });
}

test('movie and TV search pagination skips pages emptied by genre exclusions and preserves existing results', async () => {
  const calls = [];
  const fetchPage = (kind, { page }) => {
    calls.push([kind, page]);
    const genre = [99, 10767, 18, 10764, 18][page - 1];
    return { page, total_pages: 5, total_results: 100,
      results: [{ id: page, title: `Story ${page}`, name: `Story ${page}`, genre_ids: [genre] }] };
  };
  const api = {
    searchMovie: async (params) => fetchPage('movie', params),
    searchTv: async (params) => fetchPage('tv', params)
  };
  const storage = new IndexedDBService();
  const vm = new SearchViewModel({
    movies: new MovieRepository(new MovieBackend(api), storage),
    series: new SeriesRepository(new SeriesBackend(api), storage)
  });
  await vm.search('Requested title', 'title');
  for (const kind of ['movie', 'tv']) {
    const section = vm.state.sections.find((item) => item.id === kind);
    assert.deepEqual(ids(section.items), [3]);
    assert.equal(section.page, 3);
    assert.equal(section.hasMore, true);
    assert.deepEqual(calls.filter(([type]) => type === kind).map(([, page]) => page), [1, 2, 3]);
    await vm.loadMore(kind);
    const loaded = vm.state.sections.find((item) => item.id === kind);
    assert.deepEqual(ids(loaded.items), [3, 5]);
    assert.equal(loaded.page, 5);
    assert.equal(loaded.hasMore, false);
  }
  assert.equal(vm.state.hasFailures, false);
});
