import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Person, isMediaUpcoming, isExcludedMedia, normalizeMediaMetrics } from '../../models/utils/index.js';
import { BaseBackend } from '../BaseBackend.js';

/** Project a credit into the common filmography shape while retaining its original fields. */
function mapFilmographyCredit(item, mediaType) {
  return {
    ...item,
    ...normalizeMediaMetrics(item),
    ...(mediaType === 'movie' ? { name: item.title, first_air_date: item.release_date } : {}),
    media_type: mediaType,
    mediaType,
    releaseDate: item.releaseDate || item.release_date || null,
    firstAirDate: item.firstAirDate || (mediaType === 'movie' ? item.releaseDate || item.release_date : item.first_air_date) || null,
    posterUrl: item.posterUrl || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null),
    upcoming: isMediaUpcoming(item)
  };
}

/**
 * PersonBackend
 * Scope: Handles actor profiles, biographies, career filmography, and voice acting credits.
 * Transforms UI parameters into TMDB Person API calls via ApiService and returns typed domain models (Person).
 */
export class PersonBackend extends BaseBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    super(apiService);
  }

  /** Search person names without resolving the query to a single individual. */
  async searchPeople({ query = '', page = 1, language } = {}) {
    query = query.trim();
    if (!query) return { page: 1, total_pages: 0, total_results: 0, results: [] };
    const data = await this.apiService.searchPeople({ query, page, language });
    return this._mapPaginatedResults(data, (item) => new Person(item));
  }

  /**
   * Get person details (biography, birthday, profile image) + complete TV & Movie credits as domain Model
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {boolean} [params.appendCredits=true]
   * @param {string} [params.language]
   * @returns {Promise<Person>}
   */
  async getPersonProfile({ personId, appendCredits = true, language } = {}) {
    if (!personId) throw new Error('personId is required');

    const data = await this.apiService.getPersonDetails(personId, {
      append_to_response: appendCredits ? 'tv_credits,movie_credits' : '',
      language
    });

    return new Person(data);
  }

  /**
   * Get person filmography sorted by popularity or release date.
   * Automatically excludes non-narrative media (documentaries, talk shows, reality, news) to keep only scripted fiction.
   * @param {Object} [params={}]
   * @param {number|string} [params.personId]
   * @param {string} [params.mediaType='all']
   * @param {string} [params.sortBy='popularity']
   * @param {string} [params.language]
   * @returns {Promise<{ profile: Person, cast: Array<Object>, crew: Array<Object> }>}
   */
  async getPersonFilmography({ personId, mediaType = 'all', sortBy = 'popularity', language } = {}) {
    const profile = await this.getPersonProfile({ personId, appendCredits: true, language });

    const cast = [];
    const crew = [];

    for (const [type, credits] of [['tv', profile.tvCredits], ['movie', profile.movieCredits]]) {
      if (mediaType !== 'all' && mediaType !== type) continue;
      const mapCredits = (items = []) => items
        .filter((item) => !isExcludedMedia(item))
        .map((item) => mapFilmographyCredit(item, type));
      cast.push(...mapCredits(credits?.cast || []));
      crew.push(...mapCredits(credits?.crew || []));
    }

    const comparator =
      sortBy === 'date'
        ? (a, b) => (b.firstAirDate || b.first_air_date || b.release_date || '').localeCompare(a.firstAirDate || a.first_air_date || a.release_date || '')
        : (a, b) => (b.popularity || 0) - (a.popularity || 0);

    cast.sort(comparator);
    crew.sort(comparator);

    return {
      profile,
      cast,
      crew
    };
  }
}

export const personBackend = new PersonBackend();
export default PersonBackend;
