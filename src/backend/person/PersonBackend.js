import { apiService as defaultApiService } from '../../service/ApiService.js';
import { Person, isMediaUpcoming, isExcludedMedia } from '../../models/utils/index.js';

/**
 * PersonBackend
 * Scope: Handles actor profiles, biographies, career filmography, and voice acting credits.
 * Transforms UI parameters into TMDB Person API calls via ApiService and returns typed domain models (Person).
 */
export class PersonBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
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
      append_to_response: appendCredits ? 'tv_credits,movie_credits' : undefined,
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

    if (mediaType === 'all' || mediaType === 'tv') {
      const tvCredits = profile.tvCredits;
      const mapTv = (item) => ({
        ...item,
        media_type: 'tv',
        mediaType: 'tv',
        firstAirDate: item.first_air_date,
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        upcoming: isMediaUpcoming(item)
      });
      const filteredTvCast = (tvCredits?.cast || []).filter((item) => !isExcludedMedia(item));
      const filteredTvCrew = (tvCredits?.crew || []).filter((item) => !isExcludedMedia(item));
      cast.push(...filteredTvCast.map(mapTv));
      crew.push(...filteredTvCrew.map(mapTv));
    }

    if (mediaType === 'all' || mediaType === 'movie') {
      const movieCredits = profile.movieCredits;
      const mapMovie = (item) => ({
        ...item,
        name: item.title,
        first_air_date: item.release_date,
        firstAirDate: item.release_date,
        mediaType: 'movie',
        posterUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        media_type: 'movie',
        upcoming: isMediaUpcoming(item)
      });
      const filteredMovieCast = (movieCredits?.cast || []).filter((item) => !isExcludedMedia(item));
      const filteredMovieCrew = (movieCredits?.crew || []).filter((item) => !isExcludedMedia(item));
      cast.push(...filteredMovieCast.map(mapMovie));
      crew.push(...filteredMovieCrew.map(mapMovie));
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
