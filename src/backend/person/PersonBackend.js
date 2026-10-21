import { apiService as defaultApiService } from '../../service/ApiService.js';

/**
 * PersonBackend
 * Scope: Handles actor profiles, biographies, career filmography, and voice acting credits.
 */
export class PersonBackend {
  /**
   * @param {import('../../service/ApiService.js').ApiService} [apiService]
   */
  constructor(apiService = defaultApiService) {
    this.apiService = apiService;
  }

  /**
   * Get person details (biography, birthday, profile image) + complete TV & Movie credits
   * @param {object} params
   * @param {number|string} params.personId
   * @param {boolean} [params.appendCredits=true]
   * @returns {Promise<any>}
   */
  async getPersonProfile({ personId, appendCredits = true } = {}) {
    if (!personId) throw new Error('personId is required');

    return this.apiService.getPersonDetails(personId, {
      append_to_response: appendCredits ? 'tv_credits,movie_credits' : undefined
    });
  }

  /**
   * Get person filmography sorted by popularity or release date
   * @param {object} params
   * @param {number|string} params.personId
   * @param {'all'|'movie'|'tv'} [params.mediaType='all']
   * @param {'popularity'|'date'} [params.sortBy='popularity']
   * @returns {Promise<{ profile: any, cast: Array<any>, crew: Array<any> }>}
   */
  async getPersonFilmography({ personId, mediaType = 'all', sortBy = 'popularity' } = {}) {
    const profile = await this.getPersonProfile({ personId, appendCredits: true });

    let cast = [];
    let crew = [];

    if (mediaType === 'all' || mediaType === 'tv') {
      const tvCast = (profile.tv_credits?.cast || []).map((c) => ({ ...c, media_type: 'tv' }));
      const tvCrew = (profile.tv_credits?.crew || []).map((c) => ({ ...c, media_type: 'tv' }));
      cast.push(...tvCast);
      crew.push(...tvCrew);
    }

    if (mediaType === 'all' || mediaType === 'movie') {
      const movieCast = (profile.movie_credits?.cast || []).map((c) => ({
        ...c,
        name: c.title,
        first_air_date: c.release_date,
        media_type: 'movie'
      }));
      const movieCrew = (profile.movie_credits?.crew || []).map((c) => ({
        ...c,
        name: c.title,
        first_air_date: c.release_date,
        media_type: 'movie'
      }));
      cast.push(...movieCast);
      crew.push(...movieCrew);
    }

    if (sortBy === 'date') {
      cast.sort((a, b) => (b.first_air_date || b.release_date || '').localeCompare(a.first_air_date || a.release_date || ''));
      crew.sort((a, b) => (b.first_air_date || b.release_date || '').localeCompare(a.first_air_date || a.release_date || ''));
    } else {
      cast.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      crew.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    }

    return {
      profile: {
        id: profile.id,
        name: profile.name,
        biography: profile.biography,
        birthday: profile.birthday,
        deathday: profile.deathday,
        place_of_birth: profile.place_of_birth,
        profile_path: profile.profile_path,
        known_for_department: profile.known_for_department,
        popularity: profile.popularity
      },
      cast,
      crew
    };
  }
}

export const personBackend = new PersonBackend();
export default PersonBackend;
