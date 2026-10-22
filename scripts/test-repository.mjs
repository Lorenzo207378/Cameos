import process from 'node:process';
import assert from 'node:assert/strict';
process.loadEnvFile('.env');

import {
  IndexedDBService,
  STORES,
  BaseRepository,
  SeriesRepository,
  MovieRepository,
  CameoRepository,
  PersonRepository,
  UserRepository,
  SocialRepository,
  NotificationRepository,
  ReviewRepository
} from '../src/repository/index.js';
import {
  UserBackend,
  SocialBackend,
  NotificationBackend,
  ReviewBackend
} from '../src/backend/index.js';
import {
  User,
  Series,
  Season,
  Episode,
  Movie,
  Person,
  Cameo,
  FriendRequest,
  Notification,
  Review,
  MediaStats
} from '../src/models/index.js';

/**
 * Lightweight W3C-compliant IDBFactory mock to test the native IndexedDB code path
 * (open, onupgradeneeded, createObjectStore, createIndex, transaction, put, get, index.getAll, clear)
 * inside Node.js.
 */
function createMockIDBFactory() {
  const databases = new Map();

  return {
    open(dbName, version) {
      const req = { result: null, error: null, onupgradeneeded: null, onsuccess: null, onerror: null };

      queueMicrotask(() => {
        try {
          let dbEntry = databases.get(dbName);
          const isUpgrade = !dbEntry || dbEntry.version < version;

          if (!dbEntry) {
            const stores = new Map();
            const db = {
              name: dbName,
              version,
              onversionchange: null,
              objectStoreNames: {
                contains: (name) => stores.has(name)
              },
              createObjectStore(name, { keyPath } = { keyPath: 'cacheKey' }) {
                const records = new Map();
                const indexes = new Map();
                const storeMeta = {
                  name,
                  keyPath,
                  records,
                  indexes,
                  createIndex(indexName, keyPathSpec, options = {}) {
                    indexes.set(indexName, { indexName, keyPathSpec, options });
                  }
                };
                stores.set(name, storeMeta);
                return storeMeta;
              },
              transaction(storeName, mode = 'readonly') {
                const storeMeta = stores.get(storeName);
                if (!storeMeta) throw new Error(`Store ${storeName} not found`);

                const tx = {
                  mode,
                  error: null,
                  oncomplete: null,
                  onerror: null,
                  objectStore() {
                    return {
                      put(value) {
                        const r = { result: null, error: null, onsuccess: null, onerror: null };
                        const cloned = JSON.parse(JSON.stringify(value));
                        storeMeta.records.set(cloned[storeMeta.keyPath], cloned);
                        queueMicrotask(() => {
                          r.result = cloned[storeMeta.keyPath];
                          if (r.onsuccess) r.onsuccess({ target: r });
                        });
                        return r;
                      },
                      get(key) {
                        const r = { result: null, error: null, onsuccess: null, onerror: null };
                        const val = storeMeta.records.get(key);
                        queueMicrotask(() => {
                          r.result = val ? JSON.parse(JSON.stringify(val)) : undefined;
                          if (r.onsuccess) r.onsuccess({ target: r });
                        });
                        return r;
                      },
                      getAll() {
                        const r = { result: null, error: null, onsuccess: null, onerror: null };
                        const all = Array.from(storeMeta.records.values()).map((v) => JSON.parse(JSON.stringify(v)));
                        queueMicrotask(() => {
                          r.result = all;
                          if (r.onsuccess) r.onsuccess({ target: r });
                        });
                        return r;
                      },
                      delete(key) {
                        const r = { result: null, error: null, onsuccess: null, onerror: null };
                        storeMeta.records.delete(key);
                        queueMicrotask(() => {
                          if (r.onsuccess) r.onsuccess({ target: r });
                        });
                        return r;
                      },
                      clear() {
                        const r = { result: null, error: null, onsuccess: null, onerror: null };
                        storeMeta.records.clear();
                        queueMicrotask(() => {
                          if (r.onsuccess) r.onsuccess({ target: r });
                        });
                        return r;
                      },
                      index(indexName) {
                        const idxMeta = storeMeta.indexes.get(indexName);
                        if (!idxMeta) throw new Error(`Index ${indexName} not found`);
                        return {
                          getAll(queryVal) {
                            const r = { result: null, error: null, onsuccess: null, onerror: null };
                            const matches = Array.from(storeMeta.records.values())
                              .filter((item) => {
                                if (Array.isArray(idxMeta.keyPathSpec)) {
                                  return idxMeta.keyPathSpec.every((k, i) => item[k] === queryVal[i]);
                                }
                                return item[idxMeta.keyPathSpec] === queryVal;
                              })
                              .map((v) => JSON.parse(JSON.stringify(v)));
                            queueMicrotask(() => {
                              r.result = matches;
                              if (r.onsuccess) r.onsuccess({ target: r });
                            });
                            return r;
                          }
                        };
                      }
                    };
                  }
                };

                queueMicrotask(() => {
                  if (tx.oncomplete) tx.oncomplete({ target: tx });
                });

                return tx;
              },
              close() {}
            };
            dbEntry = { version, db };
            databases.set(dbName, dbEntry);
          }

          req.result = dbEntry.db;
          if (isUpgrade && req.onupgradeneeded) {
            req.onupgradeneeded({ target: req });
          }
          if (req.onsuccess) {
            req.onsuccess({ target: req });
          }
        } catch (err) {
          req.error = err;
          if (req.onerror) req.onerror({ target: req });
        }
      });

      return req;
    }
  };
}

function divider(title) {
  console.log('\n' + '='.repeat(70));
  console.log(`[REPO TEST] ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  console.log('--- AVVIO TEST PACKAGE REPOSITORY (INDEXEDDB + NETWORK-FIRST + OFFLINE FALLBACK) ---');

  const idbFactory = createMockIDBFactory();
  const storage = new IndexedDBService({ dbName: 'cameos_test_db', idbFactory });
  assert.equal(storage.isNativeIndexedDB, true, 'Native IDBFactory path must be active');

  const seriesRepo = new SeriesRepository(undefined, storage);
  const movieRepo = new MovieRepository(undefined, storage);
  const cameoRepo = new CameoRepository(undefined, storage);
  const personRepo = new PersonRepository(undefined, storage);

  // 1. ONLINE FETCH & INDEXEDDB PERSISTENCE
  divider('1. MODALITÀ ONLINE: Fetch da API e Scrittura in IndexedDB');
  BaseRepository.setGlobalOnlineOverride(true);

  const seriesDetails = await seriesRepo.getSeriesDetails({ seriesId: 1418, language: 'it-IT' });
  assert.ok(seriesDetails instanceof Series, 'seriesRepo.getSeriesDetails must return Series');
  console.log(`Online Series salvata in IndexedDB: "${seriesDetails.name}" (ID: ${seriesDetails.id})`);

  const seasonDetails = await seriesRepo.getSeasonDetails({ seriesId: 1418, seasonNumber: 3, language: 'it-IT' });
  assert.ok(seasonDetails instanceof Season, 'seriesRepo.getSeasonDetails must return Season');
  console.log(`Online Season salvata in IndexedDB: "${seasonDetails.name}" (${seasonDetails.episodes.length} episodi)`);

  const movieDetails = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.ok(movieDetails instanceof Movie, 'movieRepo.getMovieDetails must return Movie');
  console.log(`Online Movie salvato in IndexedDB: "${movieDetails.title}" (ID: ${movieDetails.id})`);

  const episodeCameos = await cameoRepo.getEpisodeCameos({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  assert.ok(episodeCameos.episode instanceof Episode, 'cameoRepo.getEpisodeCameos.episode must be Episode');
  assert.ok(episodeCameos.cameos[0] instanceof Cameo, 'cameoRepo.getEpisodeCameos.cameos[0] must be Cameo');
  console.log(`Online Episode Cameos salvati in IndexedDB: ${episodeCameos.cameos.length} camei (es. ${episodeCameos.cameos[0].name})`);

  const personProfile = await personRepo.getPersonProfile({ personId: 7624, language: 'it-IT' });
  assert.ok(personProfile instanceof Person, 'personRepo.getPersonProfile must return Person');
  console.log(`Online Person salvato in IndexedDB: "${personProfile.name}"`);

  // 2. FRESH OVERWRITE TEST (ONLINE)
  divider('2. SOVRASCRITTURA DATI LOCALI: Connessione presente preferisce API e aggiorna IndexedDB');
  await storage.put(STORES.MOVIES, {
    cacheKey: 'movie:299534:it-IT',
    id: 299534,
    language: 'it-IT',
    isComplete: true,
    data: { ...movieDetails, title: 'TITOLO_VECCHIO_OBSOLETO' }
  });

  const staleCheck = await storage.get(STORES.MOVIES, 'movie:299534:it-IT');
  assert.equal(staleCheck.data.title, 'TITOLO_VECCHIO_OBSOLETO', 'Pre-check stale title in IndexedDB');

  // Re-fetch online -> must hit API and overwrite IndexedDB with fresh title
  const refreshedMovie = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.notEqual(refreshedMovie.title, 'TITOLO_VECCHIO_OBSOLETO', 'Online fetch must return fresh API title');

  const updatedInDb = await storage.get(STORES.MOVIES, 'movie:299534:it-IT');
  assert.equal(updatedInDb.data.title, refreshedMovie.title, 'IndexedDB must be overwritten with fresh API version');
  console.log(`IndexedDB sovrascritto con versione fresca: "${updatedInDb.data.title}"`);

  // 3. OFFLINE FALLBACK TEST
  divider('3. MODALITÀ OFFLINE: Assenza connettività legge da IndexedDB e ricostruisce i Modelli');
  BaseRepository.setGlobalOnlineOverride(false);

  const offlineSeries = await seriesRepo.getSeriesDetails({ seriesId: 1418, language: 'it-IT' });
  assert.ok(offlineSeries instanceof Series, 'Offline getSeriesDetails must return Series instance');
  assert.equal(offlineSeries.name, seriesDetails.name);
  assert.ok(offlineSeries.getPosterUrl('it').startsWith('https://image.tmdb.org/'), 'Offline Series posterUrl IT must be preserved');
  assert.ok(offlineSeries.getPosterUrl('en').startsWith('https://image.tmdb.org/'), 'Offline Series posterUrl EN must be preserved');
  console.log(`Offline Series recuperata: "${offlineSeries.name}" | Poster IT: ${offlineSeries.getPosterUrl('it')}`);

  const offlineEpisode = await seriesRepo.getEpisodeDetails({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  assert.ok(offlineEpisode instanceof Episode, 'Offline getEpisodeDetails must return Episode instance');
  console.log(`Offline Episode recuperato: "${offlineEpisode.name}" (Still URL: ${offlineEpisode.getStillUrl('it')})`);

  const offlineMovie = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.ok(offlineMovie instanceof Movie, 'Offline getMovieDetails must return Movie instance');
  assert.equal(offlineMovie.title, movieDetails.title);
  assert.ok(offlineMovie.getPosterUrl('it').startsWith('https://image.tmdb.org/'), 'Offline Movie posterUrl IT must be preserved');
  assert.ok(offlineMovie.getPosterUrl('en').startsWith('https://image.tmdb.org/'), 'Offline Movie posterUrl EN must be preserved');
  console.log(`Offline Movie recuperato: "${offlineMovie.title}" | Poster EN: ${offlineMovie.getPosterUrl('en')}`);

  const offlineSearch = await movieRepo.searchMovies({ query: 'Endgame', language: 'it-IT' });
  assert.equal(offlineSearch.results.length, 1, 'Offline searchMovies must find locally cached movie');
  assert.ok(offlineSearch.results[0] instanceof Movie, 'Offline searchMovies result must be Movie instance');
  console.log(`Offline Search Film ("Endgame"): trovato "${offlineSearch.results[0].title}" nello store locale`);

  const offlineCameos = await cameoRepo.getEpisodeCameos({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  assert.ok(offlineCameos.episode instanceof Episode, 'Offline getEpisodeCameos.episode must be Episode');
  assert.ok(offlineCameos.cameos[0] instanceof Cameo, 'Offline getEpisodeCameos.cameos[0] must be Cameo');
  console.log(`Offline Cameos recuperati: ${offlineCameos.cameos[0].name} (${offlineCameos.cameos[0].cameoBadge})`);

  const offlinePerson = await personRepo.getPersonProfile({ personId: 7624, language: 'it-IT' });
  assert.ok(offlinePerson instanceof Person, 'Offline getPersonProfile must return Person instance');
  assert.equal(offlinePerson.name, 'Stan Lee');
  console.log(`Offline Person recuperato: "${offlinePerson.name}" (${offlinePerson.getProfileUrl('it')})`);

  // 4. API ERROR FALLBACK TEST (ONLINE BUT NETWORK FAILS)
  divider('4. FALLBACK SU ERRORE DI RETE: Connessione attiva ma chiamata API fallisce');
  BaseRepository.setGlobalOnlineOverride(true);

  const failingMovieBackend = {
    getMovieDetails: async () => {
      throw new Error('Simulated 503 Service Unavailable');
    }
  };
  const resilientMovieRepo = new MovieRepository(/** @type {any} */ (failingMovieBackend), storage);
  const fallbackMovie = await resilientMovieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.ok(fallbackMovie instanceof Movie, 'Fallback on API error must return Movie instance from IndexedDB');
  assert.equal(fallbackMovie.title, movieDetails.title);
  console.log(`Fallback su errore API riuscito: recuperato "${fallbackMovie.title}" da IndexedDB`);

  // 5. OFFLINE MISS ERROR TEST
  divider('5. GESTIONE CACHE MISS IN ASSENZA DI RETE');
  BaseRepository.setGlobalOnlineOverride(false);
  await assert.rejects(
    () => movieRepo.getMovieDetails({ movieId: 99999999, language: 'it-IT' }),
    /Connettività assente/,
    'Uncached entity when offline must throw clear error'
  );
  console.log('Cache miss offline gestito correttamente con eccezione controllata.');

  // 6. USER REPOSITORY TEST (FIRESTORE + INDEXEDDB + SOCIAL + NOTIFICATIONS + REVIEWS + MEDIA RESOLUTION)
  divider('6. USER REPOSITORY: Rete Sociale, Notifiche, Recensioni/Like e Risoluzione ID Media');
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

  const customUserBackend = new UserBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const customNotificationBackend = new NotificationBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const customSocialBackend = new SocialBackend(/** @type {any} */ ({}), mockFirestoreAdapter, customNotificationBackend);
  const customReviewBackend = new ReviewBackend(/** @type {any} */ ({}), mockFirestoreAdapter, customNotificationBackend);

  const socialRepo = new SocialRepository(customSocialBackend, customUserBackend, storage);
  const notificationRepo = new NotificationRepository(customNotificationBackend, storage);
  const reviewRepo = new ReviewRepository(customReviewBackend, customUserBackend, storage);

  const userRepo = new UserRepository(customUserBackend, storage, {
    seriesRepository: seriesRepo,
    movieRepository: movieRepo,
    socialRepository: socialRepo,
    notificationRepository: notificationRepo,
    reviewRepository: reviewRepo
  });

  // Online Login & Save Users
  BaseRepository.setGlobalOnlineOverride(true);
  const loggedUser = await userRepo.saveUser(
    { uid: 'uid_test_1', email: 'lorenzo@example.com', photoURL: 'https://example.com/avatar.png' },
    'lorenzo_cameos'
  );
  const secondUser = await userRepo.saveUser(
    { uid: 'uid_friend_2', email: 'marco@example.com', photoURL: 'https://example.com/marco.png' },
    'marco_cinema'
  );
  const thirdUser = await userRepo.saveUser(
    { uid: 'uid_friend_3', email: 'giulia@example.com', photoURL: 'https://example.com/giulia.png' },
    'giulia_series'
  );
  assert.ok(loggedUser instanceof User, 'saveUser must return User domain instance');
  assert.ok(secondUser instanceof User, 'secondUser must be User domain instance');
  assert.ok(thirdUser instanceof User, 'thirdUser must be User domain instance');
  console.log(`Utenti salvati su Firestore e IndexedDB: ${loggedUser.username}, ${secondUser.username}, ${thirdUser.username}`);

  // Lightweight Media Preferences (only IDs/keys stored in User, no full Movie/Series objects)
  await userRepo.updateLanguage('uid_test_1', 'it-IT');
  await userRepo.addToWatchlist('uid_test_1', movieDetails);
  await userRepo.addToFavorites('uid_test_1', seriesDetails);
  await userRepo.addToWatched('uid_test_1', { mediaType: 'season', mediaId: 1418, seasonNumber: 3 });
  const updatedUserAfterPrefs = await userRepo.addToWatched('uid_test_1', {
    mediaType: 'episode',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16
  });

  assert.equal(updatedUserAfterPrefs.watchlist.length, 1);
  assert.equal(updatedUserAfterPrefs.watchlist[0].targetKey, 'movie:299534');
  assert.equal(updatedUserAfterPrefs.watchlist[0].title, undefined, 'Full Movie payload must not be stored in User.watchlist');
  assert.equal(updatedUserAfterPrefs.favorites[0].targetKey, 'tv:1418');
  assert.equal(updatedUserAfterPrefs.favorites[0].name, undefined, 'Full Series payload must not be stored in User.favorites');
  assert.equal(updatedUserAfterPrefs.watched.length, 2);

  // On-demand hydration of lightweight IDs into full Domain Models
  const hydratedWatchlist = await userRepo.resolveUserMediaList(updatedUserAfterPrefs.watchlist, 'it-IT');
  assert.ok(hydratedWatchlist[0] instanceof Movie, 'Resolved movie reference must be Movie instance');
  assert.equal(hydratedWatchlist[0].id, 299534);

  const hydratedWatched = await userRepo.resolveUserMediaList(updatedUserAfterPrefs.watched, 'it-IT');
  assert.ok(hydratedWatched[0] instanceof Season, 'Resolved season reference must be Season instance');
  assert.ok(hydratedWatched[1] instanceof Episode, 'Resolved episode reference must be Episode instance');
  console.log('Riferimenti leggeri salvati e risolti on-demand in oggetti Movie, Series, Season ed Episode.');

  // Social Network: Friend Requests (Pending collection, duplicate check, accept, reject)
  const sentReq = await userRepo.sendFriendRequest('uid_test_1', 'uid_friend_2');
  assert.ok(sentReq instanceof FriendRequest, 'sendFriendRequest must return FriendRequest instance');
  assert.equal(sentReq.id, 'uid_test_1_uid_friend_2');

  // Duplicate request prevention (same direction or reverse pending)
  await assert.rejects(
    () => userRepo.sendFriendRequest('uid_test_1', 'uid_friend_2'),
    /already pending/,
    'Duplicate friend request must be rejected'
  );
  await assert.rejects(
    () => userRepo.sendFriendRequest('uid_friend_2', 'uid_test_1'),
    /already sent you a pending/,
    'Reverse duplicate friend request must be rejected'
  );

  const incomingForMarco = await userRepo.getIncomingFriendRequests('uid_friend_2');
  assert.equal(incomingForMarco.length, 1, 'Recipient must see 1 incoming request');

  // Accept friend request -> adds UIDs to both users' friends list and deletes pending document
  const acceptedRecipient = await userRepo.acceptFriendRequest(sentReq.id, 'uid_friend_2');
  const updatedSenderAfterAccept = await userRepo.getUser('uid_test_1');
  assert.ok(acceptedRecipient.friends.includes('uid_test_1'), 'Recipient friends list must include sender UID');
  assert.ok(updatedSenderAfterAccept.friends.includes('uid_friend_2'), 'Sender friends list must include recipient UID');
  assert.equal(
    mockFirestoreDocs.get('friend_requests:uid_test_1_uid_friend_2'),
    undefined,
    'Accepted request must be deleted from friend_requests collection'
  );

  // Reject friend request flow with third user
  const reqToGiulia = await userRepo.sendFriendRequest('uid_test_1', 'uid_friend_3');
  await userRepo.rejectFriendRequest(reqToGiulia.id, 'uid_friend_3');
  assert.equal(
    mockFirestoreDocs.get('friend_requests:uid_test_1_uid_friend_3'),
    undefined,
    'Rejected request must be deleted from friend_requests collection'
  );

  // Resolve friends UIDs to User domain profiles
  const friendsProfiles = await userRepo.getFriendsProfiles('uid_test_1');
  assert.equal(friendsProfiles.length, 1);
  assert.ok(friendsProfiles[0] instanceof User);
  assert.equal(friendsProfiles[0].uid, 'uid_friend_2');
  console.log('Flusso richieste amicizia (invio, blocco duplicati, accettazione, rifiuto, eliminazione pending) verificato.');

  // Reviews, Ratings & Likes on Movie, Series, Season, Episode
  const { review: movieReview } = await userRepo.saveReview('uid_test_1', {
    mediaType: 'movie',
    mediaId: 299534,
    rating: 9,
    text: 'Finale epico!',
    liked: true
  });
  assert.ok(movieReview instanceof Review, 'saveReview must return Review domain model');
  assert.equal(movieReview.targetKey, 'movie:299534');

  const { review: episodeReview } = await userRepo.saveReview('uid_test_1', {
    mediaType: 'episode',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    rating: 10,
    text: 'Cameo di Stan Lee leggendario!',
    liked: true
  });
  assert.equal(episodeReview.targetKey, 'episode:1418:3:16');

  // Friend likes user's review -> triggers notification to author
  const likedReview = await userRepo.toggleReviewLike(episodeReview.id, 'uid_friend_2');
  assert.equal(likedReview.likesCount, 1);
  assert.ok(likedReview.likes.includes('uid_friend_2'));

  const mediaStats = await userRepo.getMediaStats({ mediaType: 'episode', mediaId: 1418, seasonNumber: 3, episodeNumber: 16 });
  assert.ok(mediaStats instanceof MediaStats, 'getMediaStats must return MediaStats domain model');
  assert.equal(mediaStats.averageRating, 10);
  assert.equal(mediaStats.likesCount, 1);
  assert.equal(mediaStats.watchedCount, 1);
  console.log(`Recensioni e MediaStats verificate (Episode stats: avg=${mediaStats.averageRating}, likes=${mediaStats.likesCount}, watched=${mediaStats.watchedCount}).`);

  // Notifications verification (friend request accepted + review liked)
  const lorenzoNotifications = await userRepo.getUserNotifications('uid_test_1');
  assert.ok(lorenzoNotifications.length >= 2, 'User must have received notifications for friend accept and review like');
  assert.ok(lorenzoNotifications[0] instanceof Notification, 'Notifications must be Notification instances');
  await userRepo.markAllNotificationsAsRead('uid_test_1');
  const readNotifications = await userRepo.getUserNotifications('uid_test_1', { unreadOnly: true });
  assert.equal(readNotifications.length, 0, 'All notifications must be marked as read');
  console.log(`Sistema notifiche verificato (${lorenzoNotifications.length} notifiche ricevute e segnate come lette).`);

  // Offline Mode: Autologin Session + Offline Profile Updates (pendingSync = true)
  BaseRepository.setGlobalOnlineOverride(false);
  const autologinOfflineUser = await userRepo.getSessionUser('uid_test_1');
  assert.ok(autologinOfflineUser instanceof User, 'Offline getSessionUser must return User instance');
  assert.equal(autologinOfflineUser.username, 'lorenzo_cameos');

  const offlineModifiedUser = await userRepo.addToWatchlist('uid_test_1', {
    id: 550,
    mediaType: 'movie'
  });
  assert.equal(offlineModifiedUser.watchlist.length, 2, 'Offline watchlist update must persist in IndexedDB');

  const localUserRecord = await storage.get(STORES.USERS, 'user:uid_test_1');
  assert.equal(localUserRecord.pendingSync, true, 'Offline update must flag pendingSync: true in IndexedDB');
  assert.equal(mockFirestoreDocs.get('users:uid_test_1').watchlist.length, 1, 'Firestore not yet updated while offline');

  // Back Online -> Auto-sync pending changes to Firestore
  BaseRepository.setGlobalOnlineOverride(true);
  const syncedUser = await userRepo.getUser('uid_test_1');
  assert.equal(syncedUser.watchlist.length, 2, 'Synced user must have 2 watchlist items');
  assert.equal(mockFirestoreDocs.get('users:uid_test_1').watchlist.length, 2, 'Firestore must receive synced offline changes');
  const postSyncRecord = await storage.get(STORES.USERS, 'user:uid_test_1');
  assert.equal(postSyncRecord.pendingSync, false, 'pendingSync must be reset to false after sync');
  console.log('Riconnessione rilevata: modifiche offline sincronizzate automaticamente su Firestore (pendingSync=false).');

  BaseRepository.setGlobalOnlineOverride(null);
  storage.close();

  divider('TUTTI I TEST DEL PACKAGE REPOSITORY COMPLETATI CON SUCCESSO!');
}

main().catch((err) => {
  console.error('Errore durante i test repository:', err);
  process.exit(1);
});
