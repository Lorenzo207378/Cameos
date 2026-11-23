import assert from 'node:assert/strict';
import test from 'node:test';
import { SeriesViewModel } from '../src/viewmodel/series/SeriesViewModel.js';
import { SeriesBackend } from '../src/backend/series/SeriesBackend.js';
import { findUpcomingSeason } from '../src/backend/series/upcomingSeason.js';
import { Series } from '../src/models/Series.js';
import { SERIES_CATEGORY_CONFIG } from '../src/utils/media/mediaCategoryConfig.js';
import { getSeriesCarouselSections } from '../src/utils/media/mediaCategoryPresentation.js';
import { translate } from '../src/utils/language/translations.js';

test('SERIES_CATEGORY_CONFIG fetch order matches getSeriesCarouselSections visual order, places kids between family and warPolitics, and supports slice input', () => {
  const tIt = (key) => translate(key, 'it');
  const tEn = (key) => translate(key, 'en');

  const slice = {
    upcomingSeries: [new Series({ id: 1, name: 'Upcoming' })],
    categorySeries: {
      crime: [new Series({ id: 2, name: 'Crime' })],
      kids: [new Series({ id: 3, name: 'Kids Show' })]
    }
  };

  const sectionsIt = getSeriesCarouselSections(slice, tIt);
  const sectionsEn = getSeriesCarouselSections(slice, tEn);
  const configKeys = Object.keys(SERIES_CATEGORY_CONFIG);
  const sectionKeys = sectionsIt.map((section) => section.key);

  assert.deepEqual(
    configKeys,
    sectionKeys,
    'Series fetch priority order must match visual display order 1:1'
  );

  // Kids must appear strictly after family and before warPolitics
  const familyIdx = sectionKeys.indexOf('family');
  const kidsIdx = sectionKeys.indexOf('kids');
  const warIdx = sectionKeys.indexOf('warPolitics');
  assert.ok(familyIdx > 0 && kidsIdx === familyIdx + 1 && warIdx === kidsIdx + 1, 'kids must be ordered right after family and before warPolitics');

  // Dead endpoint property must not remain in SERIES_CATEGORY_CONFIG
  for (const config of Object.values(SERIES_CATEGORY_CONFIG)) {
    assert.equal('endpoint' in config, false, `Unexpected dead endpoint property on ${config.key}`);
  }

  // Slice items resolved properly and legacy full-VM fallback remains compatible
  assert.equal(sectionsIt[0].items[0].id, 1);
  assert.equal(sectionsIt[1].items[0].id, 2);
  assert.equal(sectionsIt[kidsIdx].items[0].id, 3);
  const legacySections = getSeriesCarouselSections({ upcomingSeries: [], kidsSeries: [new Series({ id: 9, name: 'Legacy Kids' })] }, tIt);
  assert.equal(legacySections[kidsIdx].items[0].id, 9);

  // Every section must have distinct, localized, non-empty title and subtitle in both IT and EN
  for (const [lang, sections] of [['it', sectionsIt], ['en', sectionsEn]]) {
    for (const section of sections) {
      assert.ok(section.title && !section.title.startsWith('carousels.'), `${lang}.${section.key} missing localized title`);
      assert.ok(section.subtitle && !section.subtitle.startsWith('carousels.'), `${lang}.${section.key} missing localized subtitle`);
      assert.notEqual(section.title.toLowerCase(), section.subtitle.toLowerCase(), `${lang}.${section.key} subtitle must not repeat title`);
    }
  }
});

test('SeriesViewModel: loadTrendingSeries defaults to onlyReleased:true and revisit with retainPages never flashes loading:true', async () => {
  const trendingCalls = [];
  let shouldFail = false;
  const repo = {
    async getTrendingSeries(params) {
      trendingCalls.push(params);
      return { page: 1, total_pages: 1, total_results: 1, results: [new Series({ id: 10, name: 'Trending' })] };
    },
    async getSeriesByCategory(_key, { page = 1 }) {
      if (shouldFail) throw new Error('Series category offline');
      return { page, total_pages: 5, results: [new Series({ id: page, name: `Crime ${page}` })] };
    }
  };

  const vm = new SeriesViewModel(/** @type {any} */ (repo), { language: 'it-IT' });

  // Direct call to loadTrendingSeries (like retry) must default onlyReleased:true matching MovieViewModel
  await vm.loadTrendingSeries();
  assert.equal(trendingCalls.length, 1);
  assert.equal(trendingCalls[0].timeWindow, 'month');
  assert.equal(trendingCalls[0].onlyReleased, true);
  assert.equal(trendingCalls[0].language, 'it-IT');

  // Revisit with retainPages:true in same language never flashes loading:true
  await vm.loadSeriesFromCategory('crime', { initialPages: 2, language: 'it-IT', retainPages: true });
  assert.equal(vm.state.crimeSeries.length, 2);
  const revisitLoading = [];
  const unsub = vm.subscribe(() => revisitLoading.push(vm.state.categoryPagination.crime?.loading));
  await vm.loadSeriesFromCategory('crime', { initialPages: 2, language: 'it-IT', retainPages: true });
  unsub();
  assert.ok(revisitLoading.every((flag) => flag === false), 'Series revisit with retained items must never flash loading:true');

  // Failed background revalidation preserves existing items and clears loading
  shouldFail = true;
  await vm.loadSeriesFromCategory('crime', { initialPages: 2, language: 'it-IT', retainPages: true });
  assert.equal(vm.state.crimeSeries.length, 2);
  assert.equal(vm.state.categoryPagination.crime.loading, false);
  assert.equal(vm.state.categoryPagination.crime.error, 'Series category offline');
});

test('SeriesBackend.getUpcomingSeries uses bilingual discoverTv for returning series and avoids hardcoded Italian season labels', async () => {
  let discoverTvCalled = false;
  const backend = new SeriesBackend(/** @type {any} */ ({
    async getUpcomingSeries() {
      return { page: 1, total_pages: 1, total_results: 0, results: [] };
    },
    async discoverTv() {
      discoverTvCalled = true;
      return {
        page: 1,
        total_pages: 1,
        total_results: 1,
        results: [{ id: 50, names: { it: 'Serie IT', en: 'Series EN' }, first_air_date: '2020-01-01' }]
      };
    },
    async fetch() {
      return {
        status: 'Returning Series',
        first_air_date: '2020-01-01',
        seasons: [{ season_number: 3, name: 'Stagione 3', air_date: '2099-06-01' }]
      };
    }
  }));

  const res = await backend.getUpcomingSeries({ page: 1, language: 'it-IT' });
  assert.equal(discoverTvCalled, true, 'Returning series must use bilingual discoverTv');
  assert.equal(res.results.length, 1);
  assert.equal(res.results[0].getName('it'), 'Serie IT');
  assert.equal(res.results[0].getName('en'), 'Series EN');
  assert.deepEqual(res.results[0].upcomingSeason, { seasonNumber: 3, name: null, airDate: '2099-06-01' });

  // Custom season titles are preserved while generic or missing labels defer to localized UI formatting
  assert.equal(
    findUpcomingSeason({ firstAirDate: '2020-01-01' }, { seasons: [{ season_number: 2, name: 'Season 2', air_date: '2099-01-01' }] }, '2030-01-01')?.name,
    null
  );
  assert.equal(
    findUpcomingSeason({ firstAirDate: '2020-01-01' }, { next_episode_to_air: { season_number: 4, episode_number: 1, air_date: '2099-01-01' } }, '2030-01-01')?.name,
    null
  );
  assert.equal(
    findUpcomingSeason({ firstAirDate: '2020-01-01' }, { seasons: [{ season_number: 2, name: 'Final Chapter', air_date: '2099-01-01' }] }, '2030-01-01')?.name,
    'Final Chapter'
  );

  // loadUpcomingSeries populates both upcomingSeries and categorySeries.upcoming uniformly
  const vm = new SeriesViewModel(/** @type {any} */ ({
    async getUpcomingSeries({ page }) {
      return { page, total_pages: 1, results: [new Series({ id: 800, name: 'Upcoming Series', first_air_date: '2099-01-01' })] };
    }
  }));
  await vm.loadUpcomingSeries({ language: 'it-IT' });
  assert.equal(vm.state.upcomingSeries.length, 1);
  assert.deepEqual(vm.state.categorySeries.upcoming, vm.state.upcomingSeries);
});
