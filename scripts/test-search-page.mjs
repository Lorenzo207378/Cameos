import assert from 'node:assert/strict';
import test from 'node:test';
import { SearchViewModel } from '../src/viewmodel/search/SearchViewModel.js';
import { PersonBackend } from '../src/backend/person/PersonBackend.js';
import { PersonRepository } from '../src/repository/person/PersonRepository.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { matchSearchGenres, normalizeSearchRequest, MAX_GENRE_MATCHES } from '../src/utils/search.js';

function fixture() {
  const calls = [];
  const media = (type, Model) => ({
    getGenres: async ({ language }) => {
      calls.push({ kind: 'genres', type, language });
      return { genres: [{ id: 18, name: 'Dramma' }, { id: 35, name: 'Commedia' }] };
    },
    [type === 'movie' ? 'searchMovies' : 'searchSeries']: async (params) => {
      calls.push({ kind: 'media', type, ...params });
      const genre = params.searchBy === 'genre';
      return { page: params.page, total_pages: genre && type === 'movie' ? 1 : 2,
        results: [new Model({ id: params.page, title: `${params.query || 'Genre'} movie`, name: `${params.query || 'Genre'} series`, popularity: 10, release_date: '2020-01-01', first_air_date: '2020-01-01' })] };
    }
  });
  const repositories = {
    movies: media('movie', Movie), series: media('tv', Series),
    people: { searchPeople: async (params) => {
      calls.push({ kind: 'people', ...params });
      return { page: params.page, total_pages: 2, results: [
        { id: 10, name: `${params.query} Actor`, knownForDepartment: 'Acting' },
        { id: 11, name: `${params.query} Director`, knownForDepartment: 'Directing' },
        { id: 12, name: `${params.query} Producer`, knownForDepartment: 'Production' }
      ] };
    } }
  };
  return { calls, repositories, vm: new SearchViewModel(repositories) };
}

test('all prepares simultaneous movie, TV, actor, director and mixed genre carousels with one people request', async () => {
  const { vm, calls } = fixture();
  await vm.search(' dram ', 'all');
  assert.deepEqual(vm.state.sections.map((section) => section.id), ['movie', 'tv', 'actor', 'director', 'genre-18']);
  assert.equal(calls.filter((call) => call.kind === 'people').length, 1);
  const actor = vm.state.sections.find((section) => section.id === 'actor');
  const director = vm.state.sections.find((section) => section.id === 'director');
  assert.equal(actor.items[0].personCredits, 'cast');
  assert.equal(director.items[0].personCredits, 'crew');
  assert.equal(actor.items[0].role, 'Recitazione');
  assert.equal(director.items[0].role, 'Regia');
  const genre = vm.state.sections.at(-1);
  assert.equal(genre.type, 'mixed');
  assert.deepEqual(genre.items.map((item) => item.mediaType), ['movie', 'tv']);
  assert.equal(genre.items[0].title, 'Genre movie');
  assert.equal(genre.items[0].name, undefined);
  assert.equal(genre.items[1].name, 'Genre series');
  assert.equal(genre.items[1].title, undefined);
  assert.equal(vm.state.query, 'dram');
  assert.equal(vm.state.hasResults, true);
  assert.equal(vm.state.loading, false);
});

test('targeted filters call only their repositories and blank submissions make no requests', async () => {
  for (const filter of ['title', 'actor', 'director', 'genre']) {
    const { vm, calls } = fixture();
    await vm.search('dram', filter);
    if (filter === 'title') {
      assert.deepEqual(calls.map((call) => call.kind), ['media', 'media']);
      assert.equal(vm.state.sections.length, 2);
    } else if (filter === 'genre') {
      assert.equal(calls.filter((call) => call.kind === 'people').length, 0);
      assert.ok(calls.filter((call) => call.kind === 'media').every((call) => call.searchBy === 'genre'));
    } else {
      assert.equal(calls.length, 1);
      assert.equal(calls[0].kind, 'people');
      assert.equal(vm.state.sections[0].id, filter);
    }
  }
  const { vm, calls } = fixture();
  await vm.search('   ', 'all');
  assert.equal(calls.length, 0);
  assert.equal(vm.state.hasSearched, false);
  assert.equal(vm.state.loading, false);
  assert.deepEqual(normalizeSearchRequest(' Name ', 'invalid'), { query: 'Name', filter: 'all' });
});

test('localized genre matching supports partial input, diacritics and bounded typos while limiting broad matches', () => {
  const genres = [
    { id: 18, name: 'Dramma', mediaType: 'movie' }, { id: 18, name: 'Dramma', mediaType: 'tv' },
    { id: 878, name: 'Fantascienza', mediaType: 'movie' }, { id: 14, name: 'Fantasy', mediaType: 'movie' }
  ];
  assert.deepEqual(matchSearchGenres('dram', genres)[0].mediaTypes, ['movie', 'tv']);
  assert.equal(matchSearchGenres('dráma', genres)[0].id, 18);
  assert.equal(matchSearchGenres('fanta', genres).length, 2);
  assert.equal(matchSearchGenres('zzzzzzzz', genres).length, 0);
  assert.equal(matchSearchGenres('a', genres).length, 0);
  const broad = Array.from({ length: 20 }, (_, id) => ({ id, name: `Fantasy ${id}`, mediaType: 'movie' }));
  assert.equal(matchSearchGenres('fant', broad).length, MAX_GENRE_MATCHES);
});

test('pagination shares people pages, deduplicates results and stops exhausted genre sources', async () => {
  const { vm, calls } = fixture();
  await vm.search('dram');
  await Promise.all([vm.loadMore('actor'), vm.loadMore('director')]);
  assert.equal(calls.filter((call) => call.kind === 'people' && call.page === 2).length, 1);
  assert.equal(vm.state.sections.find((section) => section.id === 'actor').items.length, 1);
  await vm.loadMore('genre-18');
  const genre = vm.state.sections.find((section) => section.id === 'genre-18');
  assert.equal(genre.items.length, 3);
  assert.equal(genre.hasMore, false);
  assert.equal(calls.filter((call) => call.kind === 'media' && call.searchBy === 'genre' && call.type === 'movie' && call.page === 2).length, 0);
  const count = calls.length;
  await vm.loadMore('genre-18');
  assert.equal(calls.length, count);
});

test('a slow older search and an older pagination request cannot overwrite a newer search', async () => {
  const { vm, repositories } = fixture();
  const original = repositories.movies.searchMovies;
  let release;
  repositories.movies.searchMovies = (params) => params.query === 'old'
    ? new Promise((resolve) => { release = resolve; }) : original(params);
  const older = vm.search('old', 'title');
  await vm.search('new', 'title');
  release({ page: 1, total_pages: 2, results: [new Movie({ id: 999, title: 'Old' })] });
  await older;
  assert.equal(vm.state.query, 'new');
  assert.equal(vm.state.sections[0].items[0].title, 'new movie');
  repositories.movies.searchMovies = () => new Promise((resolve) => { release = resolve; });
  const pagination = vm.loadMore('movie');
  await vm.search('director', 'director');
  release({ page: 2, total_pages: 2, results: [new Movie({ id: 999 })] });
  await pagination;
  assert.deepEqual(vm.state.sections.map((section) => section.id), ['director']);
});

test('individual failures retain successful sections and retry restores the failed section', async () => {
  const { vm, repositories } = fixture();
  const original = repositories.movies.searchMovies;
  repositories.movies.searchMovies = async () => { throw new Error('Unavailable'); };
  await vm.search('Name', 'title');
  assert.equal(vm.state.hasFailures, true);
  assert.equal(vm.state.hasResults, true);
  assert.equal(vm.state.sections[1].items.length, 1);
  repositories.movies.searchMovies = original;
  await vm.retrySearch();
  assert.equal(vm.state.hasFailures, false);
  assert.equal(vm.state.sections[0].items.length, 1);
});

test('person search retains all matches, supports offline pages and never overwrites full profile records', async () => {
  const storage = new IndexedDBService();
  let requests = 0;
  const backend = new PersonBackend({ searchPeople: async (params) => {
    requests++;
    assert.equal(params.query, 'No');
    return { page: params.page, total_pages: 1, results: [{ id: 1, name: 'Nolan', known_for_department: 'Directing' }, { id: 2, name: 'Noah', known_for_department: 'Acting' }] };
  } });
  const repository = new PersonRepository(backend, storage);
  await storage.put(STORES.PERSONS, { cacheKey: 'person:1:it-IT', id: 1, data: { biography: 'Full biography' } });
  const online = await repository.searchPeople({ query: ' No ' });
  assert.equal(online.results.length, 2);
  assert.equal(online.results[0].knownForDepartment, 'Directing');
  repository.setOnlineOverride(false);
  const offline = await repository.searchPeople({ query: 'No' });
  assert.equal(offline.results[1].knownForDepartment, 'Acting');
  assert.equal(requests, 1);
  assert.equal((await storage.get(STORES.PERSONS, 'person:1:it-IT')).data.biography, 'Full biography');
});

test('localized genre registries retain repository offline fallback and distinct language keys', async () => {
  const calls = [];
  const repository = new MovieRepository(new MovieBackend({ getGenres: async (type, params) => {
    calls.push([type, params.language]);
    return { genres: [{ id: 18, name: params.language === 'en-US' ? 'Drama' : 'Dramma' }] };
  } }), new IndexedDBService());
  await repository.getGenres({ language: 'it' });
  await repository.getGenres({ language: 'en' });
  repository.setOnlineOverride(false);
  assert.equal((await repository.getGenres({ language: 'en' })).genres[0].name, 'Drama');
  assert.deepEqual(calls, [['movie', 'it-IT'], ['movie', 'en-US']]);
});

test('retry preserves the language supplied to the last search',async () => {
  const {vm,calls}=fixture();
  await vm.search('Name','title','en-US');
  await vm.retrySearch();
  assert.ok(calls.length > 0);
  assert.ok(calls.every(call => call.language === 'en-US'));
});
