import process from 'node:process';
import assert from 'node:assert/strict';
try {
  process.loadEnvFile('.env');
} catch {
  // Ignora se .env non presente
}

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
  SeriesViewModel,
  MovieViewModel,
  CameoViewModel,
  PersonViewModel,
  HomeViewModel,
  UserViewModel,
  SocialViewModel,
  NotificationViewModel,
  ReviewViewModel
} from '../src/viewmodel/index.js';

import { Series, Season, Episode, Movie, Person, Cameo, User } from '../src/models/index.js';

function divider(title) {
  console.log('\n' + '='.repeat(75));
  console.log(`[TEST ARCHITETTURA & CONTRATTI UI] ${title}`);
  console.log('='.repeat(75));
}

function printContract(name, sampleObject) {
  console.log(`\n--- CONTRATTO UI: ${name} ---`);
  console.log(JSON.stringify(sampleObject, null, 2));
}

async function main() {
  console.log('=== AVVIO TEST SITUAZIONI LIMITE E ISPEZIONE CONTRATTI UI ===');

  const storage = new IndexedDBService({ dbName: 'cameos_edge_test_db' });
  const seriesRepo = new SeriesRepository(undefined, storage);
  const movieRepo = new MovieRepository(undefined, storage);
  const cameoRepo = new CameoRepository(undefined, storage);
  const personRepo = new PersonRepository(undefined, storage);

  // In-memory Firestore Adapter per test isolati e deterministici
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
  const notifBackend = new NotificationBackend(/** @type {any} */ ({}), mockFirestoreAdapter);
  const socialBackend = new SocialBackend(/** @type {any} */ ({}), mockFirestoreAdapter, notifBackend);
  const reviewBackend = new ReviewBackend(/** @type {any} */ ({}), mockFirestoreAdapter, notifBackend);

  const socialRepo = new SocialRepository(socialBackend, userBackend, storage);
  const notifRepo = new NotificationRepository(notifBackend, storage);
  const reviewRepo = new ReviewRepository(reviewBackend, userBackend, storage);
  const userRepo = new UserRepository(userBackend, storage, {
    seriesRepository: seriesRepo,
    movieRepository: movieRepo,
    socialRepository: socialRepo,
    notificationRepository: notifRepo,
    reviewRepository: reviewRepo
  });

  // =========================================================================
  // FASE 1: TEST SITUAZIONI LIMITE (EDGE CASES E ROBUSTEZZA ARCHITETTURA)
  // =========================================================================

  // 1.1 Cache Miss offline
  divider('1.1 Situazione Limite: Cache Miss Offline genera errore controllato');
  BaseRepository.setGlobalOnlineOverride(false);
  await assert.rejects(
    () => movieRepo.getMovieDetails({ movieId: 99999999, language: 'it-IT' }),
    /Connettività assente e nessun dato locale/,
    'Tentativo di accesso a record non presente in cache offline deve lanciare eccezione controllata'
  );
  console.log('✓ Cache miss offline gestito correttamente con eccezione controllata.');

  // 1.2 Fallback su lingua secondaria tramite indice
  divider('1.2 Situazione Limite: Fallback Cross-Language tramite Indice Secondario');
  BaseRepository.setGlobalOnlineOverride(true);
  const movieIT = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.equal(movieIT.id, 299534);

  // Passa offline e richiedi film in lingua mai scaricata (en-US)
  BaseRepository.setGlobalOnlineOverride(false);
  const crossLangMovie = await movieRepo.getMovieDetails({ movieId: 299534, language: 'en-US' });
  assert.ok(crossLangMovie instanceof Movie, 'Deve recuperare il record presente tramite indice secondario id');
  assert.equal(crossLangMovie.id, 299534);
  console.log(`✓ Richiesta lingua "en-US" offline recuperata tramite indice ID della lingua "it-IT": "${crossLangMovie.title}"`);

  // 1.3 Protezione da sovrascrittura di record completi con card sintetiche
  divider('1.3 Situazione Limite: Protezione Record Completi (isComplete: true) da Card di Liste');
  BaseRepository.setGlobalOnlineOverride(true);
  const fullSeries = await seriesRepo.getSeriesDetails({ seriesId: 1418, language: 'it-IT' });
  assert.equal(fullSeries.isComplete, true);
  assert.ok(fullSeries.seasons.length > 0, 'Record completo deve contenere le stagioni');

  // Simula ricezione di una lista discover contenente la stessa serie (ma senza stagioni)
  await seriesRepo.discoverSeries({ page: 1, language: 'it-IT' });
  const checkStored = await storage.get(STORES.SERIES, 'series:1418:it-IT');
  assert.equal(checkStored.isComplete, true, 'isComplete deve rimanere true');
  assert.ok(checkStored.data.seasons.length > 0, 'Le stagioni complete non devono essere state sovrascritte');
  console.log('✓ Protezione isComplete verificata: card sintetica di lista non sovrascrive dettagli completi.');

  // 1.4 Fallback su Errore 5xx del Server Remoto
  divider('1.4 Situazione Limite: Fallback su Errore HTTP 5xx / Network Error');
  const failingBackend = {
    getMovieDetails: async () => {
      throw new Error('500 Internal Server Error: TMDB Service Down');
    }
  };
  const resilientMovieRepo = new MovieRepository(/** @type {any} */ (failingBackend), storage);
  const recoveredFromDb = await resilientMovieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  assert.ok(recoveredFromDb instanceof Movie);
  assert.equal(recoveredFromDb.id, 299534);
  console.log(`✓ Errore 500 simulato: recuperato film "${recoveredFromDb.title}" da IndexedDB.`);

  // 1.5 Stale Response Guard / Race Condition nei ViewModel
  divider('1.5 Situazione Limite: Risoluzione Race Condition nei ViewModel (Stale Response Guard)');
  const movieVm = new MovieViewModel(movieRepo, { language: 'it-IT' });

  // Simula due ricerche concorrenti dove la prima risponde più lentamente della seconda
  let slowResolve;
  const delayedSlowTask = new Promise((resolve) => {
    slowResolve = resolve;
  });

  const customSlowRepo = {
    searchMovies: async ({ query }) => {
      if (query === 'Lento') {
        await delayedSlowTask;
        return { results: [new Movie({ id: 1, title: 'Risultato Lento' })], total_pages: 1, total_results: 1 };
      }
      return { results: [new Movie({ id: 2, title: 'Risultato Rapido' })], total_pages: 1, total_results: 1 };
    }
  };

  const raceVm = new MovieViewModel(/** @type {any} */ (customSlowRepo), { language: 'it-IT' });
  const p1 = raceVm.searchMovies('Lento');
  const p2 = raceVm.searchMovies('Rapido');

  // Risolvi la chiamata veloce
  await p2;
  assert.equal(raceVm.state.searchResults[0].title, 'Risultato Rapido');

  // Risolvi la chiamata lenta successivamente
  slowResolve();
  await p1;
  assert.equal(raceVm.state.searchResults[0].title, 'Risultato Rapido', 'La risposta lenta obsoleta non deve sovrascrivere lo stato');
  console.log('✓ Stale response guard verificato: chiamate asincrone concorrenti non corrompono lo stato.');

  // 1.6 Validazioni Social: auto-richiesta e duplicati
  divider('1.6 Situazione Limite: Validazioni Social (Auto-Richiesta e Duplicati)');
  await assert.rejects(
    () => socialBackend.sendFriendRequest('user_1', 'user_1'),
    /Cannot send a friend request to yourself/,
    'Auto-richiesta di amicizia deve essere respinta'
  );

  await socialBackend.sendFriendRequest('user_1', 'user_2');
  await assert.rejects(
    () => socialBackend.sendFriendRequest('user_1', 'user_2'),
    /Friend request already pending/,
    'Richiesta duplicata deve essere respinta'
  );
  await assert.rejects(
    () => socialBackend.sendFriendRequest('user_2', 'user_1'),
    /already sent you a pending/,
    'Richiesta inversa con pending attivo deve essere respinta'
  );
  console.log('✓ Validazioni anti-duplicato e auto-amicizia verificate con successo.');

  // 1.7 Ciclo di Vita Offline Write -> Sincronizzazione al Rientro Online
  divider('1.7 Situazione Limite: Modifiche Offline (pendingSync=true) e Riconnessione');
  BaseRepository.setGlobalOnlineOverride(true);
  const user = await userRepo.saveUser({ uid: 'sync_user', email: 'sync@cameos.app' }, 'sync_user');
  assert.ok(user instanceof User);

  // Vai offline e modifica preferenze
  BaseRepository.setGlobalOnlineOverride(false);
  const offlineModified = await userRepo.addToWatchlist('sync_user', { id: 550, mediaType: 'movie' });
  assert.equal(offlineModified.watchlist.length, 1);

  const localRecord = await storage.get(STORES.USERS, 'user:sync_user');
  assert.equal(localRecord.pendingSync, true, 'pendingSync deve essere true offline');
  assert.equal((mockFirestoreDocs.get('users:sync_user')?.watchlist || []).length, 0, 'Firestore ancora invariato');

  // Torna online e recupera utente -> sync automatico
  BaseRepository.setGlobalOnlineOverride(true);
  const syncedUser = await userRepo.getUser('sync_user');
  assert.equal(syncedUser.watchlist.length, 1);
  assert.equal(mockFirestoreDocs.get('users:sync_user').watchlist.length, 1, 'Firestore sincronizzato');

  const postSyncLocal = await storage.get(STORES.USERS, 'user:sync_user');
  assert.equal(postSyncLocal.pendingSync, false, 'pendingSync deve tornare false dopo sync');
  console.log('✓ Sincronizzazione riconnessione verificata: modifiche offline riversate su Firestore con pendingSync=false.');

  // =========================================================================
  // FASE 2: ISPEZIONE DEI CONTRATTI DI RITORNO PER LA UI DEI COMPONENTI JSX
  // =========================================================================

  divider('FASE 2: ISPEZIONE SCHEMI E CONTRATTI DEGLI OGGETTI RESTITUITI ALLA UI');

  // 2.1 Contratto Dettaglio Serie, Stagione ed Episodio
  const seriesDetails = await seriesRepo.getSeriesDetails({ seriesId: 1418, language: 'it-IT' });
  const seasonDetails = await seriesRepo.getSeasonDetails({ seriesId: 1418, seasonNumber: 3, language: 'it-IT' });
  const episodeDetails = await seriesRepo.getEpisodeDetails({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });

  printContract('Series (Dettaglio Serie TV)', {
    id: seriesDetails.id,
    name: seriesDetails.name,
    overview: seriesDetails.overview.slice(0, 60) + '...',
    firstAirDate: seriesDetails.firstAirDate,
    numberOfSeasons: seriesDetails.numberOfSeasons,
    numberOfEpisodes: seriesDetails.numberOfEpisodes,
    posterUrl: { it: seriesDetails.getPosterUrl('it'), en: seriesDetails.getPosterUrl('en') },
    backdropUrl: { it: seriesDetails.getBackdropUrl('it'), en: seriesDetails.getBackdropUrl('en') },
    voteAverage: seriesDetails.voteAverage,
    isComplete: seriesDetails.isComplete
  });

  printContract('Season (Dettaglio Stagione con Episodi)', {
    id: seasonDetails.id,
    seriesId: seasonDetails.seriesId,
    seasonNumber: seasonDetails.seasonNumber,
    name: seasonDetails.name,
    episodeCount: seasonDetails.episodeCount,
    posterUrl: { it: seasonDetails.getPosterUrl('it'), en: seasonDetails.getPosterUrl('en') },
    firstEpisodeSample: {
      id: seasonDetails.episodes[0]?.id,
      episodeNumber: seasonDetails.episodes[0]?.episodeNumber,
      name: seasonDetails.episodes[0]?.name,
      stillUrl: seasonDetails.episodes[0]?.getStillUrl('it')
    }
  });

  printContract('Episode (Dettaglio Singolo Episodio)', {
    id: episodeDetails.id,
    seriesId: episodeDetails.seriesId,
    seasonNumber: episodeDetails.seasonNumber,
    episodeNumber: episodeDetails.episodeNumber,
    name: episodeDetails.name,
    runtime: episodeDetails.runtime,
    stillUrl: episodeDetails.getStillUrl('it'),
    voteAverage: episodeDetails.voteAverage
  });

  // 2.2 Contratto Dettaglio Film
  const movieDetails = await movieRepo.getMovieDetails({ movieId: 299534, language: 'it-IT' });
  printContract('Movie (Dettaglio Film)', {
    id: movieDetails.id,
    title: movieDetails.title,
    originalTitle: movieDetails.originalTitle,
    releaseDate: movieDetails.releaseDate,
    runtime: movieDetails.runtime,
    overview: movieDetails.overview.slice(0, 60) + '...',
    posterUrl: { it: movieDetails.getPosterUrl('it'), en: movieDetails.getPosterUrl('en') },
    backdropUrl: { it: movieDetails.getBackdropUrl('it'), en: movieDetails.getBackdropUrl('en') },
    voteAverage: movieDetails.voteAverage,
    isComplete: movieDetails.isComplete
  });

  // 2.3 Contratto Camei (Episodio e Film)
  const episodeCameos = await cameoRepo.getEpisodeCameos({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  const movieCameos = await cameoRepo.getMovieCameos({ movieId: 299534, language: 'it-IT' });

  printContract('Cameo (Singolo Cameo in Episodio TV)', {
    id: episodeCameos.cameos[0]?.id,
    name: episodeCameos.cameos[0]?.name,
    character: episodeCameos.cameos[0]?.character,
    cameoBadge: episodeCameos.cameos[0]?.cameoBadge,
    isCameoHighlight: episodeCameos.cameos[0]?.isCameoHighlight,
    isVoiceActor: episodeCameos.cameos[0]?.isVoiceActor,
    profileUrl: episodeCameos.cameos[0]?.getProfileUrl('it')
  });

  printContract('Cameos in Movie (Campione Cameo in Film)', {
    totalCameosFound: movieCameos.cameos.length,
    sampleCameo: {
      name: movieCameos.cameos[0]?.name,
      character: movieCameos.cameos[0]?.character,
      cameoBadge: movieCameos.cameos[0]?.cameoBadge,
      order: movieCameos.cameos[0]?.order
    }
  });

  // 2.4 Contratto Scheda Attore e Filmografia
  const personProfile = await personRepo.getPersonProfile({ personId: 7624, language: 'it-IT' });
  const filmography = await personRepo.getPersonFilmography({ personId: 7624, mediaType: 'all', language: 'it-IT' });

  printContract('Person (Scheda Attore)', {
    id: personProfile.id,
    name: personProfile.name,
    birthday: personProfile.birthday,
    placeOfBirth: personProfile.placeOfBirth,
    knownForDepartment: personProfile.knownForDepartment,
    profileUrl: personProfile.getProfileUrl('it')
  });

  printContract('Filmography (Campione Filmografia Attore)', {
    totalRoles: filmography.cast.length,
    sampleRole: {
      name: filmography.cast[0]?.name || filmography.cast[0]?.title,
      character: filmography.cast[0]?.character,
      media_type: filmography.cast[0]?.media_type,
      first_air_date: filmography.cast[0]?.first_air_date
    }
  });

  // 2.5 Contratto Home Feed Aggregato (HomeViewModel)
  const homeVm = new HomeViewModel({ movieRepository: movieRepo, seriesRepository: seriesRepo, cameoRepository: cameoRepo }, { language: 'it-IT' });
  await homeVm.loadHomeFeed({ timeWindow: 'month' });

  printContract('Home Feed Snapshot (HomeViewModel.state)', {
    featuredMovie: homeVm.state.featuredMovie ? { id: homeVm.state.featuredMovie.id, title: homeVm.state.featuredMovie.title } : null,
    trendingMoviesCount: homeVm.state.trendingMovies.length,
    trendingSeriesCount: homeVm.state.trendingSeries.length,
    cameoHeavyMoviesCount: homeVm.state.cameoHeavyMovies.length,
    cameoHeavySeriesCount: homeVm.state.cameoHeavySeries.length,
    isOffline: homeVm.state.isOffline,
    loading: homeVm.state.loading
  });

  // 2.6 Contratto Utente, Social, Notifiche e Recensioni
  const reviewResult = await reviewRepo.saveReview('sync_user', {
    mediaType: 'movie',
    mediaId: 299534,
    rating: 9.5,
    text: 'Recensione test per verifica contratto UI',
    liked: true
  });

  const mediaStats = await reviewRepo.getMediaStats({ mediaType: 'movie', mediaId: 299534 });
  const notifications = await notifRepo.getUserNotifications('user_2');

  printContract('Review (Recensione utente)', {
    id: reviewResult.review.id,
    uid: reviewResult.review.uid,
    targetKey: reviewResult.review.targetKey,
    rating: reviewResult.review.rating,
    text: reviewResult.review.text,
    liked: reviewResult.review.liked,
    likesCount: reviewResult.review.likesCount,
    createdAt: reviewResult.review.createdAt
  });

  printContract('MediaStats (Statistiche Community)', {
    targetKey: mediaStats.targetKey,
    ratingCount: mediaStats.ratingCount,
    ratingSum: mediaStats.ratingSum,
    averageRating: mediaStats.averageRating,
    likesCount: mediaStats.likesCount,
    watchlistedCount: mediaStats.watchlistCount
  });

  printContract('Notification (Notifica Utente)', {
    id: notifications[0]?.id,
    recipientUid: notifications[0]?.recipientUid,
    type: notifications[0]?.type,
    title: notifications[0]?.title,
    message: notifications[0]?.message,
    read: notifications[0]?.read,
    createdAt: notifications[0]?.createdAt
  });

  storage.close();
  divider('TUTTI I TEST LIMITE E I CONTRATTI UI COMPLETATI CON SUCCESSO!');
}

main().catch((err) => {
  console.error('Errore durante i test di robustezza:', err);
  process.exit(1);
});
