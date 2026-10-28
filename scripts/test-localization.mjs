import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiService } from '../src/service/ApiService.js';
import { CameoBackend } from '../src/backend/cameos/CameoBackend.js';
import { Movie, Series, Season, Episode } from '../src/models/index.js';
import { SUPPORTED_LANGUAGES } from '../src/utils/languages.js';
import {
  enrichWithImageUrls, fetchLanguagesList
} from '../src/service/ApiServiceHelpers.js';

function mockApi(responses, enrich = enrichWithImageUrls) {
  const api = new ApiService({ defaultLanguage: 'en-US' });
  api.calls = [];
  api.fetch = async (endpoint, params) => {
    api.calls.push({ endpoint, params });
    const response = responses[params.language];
    if (response instanceof Error) throw response;
    return enrich(api, structuredClone(response));
  };
  return api;
}

function assertOnlyLists(item) {
  assert.equal(Object.hasOwn(item, 'title'), false);
  assert.equal(Object.hasOwn(item, 'name'), false);
  assert.ok(item.titles);
  assert.ok(item.names);
}

test('lists use the requested order and metadata, merge by ID, and fall back for missing translations', async () => {
  const api = mockApi({
    'it-IT': { page: 1, total_results: 2, results: [{ id: 1, title: 'Uno', overview: 'Trama' }, { id: 2, title: 'Due' }] },
    'en-US': { page: 2, total_results: 2, results: [{ id: 2, title: 'Two' }, { id: 1, title: 'One', overview: '' }] }
  });
  const data = await api.searchMovie({ query: 'test', page: 2 });
  assert.equal(data.page, 2);
  assert.deepEqual(data.results.map((item) => item.id), [2, 1]);
  assert.deepEqual(data.results[1].titles, { it: 'Uno', en: 'One' });
  assert.deepEqual(data.results[1].overview, { it: 'Trama', en: 'Trama' });
  data.results.forEach(assertOnlyLists);
  assert.deepEqual(api.calls.map(({ params }) => params.language), SUPPORTED_LANGUAGES);
  assert.ok(api.calls.every(({ params }) => params.query === 'test' && params.page === 2));
  assert.equal(new Movie(data.results[1]).getTitle('en'), 'One');

  const italian = await fetchLanguagesList(api, '/search/movie', { language: 'IT-it' });
  assert.deepEqual(italian.results.map((item) => item.id), [1, 2]);
});

test('details preserve the language of seasons and episodes when English is primary', async () => {
  const api = mockApi({
    'it-IT': {
      id: 1, name: 'Serie', tagline: 'Slogan IT',
      episodes: [{ episode_number: 1, name: 'Primo', overview: 'Trama', still_path: '/it.jpg' }, { episode_number: 2, name: 'Secondo' }],
      seasons: [{ season_number: 1, name: 'Stagione uno' }]
    },
    'en-US': {
      id: 1, name: 'Series', tagline: 'EN tagline',
      episodes: [{ episode_number: 2, name: 'Second' }, { episode_number: 1, name: 'First', overview: 'Plot', still_path: '/en.jpg' }],
      seasons: [{ season_number: 1, name: 'Season one' }]
    }
  });
  const data = await api.getTvSeriesDetails(1, { append_to_response: 'credits,images' });
  assertOnlyLists(data);
  assert.deepEqual(data.episodes.map((episode) => episode.episode_number), [2, 1]);
  assert.deepEqual(data.episodes[1].names, { it: 'Primo', en: 'First' });
  assert.deepEqual(data.episodes[1].overview, { it: 'Trama', en: 'Plot' });
  assert.match(data.episodes[1].stillUrl.it, /\/it.jpg$/);
  assert.match(data.episodes[1].stillUrl.en, /\/en.jpg$/);
  assert.deepEqual(data.seasons[0].names, { it: 'Stagione uno', en: 'Season one' });
  [...data.episodes, ...data.seasons].forEach(assertOnlyLists);
  assert.equal(new Series(data).getName('en'), 'Series');
  assert.equal(new Season(data.seasons[0]).getName('it'), 'Stagione uno');
  assert.equal(new Episode(data.episodes[1]).getName('en'), 'First');
  assert.equal(data.tagline, 'EN tagline');
  assert.ok(api.calls.every(({ params }) => params.append_to_response === 'credits,images'));
  assert.ok(api.calls.every(({ params }) => params.include_image_language === 'it,en,null'));
});

test('details and episodes tolerate a failed language and preserve the original error when all fail', async () => {
  const failure = new Error('Unavailable');
  const api = mockApi({ 'it-IT': { id: 1, name: 'Episodio', overview: 'Trama' }, 'en-US': failure });
  for (const data of [await api.getEpisodeDetails(1, 1, 1), await api.getSeasonDetails(1, 1)]) {
    assertOnlyLists(data);
    assert.deepEqual(data.names, { it: 'Episodio', en: 'Episodio' });
    assert.deepEqual(data.overview, { it: 'Trama', en: 'Trama' });
  }
  const broken = mockApi({ 'it-IT': failure, 'en-US': new Error('Also unavailable') });
  await assert.rejects(broken.getMovieDetails(1), (error) => error === failure);
  await assert.rejects(broken.getEpisodeDetails(1, 1, 1), (error) => error === failure);
  await assert.rejects(broken.discoverMovie(), (error) => error === failure);
});

test('missing list entries use available text and galleries provide localized and textless images', async () => {
  const api = mockApi({
    'it-IT': { results: [] },
    'en-US': { results: [{ id: 1, name: 'Series' }] }
  });
  const data = await api.discoverTv();
  assert.deepEqual(data.results[0].names, { it: 'Series', en: 'Series' });
  const images = enrichWithImageUrls(api, {
    images: {
      posters: [{ iso_639_1: 'it', file_path: '/italiano.jpg' }, { iso_639_1: 'en', file_path: '/english.jpg' }],
      backdrops: [{ iso_639_1: null, file_path: '/textless.jpg' }]
    },
    poster_path: '/default.jpg', profile_path: '/profile.jpg',
    episodes: [{ still_path: '/still.jpg' }]
  });
  assert.match(images.posterUrl.it, /\/italiano.jpg$/);
  assert.match(images.posterUrl.en, /\/english.jpg$/);
  assert.match(images.backdropUrl.it, /\/textless.jpg$/);
  assert.match(images.profileUrl.en, /\/profile.jpg$/);
  assert.match(images.episodes[0].stillUrl.it, /\/still.jpg$/);
  assert.equal('images' in images, false);
  assert.equal('poster_path' in images, false);
});

test('cameo backends read localized titles while actor names remain intact', async () => {
  const actor = { id: 2, name: 'Actor', character: 'Self', popularity: 20, total_episode_count: 1, roles: [{ character: 'Self' }] };
  const api = mockApi({
    'it-IT': { id: 1, name: 'Titolo IT', credits: { cast: [actor] }, aggregate_credits: { cast: [actor] } },
    'en-US': { id: 1, name: 'EN title', credits: { cast: [actor] }, aggregate_credits: { cast: [actor] } }
  });
  const backend = new CameoBackend(api);
  const { cameos } = await backend.getMovieCameos({ movieId: 1, language: 'en' });
  assert.equal(cameos[0].mediaTitle, 'EN title');
  assert.equal(cameos[0].name, 'Actor');
  const vip = await backend.getSeriesVipCameos({ seriesId: 1, language: 'it' });
  assert.equal(vip[0].mediaTitle, 'Titolo IT');
  assert.equal(vip[0].name, 'Actor');
});

test('adding a third language to configuration extends fetching, merging, images and text resolution', async () => {
  // Load isolated modules with a different configuration, without changing project files.
  const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  const config = await readFile(new URL('../src/utils/languages.js', import.meta.url), 'utf8');
  const configUrl = moduleUrl(config.replace("['it-IT', 'en-US']", "['it-IT', 'en-US', 'fr-FR']"));
  const utils = await readFile(new URL('../src/models/modelUtils.js', import.meta.url), 'utf8');
  const utilsUrl = moduleUrl(utils.replace('../utils/languages.js', configUrl));
  const helpers = await readFile(new URL('../src/service/ApiServiceHelpers.js', import.meta.url), 'utf8');
  const localized = await import(moduleUrl(helpers
    .replace('../utils/languages.js', configUrl)
    .replace('../models/modelUtils.js', utilsUrl)
    .replace('../models/index.js', utilsUrl)));
  const { normalizeLanguagesText, resolveLocalizedText, resolveLocalizedImage, normalizeLanguage } = await import(utilsUrl);
  const responses = Object.fromEntries(['it-IT', 'en-US', 'fr-FR'].map((locale) => [locale, {
    id: 1, title: locale, overview: locale, results: [{ id: 1, title: locale }],
    episodes: [{ episode_number: 1, name: locale }],
    images: { posters: [{ iso_639_1: locale.slice(0, 2), file_path: `/${locale}.jpg` }] }
  }]));
  const api = mockApi(responses, localized.enrichWithImageUrls);
  const list = await localized.fetchLanguagesList(api, '/list', { language: 'fr-FR' });
  assert.deepEqual(list.results[0].titles, { it: 'it-IT', en: 'en-US', fr: 'fr-FR' });
  const detail = await localized.fetchLanguagesDetail(api, '/detail', 'credits', { language: 'fr-FR' });
  assert.deepEqual(detail.episodes[0].names, { it: 'it-IT', en: 'en-US', fr: 'fr-FR' });
  assert.match(detail.posterUrl.fr, /\/fr-FR.jpg$/);
  assert.ok(api.calls.filter(({ endpoint }) => endpoint === '/detail').every(({ params }) => params.include_image_language === 'it,en,fr,null'));
  const episode = await localized.fetchLanguagesEpisode(api, '/episode', { language: 'fr-FR' });
  assert.equal(episode.names.fr, 'fr-FR');
  assert.equal(resolveLocalizedText(normalizeLanguagesText(detail.titles), 'fr-FR'), 'fr-FR');
  assert.match(resolveLocalizedImage(detail.posterUrl, 'fr'), /\/fr-FR.jpg$/);
  assert.equal(normalizeLanguage('fr'), 'fr-FR');
  assert.equal(api.calls.length, 9);
});
