import { generatePath } from 'react-router-dom';

const BASE = '/Cameos';

const normalizePathname = (pathname = '') =>
  pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

// Percorsi statici pronti per <Link to={...}> e navigate(...)
// `home`, `homeRoot` e `movies` puntano tutti alla pagina principale dei film (<Movies />).
const STATIC_ROUTES = {
  homeRoot: BASE,
  home: `${BASE}/`,
  movies: `${BASE}/movies`,
  series: `${BASE}/series`,
  tv: `${BASE}/tv`,
  search: `${BASE}/search`,
  friends: `${BASE}/friends`,
  profile: `${BASE}/profile`,
  profileReviews: `${BASE}/profile/reviews`,
  login: `${BASE}/login`
};

// Template parametrici per <Route path={...}> e matchPath(...)
const ROUTE_PATTERNS = {
  moviesCategory: `${STATIC_ROUTES.movies}/category/:category`,
  movieDetail: `${BASE}/movie/:id`,
  seriesCategory: `${STATIC_ROUTES.series}/category/:category`,
  seriesDetail: `${STATIC_ROUTES.series}/:id`,
  seriesSeason: `${STATIC_ROUTES.series}/:id/season/:seasonNumber`,
  seriesEpisode: `${STATIC_ROUTES.series}/:id/season/:seasonNumber/episode/:episodeNumber`,
  personDetail: `${BASE}/person/:id`,
  actorDetail: `${BASE}/actor/:id`,
  profileUser: `${STATIC_ROUTES.profile}/:uid`,
  profileReviewsUser: `${STATIC_ROUTES.profile}/:uid/reviews`,
  profileCollection: `${STATIC_ROUTES.profile}/collection/:collection`,
  profileCollectionUser: `${STATIC_ROUTES.profile}/:uid/collection/:collection`
};

/**
 * Mappa centralizzata delle route dell'applicazione:
 * URL statici + patterns + builder basati su `generatePath` + helper di match canonici.
 */
export const APP_ROUTES = {
  ...STATIC_ROUTES,
  patterns: ROUTE_PATTERNS,

  /**
   * Normalizza un pathname rimuovendo eventuali slash finali superflui.
   * @param {string} [pathname='']
   * @returns {string}
   */
  normalizePath: normalizePathname,

  /**
   * True quando il path corrisponde alla home / pagina principale Film (`/`, `/Cameos`, `/Cameos/`, `/Cameos/movies`).
   * @param {string} [pathname='']
   * @returns {boolean}
   */
  isMoviesHome: (pathname = '') => {
    const normalized = normalizePathname(pathname);
    return normalized === '/'
      || normalized === STATIC_ROUTES.homeRoot
      || normalized === STATIC_ROUTES.movies;
  },

  /**
   * True quando il path appartiene alla sezione Serie TV (`/Cameos/series*`, `/Cameos/tv*`).
   * @param {string} [pathname='']
   * @returns {boolean}
   */
  isSeriesSection: (pathname = '') => {
    const normalized = normalizePathname(pathname);
    return normalized === STATIC_ROUTES.series
      || normalized.startsWith(`${STATIC_ROUTES.series}/`)
      || normalized === STATIC_ROUTES.tv
      || normalized.startsWith(`${STATIC_ROUTES.tv}/`);
  },

  /** @param {string|number} id @returns {string} */
  movie: (id) => generatePath(ROUTE_PATTERNS.movieDetail, { id: String(id) }),

  /**
   * @param {string|number} id
   * @param {string|number|null} [seasonNumber]
   * @returns {string}
   */
  seriesOf: (id, seasonNumber = undefined) => {
    const parsedSeason = Number(seasonNumber);
    return Number.isInteger(parsedSeason) && parsedSeason >= 1
      ? generatePath(ROUTE_PATTERNS.seriesSeason, { id: String(id), seasonNumber: String(parsedSeason) })
      : generatePath(ROUTE_PATTERNS.seriesDetail, { id: String(id) });
  },

  /**
   * @param {string|number} seriesId
   * @param {string|number} seasonNumber
   * @param {string|number} episodeNumber
   * @returns {string}
   */
  episode: (seriesId, seasonNumber, episodeNumber) =>
    generatePath(ROUTE_PATTERNS.seriesEpisode, {
      id: String(seriesId),
      seasonNumber: String(seasonNumber),
      episodeNumber: String(episodeNumber)
    }),

  /**
   * @param {'movie'|'tv'|'movies'|'series'|string} mediaType
   * @param {string} category
   * @returns {string}
   */
  category: (mediaType, category) =>
    generatePath(
      mediaType === 'movie' || mediaType === 'movies'
        ? ROUTE_PATTERNS.moviesCategory
        : ROUTE_PATTERNS.seriesCategory,
      { category }
    ),

  /**
   * @param {string|number} id
   * @param {string|null} [credits]
   * @returns {string}
   */
  person: (id, credits = undefined) => {
    const path = generatePath(ROUTE_PATTERNS.personDetail, { id: String(id) });
    return credits ? `${path}?${new URLSearchParams({ credits })}` : path;
  },

  /**
   * @param {string} [query='']
   * @param {string} [filter='all']
   * @returns {string}
   */
  searchQuery: (query = '', filter = 'all') =>
    `${STATIC_ROUTES.search}?${new URLSearchParams({ q: query, filter })}`,


  /** @param {string|null} [uid] @returns {string} */
  profileOf: (uid = undefined) =>
    (uid ? generatePath(ROUTE_PATTERNS.profileUser, { uid }) : STATIC_ROUTES.profile),


  /** @param {string|null} [uid] @returns {string} */
  profileReviewsOf: (uid = undefined) =>
    (uid ? generatePath(ROUTE_PATTERNS.profileReviewsUser, { uid }) : STATIC_ROUTES.profileReviews),


  /**
   * @param {string} sectionKey
   * @param {string|null} [uid]
   * @returns {string}
   */
  profileCollectionOf: (sectionKey, uid = undefined) => {
    const collection = sectionKey === 'favourites' ? 'favorites' : sectionKey;
    return uid
      ? generatePath(ROUTE_PATTERNS.profileCollectionUser, { uid, collection })
      : generatePath(ROUTE_PATTERNS.profileCollection, { collection });
  }
};
