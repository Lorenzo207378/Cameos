import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { CameoRepository } from '../src/repository/cameos/CameoRepository.js';
import { CameoViewModel } from '../src/viewmodel/cameos/CameoViewModel.js';
import { extractCameosFromSeriesCast } from '../src/backend/cameos/cameoClassification.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';
import { Cameo } from '../src/models/Cameo.js';
import { WatchProvider } from '../src/models/WatchProvider.js';
import { excludeCameosFromCast } from '../src/utils/formatters.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('SeriesViewModel.loadSeriesDetails & loadSeasonDetails support options+force, validate numeric routes, isolate errors and discard stale races', async () => {
  const seriesCalls = [];
  const seasonCalls = [];
  let failSeries = false;
  let failSeason = false;
  let returnNullSeries = false;
  let returnNullSeason = false;

  const repo = {
    async getSeriesDetails(params) {
      seriesCalls.push(params);
      if (failSeries) throw new Error('Series network offline');
      if (returnNullSeries) return null;
      return new Series({ id: params.seriesId, names: { it: 'Serie IT', en: 'Series EN' }, status: 'Returning Series', numberOfSeasons: 2 });
    },
    async getSeasonDetails(params) {
      seasonCalls.push(params);
      if (failSeason) throw new Error('Season network offline');
      if (returnNullSeason) return null;
      return new Season({ seriesId: params.seriesId, seasonNumber: params.seasonNumber, episodes: [{ id: 1, episodeNumber: 1, name: 'Ep 1' }] });
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  // Malformed / non-numeric IDs make zero repository calls and never hang loading selectors
  for (const invalidId of [null, undefined, '', 'abc', 0, -2, 1.5]) {
    assert.equal(vm.isSeriesLoading(invalidId), false, `Malformed seriesId (${String(invalidId)}) must not stay loading`);
    assert.equal(await vm.loadSeriesDetails(invalidId), null);
  }
  for (const [sid, snum] of [[null, 1], ['abc', 1], [101, null], [101, 'abc'], [101, -1], [101, 1.5], [0, 1]]) {
    assert.equal(vm.isSeasonLoading(sid, snum), false, `Malformed season (${String(sid)}, ${String(snum)}) must not stay loading`);
    assert.equal(await vm.loadSeasonDetails(sid, snum), null);
  }
  assert.equal(seriesCalls.length, 0);
  assert.equal(seasonCalls.length, 0);

  // Options object with force:true
  const optSeries = await vm.loadSeriesDetails({ seriesId: 101, appendAggregateCredits: true, language: 'en-US', force: true });
  assert.equal(optSeries?.id, 101);
  assert.deepEqual(seriesCalls[0], { seriesId: 101, appendAggregateCredits: true, language: 'en-US', force: true });
  assert.equal(vm.state.seriesError, null);

  // Alias id + legacy positional
  await vm.loadSeriesDetails({ id: 102, appendAggregateCredits: false });
  assert.deepEqual(seriesCalls[1], { seriesId: 102, appendAggregateCredits: false, language: 'it-IT' });
  await vm.loadSeriesDetails(103, true, 'en-US');
  assert.deepEqual(seriesCalls[2], { seriesId: 103, appendAggregateCredits: true, language: 'en-US' });

  // Season options object forwards force:true and accepts season 0 (Specials)
  await vm.loadSeasonDetails({ seriesId: 101, seasonNumber: 0, appendAggregateCredits: true, language: 'en-US', force: true });
  assert.deepEqual(seasonCalls[0], { seriesId: 101, seasonNumber: 0, appendAggregateCredits: true, language: 'en-US', force: true });

  // Race: loadSeriesDetails fails while parallel loadSeasonDetails succeeds from cache (clearing generic state.error)
  failSeries = true;
  failSeason = false;
  await Promise.all([
    vm.loadSeriesDetails({ seriesId: 200, appendAggregateCredits: true, language: 'it-IT' }),
    vm.loadSeasonDetails({ seriesId: 200, seasonNumber: 1, appendAggregateCredits: true, language: 'it-IT' })
  ]);
  assert.equal(vm.isSeriesLoading(200), false);
  assert.equal(vm.state.seriesError, 'Series network offline', 'Parallel season success must never clobber seriesError');

  // Reverse race: loadSeasonDetails fails while parallel loadSeriesDetails succeeds
  failSeries = false;
  failSeason = true;
  await Promise.all([
    vm.loadSeasonDetails({ seriesId: 201, seasonNumber: 1, appendAggregateCredits: true, language: 'it-IT' }),
    vm.loadSeriesDetails({ seriesId: 201, appendAggregateCredits: true, language: 'it-IT' })
  ]);
  assert.equal(vm.state.seriesError, null);
  assert.equal(vm.state.requestedSeason?.error, 'Season network offline', 'Parallel series success must never clobber requestedSeason.error');

  // True not-found (resolves null without throwing) keeps both seriesError and requestedSeason.error null even if state.error had a leftover value
  returnNullSeries = true;
  returnNullSeason = true;
  failSeries = false;
  failSeason = false;
  vm.setState({ error: 'Leftover unrelated error' });
  await vm.loadSeriesDetails({ seriesId: 202, language: 'it-IT' });
  assert.equal(vm.state.seriesError, null);
  vm.setState({ error: 'Leftover unrelated error' });
  await vm.loadSeasonDetails({ seriesId: 202, seasonNumber: 9, language: 'it-IT' });
  assert.equal(vm.state.requestedSeason?.error, null, 'True null season must never inherit generic state.error');

  // Same-ID retry race on loadSeriesDetails: slow initial failure must never overwrite newer retry success
  const slowFirst = deferred();
  let attempt = 0;
  const raceVm = new SeriesViewModel(/** @type {any} */ ({
    getSeriesDetails: ({ seriesId }) => {
      attempt += 1;
      if (attempt === 1) return slowFirst.promise;
      return Promise.resolve(new Series({ id: seriesId, names: { it: 'Serie Retry', en: 'Retry Series' } }));
    }
  }));
  const pendingFirst = raceVm.loadSeriesDetails({ seriesId: 300 });
  const retried = await raceVm.loadSeriesDetails({ seriesId: 300, force: true });
  assert.equal(retried?.id, 300);
  slowFirst.reject(new Error('Stale first series attempt timed out'));
  await pendingFirst;
  assert.equal(raceVm.state.seriesError, null, 'Stale rejection on same seriesId must never overwrite newer retry success');
});

test('Option 1A TV parity: CameoViewModel.extractSeriesCameos derives series cameos synchronously without network calls', async () => {
  const backend = new CameoBackend(/** @type {any} */ ({
    defaultLanguage: 'it-IT',
    getTvSeriesDetails() {
      throw new Error('Must never call network when deriving cameos from loaded Series');
    }
  }));
  const repo = new CameoRepository(backend, new IndexedDBService());
  const vm = new CameoViewModel(repo, { language: 'it-IT' });

  const series = new Series({
    id: 1418,
    names: { it: 'Serie Test IT', en: 'Test Series EN' },
    aggregate_credits: {
      cast: [
        { id: 1, name: 'Regular Lead', total_episode_count: 100, popularity: 90, roles: [{ character: 'Main Hero' }] },
        { id: 2, name: 'Famous Star', total_episode_count: 2, popularity: 35, roles: [{ character: 'Mysterious Guest' }] },
        { id: 3, name: 'Self Guest', total_episode_count: 1, popularity: 4, roles: [{ character: 'Himself' }] },
        { id: 4, name: 'Notable Guest', total_episode_count: 1, popularity: 2, roles: [{ character: 'Waiter' }] },
        { id: 5, name: 'Minor Extra', total_episode_count: 1, popularity: 1.2, roles: [{ character: 'Pedestrian' }] }
      ]
    }
  });

  const derived = vm.extractSeriesCameos(series, { maxEpisodes: 2, minPopularity: 10, language: 'en-US' });
  assert.equal(derived.length, 2);
  assert.ok(derived.every((item) => item instanceof Cameo));
  assert.deepEqual(derived.map((item) => item.id), [2, 3]);
  assert.equal(derived[0].cameoBadge, 'Special Guest Star');
  assert.equal(derived[1].cameoBadge, 'Cameo (Se stesso)');
  assert.equal(derived[0].mediaId, 1418);
  assert.equal(derived[0].mediaType, 'tv');
  assert.equal(derived[0].mediaTitle, 'Test Series EN');
  assert.equal(derived[0].getMediaTitle('it'), 'Serie Test IT');
  assert.equal(derived[0].getMediaTitle('en'), 'Test Series EN');
  assert.deepEqual(vm.extractSeriesCameos(null), []);

  // Unified default threshold (DEFAULT_CAMEO_MIN_POPULARITY = 2) includes popularity >= 2 and excludes < 2
  const defaultDerived = vm.extractSeriesCameos(series, { language: 'en-US' });
  assert.deepEqual(defaultDerived.map((item) => item.id), [2, 3, 4]);

  // Legacy cached Series payload with vipCameos still hydrates cleanly into series.cameos
  const legacySeries = new Series({ id: 1419, vipCameos: [{ id: 8, name: 'Cached Cameo' }] });
  assert.equal(legacySeries.cameos.length, 1);
  assert.ok(legacySeries.cameos[0] instanceof Cameo);

  // Pure helper also works directly and getSeriesCameos retains fallback seriesId when payload omits id
  assert.equal(extractCameosFromSeriesCast(null).length, 0);
  const remoteBackend = new CameoBackend(/** @type {any} */ ({
    defaultLanguage: 'it-IT',
    async getTvSeriesDetails() {
      return {
        names: { it: 'Serie Remota', en: 'Remote Series' },
        aggregate_credits: {
          cast: [{ id: 9, name: 'Cameo Actor', total_episode_count: 1, popularity: 20, roles: [{ character: 'Cameo' }] }]
        }
      };
    }
  }));
  const remoteCameos = await remoteBackend.getSeriesCameos({ seriesId: 999, language: 'en-US' });
  assert.equal(remoteCameos.length, 1);
  assert.equal(remoteCameos[0].mediaId, 999);
  assert.equal(remoteCameos[0].mediaTitle, 'Remote Series');

  // Recurring series cast with a 1-episode uncredited secondary credit stay in Cast, not Cameos,
  // and full-run leads of 1-2 episode miniseries stay in Cast while excludeCameosFromCast keeps both lists disjoint
  const recurringSeries = new Series({
    id: 66732,
    names: { it: 'Stranger Things', en: 'Stranger Things' },
    numberOfEpisodes: 34,
    aggregate_credits: {
      cast: [
        {
          id: 10,
          name: 'Dacre Montgomery',
          total_episode_count: 18,
          popularity: 8,
          roles: [
            { character: 'Billy Hargrove', episode_count: 18 },
            { character: 'Billy Hargrove (archive footage) (uncredited)', episode_count: 1 }
          ]
        },
        {
          id: 20,
          name: 'Short Guest',
          total_episode_count: 1,
          popularity: 6,
          roles: [{ character: 'Visitor', episode_count: 1 }]
        }
      ]
    }
  });
  const recurringCameos = vm.extractSeriesCameos(recurringSeries, { language: 'it-IT' });
  assert.deepEqual(recurringCameos.map((c) => c.id), [20]);
  assert.deepEqual(excludeCameosFromCast(recurringSeries.cast, recurringCameos).map((c) => c.id), [10]);
  const recurringCredits = vm.getSeriesCastAndCameos(recurringSeries, { language: 'it-IT' });
  assert.deepEqual(recurringCredits.cameos.map((c) => c.id), [20]);
  assert.deepEqual(recurringCredits.cast.map((c) => c.id), [10]);
  assert.deepEqual(vm.getSeriesCastAndCameos(null), { cast: [], cameos: [] });

  const twoEpMiniseries = new Series({
    id: 9001,
    names: { it: 'Miniserie', en: 'Miniseries' },
    numberOfEpisodes: 2,
    aggregate_credits: {
      cast: [
        { id: 1, name: 'Miniseries Lead', total_episode_count: 2, popularity: 25, roles: [{ character: 'Hero', episode_count: 2 }] },
        { id: 2, name: 'One-Ep Guest', total_episode_count: 1, popularity: 10, roles: [{ character: 'Guest', episode_count: 1 }] }
      ]
    }
  });
  const miniCameos = vm.extractSeriesCameos(twoEpMiniseries, { language: 'it-IT' });
  assert.deepEqual(miniCameos.map((c) => c.id), [2]);
  assert.deepEqual(excludeCameosFromCast(twoEpMiniseries.cast, miniCameos).map((c) => c.id), [1]);
});

test('Series.getBackdropUrl and getPosterUrl honor explicit TMDB size parameter', () => {
  const series = new Series({
    id: 42,
    posterUrl: {
      it: 'https://image.tmdb.org/t/p/w342/poster-it.jpg',
      en: 'https://image.tmdb.org/t/p/w342/poster-en.jpg'
    },
    backdropUrl: {
      it: 'https://image.tmdb.org/t/p/w780/bg-it.jpg',
      en: 'https://image.tmdb.org/t/p/w780/bg-en.jpg'
    }
  });

  assert.equal(series.getBackdropUrl('en', 'w1280'), 'https://image.tmdb.org/t/p/w1280/bg-en.jpg');
  assert.equal(series.getBackdropUrl('it', 'w1280'), 'https://image.tmdb.org/t/p/w1280/bg-it.jpg');
  assert.equal(series.getPosterUrl('it', 'w500'), 'https://image.tmdb.org/t/p/w500/poster-it.jpg');
});

test('SeriesRepository.getSeriesDetails and getSeasonDetails fall back offline on force:true and preserve hydrated models', async () => {
  const storage = new IndexedDBService();
  const backend = {
    async getSeriesDetails({ seriesId }) {
      return new Series({
        id: seriesId,
        names: { it: 'Serie Completa', en: 'Full Series' },
        status: 'Returning Series',
        numberOfSeasons: 2,
        watchProviders: { IT: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }] } },
        cast: [{ id: 2, name: 'Guest Star', total_episode_count: 1, popularity: 30, roles: [{ character: 'Self' }] }]
      });
    },
    async getSeasonDetails({ seriesId, seasonNumber }) {
      return new Season({
        seriesId,
        seasonNumber,
        episodes: [{ id: 10, episodeNumber: 1, names: { it: 'Pilota', en: 'Pilot' }, overviews: { it: 'Trama IT', en: 'Plot EN' } }]
      });
    }
  };
  const repo = new SeriesRepository(/** @type {any} */ (backend), storage);

  await repo.getSeriesDetails({ seriesId: 500, appendAggregateCredits: true, language: 'it-IT' });
  await repo.getSeasonDetails({ seriesId: 500, seasonNumber: 1, appendAggregateCredits: true, language: 'it-IT' });
  assert.equal((await storage.get(STORES.SERIES, 'series:500:it-IT'))?.isComplete, true);
  assert.equal((await storage.get(STORES.SEASONS, 'season:500:1:it-IT'))?.isComplete, true);

  repo.setOnlineOverride(false);
  const offlineSeries = await repo.getSeriesDetails({ seriesId: 500, appendAggregateCredits: true, language: 'it-IT', force: true });
  assert.equal(offlineSeries.getName('en'), 'Full Series');
  assert.ok(offlineSeries.watchProviders[0]?.items[0] instanceof WatchProvider);

  const offlineSeason = await repo.getSeasonDetails({ seriesId: 500, seasonNumber: 1, appendAggregateCredits: true, language: 'it-IT', force: true });
  assert.ok(offlineSeason.episodes[0] instanceof Episode);
  assert.equal(offlineSeason.episodes[0].getName('en'), 'Pilot');

  await assert.rejects(
    () => repo.getSeriesDetails({ seriesId: 999999, appendAggregateCredits: true, language: 'it-IT', force: true }),
    /connettivit|offline|cache/i
  );
});
