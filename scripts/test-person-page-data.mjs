import test from 'node:test';
import assert from 'node:assert/strict';
import { PersonViewModel } from '../src/viewmodel/person/PersonViewModel.js';
import { Person } from '../src/models/Person.js';

test('person page data returns unified acting credits, creative credits and cameos regardless of department', () => {
  const vm = new PersonViewModel({});
  const profile = new Person({ id: 42, name: 'Actor-Director', known_for_department: 'Directing' });
  const cameoMovie = { id: 1, mediaType: 'movie', title: 'Cameo Film', character: 'Himself', job: 'Director' };
  const actingMovie = { id: 2, mediaType: 'movie', title: 'Acting Film', character: 'Lead' };
  const writtenSeries = { id: 3, mediaType: 'tv', name: 'Written Series', job: 'Writer' };
  const cameo = { id: 42, mediaId: 1, mediaType: 'movie' };

  vm.setState({
    personProfile: profile,
    filmography: { profile, cast: [cameoMovie, actingMovie], crew: [cameoMovie, writtenSeries] }
  });

  const data = vm.getPersonPageData(42, [cameo], { language: 'en' });
  assert.equal(data.person, profile);
  // Acting filmography excludes cameos while keeping regular acting roles.
  assert.deepEqual(data.credits.map((item) => item.id), [2]);
  // Creative filmography keeps directing/writing credits even when overlapping with a cameo.
  assert.deepEqual(data.creativeCredits.map((item) => item.id), [1, 3]);
  assert.deepEqual(data.creativeCredits[0].creditRoleKeys, ['detail.directing']);
  assert.deepEqual(data.creativeCredits[1].creditRoleKeys, ['detail.writing']);
  assert.deepEqual(data.cameos, [cameo]);
  // 1 profile + 1 acting + 2 creative + 1 cameo = 5 image sources.
  assert.equal(data.imageSources.length, 5);

  const mismatched = vm.getPersonPageData(99, [], {});
  assert.equal(mismatched.person, null);
  assert.equal(mismatched.credits.length, 0);
  assert.equal(mismatched.creativeCredits.length, 0);
});
