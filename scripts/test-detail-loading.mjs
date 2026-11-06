import assert from 'node:assert/strict';
import test from 'node:test';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return {promise, resolve, reject};
}

test('movie loading distinguishes an unrequested route from a failed request and unrelated operations', async () => {
  const discovery = deferred();
  const vm = new MovieViewModel({
    getMovieDetails: async ({movieId}) => {
      if (movieId === 2) throw new Error('Unavailable');
      return new Movie({id: movieId});
    },
    discoverMovies: () => discovery.promise
  });
  assert.equal(vm.isMovieLoading(1), true);
  await vm.loadMovieDetails(1);
  assert.equal(vm.isMovieLoading('1'), false);
  assert.equal(vm.isMovieLoading(2), true);
  const pending = vm.discoverMovies();
  assert.equal(vm.state.loading, true);
  assert.equal(vm.isMovieLoading(1), false);
  await vm.loadMovieDetails(2);
  assert.equal(vm.isMovieLoading(2), false, 'Failed details must leave loading even while another request remains pending');
  discovery.resolve({results: []});
  await pending;
  vm.clearSelection();
  assert.equal(vm.isMovieLoading(2), true);
});

test('episode loading never changes the completed series and season loading states', async () => {
  const episode = deferred();
  const vm = new SeriesViewModel({
    getSeriesDetails: async ({seriesId}) => new Series({id: seriesId}),
    getSeasonDetails: async params => new Season(params),
    getEpisodeDetails: () => episode.promise
  });
  assert.equal(vm.isSeriesLoading(1), true);
  assert.equal(vm.isSeasonLoading(1, 0), true);
  assert.equal(vm.isEpisodeLoading(1, 0, 1), true);
  await vm.loadSeriesDetails(1);
  await vm.loadSeasonDetails(1, 0);
  const pending = vm.loadEpisodeDetails(1, 0, 1);
  assert.equal(vm.state.loading, true);
  assert.equal(vm.isSeriesLoading(1), false);
  assert.equal(vm.isSeasonLoading('1', '0'), false);
  assert.equal(vm.isEpisodeLoading(1, 0, 1), true);
  episode.resolve(new Episode({id: 10, seriesId: 1, seasonNumber: 0, episodeNumber: 1}));
  await pending;
  assert.equal(vm.isEpisodeLoading('1', '0', '1'), false);
  assert.equal(vm.isEpisodeLoading(1, 0, 2), true);
  vm.clearSelection();
  assert.equal(vm.isSeriesLoading(1), true);
  assert.equal(vm.isSeasonLoading(1, 0), true);
});

test('season errors belong to their request and retry clears them', async () => {
  let failing = true;
  const vm = new SeriesViewModel({getSeasonDetails: async params => {
    if (failing) throw new Error('Season unavailable');
    return new Season(params);
  }});
  await vm.loadSeasonDetails(1, 1);
  assert.equal(vm.isSeasonLoading(1, 1), false);
  assert.equal(vm.state.requestedSeason.error, 'Season unavailable');
  failing = false;
  await vm.loadSeasonDetails(1, 1);
  assert.equal(vm.state.requestedSeason.error, null);
  assert.equal(vm.isSeasonLoading(1, 1), false);
});

test('an old season failure cannot replace a newer season request or its error state', async () => {
  const old = deferred();
  const vm = new SeriesViewModel({getSeasonDetails: params => params.seasonNumber === 1
    ? old.promise : Promise.resolve(new Season(params))});
  const pending = vm.loadSeasonDetails(1, 1);
  await vm.loadSeasonDetails(2, 2);
  old.reject(new Error('Old season failed'));
  await pending;
  assert.equal(vm.state.requestedSeason.seriesId, 2);
  assert.equal(vm.state.requestedSeason.error, null);
  assert.equal(vm.isSeasonLoading(2, 2), false);
});
