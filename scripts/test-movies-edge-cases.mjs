import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { BaseRepository } from '../src/repository/BaseRepository.js';
import { MediaCatalogRepository } from '../src/repository/MediaCatalogRepository.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { BaseViewModel } from '../src/viewmodel/BaseViewModel.js';
import { MediaCatalogViewModel } from '../src/viewmodel/MediaCatalogViewModel.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';
import { Movie } from '../src/models/Movie.js';
import { Cameo } from '../src/models/Cameo.js';
import { MOVIE_CATEGORY_CONFIG } from '../src/utils/media/mediaCategoryConfig.js';
import { getMovieCarouselSections } from '../src/utils/media/mediaCategoryPresentation.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('MOVIE_CATEGORY_CONFIG fetch order matches getMovieCarouselSections visual order and supports slice input', () => {
  const t = (key) => key;
  const slice = {
    upcomingMovies: [new Movie({ id: 1, title: 'Upcoming' })],
    categoryMovies: { animation: [new Movie({ id: 2, title: 'Anim' })] }
  };
  const sectionsFromSlice = getMovieCarouselSections(slice, t);
  assert.deepEqual(
    Object.keys(MOVIE_CATEGORY_CONFIG),
    sectionsFromSlice.map((section) => section.key),
    'Fetch priority order must match visual display order above the fold'
  );
  assert.equal(sectionsFromSlice[0].items.length, 1);
  assert.equal(sectionsFromSlice[1].items.length, 1);
  assert.deepEqual(sectionsFromSlice[2].items, []);

  // Legacy full ViewModel shape remains compatible
  const legacySections = getMovieCarouselSections({ upcomingMovies: [], animationMovies: [new Movie({ id: 3, title: 'Legacy' })] }, t);
  assert.equal(legacySections[1].items[0].id, 3);
});

test('BaseViewModel.loadPagination: revisit with retainPages never flashes loading:true and preserves items on revalidation failure', async () => {
  let shouldFail = false;
  let version = 1;
  const repo = {
    async getMoviesByCategory(_categoryKey, { page = 1 }) {
      if (shouldFail) throw new Error('Revalidation offline');
      return { page, total_pages: 5, results: [new Movie({ id: page, title: `Film v${version}` })] };
    }
  };
  const vm = new MovieViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  // Cold load MUST transition through loading:true -> loading:false
  const coldStates = [];
  const unsubCold = vm.subscribe(() => {
    coldStates.push(vm.state.categoryPagination.action?.loading);
  });
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'it-IT', retainPages: true });
  unsubCold();
  assert.ok(coldStates.includes(true), 'Initial empty load must set loading:true');
  assert.equal(vm.state.categoryPagination.action.loading, false);
  assert.equal(vm.state.actionMovies.length, 2);

  // Revisit in same language with existing items MUST NOT flash loading:true
  const revisitLoadingStates = [];
  const unsubRevisit = vm.subscribe(() => {
    revisitLoadingStates.push(vm.state.categoryPagination.action?.loading);
  });
  version = 2;
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'it-IT', retainPages: true });
  unsubRevisit();
  assert.ok(revisitLoadingStates.every((flag) => flag === false), 'Revisit with retained items must never flash loading:true');
  assert.equal(vm.state.actionMovies[0].title, 'Film v2');

  // Revisit with stale append error clears error without flashing loading:true
  vm.setState({
    categoryPagination: {
      ...vm.state.categoryPagination,
      action: { ...vm.state.categoryPagination.action, error: 'Transient append error' }
    }
  });
  const clearErrorLoadingStates = [];
  const unsubClear = vm.subscribe(() => {
    clearErrorLoadingStates.push(vm.state.categoryPagination.action?.loading);
  });
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'it-IT', retainPages: true });
  unsubClear();
  assert.ok(clearErrorLoadingStates.every((flag) => flag === false));
  assert.equal(vm.state.categoryPagination.action.error, null);

  // Failed background revalidation keeps existing items visible and records the error without hanging in loading
  shouldFail = true;
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'it-IT', retainPages: true });
  assert.equal(vm.state.actionMovies.length, 2, 'Displayed items must survive a failed background revalidation');
  assert.equal(vm.state.categoryPagination.action.loading, false);
  assert.equal(vm.state.categoryPagination.action.error, 'Revalidation offline');

  // Language change MUST still trigger loading:true even when retainPages is true
  shouldFail = false;
  const langSwitchStates = [];
  const unsubLang = vm.subscribe(() => {
    langSwitchStates.push(vm.state.categoryPagination.action?.loading);
  });
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'en-US', retainPages: true });
  unsubLang();
  assert.ok(langSwitchStates.includes(true), 'Language switch must set loading:true');
  assert.equal(vm.state.categoryPagination.action.language, 'en-US');

  // Forced refresh (retainPages: false) MUST still trigger loading:true
  const forceStates = [];
  const unsubForce = vm.subscribe(() => {
    forceStates.push(vm.state.categoryPagination.action?.loading);
  });
  await vm.loadMoviesFromCategory('action', { initialPages: 2, language: 'en-US', retainPages: false });
  unsubForce();
  assert.ok(forceStates.includes(true), 'Forced refresh must set loading:true');
});

test('CameoViewModel: options-object limit=16, constructor pagination defaults, historical archive onlyIfEmpty and failure recovery', async () => {
  let fail = false;
  let gate = null;
  const calls = [];
  const repo = {
    async getFamousCameos(params) {
      calls.push(params);
      if (gate) await gate.promise;
      if (fail) throw new Error('Cameos unreachable');
      return {
        page: params.page,
        totalPages: 5,
        hasMore: params.page < 5,
        results: [new Cameo({
          id: params.page * 10,
          mediaId: 500 + params.page,
          mediaType: 'movie',
          name: `Actor ${params.page}`,
          mediaTitle: `Titolo ${params.page}`,
          mediaTitles: { it: `Titolo ${params.page}`, en: `Title ${params.page}` }
        })]
      };
    }
  };

  const vm = new CameoViewModel(/** @type {any} */ (repo), { language: 'it-IT' });
  // Uniform constructor defaults
  for (const key of ['famousCameosPagination', 'actorMovieCameosPagination', 'actorTVCameosPagination', 'actorCameosPagination']) {
    assert.equal(vm.state[key].loading, false);
    assert.equal(vm.state[key].error, null);
  }

  // Initial failure settles loading:false and allows subsequent onlyIfEmpty revisit or explicit retry to recover
  fail = true;
  await vm.loadFamousCameos({ limit: 16, language: 'it-IT', onlyIfEmpty: true, force: true });
  assert.equal(calls.length, 2, 'Options object with limit:16 must request 2 pages even without explicit initialPages');
  assert.ok(calls.every((call) => call.force === true));
  assert.equal(vm.state.famousCameos.length, 0);
  assert.equal(vm.state.famousCameosPagination.loading, false);
  assert.equal(vm.state.famousCameosPagination.error, 'Cameos unreachable');

  // Recovery while in-flight guard blocks concurrent StrictMode/navigation duplicate calls
  fail = false;
  gate = deferred();
  const firstPending = vm.loadFamousCameos({ limit: 16, language: 'it-IT', onlyIfEmpty: true, force: true });
  const duplicateDuringFlight = vm.loadFamousCameos({ limit: 16, language: 'it-IT', onlyIfEmpty: true, force: true });
  assert.equal(calls.length, 4, 'onlyIfEmpty must not launch duplicate calls while first load is pending');
  gate.resolve();
  gate = null;
  await Promise.all([firstPending, duplicateDuringFlight]);
  assert.equal(vm.state.famousCameos.length, 2);
  assert.equal(vm.state.famousCameosPagination.error, null);
  assert.equal(vm.state.famousCameos[0].getMediaTitle('it'), 'Titolo 1');
  assert.equal(vm.state.famousCameos[0].getMediaTitle('en'), 'Title 1');

  // Navigating between pages or changing language with onlyIfEmpty:true never refetches
  await vm.loadFamousCameos({ limit: 16, language: 'it-IT', onlyIfEmpty: true, force: true });
  await vm.loadFamousCameos({ limit: 16, language: 'en-US', onlyIfEmpty: true, force: true });
  assert.equal(calls.length, 4, 'Historical archive must not refetch during navigation or language switch');

  // Manual scroll append still fetches the next page without force:true, and revisit keeps appended items
  await vm.loadMoreFamousCameos();
  assert.equal(calls.length, 5);
  assert.equal(calls[4].page, 3);
  assert.equal(calls[4].force, undefined);
  assert.equal(vm.state.famousCameos.length, 3);
  await vm.loadFamousCameos({ limit: 16, language: 'it-IT', onlyIfEmpty: true, force: true });
  assert.equal(calls.length, 5);
  assert.equal(vm.state.famousCameos.length, 3);
});

test('CameoRepository.getFamousCameos: force:true still falls back to IndexedDB offline and preserves bilingual mediaTitles and cachedAt', async () => {
  const storage = new IndexedDBService();
  let remoteCalls = 0;
  const backend = {
    async getFamousCameos({ page }) {
      remoteCalls += 1;
      return {
        page,
        totalPages: 4,
        totalResults: 32,
        hasMore: true,
        results: [new Cameo({
          id: 77,
          mediaId: 123,
          mediaType: 'movie',
          name: 'Cameo Star',
          character: 'Himself (uncredited)',
          mediaTitle: 'Il Film',
          mediaTitles: { it: 'Il Film', en: 'The Movie' }
        })]
      };
    }
  };
  const repo = new CameoRepository(/** @type {any} */ (backend), storage);
  repo.setOnlineOverride(true);

  const online = await repo.getFamousCameos({ page: 1, limit: 8, language: 'it-IT', force: true });
  assert.equal(remoteCalls, 1);
  assert.equal(online.results[0].getMediaTitle('en'), 'The Movie');

  const storedKey = repo.buildCacheKey('famous_cinema_cameos', { language: 'it-IT', page: 1, limit: 8 });
  const storedRecord = await storage.get(STORES.CAMEOS, storedKey);
  assert.ok(Number.isFinite(storedRecord?.cachedAt), 'Saved famous cameos record must store cachedAt');

  // Reopening the app offline with force:true must seamlessly fall back to IndexedDB without hitting remote
  repo.setOnlineOverride(false);
  const offline = await repo.getFamousCameos({ page: 1, limit: 8, language: 'it-IT', force: true });
  assert.equal(remoteCalls, 1, 'Offline force:true must not attempt remote network call');
  assert.ok(offline.results[0] instanceof Cameo);
  assert.equal(offline.results[0].isUncredited, true);
  assert.equal(offline.results[0].getMediaTitle('it'), 'Il Film');
  assert.equal(offline.results[0].getMediaTitle('en'), 'The Movie');

  // Legacy scalar Cameo fallback & empty Cameo safety
  const legacyCameo = new Cameo({ id: 1, name: 'Legacy', mediaTitle: 'Solo Stringa' });
  assert.equal(legacyCameo.getMediaTitle('en'), 'Solo Stringa');
  assert.equal(new Cameo({}).getMediaTitle('it'), null);
});

test('Architecture SRP: MediaCatalog hierarchy, non-overwriting list cache, upcoming grouped state and real famous cameo totalPages', async () => {
  // Base classes stay focused and do not expose media-catalog methods
  assert.equal('loadPagination' in BaseViewModel.prototype, false);
  assert.equal('runSearch' in BaseViewModel.prototype, false);
  assert.equal('_executeMediaCatalogPage' in BaseRepository.prototype, false);
  assert.equal('_executeMediaSearch' in BaseRepository.prototype, false);
  assert.ok(new MovieViewModel() instanceof MediaCatalogViewModel);
  assert.ok(new MovieRepository() instanceof MediaCatalogRepository);

  // _cacheEntitiesFromList inserts isComplete:false only when absent and never overwrites existing records
  const storage = new IndexedDBService();
  let callCount = 0;
  const movieRepo = new MovieRepository(/** @type {any} */ ({
    async discoverMovies() {
      callCount += 1;
      return { page: 1, total_pages: 1, results: [new Movie({ id: 42, title: callCount === 1 ? 'First List' : 'Second List' })] };
    }
  }), storage);
  movieRepo.setOnlineOverride(true);
  await movieRepo.discoverMovies({ page: 1, language: 'it-IT', force: true });
  assert.equal((await storage.get(STORES.MOVIES, 'movie:42:it-IT')).isComplete, false);
  assert.equal((await storage.get(STORES.MOVIES, 'movie:42:it-IT')).data.title, 'First List');
  await movieRepo.discoverMovies({ page: 1, language: 'it-IT', force: true });
  assert.equal((await storage.get(STORES.MOVIES, 'movie:42:it-IT')).data.title, 'First List', 'List writes must not overwrite existing store entries');

  // loadUpcomingMovies populates both upcomingMovies and categoryMovies.upcoming uniformly
  const vm = new MovieViewModel(/** @type {any} */ ({
    async getUpcomingMovies({ page }) {
      return { page, total_pages: 1, results: [new Movie({ id: 700, title: 'Upcoming Film', release_date: '2099-01-01' })] };
    }
  }));
  await vm.loadUpcomingMovies({ language: 'it-IT' });
  assert.equal(vm.state.upcomingMovies.length, 1);
  assert.deepEqual(vm.state.categoryMovies.upcoming, vm.state.upcomingMovies);

  // CameoBackend.getFamousCameos respects actual source total_pages without an arbitrary floor of 50
  const backend = new CameoBackend(/** @type {any} */ ({}));
  backend.getCameoHeavyMovies = async () => ({ total_pages: 2, results: [{ id: 1, title: 'M1' }] });
  backend.getMovieCameos = async () => ({ cameos: [{ id: 9, popularity: 10 }] });
  const famous = await backend.getFamousCameos({ page: 1, limit: 8 });
  assert.equal(famous.totalPages, 10, '2 source pages * 5 = 10 total cameo pages (no fake floor of 50)');
});
