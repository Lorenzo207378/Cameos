import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Cameo } from '../src/models/Cameo.js';
import { CATALOG_CACHE_TTL_MS } from '../src/repository/catalogCache.js';

const catalogs = [
  { Repository: MovieRepository, Model: Movie, ViewModel: MovieViewModel, feed: 'loadFilmsFeed', upcoming: 'getUpcomingMovies', trending: 'getTrendingMovies', category: 'getMoviesByCategory', loadMore: 'loadMoviesFromCategory' },
  { Repository: SeriesRepository, Model: Series, ViewModel: SeriesViewModel, feed: 'loadSeriesFeed', upcoming: 'getUpcomingSeries', trending: 'getTrendingSeries', category: 'getSeriesByCategory', loadMore: 'loadSeriesFromCategory' }
];

for (const catalog of catalogs) {
  const { Repository, Model, ViewModel, feed, upcoming, trending, category, loadMore } = catalog;
  test(`${Repository.name}: fixed TTL, isolated queries, model hydration and offline fallback`, async t => {
    let now = 1_000_000;
    t.mock.method(Date, 'now', () => now);
    let calls = 0;
    let fail = false;
    const fetch = async ({ page = 1 } = {}) => {
      calls++;
      if (fail) throw new Error('offline fixture');
      return { page, total_pages: 5, results: [new Model({ id: page, title: 'Film', name: 'Serie', release_date: '2099-01-01', first_air_date: '2099-01-01' })] };
    };
    const storage = new IndexedDBService();
    const backend = { [upcoming]: fetch, [trending]: fetch, [category]: (_key, params) => fetch(params) };
    const repo = new Repository(backend, storage);
    repo.setOnlineOverride(true);
    const read = () => repo[category]('drama', { language: 'it-IT' });
    await Promise.all([read(), read(), read()]);
    assert.equal(calls, 1, 'simultaneous identical reads share one remote request');
    const key = repo.buildCacheKey(`category_${Model === Movie ? 'movies' : 'series'}_drama`, { categoryKey: 'drama', page: 1, language: 'it-IT' });
    const writtenAt = (await storage.get(STORES.QUERIES, key)).updatedAt;
    now += CATALOG_CACHE_TTL_MS - 1;
    assert.ok((await read()).results[0] instanceof Model);
    assert.equal(calls, 1);
    assert.equal((await storage.get(STORES.QUERIES, key)).updatedAt, writtenAt, 'cache reads must not extend the TTL');
    // A new repository uses the persisted timestamp, not its own creation time.
    const recreated = new Repository(backend, storage);
    recreated.setOnlineOverride(true);
    await recreated[category]('drama', { language: 'it-IT' });
    assert.equal(calls, 1);
    now++;
    await read();
    assert.equal(calls, 2, 'expiry is inclusive');
    for (const params of [{ language: 'en-US' }, { page: 2 }, { sortBy: 'vote_average.desc' }]) {
      await repo[category]('drama', params);
    }
    assert.equal(calls, 5, 'language, page and ordering have independent entries');
    for (const method of [upcoming, trending]) {
      await repo[method]();
      await repo[method]();
    }
    assert.equal(calls, 7, 'both upcoming and trending use the TTL');
    await repo[category]('drama', { force: true });
    assert.equal(calls, 8, 'explicit refresh bypasses fresh cache');
    const refreshedAt = (await storage.get(STORES.QUERIES, key)).updatedAt;
    now += CATALOG_CACHE_TTL_MS;
    fail = true;
    assert.ok((await read()).results[0] instanceof Model);
    assert.equal((await storage.get(STORES.QUERIES, key)).updatedAt, refreshedAt);
    await read();
    assert.equal(calls, 10, 'failed refreshes do not renew TTL or retain rejected requests');
    repo.setOnlineOverride(false);
    await read();
    assert.equal(calls, 10);
    repo.setOnlineOverride(true);
    await assert.rejects(repo[category]('uncached'), /offline fixture/);
    fail = false;
    await repo[category]('uncached');
    assert.equal(calls, 12);
  });

  test(`${ViewModel.name}: revisits preserve pagination and refresh expired data`, async t => {
    let now = 1_000_000;
    t.mock.method(Date, 'now', () => now);
    let calls = 0;
    let version = 1;
    const fetch = async ({ page = 1 } = {}) => {
      calls++;
      return { page, total_pages: 5, results: [new Model({ id: page, title: `Version ${version}`, name: `Version ${version}`, release_date: '2099-01-01', first_air_date: '2099-01-01' })] };
    };
    const repo = new Repository({ [upcoming]: fetch, [trending]: fetch, [category]: (_key, params) => fetch(params) }, new IndexedDBService());
    repo.setOnlineOverride(true);
    const vm = new ViewModel(repo);
    await vm[feed]({ categories: ['drama'] });
    await vm[loadMore]('drama', { append: true });
    const listKey = Model === Movie ? 'dramaMovies' : 'dramaSeries';
    assert.equal(vm.state.categoryPagination.drama.page, 3);
    const previous = vm.state[listKey];
    const initialCalls = calls;
    const revisit = vm[feed]({ categories: ['drama'] });
    assert.equal(vm.state[listKey], previous, 'refresh keeps displayed content');
    await revisit;
    assert.equal(calls, initialCalls);
    assert.deepEqual(vm.state[listKey].map(item => item.id), [1, 2, 3]);
    now += CATALOG_CACHE_TTL_MS;
    version = 2;
    await vm[feed]({ categories: ['drama'] });
    assert.equal(calls, initialCalls + 6, 'all loaded pages revalidate even when feedLoaded is true');
    assert.equal(vm.state.categoryPagination.drama.page, 3);
    const first = vm.state[listKey][0];
    assert.equal(Model === Movie ? first.getTitle('it') : first.getName('it'), 'Version 2');
    await vm[feed]({ categories: ['drama'], language: 'en-US' });
    assert.equal(vm.state.categoryPagination.drama.page, 2, 'a different language starts its own pagination');
  });
}

test('famous cameos: cached pages, concurrent reads, revisits and expiry', async t => {
  let now = 1_000_000;
  t.mock.method(Date, 'now', () => now);
  let calls = 0;
  const repo = new CameoRepository({ getFamousCameos: async ({ page }) => {
    calls++;
    return { page, totalPages: 5, results: [new Cameo({ id: page, mediaId: page, name: 'Guest' })] };
  } }, new IndexedDBService());
  repo.setOnlineOverride(true);
  await Promise.all([repo.getFamousCameos(), repo.getFamousCameos()]);
  assert.equal(calls, 1);
  const vm = new CameoViewModel(repo);
  await vm.loadFamousCameos(16);
  await vm.loadMoreFamousCameos();
  assert.equal(calls, 3);
  await vm.loadFamousCameos(16);
  assert.equal(calls, 3);
  assert.equal(vm.state.famousCameosPagination.page, 3);
  assert.ok(vm.state.famousCameos[0] instanceof Cameo);
  now += CATALOG_CACHE_TTL_MS;
  await vm.loadFamousCameos(16);
  assert.equal(calls, 6);
});
