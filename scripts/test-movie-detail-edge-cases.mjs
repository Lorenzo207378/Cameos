import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';
import { MAIN_CAST_CUTOFF, extractCameosFromMovieCast, extractCameosFromGuestStars } from '../src/backend/cameos/cameoClassification.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Episode } from '../src/models/Episode.js';
import { Cameo } from '../src/models/Cameo.js';
import { WatchProvider } from '../src/models/WatchProvider.js';
import { excludeCameosFromCast, formatMillions, formatWatchProviders } from '../src/utils/formatters.js';
import { getLocalizedGenres } from '../src/models/utils/mediaLabels.js';
import { translateLabel } from '../src/utils/language/translations.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('MovieViewModel.loadMovieDetails supports options+force, validates numeric IDs, isolates movieError and discards stale failures', async () => {
  const calls = [];
  let shouldFail = false;
  let returnNull = false;
  const repo = {
    async getMovieDetails(params) {
      calls.push(params);
      if (shouldFail) throw new Error('Movie service unavailable');
      if (returnNull) return null;
      return new Movie({ id: params.movieId, titles: { it: 'Film IT', en: 'Movie EN' }, status: 'Released', runtime: 135 });
    },
    async discoverMovies() {
      return { results: [], page: 1, total_pages: 1, total_results: 0 };
    }
  };

  const vm = new MovieViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  // Malformed / non-numeric IDs never hit repository and never hang isMovieLoading
  for (const invalidId of [null, undefined, '', '   ', 'abc', 0, -5, 1.5]) {
    assert.equal(vm.isMovieLoading(invalidId), false, `Malformed movieId (${String(invalidId)}) must not stay loading`);
    assert.equal(await vm.loadMovieDetails(invalidId), null);
  }
  assert.equal(calls.length, 0);

  const optMovie = await vm.loadMovieDetails({ movieId: 101, appendCredits: true, language: 'en-US', force: true });
  assert.equal(optMovie?.id, 101);
  assert.deepEqual(calls[0], { movieId: 101, appendCredits: true, language: 'en-US', force: true });
  assert.equal(vm.isMovieLoading(101), false);
  assert.equal(vm.state.movieError, null);
  assert.equal(vm.state.error, null);

  const aliasMovie = await vm.loadMovieDetails({ id: 102, appendCredits: false });
  assert.equal(aliasMovie?.id, 102);
  assert.deepEqual(calls[1], { movieId: 102, appendCredits: false, language: 'it-IT' });

  const legacyMovie = await vm.loadMovieDetails(103, true, 'en-US');
  assert.equal(legacyMovie?.id, 103);
  assert.deepEqual(calls[2], { movieId: 103, appendCredits: true, language: 'en-US' });

  // Isolated movieError survives a parallel catalog success that clears generic state.error
  shouldFail = true;
  await Promise.all([
    vm.loadMovieDetails({ movieId: 104, appendCredits: true, language: 'it-IT', force: true }),
    vm.discoverMovies({ page: 1 })
  ]);
  assert.equal(vm.isMovieLoading(104), false);
  assert.equal(vm.state.movieError, 'Movie service unavailable');

  // True not-found (resolves null without throwing) leaves movieError null
  shouldFail = false;
  returnNull = true;
  assert.equal(await vm.loadMovieDetails({ movieId: 105, language: 'it-IT' }), null);
  assert.equal(vm.state.movieError, null);

  // Same-ID retry race: slow initial request rejects AFTER fast retry already succeeded
  const slowFirst = deferred();
  let attempt = 0;
  const raceVm = new MovieViewModel(/** @type {any} */ ({
    getMovieDetails: ({ movieId }) => {
      attempt += 1;
      if (attempt === 1) return slowFirst.promise;
      return Promise.resolve(new Movie({ id: movieId, titles: { it: 'Film Retry', en: 'Retry Movie' } }));
    }
  }));
  const pendingFirst = raceVm.loadMovieDetails({ movieId: 200 });
  const retried = await raceVm.loadMovieDetails({ movieId: 200, force: true });
  assert.equal(retried?.id, 200);
  slowFirst.reject(new Error('Stale first attempt timed out'));
  await pendingFirst;
  assert.equal(raceVm.state.movieError, null, 'Stale rejection on same movieId must never overwrite newer retry success');
  assert.equal(raceVm.state.selectedMovie?.id, 200);

  // clearSelection cancels any in-flight movieError commit
  const slowClear = deferred();
  const clearVm = new MovieViewModel(/** @type {any} */ ({
    getMovieDetails: () => slowClear.promise
  }));
  const pendingClear = clearVm.loadMovieDetails({ movieId: 201 });
  clearVm.clearSelection();
  slowClear.reject(new Error('Aborted after clear'));
  await pendingClear;
  assert.equal(clearVm.state.movieError, null);
});

test('CameoViewModel.loadMovieCameos forwards force option to CameoRepository.getMovieCameos', async () => {
  const calls = [];
  const repo = {
    async getMovieCameos(params) {
      calls.push(params);
      return { movie: new Movie({ id: params.movieId, cast: [] }), cameos: [] };
    }
  };

  const vm = new CameoViewModel(/** @type {any} */ (repo), { language: 'it-IT' });
  await vm.loadMovieCameos({ movieId: 55, minPopularity: 8, language: 'en-US', force: true });
  await vm.loadMovieCameos({ movieId: 56, minPopularity: 8, language: 'it-IT' });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], { movieId: 55, minPopularity: 8, language: 'en-US', force: true });
  assert.deepEqual(calls[1], { movieId: 56, minPopularity: 8, language: 'it-IT' });
});

test('Movie, Series, and Episode localization getters honor explicit lang independently of saved localStorage language', () => {
  const originalLocalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => (key === 'cameos_language' ? 'it' : null),
      setItem: () => {},
      removeItem: () => {}
    }
  });

  try {
    const movie = new Movie({
      id: 77,
      titles: { it: 'Titolo IT', en: 'Title EN' },
      status: 'Post Production',
      runtime: 135,
      budget: 150_000_000,
      revenue: 0,
      genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }],
      crew: [
        { id: 1, name: 'Main Director', job: 'Director', department: 'Directing' },
        { id: 2, name: 'Assistant Dir', job: 'First Assistant Director', department: 'Directing' },
        { id: 3, name: 'Lead Writer', job: 'Screenplay', department: 'Writing' },
        { id: 3, name: 'Lead Writer', job: 'Story', department: 'Writing' },
        { id: 4, name: 'Novel Author', job: 'Novel', department: 'Writing' }
      ],
      posterUrl: {
        it: 'https://image.tmdb.org/t/p/w342/poster-it.jpg',
        en: 'https://image.tmdb.org/t/p/w342/poster-en.jpg'
      },
      backdropUrl: {
        it: 'https://image.tmdb.org/t/p/w780/backdrop-it.jpg',
        en: 'https://image.tmdb.org/t/p/w780/backdrop-en.jpg'
      }
    });

    assert.deepEqual(movie.getDirectors().map((d) => d.name), ['Main Director']);
    assert.deepEqual(movie.getWriters().map((w) => w.name), ['Lead Writer', 'Novel Author']);

    // Explicit 'en' overrides saved 'it'
    assert.deepEqual(movie.getGenres('en').map((g) => g.name), ['Action', 'Sci-Fi']);
    assert.deepEqual(movie.getGenres('it').map((g) => g.name), ['Azione', 'Fantascienza']);
    assert.equal(movie.getStatusLabel('en'), 'Post-Production');
    assert.equal(movie.getStatusLabel('it'), 'Post-Produzione');
    assert.equal(movie.getBudget('en'), '$150 Million');
    assert.equal(movie.getBudget('it'), '$150 Milioni');
    assert.equal(movie.getRevenue('en'), 'Not disclosed');
    assert.equal(movie.getRevenue('it'), 'Non dichiarato');
    assert.equal(movie.getRuntime('en'), '2h 15m');
    assert.equal(movie.getRuntime('it'), '2h 15m');

    // Explicit TMDB size parameter avoids View-level URL string replacement
    assert.equal(movie.getBackdropUrl('en', 'w1280'), 'https://image.tmdb.org/t/p/w1280/backdrop-en.jpg');
    assert.equal(movie.getBackdropUrl('it', 'w1280'), 'https://image.tmdb.org/t/p/w1280/backdrop-it.jpg');
    assert.equal(movie.getPosterUrl('it', 'w500'), 'https://image.tmdb.org/t/p/w500/poster-it.jpg');

    // Low-level helpers honor explicit lang too
    assert.equal(translateLabel('status.planned', 'en'), 'Planned');
    assert.equal(translateLabel('status.planned', 'it'), 'Pianificato');
    assert.equal(formatMillions(25_000_000, 'en'), '$25 Million');
    assert.equal(formatMillions(0, 'en'), 'Not disclosed');
    assert.deepEqual(getLocalizedGenres([{ id: 35, name: 'Comedy' }], 'en').map((g) => g.name), ['Comedy']);
    assert.deepEqual(getLocalizedGenres([{ id: 35, name: 'Comedy' }], 'it').map((g) => g.name), ['Commedia']);

    // Series and Episode accept explicit lang
    const series = new Series({ id: 88, status: 'Returning Series', genres: [{ id: 18, name: 'Drama' }] });
    assert.equal(series.getStatusLabel('en'), 'Returning series');
    assert.equal(series.getStatusLabel('it'), 'In corso');
    assert.deepEqual(series.getGenres('en').map((g) => g.name), ['Drama']);
    assert.deepEqual(series.getGenres('it').map((g) => g.name), ['Dramma']);

    const episode = new Episode({ id: 99, runtime: 75 });
    assert.equal(episode.getRuntime('en'), '1h 15m');
    assert.equal(episode.getRuntime('it'), '1h 15m');
  } finally {
    if (originalLocalStorage === undefined) {
      delete /** @type {any} */ (globalThis).localStorage;
    } else {
      Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage });
    }
  }
});

test('formatWatchProviders rehydrates plain IndexedDB-serialized provider groups into WatchProvider instances', () => {
  const originalMovie = new Movie({
    id: 500,
    watchProviders: {
      IT: {
        flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.png' }],
        buy: [{ provider_id: 10, provider_name: 'Amazon Video', logo_path: '/amazon.png' }]
      }
    }
  });

  // Simulate IndexedDB structured clone / JSON round-trip dropping class prototypes
  const plainSerialized = JSON.parse(JSON.stringify(originalMovie));
  assert.equal(plainSerialized.watchProviders[0].items[0] instanceof WatchProvider, false);

  const rehydratedGroups = formatWatchProviders(plainSerialized.watchProviders);
  assert.equal(rehydratedGroups.length, 2);
  assert.ok(rehydratedGroups[0].items[0] instanceof WatchProvider);
  assert.equal(rehydratedGroups[0].items[0].displayName, 'Netflix');
  assert.equal(rehydratedGroups[0].items[0].getLogoUrl('it'), 'https://image.tmdb.org/t/p/w185/netflix.png');
  assert.ok(rehydratedGroups[1].items[0] instanceof WatchProvider);
  assert.equal(rehydratedGroups[1].items[0].displayName, 'Amazon Video Store');

  const rehydratedMovie = new Movie(plainSerialized);
  assert.ok(rehydratedMovie.watchProviders[0].items[0] instanceof WatchProvider);
  assert.equal(rehydratedMovie.watchProviders[0].items[0].displayName, 'Netflix');
});

test('MovieRepository.getMovieDetails preserves complete cache offline on force:true and throws controlled error on cold miss', async () => {
  const storage = new IndexedDBService();
  let remoteCalls = 0;
  const backend = {
    async getMovieDetails({ movieId }) {
      remoteCalls += 1;
      return new Movie({
        id: movieId,
        titles: { it: 'Film Completo', en: 'Full Movie' },
        status: 'Released',
        runtime: 120,
        cast: [{ id: 1, name: 'Lead Actor' }],
        watchProviders: { IT: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } }
      });
    }
  };
  const repo = new MovieRepository(/** @type {any} */ (backend), storage);

  const online = await repo.getMovieDetails({ movieId: 777, appendCredits: true, language: 'it-IT' });
  assert.equal(online.id, 777);
  assert.equal(remoteCalls, 1);
  const stored = await storage.get(STORES.MOVIES, 'movie:777:it-IT');
  assert.equal(stored?.isComplete, true);

  // Forced retry while offline must fall back cleanly to the complete cached record with WatchProvider instances
  repo.setOnlineOverride(false);
  const offline = await repo.getMovieDetails({ movieId: 777, appendCredits: true, language: 'it-IT', force: true });
  assert.equal(offline.id, 777);
  assert.equal(offline.getTitle('en'), 'Full Movie');
  assert.equal(offline.cast[0]?.name, 'Lead Actor');
  assert.ok(offline.watchProviders[0]?.items[0] instanceof WatchProvider);

  // Cold miss offline throws controlled error rather than silently returning null
  await assert.rejects(
    () => repo.getMovieDetails({ movieId: 999999, appendCredits: true, language: 'it-IT', force: true }),
    /connettivit|offline|cache/i
  );
});

test('Option 1A: CameoViewModel.extractMovieCameos derives cameos synchronously across MVVM layers without extra network calls', () => {
  const backend = new CameoBackend(/** @type {any} */ ({
    defaultLanguage: 'it-IT',
    getMovieDetails() {
      throw new Error('Must never call network when deriving cameos from loaded Movie');
    }
  }));
  const repo = new CameoRepository(backend, new IndexedDBService());
  const vm = new CameoViewModel(repo, { language: 'it-IT' });

  const mainCast = Array.from({ length: MAIN_CAST_CUTOFF }, (_, idx) => ({
    id: idx + 1,
    name: `Lead ${idx + 1}`,
    character: idx === 0 ? 'Himself' : `Protagonist ${idx + 1}`,
    order: idx,
    popularity: 95
  }));
  const movie = new Movie({
    id: 299534,
    titles: { it: 'Film Epico', en: 'Epic Movie' },
    cast: [
      ...mainCast,
      { id: 100, name: 'Stan Cameo', character: 'Cameo (uncredited)', order: 12, popularity: 5 },
      { id: 101, name: 'Famous Guest', character: 'Bartender', order: 15, popularity: 22 },
      { id: 102, name: 'Notable Guest', character: 'Passerby', order: 20, popularity: 2 },
      { id: 103, name: 'Unknown Extra', character: 'Pedestrian', order: 25, popularity: 1.2 }
    ]
  });

  // Explicit override (minPopularity: 8) excludes top-8 main cast and actors below 8
  const derived = vm.extractMovieCameos(movie, { minPopularity: 8, language: 'en-US' });
  assert.equal(derived.length, 2);
  assert.ok(derived.every((item) => item instanceof Cameo));
  assert.deepEqual(derived.map((item) => item.id), [101, 100]);
  assert.equal(derived[0].cameoBadge, 'Special Guest Star');
  assert.equal(derived[1].cameoBadge, 'Cameo');
  assert.equal(derived[0].mediaTitle, 'Epic Movie');
  assert.equal(derived[0].getMediaTitle('it'), 'Film Epico');
  assert.equal(derived[0].getMediaTitle('en'), 'Epic Movie');

  // Unified default threshold (DEFAULT_CAMEO_MIN_POPULARITY = 2) includes popularity >= 2 and excludes < 2
  const defaultDerived = vm.extractMovieCameos(movie, { language: 'en-US' });
  assert.deepEqual(defaultDerived.map((item) => item.id), [101, 100, 102]);

  // Pure classifier with excludeMainCast:false (used by getFamousCameos / backend) retains explicit Self lead
  const raw = extractCameosFromMovieCast(movie, { minPopularity: 8, language: 'it-IT', excludeMainCast: false });
  assert.deepEqual(raw.cameos.map((item) => item.id), [1, 101, 100]);
  assert.equal(raw.allCast.length, MAIN_CAST_CUTOFF + 4);

  // Null movie returns empty array safely
  assert.deepEqual(vm.extractMovieCameos(null), []);
});

test('Movie cast and cameo extractors deduplicate repeated TMDB credits per actor and merge character roles cleanly', () => {
  const rawPayload = {
    id: 1300968,
    titles: { it: "Hunger Games - L'alba sulla mietitura", en: 'The Hunger Games: Sunrise on the Reaping' },
    cast: [
      { id: 1, name: 'Lead Hero', character: 'Hero', order: 0, popularity: 20 },
      { id: 2, name: 'Co-Star 2', character: 'Role 2', order: 1, popularity: 12 },
      { id: 3, name: 'Co-Star 3', character: 'Role 3', order: 2, popularity: 10 },
      { id: 4, name: 'Co-Star 4', character: 'Role 4', order: 3, popularity: 9 },
      { id: 5, name: 'Co-Star 5', character: 'Role 5', order: 4, popularity: 8 },
      { id: 6, name: 'Co-Star 6', character: 'Role 6', order: 5, popularity: 7 },
      { id: 7, name: 'Co-Star 7', character: 'Role 7', order: 6, popularity: 6 },
      { id: 8, name: 'Co-Star 8', character: 'Role 8', order: 7, popularity: 5 },
      { id: 57755, name: 'Woody Harrelson', character: 'Haymitch', order: 8, popularity: 6.93 },
      { id: 1001, name: 'Dual Cameo', character: 'Austin Powers', order: 10, popularity: 5.5 },
      { id: 1001, name: 'Dual Cameo', character: 'Dr. Evil (uncredited)', order: 14, popularity: 5.5 },
      { id: 1, name: 'Lead Hero', character: 'Extra Guard', order: 25, popularity: 20 },
      { id: 57755, name: 'Woody Harrelson', character: 'Older Haymitch Abernathy', order: 42, popularity: 6.93 }
    ]
  };

  // Raw payload extractor collapses duplicate Woody Harrelson entries into one cameo with fuller character caption
  // and keeps Lead Hero out of cameos because lowest order is 0 (< MAIN_CAST_CUTOFF)
  const rawResult = extractCameosFromMovieCast(rawPayload, { language: 'it-IT', excludeMainCast: false });
  assert.deepEqual(rawResult.cameos.map((c) => c.id), [57755, 1001]);
  assert.equal(rawResult.cameos[0].character, 'Older Haymitch Abernathy');
  assert.equal(rawResult.cameos[0].order, 8);
  assert.equal(rawResult.cameos[0].isUncredited, false);
  assert.equal(rawResult.cameos[1].character, 'Austin Powers / Dr. Evil');
  assert.equal(rawResult.cameos[1].isUncredited, false);

  // Hydrated Movie model also deduplicates Movie.cast for CastCarousel and produces identical cameos
  const movie = new Movie(rawPayload);
  assert.equal(movie.cast.filter((member) => member.id === 57755).length, 1);
  assert.equal(movie.cast.find((member) => member.id === 57755)?.character, 'Older Haymitch Abernathy');
  assert.equal(movie.cast.find((member) => member.id === 1)?.order, 0);
  const vm = new CameoViewModel(new CameoRepository(new CameoBackend({}), new IndexedDBService()));
  const movieCameos = vm.extractMovieCameos(movie, { language: 'it-IT' });
  assert.deepEqual(movieCameos.map((c) => c.id), [57755, 1001]);
  assert.equal(movieCameos[0].character, 'Older Haymitch Abernathy');

  // CameoViewModel.getMovieCastAndCameos delivers disjoint cast and cameos directly to the View
  const vmCredits = vm.getMovieCastAndCameos(movie, { language: 'it-IT' });
  assert.deepEqual(vmCredits.cameos.map((c) => c.id), [57755, 1001]);
  assert.equal(vmCredits.cast.length, 8);
  assert.equal(vmCredits.cast.some((member) => member.id === 57755 || member.id === 1001), false);
  assert.deepEqual(vm.getMovieCastAndCameos(null), { cast: [], cameos: [] });

  // Guest star extractor also deduplicates repeated credits for the same guest actor
  const guests = extractCameosFromGuestStars([
    { id: 77, name: 'Guest Actor', character: 'Haymitch', popularity: 8 },
    { id: 77, name: 'Guest Actor', character: 'Older Haymitch Abernathy', popularity: 8 }
  ]);
  assert.equal(guests.length, 1);
  assert.equal(guests[0].character, 'Older Haymitch Abernathy');

  // excludeCameosFromCast keeps CastCarousel and CameoCarousel strictly disjoint
  const nonCameoCast = excludeCameosFromCast(movie.cast, movieCameos);
  assert.equal(nonCameoCast.some((member) => member.id === 57755 || member.id === 1001), false);
  assert.equal(nonCameoCast.length, 8);
  assert.deepEqual(
    excludeCameosFromCast(
      [
        { id: 10, name: 'Chris Evans' },
        { id: 20, name: 'Chris Evans' },
        { name: 'Nameless Id Actor' }
      ],
      [{ id: '10', name: 'Chris Evans' }, { name: 'nameless id actor' }]
    ).map((m) => m.id),
    [20]
  );

  // Episode model reuses shared deduplication and excludes cameos from episode.cast
  const episode = new Episode({
    id: 500,
    cast: [
      { id: 1, name: 'Regular', character: 'Lead' },
      { id: 2, name: 'Guest Cameo', character: 'Cameo' }
    ],
    guest_stars: [
      { id: 1, name: 'Regular', character: 'Lead Alt' },
      { id: 3, name: 'Supporting', character: 'Clerk' }
    ],
    cameos: [{ id: 2, name: 'Guest Cameo', character: 'Cameo' }]
  });
  assert.deepEqual(episode.cast.map((m) => m.id), [1, 3]);
  assert.equal(episode.cast[0].character, 'Lead Alt');
});

