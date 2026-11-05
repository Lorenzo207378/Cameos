/**
 * @typedef {Object} MediaSearchParams
 * @property {'title'|'genre'|'actor'|'director'} [searchBy='title']
 * @property {string} [query] Title, localized genre name, or person name.
 * @property {number|string} [genreId] Genre ID or comma/pipe-separated genre IDs.
 * @property {number|string} [personId] Person ID; takes precedence over the name.
 * @property {number} [page=1]
 * @property {string} [language]
 */

/** Normalize the search contract before remote access or cache lookup. */
export function normalizeMediaSearch({ searchBy = 'title', query = '', genreId, personId, page = 1, language } = {}) {
  if (!['title', 'genre', 'actor', 'director'].includes(searchBy)) {
    throw new Error(`Unsupported search criterion: ${searchBy}`);
  }
  page = Number(page);
  if (!Number.isInteger(page) || page < 1) throw new Error('page must be a positive integer');
  query = String(query ?? '').trim();
  if (searchBy === 'genre') {
    genreId = genreId == null ? '' : String(genreId).trim();
    if (!genreId && !query) throw new Error('genreId or query is required');
    if (genreId && !/^\d+(?:[,|]\d+)*$/.test(genreId)) throw new Error('Invalid genreId');
    if (genreId && genreId.split(/[,|]/).some((id) => Number(id) <= 0)) throw new Error('Invalid genreId');
  }
  if (searchBy === 'actor' || searchBy === 'director') {
    if (personId != null) {
      personId = Number(personId);
      if (!Number.isSafeInteger(personId) || personId <= 0) throw new Error('Invalid personId');
    }
    if (personId == null && !query) throw new Error('personId or query is required');
  }
  return {
    searchBy, query, page, language,
    ...(searchBy === 'genre' && genreId ? { genreId } : {}),
    ...((searchBy === 'actor' || searchBy === 'director') && personId != null ? { personId } : {})
  };
}

export function emptySearchPage(page = 1) {
  return { page, results: [], total_pages: 0, total_results: 0 };
}

const SEARCH_FILTERS = Object.freeze(['all', 'title', 'actor', 'director', 'genre']);
export const MAX_GENRE_MATCHES = 4;
const MAX_GENRE_DISTANCE = 2;
export const MAX_SEARCH_PAGE_BATCH = 3;

export function normalizeSearchRequest(query = '', filter = 'all') {
  return { query: String(query).trim(), filter: SEARCH_FILTERS.includes(filter) ? filter : 'all' };
}

function normalizePattern(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/** Edit distance to the best matching substring, so partial genre names remain useful. */
function patternDistance(query, name) {
  let previous = Array(name.length + 1).fill(0);
  for (let row = 1; row <= query.length; row++) {
    const current = [row];
    for (let column = 1; column <= name.length; column++) {
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1,
        previous[column - 1] + (query[row - 1] === name[column - 1] ? 0 : 1));
    }
    previous = current;
  }
  return Math.min(...previous);
}

/** Match only close localized genres; combine the movie/TV entries for the same genre ID. */
export function matchSearchGenres(query, genres) {
  const pattern = normalizePattern(query);
  if (pattern.length < 2) return [];
  const maxDistance = Math.min(MAX_GENRE_DISTANCE, Math.floor(pattern.length / 4));
  const matches = new Map();
  for (const genre of genres) {
    const name = normalizePattern(genre.name);
    const distance = patternDistance(pattern, name);
    if (distance > maxDistance) continue;
    const existing = matches.get(genre.id);
    matches.set(genre.id, existing
      ? { ...existing, mediaTypes: [...new Set([...existing.mediaTypes, genre.mediaType])] }
      : { id: genre.id, name: genre.name, distance, mediaTypes: [genre.mediaType] });
  }
  return [...matches.values()].sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name))
    .slice(0, MAX_GENRE_MATCHES);
}
