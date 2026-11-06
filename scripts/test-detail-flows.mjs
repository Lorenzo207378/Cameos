import assert from 'node:assert/strict';
import test from 'node:test';
import { BaseViewModel } from '../src/viewmodel/BaseViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { IndexedDBService } from '../src/storage/IndexedDBService.js';
import { Episode } from '../src/models/Episode.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { MOVIE_CATEGORY_CONFIG, SERIES_CATEGORY_CONFIG } from '../src/utils/mediaCategories.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('loading remains active until independent requests finish, including failed requests', async () => {
  const vm = new BaseViewModel();
  const profile = deferred(), season = deferred();
  const a = vm.runAsync('profile', () => profile.promise);
  const b = vm.runAsync('season', () => season.promise);
  profile.reject(new Error('Unavailable'));
  assert.equal(await a, null);
  assert.equal(vm.state.loading, true);
  assert.equal(vm.state.error, 'Unavailable');
  season.resolve(1);
  await b;
  assert.equal(vm.state.loading, false);
});

test('nested feed requests cannot expose a completed loading state before their parent finishes', async () => {
  const vm = new BaseViewModel();
  const child = deferred(), parent = deferred();
  const pending = vm.runAsync('feed', async () => {
    await vm.runAsync('trending', () => child.promise);
    assert.equal(vm.state.loading, true);
    await parent.promise;
  });
  child.resolve(1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(vm.state.loading, true);
  parent.resolve();
  await pending;
  assert.equal(vm.state.loading, false);
});

test('superseded requests neither clear current loading nor keep a completed newer request loading', async () => {
  const vm = new BaseViewModel();
  const old = deferred(), latest = deferred();
  const a = vm.runAsync('detail', () => old.promise, value => ({ value }));
  const b = vm.runAsync('detail', () => latest.promise, value => ({ value }));
  latest.resolve('latest');
  await b;
  assert.equal(vm.state.loading, false);
  old.resolve('old');
  await a;
  assert.equal(vm.state.value, 'latest');
  assert.equal(vm.state.loading, false);
});

test('episode route selection follows viewmodel identity and full repository details survive cache/offline access', async () => {
  let calls = 0;
  const backend = { getEpisodeDetails: async params => {
    calls++;
    return new Episode({ id: 10, ...params, name: 'Full episode', runtime: 45,
      cast: [{ id: 3, name: 'Cast' }], cameos: [{ id: 4, name: 'Guest' }] });
  } };
  const repository = new SeriesRepository(backend, new IndexedDBService());
  const vm = new SeriesViewModel(repository);
  assert.equal(vm.getEpisodeForRoute(1, 0, 1), null);
  await vm.loadEpisodeDetails(1, 0, 1, true);
  const episode = vm.getEpisodeForRoute('1', '0', '1');
  assert.equal(episode.runtime, 45);
  assert.equal(episode.cast.length, 1);
  assert.equal(episode.cameos.length, 1);
  assert.equal(vm.getEpisodeForRoute(2, 0, 1), null);
  assert.equal(vm.getEpisodeForRoute(1, 1, 1), null);
  assert.equal(vm.getEpisodeForRoute(1, 0, 2), null);
  await vm.loadEpisodeDetails(1, 0, 1, true);
  assert.equal(calls, 1, 'the existing repository TTL avoids refetching a recently expanded episode');
  repository.setOnlineOverride(false);
  await vm.loadEpisodeDetails(1, 0, 1, true);
  assert.equal(vm.getEpisodeForRoute(1, 0, 1).cameos[0].name, 'Guest');
  assert.equal(calls, 1);
});

test('category configurations retain their genre mapping and remain frozen', () => {
  assert.equal(MOVIE_CATEGORY_CONFIG.action.genreId, 28);
  assert.equal(SERIES_CATEGORY_CONFIG.actionAdventure.genreId, 10759);
  assert.ok(Object.isFrozen(MOVIE_CATEGORY_CONFIG));
  assert.ok(Object.isFrozen(SERIES_CATEGORY_CONFIG));
});

test('category caches isolate custom ordering without losing existing default queries offline', async () => {
  for (const type of ['movie', 'tv']) {
    const movie = type === 'movie';
    const method = movie ? 'getMoviesByCategory' : 'getSeriesByCategory';
    const backend = { [method]: async (_key, params) => ({
      page: 1, total_pages: 1, total_results: 1,
      results: [{ id: params.sortBy === 'vote_average.desc' ? 2 : 1, title: 'Movie', name: 'TV' }]
    }) };
    const repository = movie ? new MovieRepository(backend, new IndexedDBService()) : new SeriesRepository(backend, new IndexedDBService());
    await repository[method]('comedy', { language: 'en-US' });
    await repository[method]('comedy', { language: 'en-US', sortBy: 'vote_average.desc' });
    repository.setOnlineOverride(false);
    assert.equal((await repository[method]('comedy', { language: 'en-US' })).results[0].id, 1);
    assert.equal((await repository[method]('comedy', { language: 'en-US', sortBy: 'popularity.desc' })).results[0].id, 1);
    assert.equal((await repository[method]('comedy', { language: 'en-US', sortBy: 'vote_average.desc' })).results[0].id, 2);
  }
});
