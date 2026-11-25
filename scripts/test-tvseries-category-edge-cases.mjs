import assert from 'node:assert/strict';
import test from 'node:test';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { Series } from '../src/models/Series.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('SeriesViewModel.loadSeriesFromCategory rejects unknown, movie-only or prototype category keys with zero repository calls', async () => {
  const calls = [];
  const repo = {
    async getSeriesByCategory(categoryKey, params) {
      calls.push({ categoryKey, params });
      return { page: 1, total_pages: 1, results: [new Series({ id: 1, name: 'Valid Series' })] };
    },
    async getUpcomingSeries(params) {
      calls.push({ categoryKey: 'upcoming', params });
      return { page: 1, total_pages: 1, results: [new Series({ id: 2, name: 'Upcoming Series', first_air_date: '2099-01-01' })] };
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  for (const invalidKey of ['', 'invalid', 'action', 'sci-fi', 'constructor', '__proto__', 'toString', null, undefined, 123]) {
    const result = await vm.loadSeriesFromCategory(/** @type {any} */ (invalidKey), { page: 1, language: 'it-IT' });
    assert.deepEqual(result, []);
  }
  assert.equal(calls.length, 0, 'Invalid series category keys must never trigger repository requests');
  assert.equal(Object.hasOwn(vm.state.categorySeries, 'invalid'), false);
  assert.equal(Object.hasOwn(vm.state.categoryPagination, 'invalid'), false);
  assert.equal(Object.hasOwn(vm.state.categorySeries, 'action'), false);

  const valid = await vm.loadSeriesFromCategory('crime', { page: 1, language: 'it-IT' });
  assert.equal(valid.length, 1);
  assert.equal(calls.length, 1);

  const upcoming = await vm.loadSeriesFromCategory('upcoming', { page: 1, language: 'it-IT' });
  assert.equal(upcoming.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(vm.state.categorySeries.upcoming.length, 1);
});

test('SeriesViewModel.loadSeriesFromCategory isolates category requestError when another parallel operation clears state.error', async () => {
  const crimePending = deferred();
  const comedyPending = deferred();

  const repo = {
    getSeriesByCategory(categoryKey) {
      if (categoryKey === 'crime') return crimePending.promise;
      if (categoryKey === 'comedy') return comedyPending.promise;
      return Promise.resolve({ page: 1, total_pages: 1, results: [] });
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  const crimeRun = vm.loadSeriesFromCategory('crime', { page: 1, language: 'it-IT' });
  const comedyRun = vm.loadSeriesFromCategory('comedy', { page: 1, language: 'it-IT' });

  crimePending.reject(new Error('Crime category offline'));
  comedyPending.resolve({ page: 1, total_pages: 1, results: [new Series({ id: 10, name: 'Comedy Hit' })] });

  await Promise.all([crimeRun, comedyRun]);

  assert.equal(vm.state.error, null, 'Global state.error is cleared by the succeeding parallel comedy request');
  assert.equal(
    vm.state.categoryPagination.crime?.error,
    'Crime category offline',
    'Isolated series category pagination error must survive parallel successes on the same ViewModel'
  );
  assert.equal(vm.state.categoryPagination.crime?.loading, false);
  assert.equal(vm.state.categoryPagination.comedy?.error, null);
  assert.equal(vm.state.categorySeries.comedy?.length, 1);
});

test('SeriesViewModel.loadSeriesFromCategory preserves loaded pages across append failure and recovers on retry', async () => {
  let failPage3 = true;
  const repo = {
    async getSeriesByCategory(_categoryKey, { page = 1 }) {
      if (page === 3 && failPage3) throw new Error('Page 3 unavailable');
      return {
        page,
        total_pages: 3,
        results: [new Series({ id: page * 10, name: `Series Page ${page}` })]
      };
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  await vm.loadSeriesFromCategory('drama', { page: 1, language: 'it-IT' });
  await vm.loadSeriesFromCategory('drama', { append: true, language: 'it-IT' });
  assert.equal(vm.state.categorySeries.drama.length, 2);

  await vm.loadSeriesFromCategory('drama', { append: true, language: 'it-IT' });
  assert.equal(vm.state.categorySeries.drama.length, 2, 'Append error must keep existing loaded pages');
  assert.equal(vm.state.categoryPagination.drama?.error, 'Page 3 unavailable');
  assert.equal(vm.state.categoryPagination.drama?.loadingMore, false);
  assert.equal(vm.state.categoryPagination.drama?.hasMore, true);

  failPage3 = false;
  await vm.loadSeriesFromCategory('drama', { append: true, language: 'it-IT' });
  assert.equal(vm.state.categorySeries.drama.length, 3, 'Retrying append must load page 3');
  assert.equal(vm.state.categoryPagination.drama?.error, null);
  assert.equal(vm.state.categoryPagination.drama?.hasMore, false);
});
