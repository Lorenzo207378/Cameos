import assert from 'node:assert/strict';
import test from 'node:test';
import { getCrewRoleKeys, selectCrewByRole, selectPersonCredits } from '../src/utils/formatters.js';
import { Series } from '../src/models/Series.js';
import { PersonBackend } from '../src/backend/person/PersonBackend.js';
import { PersonRepository } from '../src/repository/person/PersonRepository.js';
import { PersonViewModel } from '../src/viewmodel/person/PersonViewModel.js';
import { IndexedDBService, STORES } from '../src/storage/IndexedDBService.js';
import { isExcludedMedia } from '../src/models/utils/mediaLabels.js';
import { translate } from '../src/utils/translations.js';

test('creative roles support regular and aggregated TV jobs without treating production as direction', () => {
  assert.deepEqual(getCrewRoleKeys({ job: 'Director' }), ['detail.directing']);
  assert.deepEqual(getCrewRoleKeys({ job: 'Screenplay' }), ['detail.writing']);
  assert.deepEqual(getCrewRoleKeys({ job: 'Writer' }), ['detail.writing']);
  assert.deepEqual(getCrewRoleKeys({ job: 'Story', department: 'Writing' }), ['detail.writing']);
  assert.deepEqual(getCrewRoleKeys({ job: 'Producer' }), []);
  assert.deepEqual(getCrewRoleKeys({ job: 'Assistant Director', department: 'Directing' }), []);
  assert.deepEqual(getCrewRoleKeys({ jobs: [{ job: 'Writer' }, { job: 'Director' }, { job: 'Creator' }] }),
    ['detail.directing', 'detail.writing', 'detail.creation']);
});

test('creative filmography merges multiple jobs per media while preserving type, order and cameo overlaps', () => {
  const movie = { id: 1, mediaType: 'movie', title: 'Movie', popularity: 20 };
  const tv = { id: 1, mediaType: 'tv', name: 'Series', popularity: 10 };
  const crew = [
    { ...movie, job: 'Director' }, { ...movie, job: 'Screenplay' }, { ...movie, job: 'Writer' },
    { ...tv, job: 'Writer' }, { id: 2, mediaType: 'movie', job: 'Producer' }
  ];
  const credits = selectPersonCredits({ crew }, [{ mediaId: 1, mediaType: 'movie' }], 'crew');
  assert.equal(credits.length, 2);
  assert.deepEqual(credits[0].creditRoleKeys, ['detail.directing', 'detail.writing']);
  assert.deepEqual(credits[1].creditRoleKeys, ['detail.writing']);
  assert.equal(credits[0].title, 'Movie');
  assert.equal(credits[1].name, 'Series');
  assert.equal('creditRoleKeys' in crew[0], false);
  assert.equal(credits[0].creditRoleKeys.map((key) => translate(key, 'it')).join(' / '), 'Regia / Sceneggiatura');
  assert.equal(credits[0].creditRoleKeys.map((key) => translate(key, 'en')).join(' / '), 'Director / Screenplay');
});

test('acting filmography excludes only cameos with the same media type and retains character roles', () => {
  const cast = [
    { id: 1, mediaType: 'movie', character: 'A cameo' },
    { id: 1, mediaType: 'tv', character: 'A series character' },
    { id: 2, mediaType: 'movie', character: 'A movie character' }
  ];
  const credits = selectPersonCredits({ cast }, [{ mediaId: '1', mediaType: 'movie' }], 'cast');
  assert.deepEqual(credits, [cast[1], cast[2]]);
  assert.deepEqual(selectPersonCredits({}, [], 'crew'), []);
});

test('series exposes unique directors and writers from TMDb aggregated crew and cached model payloads', () => {
  const director = { id: 1, name: 'Director', department: 'Directing', jobs: [{ job: 'Director' }] };
  const writer = { id: 2, name: 'Writer', department: 'Writing', jobs: [{ job: 'Writer' }] };
  const series = new Series({ id: 10, aggregate_credits: { crew: [director, director, writer, { id: 3, job: 'Producer' }] } });
  assert.deepEqual(series.getDirectors(), [director]);
  assert.deepEqual(series.getWriters(), [writer]);
  const cached = new Series(structuredClone(series));
  assert.deepEqual(cached.getDirectors(), [director]);
  assert.deepEqual(cached.getWriters(), [writer]);
  assert.deepEqual(new Series().getDirectors(), []);
  assert.deepEqual(selectCrewByRole([{ name: 'No ID', job: 'Director' }], 'detail.directing'), [{ name: 'No ID', job: 'Director' }]);
});

test('person backend, repository and ViewModel retain movie/TV creative jobs online and offline', async () => {
  const backend = new PersonBackend({
    getPersonDetails: async () => ({ id: 42, name: 'Creative person', known_for_department: 'Directing',
      movie_credits: { cast: [], crew: [{ id: 1, title: 'Movie', job: 'Director', popularity: 10 }, { id: 1, title: 'Movie', job: 'Screenplay', popularity: 10 }] },
      tv_credits: { cast: [], crew: [{ id: 1, name: 'Series', job: 'Writer', popularity: 5 }] } })
  });
  const repository = new PersonRepository(backend, new IndexedDBService());
  const vm = new PersonViewModel(repository);
  await vm.loadPersonFilmography(42);
  assert.equal(vm.state.personProfile.knownForDepartment, 'Directing');
  assert.equal(selectPersonCredits(vm.state.filmography, [], 'crew').length, 2);
  repository.setOnlineOverride(false);
  await vm.loadPersonFilmography(42);
  assert.deepEqual(selectPersonCredits(vm.state.filmography, [], 'crew')[0].creditRoleKeys, ['detail.directing', 'detail.writing']);
  assert.equal(vm.state.error, null);
});

test('filmography normalizes TMDb ratings, votes and dates for cast and crew without marking released works as upcoming', async () => {
  const movie = { id: 1, title: 'Released movie', vote_average: 8.3, vote_count: 90, release_date: '2020-05-01' };
  const series = { id: 2, name: 'Released series', vote_average: 7.6, vote_count: 50, first_air_date: '2021-06-01' };
  const backend = new PersonBackend({ getPersonDetails: async () => ({ id: 42,
    movie_credits: { cast: [movie], crew: [{ ...movie, job: 'Director' }] },
    tv_credits: { cast: [series], crew: [{ ...series, job: 'Writer' }] }
  }) });
  const repository = new PersonRepository(backend, new IndexedDBService());
  const online = await repository.getPersonFilmography({ personId: 42 });
  repository.setOnlineOverride(false);
  const offline = await repository.getPersonFilmography({ personId: 42 });
  for (const result of [online, offline]) {
    for (const list of [result.cast, result.crew]) {
      const film = list.find((item) => item.mediaType === 'movie');
      const tv = list.find((item) => item.mediaType === 'tv');
      assert.equal(film.voteAverage, 8.3);
      assert.equal(film.voteCount, 90);
      assert.equal(film.releaseDate, '2020-05-01');
      assert.equal(film.upcoming, false);
      assert.equal(tv.voteAverage, 7.6);
      assert.equal(tv.firstAirDate, '2021-06-01');
      assert.equal(tv.upcoming, false);
    }
  }
});

test('raw TMDb genres exclude documentaries, talk shows, reality and news from acting and creative filmography, including old cache', async () => {
  const excluded = [99, 10767, 10764, 10763].map((genre, index) => ({
    id: index + 1, name: `Excluded ${index}`, genre_ids: [genre], mediaType: 'tv', job: 'Director'
  }));
  const fiction = { id: 5, name: 'Narrative series', genre_ids: [18], mediaType: 'tv', job: 'Writer' };
  const all = [...excluded, fiction];
  const backend = new PersonBackend({ getPersonDetails: async () => ({ id: 42, name: 'Person',
    tv_credits: { cast: all, crew: all }, movie_credits: { cast: [], crew: [] } }) });
  const storage = new IndexedDBService();
  const repository = new PersonRepository(backend, storage);
  const online = await repository.getPersonFilmography({ personId: 42 });
  assert.deepEqual(online.cast.map((item) => item.id), [5]);
  assert.deepEqual(online.crew.map((item) => item.id), [5]);

  const [query] = await storage.getAll(STORES.QUERIES);
  query.data.cast.push(...excluded);
  query.data.crew.push(...excluded);
  await storage.put(STORES.QUERIES, query);
  repository.setOnlineOverride(false);
  const cached = await repository.getPersonFilmography({ personId: 42 });
  assert.deepEqual(selectPersonCredits(cached, [], 'cast').map((item) => item.id), [5]);
  assert.deepEqual(selectPersonCredits(cached, [], 'crew').map((item) => item.id), [5]);
  assert.equal(isExcludedMedia({ genreIds: [], genre_ids: ['99'] }), true);
  assert.equal(isExcludedMedia({ genres: [{ id: 10767 }] }), true);
  assert.equal(isExcludedMedia({ genre_ids: [35], character: 'Self' }), false);
});
