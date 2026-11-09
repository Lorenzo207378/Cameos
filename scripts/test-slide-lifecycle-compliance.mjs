import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { UserViewModel } from '../src/viewmodel/user/UserViewModel.js';

// React mounting, subscriptions, binding and cleanup are exercised in test-carousel-loading.mjs.
for (const ViewModel of [MovieViewModel, SeriesViewModel, UserViewModel]) {
  test(`${ViewModel.name}: construction initializes independent state without repository calls`, () => {
    let calls = 0;
    const repository = new Proxy({}, { get: () => () => { calls += 1; } });
    const first = new ViewModel(repository);
    const second = new ViewModel(repository);
    assert.equal(calls, 0);
    assert.equal(first.repository, repository);
    assert.equal(first.state.loading, false);
    assert.equal(first._pendingOperations.size, 0);
    assert.equal(first._listeners.size, 0);
    first.setState({ error: 'Only the first instance changes' });
    assert.equal(second.state.error, null);
  });
}
