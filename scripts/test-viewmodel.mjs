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
  HomeViewModel,
  SocialViewModel,
  NotificationViewModel,
  ReviewViewModel
} from '../src/viewmodel/index.js';
import {
  SocialRepository,
  NotificationRepository,
  ReviewRepository
} from '../src/repository/index.js';
import {
  SocialBackend,
  NotificationBackend,
  ReviewBackend
} from '../src/backend/index.js';
import { User, Series, Season, Episode, Movie, Person, Cameo } from '../src/models/index.js';

function divider(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`[VM TEST] ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  console.log('--- AVVIO TEST PACKAGE VIEWMODEL (MVVM + STATE SUBSCRIPTION + REPOSITORIES) ---');

  const storage = new IndexedDBService({ dbName: 'cameos_vm_test_db' });
  const seriesRepo = new SeriesRepository(undefined, storage);
  const movieRepo = new MovieRepository(undefined, storage);
  const cameoRepo = new CameoRepository(undefined, storage);
  const personRepo = new PersonRepository(undefined, storage);

  const mockFirestoreDocs = new Map();
  const docKey = (col, docId) => `${col}:${docId}`;
  const mockFirestoreAdapter = {
    async getDocument(_db, col, docId) {
      const item = mockFirestoreDocs.get(docKey(col, docId));
      return item ? JSON.parse(JSON.stringify(item)) : null;
    },
    async setDocument(_db, col, docId, data, options = {}) {
      const key = docKey(col, docId);
      const existing = options.merge ? (mockFirestoreDocs.get(key) || {}) : {};
      mockFirestoreDocs.set(key, JSON.parse(JSON.stringify({ ...existing, ...data, id: docId })));
    },
    async deleteDocument(_db, col, docId) {
      mockFirestoreDocs.delete(docKey(col, docId));
    },
    async queryByField(_db, col, field, value) {
      const prefix = `${col}:`;
      const results = [];
      for (const [k, v] of mockFirestoreDocs.entries()) {
        if (k.startsWith(prefix) && v[field] === value) {
          results.push(JSON.parse(JSON.stringify(v)));
        }
      }
      return results;
    },
    timestamp: () => new Date().toISOString()
  };
  const userBackend = new UserBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const notificationBackend = new NotificationBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const socialBackend = new SocialBackend(/** @type {any} */ ({}), mockFirestoreAdapter, notificationBackend);
  const reviewBackend = new ReviewBackend(/** @type {any} */ ({}), mockFirestoreAdapter, notificationBackend);

  const socialRepo = new SocialRepository(socialBackend, userBackend, storage);
  const notifRepo = new NotificationRepository(notificationBackend, storage);
  const reviewRepo = new ReviewRepository(reviewBackend, userBackend, storage);

  const userRepo = new UserRepository(userBackend, storage, {
    seriesRepository: seriesRepo,
    movieRepository: movieRepo,
    socialRepository: socialRepo,
    notificationRepository: notifRepo,
    reviewRepository: reviewRepo
  });

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

  // 4. UserViewModel (Profilo, Preferenze Leggere, Risoluzione Media, Amicizie, Notifiche, Recensioni)
  divider('4. USER VIEWMODEL: Gestione Profilo, Rete Sociale, Notifiche e Recensioni');
  const userVm = new UserViewModel(userRepo, { language: 'it-IT' });
  await userRepo.saveUser({ uid: 'uid_vm_2', email: 'friend@cameos.app' }, 'friend_user');
  await userVm.saveUser({ uid: 'uid_vm_1', email: 'test@cameos.app' }, 'cameo_fan');
  assert.ok(userVm.state.currentUser instanceof User, 'currentUser must be User instance');

  await userVm.switchLanguage('en');
  assert.equal(userVm.state.language, 'en-US', 'Language must normalize and update to en-US');

  await userVm.toggleWatchlist({ id: 299534, mediaType: 'movie' });
  assert.equal(userVm.state.watchlist.length, 1, 'toggleWatchlist (add) must add item');

  await userVm.toggleFavorite({ id: 1418, mediaType: 'tv' });
  assert.equal(userVm.state.favorites.length, 1, 'toggleFavorite (add) must add item');

  await userVm.hydrateUserMediaLists();
  assert.ok(userVm.state.resolvedWatchlist[0] instanceof Movie, 'hydrateUserMediaLists must resolve movie ID to Movie instance');
  assert.ok(userVm.state.resolvedFavorites[0] instanceof Series, 'hydrateUserMediaLists must resolve series ID to Series instance');

  // Friend request via ViewModel
  const req = await userVm.sendFriendRequest('uid_vm_2');
  assert.equal(userVm.state.outgoingFriendRequests.length, 1, 'outgoingFriendRequests must be updated');

  // Switch context to uid_vm_2 to accept request
  await userVm.loadUser('uid_vm_2');
  await userVm.loadSocialState();
  assert.equal(userVm.state.incomingFriendRequests.length, 1, 'uid_vm_2 must have 1 incoming request');
  assert.equal(userVm.state.unreadNotificationsCount, 1, 'uid_vm_2 must have 1 unread notification');
  await userVm.acceptFriendRequest(req.id);
  assert.equal(userVm.state.friends.includes('uid_vm_1'), true, 'uid_vm_1 must be in uid_vm_2 friends');

  // Review + MediaStats via ViewModel
  const savedReview = await userVm.saveReview({
    mediaType: 'episode',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    rating: 9.5,
    text: 'Super episodio!',
    liked: true
  });
  assert.equal(userVm.state.mediaReviews.length, 1, 'mediaReviews must contain submitted review');
  assert.equal(userVm.state.currentMediaStats.averageRating, 9.5, 'currentMediaStats must reflect rating');
  console.log(`UserViewModel: utente "${userVm.state.currentUser.username}" | amici: ${userVm.state.friends.length} | recensioni: ${userVm.state.mediaReviews.length}`);

  await userVm.removeReview(savedReview.id);
  assert.equal(userVm.state.mediaReviews.length, 0, 'mediaReviews must be empty after removeReview');
  assert.equal(userVm.state.currentMediaStats.averageRating, 0, 'currentMediaStats averageRating must reset after removeReview');

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

  // 6. Dedicated ViewModels (SocialViewModel, NotificationViewModel, ReviewViewModel)
  divider('6. VIEWMODELS MODULARI: SocialViewModel, NotificationViewModel, ReviewViewModel');
  BaseRepository.setGlobalOnlineOverride(true);

  // SocialViewModel
  const socialVm = new SocialViewModel(socialRepo);
  await userRepo.saveUser({ uid: 'uid_vm_3', email: 'third@cameos.app' }, 'third_user');
  await socialVm.sendFriendRequest('uid_vm_1', 'uid_vm_3');
  assert.equal(socialVm.state.outgoingRequests.length, 1);
  await socialVm.loadSocialData('uid_vm_3');
  assert.equal(socialVm.state.incomingRequests.length, 1);
  console.log('SocialViewModel verificato (richieste in entrata e uscita).');

  // NotificationViewModel
  const notifVm = new NotificationViewModel(notifRepo);
  await notifVm.sendNotification({
    recipientUid: 'uid_vm_3',
    title: 'Benvenuto',
    message: 'Benvenuto su Cameos!'
  });
  await notifVm.loadNotifications('uid_vm_3');
  assert.equal(notifVm.state.notifications.length, 2);
  assert.equal(notifVm.state.unreadCount, 2);
  await notifVm.markAllAsRead('uid_vm_3');
  assert.equal(notifVm.state.unreadCount, 0);
  console.log('NotificationViewModel verificato (invio, conteggio unread, markAllAsRead).');

  // ReviewViewModel
  const reviewVm = new ReviewViewModel(reviewRepo);
  await reviewVm.saveReview('uid_vm_1', {
    mediaType: 'movie',
    mediaId: 299534,
    rating: 10,
    text: 'Capolavoro!',
    liked: true
  });
  await reviewVm.loadMediaFeedback({ mediaType: 'movie', mediaId: 299534 });
  assert.equal(reviewVm.state.mediaReviews.length, 1);
  assert.equal(reviewVm.state.currentMediaStats.averageRating, 10);
  console.log('ReviewViewModel verificato (recensioni e statistiche caricate nello stato).');

  BaseRepository.setGlobalOnlineOverride(null);
  storage.close();

  divider('TUTTI I TEST DEL PACKAGE VIEWMODEL COMPLETATI CON SUCCESSO!');
}

main().catch((err) => {
  console.error('Errore durante i test viewmodel:', err);
  process.exit(1);
});
