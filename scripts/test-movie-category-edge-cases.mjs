import assert from 'node:assert/strict';
import test from 'node:test';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { Movie } from '../src/models/Movie.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('MovieViewModel.loadMoviesFromCategory rejects unknown or prototype category keys with zero repository calls', async () => {
  const calls = [];
  const repo = {
    async getMoviesByCategory(categoryKey, params) {
      calls.push({ categoryKey, params });
      return { page: 1, total_pages: 1, results: [new Movie({ id: 1, title: 'Valid' })] };
    },
    async getUpcomingMovies(params) {
      calls.push({ categoryKey: 'upcoming', params });
      return { page: 1, total_pages: 1, results: [] };
    }
  };

  const vm = new MovieViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  for (const invalidKey of ['', 'invalid', 'sci-fi', 'constructor', '__proto__', 'toString', null, undefined, 123]) {
    const result = await vm.loadMoviesFromCategory(/** @type {any} */ (invalidKey), { page: 1, language: 'it-IT' });
    assert.deepEqual(result, []);
  }
  assert.equal(calls.length, 0, 'Invalid category keys must never trigger repository requests');
  assert.equal(Object.hasOwn(vm.state.categoryMovies, 'invalid'), false);
  assert.equal(Object.hasOwn(vm.state.categoryPagination, 'invalid'), false);

  const valid = await vm.loadMoviesFromCategory('action', { page: 1, language: 'it-IT' });
  assert.equal(valid.length, 1);
  assert.equal(calls.length, 1);
});

test('MediaCatalogViewModel.loadPagination isolates category requestError when another parallel operation clears state.error', async () => {
  const actionPending = deferred();
  const comedyPending = deferred();

  const repo = {
    getMoviesByCategory(categoryKey) {
      if (categoryKey === 'action') return actionPending.promise;
      if (categoryKey === 'comedy') return comedyPending.promise;
      return Promise.resolve({ page: 1, total_pages: 1, results: [] });
    }
  };

  const vm = new MovieViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  const actionRun = vm.loadMoviesFromCategory('action', { page: 1, language: 'it-IT' });
  const comedyRun = vm.loadMoviesFromCategory('comedy', { page: 1, language: 'it-IT' });

  // Action fails first, setting global state.error; comedy succeeds immediately before action's continuation runs.
  actionPending.reject(new Error('Action category offline'));
  comedyPending.resolve({ page: 1, total_pages: 1, results: [new Movie({ id: 10, title: 'Comedy Hit' })] });

  await Promise.all([actionRun, comedyRun]);

  assert.equal(vm.state.error, null, 'Global state.error is cleared by the succeeding parallel comedy request');
  assert.equal(
    vm.state.categoryPagination.action?.error,
    'Action category offline',
    'Isolated category pagination error must survive parallel successes on the same ViewModel'
  );
  assert.equal(vm.state.categoryPagination.action?.loading, false);
  assert.equal(vm.state.categoryPagination.comedy?.error, null);
  assert.equal(vm.state.categoryMovies.comedy?.length, 1);
});
