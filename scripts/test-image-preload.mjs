import assert from 'node:assert/strict';
import test from 'node:test';
import { preloadImages } from '../src/utils/imageUtils.js';

function mockImages(t) {
  const original = globalThis.Image;
  const images = [];
  globalThis.Image = class {
    constructor() { images.push(this); }
    decode() { return this.decoded || Promise.resolve(); }
  };
  t.after(() => { globalThis.Image = original; });
  return images;
}

test('image preloading waits for every distinct poster and decoding to finish', async (t) => {
  const images = mockImages(t);
  let ready = 0;
  preloadImages(['profile.jpg', 'movie.jpg', 'movie.jpg', 'series.jpg'], () => ready++);
  assert.equal(images.length, 3);
  let decodeMovie;
  images[1].decoded = new Promise((resolve) => { decodeMovie = resolve; });
  images.forEach((image) => image.onload());
  await Promise.resolve();
  assert.equal(ready, 0);
  decodeMovie();
  await Promise.resolve();
  assert.equal(ready, 1);
});

test('failed posters and decode errors settle while cancellation prevents stale completion', async (t) => {
  const images = mockImages(t);
  let ready = 0;
  preloadImages(['broken.jpg', 'decode-error.jpg'], () => ready++);
  images[0].onerror();
  images[1].decoded = Promise.reject(new Error('Decode failed'));
  images[1].onload();
  await Promise.resolve();
  assert.equal(ready, 1);
  const cancel = preloadImages(['previous-person.jpg'], () => ready++);
  const previous = images[2].onload;
  cancel();
  previous();
  await Promise.resolve();
  assert.equal(ready, 1);
});

test('empty image sets complete asynchronously and support cancellation', async () => {
  let ready = 0;
  const cancel = preloadImages([], () => ready++);
  cancel();
  await Promise.resolve();
  assert.equal(ready, 0);
  preloadImages([], () => ready++);
  await Promise.resolve();
  assert.equal(ready, 1);
});
