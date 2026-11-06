import assert from 'node:assert/strict';
import test from 'node:test';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes,no) => { resolve=yes; reject=no; });
  return {promise,resolve,reject};
}

for (const [kind,ViewModel,method,repositoryMethod,list] of [
  ['movie',MovieViewModel,'loadMoviesFromCategory','getMoviesByCategory','actionMovies'],
  ['series',SeriesViewModel,'loadSeriesFromCategory','getSeriesByCategory','actionSeries']
]) {
  test(`${kind}: refreshing a category discards an older append and resets its page count`, async () => {
    const append = deferred();
    let calls=0;
    const vm = new ViewModel({[repositoryMethod]:async () => {
      calls++;
      if (calls === 2) return append.promise;
      return {results:[{id:calls === 1 ? 1 : 100}],total_pages:calls === 1 ? 10 : 1};
    }});
    await vm[method]('action');
    const old = vm[method]('action',{append:true});
    await vm[method]('action');
    append.resolve({results:[{id:2}],total_pages:10});
    await old;
    assert.deepEqual(vm.state[list],[{id:100}]);
    assert.equal(vm.state.categoryPagination.action.page,1);
    assert.equal(vm.state.categoryPagination.action.totalPages,1);
    assert.equal(vm.state.categoryPagination.action.hasMore,false);
  });

  test(`${kind}: appending waits for an initial category request`, async () => {
    const initial=deferred();
    let calls=0;
    const vm=new ViewModel({[repositoryMethod]:async () => {calls++;return initial.promise;}});
    const pending=vm[method]('action');
    const append=vm[method]('action',{append:true});
    initial.resolve({results:[{id:1}],total_pages:2});
    await Promise.all([pending,append]);
    assert.equal(calls,1);
    assert.equal(vm.state.categoryPagination.action.loading,false);
    assert.equal(vm.state.categoryPagination.action.loadingMore,false);
  });

  test(`${kind}: an initial failure settles category state and a retry can recover`, async () => {
    let failing=true;
    const vm=new ViewModel({[repositoryMethod]:async () => {
      if (failing) throw new Error('Category unavailable');
      return {results:[{id:1}],total_pages:1};
    }});
    await vm[method]('action');
    assert.equal(vm.state.categoryPagination.action?.loading,false);
    assert.equal(vm.state.categoryPagination.action?.error,'Category unavailable');
    assert.equal(vm.state.loading,false);
    failing=false;
    await vm[method]('action');
    assert.equal(vm.state.categoryPagination.action.error,null);
    assert.deepEqual(vm.state[list],[{id:1}]);
  });
}
