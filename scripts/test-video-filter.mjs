import assert from 'node:assert/strict';
import test from 'node:test';
import { Movie } from '../src/models/Movie.js';
import { isVideoMedia, isExcludedMedia } from '../src/models/utils/index.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { PersonBackend } from '../src/backend/person/PersonBackend.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SearchViewModel } from '../src/viewmodel/search/SearchViewModel.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { selectPersonCredits } from '../src/utils/personCredits.js';
import { MAX_SEARCH_PAGE_BATCH } from '../src/utils/search.js';

const records = [
  { id: 1, title: 'Popular production', video: true, genre_ids: [28], vote_count: 10000, runtime: 240 },
  { id: 2, title: 'Workout', video: false, genre_ids: [], vote_count: 0, runtime: 11 },
  { id: 3, title: 'Short film', genre_ids: [], vote_count: 0, runtime: 5 }
];

test('the rule depends only on the explicit TMDb boolean, retaining short, unrated and unclassified films', () => {
  assert.equal(isVideoMedia(records[0]), true);
  assert.equal(isVideoMedia(records[1]), false);
  assert.equal(isVideoMedia(records[2]), false);
  assert.equal(isVideoMedia({ video: 'true' }), false);
  assert.equal(isVideoMedia(null), false);
  assert.equal(isExcludedMedia(records[0]), true);
  assert.equal(isExcludedMedia(records[1]), false);
  const original = new Movie(records[0]);
  assert.equal(original.video, true);
  assert.equal(new Movie(structuredClone(original)).video, true);
  assert.equal(new Movie(JSON.parse(JSON.stringify(original))).video, true);
});

test('all movie search criteria exclude video records before model construction and preserve remote page metadata', async () => {
  const page = (params) => ({ page: params.page, total_pages: 8, total_results: 151, results: records });
  const api = {
    searchMovie: async (params) => page(params),
    searchMoviesByGenre: async (params) => page(params),
    getPersonMediaCredits: async () => ({ cast: records, crew: records.map((item) => ({ ...item, job: 'Director' })) })
  };
  const backend = new MovieBackend(api);
  for (const query of ['Any partial name', 'Workout', 'Completely different title']) {
    const result = await backend.searchMovies({ query, page: 2 });
    assert.deepEqual(result.results.map((item) => item.id), [2, 3]);
    assert.equal(result.page, 2);
    assert.equal(result.total_pages, 8);
    assert.equal(result.total_results, 151);
  }
  assert.deepEqual((await backend.searchMoviesByGenre({ genreId: 28, page: 2 })).results.map((item) => item.id), [2, 3]);
  for (const searchBy of ['actor', 'director']) {
    const result = await backend.searchMovies({ searchBy, personId: 42 });
    assert.deepEqual(result.results.map((item) => item.id), [2, 3]);
    assert.equal(result.total_results, 2);
  }
});

test('query cache rehydration and local title fallback exclude known videos while retaining unknown legacy records', async () => {
  const storage = new IndexedDBService();
  const repository = new MovieRepository(new MovieBackend(), storage);
  const cacheKey = repository.buildCacheKey('search_movies', { query: 'cached', page: 1, language: 'it-IT' });
  await storage.put(STORES.QUERIES, { cacheKey, data: { page: 1, total_pages: 8, total_results: 151, results: records } });
  repository.setOnlineOverride(false);
  const cached = await repository.searchMovies({ query: 'cached' });
  assert.deepEqual(cached.results.map((item) => item.id), [2, 3]);
  assert.ok(cached.results.every((item) => item instanceof Movie));
  assert.equal(cached.total_pages, 8);
  assert.equal(cached.total_results, 151);
  for (const item of records) {
    await storage.put(STORES.MOVIES, { cacheKey: `movie:${item.id}:it-IT`, id: item.id, language: 'it-IT', data: { ...item, title: 'Shared title' } });
  }
  const local = await repository.searchMovies({ query: 'Shared title' });
  assert.deepEqual(local.results.map((item) => item.id), [2, 3]);
  assert.equal(local.total_results, 2);
});

test('filmography applies the same rule to cast, crew and cached creative credits', async () => {
  const backend = new PersonBackend({ getPersonDetails: async () => ({ id: 42,
    movie_credits: { cast: records, crew: records.map((item) => ({ ...item, job: 'Director' })) } }) });
  const result = await backend.getPersonFilmography({ personId: 42 });
  assert.deepEqual(result.cast.map((item) => item.id), [2, 3]);
  assert.deepEqual(result.crew.map((item) => item.id), [2, 3]);
  const cached = { cast: records, crew: records.map((item) => ({ ...item, job: 'Writer' })) };
  assert.deepEqual(selectPersonCredits(cached, [], 'cast').map((item) => item.id), [2, 3]);
  assert.deepEqual(selectPersonCredits(cached, [], 'crew').map((item) => item.id), [2, 3]);
});

function pagedSearch(pages) {
  const requested = [];
  const api = { searchMovie: async ({ page }) => {
    requested.push(page);
    const results = pages[page - 1];
    if (results instanceof Error) throw results;
    return { page, total_pages: pages.length, total_results: pages.length * 20, results };
  } };
  const movies = new MovieRepository(new MovieBackend(api), new IndexedDBService());
  const series = { searchSeries: async () => ({ page: 1, total_pages: 0, results: [] }) };
  return { requested, vm: new SearchViewModel({ movies, series }) };
}

test('search skips filtered gaps in bounded batches, preserves the cursor and reaches later valid movies', async () => {
  const excluded = [{ id: 1, video: true, title: 'Video' }];
  const { vm, requested } = pagedSearch([
    excluded, excluded, [{ id: 3, title: 'First film' }],
    excluded, excluded, excluded, [{ id: 7, title: 'Last film' }]
  ]);
  await vm.search('Any query', 'title');
  let section = vm.state.sections.find((item) => item.id === 'movie');
  assert.deepEqual(requested, [1, 2, 3]);
  assert.equal(section.page, 3);
  assert.deepEqual(section.items.map((item) => item.id), [3]);
  await vm.loadMore('movie');
  section = vm.state.sections.find((item) => item.id === 'movie');
  assert.equal(requested.length, 2 * MAX_SEARCH_PAGE_BATCH);
  assert.equal(section.page, 6);
  assert.equal(section.hasMore, true);
  assert.deepEqual(section.items.map((item) => item.id), [3]);
  await vm.loadMore('movie');
  section = vm.state.sections.find((item) => item.id === 'movie');
  assert.deepEqual(requested, [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(section.items.map((item) => item.id), [3, 7]);
  assert.equal(section.hasMore, false);
});

test('an initial batch with only videos keeps pagination available without downloading the full catalog', async () => {
  const { vm, requested } = pagedSearch(Array.from({ length: 12 }, (_, index) => [{ id: index, video: true }]));
  await vm.search('Unknown title', 'title');
  const section = vm.state.sections.find((item) => item.id === 'movie');
  assert.equal(requested.length, MAX_SEARCH_PAGE_BATCH);
  assert.equal(section.page, MAX_SEARCH_PAGE_BATCH);
  assert.equal(section.items.length, 0);
  assert.equal(section.hasMore, true);
  assert.equal(vm.state.hasFailures, false);
});

test('end of remote pages and failures after filtered pages retain the existing error and pagination policies', async () => {
  const excluded = [{ id: 1, video: true }];
  const end = pagedSearch([excluded, excluded]);
  await end.vm.search('Empty', 'title');
  assert.deepEqual(end.requested, [1, 2]);
  assert.equal(end.vm.state.sections[0].hasMore, false);
  const failure = pagedSearch([[{ id: 1, title: 'Film' }], excluded, new Error('Network failed')]);
  await failure.vm.search('Requested title', 'title');
  await failure.vm.loadMore('movie');
  assert.deepEqual(failure.requested, [1, 2, 3]);
  assert.equal(failure.vm.state.hasFailures, true);
  assert.equal(failure.vm.state.sections[0].page, 1);
  assert.equal(failure.vm.state.sections[0].hasMore, true);
  assert.deepEqual(failure.vm.state.sections[0].items.map((item) => item.id), [1]);
});
