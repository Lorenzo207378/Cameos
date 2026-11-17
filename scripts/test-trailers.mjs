import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiService } from '../src/service/ApiService.js';
import { MovieBackend } from '../src/backend/movies/MovieBackend.js';
import { Movie } from '../src/models/Movie.js';
import { Trailer } from '../src/models/Trailer.js';
import { formatTrailers } from '../src/utils/formatters.js';

test('Trailer builds direct and embed URLs for YouTube and Vimeo without autoplay', () => {
  const yt = new Trailer({ key: 'CcoMZHqxA_U', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'it' });
  assert.equal(yt.directUrl, 'https://www.youtube.com/watch?v=CcoMZHqxA_U');
  assert.equal(yt.embedUrl, 'https://www.youtube.com/embed/CcoMZHqxA_U?rel=0');
  assert.equal(yt.language, 'it');

  const vimeo = new Trailer({ key: '123456', site: 'Vimeo', type: 'Teaser' });
  assert.equal(vimeo.directUrl, 'https://vimeo.com/123456');
  assert.equal(vimeo.embedUrl, 'https://player.vimeo.com/video/123456');
});

test('formatTrailers filters non-trailer types, orders Trailer before Teaser and official first', () => {
  const trailers = formatTrailers({
    it: [
      { id: '1', key: 'clip1', site: 'YouTube', type: 'Clip', official: true },
      { id: '2', key: 'teaserIt', site: 'YouTube', type: 'Teaser', official: true }
    ],
    en: [
      { id: '3', key: 'unofficialEn', site: 'YouTube', type: 'Trailer', official: false },
      { id: '4', key: 'officialEn', site: 'YouTube', type: 'Trailer', official: true }
    ]
  });

  assert.deepEqual(trailers.map((t) => t.key), ['officialEn', 'unofficialEn', 'teaserIt']);
  assert.ok(trailers.every((t) => t instanceof Trailer));
});

test('Movie.getTrailer prefers requested language Trailer, falls back to Teaser then other supported language', () => {
  const movieWithItTeaserAndEnTrailer = new Movie({
    id: 1,
    title: 'Test',
    videosByLanguage: {
      it: [{ key: 'teaserIt', site: 'YouTube', type: 'Teaser', official: true }],
      en: [{ key: 'trailerEn', site: 'YouTube', type: 'Trailer', official: true }]
    }
  });

  assert.equal(movieWithItTeaserAndEnTrailer.getTrailer('it')?.key, 'teaserIt');
  assert.equal(movieWithItTeaserAndEnTrailer.getTrailer('en')?.key, 'trailerEn');

  const movieOnlyEn = new Movie({
    id: 2,
    title: 'Only EN',
    videosByLanguage: {
      it: [],
      en: [{ key: 'teaserEn', site: 'YouTube', type: 'Teaser', official: false }]
    }
  });

  assert.equal(movieOnlyEn.getTrailer('it')?.key, 'teaserEn');

  const rehydrated = new Movie(JSON.parse(JSON.stringify(movieWithItTeaserAndEnTrailer)));
  assert.equal(rehydrated.getTrailer('it')?.directUrl, 'https://www.youtube.com/watch?v=teaserIt');
  assert.equal(rehydrated.getTrailer('en')?.embedUrl, 'https://www.youtube.com/embed/trailerEn?rel=0');
});

test('Movie.getTrailersByPlatform returns one preferred trailer per platform when YouTube and Vimeo are available', () => {
  const movie = new Movie({
    id: 3,
    title: 'Multi Platform',
    videosByLanguage: {
      it: [
        { key: 'ytItTeaser', site: 'YouTube', type: 'Teaser', official: true },
        { key: 'vimeoItTrailer', site: 'Vimeo', type: 'Trailer', official: true }
      ],
      en: [
        { key: 'ytEnTrailer', site: 'YouTube', type: 'Trailer', official: true },
        { key: 'vimeoEnTeaser', site: 'Vimeo', type: 'Teaser', official: true }
      ]
    }
  });

  const platforms = movie.getTrailersByPlatform('it');
  assert.deepEqual(platforms.map((item) => [item.site, item.key]), [
    ['YouTube', 'ytItTeaser'],
    ['Vimeo', 'vimeoItTrailer']
  ]);
});

test('MovieBackend.getMovieDetails appends videos and merges both supported languages', async () => {
  const api = new ApiService({ apiKey: '0'.repeat(32) });
  const requestedUrls = [];
  api._performFetch = async (url) => {
    const parsed = new URL(url);
    requestedUrls.push(parsed);
    const lang = parsed.searchParams.get('language');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 299534,
        title: lang === 'it-IT' ? 'Avengers: Endgame' : 'Avengers: Endgame',
        credits: { cast: [], crew: [] },
        videos: {
          results: lang === 'it-IT'
            ? [{ id: 'it1', key: 'CcoMZHqxA_U', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'it' }]
            : [{ id: 'en1', key: 'TcMBFSGVi1c', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' }]
        }
      })
    };
  };

  const backend = new MovieBackend(api);
  const movie = await backend.getMovieDetails({ movieId: 299534, language: 'it-IT' });

  assert.ok(requestedUrls.every((u) => u.searchParams.get('append_to_response').includes('videos')));
  assert.equal(movie.trailers.length, 2);
  assert.equal(movie.getTrailer('it')?.directUrl, 'https://www.youtube.com/watch?v=CcoMZHqxA_U');
  assert.equal(movie.getTrailer('en')?.embedUrl, 'https://www.youtube.com/embed/TcMBFSGVi1c?rel=0');
});
