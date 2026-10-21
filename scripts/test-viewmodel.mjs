import process from 'node:process';
import assert from 'node:assert/strict';
process.loadEnvFile('.env');

import {
  IndexedDBService,
  BaseRepository,
  SeriesRepository,
  MovieRepository,
  CameoRepository,
  PersonRepository,
  UserRepository
} from '../src/repository/index.js';
import { UserBackend } from '../src/backend/user/UserBackend.js';
import {
  SeriesViewModel,
  MovieViewModel,
  CameoViewModel,
  PersonViewModel,
  UserViewModel,
  HomeViewModel
} from '../src/viewmodel/index.js';
import { User, Series, Season, Episode, Movie, Person, Cameo } from '../src/models/index.js';

function divider(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`[VM TEST] ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  console.log('--- AVVIO TEST PACKAGE VIEWMODEL (MVVM + STATE SUBSCRIPTION + REPOSITORIES) ---');

  const storage = new IndexedDBService({ dbName: 'cameos_vm_test_db', dbVersion: 2 });
  const seriesRepo = new SeriesRepository(undefined, storage);
  const movieRepo = new MovieRepository(undefined, storage);
  const cameoRepo = new CameoRepository(undefined, storage);
  const personRepo = new PersonRepository(undefined, storage);

  const mockFirestoreDocs = new Map();
  const mockFirestoreAdapter = {
    async getDocument(_db, _col, docId) {
      const item = mockFirestoreDocs.get(docId);
      return item ? JSON.parse(JSON.stringify(item)) : null;
    },
    async setDocument(_db, _col, docId, data, options = {}) {
      const existing = options.merge ? (mockFirestoreDocs.get(docId) || {}) : {};
      mockFirestoreDocs.set(docId, JSON.parse(JSON.stringify({ ...existing, ...data, id: docId })));
    },
    async deleteDocument(_db, _col, docId) {
      mockFirestoreDocs.delete(docId);
    },
    async queryByField(_db, _col, field, value) {
      return Array.from(mockFirestoreDocs.values()).filter((d) => d[field] === value);
    },
    timestamp: () => new Date().toISOString()
  };
  const userBackend = new UserBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const userRepo = new UserRepository(userBackend, storage);

  // 1. SeriesViewModel + useSyncExternalStore Subscription
  divider('1. SERIES VIEWMODEL: Subscription, Loading State e Caricamento Gerarchico');
  BaseRepository.setGlobalOnlineOverride(true);

  const seriesVm = new SeriesViewModel(seriesRepo, { language: 'it-IT' });
  const snapshots = [];
  const unsubscribeSeries = seriesVm.subscribe(() => {
    snapshots.push(seriesVm.getSnapshot());
  });

  await seriesVm.loadSeriesDetails(1418);
  assert.ok(snapshots.length >= 2, 'ViewModel must notify listeners on loading start and completion');
  assert.equal(snapshots[0].loading, true, 'First snapshot must have loading: true');
  assert.equal(seriesVm.state.loading, false, 'Final snapshot must have loading: false');
  assert.ok(seriesVm.state.selectedSeries instanceof Series, 'selectedSeries must be Series instance');
  console.log(`SeriesViewModel.selectedSeries: "${seriesVm.state.selectedSeries.name}" (${snapshots.length} notifiche stato)`);

  await seriesVm.loadSeasonDetails(1418, 3);
  assert.ok(seriesVm.state.selectedSeason instanceof Season, 'selectedSeason must be Season instance');
  console.log(`SeriesViewModel.selectedSeason: "${seriesVm.state.selectedSeason.name}" (${seriesVm.state.selectedSeason.episodes.length} ep)`);

  await seriesVm.loadEpisodeDetails(1418, 3, 16);
  assert.ok(seriesVm.state.selectedEpisode instanceof Episode, 'selectedEpisode must be Episode instance');
  console.log(`SeriesViewModel.selectedEpisode: "${seriesVm.state.selectedEpisode.name}"`);
  unsubscribeSeries();

  // 2. MovieViewModel
  divider('2. MOVIE VIEWMODEL: Search, Dettagli e Switch Lingua');
  const movieVm = new MovieViewModel(movieRepo, { language: 'it-IT' });
  await movieVm.searchMovies('Avengers: Endgame');
  assert.ok(movieVm.state.searchResults[0] instanceof Movie, 'searchResults[0] must be Movie instance');

  await movieVm.loadMovieDetails(299534);
  assert.ok(movieVm.state.selectedMovie instanceof Movie, 'selectedMovie must be Movie instance');
  console.log(`MovieViewModel.selectedMovie: "${movieVm.state.selectedMovie.title}" (${movieVm.state.selectedMovie.runtime} min)`);

  // 3. CameoViewModel & PersonViewModel
  divider('3. CAMEO & PERSON VIEWMODELS: Camei Episodio e Profilo Attore');
  const cameoVm = new CameoViewModel(cameoRepo, { language: 'it-IT' });
  await cameoVm.loadEpisodeCameos(1418, 3, 16);
  assert.ok(cameoVm.state.episodeCameos.cameos[0] instanceof Cameo, 'episodeCameos.cameos[0] must be Cameo instance');
  console.log(`CameoViewModel.episodeCameos: ${cameoVm.state.episodeCameos.cameos[0].name} (${cameoVm.state.episodeCameos.cameos[0].cameoBadge})`);

  const personVm = new PersonViewModel(personRepo, { language: 'it-IT' });
  await personVm.loadPersonProfile(7624);
  assert.ok(personVm.state.personProfile instanceof Person, 'personProfile must be Person instance');
  console.log(`PersonViewModel.personProfile: "${personVm.state.personProfile.name}"`);

  // 4. UserViewModel
  divider('4. USER VIEWMODEL: Gestione Profilo, Toggle Watchlist/Favorites e Lingua');
  const userVm = new UserViewModel(userRepo, { language: 'it-IT' });
  await userVm.saveUser({ uid: 'uid_vm_1', email: 'test@cameos.app' }, 'cameo_fan');
  assert.ok(userVm.state.currentUser instanceof User, 'currentUser must be User instance');

  await userVm.switchLanguage('uid_vm_1', 'en');
  assert.equal(userVm.state.language, 'en-US', 'Language must normalize and update to en-US');

  await userVm.toggleWatchlist('uid_vm_1', { id: 299534, title: 'Avengers: Endgame' });
  assert.equal(userVm.state.watchlist.length, 1, 'toggleWatchlist (add) must add item');

  await userVm.toggleFavorite('uid_vm_1', { id: 1418, name: 'The Big Bang Theory' });
  assert.equal(userVm.state.favorites.length, 1, 'toggleFavorite (add) must add item');
  console.log(`UserViewModel: utente "${userVm.state.currentUser.username}" | lingua: ${userVm.state.language} | watchlist: ${userVm.state.watchlist.length}`);

  // 5. HomeViewModel (Parallel Aggregation + Offline Fallback)
  divider('5. HOME VIEWMODEL: Caricamento Aggregato Online e Verifica Offline');
  const homeVm = new HomeViewModel(
    { movieRepository: movieRepo, seriesRepository: seriesRepo, cameoRepository: cameoRepo },
    { language: 'it-IT' }
  );
  await homeVm.loadHomeFeed({ timeWindow: 'week' });
  assert.ok(homeVm.state.featuredMovie instanceof Movie, 'featuredMovie must be Movie instance');
  assert.ok(homeVm.state.trendingMovies.length > 0, 'trendingMovies must be populated');
  assert.ok(homeVm.state.trendingSeries.length > 0, 'trendingSeries must be populated');
  console.log(`HomeViewModel (Online): Featured "${homeVm.state.featuredMovie.title}", ${homeVm.state.trendingMovies.length} film trend, ${homeVm.state.trendingSeries.length} serie trend`);

  // Switch to Offline and reload HomeViewModel from IndexedDB
  BaseRepository.setGlobalOnlineOverride(false);
  const offlineHomeVm = new HomeViewModel(
    { movieRepository: movieRepo, seriesRepository: seriesRepo, cameoRepository: cameoRepo },
    { language: 'it-IT' }
  );
  await offlineHomeVm.loadHomeFeed({ timeWindow: 'week' });
  assert.equal(offlineHomeVm.state.isOffline, true, 'isOffline flag must be true when offline');
  assert.ok(offlineHomeVm.state.featuredMovie instanceof Movie, 'Offline featuredMovie must be restored from IndexedDB');
  console.log(`HomeViewModel (Offline): Featured "${offlineHomeVm.state.featuredMovie.title}" servito da IndexedDB (isOffline=${offlineHomeVm.state.isOffline})`);

  BaseRepository.setGlobalOnlineOverride(null);
  storage.close();

  divider('TUTTI I TEST DEL PACKAGE VIEWMODEL COMPLETATI CON SUCCESSO!');
}

main().catch((err) => {
  console.error('Errore durante i test viewmodel:', err);
  process.exit(1);
});
