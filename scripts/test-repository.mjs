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
  UserRepository
} from '../src/repository/index.js';
import { UserBackend } from '../src/backend/user/UserBackend.js';
import { User, Series, Season, Episode, Movie, Person, Cameo } from '../src/models/index.js';

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
  const storage = new IndexedDBService({ dbName: 'cameos_test_db', dbVersion: 1, idbFactory });
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

  // Episode 16 was cached both via getSeasonDetails and getEpisodeCameos -> test offline getEpisodeDetails
  const offlineEpisode = await seriesRepo.getEpisodeDetails({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  assert.ok(offlineEpisode instanceof Episode, 'Offline getEpisodeDetails must return Episode instance');
  console.log(`Offline Episode recuperato: "${offlineEpisode.name}" (Still URL: ${offlineEpisode.getStillUrl('it')})`);

  const offlineMovie = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.ok(offlineMovie instanceof Movie, 'Offline getMovieDetails must return Movie instance');
  assert.equal(offlineMovie.title, movieDetails.title);
  assert.ok(offlineMovie.getPosterUrl('it').startsWith('https://image.tmdb.org/'), 'Offline Movie posterUrl IT must be preserved');
  assert.ok(offlineMovie.getPosterUrl('en').startsWith('https://image.tmdb.org/'), 'Offline Movie posterUrl EN must be preserved');
  console.log(`Offline Movie recuperato: "${offlineMovie.title}" | Poster EN: ${offlineMovie.getPosterUrl('en')}`);

  // Offline local search fallback on cached entities
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

  // 6. USER REPOSITORY TEST (FIRESTORE + INDEXEDDB + OFFLINE SYNC & AUTOLOGIN)
  divider('6. USER REPOSITORY: Persistenza Remota (Firestore) + Locale (IndexedDB) + Sync Offline');
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

  const customUserBackend = new UserBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const userRepo = new UserRepository(customUserBackend, storage);

  // Online Login & Save User
  BaseRepository.setGlobalOnlineOverride(true);
  const loggedUser = await userRepo.saveUser(
    { uid: 'uid_test_1', email: 'lorenzo@example.com', photoURL: 'https://example.com/avatar.png' },
    'lorenzo_cameos'
  );
  assert.ok(loggedUser instanceof User, 'saveUser must return User domain instance');
  assert.equal(loggedUser.username, 'lorenzo_cameos');
  assert.equal(loggedUser.language, 'it-IT');
  console.log(`Utente salvato su Firestore e IndexedDB: ${loggedUser.username} (${loggedUser.email})`);

  // Online Updates: language, watchlist, favorites, watched, reviews, friends
  await userRepo.updateLanguage('uid_test_1', 'en-US');
  await userRepo.addToWatchlist('uid_test_1', { id: 299534, title: 'Avengers: Endgame', mediaType: 'movie' });
  await userRepo.addToFavorites('uid_test_1', { id: 1418, name: 'The Big Bang Theory', mediaType: 'tv' });
  await userRepo.addToWatched('uid_test_1', { id: 1396, name: 'Breaking Bad', mediaType: 'tv' });
  await userRepo.addReview('uid_test_1', { id: 'rev_1', mediaId: 299534, rating: 5, text: 'Capolavoro!' });
  const updatedOnlineUser = await userRepo.addFriend('uid_test_1', { uid: 'uid_friend_2', username: 'marco' });

  assert.equal(updatedOnlineUser.language, 'en-US');
  assert.equal(updatedOnlineUser.watchlist.length, 1);
  assert.equal(updatedOnlineUser.favorites.length, 1);
  assert.equal(updatedOnlineUser.watched.length, 1);
  assert.equal(updatedOnlineUser.reviews.length, 1);
  assert.equal(updatedOnlineUser.friends.length, 1);
  console.log('Collezioni utente aggiornate online (watchlist, favorites, watched, reviews, friends, language).');

  // Offline Mode: Autologin Session + Offline Profile Updates (pendingSync = true)
  BaseRepository.setGlobalOnlineOverride(false);
  const autologinOfflineUser = await userRepo.getSessionUser('uid_test_1');
  assert.ok(autologinOfflineUser instanceof User, 'Offline getSessionUser must return User instance');
  assert.equal(autologinOfflineUser.username, 'lorenzo_cameos');
  console.log(`Autologin offline recuperato da IndexedDB: ${autologinOfflineUser.username}`);

  const offlineModifiedUser = await userRepo.addToWatchlist('uid_test_1', {
    id: 550,
    title: 'Fight Club',
    mediaType: 'movie'
  });
  assert.equal(offlineModifiedUser.watchlist.length, 2, 'Offline watchlist update must persist in IndexedDB');

  const localUserRecord = await storage.get(STORES.USERS, 'user:uid_test_1');
  assert.equal(localUserRecord.pendingSync, true, 'Offline update must flag pendingSync: true in IndexedDB');
  assert.equal(mockFirestoreDocs.get('uid_test_1').watchlist.length, 1, 'Firestore not yet updated while offline');
  console.log('Modifica utente effettuata offline salvata in IndexedDB con pendingSync=true.');

  // Back Online -> Auto-sync pending changes to Firestore
  BaseRepository.setGlobalOnlineOverride(true);
  const syncedUser = await userRepo.getUser('uid_test_1');
  assert.equal(syncedUser.watchlist.length, 2, 'Synced user must have 2 watchlist items');
  assert.equal(mockFirestoreDocs.get('uid_test_1').watchlist.length, 2, 'Firestore must receive synced offline changes');
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
