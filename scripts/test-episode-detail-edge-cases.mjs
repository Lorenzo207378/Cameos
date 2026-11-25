import assert from 'node:assert/strict';
import test from 'node:test';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { SeriesRepository } from '../src/repository/series/SeriesRepository.js';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { Series } from '../src/models/Series.js';
import { Season } from '../src/models/Season.js';
import { Episode } from '../src/models/Episode.js';
import { Cameo } from '../src/models/Cameo.js';
import { Trailer } from '../src/models/Trailer.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('SeriesViewModel.loadEpisodeDetails supports options+force, validates numeric params, isolates requestedEpisode.error and discards stale failures', async () => {
  const episodeCalls = [];
  let failEpisode = false;
  let returnNullEpisode = false;

  const repo = {
    async getSeriesDetails({ seriesId }) {
      return new Series({ id: seriesId, names: { it: 'Serie IT', en: 'Series EN' }, numberOfSeasons: 2 });
    },
    async getSeasonDetails({ seriesId, seasonNumber }) {
      return new Season({ seriesId, seasonNumber, episodes: [] });
    },
    async getEpisodeDetails(params) {
      episodeCalls.push(params);
      if (failEpisode) throw new Error('Episode network offline');
      if (returnNullEpisode) return null;
      return new Episode({
        id: 500 + Number(params.episodeNumber),
        seriesId: params.seriesId,
        seasonNumber: params.seasonNumber,
        episodeNumber: params.episodeNumber,
        names: { it: `Ep ${params.episodeNumber} IT`, en: `Ep ${params.episodeNumber} EN` },
        runtime: 45
      });
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  // Invalid / malformed route params never trigger repository calls and never hang isEpisodeLoading
  for (const [sid, snum, epnum] of [
    [null, 1, 1],
    ['', 1, 1],
    ['abc', 1, 1],
    [1418, 'abc', 1],
    [1418, 1, 'xyz'],
    [1418, -1, 1],
    [1418, 1.5, 1],
    [0, 1, 1]
  ]) {
    assert.equal(vm.isEpisodeLoading(sid, snum, epnum), false, `Malformed route (${sid}, ${snum}, ${epnum}) must not stay loading`);
    assert.equal(await vm.loadEpisodeDetails({ seriesId: sid, seasonNumber: snum, episodeNumber: epnum }), null);
    assert.equal(vm.getEpisodeForRoute(sid, snum, epnum), null);
  }
  assert.equal(episodeCalls.length, 0);

  // Options object with force:true and season 0 (Specials)
  const specialEp = await vm.loadEpisodeDetails({ seriesId: 1418, seasonNumber: 0, episodeNumber: 1, appendCredits: true, language: 'en-US', force: true });
  assert.equal(specialEp?.episodeNumber, 1);
  assert.deepEqual(episodeCalls[0], {
    seriesId: 1418,
    seasonNumber: 0,
    episodeNumber: 1,
    appendCredits: true,
    language: 'en-US',
    force: true
  });
  assert.equal(vm.state.requestedEpisode?.error, null);

  // Alias id + legacy positional call
  await vm.loadEpisodeDetails({ id: 1418, seasonNumber: 1, episodeNumber: 2, appendCredits: false });
  assert.deepEqual(episodeCalls[1], {
    seriesId: 1418,
    seasonNumber: 1,
    episodeNumber: 2,
    appendCredits: false,
    language: 'it-IT'
  });
  await vm.loadEpisodeDetails(1418, 1, 3, true, 'en-US');
  assert.deepEqual(episodeCalls[2], {
    seriesId: 1418,
    seasonNumber: 1,
    episodeNumber: 3,
    appendCredits: true,
    language: 'en-US'
  });

  // Race: loadEpisodeDetails fails while parallel loadSeriesDetails succeeds (clearing generic state.error)
  failEpisode = true;
  await Promise.all([
    vm.loadEpisodeDetails({ seriesId: 1418, seasonNumber: 2, episodeNumber: 4, language: 'it-IT' }),
    vm.loadSeriesDetails({ seriesId: 1418, language: 'it-IT' })
  ]);
  assert.equal(vm.isEpisodeLoading(1418, 2, 4), false);
  assert.equal(vm.state.requestedEpisode?.error, 'Episode network offline', 'Parallel series success must never clobber requestedEpisode.error');

  // Retry clears error and recovers
  failEpisode = false;
  const recovered = await vm.loadEpisodeDetails({ seriesId: 1418, seasonNumber: 2, episodeNumber: 4, language: 'it-IT', force: true });
  assert.equal(recovered?.episodeNumber, 4);
  assert.equal(vm.state.requestedEpisode?.error, null);

  // True not-found (resolves null without throwing) leaves requestedEpisode.error null
  returnNullEpisode = true;
  await vm.loadEpisodeDetails({ seriesId: 1418, seasonNumber: 9, episodeNumber: 9, language: 'it-IT' });
  assert.equal(vm.isEpisodeLoading(1418, 9, 9), false);
  assert.equal(vm.state.requestedEpisode?.error, null);

  // Stale rejection from an older episode cannot overwrite a newer episode request/error
  const slowOld = deferred();
  const raceVm = new SeriesViewModel(/** @type {any} */ ({
    getEpisodeDetails: (params) => (
      Number(params.episodeNumber) === 1
        ? slowOld.promise
        : Promise.resolve(new Episode({ id: 2, ...params, names: { it: 'Ep 2', en: 'Ep 2' } }))
    )
  }));
  const pendingOld = raceVm.loadEpisodeDetails({ seriesId: 77, seasonNumber: 1, episodeNumber: 1 });
  await raceVm.loadEpisodeDetails({ seriesId: 77, seasonNumber: 1, episodeNumber: 2 });
  slowOld.reject(new Error('Old episode timed out'));
  await pendingOld;
  assert.equal(raceVm.state.requestedEpisode?.episodeNumber, 2);
  assert.equal(raceVm.state.requestedEpisode?.error, null);
  assert.equal(raceVm.isEpisodeLoading(77, 1, 2), false);
});

test('Episode model extracts deduplicated directors/writers, sizes still URLs and localizes runtime', () => {
  const episode = new Episode({
    id: 901,
    seriesId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    names: { it: 'Acquisizione', en: 'The Excelsior Acquisition' },
    overviews: { it: 'Trama IT', en: 'Plot EN' },
    runtime: 75,
    stillUrl: {
      it: 'https://image.tmdb.org/t/p/w300/still-it.jpg',
      en: 'https://image.tmdb.org/t/p/w300/still-en.jpg'
    },
    crew: [
      { id: 10, name: 'Mark Cendrowski', job: 'Director', department: 'Directing' },
      { id: 10, name: 'Mark Cendrowski', job: 'Director', department: 'Directing' },
      { id: 20, name: 'Chuck Lorre', job: 'Story', department: 'Writing' },
      { id: 21, name: 'Bill Prady', job: 'Teleplay', department: 'Writing' },
      { id: 30, name: 'Camera Op', job: 'Camera Operator', department: 'Camera' }
    ]
  });

  assert.deepEqual(episode.getDirectors().map((d) => d.name), ['Mark Cendrowski']);
  assert.deepEqual(episode.getWriters().map((w) => w.name), ['Chuck Lorre', 'Bill Prady']);
  assert.equal(episode.getStillUrl('en', 'w1280'), 'https://image.tmdb.org/t/p/w1280/still-en.jpg');
  assert.equal(episode.getStillUrl('it', 'w1280'), 'https://image.tmdb.org/t/p/w1280/still-it.jpg');
  assert.equal(episode.getRuntime('it'), '1h 15m');
  assert.equal(episode.getRuntime('en'), '1h 15m');

  const emptyCrewEp = new Episode({ id: 902, seriesId: 1418, seasonNumber: 1, episodeNumber: 1 });
  assert.deepEqual(emptyCrewEp.getDirectors(), []);
  assert.deepEqual(emptyCrewEp.getWriters(), []);
});

test('SeriesRepository.getEpisodeDetails falls back offline on force:true and preserves crew, cameos and trailers', async () => {
  const storage = new IndexedDBService();
  const repo = new SeriesRepository(/** @type {any} */ ({
    async getSeasonDetails({ seriesId, seasonNumber }) {
      return new Season({
        seriesId,
        seasonNumber,
        episodes: [{ id: 901, episodeNumber: 16, name: 'Summary Only' }]
      });
    },
    async getEpisodeDetails({ seriesId, seasonNumber, episodeNumber }) {
      return new Episode({
        id: 901,
        seriesId,
        seasonNumber,
        episodeNumber,
        names: { it: 'Episodio Completo IT', en: 'Full Episode EN' },
        overviews: { it: 'Trama Completa IT', en: 'Full Plot EN' },
        runtime: 22,
        cast: [{ id: 1, name: 'Regular Cast', character: 'Sheldon' }],
        crew: [{ id: 10, name: 'Director One', job: 'Director', department: 'Directing' }],
        cameos: [{ id: 7624, name: 'Stan Lee', character: 'Himself', isCameoHighlight: true }],
        videosByLanguage: {
          it: [{ id: 'v1', key: 'epYtKey', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'it' }]
        }
      });
    }
  }), storage);

  await repo.getEpisodeDetails({ seriesId: 1418, seasonNumber: 3, episodeNumber: 16, language: 'it-IT' });
  await repo.getSeasonDetails({ seriesId: 1418, seasonNumber: 3, language: 'it-IT' });
  assert.equal((await storage.get(STORES.EPISODES, 'episode:1418:3:16:it-IT'))?.isComplete, true);

  repo.setOnlineOverride(false);
  const offlineEp = await repo.getEpisodeDetails({
    seriesId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    language: 'it-IT',
    force: true
  });
  assert.equal(offlineEp.getName('en'), 'Full Episode EN');
  assert.equal(offlineEp.getDirectors()[0]?.name, 'Director One');
  assert.ok(offlineEp.cameos[0] instanceof Cameo);
  assert.equal(offlineEp.cameos[0].name, 'Stan Lee');
  assert.ok(offlineEp.trailers[0] instanceof Trailer);

  await assert.rejects(
    () => repo.getEpisodeDetails({ seriesId: 1418, seasonNumber: 9, episodeNumber: 9, language: 'it-IT', force: true }),
    /connettivit|offline|cache/i
  );
});
