import assert from 'node:assert/strict';
import test from 'node:test';
import { SearchViewModel } from '../src/viewmodel/search/SearchViewModel.js';
import { getSharedSearchViewModel, resetSharedViewModels } from '../src/viewmodel/useViewModel.js';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { translations } from '../src/utils/language/translations.js';

function createFixture() {
  const calls = [];
  const makeMedia = (type, Model) => ({
    getGenres: async (params = {}) => {
      calls.push({ kind: 'genres', type, ...params });
      return { genres: [{ id: 18, name: 'Dramma' }] };
    },
    [type === 'movie' ? 'searchMovies' : 'searchSeries']: async (params = {}) => {
      calls.push({ kind: 'media', type, ...params });
      return {
        page: params.page,
        total_pages: 2,
        results: [
          new Model({
            id: params.page,
            titles: { it: `Film ${params.page} IT`, en: `Movie ${params.page} EN` },
            names: { it: `Serie ${params.page} IT`, en: `Series ${params.page} EN` },
            popularity: 10
          })
        ]
      };
    }
  });

  let failPeoplePage2 = false;
  const people = {
    searchPeople: async (params = {}) => {
      calls.push({ kind: 'people', ...params });
      if (params.page === 2 && failPeoplePage2) {
        throw new Error('Transient people network error');
      }
      return {
        page: params.page,
        total_pages: 2,
        results: [
          { id: params.page * 10 + 1, name: `Actor P${params.page}`, knownForDepartment: 'Acting' },
          { id: params.page * 10 + 2, name: `Director P${params.page}`, knownForDepartment: 'Directing' }
        ]
      };
    }
  };

  const vm = new SearchViewModel({ movies: makeMedia('movie', Movie), series: makeMedia('tv', Series), people });
  return {
    vm,
    calls,
    setFailPeoplePage2: (value) => { failPeoplePage2 = value; }
  };
}

test('SearchViewModel starts with loading=false and populates titleKey only on static sections', async () => {
  const { vm } = createFixture();
  assert.equal(vm.state.loading, false);
  assert.equal(vm.state.hasSearched, false);

  await vm.search('dram', 'all', 'it-IT');
  const titleKeys = Object.fromEntries(vm.state.sections.map((section) => [section.id, section.titleKey]));
  assert.deepEqual(titleKeys, {
    movie: 'nav.movies',
    tv: 'nav.tvSeries',
    actor: 'search.actors',
    director: 'search.directors',
    'genre-18': null
  });
});

test('people page map evicts rejected promises so retrying loadMore recovers and still shares successful pages', async () => {
  const { vm, calls, setFailPeoplePage2 } = createFixture();
  await vm.search('nolan', 'all', 'it-IT');

  setFailPeoplePage2(true);
  await vm.loadMore('actor');
  assert.equal(vm.state.hasFailures, true);
  assert.equal(vm.state.sections.find((s) => s.id === 'actor').error, true);
  assert.equal(vm.state.sections.find((s) => s.id === 'actor').items.length, 1);

  setFailPeoplePage2(false);
  await Promise.all([vm.loadMore('actor'), vm.loadMore('director')]);
  const actor = vm.state.sections.find((s) => s.id === 'actor');
  const director = vm.state.sections.find((s) => s.id === 'director');
  assert.equal(actor.error, false);
  assert.equal(director.error, false);
  assert.equal(actor.items.length, 2);
  assert.equal(director.items.length, 2);
  assert.equal(vm.state.hasFailures, false);
  // Page 2 failed once and was evicted, then succeeded once shared between actor and director.
  assert.equal(calls.filter((c) => c.kind === 'people' && c.page === 2).length, 2);
});

test('retrySearch forwards force:true to all repositories while initial search and loadMore omit force', async () => {
  const { vm, calls } = createFixture();
  await vm.search('dram', 'all', 'en-US');
  assert.ok(calls.length > 0);
  assert.ok(calls.every((call) => call.force === undefined));

  const beforeLoadMore = calls.length;
  await vm.loadMore('movie');
  assert.ok(calls.slice(beforeLoadMore).every((call) => call.force === undefined));

  const beforeRetry = calls.length;
  await vm.retrySearch();
  const retryCalls = calls.slice(beforeRetry);
  assert.ok(retryCalls.length >= 5);
  assert.ok(retryCalls.every((call) => call.force === true && call.language === 'en-US'));
});

test('getSharedSearchViewModel returns a singleton cleared by resetSharedViewModels', () => {
  resetSharedViewModels();
  const first = getSharedSearchViewModel({ language: 'it-IT' });
  const second = getSharedSearchViewModel({ language: 'en-US' });
  assert.strictEqual(first, second);
  resetSharedViewModels();
  const third = getSharedSearchViewModel({ language: 'it-IT' });
  assert.notStrictEqual(first, third);
  resetSharedViewModels();
});

test('search.all dropdown label is properly localized in IT and EN', () => {
  assert.equal(translations.it.search.all, 'Tutti');
  assert.equal(translations.en.search.all, 'All');
});
