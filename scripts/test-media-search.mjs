import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiService } from '../src/service/ApiService.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { normalizeMediaSearch } from '../src/utils/search.js';
import { BaseViewModel } from '../src/viewmodel/BaseViewModel.js';

const types = [
  { mediaType: 'movie', name: 'Movies', Backend: MovieBackend, Repository: MovieRepository, ViewModel: MovieViewModel, Model: Movie, store: STORES.MOVIES },
  { mediaType: 'tv', name: 'Series', Backend: SeriesBackend, Repository: SeriesRepository, ViewModel: SeriesViewModel, Model: Series, store: STORES.SERIES }
];
const pageOf = (results, page = 1) => ({ page, results, total_pages: 3, total_results: 45 });
const media = (id, popularity = id) => ({ id, title: `Movie ${id}`, name: `Series ${id}`, popularity, genre_ids: [18] });

function makeApi() {
  const calls = [];
  const api = {
    searchMovie: async (params) => { calls.push(['title', params]); return pageOf([media(1)], params.page); },
    searchTv: async (params) => { calls.push(['title', params]); return pageOf([media(1)], params.page); },
    searchMoviesByGenre: async (params) => { calls.push(['genre', params]); return pageOf([media(2)], params.page); },
    searchSeriesByGenre: async (params) => { calls.push(['genre', params]); return pageOf([media(2)], params.page); },
    getGenres: async (type, params) => {
      calls.push(['genres', type, params]);
      return { genres: [{ id: 18, name: params.language?.startsWith('en') ? 'Drama' : 'Dramma' }] };
    },
    searchPeople: async (params) => {
      calls.push(['people', params]);
      return { results: [{ id: 90, name: 'Different Name' }, { id: 42, name: 'Test Person' }] };
    },
    getPersonMediaCredits: async (id, type, params) => {
      calls.push(['credits', id, type, params]);
      return {
        cast: [...Array.from({ length: 25 }, (_, index) => media(index + 1)), { ...media('25'), character: 'Another role' }, { ...media(99), genre_ids: [99] }],
        crew: [{ ...media(7), job: 'Director' }, { ...media('7'), job: 'Director' },
          { ...media(8), job: 'Producer' }, { ...media(9), job: 'Assistant Director', department: 'Directing' }]
      };
    }
  };
  return { api, calls };
}

for (const { mediaType, name, Backend, Repository, ViewModel, Model, store } of types) {
  const searchMethod = `search${name}`;

  test(`${name}: title and genre search support existing IDs and localized names`, async () => {
    const { api, calls } = makeApi();
    const backend = new Backend(api);
    let response = await backend[searchMethod]({ query: '  Sample title  ', page: 2, language: 'en-US' });
    assert.ok(response.results[0] instanceof Model);
    assert.deepEqual(calls.at(-1), ['title', { query: 'Sample title', page: 2, language: 'en-US' }]);
    const before = calls.length;
    assert.deepEqual(await backend[searchMethod]({ query: '  ' }), { page: 1, total_pages: 0, total_results: 0, results: [] });
    assert.equal(calls.length, before);
    response = await backend[`${searchMethod}ByGenre`]({ genreId: '18', page: 2 });
    assert.equal(response.page, 2);
    assert.ok(response.results[0] instanceof Model);
    assert.equal(calls.some(([kind]) => kind === 'genres'), false);
    await backend[`${searchMethod}ByGenre`]({ query: ' drAMMa ', language: 'it-IT' });
    assert.equal(calls.at(-1)[1].genreId, 18);
    await backend[`${searchMethod}ByGenre`]({ query: 'Drama', language: 'en-US' });
    assert.equal(calls.at(-1)[1].genreId, 18);
    response = await backend[`${searchMethod}ByGenre`]({ query: 'Unknown' });
    assert.equal(response.total_results, 0);
  });

  test(`${name}: actor/director names and IDs return only relevant deduplicated credits`, async () => {
    const { api, calls } = makeApi();
    const backend = new Backend(api);
    const first = await backend[`${searchMethod}ByActor`]({ query: ' test person ', language: 'en-US' });
    assert.equal(first.total_results, 25);
    assert.equal(first.total_pages, 2);
    assert.equal(first.results.length, 20);
    assert.equal(first.results[0].id, 25);
    assert.ok(first.results.every((item) => item instanceof Model));
    assert.deepEqual(calls.at(-1), ['credits', 42, mediaType, { language: 'en-US' }]);
    const second = await backend[`${searchMethod}ByActor`]({ personId: '42', page: 2 });
    assert.deepEqual(second.results.map((item) => item.id), [5, 4, 3, 2, 1]);
    assert.equal(calls.filter(([kind]) => kind === 'people').length, 1);
    assert.equal((await backend[`${searchMethod}ByActor`]({ personId: 42, page: 3 })).results.length, 0);
    const directed = await backend[`${searchMethod}ByDirector`]({ query: 'Test Person' });
    assert.deepEqual(directed.results.map((item) => item.id), [7]);
    const byId = await backend[`${searchMethod}ByDirector`]({ personId: 42, query: 'Ignored' });
    assert.deepEqual(byId.results.map((item) => item.id), [7]);
    api.searchPeople = async () => ({ results: [] });
    assert.equal((await backend[`${searchMethod}ByActor`]({ query: 'Missing' })).total_results, 0);
    api.searchPeople = async () => ({ results: [{ id: 12, name: 'Most relevant result' }] });
    await backend[`${searchMethod}ByDirector`]({ query: 'Partial name' });
    assert.equal(calls.at(-1)[1], 12);
  });

  test(`${name}: all four searches cross ViewModel, repository and backend and work from cache offline`, async () => {
    const { api, calls } = makeApi();
    const storage = new IndexedDBService();
    const repository = new Repository(new Backend(api), storage);
    const vm = new ViewModel(repository, { language: 'it-IT' });
    const cases = [
      [searchMethod, ['Sample', 2, 'en-US']],
      [`${searchMethod}ByGenre`, [18, 2, 'en-US']],
      [`${searchMethod}ByActor`, ['Test Person', 2, 'en-US']],
      [`${searchMethod}ByDirector`, [{ personId: '42', language: 'en-US' }]]
    ];
    for (const [method, args] of cases) {
      repository.setOnlineOverride(true);
      const online = await vm[method](...args);
      assert.ok(online.results[0] instanceof Model);
      assert.equal(vm.state.searchResults[0].id, online.results[0].id);
      assert.equal(vm.state.page, online.page);
      assert.equal(vm.state.totalPages, online.total_pages);
      assert.equal(vm.state.totalResults, online.total_results);
      repository.setOnlineOverride(false);
      const callCount = calls.length;
      const offline = await vm[method](...args);
      assert.ok(offline.results[0] instanceof Model);
      assert.deepEqual(offline.results.map((item) => item.id), online.results.map((item) => item.id));
      assert.equal(calls.length, callCount);
    }
    const keys = (await storage.getAll(STORES.QUERIES)).map((entry) => entry.cacheKey);
    const prefix = name === 'Movies' ? 'search_movies' : 'search_series';
    assert.ok(keys.includes(`${prefix}:language=en-US&page=2&query=sample`));
    assert.ok(keys.includes(`${prefix}_by_genre:genreId=18&language=en-US&page=2`));
    assert.equal(keys.length, 4);
    assert.ok((await storage.getAll(store)).length > 0);
    assert.equal(vm.state.loading, false);
    assert.equal(vm.state.error, null);
  });

  test(`${name}: repository aliases share normalization and distinguish IDs, names, language, pages and criteria`, async () => {
    const { api } = makeApi();
    const repository = new Repository(new Backend(api), new IndexedDBService());
    const actor = `${searchMethod}ByActor`;
    await repository[actor]({ personId: '42', query: 'Unused', language: 'it' });
    await repository[actor]({ personId: 42, language: 'it-IT' });
    await repository[actor]({ personId: 42, language: 'en-US' });
    await repository[actor]({ personId: 42, page: 2 });
    await repository[actor]({ query: ' Test Person ' });
    await repository[actor]({ query: 'test person' });
    await repository[`${searchMethod}ByGenre`]({ query: 'Dramma' });
    await repository[`${searchMethod}ByDirector`]({ personId: 42 });
    assert.equal((await repository.storage.getAll(STORES.QUERIES)).length, 6);
    api.getPersonMediaCredits = async () => { throw new Error('Network failed'); };
    const cached = await repository[actor]({ personId: 42 });
    assert.ok(cached.results[0] instanceof Model);
    await assert.rejects(repository[actor]({ personId: 999 }), /Network failed/);
    repository.setOnlineOverride(false);
    await assert.rejects(repository[actor]({ query: 'Not cached' }), /cache/);
  });

  test(`${name}: title fallback still searches cached entities without confusing person names with titles`, async () => {
    const storage = new IndexedDBService();
    const repository = new Repository(new Backend(makeApi().api), storage);
    const entity = new Model({ ...media(1), title: 'Sample', name: 'Sample', original_title: 'Sample', original_name: 'Sample' });
    await storage.put(store, { cacheKey: 'cached', id: 1, language: 'it-IT', data: entity });
    repository.setOnlineOverride(false);
    const result = await repository[searchMethod]({ query: 'Sample' });
    assert.equal(result.results[0].id, 1);
    await assert.rejects(repository[`${searchMethod}ByActor`]({ query: 'Sample' }), /cache/);
  });

  test(`${name}: a newer criterion wins and validation failures set the usual error state`, async () => {
    let finish;
    const repository = { [searchMethod]: (params) => params.searchBy === 'title'
      ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve(pageOf([media(2)])) };
    const vm = new ViewModel(repository);
    const older = vm[searchMethod]('Old title');
    await vm[`${searchMethod}ByGenre`]('Drama');
    finish(pageOf([media(1)]));
    await older;
    assert.equal(vm.state.searchResults[0].id, 2);
    const real = new ViewModel(new Repository(new Backend(makeApi().api), new IndexedDBService()));
    assert.equal(await real[`${searchMethod}ByActor`]({ personId: -1 }), null);
    assert.match(real.state.error, /personId/);
    assert.equal(real.state.loading, false);
  });
}

test('shared input validation rejects unsupported criteria, invalid identifiers and pages before network access', () => {
  for (const params of [{ searchBy: 'unknown' }, { page: 0 }, { page: 1.5 },
    { searchBy: 'genre' }, { searchBy: 'genre', genreId: 0 }, { searchBy: 'genre', genreId: '18x' },
    { searchBy: 'actor' }, { searchBy: 'director', personId: 'NaN' }]) {
    assert.throws(() => normalizeMediaSearch(params));
  }
  assert.equal(normalizeMediaSearch({ query: null }).query, '');
  assert.equal(normalizeMediaSearch({ searchBy: 'genre', genreId: '18,28|35' }).genreId, '18,28|35');
  const vm = new BaseViewModel();
  assert.deepEqual(vm._mediaSearchInput('42', 2, 'it', 'actor'), { personId: '42', page: 2, language: 'it', searchBy: 'actor' });
  assert.equal(vm._mediaSearchInput({ searchBy: 'title', query: 'Name' }, 1, 'it', 'director').searchBy, 'director');
});

test('person credits preserve localized media titles, overviews, artwork and original credit jobs', async () => {
  const api = new ApiService({ apiKey: 'test' });
  const calls = [];
  api.fetch = async (endpoint, params) => {
    calls.push([endpoint, params]);
    if (endpoint === '/search/person') return { results: [{ id: 42, name: 'Person' }] };
    const italian = params.language === 'it-IT';
    return { id: 42, cast: [{ id: 1, title: italian ? 'Titolo' : 'Title', overview: italian ? 'Trama' : 'Overview', posterUrl: { it: 'it.jpg', en: 'en.jpg' }, genre_ids: [18] }],
      crew: [{ id: 1, title: italian ? 'Titolo' : 'Title', job: 'Producer' }, { id: 1, title: italian ? 'Titolo' : 'Title', job: 'Director' }] };
  };
  const backend = new MovieBackend(api);
  const result = await backend.searchMoviesByActor({ query: 'Person', language: 'it-IT' });
  assert.equal(result.results[0].getTitle('it'), 'Titolo');
  assert.equal(result.results[0].getTitle('en'), 'Title');
  assert.equal(result.results[0].getOverview('it'), 'Trama');
  assert.equal(result.results[0].getPosterUrl('en'), 'en.jpg');
  assert.equal((await backend.searchMoviesByDirector({ personId: 42 })).results.length, 1);
  assert.ok(calls.some(([endpoint]) => endpoint === '/person/42/movie_credits'));
  assert.equal(calls.some(([, params]) => 'append_to_response' in params), false);
});

for (const { mediaType, name, Backend, Repository, ViewModel } of types) {
  test(`${name}: ApiService routes every criterion and keeps localized results through all layers`, async () => {
    const api = new ApiService({ apiKey: 'test' });
    const calls = [];
    api.fetch = async (endpoint, params) => {
      calls.push([endpoint, params]);
      if (endpoint === '/search/person') return { results: [{ id: 42, name: 'Person' }] };
      if (endpoint === `/genre/${mediaType}/list`) return { genres: [{ id: 18, name: 'Dramma' }] };
      const item = { ...media(1), title: params.language === 'it-IT' ? 'Titolo' : 'Title', name: params.language === 'it-IT' ? 'Titolo' : 'Title' };
      if (endpoint === `/person/42/${mediaType}_credits`) return { cast: [item], crew: [{ ...item, job: 'Director' }] };
      assert.ok([`/search/${mediaType}`, `/discover/${mediaType}`].includes(endpoint), endpoint);
      return pageOf([item], params.page);
    };
    const vm = new ViewModel(new Repository(new Backend(api), new IndexedDBService()));
    for (const [searchBy, query] of [['title', 'Sample'], ['genre', 'Dramma'], ['actor', 'Person'], ['director', 'Person']]) {
      const result = await vm[`search${name}`]({ searchBy, query, language: 'it-IT' });
      assert.ok(result, vm.state.error);
      const item = result.results[0];
      const getTitle = mediaType === 'movie' ? item.getTitle.bind(item) : item.getName.bind(item);
      assert.equal(getTitle('it'), 'Titolo');
      assert.equal(getTitle('en'), 'Title');
    }
    assert.ok(calls.some(([endpoint]) => endpoint === `/search/${mediaType}`));
    assert.ok(calls.some(([endpoint, params]) => endpoint === `/discover/${mediaType}` && params.with_genres === 18));
    assert.ok(calls.some(([endpoint]) => endpoint === `/person/42/${mediaType}_credits`));
  });
}
