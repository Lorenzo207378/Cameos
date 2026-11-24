import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { MovieRepository } from '../src/repository/movies/MovieRepository.js';
import { MovieViewModel } from '../src/viewmodel/movies/MovieViewModel.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';
import { MAIN_CAST_CUTOFF, extractCameosFromMovieCast } from '../src/backend/cameos/cameoClassification.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Episode } from '../src/models/Episode.js';
import { Cameo } from '../src/models/Cameo.js';
import { WatchProvider } from '../src/models/WatchProvider.js';
import { formatMillions, formatWatchProviders } from '../src/utils/formatters.js';
import { getLocalizedGenres } from '../src/models/utils/mediaLabels.js';
import { translateLabel } from '../src/utils/language/translations.js';

test('MovieViewModel.loadMovieDetails supports options object with force, legacy positional calls, and error cleanup', async () => {
  const calls = [];
  let shouldFail = false;
  const repo = {
    async getMovieDetails(params) {
      calls.push(params);
      if (shouldFail) throw new Error('Movie service unavailable');
      return new Movie({ id: params.movieId, titles: { it: 'Film IT', en: 'Movie EN' }, status: 'Released', runtime: 135 });
    }
  };

  const vm = new MovieViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  const optMovie = await vm.loadMovieDetails({ movieId: 101, appendCredits: true, language: 'en-US', force: true });
  assert.equal(optMovie?.id, 101);
  assert.deepEqual(calls[0], { movieId: 101, appendCredits: true, language: 'en-US', force: true });
  assert.equal(vm.isMovieLoading(101), false);
  assert.equal(vm.state.error, null);

  const aliasMovie = await vm.loadMovieDetails({ id: 102, appendCredits: false });
  assert.equal(aliasMovie?.id, 102);
  assert.deepEqual(calls[1], { movieId: 102, appendCredits: false, language: 'it-IT' });

  const legacyMovie = await vm.loadMovieDetails(103, true, 'en-US');
  assert.equal(legacyMovie?.id, 103);
  assert.deepEqual(calls[2], { movieId: 103, appendCredits: true, language: 'en-US' });

  assert.equal(await vm.loadMovieDetails(null), null);
  assert.equal(calls.length, 3);

  shouldFail = true;
  const failed = await vm.loadMovieDetails({ movieId: 104, appendCredits: true, language: 'it-IT', force: true });
  assert.equal(failed, null);
  assert.equal(vm.isMovieLoading(104), false);
  assert.equal(vm.state.error, 'Movie service unavailable');
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
      posterUrl: {
        it: 'https://image.tmdb.org/t/p/w342/poster-it.jpg',
        en: 'https://image.tmdb.org/t/p/w342/poster-en.jpg'
      },
      backdropUrl: {
        it: 'https://image.tmdb.org/t/p/w780/backdrop-it.jpg',
        en: 'https://image.tmdb.org/t/p/w780/backdrop-en.jpg'
      }
    });

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
      { id: 102, name: 'Unknown Extra', character: 'Passerby', order: 20, popularity: 2 }
    ]
  });

  // CameoViewModel excludes top-8 main cast (even if lead #1 plays "Himself") and keeps real cameos sorted by popularity
  const derived = vm.extractMovieCameos(movie, { minPopularity: 8, language: 'en-US' });
  assert.equal(derived.length, 2);
  assert.ok(derived.every((item) => item instanceof Cameo));
  assert.deepEqual(derived.map((item) => item.id), [101, 100]);
  assert.equal(derived[0].cameoBadge, 'Special Guest Star');
  assert.equal(derived[1].cameoBadge, 'Cameo');
  assert.equal(derived[0].mediaTitle, 'Epic Movie');
  assert.equal(derived[0].getMediaTitle('it'), 'Film Epico');
  assert.equal(derived[0].getMediaTitle('en'), 'Epic Movie');

  // Pure classifier with excludeMainCast:false (used by getFamousCameos / backend) retains explicit Self lead
  const raw = extractCameosFromMovieCast(movie, { minPopularity: 8, language: 'it-IT', excludeMainCast: false });
  assert.deepEqual(raw.cameos.map((item) => item.id), [1, 101, 100]);
  assert.equal(raw.allCast.length, MAIN_CAST_CUTOFF + 3);

  // Null movie returns empty array safely
  assert.deepEqual(vm.extractMovieCameos(null), []);
});

