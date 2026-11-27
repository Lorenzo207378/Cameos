import assert from 'node:assert/strict';
import test from 'node:test';
import {
  UserViewModel,
  PROFILE_COLLECTION_KEYS,
  filterByMediaType
} from '../src/viewmodel/user/UserViewModel.js';
import { UserRepository } from '../src/repository/user/UserRepository.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';
import { User } from '../src/models/User.js';
import { APP_ROUTES } from '../src/utils/appRoutes.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('Domain models expose canonical mediaType and filterByMediaType filters models and raw refs', () => {
  const movie = new Movie({ id: 10, title: 'Film' });
  const series = new Series({ id: 20, name: 'Serie' });
  const season = new Season({ id: 30, seriesId: 20, seasonNumber: 1 });
  const episode = new Episode({ id: 40, seriesId: 20, seasonNumber: 1, episodeNumber: 2 });

  assert.equal(movie.mediaType, 'movie');
  assert.equal(series.mediaType, 'tv');
  assert.equal(season.mediaType, 'season');
  assert.equal(episode.mediaType, 'episode');

  const mixed = [movie, series, season, episode];
  assert.equal(filterByMediaType(mixed, 'all').length, 4);
  assert.deepEqual(filterByMediaType(mixed, 'movie'), [movie]);
  assert.deepEqual(filterByMediaType(mixed, 'tv'), [series]);
  assert.deepEqual(filterByMediaType(mixed, 'season'), [season]);
  assert.deepEqual(filterByMediaType(mixed, 'episode'), [episode]);

  const rawRefs = [
    { mediaType: 'movie', mediaId: 10 },
    { mediaType: 'episode', mediaId: 20, seasonNumber: 1, episodeNumber: 2 }
  ];
  assert.equal(filterByMediaType(rawRefs, 'episode').length, 1);
  assert.equal(filterByMediaType(rawRefs, 'season').length, 0);
});

test('PROFILE_COLLECTION_KEYS and APP_ROUTES.profileCollectionOf enforce canonical slugs and optional ?type=', () => {
  assert.deepEqual([...PROFILE_COLLECTION_KEYS], ['watchlist', 'favorites', 'watched']);
  assert.equal(PROFILE_COLLECTION_KEYS.includes(/** @type {any} */ ('voted')), false);
  assert.equal(PROFILE_COLLECTION_KEYS.includes(/** @type {any} */ ('favourites')), false);
  assert.equal(PROFILE_COLLECTION_KEYS.includes(/** @type {any} */ ('constructor')), false);

  assert.equal(APP_ROUTES.profileCollectionOf('watchlist'), '/Cameos/profile/collection/watchlist');
  assert.equal(APP_ROUTES.profileCollectionOf('favourites'), '/Cameos/profile/collection/favorites');
  assert.equal(APP_ROUTES.profileCollectionOf('watchlist', undefined, 'all'), '/Cameos/profile/collection/watchlist');
  assert.equal(APP_ROUTES.profileCollectionOf('watchlist', undefined, 'episode'), '/Cameos/profile/collection/watchlist?type=episode');
  assert.equal(APP_ROUTES.profileCollectionOf('watched', 'u_friend', 'season'), '/Cameos/profile/u_friend/collection/watched?type=season');
});

test('UserViewModel.loadProfile reuses loaded state across routes, forces refresh on retry, and guards stale requests', async () => {
  let getUserCalls = 0;
  let resolveCalls = 0;
  const movie = new Movie({ id: 10, title: 'Matrix' });

  const userA = new User({
    uid: 'u_a',
    username: 'Alice',
    watchlist: [{ mediaType: 'movie', mediaId: 10 }]
  });
  const userB = new User({
    uid: 'u_b',
    username: 'Bob',
    watchlist: [{ mediaType: 'movie', mediaId: 10 }]
  });

  const vm = new UserViewModel(/** @type {any} */ ({
    getUser: async (uid) => {
      getUserCalls += 1;
      return uid === 'u_a' ? userA : userB;
    },
    resolveUserMediaList: async () => {
      resolveCalls += 1;
      return [movie];
    }
  }), { language: 'it-IT' });

  await vm.loadProfile('u_a');
  assert.equal(vm.state.loadedUid, 'u_a');
  assert.equal(vm.state.resolvedWatchlist.length, 1);
  assert.equal(getUserCalls, 1);
  assert.equal(resolveCalls, 1);

  // Second call for same UID without force must reuse in-memory state (0 extra calls)
  await vm.loadProfile('u_a');
  assert.equal(getUserCalls, 1);
  assert.equal(resolveCalls, 1);

  // Explicit retry with force: true must refetch & rehydrate
  await vm.loadProfile('u_a', { force: true });
  assert.equal(getUserCalls, 2);
  assert.equal(resolveCalls, 2);

  // Rapid profile switch: slow u_slow must not overwrite newer u_fast
  const slowLoad = deferred();
  const fastLoad = deferred();
  const raceVm = new UserViewModel(/** @type {any} */ ({
    getVisitorProfile: (uid) => (uid === 'u_slow' ? slowLoad.promise : fastLoad.promise),
    resolveUserMediaList: async () => [movie]
  }), { language: 'it-IT' });

  const slowRun = raceVm.loadProfile('u_slow', { isVisitor: true });
  const fastRun = raceVm.loadProfile('u_fast', { isVisitor: true });

  fastLoad.resolve(new User({ uid: 'u_fast', username: 'Fast', watchlist: [{ mediaType: 'movie', mediaId: 10 }] }));
  await fastRun;
  assert.equal(raceVm.state.loadedUid, 'u_fast');
  assert.equal(raceVm.state.currentUser?.username, 'Fast');

  slowLoad.resolve(new User({ uid: 'u_slow', username: 'Slow', watchlist: [] }));
  await slowRun;
  assert.equal(raceVm.state.loadedUid, 'u_fast', 'Stale profile load must not overwrite newer loadedUid');
  assert.equal(raceVm.state.currentUser?.uid, 'u_fast', 'Stale profile load must not overwrite newer currentUser');
});

test('UserViewModel.syncFromUser keeps loadedUid on language-only change and invalidates on list swap or UID change', async () => {
  const movie1 = new Movie({ id: 1, title: 'One' });
  const vm = new UserViewModel(/** @type {any} */ ({
    getUser: async () => new User({ uid: 'u1', language: 'en-US', watchlist: [{ mediaType: 'movie', mediaId: 1 }] }),
    resolveUserMediaList: async () => [movie1]
  }), { language: 'it-IT' });

  await vm.loadProfile('u1');
  assert.equal(vm.state.loadedUid, 'u1');
  assert.equal(vm.state.language, 'it-IT', 'loadProfile must preserve active UI language');

  // Language-only update (from LanguageContext -> AuthContext) must NOT invalidate loadedUid
  vm.syncFromUser(new User({
    uid: 'u1',
    language: 'en-US',
    updatedAt: '2026-11-27T12:00:00Z',
    watchlist: [{ mediaType: 'movie', mediaId: 1 }]
  }));
  assert.equal(vm.state.loadedUid, 'u1', 'Language-only profile update must not force re-fetch');

  // Same-length list swap (movie:1 -> movie:2) must invalidate loadedUid
  vm.syncFromUser(new User({
    uid: 'u1',
    language: 'en-US',
    updatedAt: '2026-11-27T12:05:00Z',
    watchlist: [{ mediaType: 'movie', mediaId: 2 }]
  }));
  assert.equal(vm.state.loadedUid, null, 'Replacing an item at the same list length must invalidate loadedUid');

  // Switching UID must clear stale resolved lists
  vm.setState({ loadedUid: 'u1' });
  vm.syncFromUser(new User({ uid: 'u2', watchlist: [] }));
  assert.equal(vm.state.loadedUid, null);
  assert.deepEqual(vm.state.resolvedWatchlist, []);
});

test('UserViewModel.loadProfile handles offline error + retry recovery and missing visitor cleanly', async () => {
  let shouldFail = true;
  const vm = new UserViewModel(/** @type {any} */ ({
    getVisitorProfile: async (uid) => {
      if (uid === 'ghost') return null;
      if (shouldFail) throw new Error('Network error');
      return new User({ uid, username: 'Recovered', watchlist: [] });
    },
    resolveUserMediaList: async () => []
  }), { language: 'it-IT' });

  await vm.loadProfile('u_err', { isVisitor: true });
  assert.equal(vm.state.error, 'Network error');
  assert.equal(vm.state.loadedUid, null, 'Failed load must not mark target as loaded');

  shouldFail = false;
  await vm.loadProfile('u_err', { isVisitor: true, force: true });
  assert.equal(vm.state.error, null);
  assert.equal(vm.state.loadedUid, 'u_err');
  assert.equal(vm.state.currentUser?.username, 'Recovered');

  const missingVm = new UserViewModel(/** @type {any} */ ({
    getVisitorProfile: async () => null,
    resolveUserMediaList: async () => []
  }), { language: 'it-IT' });
  await missingVm.loadProfile('ghost', { isVisitor: true });
  assert.equal(missingVm.state.error, null);
  assert.equal(missingVm.state.currentUser, null);
  assert.equal(missingVm.state.loadedUid, 'ghost', 'Missing visitor must finish loading cleanly');
});

test('UserRepository.getVisitorProfile reads directly from UserBackend and enrichment does not mutate cached Season/Episode', async () => {
  let socialCalled = false;
  const cachedSeason = new Season({ id: 301, seriesId: 30, seasonNumber: 2, name: 'Stagione 2' });
  const cachedEpisode = new Episode({ id: 401, seriesId: 30, seasonNumber: 2, episodeNumber: 5, name: 'Ep 5' });
  const parentSeries = new Series({
    id: 30,
    names: { it: 'Serie Madre', en: 'Parent Series' },
    posterUrl: { it: 'https://img/poster-it.jpg', en: 'https://img/poster-en.jpg' }
  });

  const repo = new UserRepository(
    /** @type {any} */ ({
      getUserById: async (uid) => new User({ uid, username: 'DirectVisitor' })
    }),
    /** @type {any} */ ({ get: async () => null, put: async () => {}, delete: async () => {} }),
    {
      socialRepository: /** @type {any} */ ({
        getUserProfile: async () => {
          socialCalled = true;
          return null;
        }
      }),
      seriesRepository: /** @type {any} */ ({
        getSeasonDetails: async () => cachedSeason,
        getEpisodeDetails: async () => cachedEpisode,
        getSeriesDetails: async () => parentSeries
      })
    }
  );

  repo.setOnlineOverride(true);
  const visitor = await repo.getVisitorProfile('u_direct');
  assert.equal(socialCalled, false, 'getVisitorProfile must not couple laterally to SocialRepository');
  assert.equal(visitor?.username, 'DirectVisitor');

  const resolvedSeason = await repo.resolveMediaReference({ mediaType: 'season', mediaId: 30, seasonNumber: 2 });
  assert.ok(resolvedSeason instanceof Season, 'Enriched season must preserve Season prototype');
  assert.equal(resolvedSeason.mediaType, 'season');
  assert.equal(resolvedSeason.seriesName, 'Serie Madre');
  assert.equal(cachedSeason.seriesName, '', 'Cached Season instance must not be mutated in place');

  const resolvedEpisode = await repo.resolveMediaReference({ mediaType: 'episode', mediaId: 30, seasonNumber: 2, episodeNumber: 5 });
  assert.ok(resolvedEpisode instanceof Episode, 'Enriched episode must preserve Episode prototype');
  assert.equal(resolvedEpisode.mediaType, 'episode');
  assert.equal(resolvedEpisode.seriesName, 'Serie Madre');
  assert.equal(cachedEpisode.seriesName, '', 'Cached Episode instance must not be mutated in place');

  repo.setOnlineOverride(false);
  await assert.rejects(
    () => repo.getVisitorProfile('u_direct'),
    /offline/i,
    'getVisitorProfile must fail cleanly when offline'
  );
});
