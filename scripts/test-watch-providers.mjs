import assert from 'node:assert/strict';
import test from 'node:test';
import { Movie } from '../src/models/Movie.js';
import { Series } from '../src/models/Series.js';
import { WatchProvider } from '../src/models/WatchProvider.js';

for (const Model of [Movie, Series]) {
  test(`${Model.name}: watchProviders uses direct dot access and no getter`, () => {
    const existing = new WatchProvider({ id: 1, name: 'Netflix' });
    const raw = { provider_id: 2, provider_name: 'Amazon Video', logo_path: '/store.png' };
    const blocked = [
      { provider_id: 3, provider_name: 'Prime Video with Ads' },
      { provider_id: 4, provider_name: 'Amazon con pubblicita' },
      { provider_id: 5, provider_name: 'HBO Max Amazon Channel' }
    ];
    const providersList = [existing, raw, ...blocked];
    const media = new Model({ watchProviders: providersList });

    assert.equal(media.getWatchProviders, undefined, 'Model must not have getWatchProviders getter');
    assert.ok(Array.isArray(media.watchProviders), 'media.watchProviders must be an array of formatted categories');
    assert.equal(media.watchProviders.length, 1);
    assert.equal(media.watchProviders[0].key, 'subscription');
    assert.deepEqual(media.watchProviders[0].items.map((p) => p.providerId), [1, 2]);
    assert.equal(media.watchProviders[0].items[0], existing);
    assert.equal(media.watchProviders[0].items[1].displayName, 'Amazon Video Store');
    assert.equal(media.watchProviders[0].items[1].getLogoUrl(), 'https://image.tmdb.org/t/p/w185/store.png');

    const emptyMedia = new Model();
    assert.deepEqual(emptyMedia.watchProviders, []);

    const tmdbMedia = new Model({
      'watch/providers': {
        results: {
          IT: {
            flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }],
            rent: [{ provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.png' }]
          }
        }
      }
    });
    assert.equal(tmdbMedia.getWatchProviders, undefined);
    assert.equal(tmdbMedia.watchProviders.length, 2);
    assert.equal(tmdbMedia.watchProviders[0].key, 'subscription');
    assert.equal(tmdbMedia.watchProviders[1].key, 'rent');
    assert.ok(tmdbMedia.watchProviders[0].items[0] instanceof WatchProvider);
    assert.equal(tmdbMedia.watchProviders[0].items[0].providerId, 8);
  });
}

test('Series: cast assignment is direct without complex mapping', () => {
  const castFromDirect = [{ id: 10, name: 'Direct Actor', character: 'Direct Char' }];
  const s1 = new Series({ cast: castFromDirect });
  assert.equal(s1.cast, castFromDirect);

  const castFromCredits = [{ id: 20, name: 'Credits Actor', character: 'Credits Char' }];
  const s2 = new Series({ credits: { cast: castFromCredits } });
  assert.equal(s2.cast, castFromCredits);

  const castFromAggregate = [{ id: 30, name: 'Aggregate Actor', roles: [{ character: 'Role 1' }] }];
  const s3 = new Series({ aggregate_credits: { cast: castFromAggregate } });
  assert.equal(s3.cast, castFromAggregate);
});
