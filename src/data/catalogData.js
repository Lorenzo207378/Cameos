import discoverMoviesSample from '../../docs/api-samples/6_discover_movie.json';
import movieDetailsSample from '../../docs/api-samples/7_movie_details_299534.json';
import discoverTvSample from '../../docs/api-samples/1_discover_tv.json';
import seriesDetailsSample from '../../docs/api-samples/2_series_details_1396.json';
import seasonDetailsSample from '../../docs/api-samples/3_season_details_1418_s3.json';
import episodeDetailsSample from '../../docs/api-samples/4_episode_details_1418_s3_e16.json';
import personDetailsSample from '../../docs/api-samples/5_person_details_7624.json';

import { apiService } from '../service/ApiService.js';
import {
  Movie,
  Series,
  Season,
  Episode,
  Person,
  Cameo,
  Review
} from '../models/index.js';

// Clone and enrich raw sample fixtures with TMDB image URLs
const rawMovies = apiService._enrichWithImageUrls(structuredClone(discoverMoviesSample.results || []));
const rawMovie299534 = apiService._enrichWithImageUrls(structuredClone(movieDetailsSample));
const rawTvList = apiService._enrichWithImageUrls(structuredClone(discoverTvSample.results || []));
const rawSeries1396 = apiService._enrichWithImageUrls(structuredClone(seriesDetailsSample));
const rawSeason3734 = apiService._enrichWithImageUrls(structuredClone(seasonDetailsSample));
const rawEpisode64692 = apiService._enrichWithImageUrls(structuredClone(episodeDetailsSample));
const rawPerson7624 = apiService._enrichWithImageUrls(structuredClone(personDetailsSample));

// Additional curated cameo entries
export const CURATED_CAMEOS = [
  {
    id: 7624,
    name: 'Stan Lee',
    character: 'Autista di furgone 1970s / Leggenda Marvel',
    mediaId: 299534,
    mediaType: 'movie',
    mediaTitle: 'Avengers: Endgame',
    role: 'Ultimo cameo leggendario nel MCU: ringiovanito digitalmente come pacifista degli anni 70 che grida "Fate l\'amore, non fate la guerra!"',
    badge: 'Cameo Storico',
    isCameoHighlight: true,
    popularity: 98.5,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/kKeyWoFtTqOPsbmwylNHmuB3En9.jpg',
      en: 'https://image.tmdb.org/t/p/w185/kKeyWoFtTqOPsbmwylNHmuB3En9.jpg'
    }
  },
  {
    id: 7624,
    name: 'Stan Lee',
    character: 'Se Stesso (In vestaglia a casa sua)',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    mediaType: 'episode',
    mediaTitle: 'The Big Bang Theory - Ep. 3x16',
    role: 'Sheldon e Penny vanno a casa di Stan Lee senza invito: Stan apre la porta in vestaglia con il logo Fantastici Quattro e chiama la polizia.',
    badge: 'Guest Star Cult',
    isCameoHighlight: true,
    popularity: 98.5,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/kKeyWoFtTqOPsbmwylNHmuB3En9.jpg',
      en: 'https://image.tmdb.org/t/p/w185/kKeyWoFtTqOPsbmwylNHmuB3En9.jpg'
    }
  },
  {
    id: 1892,
    name: 'Matt Damon',
    character: 'Dr. Mann',
    mediaId: 157336,
    mediaType: 'movie',
    mediaTitle: 'Interstellar',
    role: 'Cameo a sorpresa segreto: non accreditato nella campagna promozionale e nei trailer fino all\'uscita nei cinema.',
    badge: 'Top Secret Cameo',
    isCameoHighlight: true,
    popularity: 88.0,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/elSlNg0WqjGExLlgj2euXENTGJ.jpg',
      en: 'https://image.tmdb.org/t/p/w185/elSlNg0WqjGExLlgj2euXENTGJ.jpg'
    }
  },
  {
    id: 1892,
    name: 'Matt Damon',
    character: 'Attore Asgardiano (Loki a teatro)',
    mediaId: 284053,
    mediaType: 'movie',
    mediaTitle: 'Thor: Ragnarok',
    role: 'Interpreta in modo esilarante l\'attore che recita la morte teatrale di Loki ad Asgard davanti a Odino.',
    badge: 'Cameo Comico',
    isCameoHighlight: true,
    popularity: 88.0,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/elSlNg0WqjGExLlgj2euXENTGJ.jpg',
      en: 'https://image.tmdb.org/t/p/w185/elSlNg0WqjGExLlgj2euXENTGJ.jpg'
    }
  },
  {
    id: 287,
    name: 'Brad Pitt',
    character: 'Vanisher (Il Svanitore)',
    mediaId: 383498,
    mediaType: 'movie',
    mediaTitle: 'Deadpool 2',
    role: 'Appare letteralmente per 8 fotogrammi (mezzo secondo) mentre viene fulminato sui fili elettrici.',
    badge: 'Flash Cameo (1 sec)',
    isCameoHighlight: true,
    popularity: 92.4,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/cckcYc2v0yh1tc9QjRelptsqoS4.jpg',
      en: 'https://image.tmdb.org/t/p/w185/cckcYc2v0yh1tc9QjRelptsqoS4.jpg'
    }
  },
  {
    id: 2888,
    name: 'David Bowie',
    character: 'Se Stesso (Giudice di sfilata)',
    mediaId: 9398,
    mediaType: 'movie',
    mediaTitle: 'Zoolander',
    role: 'Giudice impeccabile e arbitro della sfida di moda tra Derek Zoolander e Hansel.',
    badge: 'Iconic Cameo',
    isCameoHighlight: true,
    popularity: 85.0,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/iO4k346mC78Zq84zX23FvB2k7mC.jpg',
      en: 'https://image.tmdb.org/t/p/w185/iO4k346mC78Zq84zX23FvB2k7mC.jpg'
    }
  },
  {
    id: 138,
    name: 'Quentin Tarantino',
    character: 'Jimmie Dimmick',
    mediaId: 680,
    mediaType: 'movie',
    mediaTitle: 'Pulp Fiction',
    role: 'Il regista appare nei panni dell\'amico preoccupato che accoglie Jules e Vincent per nascondere l\'auto.',
    badge: 'Cameo del Regista',
    isCameoHighlight: true,
    popularity: 89.2,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/1gjcpEr99G48ZNGJuFKa8qXp6fV.jpg',
      en: 'https://image.tmdb.org/t/p/w185/1gjcpEr99G48ZNGJuFKa8qXp6fV.jpg'
    }
  },
  {
    id: 27428,
    name: 'Charlie Cox',
    character: 'Matt Murdock / Daredevil',
    mediaId: 634649,
    mediaType: 'movie',
    mediaTitle: 'Spider-Man: No Way Home',
    role: 'Avvocato cieco che aiuta Peter Parker e afferra un mattone volante: "Sono un ottimo avvocato."',
    badge: 'Multiverso Cameo',
    isCameoHighlight: true,
    popularity: 91.0,
    profileUrl: {
      it: 'https://image.tmdb.org/t/p/w185/eD8YtL6lOq1c8M5m4tE4vH8sWq1.jpg',
      en: 'https://image.tmdb.org/t/p/w185/eD8YtL6lOq1c8M5m4tE4vH8sWq1.jpg'
    }
  }
];

// Rich curated mock community reviews
export const INITIAL_COMMUNITY_REVIEWS = [
  {
    id: 'rev_comm_1',
    uid: 'user_clara_99',
    username: 'Clara Cinefila',
    userPhotoURL: null,
    targetKey: 'movie:299534',
    mediaType: 'movie',
    mediaId: 299534,
    rating: 5,
    text: 'Il miglior finale possibile per dieci anni di MCU. Il cameo di Stan Lee negli anni 70 fa venire i brividi ad ogni visione.',
    likes: ['user_marco_44', 'user_elena_12', 'user_samuele_7'],
    createdAt: '2026-03-10T14:20:00.000Z'
  },
  {
    id: 'rev_comm_2',
    uid: 'user_marco_44',
    username: 'Marco Movies',
    userPhotoURL: null,
    targetKey: 'movie:299534',
    mediaType: 'movie',
    mediaId: 299534,
    rating: 5,
    text: 'Battaglia finale grandiosa e ritmo perfetto. Tre ore che volano!',
    likes: ['user_clara_99'],
    createdAt: '2026-03-12T18:45:00.000Z'
  },
  {
    id: 'rev_comm_3',
    uid: 'user_elena_12',
    username: 'Elena Rossi',
    userPhotoURL: null,
    targetKey: 'tv:1396',
    mediaType: 'tv',
    mediaId: 1396,
    rating: 5,
    text: 'Capolavoro assoluto della televisione moderna. Bryan Cranston e Aaron Paul leggendari, regia di Vince Gilligan da manuale.',
    likes: ['user_clara_99', 'user_luca_88', 'user_gianni_21'],
    createdAt: '2026-03-01T10:15:00.000Z'
  },
  {
    id: 'rev_comm_4',
    uid: 'user_sheldon_fan',
    username: 'Sheldonologer',
    userPhotoURL: null,
    targetKey: 'episode:1418:3:16',
    mediaType: 'episode',
    mediaId: 1418,
    seasonNumber: 3,
    episodeNumber: 16,
    rating: 5,
    text: 'L\'episodio in cui Sheldon si presenta a casa di Stan Lee è storia della commedia nerd! "La mia vestaglia dei Fantastici 4 non mente."',
    likes: ['user_elena_12', 'user_clara_99'],
    createdAt: '2026-02-28T22:30:00.000Z'
  },
  {
    id: 'rev_comm_5',
    uid: 'user_luca_88',
    username: 'Luca BingeWatcher',
    userPhotoURL: null,
    targetKey: 'tv:1418',
    mediaType: 'tv',
    mediaId: 1418,
    rating: 4,
    text: 'Le prime stagioni sono geniali. Le guest star (Stan Lee, Stephen Hawking, Wil Wheaton) sono il valore aggiunto unico.',
    likes: ['user_sheldon_fan'],
    createdAt: '2026-02-15T09:00:00.000Z'
  }
];

// Instantiated domain models
export const CATALOG_MOVIES = [
  new Movie({
    ...rawMovie299534,
    cameos: CURATED_CAMEOS.filter((c) => c.mediaId === 299534)
  }),
  ...rawMovies
    .filter((m) => m.id !== 299534)
    .map((m) => new Movie({ ...m, cameos: CURATED_CAMEOS.filter((c) => c.mediaId === m.id) }))
];

export const CATALOG_SERIES = [
  new Series({
    ...rawSeries1396,
    vipCameos: CURATED_CAMEOS.filter((c) => c.mediaId === 1396)
  }),
  new Series({
    id: 1418,
    name: 'The Big Bang Theory',
    original_name: 'The Big Bang Theory',
    overview:
      'I fisici Leonard Hofstadter e Sheldon Cooper condividono un appartamento e una profonda passione per la scienza e i fumetti. Le loro vite cambiano quando la bella e solare Penny si trasferisce nell\'appartamento di fronte.',
    first_air_date: '2007-09-24',
    number_of_seasons: 12,
    number_of_episodes: 279,
    vote_average: 8.4,
    vote_count: 11200,
    genres: [
      { id: 35, name: 'Commedia' },
      { id: 18, name: 'Dramma' }
    ],
    posterUrl: {
      it: 'https://image.tmdb.org/t/p/w500/ooBGRQBOGi7v6eh95B04m42bRP.jpg',
      en: 'https://image.tmdb.org/t/p/w500/ooBGRQBOGi7v6eh95B04m42bRP.jpg'
    },
    backdropUrl: {
      it: 'https://image.tmdb.org/t/p/w780/nVRyd8hlg0ZLxRKn0efYmflioJw.jpg',
      en: 'https://image.tmdb.org/t/p/w780/nVRyd8hlg0ZLxRKn0efYmflioJw.jpg'
    },
    vipCameos: CURATED_CAMEOS.filter((c) => c.mediaId === 1418)
  }),
  ...rawTvList
    .filter((t) => t.id !== 1396 && t.id !== 1418)
    .map((t) => new Series({ ...t, vipCameos: CURATED_CAMEOS.filter((c) => c.mediaId === t.id) }))
];

export const CATALOG_SEASON_TBBT_S3 = new Season({
  ...rawSeason3734,
  seriesId: 1418,
  seasonNumber: 3,
  cameos: CURATED_CAMEOS.filter((c) => c.mediaId === 1418 && c.seasonNumber === 3)
});

export const CATALOG_EPISODE_TBBT_S3_E16 = new Episode({
  ...rawEpisode64692,
  seriesId: 1418,
  seasonNumber: 3,
  episodeNumber: 16,
  cameos: CURATED_CAMEOS.filter((c) => c.mediaId === 1418 && c.seasonNumber === 3 && c.episodeNumber === 16)
});

export const CATALOG_PERSON_STAN_LEE = new Person({
  ...rawPerson7624,
  careerCameos: CURATED_CAMEOS.filter((c) => c.id === 7624)
});

// Helper lookups
export function getMovieById(id) {
  const numericId = Number(id);
  return CATALOG_MOVIES.find((m) => m.id === numericId) || null;
}

export function getSeriesById(id) {
  const numericId = Number(id);
  return CATALOG_SERIES.find((s) => s.id === numericId) || null;
}

export function getSeasonDetails(seriesId, seasonNumber) {
  const sId = Number(seriesId);
  const sNum = Number(seasonNumber);
  if (sId === 1418 && sNum === 3) {
    return CATALOG_SEASON_TBBT_S3;
  }
  const series = getSeriesById(sId);
  if (series) {
    const foundSeason = series.seasons?.find((s) => Number(s.seasonNumber) === sNum);
    if (foundSeason) return foundSeason;
    return new Season({
      seriesId: sId,
      seasonNumber: sNum,
      name: `Stagione ${sNum}`,
      episodeCount: 10,
      episodes: Array.from({ length: 10 }, (_, i) => ({
        id: sId * 1000 + sNum * 100 + i + 1,
        seriesId: sId,
        seasonNumber: sNum,
        episodeNumber: i + 1,
        name: `Episodio ${i + 1}`,
        overview: `Trama appassionante per l'episodio ${i + 1} della stagione ${sNum}.`,
        voteAverage: 8.2,
        runtime: 45
      }))
    });
  }
  return null;
}

export function getEpisodeDetails(seriesId, seasonNumber, episodeNumber) {
  const sId = Number(seriesId);
  const sNum = Number(seasonNumber);
  const epNum = Number(episodeNumber);
  if (sId === 1418 && sNum === 3 && epNum === 16) {
    return CATALOG_EPISODE_TBBT_S3_E16;
  }
  const season = getSeasonDetails(sId, sNum);
  const ep = season?.episodes?.find((e) => Number(e.episodeNumber) === epNum);
  return ep ? new Episode(ep) : null;
}

export function getPersonById(id) {
  const numericId = Number(id);
  if (numericId === 7624) return CATALOG_PERSON_STAN_LEE;

  // Search inside movie cast
  for (const m of CATALOG_MOVIES) {
    const actor = m.cast?.find((c) => c.id === numericId);
    if (actor) {
      return new Person({
        id: actor.id,
        name: actor.name,
        profileUrl: actor.profileUrl || { it: actor.profile_path, en: actor.profile_path },
        biography: `${actor.name} è un attore acclamato noto per la sua interpretazione memorabile in ${m.title}.`,
        knownForDepartment: actor.known_for_department || 'Acting',
        popularity: actor.popularity || 75.0,
        careerCameos: CURATED_CAMEOS.filter((c) => c.id === actor.id)
      });
    }
  }

  // Search inside series cast
  for (const s of CATALOG_SERIES) {
    const actor = s.cast?.find((c) => c.id === numericId);
    if (actor) {
      return new Person({
        id: actor.id,
        name: actor.name,
        profileUrl: actor.profileUrl || { it: actor.profile_path, en: actor.profile_path },
        biography: `${actor.name} è un attore versatile noto per il ruolo in ${s.name}.`,
        knownForDepartment: 'Acting',
        popularity: 70.0,
        careerCameos: CURATED_CAMEOS.filter((c) => c.id === actor.id)
      });
    }
  }

  // Fallback person
  return new Person({
    id: numericId,
    name: 'Attore di Cameos',
    biography: 'Biografia e crediti in caricamento dal catalogo di Cameos...',
    knownForDepartment: 'Recitazione',
    popularity: 50.0,
    careerCameos: []
  });
}

export function getCameosForMedia(mediaType, mediaId) {
  const mId = Number(mediaId);
  return CURATED_CAMEOS.filter(
    (c) => c.mediaId === mId && (mediaType ? c.mediaType === mediaType || c.mediaType === 'movie' : true)
  ).map((c) => (c instanceof Cameo ? c : new Cameo(c)));
}

export function getReviewsForTarget(targetKey) {
  return INITIAL_COMMUNITY_REVIEWS.filter((r) => r.targetKey === targetKey).map((r) => new Review(r));
}
