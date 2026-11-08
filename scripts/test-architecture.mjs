import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiService } from '../src/service/ApiService.js';
import { createApiRequest } from '../src/service/ApiServiceHelpers.js';
import { BaseViewModel } from '../src/viewmodel/BaseViewModel.js';
import { BaseRepository } from '../src/repository/BaseRepository.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { PersonBackend } from '../src/backend/person/PersonBackend.js';
import { UserBackend } from '../src/backend/user/UserBackend.js';
import { SocialBackend } from '../src/backend/social/SocialBackend.js';
import { NotificationBackend } from '../src/backend/notifications/NotificationBackend.js';
import { ReviewBackend } from '../src/backend/reviews/ReviewBackend.js';
import { UserRepository } from '../src/repository/user/UserRepository.js';
import { SocialRepository } from '../src/repository/social/SocialRepository.js';
import { NotificationRepository } from '../src/repository/notifications/NotificationRepository.js';
import { ReviewRepository } from '../src/repository/reviews/ReviewRepository.js';
import { User } from '../src/models/User.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function mockFetch(t, fetcher) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  t.after(() => { globalThis.fetch = original; });
}

test('state snapshots stay immutable and unchanged patches do not notify subscribers', () => {
  const vm = new BaseViewModel({ value: 1 });
  let notifications = 0;
  const unsubscribe = vm.subscribe(() => notifications++);
  const previous = vm.state;
  vm.setState({ value: 1 });
  assert.equal(vm.state, previous);
  vm.setState((state) => ({ value: state.value + 1 }));
  assert.equal(previous.value, 1);
  assert.equal(vm.state.value, 2);
  assert.ok(Object.isFrozen(vm.state));
  assert.equal(notifications, 1);
  unsubscribe();
  vm.setState({ value: 3 });
  assert.equal(notifications, 1);
});

test('an older async response still resolves for its caller but cannot overwrite the latest state', async () => {
  const vm = new BaseViewModel();
  const oldRequest = deferred();
  const old = vm.runAsync('search', () => oldRequest.promise, (value) => ({ value }));
  await vm.runAsync('search', async () => 'new', (value) => ({ value }));
  oldRequest.resolve('old');
  assert.equal(await old, 'old');
  assert.equal(vm.state.value, 'new');
  assert.equal(vm.state.loading, false);
});

test('pagination replaces duplicate items in place and respects explicit completion', async () => {
  const vm = new BaseViewModel({ entries: [], entriesPagination: { page: 1, totalPages: 4, hasMore: true } });
  const load = (params, response) => vm.loadPagination({
    categoryKey: 'entries', stateProp: 'entries', paginationProp: 'entriesPagination',
    params, fetchPage: async () => response
  });
  await load({}, { results: [{ id: 1, title: 'first' }, { id: 2 }], total_pages: 4 });
  await load({ append: true }, { results: [{ id: 1, title: 'updated' }, { id: 3 }], hasMore: false });
  assert.deepEqual(vm.state.entries, [{ id: 1, title: 'updated' }, { id: 2 }, { id: 3 }]);
  assert.deepEqual(vm.state.entriesPagination, { page: 2, totalPages: 4, hasMore: false, loadingMore: false, loading: false, error: null, language: 'it-IT' });
  await load({ append: true }, { results: [{ id: 4 }] });
  assert.equal(vm.state.entries.length, 3);
});

test('concurrent category pagination preserves both category maps', async () => {
  const vm = new BaseViewModel({ categoryPagination: {}, categories: {} });
  const first = deferred();
  const load = (categoryKey, fetchPage) => vm.loadPagination({ categoryKey, groupedListProp: 'categories', fetchPage });
  const pending = load('first', () => first.promise);
  await load('second', async () => ({ results: [{ id: 2 }], total_pages: 3 }));
  first.resolve({ results: [{ id: 1 }], total_pages: 2 });
  await pending;
  assert.deepEqual(vm.state.categories, { second: [{ id: 2 }], first: [{ id: 1 }] });
  assert.equal(vm.state.categoryPagination.first.totalPages, 2);
  assert.equal(vm.state.categoryPagination.second.totalPages, 3);
});

test('unset language parameters retain the configured API default while explicit languages win', () => {
  const api=new ApiService({defaultLanguage:'it-IT',apiKey:'0'.repeat(32)});
  for (const params of [{},{language:undefined},{language:null},{language:''}]) {
    assert.equal(createApiRequest(api,'/movie/1',params,{}).url.searchParams.get('language'),'it-IT');
  }
  assert.equal(createApiRequest(api,'/movie/1',{language:'en-US'},{}).url.searchParams.get('language'),'en-US');
});

test('API deduplicates in-flight requests and returns independent enriched payloads', async (t) => {
  const response = deferred();
  const calls = [];
  mockFetch(t, (url, options) => { calls.push({ url, options }); return response.promise; });
  const api = new ApiService({ apiKey: '1234567890abcdef1234567890abcdef' });
  const first = api.fetch('/movie/1');
  const second = api.fetch('/movie/1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers, undefined);
  assert.equal(new URL(calls[0].url).searchParams.get('language'), 'it-IT');
  response.resolve(Response.json({ id: 1, poster_path: '/poster.jpg', nested: { value: 1 } }));
  const [a, b] = await Promise.all([first, second]);
  a.nested.value = 2;
  assert.equal(b.nested.value, 1);
  assert.match(b.posterUrl.it, /\/w500\/poster.jpg$/);
  assert.equal('poster_path' in b, false);
});

test('network retry falls back to Bearer and retains the first error if both attempts fail', async (t) => {
  const firstError = new Error('first network error');
  const calls = [];
  mockFetch(t, async (url, options) => { calls.push({ url, options }); throw calls.length === 1 ? firstError : new Error('second'); });
  const api = new ApiService({ apiKey: '1234567890abcdef1234567890abcdef', token: 'test-token' });
  await assert.rejects(api.fetch('/movie/1'), (error) => error === firstError);
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1].url).searchParams.has('api_key'), false);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token');
  assert.equal(api._activeRequests, 0);
});

test('HTTP throttling retries once and custom headers keep Bearer authorization', async (t) => {
  const calls = [];
  mockFetch(t, async (url, options) => {
    calls.push({ url, options });
    return calls.length === 1 ? new Response('', { status: 429 }) : Response.json({ id: 2 });
  });
  const api = new ApiService({ token: 'test-token' });
  assert.equal((await api.fetch('/movie/2', { language: 'en-US', page: 0, ignored: null }, { headers: { 'X-Test': 'value' } })).id, 2);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers['X-Test'], 'value');
  assert.equal(new URL(calls[0].url).searchParams.get('page'), '0');
  assert.equal(new URL(calls[0].url).searchParams.has('ignored'), false);
});

test('request queue never runs more than ten network operations concurrently', async (t) => {
  const responses = [];
  let active = 0;
  let peak = 0;
  mockFetch(t, async () => {
    active++;
    peak = Math.max(peak, active);
    const response = deferred();
    responses.push(response);
    try { return await response.promise; } finally { active--; }
  });
  const api = new ApiService();
  const requests = Array.from({ length: 12 }, (_, id) => api.fetch(`/movie/${id}`));
  assert.equal(responses.length, 10);
  for (let index = 0; index < requests.length; index++) {
    responses[index].resolve(Response.json({ id: index }));
    await requests[index];
  }
  assert.equal(peak, 10);
  assert.equal(api._activeRequests, 0);
  assert.equal(api._requestQueue.length, 0);
});

test('repository preserves network-first results and falls back on network errors or offline access', async () => {
  const repository = new BaseRepository(new IndexedDBService());
  const cached = { id: 1, source: 'cache' };
  const fresh = { id: 1, source: 'network' };
  let saved;
  const config = { context: 'test', fetchRemote: async () => fresh, saveLocal: async (value) => { saved = value; }, getLocal: async () => cached };
  repository.setOnlineOverride(true);
  assert.equal(await repository.executeWithFallback(config), fresh);
  assert.equal(saved, fresh);
  assert.equal(await repository.executeWithFallback({ ...config, fetchRemote: async () => { throw new Error('offline'); } }), cached);
  repository.setOnlineOverride(false);
  assert.equal(await repository.executeWithFallback(config), cached);
  await assert.rejects(repository.executeWithFallback({ ...config, getLocal: async () => null }), /nessun dato locale/);
});

test('headless storage isolates saved and retrieved records and supports compound indexes', async () => {
  const storage = new IndexedDBService();
  const record = { cacheKey: 'episode', seriesId: 1, seasonNumber: 2, episodeNumber: 3, data: { name: 'Episode' } };
  await storage.put(STORES.EPISODES, record);
  record.data.name = 'changed';
  const [saved] = await storage.getByIndex(STORES.EPISODES, 'episodeKey', [1, 2, 3]);
  assert.equal(saved.data.name, 'Episode');
  saved.data.name = 'changed again';
  assert.equal((await storage.get(STORES.EPISODES, 'episode')).data.name, 'Episode');
  await storage.delete(STORES.EPISODES, 'episode');
  assert.equal(await storage.get(STORES.EPISODES, 'episode'), null);
});

test('upcoming series retain premiere, returning-season and failure fallbacks', async () => {
  let detail;
  const backend = new SeriesBackend({ fetch: async () => {
    if (detail instanceof Error) throw detail;
    return detail;
  } });
  const today = '2030-01-01';
  detail = { status: 'Planned', seasons: [{ season_number: 1, name: 'First', air_date: '2031-02-01' }] };
  let result = await backend._enrichUpcomingSeriesItem({ id: 1, firstAirDate: '2031-01-01' }, today, 'en-US');
  assert.deepEqual(result.upcomingSeason, { seasonNumber: 1, name: 'First', airDate: '2031-02-01' });
  detail = { seasons: [{ season_number: 2, air_date: today }], next_episode_to_air: { season_number: 3, episode_number: 1, air_date: today } };
  result = await backend._enrichUpcomingSeriesItem({ id: 1, firstAirDate: '2020-01-01' }, today);
  assert.equal(result.upcomingSeason.seasonNumber, 2);
  detail.seasons = [];
  result = await backend._enrichUpcomingSeriesItem({ id: 1, firstAirDate: '2020-01-01' }, today);
  assert.equal(result.upcomingSeason.seasonNumber, 3);
  detail.next_episode_to_air.episode_number = 2;
  assert.ok(await backend._enrichUpcomingSeriesItem({ id: 1, firstAirDate: '2020-01-01' }, today));
  detail.first_air_date = '2020-01-01';
  assert.equal(await backend._enrichUpcomingSeriesItem({ id: 1, firstAirDate: '2020-01-01' }, today), null);
  const item = { id: 1, firstAirDate: '2031-01-01' };
  detail = new Error('detail unavailable');
  assert.equal(await backend._enrichUpcomingSeriesItem(item, today), item);
});

test('famous cameos preserve movie windows, top-two selection, duplicate rules and per-movie failures', async () => {
  const backend = new CameoBackend({});
  const calls = [];
  backend.getCameoHeavyMovies = async () => ({ total_pages: 10, results: [1, 2, 3, 4].map((id) => ({ id, title: `Movie ${id}` })) });
  backend.getMovieCameos = async ({ movieId, minPopularity }) => {
    calls.push(movieId);
    assert.equal(minPopularity, 4);
    if (movieId === 2) throw new Error('unavailable');
    return { cameos: movieId === 1
      ? [{ id: 10, popularity: 9 }, { id: '10', popularity: 8 }, { id: 11, popularity: 7 }]
      : [{ id: 20, popularity: 3 }, { id: 21, popularity: 5 }] };
  };
  const result = await backend.getFamousCameos({ limit: 3 });
  assert.deepEqual(calls, [1, 2, 3]);
  assert.deepEqual(result.results.map(({ id, mediaId }) => [id, mediaId]), [[10, 1], [21, 3], [20, 3]]);
  assert.equal(result.totalPages, 50);
  assert.equal(result.totalResults, 150);
  assert.equal(result.hasMore, true);
});

test('famous cameos fill short source pages and retain available movies if the next page fails', async () => {
  const backend = new CameoBackend({});
  const pages = [];
  backend.getCameoHeavyMovies = async ({ page }) => {
    pages.push(page);
    if (page === 2) throw new Error('next page unavailable');
    return { total_pages: 2, results: [{ id: 1 }, { id: 2 }] };
  };
  backend.getMovieCameos = async ({ movieId }) => ({ cameos: [{ id: movieId, popularity: 1 }] });
  const result = await backend.getFamousCameos();
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.results.length, 2);
});

test('career cameos preserve movie billing thresholds, TV episode limits, explicit roles and exclusions', async () => {
  const calls = [];
  const backend = new CameoBackend({ getPersonDetails: async (_, params) => {
    calls.push(params.append_to_response);
    return {
      name: 'Actor',
      movie_credits: { cast: [
        { id: 1, title: 'Lead', order: 7 },
        { id: 2, title: 'Guest', order: 8, popularity: 2, release_date: '2020-01-01' },
        { id: 3, title: 'Self role', character: 'Himself', popularity: 3 },
        { id: 4, title: 'Oscars', character: 'Himself', popularity: 20 }
      ] },
      tv_credits: { cast: [
        { id: 5, name: 'Long role', episode_count: 3 },
        { id: 6, name: 'Guest', episode_count: 2, popularity: 1, first_air_date: '2021-01-01' },
        { id: 7, name: 'Explicit', character: 'Cameo', episode_count: 20, popularity: 4 },
        { id: 8, name: 'Unknown duration', episode_count: 0 }
      ] }
    };
  } });
  const movies = await backend.getActorMovieCameos({ personId: 42 });
  const series = await backend.getActorTVCameos({ personId: 42 });
  assert.deepEqual(movies.map((item) => item.id), [3, 2]);
  assert.deepEqual(series.map((item) => item.id), [7, 6]);
  assert.equal(movies[1].releaseDate, '2020-01-01');
  assert.equal(movies[1].order, 8);
  assert.equal(series[1].firstAirDate, '2021-01-01');
  assert.equal(series[1].episodeCount, 2);
  assert.deepEqual(calls, ['movie_credits', 'tv_credits']);
});

test('filmography retains TV-first ties, exclusions, field projection and sorting', async () => {
  const backend = new PersonBackend({ getPersonDetails: async () => ({
    id: 42,
    tvCredits: { cast: [{ id: 1, name: 'Series', popularity: 3, first_air_date: '2020-01-01' }], crew: [] },
    movieCredits: { cast: [
      { id: 2, title: 'Movie', popularity: 3, release_date: '2022-01-01' },
      { id: 3, title: 'Documentary', genreIds: [99], popularity: 100 }
    ], crew: [{ id: 4, title: 'Crew movie' }] }
  }) });
  const all = await backend.getPersonFilmography({ personId: 42 });
  assert.deepEqual(all.cast.map((item) => item.id), [1, 2]);
  assert.equal(all.cast[1].name, 'Movie');
  assert.equal(all.cast[1].media_type, 'movie');
  assert.equal(all.crew[0].mediaType, 'movie');
  const movies = await backend.getPersonFilmography({ personId: 42, mediaType: 'movie' });
  assert.deepEqual(movies.cast.map((item) => item.id), [2]);
  const dated = await backend.getPersonFilmography({ personId: 42, sortBy: 'date' });
  assert.deepEqual(dated.cast.map((item) => item.id), [2, 1]);
});

function socialFixture() {
  const documents = new Map();
  const adapter = {
    async getDocument(_, collection, id) { return structuredClone(documents.get(`${collection}/${id}`) ?? null); },
    async setDocument(_, collection, id, data, options = {}) {
      const key = `${collection}/${id}`;
      documents.set(key, structuredClone({ ...(options.merge ? documents.get(key) : {}), ...data }));
    },
    async deleteDocument(_, collection, id) { documents.delete(`${collection}/${id}`); },
    async queryByField(_, collection, field, value) {
      return [...documents].filter(([key, data]) => key.startsWith(`${collection}/`) && data[field] === value)
        .map(([, data]) => structuredClone(data));
    },
    timestamp: () => '2030-01-01T00:00:00.000Z'
  };
  const storage = new IndexedDBService();
  const userBackend = new UserBackend({}, adapter);
  const notifications = new NotificationBackend({}, adapter);
  const social = new SocialBackend({}, adapter, notifications);
  const reviews = new ReviewBackend({}, adapter, notifications);
  return { documents, storage, userBackend, notifications, social, reviews };
}

test('friend requests preserve serialized fields, authorization, acceptance and notification policies', async () => {
  const { documents, social } = socialFixture();
  documents.set('users/alice', { uid: 'alice', username: 'Alice', friends: [] });
  documents.set('users/bob', { uid: 'bob', username: 'Bob', friends: [] });
  const request = await social.sendFriendRequest('alice', 'bob');
  assert.deepEqual(documents.get(`friend_requests/${request.id}`), request.toPlainObject());
  await assert.rejects(social.sendFriendRequest('alice', 'bob'), /already pending/);
  await assert.rejects(social.rejectFriendRequest(request.id, 'outsider'), /Only sender or recipient/);
  const accepted = await social.acceptFriendRequest(request.id, 'bob');
  assert.deepEqual(accepted.senderFriends, ['bob']);
  assert.deepEqual(accepted.recipientFriends, ['alice']);
  assert.equal(documents.has(`friend_requests/${request.id}`), false);
  assert.equal([...documents.keys()].filter((key) => key.startsWith('notifications/')).length, 2);
});

test('offline profile edits retain session ownership and synchronize pending changes after reconnection', async () => {
  const { storage, userBackend, documents } = socialFixture();
  const repository = new UserRepository(userBackend, storage);
  repository.setOnlineOverride(false);
  await repository.saveUserLocal(new User({ uid: 'alice', username: 'Alice' }), { isSessionUser: true });
  await repository.updateUser('alice', { language: 'en-US', favorites: [{ targetKey: 'movie:42' }] });
  assert.equal((await storage.get(STORES.USERS, 'user:alice')).pendingSync, true);
  assert.equal(await repository.getSessionUser('bob'), null);
  repository.setOnlineOverride(true);
  const synced = await repository.syncPendingChanges('alice');
  assert.equal(synced.language, 'en-US');
  assert.equal(documents.get('users/alice').language, 'en-US');
  assert.equal((await storage.get(STORES.USERS, 'user:alice')).pendingSync, false);
  assert.equal((await storage.get(STORES.USERS, 'session:current_user')).data.language, 'en-US');
});

test('review persistence retains lightweight user references, ratings, likes and serialized fields', async () => {
  const { storage, userBackend, reviews, documents } = socialFixture();
  const repository = new ReviewRepository(reviews, userBackend, storage);
  repository.setOnlineOverride(true);
  await storage.put(STORES.USERS, { cacheKey: 'user:alice', data: { uid: 'alice', reviews: [] } });
  const { review, stats, userReviews } = await repository.saveReview('alice', { mediaType: 'movie', mediaId: 42, rating: 8, liked: true, text: 'Review' });
  assert.deepEqual(documents.get(`media_reviews/${review.id}`), review.toPlainObject());
  assert.deepEqual(userReviews, [review.toUserReference()]);
  assert.equal('text' in userReviews[0], false);
  assert.equal(stats.averageRating, 8);
  assert.deepEqual(stats.likedBy, ['alice']);
  assert.equal('averageRating' in documents.get('media_stats/movie:42'), false);
  const updated = await repository.saveReview('alice', { mediaType: 'movie', mediaId: 42, rating: 4 });
  assert.equal(updated.stats.ratingCount, 1);
  assert.equal(updated.stats.averageRating, 4);
  const removed = await repository.removeReview('alice', review.id);
  assert.equal(removed.stats.ratingCount, 0);
});

test('notification cache retains read items on partial refresh and removes stale items on full refresh', async () => {
  const { storage, notifications, documents } = socialFixture();
  const repository = new NotificationRepository(notifications, storage);
  repository.setOnlineOverride(true);
  const first = await repository.sendNotification({ id: 'first', recipientUid: 'alice', payload: { id: 42 } });
  assert.deepEqual(documents.get('notifications/first'), first.toPlainObject());
  await repository.markNotificationAsRead('first');
  await repository.sendNotification({ id: 'second', recipientUid: 'alice' });
  documents.delete('notifications/first');
  await repository.getUserNotifications('alice', { unreadOnly: true });
  assert.ok(await storage.get(STORES.NOTIFICATIONS, 'notif:first'));
  await repository.getUserNotifications('alice');
  assert.equal(await storage.get(STORES.NOTIFICATIONS, 'notif:first'), null);
  assert.ok(await storage.get(STORES.NOTIFICATIONS, 'notif:second'));
});

test('social, notification and review mutations remain unavailable offline', async () => {
  const { storage, userBackend, social, reviews, notifications, documents } = socialFixture();
  const socialRepository = new SocialRepository(social, userBackend, storage);
  const reviewRepository = new ReviewRepository(reviews, userBackend, storage);
  const notificationRepository = new NotificationRepository(notifications, storage);
  for (const repository of [socialRepository, reviewRepository, notificationRepository]) repository.setOnlineOverride(false);
  await assert.rejects(socialRepository.sendFriendRequest('alice', 'bob'), /offline/);
  await assert.rejects(reviewRepository.saveReview('alice', { mediaId: 42 }), /offline/);
  await assert.rejects(notificationRepository.sendNotification({ recipientUid: 'alice' }), /offline/);
  assert.equal(documents.size, 0);
});
